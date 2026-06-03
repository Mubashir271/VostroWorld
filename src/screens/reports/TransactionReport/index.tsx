import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { getTransactionReport } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';
import AppHeader from '../../../components/AppHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
};
const fmtRs = (val: any) => {
  const n = parseFloat(val ?? 0);
  return `Rs ${n.toLocaleString()}/-`;
};

const today = () => fmt(new Date());
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmt(d);
};
const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return fmt(d);
};
const startOfLastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return fmt(d);
};
const endOfLastMonth = () => {
  const d = new Date();
  d.setDate(0);
  return fmt(d);
};

const QUICK_DATES = [
  { label: 'Today',      start: () => today(),          end: () => today() },
  { label: 'Yesterday',  start: () => daysAgo(1),       end: () => daysAgo(1) },
  { label: 'This Month', start: () => startOfMonth(),   end: () => today() },
  { label: 'Last Month', start: () => startOfLastMonth(), end: () => endOfLastMonth() },
  { label: 'Last 30',    start: () => daysAgo(30),      end: () => today() },
  { label: 'Last 90',    start: () => daysAgo(90),      end: () => today() },
];

const COL_WIDTHS = [40, 130, 74, 110, 90, 90, 80];
const COL_LABELS = ['Sr#', 'Client', 'Order ID', 'Sold By', 'Sale Date', 'Price', 'Discount'];

const flatten = (raw: any[]): any[] => {
  if (raw.length > 0 && raw[0]?.date && Array.isArray(raw[0]?.data)) {
    return raw.flatMap((group: any) =>
      group.data.map((tx: any) => ({ ...tx, _date: tx.date ?? group.date })),
    );
  }
  return raw;
};

const TransactionReportScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTransactionReport({ branch_id: branchId, start_date: startDate, end_date: endDate });
      const raw = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setRows(flatten(raw));
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

  const totalPrice    = rows.reduce((s, r) => s + (parseFloat(r.net_price ?? r.price ?? 0) || 0), 0);
  const totalDiscount = rows.reduce((s, r) => s + (parseFloat(r.discount ?? 0) || 0), 0);
  const totalGst      = rows.reduce((s, r) => s + (parseFloat(r.gst ?? r.tax ?? 0) || 0), 0);

  const TableHeader = () => (
    <View style={tbl.headerRow}>
      {COL_LABELS.map((lbl, i) => (
        <Text key={lbl} style={[tbl.headerCell, { width: COL_WIDTHS[i] }]}>{lbl}</Text>
      ))}
    </View>
  );

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[tbl.dataRow, index % 2 === 1 && tbl.dataRowAlt]}>
      <Text style={[tbl.cell, tbl.cellMuted, { width: COL_WIDTHS[0] }]}>{index + 1}</Text>
      <Text style={[tbl.cell, tbl.cellRed,  { width: COL_WIDTHS[1] }]} numberOfLines={1}>
        {item.client_name ?? item.member_name ?? '—'}
      </Text>
      <Text style={[tbl.cell, { width: COL_WIDTHS[2] }]}>{item.order_id ?? item.id ?? '—'}</Text>
      <Text style={[tbl.cell, { width: COL_WIDTHS[3] }]} numberOfLines={1}>{item.sold_by ?? '—'}</Text>
      <Text style={[tbl.cell, { width: COL_WIDTHS[4] }]}>
        {item._date ?? item.sale_date ?? item.date ?? '—'}
      </Text>
      <Text style={[tbl.cell, tbl.cellGreen, { width: COL_WIDTHS[5] }]}>
        {fmtRs(item.net_price ?? item.price)}
      </Text>
      <Text style={[tbl.cell, { width: COL_WIDTHS[6] }]}>
        {fmtRs(item.discount)}
      </Text>
    </View>
  );

  const TotalsRow = () => (
    <View style={tbl.totalsRow}>
      <Text style={tbl.totalsLabel}>Total Price:</Text>
      <Text style={tbl.totalsVal}>{fmtRs(totalPrice)}</Text>
      <Text style={tbl.totalsLabel}>  Discount:</Text>
      <Text style={tbl.totalsVal}>{fmtRs(totalDiscount)}</Text>
      {totalGst > 0 && (
        <>
          <Text style={tbl.totalsLabel}>  GST:</Text>
          <Text style={tbl.totalsVal}>{fmtRs(totalGst)}</Text>
        </>
      )}
    </View>
  );

  return (
    <>
      <AppHeader
        title="Transaction Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.container}>

        {/* Top controls — fixed, never flex-grows */}
        <View>
          {/* Date pickers */}
          <View style={ui.dateBar}>
            <TouchableOpacity style={ui.dateBtn} onPress={() => setPickerFor('start')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={ui.dateText}>{display(startDate)}</Text>
            </TouchableOpacity>
            <Text style={ui.sep}>→</Text>
            <TouchableOpacity style={ui.dateBtn} onPress={() => setPickerFor('end')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={ui.dateText}>{display(endDate)}</Text>
            </TouchableOpacity>
          </View>

          {/* Quick date chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={ui.chipRow}
            contentContainerStyle={ui.chipContent}
          >
            {QUICK_DATES.map(q => (
              <TouchableOpacity key={q.label} style={ui.chip} onPress={() => applyQuick(q)}>
                <Text style={ui.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Go button */}
          <TouchableOpacity style={ui.goBtn} onPress={load} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={ui.goText}>Go</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Results area */}
        {!loading && !fetched && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>Transaction Report</Text>
            <Text style={styles.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

        {!loading && fetched && rows.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptySubtitle}>No transactions found for the selected period.</Text>
          </View>
        )}

        {/* Table */}
        {!loading && fetched && rows.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <TableHeader />
              <FlatList
                data={rows}
                keyExtractor={(_, i) => i.toString()}
                renderItem={renderRow}
                ListFooterComponent={<TotalsRow />}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </ScrollView>
        )}

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

const ui = StyleSheet.create({
  dateBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dateBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:         { fontSize: 14, color: '#999' },
  chipRow:     { height: 32, marginBottom: 10 },
  chipContent: { alignItems: 'center', gap: 8, paddingRight: 4 },
  chip:        { height: 28, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  chipText:    { fontSize: 12, color: '#444', fontWeight: '500', lineHeight: 14 },
  goBtn:       { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  goText:      { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

const tbl = StyleSheet.create({
  headerRow:   { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell:  { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:     { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dataRowAlt:  { backgroundColor: '#FBF8F8' },
  cell:        { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:   { color: '#888' },
  cellRed:     { color: '#C0392B', fontWeight: '600' },
  cellGreen:   { color: '#10b981', fontWeight: '600' },
  totalsRow:   { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#FFF3F3', borderTopWidth: 2, borderTopColor: '#C0392B', gap: 4 },
  totalsLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
  totalsVal:   { fontSize: 12, color: '#C0392B', fontWeight: '700' },
});

export default TransactionReportScreen;
