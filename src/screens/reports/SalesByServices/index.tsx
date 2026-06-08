import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getSalesByServices } from '../../../api/reports';

const fmt = (d: Date) => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; };
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfMonth = () => { const d = new Date(); d.setDate(1); return fmt(d); };
const fmtRs = (v: any) => `Rs ${parseFloat(v ?? 0).toLocaleString()}`;

const QUICK = [
  { label: 'Today',      start: today,             end: today },
  { label: 'This Month', start: startOfMonth,       end: today },
  { label: 'Last 30',    start: () => daysAgo(30),  end: today },
  { label: 'Last 90',    start: () => daysAgo(90),  end: today },
];

const COLORS = ['#2563EB', '#16A34A', '#7C3AED', '#D97706', '#E63946', '#0891B2', '#DB2777'];

const SalesByServicesScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [data, setData]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSalesByServices({ branch_id: branchId, start_date: startDate, end_date: endDate });
      const raw = res.data?.data ?? res.data?.categories ?? (Array.isArray(res.data) ? res.data : []);
      setData(Array.isArray(raw) ? raw : Object.entries(raw).map(([k, v]: any) => ({ name: k, ...v })));
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

  const grandTotal = data.reduce((s, r) => s + (parseFloat(r.net_price ?? r.total_net_price ?? r.amount ?? r.sales ?? 0) || 0), 0);

  return (
    <>
      <AppHeader
        title="Sales By Services"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={s.screen}>
        {/* Fixed filter */}
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

        {/* Results */}
        {loading && <ActivityIndicator size="large" style={{ marginTop: 32 }} color="#E63946" />}

        {!loading && !fetched && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏷️</Text>
            <Text style={s.emptyTitle}>Sales By Services</Text>
            <Text style={s.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {!loading && fetched && data.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏷️</Text>
            <Text style={s.emptyTitle}>No Data</Text>
            <Text style={s.emptySubtitle}>No sales found for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && data.length > 0 && (
          <ScrollView contentContainerStyle={s.resultsPad}>
            <View style={s.grandCard}>
              <Text style={s.grandLabel}>Total Net Sales</Text>
              <Text style={s.grandValue}>{fmtRs(grandTotal)}</Text>
            </View>

            {data.map((item, i) => {
              const netPrice = parseFloat(item.net_price ?? item.total_net_price ?? item.amount ?? item.sales ?? 0) || 0;
              const color = COLORS[i % COLORS.length];
              const pct = grandTotal > 0 ? (netPrice / grandTotal) * 100 : 0;
              return (
                <View key={i} style={[s.card, { borderLeftColor: color }]}>
                  <View style={s.cardTop}>
                    <Text style={s.cardTitle} numberOfLines={1}>
                      {item.category_name ?? item.service_name ?? item.name ?? item.category ?? `Service ${i + 1}`}
                    </Text>
                    <Text style={[s.cardNet, { color }]}>{fmtRs(netPrice)}</Text>
                  </View>
                  {(item.total_price != null || item.total_discount != null || item.quantity != null) && (
                    <View style={s.cardMeta}>
                      {item.total_price    != null && <Text style={s.metaItem}>Price: {fmtRs(item.total_price ?? item.price)}</Text>}
                      {item.total_discount != null && <Text style={s.metaItem}>Disc: {fmtRs(item.total_discount ?? item.discount)}</Text>}
                      {item.quantity       != null && <Text style={s.metaItem}>Qty: {item.quantity ?? item.total_quantity}</Text>}
                    </View>
                  )}
                  <View style={s.barBg}>
                    <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={s.pctText}>{pct.toFixed(1)}% of total</Text>
                </View>
              );
            })}
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

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#F5F7FA' },
  filterCard:  { backgroundColor: '#FFF', padding: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:         { fontSize: 14, color: '#999' },
  chipRow:     { height: 30, marginBottom: 8 },
  chipContent: { alignItems: 'center', gap: 6 },
  chip:        { height: 26, backgroundColor: '#F5F5F5', borderRadius: 13, paddingHorizontal: 12, justifyContent: 'center' },
  chipText:    { fontSize: 12, color: '#555', fontWeight: '500' },
  goBtn:       { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  goText:      { color: '#FFF', fontWeight: '700', fontSize: 15 },
  empty:       { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyIcon:   { fontSize: 40, marginBottom: 10 },
  emptyTitle:  { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  resultsPad:  { padding: 12, paddingBottom: 32 },
  grandCard:   { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, marginBottom: 12, alignItems: 'center' },
  grandLabel:  { color: '#999', fontSize: 12, marginBottom: 2 },
  grandValue:  { color: '#FFF', fontSize: 20, fontWeight: '800' },
  card:        { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4, elevation: 1 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1, marginRight: 8 },
  cardNet:     { fontSize: 15, fontWeight: '800' },
  cardMeta:    { flexDirection: 'row', gap: 14, marginBottom: 8 },
  metaItem:    { fontSize: 12, color: '#666' },
  barBg:       { height: 5, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  barFill:     { height: 5, borderRadius: 3 },
  pctText:     { fontSize: 11, color: '#aaa' },
});

export default SalesByServicesScreen;
