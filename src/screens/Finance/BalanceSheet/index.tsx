import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Svg, { Circle, G } from 'react-native-svg';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getSalesExpenseDaily } from '../../../api/reports';

interface SalesLine { category: string; Type: string; total_quantity: string | number; total_price: string | number; }
interface ExpenseLine { category: string; total_quantity: string | number; total_price: string | number; }
interface Row { label: string; quantity: number; amount: number; }

// Category Code Reference (API_REFERENCE.md §5)
const CATEGORY_LABEL: Record<string, string> = {
  '1': 'Gym', '2': 'Personal Training', '3': 'Guest Pass', '4': 'Small Group PT',
  '5': 'Nutrition', '6': 'Membership', '7': 'Bootcamp', '8': 'Freezing',
  '9': 'General', '10': 'Cafe', '11': 'CFT', '12': 'Massage Chair',
  '13': 'Cafe Deposits', '14': 'Physiotherapy', '15': 'GX Studio',
};
const TYPE_LABEL: Record<string, string> = { New: 'New', Renew: 'Existing', Mix: '' };

const CHART_COLORS = [
  '#F4511E', '#1976D2', '#FBC02D', '#43A047', '#8E24AA', '#00897B',
  '#FB8C00', '#5E35B1', '#D81B60', '#3949AB', '#6D4C41', '#00ACC1',
];

// No charting library in this project — a donut built from react-native-svg
// (already a dependency) instead of adding one just for this.
const DonutChart = ({ data, size = 150, strokeWidth = 30 }: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;

  let cumulative = 0;
  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
        {data.filter(d => d.value > 0).map((d, i) => {
          const fraction = d.value / total;
          const dash = fraction * circumference;
          const offset = -cumulative * circumference;
          cumulative += fraction;
          return (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              fill="none"
            />
          );
        })}
      </G>
    </Svg>
  );
};

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
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const startOfYear = () => `${new Date().getFullYear()}-01-01`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return fmt(d); };
const Rs = (n: number) => `Rs ${Math.round(n).toLocaleString()}/-`;
const pct = (n: number, total: number) => total > 0 ? `${((n / total) * 100).toFixed(2)}%` : '0.00%';

const BalanceSheet = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [startDate, setStartDate] = useState(() => startOfMonth());
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [salesRows, setSalesRows] = useState<Row[]>([]);
  const [expenseRows, setExpenseRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSalesExpenseDaily({ branch_id: branchId, start_date: startDate, end_date: endDate });
      const sales: SalesLine[] = res?.data?.data?.sales ?? [];
      const expenses: ExpenseLine[] = res?.data?.data?.expenses ?? [];

      setSalesRows(sales.map(s => ({
        label: `${CATEGORY_LABEL[s.category] ?? s.category}${TYPE_LABEL[s.Type] ? `-${TYPE_LABEL[s.Type]}` : ''}`,
        quantity: parseFloat(String(s.total_quantity)) || 0,
        amount: parseFloat(String(s.total_price)) || 0,
      })));
      setExpenseRows(expenses.map(e => ({
        label: e.category,
        quantity: parseFloat(String(e.total_quantity)) || 0,
        amount: parseFloat(String(e.total_price)) || 0,
      })));
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setSalesRows([]); setExpenseRows([]); setFetched(true);
      } else {
        setError(e?.response?.data?.message || 'Failed to load report.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setQuick = (s: string, e: string) => { setStartDate(s); setEndDate(e); };

  const totalRevenue = salesRows.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const salesChartData = salesRows
    .filter(r => r.amount > 0)
    .map((r, i) => ({ label: r.label, value: r.amount, color: CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <View style={styles.root}>
      <AppHeader
        title="Balance Sheet"
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
          <View style={styles.quickBtns}>
            {[
              { l: 'This Month', s: startOfMonth(), e: today() },
              { l: 'This Year', s: startOfYear(), e: today() },
              { l: '30 Days', s: daysAgo(30), e: today() },
              { l: 'Today', s: today(), e: today() },
            ].map(q => (
              <TouchableOpacity key={q.l} style={styles.quickBtn} onPress={() => setQuick(q.s, q.e)}>
                <Text style={styles.quickBtnText}>{q.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {fetched && !loading && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sales</Text>
              <View style={styles.thead}>
                <Text style={[styles.th, { flex: 1.6, textAlign: 'left' }]}>Particulars</Text>
                <Text style={[styles.th, { flex: 0.8 }]}>%</Text>
                <Text style={[styles.th, { flex: 0.7 }]}>Qty</Text>
                <Text style={[styles.th, { flex: 1 }]}>Credit</Text>
              </View>
              {salesRows.map((r, i) => (
                <View key={i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                  <Text style={[styles.td, { flex: 1.6, textAlign: 'left' }]}>{r.label}</Text>
                  <Text style={[styles.td, { flex: 0.8 }]}>{pct(r.amount, totalRevenue)}</Text>
                  <Text style={[styles.td, { flex: 0.7 }]}>{r.quantity}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{Rs(r.amount)}</Text>
                </View>
              ))}
              <View style={[styles.tr, styles.totalRow]}>
                <Text style={[styles.td, styles.totalText, { flex: 1.6, textAlign: 'left' }]}>Total Revenue</Text>
                <Text style={[styles.td, styles.totalText, { flex: 0.8 }]}>100%</Text>
                <Text style={[styles.td, styles.totalText, { flex: 0.7 }]} />
                <Text style={[styles.td, styles.totalText, { flex: 1 }]}>{Rs(totalRevenue)}</Text>
              </View>

              {salesChartData.length > 0 && (
                <View style={styles.chartSection}>
                  <Text style={styles.chartTitle}>Sales Breakup</Text>
                  <View style={styles.chartRow}>
                    <DonutChart data={salesChartData} />
                    <View style={styles.legend}>
                      {salesChartData.map(d => (
                        <View key={d.label} style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                          <Text style={styles.legendText}>{d.label} ({pct(d.value, totalRevenue)})</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Expenses Breakup</Text>
              <View style={styles.thead}>
                <Text style={[styles.th, { flex: 1.6, textAlign: 'left' }]}>Particulars</Text>
                <Text style={[styles.th, { flex: 0.8 }]}>%</Text>
                <Text style={[styles.th, { flex: 0.7 }]}>Qty</Text>
                <Text style={[styles.th, { flex: 1 }]}>Debit</Text>
              </View>
              {expenseRows.map((r, i) => (
                <View key={i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                  <Text style={[styles.td, { flex: 1.6, textAlign: 'left' }]}>{r.label}</Text>
                  <Text style={[styles.td, { flex: 0.8 }]}>{pct(r.amount, totalExpenses)}</Text>
                  <Text style={[styles.td, { flex: 0.7 }]}>{r.quantity}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{Rs(r.amount)}</Text>
                </View>
              ))}
              <View style={[styles.tr, styles.totalRow]}>
                <Text style={[styles.td, styles.totalText, { flex: 1.6, textAlign: 'left' }]}>Total Expenses Paid</Text>
                <Text style={[styles.td, styles.totalText, { flex: 0.8 }]}>100%</Text>
                <Text style={[styles.td, styles.totalText, { flex: 0.7 }]} />
                <Text style={[styles.td, styles.totalText, { flex: 1 }]}>{Rs(totalExpenses)}</Text>
              </View>
            </View>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Revenue</Text>
                <Text style={styles.summaryValue}>{Rs(totalRevenue)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Expenses Paid</Text>
                <Text style={styles.summaryValue}>{Rs(totalExpenses)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Net Profit & Loss</Text>
                <Text style={[styles.summaryValue, { fontWeight: '700', color: netProfit >= 0 ? '#2E7D32' : '#C62828' }]}>{Rs(netProfit)}</Text>
              </View>
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

export default BalanceSheet;

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

  quickBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  quickBtn: {
    borderWidth: 1, borderColor: '#CCC', borderRadius: 5,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FAFAFA',
  },
  quickBtnText: { fontSize: 12, color: '#333' },

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 11 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 4, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 4, textAlign: 'center', alignSelf: 'center' },
  totalRow: { backgroundColor: '#FFF3E0', borderBottomWidth: 0 },
  totalText: { fontWeight: '700', color: '#1A1A1A' },

  chartSection: { marginTop: 16 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 10, textAlign: 'center' },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'center' },
  legend: { flex: 1, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#444', flexShrink: 1 },

  summaryBox: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  summaryRowLast: { borderBottomWidth: 0 },
  summaryLabel: { fontSize: 13, color: '#444' },
  summaryValue: { fontSize: 13, color: '#1A1A1A' },
});
