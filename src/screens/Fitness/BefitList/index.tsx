import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getBefitClients } from '../../../api/employeeDashboard';

// Confirmed live 2026-06-30 via a captured HAR of the web admin's "New
// Befit Clients" page — see `getBefitClients` in employeeDashboard.ts for
// endpoint details. The capture only ever returned the standard empty-result
// 404 (no Befit data exists on the captured branch yet), so the row fields
// below are a best-effort guess from the table's column headers (Sr#,
// Client Name, Package Name, PT Package, Start Date, End Date, Time Slot —
// no Trainer column, unlike the similar NewPTClients screen) — re-verify
// once real Befit rows are captured. Does not auto-load on focus, matching
// the web admin's default "No Record Found" until Search is pressed.
interface BefitRow {
  id: number;
  client_name?: string;
  package_name?: string;
  pt_package?: string | number;
  start_date?: string;
  end_date?: string;
  trainer_reservation?: string;
}

const display = (iso?: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

const RESERVATION_OPTIONS = ['All', 'Pending', 'Reserved'] as const;

const COLS = [
  { key: 'sr', label: 'Sr#', width: 36 },
  { key: 'client', label: 'Client Name', width: 140 },
  { key: 'package', label: 'Package Name', width: 180 },
  { key: 'pt', label: 'PT Package', width: 90 },
  { key: 'start', label: 'Start Date', width: 90 },
  { key: 'end', label: 'End Date', width: 90 },
  { key: 'slot', label: 'Time Slot', width: 90 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);
const PAGE_SIZE = 25;

const BefitList = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const branchName = profile?.branchName ?? 'Branch';

  const [clientFilter, setClientFilter] = useState('');

  const [reservation, setReservation] = useState<typeof RESERVATION_OPTIONS[number]>('All');
  const [reservationModal, setReservationModal] = useState(false);

  const [rows, setRows] = useState<BefitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getBefitClients({
        branch_id: branchId,
        trainer_reservation: reservation === 'All' ? undefined : reservation,
        limit: 1000,
      });
      const data: BefitRow[] = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) { setRows([]); setFetched(true); }
      else setError(e?.response?.data?.message || 'Failed to load Befit clients.');
    } finally {
      setLoading(false);
    }
  }, [branchId, reservation]);

  const visibleRows = rows.filter(r => {
    if (clientFilter.trim() && !(r.client_name ?? '').toLowerCase().includes(clientFilter.trim().toLowerCase())) return false;
    return true;
  });

  useEffect(() => { setPage(1); }, [clientFilter, rows]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const pagedRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <View style={styles.root}>
      <AppHeader
        title="New Befit Clients"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Befit Clients</Text>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Branch Name</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Client Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Client Name"
                placeholderTextColor="#aaa"
                value={clientFilter}
                onChangeText={setClientFilter}
              />
            </View>
          </View>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Time Reservation</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setReservationModal(true)}>
                <Text style={styles.pickerText}>{reservation}</Text>
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
                        <View key={r.id ?? i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: COLS[0].width }]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                          <Text style={[styles.td, { width: COLS[1].width, textAlign: 'left' }]} numberOfLines={1}>{r.client_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]} numberOfLines={1}>{r.package_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[3].width }]}>{r.pt_package ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[4].width }]}>{display(r.start_date)}</Text>
                          <Text style={[styles.td, { width: COLS[5].width }]}>{display(r.end_date)}</Text>
                          <Text style={[styles.td, { width: COLS[6].width, color: r.trainer_reservation === 'Reserved' ? '#2E7D32' : '#C62828', fontWeight: '700' }]}>
                            {r.trainer_reservation ?? '-'}
                          </Text>
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

      <Modal visible={reservationModal} transparent animationType="fade" onRequestClose={() => setReservationModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReservationModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Time Reservation</Text>
            {RESERVATION_OPTIONS.map(o => (
              <TouchableOpacity key={o} style={styles.dropdownItem} onPress={() => { setReservation(o); setReservationModal(false); }}>
                <Text style={[styles.dropdownItemText, reservation === o && styles.dropdownItemActive]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default BefitList;

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
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9, fontSize: 13,
    color: '#222', backgroundColor: '#FAFAFA',
  },
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
  dropdownItemActive: { color: R, fontWeight: '700' },
});
