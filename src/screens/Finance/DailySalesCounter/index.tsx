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
import { getSalesByServices, getSalesExpenseDaily, getSalesByCategoryAndPayment } from '../../../api/reports';

interface PackageRow { package_name: string; package_id: number; total_net_price: string | number; total_quantity: string | number; }
interface ExpenseLine { category: string; total_quantity: string | number; total_price: string | number; }
interface Row { label: string; quantity: number; amount: number; }
interface PaymentBreakdown { category: string; payments: { method: string; amount: number }[]; total: number; }

const CATEGORY_LABEL: Record<string, string> = {
  '1': 'Gym', '2': 'Personal Training', '3': 'Guest Pass', '4': 'Small Group PT',
  '5': 'Nutritionist', '6': 'Registration', '7': 'Bootcamp', '8': 'Freezing',
  '9': 'General', '10': 'Cafe', '11': 'CFT', '12': 'Massage Chair',
  '13': 'Cafe Deposits', '14': 'Physiotherapy', '15': 'GX Studio',
};
const CATEGORY_ORDER = ['1', '2', '3', '4', '5', '6', '11', '12', '14', '15', '7', '10', '9', '13'];

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
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return fmt(d); };
const Rs = (n: number) => `Rs ${Math.round(n).toLocaleString()}/-`;
const pct = (n: number, total: number) => total > 0 ? `${((n / total) * 100).toFixed(2)}%` : '0.00%';

const DailySalesCounter = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [startDate, setStartDate] = useState(() => startOfMonth());
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [salesRows, setSalesRows] = useState<Row[]>([]);
  const [expenseRows, setExpenseRows] = useState<Row[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<PaymentBreakdown[]>([]);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [salesRes, expRes, catRes] = await Promise.all([
        getSalesByServices({ branch_id: branchId, start_date: startDate, end_date: endDate }),
        getSalesExpenseDaily({ branch_id: branchId, start_date: startDate, end_date: endDate }),
        getSalesByCategoryAndPayment({ branch_id: branchId, start_date: startDate, end_date: endDate }),
      ]);

      const packages: PackageRow[] = salesRes?.data?.data ?? [];
      setSalesRows(packages.map(p => ({
        label: p.package_name,
        quantity: parseFloat(String(p.total_quantity)) || 0,
        amount: parseFloat(String(p.total_net_price)) || 0,
      })));

      const expenses: ExpenseLine[] = expRes?.data?.data?.expenses ?? [];
      setExpenseRows(expenses.map(e => ({
        label: e.category,
        quantity: parseFloat(String(e.total_quantity)) || 0,
        amount: parseFloat(String(e.total_price)) || 0,
      })));

      const catData: Record<string, Array<Record<string, number>>> = catRes?.data?.data ?? {};
      const breakdown: PaymentBreakdown[] = CATEGORY_ORDER
        .filter(code => catData[code])
        .map(code => {
          const payments = (catData[code] ?? []).map(entry => {
            const [method, amount] = Object.entries(entry)[0];
            return { method, amount: parseFloat(String(amount)) || 0 };
          });
          return { category: CATEGORY_LABEL[code] ?? code, payments, total: payments.reduce((s, p) => s + p.amount, 0) };
        });
      setCategoryBreakdown(breakdown);

      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setSalesRows([]); setExpenseRows([]); setCategoryBreakdown([]); setFetched(true);
      } else {
        setError(e?.response?.data?.message || 'Failed to load report.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setQuick = (s: string, e: string) => { setStartDate(s); setEndDate(e); };

  const totalSales = salesRows.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);

  return (
    <View style={styles.root}>
      <AppHeader
        title="Daily Sales Counter"
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
              { l: '30 Days', s: daysAgo(30), e: today() },
              { l: '9 Days', s: daysAgo(9), e: today() },
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
            <View style={styles.row2card}>
              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.cardTitle}>Sales</Text>
                <View style={styles.thead}>
                  <Text style={[styles.th, { flex: 1.6, textAlign: 'left' }]}>Package</Text>
                  <Text style={[styles.th, { flex: 0.7 }]}>%</Text>
                  <Text style={[styles.th, { flex: 0.6 }]}>Qty</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Amount</Text>
                </View>
                {salesRows.map((r, i) => (
                  <View key={i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.td, { flex: 1.6, textAlign: 'left' }]}>{r.label}</Text>
                    <Text style={[styles.td, { flex: 0.7 }]}>{pct(r.amount, totalSales)}</Text>
                    <Text style={[styles.td, { flex: 0.6 }]}>{r.quantity}</Text>
                    <Text style={[styles.td, { flex: 1 }]}>{Rs(r.amount)}</Text>
                  </View>
                ))}
                <View style={[styles.tr, styles.totalRow]}>
                  <Text style={[styles.td, styles.totalText, { flex: 1.6, textAlign: 'left' }]}>Total Sales</Text>
                  <Text style={[styles.td, styles.totalText, { flex: 0.7 }]}>100%</Text>
                  <Text style={[styles.td, styles.totalText, { flex: 0.6 }]} />
                  <Text style={[styles.td, styles.totalText, { flex: 1 }]}>{Rs(totalSales)}</Text>
                </View>
              </View>

              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.cardTitle}>Expenses</Text>
                <View style={styles.thead}>
                  <Text style={[styles.th, { flex: 1.6, textAlign: 'left' }]}>Particulars</Text>
                  <Text style={[styles.th, { flex: 0.7 }]}>%</Text>
                  <Text style={[styles.th, { flex: 0.6 }]}>Qty</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Debit</Text>
                </View>
                {expenseRows.map((r, i) => (
                  <View key={i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.td, { flex: 1.6, textAlign: 'left' }]}>{r.label}</Text>
                    <Text style={[styles.td, { flex: 0.7 }]}>{pct(r.amount, totalExpenses)}</Text>
                    <Text style={[styles.td, { flex: 0.6 }]}>{r.quantity}</Text>
                    <Text style={[styles.td, { flex: 1 }]}>{Rs(r.amount)}</Text>
                  </View>
                ))}
                <View style={[styles.tr, styles.totalRow]}>
                  <Text style={[styles.td, styles.totalText, { flex: 1.6, textAlign: 'left' }]}>Total Expenses Paid</Text>
                  <Text style={[styles.td, styles.totalText, { flex: 0.7 }]}>100%</Text>
                  <Text style={[styles.td, styles.totalText, { flex: 0.6 }]} />
                  <Text style={[styles.td, styles.totalText, { flex: 1 }]}>{Rs(totalExpenses)}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowCategoryBreakdown(v => !v)}>
              <Icon name="chart-bar" size={16} color="#1565C0" />
              <Text style={styles.toggleBtnText}>
                {showCategoryBreakdown ? 'Hide' : 'Show'} Sales Breakdown By Category
              </Text>
            </TouchableOpacity>

            {showCategoryBreakdown && (
              <View style={styles.row2card}>
                {categoryBreakdown.map(cat => (
                  <View key={cat.category} style={[styles.card, styles.halfCard]}>
                    <Text style={styles.cardTitle}>{cat.category}</Text>
                    <View style={styles.thead}>
                      <Text style={[styles.th, { flex: 1.4, textAlign: 'left' }]}>Payment Type</Text>
                      <Text style={[styles.th, { flex: 0.8 }]}>%</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Price</Text>
                    </View>
                    {cat.payments.map((p, i) => (
                      <View key={p.method} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, { flex: 1.4, textAlign: 'left' }]}>{p.method}</Text>
                        <Text style={[styles.td, { flex: 0.8 }]}>{pct(p.amount, cat.total)}</Text>
                        <Text style={[styles.td, { flex: 1 }]}>{Rs(p.amount)}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
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

export default DailySalesCounter;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  row2card: { gap: 0 },
  halfCard: { width: '100%' },
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

  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#E3F2FD', borderRadius: 6, paddingVertical: 10, marginBottom: 14,
  },
  toggleBtnText: { color: '#1565C0', fontWeight: '700', fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 4, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 4, textAlign: 'center', alignSelf: 'center' },
  totalRow: { backgroundColor: '#FFF3E0', borderBottomWidth: 0 },
  totalText: { fontWeight: '700', color: '#1A1A1A' },
});
