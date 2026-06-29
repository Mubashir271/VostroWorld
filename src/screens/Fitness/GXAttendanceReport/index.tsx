import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getHRSessionsAll, getStaffList } from '../../../api/employeeDashboard';

// Confirmed live 2026-06-29: `/v1/session-detail-report` (this screen's
// previous "Best API" guess) actually returns a payment-type breakdown
// report, not session/attendance rows — wrong endpoint despite the 200.
// Built instead on `getHRSessions` (`hr/sessions`, already used by
// PTAttendance/SalesSessionReport), confirmed live across 26k+ rows on two
// branches to carry exactly two `type` values, `GX` and `PT` — Befit/SPT
// are NOT in this table. Filtered here to GX rows (`type === 'GX'`,
// falling back to `package_type === '15'` since `type` is blank on some
// legacy GX rows). No start_time/end_time field exists on this endpoint —
// those columns are always shown as '-' to match the live web admin, which
// also renders them blank for this report.
interface Trainer { id: number; name: string; is_gx_trainer?: number; }
interface SessionRow {
  id: number;
  date: string;
  day: string;
  client_status?: string;
  trainer_name?: string;
  trainer_id?: number;
  client_name?: string;
  package_name?: string;
  package_type?: string;
  branch_name?: string;
  type?: string;
  validate_status?: string;
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

const quickDate = (type: string): { start: string; end: string } => {
  const now = new Date();
  switch (type) {
    case 'yesterday': { const d = new Date(now); d.setDate(d.getDate() - 1); return { start: fmt(d), end: fmt(d) }; }
    case 'last-month': {
      const start = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const end = fmt(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start, end };
    }
    case 'last-quarter': {
      const q = Math.floor(now.getMonth() / 3);
      const prevQ = q === 0 ? 3 : q - 1;
      const yr = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return { start: fmt(new Date(yr, prevQ * 3, 1)), end: fmt(new Date(yr, prevQ * 3 + 3, 0)) };
    }
    case 'last-year': { const y = now.getFullYear() - 1; return { start: `${y}-01-01`, end: `${y}-12-31` }; }
    case 'today': return { start: today(), end: today() };
    case 'this-month': return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: today() };
    case 'this-quarter': { const q = Math.floor(now.getMonth() / 3); return { start: fmt(new Date(now.getFullYear(), q * 3, 1)), end: today() }; }
    case 'this-year': return { start: `${now.getFullYear()}-01-01`, end: today() };
    case '9d': { const d = new Date(now); d.setDate(d.getDate() - 9); return { start: fmt(d), end: today() }; }
    case '30d': { const d = new Date(now); d.setDate(d.getDate() - 30); return { start: fmt(d), end: today() }; }
    case '90d': { const d = new Date(now); d.setDate(d.getDate() - 90); return { start: fmt(d), end: today() }; }
    case '365d': { const d = new Date(now); d.setDate(d.getDate() - 365); return { start: fmt(d), end: today() }; }
    default: return { start: today(), end: today() };
  }
};

const CLIENT_STATUS_OPTIONS = ['All', 'Delivered', 'No Show', 'Cancel'] as const;

const COLS = [
  { key: 'sr', label: 'Sr#', width: 36 },
  { key: 'trainer', label: 'Trainer Name', width: 120 },
  { key: 'client', label: 'Client Name', width: 120 },
  { key: 'branch', label: 'Branch Name', width: 70 },
  { key: 'class', label: 'Class Name', width: 180 },
  { key: 'day', label: 'Day', width: 80 },
  { key: 'date', label: 'Date', width: 80 },
  { key: 'attendance', label: 'Client Attendance', width: 110 },
  { key: 'start', label: 'Start Time', width: 80 },
  { key: 'end', label: 'End Time', width: 80 },
  { key: 'validate', label: 'Validate Status', width: 100 },
  { key: 'status', label: 'Status', width: 70 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);
const PAGE_SIZE = 25;

const GXAttendanceReport = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? 'Branch';

  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return fmt(d); });
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerId, setTrainerId] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerModal, setTrainerModal] = useState(false);

  const [clientFilter, setClientFilter] = useState('');
  const [slotFilter, setSlotFilter] = useState('');
  const [clientStatus, setClientStatus] = useState<string>('All');
  const [mode, setMode] = useState<'Detail' | 'Summary'>('Detail');

  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const loadTrainers = useCallback(async () => {
    try {
      const res = await getStaffList({ branch_id: branchId, limit: 500 });
      const list: Trainer[] = res?.data?.data ?? res?.data ?? [];
      setTrainers((Array.isArray(list) ? list : []).filter(s => Number(s.is_gx_trainer) === 1));
    } catch {}
  }, [branchId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data: SessionRow[] = await getHRSessionsAll({ branch_id: branchId, start_date: startDate, end_date: endDate });
      setRows(data.filter(r => r.type === 'GX' || r.package_type === '15'));
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) { setRows([]); setFetched(true); }
      else setError(e?.response?.data?.message || 'Failed to load GX attendance report.');
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);

  useFocusEffect(useCallback(() => { loadTrainers(); load(); }, [loadTrainers, load]));

  const visibleRows = rows.filter(r => {
    if (trainerId && String(r.trainer_id) !== trainerId) return false;
    if (clientFilter.trim() && !(r.client_name ?? '').toLowerCase().includes(clientFilter.trim().toLowerCase())) return false;
    if (slotFilter.trim() && !(r.package_name ?? '').toLowerCase().includes(slotFilter.trim().toLowerCase())) return false;
    if (clientStatus !== 'All' && r.client_status !== clientStatus) return false;
    return true;
  });

  useEffect(() => { setPage(1); }, [trainerId, clientFilter, slotFilter, clientStatus, rows]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const pagedRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { label: 'Total Sessions', value: visibleRows.length, color: '#1A1A1A' },
    { label: 'Delivered', value: visibleRows.filter(r => r.client_status === 'Delivered').length, color: '#10b981' },
    { label: 'No Show', value: visibleRows.filter(r => r.client_status === 'No Show').length, color: '#f59e0b' },
    { label: 'Cancel', value: visibleRows.filter(r => r.client_status === 'Cancel').length, color: '#ef4444' },
  ];

  return (
    <View style={styles.root}>
      <AppHeader
        title="GX Attendance Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dates</Text>
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

          <Text style={styles.quickTitle}>Quick Dates</Text>
          <Text style={styles.groupLabel}>Last</Text>
          <View style={styles.chipRow}>
            {[['last-year', 'Year'], ['last-quarter', 'Quarter'], ['last-month', 'Month'], ['yesterday', 'Yesterday']].map(([k, l]) => (
              <TouchableOpacity key={k} style={styles.chip} onPress={() => { const { start, end } = quickDate(k); setStartDate(start); setEndDate(end); }}>
                <Text style={styles.chipText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.groupLabel}>To-Date</Text>
          <View style={styles.chipRow}>
            {[['this-year', 'Year'], ['this-quarter', 'Quarter'], ['this-month', 'Month'], ['today', 'Today']].map(([k, l]) => (
              <TouchableOpacity key={k} style={styles.chip} onPress={() => { const { start, end } = quickDate(k); setStartDate(start); setEndDate(end); }}>
                <Text style={styles.chipText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.groupLabel}>Previous</Text>
          <View style={styles.chipRow}>
            {[['365d', '365 Days'], ['90d', '90 Days'], ['30d', '30 Days'], ['9d', '9 Days']].map(([k, l]) => (
              <TouchableOpacity key={k} style={styles.chip} onPress={() => { const { start, end } = quickDate(k); setStartDate(start); setEndDate(end); }}>
                <Text style={styles.chipText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filters</Text>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Available Trainers</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTrainerModal(true)}>
                <Text style={trainerName ? styles.pickerText : styles.placeholder}>{trainerName || 'Select Trainer'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Clients Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Filter by client"
                placeholderTextColor="#aaa"
                value={clientFilter}
                onChangeText={setClientFilter}
              />
            </View>
          </View>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Slots</Text>
              <TextInput
                style={styles.input}
                placeholder="Filter by class/slot"
                placeholderTextColor="#aaa"
                value={slotFilter}
                onChangeText={setSlotFilter}
              />
            </View>
          </View>
          <Text style={[styles.label, { marginTop: 4 }]}>Client Attendance</Text>
          <View style={styles.pillRow}>
            {CLIENT_STATUS_OPTIONS.map(s => (
              <TouchableOpacity key={s} style={[styles.pill, clientStatus === s && styles.pillActive]} onPress={() => setClientStatus(s)}>
                <Text style={[styles.pillText, clientStatus === s && styles.pillTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Options</Text>
          <View style={styles.radioRow}>
            {(['Summary', 'Detail'] as const).map(m => (
              <TouchableOpacity key={m} style={styles.radioOption} onPress={() => setMode(m)}>
                <View style={styles.radioOuter}>{mode === m && <View style={styles.radioInner} />}</View>
                <Text style={[styles.radioLabel, mode === m && styles.radioLabelActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.goBtn} onPress={load}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Go</Text>}
        </TouchableOpacity>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {fetched && (
          <View style={[styles.card, { marginTop: 14 }]}>
            <Text style={styles.cardTitle}>Filtered Result</Text>
            {loading
              ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
              : mode === 'Summary'
                ? (
                  <View style={styles.summaryGrid}>
                    {stats.map(({ label, value, color }) => (
                      <View key={label} style={styles.summaryCard}>
                        <Text style={[styles.summaryValue, { color }]}>{value}</Text>
                        <Text style={styles.summaryLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                )
                : visibleRows.length === 0
                  ? <Text style={styles.emptyText}>No records found.</Text>
                  : (
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View style={{ width: TABLE_W }}>
                        <View style={styles.thead}>
                          {COLS.map(c => (
                            <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                          ))}
                        </View>
                        {pagedRows.map((r, i) => (
                          <View key={r.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                            <Text style={[styles.td, { width: COLS[0].width }]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                            <Text style={[styles.td, { width: COLS[1].width, textAlign: 'left' }]} numberOfLines={1}>{r.trainer_name ?? '-'}</Text>
                            <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]} numberOfLines={1}>{r.client_name ?? '-'}</Text>
                            <Text style={[styles.td, { width: COLS[3].width }]}>{r.branch_name ?? '-'}</Text>
                            <Text style={[styles.td, { width: COLS[4].width, textAlign: 'left' }]} numberOfLines={1}>{r.package_name ?? '-'}</Text>
                            <Text style={[styles.td, { width: COLS[5].width }]}>{r.day ?? '-'}</Text>
                            <Text style={[styles.td, { width: COLS[6].width }]}>{display(r.date)}</Text>
                            <Text style={[styles.td, { width: COLS[7].width }]}>{r.client_status ?? '-'}</Text>
                            <Text style={[styles.td, { width: COLS[8].width }]}>-</Text>
                            <Text style={[styles.td, { width: COLS[9].width }]}>-</Text>
                            <Text style={[styles.td, { width: COLS[10].width, color: '#1565C0', fontWeight: '700' }]}>Verify</Text>
                            <Text style={[styles.td, { width: COLS[11].width, color: '#2E7D32', fontWeight: '700' }]}>Active</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )
            }
            {!loading && mode === 'Detail' && visibleRows.length > PAGE_SIZE && (
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

export default GXAttendanceReport;

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

  quickTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 8 },
  groupLabel: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FAFAFA' },
  chipText: { fontSize: 12, color: '#555', fontWeight: '500' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FAFAFA' },
  pillActive: { backgroundColor: R, borderColor: R },
  pillText: { fontSize: 13, color: '#555' },
  pillTextActive: { color: '#FFF', fontWeight: '600' },

  radioRow: { flexDirection: 'row', gap: 20 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: R, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: R },
  radioLabel: { fontSize: 14, color: '#555' },
  radioLabelActive: { color: R, fontWeight: '600' },

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 12, marginBottom: 4 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 12, width: '47%', borderWidth: 1, borderColor: '#EFEFEF', alignItems: 'center' },
  summaryValue: { fontSize: 26, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: '#999', marginTop: 4, textAlign: 'center' },

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
