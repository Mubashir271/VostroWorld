import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getGXAppointments, getGXAppointmentTrainers } from '../../../api/employeeDashboard';

// Confirmed live 2026-06-30 via a captured HAR of the web admin's "GX
// Appointments" page. Same weekly Time×Day grid shape as the already-built
// `TrainerAppointments`, but on the `-gx` endpoint variant (the plain
// `trainer-schedule/index` PROJECT_STATUS.md previously confirmed returns
// empty schedules for real GX trainers) and paginated **by trainer**
// server-side (web defaults to 25/page) — `TrainerAppointments` doesn't
// paginate because its endpoint returns every trainer in one call; this one
// does not.
interface Trainer { id: number; name: string; }
interface DayBooking {
  order_id: number;
  client_name: string;
  package_name: string;
  session_count: number;
}
interface TimeSlotRow {
  time_slot_assignment_id: number;
  time: string;
  schedule: DayBooking[] | Record<string, DayBooking>;
}
interface TrainerScheduleBlock {
  trainer_id: number;
  name: string;
  branch_name: string;
  time_slots: TimeSlotRow[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PAGE_SIZE = 25;

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso?: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};
const toDate = (iso: string) => new Date(iso + 'T00:00:00');
const today = () => fmt(new Date());
const daysAhead = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d); };

const GXAppointments = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? 'Branch';

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerId, setTrainerId] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerModal, setTrainerModal] = useState(false);

  const [startDate, setStartDate] = useState(() => today());
  const [endDate, setEndDate] = useState(() => daysAhead(6));
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [blocks, setBlocks] = useState<TrainerScheduleBlock[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const loadTrainers = useCallback(async () => {
    try {
      const res = await getGXAppointmentTrainers({ branch_id: branchId });
      const list = res?.data ?? [];
      setTrainers((Array.isArray(list) ? list : []).map((t: any) => ({
        id: t.id, name: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim(),
      })));
    } catch {}
  }, [branchId]);

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await getGXAppointments({
        branch_id: branchId,
        user_id: trainerId ? parseInt(trainerId, 10) : undefined,
        start_date: startDate,
        end_date: endDate,
        page: targetPage,
        limit: PAGE_SIZE,
      });
      const data: TrainerScheduleBlock[] = res?.data ?? [];
      setBlocks(Array.isArray(data) ? data : []);
      setTotalPages(Math.max(1, res?.pagination?.total_pages ?? 1));
      setPage(targetPage);
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setBlocks([]); setTotalPages(1); setFetched(true);
      } else {
        setError(e?.response?.data?.message || 'Failed to load GX appointments.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, trainerId, startDate, endDate]);

  useFocusEffect(useCallback(() => { loadTrainers(); load(1); }, [loadTrainers]));
  useEffect(() => { load(1); }, [trainerId]);

  const dayBooking = (schedule: TimeSlotRow['schedule'], day: string): DayBooking | undefined => {
    if (Array.isArray(schedule)) return undefined;
    return (schedule as Record<string, DayBooking>)[day];
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="GX Appointments"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>GX Appointments</Text>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Branch Name</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Available Trainers</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTrainerModal(true)}>
                <Text style={trainerName ? styles.pickerText : styles.placeholder}>
                  {trainerName || 'All Trainers'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.goBtn} onPress={() => load(1)}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Search</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {fetched && !loading && (
          blocks.length === 0
            ? <Text style={styles.emptyText}>No records found.</Text>
            : blocks.map(block => (
              <View key={block.trainer_id} style={styles.card}>
                <View style={styles.blockHeader}>
                  <Text style={styles.blockHeaderText}>Branch Name: {block.branch_name}</Text>
                  <Text style={styles.blockHeaderText}>Trainer Name: {block.name}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    <View style={styles.thead}>
                      <Text style={[styles.th, styles.colTime]}>Time</Text>
                      {DAYS.map(d => (
                        <Text key={d} style={[styles.th, styles.colDay]}>{d}</Text>
                      ))}
                    </View>
                    {block.time_slots.map((slot, i) => (
                      <View key={slot.time_slot_assignment_id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, styles.colTime, { textAlign: 'left' }]}>{slot.time}</Text>
                        {DAYS.map(day => {
                          const booking = dayBooking(slot.schedule, day);
                          return (
                            <Text key={day} style={[styles.td, styles.colDay, booking && styles.bookedText]}>
                              {booking ? booking.client_name : 'Free'}
                            </Text>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))
        )}
        {loading && <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />}

        {!loading && fetched && totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={page === 1} onPress={() => load(1)}>
              <Text style={[styles.pageEdgeText, page === 1 && styles.pageDisabledText]}>First Page</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={page === 1} onPress={() => load(Math.max(1, page - 1))}>
              <Text style={[styles.pageArrow, page === 1 && styles.pageDisabledText]}>‹</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumScroll}>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
                <TouchableOpacity key={n} onPress={() => load(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
                  <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity disabled={page === totalPages} onPress={() => load(Math.min(totalPages, page + 1))}>
              <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabledText]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={page === totalPages} onPress={() => load(totalPages)}>
              <Text style={[styles.pageEdgeText, page === totalPages && styles.pageDisabledText]}>Last Page</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={!!pickerFor}
        mode="date"
        date={toDate(pickerFor === 'start' ? startDate : endDate)}
        onConfirm={d => { if (pickerFor === 'start') setStartDate(fmt(d)); else setEndDate(fmt(d)); setPickerFor(null); }}
        onCancel={() => setPickerFor(null)}
      />

      <Modal visible={trainerModal} transparent animationType="fade" onRequestClose={() => setTrainerModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTrainerModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Trainer</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => { setTrainerId(''); setTrainerName(''); setTrainerModal(false); }}
              >
                <Text style={styles.dropdownItemText}>All Trainers</Text>
              </TouchableOpacity>
              {trainers.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.dropdownItem}
                  onPress={() => { setTrainerId(String(t.id)); setTrainerName(t.name); setTrainerModal(false); }}
                >
                  <Text style={styles.dropdownItemText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default GXAppointments;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  errText: { color: R, fontSize: 13, marginHorizontal: 4, marginBottom: 8, fontWeight: '500' },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  col2: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },
  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 11 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  blockHeader: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1A1A1A',
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 6, marginBottom: 10,
  },
  blockHeaderText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 6, textAlign: 'center' },
  colTime: { width: 150 },
  colDay: { width: 110 },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 6, textAlign: 'center', alignSelf: 'center' },
  bookedText: { color: R, fontWeight: '700' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, marginBottom: 14, flexWrap: 'wrap' },
  pageEdgeText: { fontSize: 12, fontWeight: '700', color: R },
  pageArrow: { fontSize: 16, fontWeight: '700', color: R, paddingHorizontal: 4 },
  pageDisabledText: { color: '#BBB' },
  pageNumScroll: { flexGrow: 0, maxWidth: 220 },
  pageNum: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  pageNumActive: { backgroundColor: R, borderColor: R },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
