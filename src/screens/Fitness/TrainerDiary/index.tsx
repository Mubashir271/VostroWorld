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
import { getHRSessions, getGXTrainers } from '../../../api/employeeDashboard';

interface Trainer { id: number; name: string; }
interface DiaryRow {
  id: number;
  date?: string;
  day?: string;
  staff_status?: string;
  client_status?: string;
  client_name?: string;
  trainer_name?: string;
  package_name?: string;
}

const STATUS_COLOR: Record<string, string> = {
  Delivered: '#2E7D32',
  'No Show': '#C62828',
  Cancel: '#9E9E9E',
};

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
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return fmt(d); };
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

const COLS = [
  { key: 'sr',       label: 'Sr#',           width: 42  },
  { key: 'date',     label: 'Date',          width: 90  },
  { key: 'trainer',  label: 'Trainer',       width: 130 },
  { key: 'client',   label: 'Client',        width: 150 },
  { key: 'package',  label: 'Package',       width: 200 },
  { key: 'staff',    label: 'Staff Status',  width: 110 },
  { key: 'client_s', label: 'Client Status', width: 110 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const TrainerDiary = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerId, setTrainerId] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerModal, setTrainerModal] = useState(false);

  const [startDate, setStartDate] = useState(() => startOfMonth());
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [rows, setRows] = useState<DiaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTrainers = useCallback(async () => {
    try {
      const res = await getGXTrainers({ branch_id: branchId });
      const list: Trainer[] = res?.data ?? [];
      setTrainers(Array.isArray(list) ? list : []);
    } catch {}
  }, [branchId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getHRSessions({
        branch_id: branchId,
        trainer_id: trainerId ? parseInt(trainerId, 10) : undefined,
        start_date: startDate,
        end_date: endDate,
        limit: 200,
      });
      const list: DiaryRow[] = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setRows([]);
      } else {
        setError(e?.response?.data?.message || 'Failed to load trainer diary.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, trainerId, startDate, endDate]);

  useEffect(() => { loadTrainers(); }, [loadTrainers]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setQuick = (s: string, e: string) => { setStartDate(s); setEndDate(e); };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Trainer Diary"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* ── Filter card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filters</Text>

          <View style={styles.fullRow}>
            <Text style={styles.label}>Trainer</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setTrainerModal(true)}>
              <Text style={trainerName ? styles.pickerText : styles.placeholder}>
                {trainerName || 'All Trainers'}
              </Text>
              <Icon name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Start date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>End date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.quickBtns}>
            {[
              { l: '7 Days', s: daysAgo(7), e: today() },
              { l: '30 Days', s: daysAgo(30), e: today() },
              { l: 'This Month', s: startOfMonth(), e: today() },
              { l: 'Today', s: today(), e: today() },
            ].map(q => (
              <TouchableOpacity key={q.l} style={styles.quickBtn} onPress={() => setQuick(q.s, q.e)}>
                <Text style={styles.quickBtnText}>{q.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Results card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session Diary</Text>
          {!!error && <Text style={styles.errText}>{error}</Text>}

          {loading
            ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
            : rows.length === 0
              ? <Text style={styles.emptyText}>No records found.</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ width: TABLE_W }}>
                    <View style={styles.thead}>
                      {COLS.map(c => (
                        <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                      ))}
                    </View>
                    {rows.map((row, i) => (
                      <View key={row.id ?? i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, { width: COLS[0].width }]}>{i + 1}</Text>
                        <Text style={[styles.td, { width: COLS[1].width }]}>{display(row.date)}</Text>
                        <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]}>{row.trainer_name || '-'}</Text>
                        <Text style={[styles.td, { width: COLS[3].width, textAlign: 'left' }]}>{row.client_name || '-'}</Text>
                        <Text style={[styles.td, { width: COLS[4].width, textAlign: 'left' }]}>{row.package_name || '-'}</Text>
                        <View style={[styles.td, { width: COLS[5].width }]}>
                          <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[row.staff_status ?? ''] ?? '#9E9E9E') + '22' }]}>
                            <Text style={[styles.badgeText, { color: STATUS_COLOR[row.staff_status ?? ''] ?? '#666' }]}>{row.staff_status || '-'}</Text>
                          </View>
                        </View>
                        <View style={[styles.td, { width: COLS[6].width }]}>
                          <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[row.client_status ?? ''] ?? '#9E9E9E') + '22' }]}>
                            <Text style={[styles.badgeText, { color: STATUS_COLOR[row.client_status ?? ''] ?? '#666' }]}>{row.client_status || '-'}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )
          }
        </View>
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

export default TrainerDiary;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },

  fullRow: { marginBottom: 12 },
  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  col2: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },

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

  quickBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  quickBtn: {
    borderWidth: 1, borderColor: '#CCC', borderRadius: 5,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FAFAFA',
  },
  quickBtnText: { fontSize: 12, color: '#333' },

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 11 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 9 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },

  badge: { borderRadius: 4, paddingVertical: 3, paddingHorizontal: 6, alignSelf: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
