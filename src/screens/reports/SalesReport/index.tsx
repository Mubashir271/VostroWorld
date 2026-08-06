import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  FlatList, Modal, Pressable,
} from 'react-native';
import { getSalesDetail } from '../../../api/reports';
import { getExpensePaymentMethods } from '../../../api/employeeDashboard';
import { reportStyles as styles } from '../styles/reportStyles';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';

// ── Date helpers ────────────────────────────────────────────────────────────
const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const fmtRs = (val: any) => `Rs ${(parseFloat(val ?? 0) || 0).toLocaleString()}/-`;

const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfMonth = () => { const d = new Date(); d.setDate(1); return fmt(d); };
const startOfLastMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return fmt(d); };
const endOfLastMonth = () => { const d = new Date(); d.setDate(0); return fmt(d); };

const QUICK_DATES = [
  { label: 'Today',      start: () => today(),            end: () => today() },
  { label: 'Yesterday',  start: () => daysAgo(1),          end: () => daysAgo(1) },
  { label: 'This Month', start: () => startOfMonth(),      end: () => today() },
  { label: 'Last Month', start: () => startOfLastMonth(),  end: () => endOfLastMonth() },
  { label: 'Last 30',    start: () => daysAgo(30),         end: () => today() },
  { label: 'Last 90',    start: () => daysAgo(90),         end: () => today() },
];

const GENDERS = [
  { id: '', label: 'All' },
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
];

interface PaymentMethodOption { id: string; label: string; }
interface Txn {
  received: number; pending: number; receiving_date: string; paymentType: string;
  order_id: number; name: string; DiscountedPrice: number; NetPrice: number;
  tax: number; TotalPackagePrice: number;
}

// /v1/detail (confirmed live 2026-08-06 via HAR) returns `onspot`/`deposits`
// as arrays of per-day transaction arrays, already grouped by day
// server-side. Flatten both into one list, group by date, then by
// paymentType — matching the web admin's Sales Report page section layout
// (date header → Cash/Credit Card/Online sub-tables) exactly.
const groupByDateThenPayment = (data: any) => {
  const all: Txn[] = [
    ...((data?.onspot ?? []) as Txn[][]).flat(),
    ...((data?.deposits ?? []) as Txn[][]).flat(),
  ];
  const byDate = new Map<string, Txn[]>();
  for (const tx of all) {
    const key = tx.receiving_date;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(tx);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, txns]) => {
      const byType = new Map<string, Txn[]>();
      for (const tx of txns) {
        const key = tx.paymentType ?? 'Other';
        if (!byType.has(key)) byType.set(key, []);
        byType.get(key)!.push(tx);
      }
      return { date, groups: Array.from(byType.entries()).map(([paymentType, rows]) => ({ paymentType, rows })) };
    });
};

const dateLabel = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `${d.toLocaleDateString('en-US', { month: 'long' })} ${day}${suffix} ${d.getFullYear()}`;
};

const COL_WIDTHS = [32, 130, 70, 80, 85, 75, 70, 85, 95, 95];
const COL_LABELS = ['Sr#', 'Client', 'Order ID', 'Sale Date', 'Total Price', 'Discount', 'GST', 'Net Price', 'Received', 'Pending'];

const PaymentTable = ({ paymentType, rows }: { paymentType: string; rows: Txn[] }) => {
  const totalReceived = rows.reduce((s, r) => s + (r.received || 0), 0);
  const totalPending = rows.reduce((s, r) => s + (r.pending || 0), 0);
  return (
    <View style={s.paymentBlock}>
      <View style={s.paymentHeader}>
        <Text style={s.paymentHeaderText}>{paymentType}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={s.tableHeaderRow}>
            {COL_LABELS.map((lbl, i) => (
              <Text key={lbl} style={[s.tableHeaderCell, { width: COL_WIDTHS[i] }]}>{lbl}</Text>
            ))}
          </View>
          {rows.map((r, i) => (
            <View key={r.order_id ?? i} style={[s.tableDataRow, i % 2 === 1 && s.tableDataRowAlt]}>
              <Text style={[s.tableCell, s.cellMuted, { width: COL_WIDTHS[0] }]}>{i + 1}</Text>
              <Text style={[s.tableCell, s.cellRed, { width: COL_WIDTHS[1] }]} numberOfLines={1}>{r.name ?? '—'}</Text>
              <Text style={[s.tableCell, { width: COL_WIDTHS[2] }]}>{r.order_id ?? '—'}</Text>
              <Text style={[s.tableCell, { width: COL_WIDTHS[3] }]}>{display(r.receiving_date)}</Text>
              <Text style={[s.tableCell, { width: COL_WIDTHS[4] }]}>{fmtRs(r.TotalPackagePrice)}</Text>
              <Text style={[s.tableCell, { width: COL_WIDTHS[5] }]}>{fmtRs(r.DiscountedPrice)}</Text>
              <Text style={[s.tableCell, { width: COL_WIDTHS[6] }]}>{fmtRs(r.tax)}</Text>
              <Text style={[s.tableCell, s.cellGreen, { width: COL_WIDTHS[7] }]}>{fmtRs(r.NetPrice)}</Text>
              <Text style={[s.tableCell, { width: COL_WIDTHS[8] }]}>{fmtRs(r.received)}</Text>
              <Text style={[s.tableCell, r.pending > 0 && s.cellRed, { width: COL_WIDTHS[9] }]}>{fmtRs(r.pending)}</Text>
            </View>
          ))}
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total Received: <Text style={s.totalsVal}>{fmtRs(totalReceived)}</Text></Text>
            <Text style={s.totalsLabel}>Total Pending: <Text style={[s.totalsVal, totalPending > 0 && s.cellRed]}>{fmtRs(totalPending)}</Text></Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const SalesReportScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(() => startOfMonth());
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [gender, setGender]       = useState('');

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  useEffect(() => {
    getExpensePaymentMethods()
      .then((list: any[]) => setPaymentMethods(list.map(p => ({ id: String(p.id), label: p.name }))))
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSalesDetail({
        branch_id: branchId, start_date: startDate, end_date: endDate,
        gender: gender || undefined, payment_method_id: paymentMethodId || undefined,
      });
      setData(res.data ?? null);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const applyQuick = (q: typeof QUICK_DATES[0]) => {
    setStartDate(q.start());
    setEndDate(q.end());
  };

  const handleDateConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'start') { setStartDate(iso); if (iso > endDate) setEndDate(iso); }
    else setEndDate(iso);
    setPickerFor(null);
  };

  const dayGroups = useMemo(() => groupByDateThenPayment(data), [data]);
  const paymentMethodLabel = paymentMethods.find(p => p.id === paymentMethodId)?.label ?? 'All Payment Method';

  return (
    <>
      <AppHeader
        title="Sales Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={styles.container}>

        {/* Date pickers */}
        <View style={s.dateBar}>
          <TouchableOpacity style={s.dateBtn} onPress={() => setPickerFor('start')}>
            <Icon name="calendar" size={14} color="#E63946" />
            <Text style={s.dateText}>{display(startDate)}</Text>
          </TouchableOpacity>
          <Text style={s.sep}>→</Text>
          <TouchableOpacity style={s.dateBtn} onPress={() => setPickerFor('end')}>
            <Icon name="calendar" size={14} color="#E63946" />
            <Text style={s.dateText}>{display(endDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick date chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={s.chipContent}>
          {QUICK_DATES.map(q => (
            <TouchableOpacity key={q.label} style={s.chip} onPress={() => applyQuick(q)}>
              <Text style={s.chipText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Gender filter */}
        <View style={s.genderRow}>
          {GENDERS.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[s.genderChip, gender === g.id && s.genderChipActive]}
              onPress={() => setGender(g.id)}
            >
              <Text style={[s.genderChipText, gender === g.id && s.genderChipTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment method filter */}
        <TouchableOpacity style={s.paymentSelect} onPress={() => setPaymentModalVisible(true)}>
          <Icon name="credit-card-outline" size={16} color="#666" style={{ marginRight: 6 }} />
          <Text style={s.paymentSelectText} numberOfLines={1}>{paymentMethodLabel}</Text>
          <Icon name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>

        {/* Go button */}
        <TouchableOpacity style={s.goBtn} onPress={load} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.goText}>Go</Text>}
        </TouchableOpacity>

        {!loading && !fetched && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyTitle}>Sales Report</Text>
            <Text style={styles.emptySubtitle}>Select filters and tap Go.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

        {!loading && fetched && dayGroups.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptySubtitle}>No sales found for the selected filters.</Text>
          </View>
        )}

        {!loading && dayGroups.map(({ date, groups }) => (
          <View key={date} style={{ marginBottom: 16 }}>
            <View style={s.dateHeader}>
              <Text style={s.dateHeaderText}>{dateLabel(date)}</Text>
            </View>
            {groups.map(g => (
              <PaymentTable key={g.paymentType} paymentType={g.paymentType} rows={g.rows} />
            ))}
          </View>
        ))}

      </ScrollView>

      <DateTimePickerModal
        isVisible={pickerFor !== null}
        mode="date"
        date={new Date(pickerFor === 'start' ? startDate : endDate)}
        maximumDate={pickerFor === 'start' ? new Date(endDate) : new Date()}
        minimumDate={pickerFor === 'end' ? new Date(startDate) : undefined}
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerFor(null)}
      />

      {/* Payment method modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setPaymentModalVisible(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Search by Payment Method</Text>
            <FlatList
              data={[{ id: '', label: 'All Payment Method' }, ...paymentMethods]}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalOption, paymentMethodId === item.id && s.modalOptionSelected]}
                  onPress={() => { setPaymentMethodId(item.id); setPaymentModalVisible(false); }}
                >
                  <Icon
                    name={paymentMethodId === item.id ? 'check-circle' : 'circle-outline'}
                    size={20}
                    color={paymentMethodId === item.id ? '#E63946' : '#ccc'}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[s.modalOptionText, paymentMethodId === item.id && { color: '#E63946', fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  dateBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dateBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:         { fontSize: 14, color: '#999' },
  chipRow:     { height: 32, marginBottom: 10 },
  chipContent: { alignItems: 'center', gap: 8, paddingRight: 4 },
  chip:        { height: 28, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  chipText:    { fontSize: 12, color: '#444', fontWeight: '500', lineHeight: 14 },
  genderRow:   { flexDirection: 'row', gap: 8, marginBottom: 10 },
  genderChip:  { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 9, alignItems: 'center', backgroundColor: '#FAFAFA' },
  genderChipActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  genderChipText: { fontSize: 13, color: '#444', fontWeight: '600' },
  genderChipTextActive: { color: '#FFF' },
  paymentSelect: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA', marginBottom: 10 },
  paymentSelectText: { flex: 1, fontSize: 13, color: '#1A1A1A' },
  goBtn:       { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  goText:      { color: '#FFF', fontWeight: '700', fontSize: 15 },

  dateHeader:  { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8 },
  dateHeaderText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  paymentBlock: { marginBottom: 12, backgroundColor: '#FFF', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  paymentHeader: { backgroundColor: '#C0392B', paddingVertical: 8, paddingHorizontal: 12 },
  paymentHeaderText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 8, paddingHorizontal: 4 },
  tableHeaderCell: { fontSize: 10, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  tableDataRow: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tableDataRowAlt: { backgroundColor: '#FBF8F8' },
  tableCell:   { fontSize: 11, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:   { color: '#888' },
  cellRed:     { color: '#C0392B', fontWeight: '600' },
  cellGreen:   { color: '#10b981', fontWeight: '600' },
  totalsRow:   { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, backgroundColor: '#FFF3F3', gap: 16 },
  totalsLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
  totalsVal:   { fontSize: 12, color: '#1A1A1A', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:  { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28, maxHeight: '70%' },
  modalTitle:  { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalOptionSelected: { backgroundColor: '#FFF5F5', borderRadius: 8 },
  modalOptionText: { fontSize: 14, color: '#333' },
});

export default SalesReportScreen;
