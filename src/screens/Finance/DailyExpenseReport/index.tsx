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
import { getVostroExpenseReport } from '../../../api/employeeDashboard';

// Confirmed live 2026-06-30 via a captured HAR of the web admin's "Daily
// Expense Report" page: a single endpoint (`getVostroExpenseReport`) returns
// every branch's daily-entry records + expense line items for the date in
// one call — see the wrapper's comment in employeeDashboard.ts for the full
// shape. This replaces an earlier two-endpoint guess (getCashInHand +
// getExpensesList) that didn't match the real page at all.
// Read-only: the capture only showed the page's initial GET, not the
// Save/Pay/Delete actions on "Manage Daily Entries" / "Manage Payments &
// Approvals", so those write routes are unconfirmed — not implemented here
// rather than guessed (matches this project's standing rule after past
// accidental-live-write incidents from probing write endpoints blind).
interface ExpenseItem {
  id: number;
  description: string;
  amount: number;
  paid_amount: number;
  approved_amount: number;
  is_paid: number;
  is_approved: number;
}
interface VostroExpenseEntry {
  id: number;
  branch_id: number;
  branch_name: string;
  date: string;
  bank_funds: number | null;
  charity_cash: number | null;
  gst_cash: number | null;
  cash_in_hand: number | null;
  notes: string | null;
  total_expense: number;
  items: ExpenseItem[];
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

const DailyExpenseReport = () => {
  const navigation = useNavigation<any>();

  const [date, setDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [entries, setEntries] = useState<VostroExpenseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getVostroExpenseReport({ date });
      setEntries(Array.isArray(res?.data) ? res.data : []);
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) { setEntries([]); setFetched(true); }
      else setError(e?.response?.data?.message || 'Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  const branchIds = Array.from(new Set(entries.map(e => e.branch_id)));
  const allItems = entries.flatMap(e => e.items.map(it => ({ ...it, branch_name: e.branch_name })));
  const dailyEntryRows = entries.filter(e => e.bank_funds !== null);

  return (
    <View style={styles.root}>
      <AppHeader
        title="Daily Expense Report"
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
            <Text style={styles.reportTitle}>Expenses {longDisplay(date)}</Text>

            {branchIds.length === 0 ? (
              <View style={styles.card}><Text style={styles.emptyText}>No records found.</Text></View>
            ) : branchIds.map(branchId => {
              const branchEntries = entries.filter(e => e.branch_id === branchId);
              const branchName = branchEntries[0].branch_name;
              const snapshot = branchEntries.find(e => e.bank_funds !== null) ?? branchEntries[0];
              const items = branchEntries.flatMap(e => e.items);
              const total = branchEntries.reduce((s, e) => s + (e.total_expense ?? 0), 0);
              return (
                <View key={branchId} style={styles.card}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryHeaderText}>{branchName}</Text>
                  </View>
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryLabel}>Bank Funds</Text>
                      <Text style={styles.summaryValue}>{Rs(snapshot.bank_funds)}</Text>
                    </View>
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryLabel}>Charity Cash</Text>
                      <Text style={styles.summaryValue}>{Rs(snapshot.charity_cash)}</Text>
                    </View>
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryLabel}>GST Cash</Text>
                      <Text style={styles.summaryValue}>{Rs(snapshot.gst_cash)}</Text>
                    </View>
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryLabel}>Cash in Hand</Text>
                      <Text style={styles.summaryValue}>{Rs(snapshot.cash_in_hand)}</Text>
                    </View>
                  </View>
                  {!!snapshot.notes && <Text style={styles.summaryNotes}>Notes: {snapshot.notes}</Text>}

                  <Text style={styles.sectionLabel}>Expense</Text>
                  {items.length === 0 ? (
                    <Text style={styles.emptyText}>No expenses recorded for this date.</Text>
                  ) : (
                    <View style={styles.expenseTable}>
                      {items.map((it, i) => (
                        <View key={it.id} style={[styles.expenseRow, i % 2 === 1 && styles.expenseRowAlt]}>
                          <Text style={styles.expenseDesc} numberOfLines={2}>{it.description}</Text>
                          <Text style={styles.expenseAmount}>{Rs(it.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.expenseTotalRow}>
                    <Text style={styles.expenseTotalLabel}>Total</Text>
                    <Text style={styles.expenseTotalValue}>{Rs(total)}</Text>
                  </View>
                </View>
              );
            })}

            {/* ── Manage Daily Entries (read-only) ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Manage Daily Entries</Text>
              {dailyEntryRows.length === 0 ? (
                <Text style={styles.emptyText}>No daily entries for this date.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ width: 720 }}>
                    <View style={styles.thead}>
                      <Text style={[styles.th, { width: 70 }]}>Branch</Text>
                      <Text style={[styles.th, { width: 90 }]}>Date</Text>
                      <Text style={[styles.th, { width: 110 }]}>Bank Funds</Text>
                      <Text style={[styles.th, { width: 110 }]}>Charity Cash</Text>
                      <Text style={[styles.th, { width: 100 }]}>GST Cash</Text>
                      <Text style={[styles.th, { width: 110 }]}>Cash In Hand</Text>
                      <Text style={[styles.th, { width: 130 }]}>Notes</Text>
                    </View>
                    {dailyEntryRows.map((e, i) => (
                      <View key={e.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, { width: 70, textAlign: 'left' }]}>{e.branch_name}</Text>
                        <Text style={[styles.td, { width: 90 }]}>{display(e.date)}</Text>
                        <Text style={[styles.td, { width: 110 }]}>{Rs(e.bank_funds)}</Text>
                        <Text style={[styles.td, { width: 110 }]}>{Rs(e.charity_cash)}</Text>
                        <Text style={[styles.td, { width: 100 }]}>{Rs(e.gst_cash)}</Text>
                        <Text style={[styles.td, { width: 110 }]}>{Rs(e.cash_in_hand)}</Text>
                        <Text style={[styles.td, { width: 130, textAlign: 'left' }]} numberOfLines={1}>{e.notes || '-'}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* ── Manage Payments / Approvals (read-only) ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Manage Payments / Approvals</Text>
              {allItems.length === 0 ? (
                <Text style={styles.emptyText}>No expense items for this date.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ width: 760 }}>
                    <View style={styles.thead}>
                      <Text style={[styles.th, { width: 70 }]}>Branch</Text>
                      <Text style={[styles.th, { width: 200 }]}>Description</Text>
                      <Text style={[styles.th, { width: 90 }]}>Amount</Text>
                      <Text style={[styles.th, { width: 100 }]}>Paid Amount</Text>
                      <Text style={[styles.th, { width: 60 }]}>Paid</Text>
                      <Text style={[styles.th, { width: 120 }]}>Approved Amount</Text>
                      <Text style={[styles.th, { width: 80 }]}>Approved</Text>
                    </View>
                    {allItems.map((it, i) => (
                      <View key={it.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, { width: 70, textAlign: 'left' }]}>{it.branch_name}</Text>
                        <Text style={[styles.td, { width: 200, textAlign: 'left' }]} numberOfLines={1}>{it.description}</Text>
                        <Text style={[styles.td, { width: 90 }]}>{Rs(it.amount)}</Text>
                        <Text style={[styles.td, { width: 100 }]}>{Rs(it.paid_amount)}</Text>
                        <Text style={[styles.td, { width: 60, color: it.is_paid ? '#2E7D32' : '#999', fontWeight: '700' }]}>{it.is_paid ? 'Yes' : 'No'}</Text>
                        <Text style={[styles.td, { width: 120 }]}>{Rs(it.approved_amount)}</Text>
                        <Text style={[styles.td, { width: 80, color: it.is_approved ? '#2E7D32' : '#999', fontWeight: '700' }]}>{it.is_approved ? 'Yes' : 'No'}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
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

export default DailyExpenseReport;

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
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#E8F5E9', borderRadius: 6, marginBottom: 10 },
  summaryCell: { width: '50%', paddingVertical: 8, paddingHorizontal: 10 },
  summaryLabel: { fontSize: 11, color: '#33691E', fontWeight: '600' },
  summaryValue: { fontSize: 14, color: '#1A1A1A', fontWeight: '700', marginTop: 2 },
  summaryNotes: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8, marginTop: 4 },
  expenseTable: { borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 6, overflow: 'hidden' },
  expenseRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 8,
  },
  expenseRowAlt: { backgroundColor: '#FAFAFA' },
  expenseDesc: { fontSize: 12, color: '#333', flex: 1 },
  expenseAmount: { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  expenseTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#FFEBEE', borderRadius: 6, marginTop: 8,
  },
  expenseTotalLabel: { fontSize: 13, fontWeight: '700', color: R },
  expenseTotalValue: { fontSize: 14, fontWeight: '800', color: R },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },
});
