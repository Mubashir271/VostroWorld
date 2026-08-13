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
import { isAdmin } from '../../../config/permissions';
import { getDailySalesSummary, getTransactionSummary } from '../../../api/reports';
import { getExpensesList, getBranchesNameList } from '../../../api/employeeDashboard';

const fmt = (d: Date) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const dayLabel = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}-${m}-${y}`; };
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfMonth = () => { const d = new Date(); d.setDate(1); return fmt(d); };
const fmtRs = (v: any) => `Rs ${(parseFloat(v ?? 0) || 0).toLocaleString()}`;

const QUICK = [
  { label: 'Today',      start: today,             end: today },
  { label: 'Yesterday',  start: () => daysAgo(1),  end: () => daysAgo(1) },
  { label: 'This Month', start: startOfMonth,      end: today },
  { label: 'Last 30',    start: () => daysAgo(30), end: today },
];

const CAFE_CATEGORY = 10;  // order category the web queries for cafe sales
const GST_RATE      = 0.05;

const W_SR = 44, W_DATE = 96, W_CELL = 122;

type Branch = { id: number | string; name: string };
type BranchData = { branch: Branch; sales: Rec; cafe: Rec; expense: Rec };
type Rec = Record<string, number>;

// A request that 404s means "no records in range" (the web renders Rs 0 for it),
// so failures collapse to an empty result rather than breaking the whole report.
const safe = async <T,>(run: () => Promise<T>): Promise<T | null> => {
  try { return await run(); } catch { return null; }
};

// Sum every numeric column of the `immediate` rows (Cash/Online/Credit_Card and
// `pending`). `later` is deliberately ignored — the web admin excludes it.
const salesByDate = (body: any): Rec => {
  const out: Rec = {};
  for (const row of body?.immediate ?? []) {
    const d = row?.date;
    if (!d) continue;
    let n = 0;
    for (const [k, v] of Object.entries(row)) if (k !== 'date' && typeof v === 'number') n += v;
    out[d] = (out[d] ?? 0) + n;
  }
  return out;
};

const cafeByDate = (body: any): Rec => {
  const out: Rec = {};
  for (const r of body?.data ?? []) {
    const d = r?.order_date;
    if (!d) continue;
    out[d] = (out[d] ?? 0) + (parseFloat(r.total_net_price) || 0);
  }
  return out;
};

const expenseByDate = (body: any): Rec => {
  const env = body?.data;
  const rows = Array.isArray(env) ? env : Array.isArray(env?.data) ? env.data : [];
  const out: Rec = {};
  for (const r of rows) {
    const d = String(r?.occurrence_date ?? '').slice(0, 10);
    if (!d) continue;
    out[d] = (out[d] ?? 0) + (parseFloat(r.amount) || 0);
  }
  return out;
};

const SalesExpenseDailyScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);

  const [data, setData]           = useState<BranchData[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Super admins/admins see every branch side by side, as the web does;
      // everyone else sees only their own.
      let branches: Branch[];
      if (isAdmin(profile?.role)) {
        const res = await safe(() => getBranchesNameList());
        branches = (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name }));
        if (!branches.length) branches = [{ id: profile?.branchId ?? '', name: profile?.branchName ?? 'Branch' }];
      } else {
        branches = [{ id: profile?.branchId ?? '', name: profile?.branchName ?? 'My Branch' }];
      }

      const results = await Promise.all(branches.map(async branch => {
        const base = { branch_id: branch.id, start_date: startDate, end_date: endDate };
        const [summary, cafe, expenses] = await Promise.all([
          safe(() => getDailySalesSummary(base).then(r => r.data)),
          safe(() => getTransactionSummary({ ...base, category: CAFE_CATEGORY }).then(r => r.data)),
          safe(() => getExpensesList({ ...base, limit: 1000, page: 1 })),
        ]);
        return {
          branch,
          sales:   salesByDate(summary),
          cafe:    cafeByDate(cafe),
          expense: expenseByDate(expenses),
        };
      }));

      setData(results);
    } catch {
      setData([]);
    } finally {
      setFetched(true);
      setLoading(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'start') { setStartDate(iso); if (iso > endDate) setEndDate(iso); }
    else setEndDate(iso);
    setPickerFor(null);
  };

  const saleOn    = (b: BranchData, d: string) => (b.sales[d] ?? 0) + (b.cafe[d] ?? 0);
  const expenseOn = (b: BranchData, d: string) => b.expense[d] ?? 0;

  // Union of every date any branch reported. The web instead iterates only the
  // dates present in its sales feed, which silently drops cafe-only days.
  const dates = Array.from(
    new Set(data.flatMap(b => [...Object.keys(b.sales), ...Object.keys(b.cafe), ...Object.keys(b.expense)])),
  ).sort();

  const totals = data.map(b => ({
    sales:   dates.reduce((s, d) => s + saleOn(b, d), 0),
    expense: dates.reduce((s, d) => s + expenseOn(b, d), 0),
  }));

  const tableWidth = W_SR + W_DATE + data.length * W_CELL * 2;

  const footerRow = (label: string, cell: (i: number) => string, expenseCell: (i: number) => string, strong?: boolean) => (
    <View style={[t.row, t.footRow]}>
      <Text style={[t.cell, t.footLabel, { width: W_SR + W_DATE }]}>{label}</Text>
      {data.map((b, i) => (
        <React.Fragment key={String(b.branch.id)}>
          <Text style={[t.cell, t.footVal, strong && t.footStrong, { width: W_CELL }]}>{cell(i)}</Text>
          <Text style={[t.cell, t.footVal, strong && t.footStrong, { width: W_CELL }]}>{expenseCell(i)}</Text>
        </React.Fragment>
      ))}
    </View>
  );

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

        {!loading && fetched && dates.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📉</Text>
            <Text style={s.emptyTitle}>No Data</Text>
            <Text style={s.emptySubtitle}>No sales or expenses found for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && dates.length > 0 && (
          <>
            <Text style={s.sectionLabel}>FILTERED RESULT</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator style={s.tableWrap}>
              <View style={{ width: tableWidth }}>
                <View style={[t.row, t.header]}>
                  <Text style={[t.cell, t.headerCell, { width: W_SR }]}>Sr#</Text>
                  <Text style={[t.cell, t.headerCell, { width: W_DATE }]}>Date</Text>
                  {data.map(b => (
                    <React.Fragment key={String(b.branch.id)}>
                      <Text style={[t.cell, t.headerCell, { width: W_CELL }]} numberOfLines={1}>{b.branch.name} Sales</Text>
                      <Text style={[t.cell, t.headerCell, { width: W_CELL }]} numberOfLines={1}>{b.branch.name} Expense</Text>
                    </React.Fragment>
                  ))}
                </View>

                {dates.map((d, i) => (
                  <View key={d} style={[t.row, i % 2 === 1 && t.rowAlt]}>
                    <Text style={[t.cell, t.muted, { width: W_SR }]}>{i + 1}</Text>
                    <Text style={[t.cell, { width: W_DATE }]}>{dayLabel(d)}</Text>
                    {data.map(b => (
                      <React.Fragment key={String(b.branch.id)}>
                        <Text style={[t.cell, t.sales, { width: W_CELL }]}>{fmtRs(saleOn(b, d))}</Text>
                        <Text style={[t.cell, t.expense, { width: W_CELL }]}>{fmtRs(expenseOn(b, d))}</Text>
                      </React.Fragment>
                    ))}
                  </View>
                ))}

                {footerRow('Total',
                  i => fmtRs(totals[i].sales),
                  i => fmtRs(totals[i].expense), true)}
                {footerRow(`Less: GST ${GST_RATE * 100}%`,
                  i => fmtRs(totals[i].sales * GST_RATE),
                  () => '-')}
                {footerRow('Sale After GST',
                  i => fmtRs(totals[i].sales * (1 - GST_RATE)),
                  () => '-', true)}
              </View>
            </ScrollView>

            {data.map((b, i) => {
              const diff = totals[i].sales - totals[i].expense;
              return (
                <View key={String(b.branch.id)} style={s.card}>
                  <View style={s.cardHead}>
                    <Text style={s.cardTitle}>{b.branch.name}</Text>
                    <Text style={s.cardHeadRight}>Amount</Text>
                  </View>
                  <View style={s.cardLine}>
                    <Text style={s.cardLabel}>Gym Sale</Text>
                    <Text style={s.cardValue}>{fmtRs(totals[i].sales)}</Text>
                  </View>
                  <View style={s.cardLine}>
                    <Text style={s.cardLabel}>Less: Expense</Text>
                    <Text style={s.cardValue}>{fmtRs(totals[i].expense)}</Text>
                  </View>
                  <View style={[s.cardLine, s.cardLineLast]}>
                    <Text style={[s.cardLabel, s.cardLabelBold]}>Difference</Text>
                    <Text style={[s.cardValue, s.cardValueBold, { color: diff < 0 ? '#E63946' : '#16A34A' }]}>
                      {fmtRs(diff)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
  chipRow:      { flexGrow: 0, flexShrink: 0, marginBottom: 8 },
  chipContent:  { alignItems: 'center', gap: 8, paddingVertical: 2 },
  chip:         { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:     { fontSize: 12, color: '#444', fontWeight: '500' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  emptyState:   { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.6, marginBottom: 8 },
  tableWrap:    { backgroundColor: '#FFF', borderRadius: 10, marginBottom: 14 },
  card:         { backgroundColor: '#FFF', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  cardHead:     { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#C0392B', paddingHorizontal: 14, paddingVertical: 10 },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: '#FFF' },
  cardHeadRight:{ fontSize: 13, fontWeight: '700', color: '#FFF' },
  cardLine:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  cardLineLast: { borderBottomWidth: 0 },
  cardLabel:    { fontSize: 13, color: '#444' },
  cardLabelBold:{ fontWeight: '700', color: '#1A1A1A' },
  cardValue:    { fontSize: 13, color: '#1A1A1A' },
  cardValueBold:{ fontWeight: '800' },
});

const t = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:     { backgroundColor: '#FBF8F8' },
  header:     { backgroundColor: '#C0392B' },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 8, paddingVertical: 10 },
  muted:      { color: '#888' },
  sales:      { color: '#16A34A', fontWeight: '600' },
  expense:    { color: '#E63946', fontWeight: '600' },
  footRow:    { backgroundColor: '#FAFAFA' },
  footLabel:  { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  footVal:    { fontSize: 12, color: '#444' },
  footStrong: { fontWeight: '800', color: '#1A1A1A' },
});

export default SalesExpenseDailyScreen;
