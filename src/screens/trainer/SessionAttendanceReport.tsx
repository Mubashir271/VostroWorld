import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { getTrainerHistory } from '../../api/trainer';
import { showSnackbar } from '../../redux/slices/snackbarSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const displayDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
};

const todayStr = () => formatDate(new Date());

const quickDate = (type: string): { start: string; end: string } => {
  const now = new Date();
  switch (type) {
    case 'today':
      return { start: todayStr(), end: todayStr() };
    case 'yesterday': {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const s = formatDate(d);
      return { start: s, end: s };
    }
    case 'this-month': {
      return { start: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: todayStr() };
    }
    case 'last-month': {
      const start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start, end };
    }
    case 'this-quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return { start: formatDate(new Date(now.getFullYear(), q * 3, 1)), end: todayStr() };
    }
    case 'last-quarter': {
      const q = Math.floor(now.getMonth() / 3);
      const prevQ = q === 0 ? 3 : q - 1;
      const yr = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const start = formatDate(new Date(yr, prevQ * 3, 1));
      const end = formatDate(new Date(yr, prevQ * 3 + 3, 0));
      return { start, end };
    }
    case 'this-year':
      return { start: `${now.getFullYear()}-01-01`, end: todayStr() };
    case 'last-year': {
      const y = now.getFullYear() - 1;
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    case '9d': {
      const d = new Date(now); d.setDate(d.getDate() - 9);
      return { start: formatDate(d), end: todayStr() };
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      return { start: formatDate(d), end: todayStr() };
    }
    case '90d': {
      const d = new Date(now); d.setDate(d.getDate() - 90);
      return { start: formatDate(d), end: todayStr() };
    }
    case '365d': {
      const d = new Date(now); d.setDate(d.getDate() - 365);
      return { start: formatDate(d), end: todayStr() };
    }
    default:
      return { start: todayStr(), end: todayStr() };
  }
};

const STATUS_OPTIONS = ['All', 'Delivered', 'No Show', 'Cancel'] as const;

const STATUS_COLOR: Record<string, string> = {
  Delivered: '#10b981',
  'No Show': '#f59e0b',
  Cancel: '#ef4444',
};

// ─── Column widths (shared between header and rows) ───────────────────────────

const COL = { date: 90, client: 130, pkg: 120, trainer: 90, clientSt: 90, slot: 100 };

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SessionAttendanceReport = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<any>();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return formatDate(d);
  });
  const [endDate, setEndDate] = useState(todayStr());
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [staffStatus, setStaffStatus] = useState<string>('All');
  const [clientStatus, setClientStatus] = useState<string>('All');
  const [mode, setMode] = useState<'Detail' | 'Summary'>('Detail');

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const applyQuick = (type: string) => {
    const { start, end } = quickDate(type);
    setStartDate(start);
    setEndDate(end);
  };

  const handleDateConfirm = (date: Date) => {
    const iso = formatDate(date);
    if (pickerFor === 'start') setStartDate(iso);
    else setEndDate(iso);
    setPickerFor(null);
  };

  const handleGo = async () => {
    try {
      setLoading(true);
      setFetched(false);
      const data = await getTrainerHistory({ start_date: startDate, end_date: endDate, limit: 200 });
      let rows: any[] = data?.data?.data ?? data?.data ?? [];
      if (staffStatus !== 'All') rows = rows.filter((r: any) => r.staff_status === staffStatus);
      if (clientStatus !== 'All') rows = rows.filter((r: any) => r.client_status === clientStatus);
      setRecords(rows);
      setFetched(true);
      if (rows.length === 0) {
        dispatch(showSnackbar({ message: 'No records found for the selected filters.', type: 'error' }));
      }
    } catch (e: any) {
      dispatch(showSnackbar({ message: e?.response?.data?.message ?? 'Could not load report.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // ─── Summary stats ────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total Sessions',    value: records.length,                                          color: '#1A1A1A' },
    { label: 'Trainer Delivered', value: records.filter(r => r.staff_status === 'Delivered').length, color: '#10b981' },
    { label: 'Trainer No Show',   value: records.filter(r => r.staff_status === 'No Show').length,   color: '#f59e0b' },
    { label: 'Trainer Cancel',    value: records.filter(r => r.staff_status === 'Cancel').length,    color: '#ef4444' },
    { label: 'Client Delivered',  value: records.filter(r => r.client_status === 'Delivered').length, color: '#10b981' },
    { label: 'Client No Show',    value: records.filter(r => r.client_status === 'No Show').length,   color: '#f59e0b' },
  ];

  // ─── Row renderer ─────────────────────────────────────────────────────────────
  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
      <Text style={[styles.cell, { width: COL.date }]}>{item.date ?? '—'}</Text>
      <Text style={[styles.cell, { width: COL.client }]} numberOfLines={1}>{item.client_name ?? '—'}</Text>
      <Text style={[styles.cell, { width: COL.pkg }]} numberOfLines={1}>{item.package_name ?? '—'}</Text>
      <Text style={[styles.cell, { width: COL.trainer, color: STATUS_COLOR[item.staff_status] ?? '#333' }]}>
        {item.staff_status ?? '—'}
      </Text>
      <Text style={[styles.cell, { width: COL.clientSt, color: STATUS_COLOR[item.client_status] ?? '#333' }]}>
        {item.client_status ?? '—'}
      </Text>
      <Text style={[styles.cell, { width: COL.slot }]}>{item.time_slot ?? '—'}</Text>
    </View>
  );

  // ─── UI ───────────────────────────────────────────────────────────────────────
  return (
    <>
      <AppHeader
        title="Session Attendance"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications' as never)}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Dates ─────────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dates</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerFor('start')}>
                <Icon name="calendar-range" size={15} color="#E63946" />
                <View style={styles.dateBtnInner}>
                  <Text style={styles.dateBtnLabel}>Start date</Text>
                  <Text style={styles.dateBtnValue}>{displayDate(startDate)}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerFor('end')}>
                <Icon name="calendar-range" size={15} color="#E63946" />
                <View style={styles.dateBtnInner}>
                  <Text style={styles.dateBtnLabel}>End date</Text>
                  <Text style={styles.dateBtnValue}>{displayDate(endDate)}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.quickTitle}>Quick Dates</Text>

            <Text style={styles.groupLabel}>Last</Text>
            <View style={styles.chipRow}>
              {[['last-year', 'Year'], ['last-quarter', 'Quarter'], ['last-month', 'Month'], ['yesterday', 'Yesterday']].map(([k, l]) => (
                <TouchableOpacity key={k} style={styles.chip} onPress={() => applyQuick(k)}>
                  <Text style={styles.chipText}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.groupLabel}>To-Date</Text>
            <View style={styles.chipRow}>
              {[['this-year', 'Year'], ['this-quarter', 'Quarter'], ['this-month', 'Month'], ['today', 'Today']].map(([k, l]) => (
                <TouchableOpacity key={k} style={styles.chip} onPress={() => applyQuick(k)}>
                  <Text style={styles.chipText}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.groupLabel}>Previous</Text>
            <View style={styles.chipRow}>
              {[['365d', '365 Days'], ['90d', '90 Days'], ['30d', '30 Days'], ['9d', '9 Days']].map(([k, l]) => (
                <TouchableOpacity key={k} style={styles.chip} onPress={() => applyQuick(k)}>
                  <Text style={styles.chipText}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Filters ───────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Filters</Text>

            <Text style={styles.filterLabel}>Trainer Attendance</Text>
            <View style={styles.pillRow}>
              {STATUS_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, staffStatus === s && styles.pillActive]}
                  onPress={() => setStaffStatus(s)}
                >
                  <Text style={[styles.pillText, staffStatus === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterLabel, { marginTop: 12 }]}>Client Attendance</Text>
            <View style={styles.pillRow}>
              {STATUS_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, clientStatus === s && styles.pillActive]}
                  onPress={() => setClientStatus(s)}
                >
                  <Text style={[styles.pillText, clientStatus === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Options ───────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Options</Text>
            <View style={styles.radioRow}>
              {(['Summary', 'Detail'] as const).map(m => (
                <TouchableOpacity key={m} style={styles.radioOption} onPress={() => setMode(m)}>
                  <View style={styles.radioOuter}>
                    {mode === m && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.radioLabel, mode === m && styles.radioLabelActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Go ────────────────────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.goBtn} onPress={handleGo} activeOpacity={0.85} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.goBtnText}>Go</Text>
            }
          </TouchableOpacity>

          {/* ── Results ───────────────────────────────────────────────────────── */}
          {fetched && !loading && mode === 'Summary' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Summary</Text>
              <View style={styles.summaryGrid}>
                {stats.map(({ label, value, color }) => (
                  <View key={label} style={styles.summaryCard}>
                    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
                    <Text style={styles.summaryLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {fetched && !loading && mode === 'Detail' && records.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detail  ({records.length} records)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.tableHeader}>
                    {[
                      ['Date', COL.date], ['Client', COL.client], ['Package', COL.pkg],
                      ['Trainer', COL.trainer], ['Client', COL.clientSt], ['Slot', COL.slot],
                    ].map(([h, w]) => (
                      <Text key={String(h)} style={[styles.headerCell, { width: Number(w) }]}>{h}</Text>
                    ))}
                  </View>
                  <FlatList
                    data={records}
                    renderItem={renderRow}
                    keyExtractor={(item, i) => String(item.id ?? i)}
                    scrollEnabled={false}
                  />
                </View>
              </ScrollView>
            </View>
          )}

          {fetched && !loading && mode === 'Detail' && records.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No records found for the selected filters.</Text>
            </View>
          )}

        </ScrollView>
      </View>

      <DateTimePickerModal
        isVisible={pickerFor !== null}
        mode="date"
        date={new Date(pickerFor === 'start' ? startDate : endDate)}
        maximumDate={pickerFor === 'start' ? new Date(endDate) : new Date()}
        minimumDate={pickerFor === 'end' ? new Date(startDate) : undefined}
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerFor(null)}
      />
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PRIMARY = '#E63946';
const BG = '#F9F9FB';
const CARD = '#FFFFFF';
const BORDER = '#EFEFEF';
const TEXT = '#1A1A1A';
const MUTED = '#999';
const MID = '#555';

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 12 },

  // ── Dates ──
  dateRow:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  dateBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 10, backgroundColor: '#FAFAFA' },
  dateBtnInner:  {},
  dateBtnLabel:  { fontSize: 11, color: MUTED },
  dateBtnValue:  { fontSize: 14, fontWeight: '600', color: TEXT },

  quickTitle:  { fontSize: 14, fontWeight: '700', color: MID, marginBottom: 8 },
  groupLabel:  { fontSize: 12, color: MUTED, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip:        { borderWidth: 1, borderColor: BORDER, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FAFAFA' },
  chipText:    { fontSize: 12, color: MID, fontWeight: '500' },

  // ── Filters ──
  filterLabel: { fontSize: 13, fontWeight: '600', color: MID, marginBottom: 8 },
  pillRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:        { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FAFAFA' },
  pillActive:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  pillText:    { fontSize: 13, color: MID },
  pillTextActive: { color: '#FFF', fontWeight: '600' },

  // ── Options ──
  radioRow:         { flexDirection: 'row', gap: 20 },
  radioOption:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioOuter:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  radioInner:       { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  radioLabel:       { fontSize: 14, color: MID },
  radioLabelActive: { color: PRIMARY, fontWeight: '600' },

  // ── Go ──
  goBtn:     { backgroundColor: TEXT, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  goBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // ── Summary ──
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
    width: '47%',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 28, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: MUTED, marginTop: 4, textAlign: 'center' },

  // ── Table ──
  tableHeader:  { flexDirection: 'row', backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 10, paddingHorizontal: 8 },
  headerCell:   { fontSize: 11, fontWeight: '700', color: MID, textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow:     { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  tableRowAlt:  { backgroundColor: '#FAFAFA' },
  cell:         { fontSize: 13, color: TEXT },

  // ── Empty ──
  empty:     { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center' },
});

export default SessionAttendanceReport;
