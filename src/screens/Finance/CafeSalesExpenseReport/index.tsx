import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCafeReport } from '../../../api/reports';
import { getExpensesList } from '../../../api/employeeDashboard';

interface CafeOrder { date: string; net_price: number | string; tax: number | string; discount: number | string; }
interface ExpenseItem {
  category_name: string;
  sub_category_name?: string;
  amount: number | string;
  description?: string;
  occurrence_date: string;
}
interface ExpenseEntry { subCategory: string; amount: number; description?: string }
interface DayRow {
  date: string;
  orders: number; tax: number; discount: number; total: number;
  expenses: ExpenseEntry[]; expensesTotal: number;
  netProfit: number;
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
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return fmt(d); };
const Rs = (n: number) => `Rs ${Math.round(Math.abs(n)).toLocaleString()}`;

const CafeSalesExpenseReport = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [startDate, setStartDate] = useState(() => daysAgo(7));
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [salesRes, expRes] = await Promise.all([
        getCafeReport({ branch_id: branchId, start_date: startDate, end_date: endDate }),
        getExpensesList({ branch_id: branchId, start_date: startDate, end_date: endDate, limit: 1000 }),
      ]);

      const orders: CafeOrder[] = salesRes?.data ?? [];
      const salesByDate = new Map<string, { orders: number; tax: number; discount: number; total: number }>();
      orders.forEach(o => {
        const key = o.date;
        const cur = salesByDate.get(key) ?? { orders: 0, tax: 0, discount: 0, total: 0 };
        cur.orders += 1;
        cur.tax += parseFloat(String(o.tax)) || 0;
        cur.discount += parseFloat(String(o.discount)) || 0;
        cur.total += parseFloat(String(o.net_price)) || 0;
        salesByDate.set(key, cur);
      });

      const expenseList: ExpenseItem[] = expRes?.data?.data ?? [];
      const expensesByDate = new Map<string, ExpenseEntry[]>();
      expenseList
        .filter(e => e.category_name === 'Cafe Expense')
        .forEach(e => {
          const key = e.occurrence_date;
          const list = expensesByDate.get(key) ?? [];
          list.push({
            subCategory: e.sub_category_name || e.category_name,
            amount: parseFloat(String(e.amount)) || 0,
            description: e.description,
          });
          expensesByDate.set(key, list);
        });

      const allDates = Array.from(new Set([...salesByDate.keys(), ...expensesByDate.keys()])).sort();
      const dayRows: DayRow[] = allDates.map(date => {
        const s = salesByDate.get(date) ?? { orders: 0, tax: 0, discount: 0, total: 0 };
        const expenses = expensesByDate.get(date) ?? [];
        const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
        return { date, ...s, expenses, expensesTotal, netProfit: s.total - expensesTotal };
      });

      setRows(dayRows);
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setRows([]); setFetched(true);
      } else {
        setError(e?.response?.data?.message || 'Failed to load report.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalSales = rows.reduce((s, r) => s + r.total, 0);
  const totalExpenses = rows.reduce((s, r) => s + r.expensesTotal, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const netProfit = totalSales - totalExpenses;

  return (
    <View style={styles.root}>
      <AppHeader
        title="Cafe Sales & Expense Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Date Range</Text>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Generate Report</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {fetched && !loading && (
          <>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: '#1565C0' }]}>
                <Text style={styles.summaryCardLabel}>Total Sales</Text>
                <Text style={styles.summaryCardValue}>{Rs(totalSales)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#C62828' }]}>
                <Text style={styles.summaryCardLabel}>Total Expenses</Text>
                <Text style={styles.summaryCardValue}>{Rs(totalExpenses)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#2E7D32' }]}>
                <Text style={styles.summaryCardLabel}>Net Profit</Text>
                <Text style={styles.summaryCardValue}>{netProfit < 0 ? '-' : ''}{Rs(netProfit)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#00838F' }]}>
                <Text style={styles.summaryCardLabel}>Total Orders</Text>
                <Text style={styles.summaryCardValue}>{totalOrders}</Text>
              </View>
            </View>

            <View style={styles.card}>
              {rows.length === 0
                ? <Text style={styles.emptyText}>No records found.</Text>
                : rows.map(row => (
                  <View key={row.date} style={styles.dayRow}>
                    <View style={styles.dayRowHeader}>
                      <Text style={styles.dayDate}>{display(row.date)}</Text>
                      <Text style={[styles.dayNetProfit, { color: row.netProfit >= 0 ? '#2E7D32' : '#C62828' }]}>
                        {row.netProfit < 0 ? '-' : ''}{Rs(row.netProfit)}
                      </Text>
                    </View>
                    <View style={styles.dayCols}>
                      <View style={styles.dayCol}>
                        <Text style={styles.dayColLabel}>Sales Summary</Text>
                        <Text style={styles.dayColLine}>Orders: {row.orders}</Text>
                        <Text style={styles.dayColLine}>Tax: {Rs(row.tax)}</Text>
                        <Text style={styles.dayColLine}>Discount: {Rs(row.discount)}</Text>
                        <Text style={[styles.dayColLine, { fontWeight: '700' }]}>Total: {Rs(row.total)}</Text>
                      </View>
                      <View style={styles.dayCol}>
                        <Text style={styles.dayColLabel}>Expenses Details</Text>
                        {row.expenses.length === 0
                          ? <Text style={styles.noExpenses}>No expenses</Text>
                          : (
                            <>
                              <Text style={[styles.dayColLine, { fontWeight: '700' }]}>Total: {Rs(row.expensesTotal)}</Text>
                              {row.expenses.map((e, i) => (
                                <View key={i} style={{ marginTop: 4 }}>
                                  <Text style={styles.dayColLine}>{e.subCategory}: {Rs(e.amount)}</Text>
                                  {!!e.description && <Text style={styles.expenseDesc}>{e.description}</Text>}
                                </View>
                              ))}
                            </>
                          )
                        }
                      </View>
                    </View>
                  </View>
                ))
              }
            </View>
          </>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={!!pickerFor}
        mode="date"
        date={toDate(pickerFor === 'start' ? startDate : endDate)}
        onConfirm={d => { if (pickerFor === 'start') setStartDate(fmt(d)); else setEndDate(fmt(d)); setPickerFor(null); }}
        onCancel={() => setPickerFor(null)}
      />
    </View>
  );
};

export default CafeSalesExpenseReport;

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
  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 11 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  summaryCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 8, padding: 14 },
  summaryCardLabel: { color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 6, opacity: 0.9 },
  summaryCardValue: { color: '#fff', fontSize: 18, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  dayRow: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingVertical: 12 },
  dayRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayDate: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  dayNetProfit: { fontSize: 13, fontWeight: '700' },
  dayCols: { flexDirection: 'row', gap: 16 },
  dayCol: { flex: 1 },
  dayColLabel: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 4, textTransform: 'uppercase' },
  dayColLine: { fontSize: 12, color: '#333', marginBottom: 2 },
  expenseDesc: { fontSize: 11, color: '#888', fontStyle: 'italic' },
  noExpenses: { fontSize: 12, color: '#aaa', fontStyle: 'italic' },
});
