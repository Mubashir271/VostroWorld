import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getDetailedSalesReport } from '../../../api/reports';

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfMonth = () => { const d = new Date(); d.setDate(1); return fmt(d); };
const fmtRs = (v: any) => `Rs ${parseFloat(v ?? 0).toLocaleString()}`;

const QUICK = [
  { label: 'Today',      start: today,             end: today },
  { label: 'Yesterday',  start: () => daysAgo(1),  end: () => daysAgo(1) },
  { label: 'This Month', start: startOfMonth,       end: today },
  { label: 'Last 30',    start: () => daysAgo(30),  end: today },
  { label: 'Last 90',    start: () => daysAgo(90),  end: today },
];

const TABS = ['Detail', 'Mgmt Summary', 'Trainer Wise', 'Package Wise', 'Branch Wise'];

const DetailedSalesReportScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [activeTab, setActiveTab] = useState('Detail');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDetailedSalesReport({ branch_id: branchId, start_date: startDate, end_date: endDate });
      const raw = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setRows(raw);
      setFetched(true);
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

  const totalRecords  = rows.length;
  const totalSales    = rows.reduce((s, r) => s + (parseFloat(r.order_detail_price ?? r.price ?? 0) || 0), 0);
  const totalDiscount = rows.reduce((s, r) => s + (parseFloat(r.order_detail_discount ?? r.discount ?? 0) || 0), 0);
  const totalGst      = rows.reduce((s, r) => s + (parseFloat(r.order_detail_gst ?? r.gst ?? r.tax ?? 0) || 0), 0);
  const totalNet      = rows.reduce((s, r) => s + (parseFloat(r.order_detail_net_price ?? r.net_price ?? r.order_detail_price ?? 0) || 0), 0);

  const groupBy = (key: string) =>
    rows.reduce((acc: any, row: any) => {
      const k = row[key] ?? 'Unknown';
      if (!acc[k]) acc[k] = { label: k, rows: [], total: 0 };
      acc[k].rows.push(row);
      acc[k].total += parseFloat(row.order_detail_net_price ?? row.net_price ?? row.order_detail_price ?? 0) || 0;
      return acc;
    }, {});

  const renderDetailRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[tbl.row, index % 2 === 1 && tbl.rowAlt]}>
      <Text style={[tbl.cell, tbl.cellMuted, { width: 36 }]}>{index + 1}</Text>
      <Text style={[tbl.cell, tbl.cellRed, { width: 130 }]} numberOfLines={1}>
        {item.client_name ?? item.member_name ?? '—'}
      </Text>
      <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>
        {item.package_name ?? item.product_name ?? '—'}
      </Text>
      <Text style={[tbl.cell, { width: 80 }]}>
        {item.sale_date ?? item.created_at?.slice(0, 10) ?? '—'}
      </Text>
      <Text style={[tbl.cell, tbl.cellGreen, { width: 90 }]}>
        {fmtRs(item.order_detail_net_price ?? item.net_price ?? item.order_detail_price)}
      </Text>
      <Text style={[tbl.cell, { width: 80 }]}>
        {fmtRs(item.order_detail_discount ?? item.discount)}
      </Text>
      <Text style={[tbl.cell, { width: 80 }]}>
        {item.branch_name ?? item.branch ?? '—'}
      </Text>
      <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>
        {item.sold_by ?? item.seller_name ?? item.trainer_name ?? '—'}
      </Text>
    </View>
  );

  const renderGrouped = (groupKey: string) => {
    const groups = groupBy(groupKey);
    return (
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {Object.values(groups).map((g: any, i) => (
          <View key={i} style={s.groupCard}>
            <View style={s.groupHeader}>
              <Text style={s.groupLabel}>{g.label}</Text>
              <Text style={s.groupTotal}>{fmtRs(g.total)}</Text>
            </View>
            <Text style={s.groupCount}>{g.rows.length} sale{g.rows.length !== 1 ? 's' : ''}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <>
      <AppHeader
        title="Detailed Sales Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={s.screen}>
        {/* ── Fixed filter section ── */}
        <View style={s.filterCard}>
          <View style={s.dateRow}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={s.chipContent}>
            {QUICK.map(q => (
              <TouchableOpacity key={q.label} style={s.chip} onPress={() => { setStartDate(q.start()); setEndDate(q.end()); }}>
                <Text style={s.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.goBtn} onPress={load} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.goText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Results area ── */}
        {!loading && !fetched && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📈</Text>
            <Text style={s.emptyTitle}>Detailed Sales Report</Text>
            <Text style={s.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" style={{ marginTop: 32 }} color="#E63946" />}

        {!loading && fetched && (
          <View style={{ flex: 1 }}>
            {/* Stats strip */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.statsStrip} contentContainerStyle={s.statsContent}>
              {[
                { label: 'Records',   value: totalRecords,       color: '#2563EB' },
                { label: 'Sales',     value: fmtRs(totalSales),  color: '#16A34A' },
                { label: 'GST',       value: fmtRs(totalGst),    color: '#7C3AED' },
                { label: 'Net Price', value: fmtRs(totalNet),    color: '#D97706' },
                { label: 'Discount',  value: fmtRs(totalDiscount), color: '#E63946' },
              ].map(st => (
                <View key={st.label} style={[s.statCard, { borderTopColor: st.color }]}>
                  <Text style={[s.statValue, { color: st.color }]} numberOfLines={1}>{st.value}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow} contentContainerStyle={s.tabContent}>
              {TABS.map(tab => (
                <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
                  <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {rows.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📋</Text>
                <Text style={s.emptyTitle}>No Data</Text>
                <Text style={s.emptySubtitle}>No sales found for the selected period.</Text>
              </View>
            ) : activeTab === 'Detail' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                  <View style={tbl.header}>
                    {[{ l: '#', w: 36 }, { l: 'Client', w: 130 }, { l: 'Package', w: 100 }, { l: 'Date', w: 80 }, { l: 'Net Price', w: 90 }, { l: 'Discount', w: 80 }, { l: 'Branch', w: 80 }, { l: 'Sold By', w: 100 }].map(h => (
                      <Text key={h.l} style={[tbl.headerCell, { width: h.w }]}>{h.l}</Text>
                    ))}
                  </View>
                  <FlatList
                    data={rows}
                    keyExtractor={(_, i) => i.toString()}
                    renderItem={renderDetailRow}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </ScrollView>
            ) : activeTab === 'Trainer Wise'  ? renderGrouped('trainer_name')
              : activeTab === 'Package Wise'  ? renderGrouped('package_name')
              : activeTab === 'Branch Wise'   ? renderGrouped('branch_name')
              : (
                <ScrollView contentContainerStyle={{ padding: 12 }}>
                  <View style={s.summaryCard}>
                    <Text style={s.summaryLine}>Total Records:  <Text style={s.bold}>{totalRecords}</Text></Text>
                    <Text style={s.summaryLine}>Total Sales:    <Text style={s.bold}>{fmtRs(totalSales)}</Text></Text>
                    <Text style={s.summaryLine}>Total Discount: <Text style={s.bold}>{fmtRs(totalDiscount)}</Text></Text>
                    <Text style={s.summaryLine}>Total GST:      <Text style={s.bold}>{fmtRs(totalGst)}</Text></Text>
                    <Text style={s.summaryLine}>Net Price:      <Text style={[s.bold, { color: '#10b981' }]}>{fmtRs(totalNet)}</Text></Text>
                  </View>
                </ScrollView>
              )}
          </View>
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

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  filterCard:   { backgroundColor: '#FFF', padding: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dateRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:          { fontSize: 14, color: '#999' },
  chipRow:      { height: 30, marginBottom: 8 },
  chipContent:  { alignItems: 'center', gap: 6 },
  chip:         { height: 26, backgroundColor: '#F5F5F5', borderRadius: 13, paddingHorizontal: 12, justifyContent: 'center' },
  chipText:     { fontSize: 12, color: '#555', fontWeight: '500' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  empty:        { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyIcon:    { fontSize: 40, marginBottom: 10 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  statsStrip:   { height: 72, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF' },
  statsContent: { alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  statCard:     { backgroundColor: '#FAFAFA', borderRadius: 8, padding: 8, width: 110, alignItems: 'center', borderTopWidth: 3 },
  statValue:    { fontWeight: '800', fontSize: 13 },
  statLabel:    { fontSize: 10, color: '#999', marginTop: 2 },
  tabRow:       { height: 38, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabContent:   { alignItems: 'center', gap: 4, paddingHorizontal: 12 },
  tab:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#F0F0F0' },
  tabActive:    { backgroundColor: '#E63946' },
  tabText:      { fontSize: 12, color: '#555', fontWeight: '500' },
  tabTextActive:{ color: '#FFF', fontWeight: '700' },
  groupCard:    { backgroundColor: '#FFF', marginBottom: 8, borderRadius: 10, padding: 14, elevation: 1 },
  groupHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupLabel:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  groupTotal:   { fontSize: 14, fontWeight: '800', color: '#10b981' },
  groupCount:   { fontSize: 12, color: '#999', marginTop: 4 },
  summaryCard:  { backgroundColor: '#FFF', borderRadius: 10, padding: 16, elevation: 1 },
  summaryLine:  { fontSize: 14, color: '#555', marginBottom: 8 },
  bold:         { fontWeight: '700', color: '#1A1A1A' },
});

const tbl = StyleSheet.create({
  header:     { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:        { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:     { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:  { color: '#888' },
  cellRed:    { color: '#C0392B', fontWeight: '600' },
  cellGreen:  { color: '#10b981', fontWeight: '600' },
});

export default DetailedSalesReportScreen;
