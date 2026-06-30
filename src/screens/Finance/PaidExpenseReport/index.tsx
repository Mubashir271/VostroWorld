import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { getPaidExpenseReport } from '../../../api/employeeDashboard';

// Confirmed live 2026-06-30 via a captured HAR of the web admin's "Paid
// Expense Report" page — single endpoint (`getPaidExpenseReport`), per-branch
// summary numbers only, no itemized breakdown (matches the web UI, which
// also only shows the summary rows). `branch_name` came back null in the
// capture, so branch labels are mapped from `branch_id` using the same
// G-13=1 / F-11=15 mapping already confirmed elsewhere in this app (see
// DailyExpenseReport, PTAttendance).
const BRANCH_LABEL: Record<number, string> = { 15: 'F-11', 1: 'G-13' };

interface BranchPaidSummary {
  branch_id: number;
  branch_name: string | null;
  cash_from_bank: number;
  cash_in_hand: number;
  total_cash: number;
  total_expense: number;
  balance_cash_in_safe: number;
  total_bank_payment: number;
}

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const longDisplay = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const today = () => fmt(new Date());
const Rs = (n: number | null | undefined) => (n === null || n === undefined ? '-' : n.toLocaleString());

const PaidExpenseReport = () => {
  const navigation = useNavigation<any>();

  const [date, setDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [branches, setBranches] = useState<BranchPaidSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPaidExpenseReport({ date });
      setBranches(Array.isArray(res?.data?.branches) ? res.data.branches : []);
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) { setBranches([]); setFetched(true); }
      else setError(e?.response?.data?.message || 'Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  return (
    <View style={styles.root}>
      <AppHeader
        title="Paid Expense Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Date</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{display(date)}</Text>
            <Icon name="calendar" size={15} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Get Report</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {loading ? (
          <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
        ) : fetched && (
          <>
            <Text style={styles.reportTitle}>PAID Expenses {longDisplay(date)}</Text>

            {branches.length === 0 ? (
              <View style={styles.card}><Text style={styles.emptyText}>No records found.</Text></View>
            ) : branches.map(b => {
              const label = BRANCH_LABEL[b.branch_id] ?? b.branch_name ?? `Branch ${b.branch_id}`;
              return (
                <View key={b.branch_id} style={styles.card}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryHeaderText}>{label} Exp Paid Detail</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Cash from Bank</Text>
                    <Text style={styles.rowValue}>{Rs(b.cash_from_bank)}</Text>
                  </View>
                  <View style={[styles.row, styles.rowAlt]}>
                    <Text style={styles.rowLabel}>Cash in hand</Text>
                    <Text style={styles.rowValue}>{Rs(b.cash_in_hand)}</Text>
                  </View>
                  <View style={[styles.row, styles.plainRow]}>
                    <Text style={[styles.rowLabel, styles.plainRowLabel]}>Total Cash</Text>
                    <Text style={[styles.rowValue, styles.plainRowValue]}>{Rs(b.total_cash)}</Text>
                  </View>
                  <View style={[styles.row, styles.plainRowAlt]}>
                    <Text style={[styles.rowLabel, styles.plainRowLabel]}>Total Expense</Text>
                    <Text style={[styles.rowValue, styles.plainRowValue]}>{Rs(b.total_expense)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Balance Cash in Safe</Text>
                    <Text style={styles.rowValue}>{Rs(b.balance_cash_in_safe)}</Text>
                  </View>

                  <View style={[styles.summaryHeader, { marginTop: 10 }]}>
                    <Text style={styles.summaryHeaderText}>Bank Payment Detail</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Total Bank Payment</Text>
                    <Text style={styles.rowValue}>{Rs(b.total_bank_payment)}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={new Date(date + 'T00:00:00')}
        onConfirm={d => { setDate(fmt(d)); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );
};

export default PaidExpenseReport;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  reportTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, marginLeft: 2 },
  errText: { color: R, fontSize: 13, marginHorizontal: 4, marginBottom: 8, fontWeight: '500' },

  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  dateText: { fontSize: 13, color: '#222' },

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 11 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 16, fontSize: 13 },

  summaryHeader: { backgroundColor: '#2E7D32', borderRadius: 6, paddingVertical: 7, marginBottom: 1 },
  summaryHeaderText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#E8F5E9',
  },
  rowAlt: { backgroundColor: '#DCEEDD' },
  plainRow: { backgroundColor: '#FAFAFA' },
  plainRowAlt: { backgroundColor: '#F0F0F0' },
  rowLabel: { fontSize: 12, color: '#33691E', fontWeight: '600' },
  rowValue: { fontSize: 13, color: '#1A1A1A', fontWeight: '700' },
  plainRowLabel: { color: '#444' },
  plainRowValue: { color: '#1A1A1A' },
});
