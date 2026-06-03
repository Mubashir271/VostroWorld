import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { getCafeSalesReport } from '../../../api/cafe';
import { reportStyles as rStyles } from '../styles/reportStyles';
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
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const fmtRs = (val: any) => {
  const n = parseFloat(val ?? 0);
  return isNaN(n) ? 'Rs 0/-' : `Rs ${n.toLocaleString()}/-`;
};

const today       = () => fmt(new Date());
const daysAgo     = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfYear = () => { const d = new Date(); d.setMonth(0, 1); return fmt(d); };
const startOfMonth= () => { const d = new Date(); d.setDate(1); return fmt(d); };
const startOfQtr  = () => { const d = new Date(); d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1); return fmt(d); };

const QUICK_ROWS = [
  [
    { label: 'Today',    start: today,        end: today },
    { label: 'Yesterday',start: () => daysAgo(1), end: () => daysAgo(1) },
    { label: 'Month',    start: startOfMonth, end: today },
    { label: 'Quarter',  start: startOfQtr,   end: today },
  ],
  [
    { label: 'Year',     start: startOfYear,       end: today },
    { label: 'Last 30',  start: () => daysAgo(30),  end: today },
    { label: 'Last 90',  start: () => daysAgo(90),  end: today },
    { label: 'Last 365', start: () => daysAgo(365), end: today },
  ],
];

const COL_W = [36, 120, 74, 90, 80, 80, 70, 90];
const COL_L = ['Sr#', 'Client', 'Order ID', 'Sale Date', 'Price', 'Discount', 'GST', 'Net Price'];

const flatten = (raw: any[]): any[] => {
  if (raw.length > 0 && raw[0]?.date && Array.isArray(raw[0]?.data)) {
    return raw.flatMap((g: any) => g.data.map((r: any) => ({ ...r, _date: r.date ?? g.date })));
  }
  return raw;
};

const CafeReportScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [rows, setRows]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [fetched, setFetched]       = useState(false);
  const [startDate, setStartDate]   = useState(today);
  const [endDate, setEndDate]       = useState(today);
  const [pickerFor, setPickerFor]   = useState<'start' | 'end' | null>(null);
  const [reportType, setReportType] = useState<'detail' | 'summary'>('detail');
  const [filterOpen, setFilterOpen] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCafeSalesReport({
        branch_id: branchId,
        start_date: startDate,
        end_date: endDate,
        report_type: reportType,
      });
      const raw = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setRows(flatten(raw));
      setFetched(true);
      setFilterOpen(false); // collapse filter when results load
    } finally {
      setLoading(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'start') { setStartDate(iso); if (iso > endDate) setEndDate(iso); }
    else setEndDate(iso);
    setPickerFor(null);
  };

  const applyQuick = (q: { label: string; start: () => string; end: () => string }) => {
    setStartDate(q.start());
    setEndDate(q.end());
  };

  const totalPrice    = rows.reduce((s, r) => s + (parseFloat(r.price ?? 0) || 0), 0);
  const totalDiscount = rows.reduce((s, r) => s + (parseFloat(r.discount ?? 0) || 0), 0);
  const totalGst      = rows.reduce((s, r) => s + (parseFloat(r.gst ?? r.tax ?? 0) || 0), 0);
  const totalNet      = rows.reduce((s, r) => s + (parseFloat(r.net_price ?? r.price ?? 0) || 0), 0);
  const totalReceived = rows.reduce((s, r) => s + (parseFloat(r.total_received ?? r.net_price ?? r.price ?? 0) || 0), 0);
  const totalPending  = Math.max(0, totalNet - totalReceived);

  const TableHeader = () => (
    <View style={tbl.headerRow}>
      {COL_L.map((lbl, i) => (
        <Text key={lbl} style={[tbl.headerCell, { width: COL_W[i] }]}>{lbl}</Text>
      ))}
    </View>
  );

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[tbl.dataRow, index % 2 === 1 && tbl.dataRowAlt]}>
      <Text style={[tbl.cell, tbl.cellMuted, { width: COL_W[0] }]}>{index + 1}</Text>
      <Text style={[tbl.cell, tbl.cellRed, { width: COL_W[1] }]} numberOfLines={1}>
        {item.client_name ?? item.member_name ?? 'Walk in Customer'}
      </Text>
      <Text style={[tbl.cell, { width: COL_W[2] }]}>{item.order_id ?? item.id ?? '—'}</Text>
      <Text style={[tbl.cell, { width: COL_W[3] }]}>{item._date ?? item.sale_date ?? item.date ?? '—'}</Text>
      <Text style={[tbl.cell, { width: COL_W[4] }]}>{fmtRs(item.price)}</Text>
      <Text style={[tbl.cell, { width: COL_W[5] }]}>{fmtRs(item.discount)}</Text>
      <Text style={[tbl.cell, { width: COL_W[6] }]}>{fmtRs(item.gst ?? item.tax)}</Text>
      <Text style={[tbl.cell, tbl.cellGreen, { width: COL_W[7] }]}>{fmtRs(item.net_price ?? item.price)}</Text>
    </View>
  );

  return (
    <>
      <AppHeader
        title="Cafe Sales Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={rStyles.container}>

        {/* ── Filter panel (collapsible) ── */}
        <View style={ui.filterCard}>
          {/* Filter header — always visible */}
          <TouchableOpacity style={ui.filterHeader} onPress={() => setFilterOpen(v => !v)} activeOpacity={0.7}>
            <View style={ui.filterHeaderLeft}>
              <Icon name="filter-variant" size={16} color="#E63946" />
              <Text style={ui.filterHeaderTitle}>Filters</Text>
              {fetched && !filterOpen && (
                <Text style={ui.filterSummary}>
                  {display(startDate)} → {display(endDate)}
                </Text>
              )}
            </View>
            <Icon name={filterOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#888" />
          </TouchableOpacity>

          {filterOpen && (
            <View style={ui.filterBody}>
              {/* Quick date chips — rows */}
              <Text style={ui.sectionLabel}>Quick Dates</Text>
              {QUICK_ROWS.map((row, ri) => (
                <View key={ri} style={ui.chipRow}>
                  {row.map(q => (
                    <TouchableOpacity
                      key={q.label}
                      style={[
                        ui.chip,
                        startDate === q.start() && endDate === q.end() && ui.chipActive,
                      ]}
                      onPress={() => applyQuick(q)}
                    >
                      <Text style={[
                        ui.chipText,
                        startDate === q.start() && endDate === q.end() && ui.chipTextActive,
                      ]}>
                        {q.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              {/* Date inputs */}
              <Text style={[ui.sectionLabel, { marginTop: 12 }]}>Date Range</Text>
              <View style={ui.dateBar}>
                <TouchableOpacity style={ui.dateBtn} onPress={() => setPickerFor('start')}>
                  <Icon name="calendar-start" size={14} color="#E63946" />
                  <Text style={ui.dateText}>{display(startDate)}</Text>
                </TouchableOpacity>
                <Icon name="arrow-right" size={16} color="#bbb" />
                <TouchableOpacity style={ui.dateBtn} onPress={() => setPickerFor('end')}>
                  <Icon name="calendar-end" size={14} color="#E63946" />
                  <Text style={ui.dateText}>{display(endDate)}</Text>
                </TouchableOpacity>
              </View>

              {/* Summary / Detail toggle */}
              <Text style={[ui.sectionLabel, { marginTop: 12 }]}>Report Type</Text>
              <View style={ui.toggleRow}>
                {(['summary', 'detail'] as const).map(t => (
                  <TouchableOpacity key={t} style={ui.radioItem} onPress={() => setReportType(t)}>
                    <View style={[ui.radio, reportType === t && ui.radioActive]}>
                      {reportType === t && <View style={ui.radioDot} />}
                    </View>
                    <Text style={[ui.radioLabel, reportType === t && ui.radioLabelActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Go */}
              <TouchableOpacity style={ui.goBtn} onPress={load} disabled={loading}>
                {loading
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={ui.goText}>Go</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Results area ── */}
        {!loading && !fetched && (
          <View style={rStyles.emptyState}>
            <Text style={rStyles.emptyIcon}>☕</Text>
            <Text style={rStyles.emptyTitle}>Cafe Sales Report</Text>
            <Text style={rStyles.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

        {!loading && fetched && rows.length === 0 && (
          <View style={rStyles.emptyState}>
            <Text style={rStyles.emptyIcon}>☕</Text>
            <Text style={rStyles.emptyTitle}>No Records</Text>
            <Text style={rStyles.emptySubtitle}>No cafe sales found for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && rows.length > 0 && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Result count bar */}
            <View style={ui.resultBar}>
              <Text style={ui.resultLabel}>Filtered Result</Text>
              <Text style={ui.resultCount}>{rows.length} record{rows.length !== 1 ? 's' : ''}</Text>
            </View>

            {/* Horizontal table */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <TableHeader />
                <FlatList
                  data={rows}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={renderRow}
                  scrollEnabled={false}
                  ListFooterComponent={
                    <View style={tbl.totalsRow}>
                      <View style={tbl.totalItem}><Text style={tbl.totalsLabel}>Total Price</Text><Text style={tbl.totalsVal}>{fmtRs(totalPrice)}</Text></View>
                      <View style={tbl.totalItem}><Text style={tbl.totalsLabel}>Discount</Text><Text style={tbl.totalsVal}>{fmtRs(totalDiscount)}</Text></View>
                      <View style={tbl.totalItem}><Text style={tbl.totalsLabel}>GST</Text><Text style={tbl.totalsVal}>{fmtRs(totalGst)}</Text></View>
                      <View style={tbl.totalItem}><Text style={tbl.totalsLabel}>Net Price</Text><Text style={tbl.totalsVal}>{fmtRs(totalNet)}</Text></View>
                    </View>
                  }
                />
              </View>
            </ScrollView>

            {/* Summary card */}
            <View style={ui.summaryCard}>
              <View style={ui.summaryRow}><Text style={ui.sumLabel}>Total Price</Text><Text style={ui.sumVal}>{fmtRs(totalPrice)}</Text></View>
              <View style={ui.summaryRow}><Text style={ui.sumLabel}>Total Discount</Text><Text style={ui.sumVal}>{fmtRs(totalDiscount)}</Text></View>
              <View style={ui.summaryRow}><Text style={ui.sumLabel}>Total GST</Text><Text style={ui.sumVal}>{fmtRs(totalGst)}</Text></View>
              <View style={ui.summaryRow}><Text style={ui.sumLabel}>Total Net Price</Text><Text style={ui.sumValBold}>{fmtRs(totalNet)}</Text></View>
              <View style={ui.summaryRow}><Text style={ui.sumLabel}>Total Received</Text><Text style={ui.sumValBold}>{fmtRs(totalReceived)}</Text></View>
              <View style={[ui.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={ui.sumLabel}>Total Pending</Text>
                <Text style={[ui.sumValBold, { color: totalPending > 0 ? '#C0392B' : '#10b981' }]}>{fmtRs(totalPending)}</Text>
              </View>
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
  filterCard:        { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  filterHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  filterHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  filterHeaderTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  filterSummary:     { fontSize: 12, color: '#888', marginLeft: 4 },
  filterBody:        { paddingHorizontal: 14, paddingBottom: 14 },
  sectionLabel:      { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow:           { flexDirection: 'row', gap: 8, marginBottom: 6 },
  chip:              { flex: 1, height: 30, backgroundColor: '#F5F5F5', borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8E8E8' },
  chipActive:        { backgroundColor: '#E63946', borderColor: '#E63946' },
  chipText:          { fontSize: 12, color: '#555', fontWeight: '500' },
  chipTextActive:    { color: '#FFF', fontWeight: '700' },
  dateBar:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:          { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  toggleRow:         { flexDirection: 'row', gap: 24, marginBottom: 12 },
  radioItem:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radio:             { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  radioActive:       { borderColor: '#E63946' },
  radioDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E63946' },
  radioLabel:        { fontSize: 14, color: '#555' },
  radioLabelActive:  { color: '#E63946', fontWeight: '600' },
  goBtn:             { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  goText:            { color: '#FFF', fontWeight: '700', fontSize: 15 },
  resultBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  resultLabel:       { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  resultCount:       { fontSize: 12, color: '#888', fontWeight: '500' },
  summaryCard:       { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginTop: 14, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  summaryRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  sumLabel:          { fontSize: 13, color: '#555' },
  sumVal:            { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sumValBold:        { fontSize: 14, color: '#1A1A1A', fontWeight: '700' },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:    { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:  { color: '#888' },
  cellRed:    { color: '#C0392B', fontWeight: '600' },
  cellGreen:  { color: '#10b981', fontWeight: '600' },
  totalsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#FFF3F3', borderTopWidth: 2, borderTopColor: '#C0392B' },
  totalItem:  { alignItems: 'flex-start', minWidth: 80 },
  totalsLabel:{ fontSize: 11, color: '#777' },
  totalsVal:  { fontSize: 12, color: '#C0392B', fontWeight: '700' },
});

export default CafeReportScreen;
