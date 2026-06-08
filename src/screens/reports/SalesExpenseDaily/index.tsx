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
import { getSalesExpenseDaily } from '../../../api/reports';

const fmt = (d: Date) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfMonth = () => { const d = new Date(); d.setDate(1); return fmt(d); };
const fmtRs = (v: any) => `Rs ${parseFloat(v ?? 0).toLocaleString()}`;

const QUICK = [
  { label: 'Today',     start: today,           end: today },
  { label: 'Yesterday', start: () => daysAgo(1), end: () => daysAgo(1) },
  { label: 'This Month', start: startOfMonth,   end: today },
  { label: 'Last 30',   start: () => daysAgo(30), end: today },
];

const SalesExpenseDailyScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSalesExpenseDaily({ branch_id: branchId, start_date: startDate, end_date: endDate });
      setData(res.data?.data ?? res.data ?? null);
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

  // Normalise: API might return flat object or array of categories
  const categories: any[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? Object.entries(data).map(([k, v]: any) => ({ name: k, ...(typeof v === 'object' ? v : { value: v }) }))
      : [];

  const totalSales   = categories.reduce((s, r) => s + (parseFloat(r.sales ?? r.total_sales ?? r.sale ?? 0) || 0), 0);
  const totalExpense = categories.reduce((s, r) => s + (parseFloat(r.expense ?? r.total_expense ?? r.expenses ?? 0) || 0), 0);

  return (
    <>
      <AppHeader
        title="Sales & Expense Daily"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.filterBar}>
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

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

        {!loading && !fetched && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📉</Text>
            <Text style={s.emptyTitle}>Sales & Expense Daily</Text>
            <Text style={s.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {!loading && fetched && categories.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📉</Text>
            <Text style={s.emptyTitle}>No Data</Text>
            <Text style={s.emptySubtitle}>No data found for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && categories.length > 0 && (
          <>
            {/* Summary */}
            <View style={s.summaryRow}>
              <View style={[s.summaryCard, { borderColor: '#16A34A' }]}>
                <Text style={[s.summaryVal, { color: '#16A34A' }]}>{fmtRs(totalSales)}</Text>
                <Text style={s.summaryLabel}>Total Sales</Text>
              </View>
              <View style={[s.summaryCard, { borderColor: '#E63946' }]}>
                <Text style={[s.summaryVal, { color: '#E63946' }]}>{fmtRs(totalExpense)}</Text>
                <Text style={s.summaryLabel}>Total Expenses</Text>
              </View>
              <View style={[s.summaryCard, { borderColor: '#2563EB' }]}>
                <Text style={[s.summaryVal, { color: '#2563EB' }]}>{fmtRs(totalSales - totalExpense)}</Text>
                <Text style={s.summaryLabel}>Net</Text>
              </View>
            </View>

            {/* Category breakdown */}
            {categories.map((item, i) => (
              <View key={i} style={s.card}>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {item.category_name ?? item.name ?? item.category ?? `Category ${i + 1}`}
                </Text>
                <View style={s.cardBody}>
                  <View style={s.metricBox}>
                    <Text style={[s.metricVal, { color: '#16A34A' }]}>
                      {fmtRs(item.sales ?? item.total_sales ?? item.sale)}
                    </Text>
                    <Text style={s.metricLabel}>Sales</Text>
                  </View>
                  <View style={s.divider} />
                  <View style={s.metricBox}>
                    <Text style={[s.metricVal, { color: '#E63946' }]}>
                      {fmtRs(item.expense ?? item.total_expense ?? item.expenses)}
                    </Text>
                    <Text style={s.metricLabel}>Expense</Text>
                  </View>
                  <View style={s.divider} />
                  <View style={s.metricBox}>
                    <Text style={[s.metricVal, { color: '#2563EB' }]}>
                      {fmtRs((parseFloat(item.sales ?? item.total_sales ?? 0) || 0) - (parseFloat(item.expense ?? item.total_expense ?? 0) || 0))}
                    </Text>
                    <Text style={s.metricLabel}>Net</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
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
    </>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F5F7FA', padding: 12 },
  filterBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:          { fontSize: 14, color: '#999' },
  chipRow:      { height: 32, marginBottom: 8 },
  chipContent:  { alignItems: 'center', gap: 8 },
  chip:         { height: 28, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' },
  chipText:     { fontSize: 12, color: '#444', fontWeight: '500' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  emptyState:   { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  summaryRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard:  { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1.5, elevation: 1 },
  summaryVal:   { fontSize: 13, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  cardBody:     { flexDirection: 'row', alignItems: 'center' },
  metricBox:    { flex: 1, alignItems: 'center' },
  metricVal:    { fontSize: 14, fontWeight: '800' },
  metricLabel:  { fontSize: 11, color: '#999', marginTop: 2 },
  divider:      { width: 1, height: 30, backgroundColor: '#F0F0F0' },
});

export default SalesExpenseDailyScreen;
