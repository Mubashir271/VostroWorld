import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import { getBefitBookings, getBefitBookingTrainers } from '../../../api/employeeDashboard';

// Confirmed live 2026-06-30 via a captured HAR + web admin screenshot of
// "New Befit Bookings" — see `getBefitBookings` in employeeDashboard.ts for
// endpoint details. Every captured call 404'd with the standard empty-result
// shape (no Befit data exists yet), so row field names are inferred from the
// table's column headers, not confirmed — re-verify once real rows exist.
// Does not auto-load on focus, matching the web admin's default "No Record
// Found" until Search is pressed.
interface Trainer { id: number; name: string; }
interface BefitBookingRow {
  id: number;
  branch_name?: string;
  trainer_name?: string;
  customer_name?: string;
  package_name?: string;
  pt_package?: string | number;
  start_date?: string;
  end_date?: string;
}

const display = (iso?: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

const COLS = [
  { key: 'sr', label: 'Sr#', width: 36 },
  { key: 'branch', label: 'Branch Name', width: 90 },
  { key: 'trainer', label: 'Trainer Name', width: 130 },
  { key: 'customer', label: 'Customer Name', width: 140 },
  { key: 'package', label: 'Package Name', width: 170 },
  { key: 'pt', label: 'PT Package', width: 90 },
  { key: 'start', label: 'Start Date', width: 90 },
  { key: 'end', label: 'End Date', width: 90 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);
const PAGE_SIZE = 25;

const BefitBookings = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerId, setTrainerId] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerModal, setTrainerModal] = useState(false);

  const [rows, setRows] = useState<BefitBookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const loadTrainers = useCallback(async () => {
    try {
      const res = await getBefitBookingTrainers({ branch_id: listBranchId });
      const list = res?.data ?? [];
      setTrainers((Array.isArray(list) ? list : []).map((t: any) => ({
        id: t.id, name: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim(),
      })));
    } catch {}
  }, [listBranchId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getBefitBookings({
        branch_id: listBranchId,
        user_id: trainerId ? parseInt(trainerId, 10) : undefined,
        limit: 1000,
      });
      const data: BefitBookingRow[] = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) { setRows([]); setFetched(true); }
      else setError(e?.response?.data?.message || 'Failed to load Befit bookings.');
    } finally {
      setLoading(false);
    }
  }, [listBranchId, trainerId]);

  useFocusEffect(useCallback(() => { loadTrainers(); }, [loadTrainers]));
  useEffect(() => { setPage(1); }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <View style={styles.root}>
      <AppHeader
        title="New Befit Bookings"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Befit Bookings</Text>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <BranchField
                label="Branch Name"
                needsPicker={needsPicker}
                branchName={branchName}
                options={branchOptions}
                loadingOptions={loadingBranches}
                onSelect={selectBranch}
                labelStyle={styles.label}
                staticStyle={styles.staticInput}
                staticTextStyle={styles.staticText}
                pickerStyle={styles.picker}
                pickerTextStyle={styles.pickerText}
                placeholderStyle={styles.placeholder}
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Available Trainers</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTrainerModal(true)}>
                <Text style={trainerName ? styles.pickerText : styles.placeholder}>{trainerName || 'Select Trainer'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Search</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {fetched && (
          <View style={styles.card}>
            {loading
              ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
              : rows.length === 0
                ? <Text style={styles.emptyText}>No Record Found</Text>
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ width: TABLE_W }}>
                      <View style={styles.thead}>
                        {COLS.map(c => (
                          <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                        ))}
                      </View>
                      {pagedRows.map((r, i) => (
                        <View key={r.id ?? i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: COLS[0].width }]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                          <Text style={[styles.td, { width: COLS[1].width }]} numberOfLines={1}>{r.branch_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]} numberOfLines={1}>{r.trainer_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[3].width, textAlign: 'left' }]} numberOfLines={1}>{r.customer_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[4].width, textAlign: 'left' }]} numberOfLines={1}>{r.package_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[5].width }]}>{r.pt_package ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[6].width }]}>{display(r.start_date)}</Text>
                          <Text style={[styles.td, { width: COLS[7].width }]}>{display(r.end_date)}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
            }
            {!loading && rows.length > PAGE_SIZE && (
              <View style={styles.pagination}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage(1)}>
                  <Text style={[styles.pageEdgeText, page === 1 && styles.pageDisabledText]}>First Page</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage(p => Math.max(1, p - 1))}>
                  <Text style={[styles.pageArrow, page === 1 && styles.pageDisabledText]}>‹</Text>
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumScroll}>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
                    <TouchableOpacity key={n} onPress={() => setPage(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
                      <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(p => Math.min(totalPages, p + 1))}>
                  <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabledText]}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(totalPages)}>
                  <Text style={[styles.pageEdgeText, page === totalPages && styles.pageDisabledText]}>Last Page</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={trainerModal} transparent animationType="fade" onRequestClose={() => setTrainerModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTrainerModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Trainer</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setTrainerId(''); setTrainerName(''); setTrainerModal(false); }}>
                <Text style={styles.dropdownItemText}>All Trainers</Text>
              </TouchableOpacity>
              {trainers.map(t => (
                <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { setTrainerId(String(t.id)); setTrainerName(t.name); setTrainerModal(false); }}>
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

export default BefitBookings;

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

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 11 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
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
