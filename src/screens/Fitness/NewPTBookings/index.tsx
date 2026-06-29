import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getDetailedSalesReport } from '../../../api/reports';
import { getGXTrainers } from '../../../api/employeeDashboard';

// Built from the web admin screenshot: Branch + Available Trainers filter,
// Search, table of new PT package bookings. Same data source as
// `PTSalesReport` (`getDetailedSalesReport`, filtered to non-blank
// `trainer_name`) — no separate "create booking" endpoint needed here, this
// screen is a filtered view, not a form (the web admin's table has no add
// form above it either, just Branch/Trainer/Search). `trainer_name` (not
// `trainer_id`) is the only trainer field on this endpoint, so the trainer
// filter matches by name.
//
// Confirmed live 2026-06-29 by diffing this endpoint's raw response
// against a web admin screenshot, row for row:
// - "PT Package" is `session_count * quantity`, not `session_count` alone
//   — a quantity-3 renewal of a 20-session package showed "60".
// - The web's "End Date" is `sale_date + (package_duration * quantity)`
//   **days** (not months, despite `PTSalesReport`'s existing assumption —
//   that screen's sampled rows likely all had `quantity: 1` and a
//   `package_duration` close enough to 30 that days vs. months looked the
//   same; this row's `quantity: 3`, `package_duration: 30` proved it's
//   days: `2026-06-18 + 90 days = 2026-09-16`, exactly matching the web,
//   while `+3 months` would land on `09-18`).
// - Does **not** auto-load on screen focus — the web admin's table starts
//   on "No Record Found" until "Search" is pressed, so this screen now
//   matches that (only `loadTrainers` runs on focus).
interface Trainer { id: number; name: string; }
interface BookingRow {
  order_detail_id: number;
  branch_name?: string;
  trainer_name?: string;
  client_name?: string;
  package_name?: string;
  session_count?: number;
  quantity?: number;
  sale_type?: string;
  sale_date?: string;
  package_duration?: number;
}

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
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const addDays = (iso: string, days: number) => {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  return fmt(d);
};

const COLS = [
  { key: 'sr', label: 'Sr#', width: 36 },
  { key: 'branch', label: 'Branch Name', width: 70 },
  { key: 'trainer', label: 'Trainer Name', width: 130 },
  { key: 'customer', label: 'Customer Name', width: 130 },
  { key: 'package', label: 'Package Name', width: 200 },
  { key: 'pt', label: 'PT Package', width: 80 },
  { key: 'start', label: 'Start Date', width: 90 },
  { key: 'end', label: 'End Date', width: 90 },
  { key: 'action', label: 'Action', width: 70 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);
const PAGE_SIZE = 25;

const NewPTBookings = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? 'Branch';

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerId, setTrainerId] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerModal, setTrainerModal] = useState(false);

  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

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
      const res = await getDetailedSalesReport({ branch_id: branchId, start_date: daysAgo(90), end_date: today() });
      const data: BookingRow[] = res?.data?.data ?? [];
      setRows(data.filter(r => (r.trainer_name ?? '').trim().length > 0 && r.sale_type === 'New'));
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) { setRows([]); setFetched(true); }
      else setError(e?.response?.data?.message || 'Failed to load new PT bookings.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useFocusEffect(useCallback(() => { loadTrainers(); }, [loadTrainers]));

  const visibleRows = rows.filter(r => !trainerName || r.trainer_name === trainerName);

  useEffect(() => { setPage(1); }, [trainerId, rows]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const pagedRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <View style={styles.root}>
      <AppHeader
        title="New PT Bookings"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>New PT Bookings</Text>
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
              : visibleRows.length === 0
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
                        <View key={r.order_detail_id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: COLS[0].width }]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                          <Text style={[styles.td, { width: COLS[1].width }]}>{r.branch_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]} numberOfLines={1}>{r.trainer_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[3].width, textAlign: 'left' }]} numberOfLines={1}>{r.client_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[4].width, textAlign: 'left' }]} numberOfLines={1}>{r.package_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[5].width }]}>{(r.session_count ?? 0) * (r.quantity ?? 1) || '-'}</Text>
                          <Text style={[styles.td, { width: COLS[6].width }]}>{display(r.sale_date)}</Text>
                          <Text style={[styles.td, { width: COLS[7].width }]}>
                            {r.sale_date ? display(addDays(r.sale_date, (r.package_duration ?? 30) * (r.quantity ?? 1))) : '-'}
                          </Text>
                          <Text style={[styles.td, { width: COLS[8].width }]}>-</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
            }
            {!loading && visibleRows.length > PAGE_SIZE && (
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

export default NewPTBookings;

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
