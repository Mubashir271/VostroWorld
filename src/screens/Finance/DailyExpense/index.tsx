import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  getCashInHand, addCashInHandEntry, updateCashInHandEntry, getExpensesList,
} from '../../../api/employeeDashboard';

interface CashInHandRecord {
  id: number;
  bank?: number | string;
  charity?: number | string;
  gst?: number | string;
  cash_in_hand?: number | string;
  description?: string;
  date?: string;
}

interface ExpenseRow {
  id: number;
  category_name?: string;
  sub_category_name?: string;
  description?: string;
  amount: number | string;
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
const Rs = (n: any) => {
  const v = parseFloat(n) || 0;
  return v.toLocaleString();
};

const DailyExpense = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? 'Branch';

  const [date, setDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [record, setRecord] = useState<CashInHandRecord | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Manage Daily Entry form
  const [bank, setBank] = useState('');
  const [charity, setCharity] = useState('');
  const [gst, setGst] = useState('');
  const [cashInHand, setCashInHand] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cihRes, expRes] = await Promise.all([
        getCashInHand({ branch_id: branchId, from_date: date, to_date: date }),
        getExpensesList({ branch_id: branchId, start_date: date, end_date: date, limit: 200 }),
      ]);
      const cihData: CashInHandRecord[] = cihRes?.data ?? [];
      const rec = Array.isArray(cihData) && cihData.length > 0 ? cihData[0] : null;
      setRecord(rec);
      setBank(rec?.bank !== undefined ? String(rec.bank) : '');
      setCharity(rec?.charity !== undefined ? String(rec.charity) : '');
      setGst(rec?.gst !== undefined ? String(rec.gst) : '');
      setCashInHand(rec?.cash_in_hand !== undefined ? String(rec.cash_in_hand) : '');
      setNotes(rec?.description ?? '');

      const expData = expRes?.data?.data ?? expRes?.data ?? [];
      setExpenses(Array.isArray(expData) ? expData : []);
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setRecord(null);
        setExpenses([]);
        setFetched(true);
      } else {
        setError(e?.response?.data?.message || 'Failed to load report. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, date]);

  const totalExpense = expenses.reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0);

  const handleSaveEntry = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        branch_id: branchId,
        date,
        bank: bank ? parseFloat(bank) : undefined,
        charity: charity ? parseFloat(charity) : undefined,
        gst: gst ? parseFloat(gst) : undefined,
        cash_in_hand: cashInHand ? parseFloat(cashInHand) : undefined,
        description: notes.trim() || undefined,
      };
      if (record?.id) {
        await updateCashInHandEntry(record.id, payload);
      } else {
        await addCashInHandEntry(payload);
      }
      flash('Daily entry saved successfully.');
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : (msg ? Object.values(msg).flat().join(' ') : 'Failed to save daily entry.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Daily Expense"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* ── Date filter card ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Date</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddExpense')}>
              <Icon name="plus" size={14} color="#fff" />
              <Text style={styles.addBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fullRow}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>{display(date)}</Text>
              <Icon name="calendar" size={15} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Get Report</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errTextOutside}>{error}</Text>}
        {!!successMsg && <Text style={styles.successTextOutside}>{successMsg}</Text>}

        {/* ── Report card ── */}
        {(fetched || loading) && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Expenses {longDisplay(date)}</Text>
              <View style={styles.exportRow}>
                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#C62828' }]}>
                  <Icon name="file-pdf-box" size={14} color="#fff" />
                  <Text style={styles.exportBtnText}> PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#2E7D32' }]}>
                  <Icon name="file-excel" size={14} color="#fff" />
                  <Text style={styles.exportBtnText}> Excel</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loading ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} /> : (
              <>
                {/* Summary block */}
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryHeaderText}>{branchName}</Text>
                </View>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Bank Funds</Text>
                    <Text style={styles.summaryValue}>{record ? Rs(record.bank) : '-'}</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Charity Cash</Text>
                    <Text style={styles.summaryValue}>{record ? Rs(record.charity) : '-'}</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>GST Cash</Text>
                    <Text style={styles.summaryValue}>{record ? Rs(record.gst) : '-'}</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Cash in Hand</Text>
                    <Text style={styles.summaryValue}>{record ? Rs(record.cash_in_hand) : '-'}</Text>
                  </View>
                </View>
                {!!record?.description && (
                  <Text style={styles.summaryNotes}>Notes: {record.description}</Text>
                )}
                {!record && (
                  <Text style={styles.emptyHint}>No daily entry saved for this date yet. Fill the form below to add one.</Text>
                )}

                {/* Itemized expense list */}
                <Text style={styles.sectionLabel}>Expenses</Text>
                {expenses.length === 0 ? (
                  <Text style={styles.emptyText}>No expenses recorded for this date.</Text>
                ) : (
                  <View style={styles.expenseTable}>
                    {expenses.map((e, i) => (
                      <View key={e.id ?? i} style={[styles.expenseRow, i % 2 === 1 && styles.expenseRowAlt]}>
                        <Text style={styles.expenseDesc} numberOfLines={2}>
                          {e.description || e.sub_category_name || e.category_name || 'Expense'}
                        </Text>
                        <Text style={styles.expenseAmount}>{Rs(e.amount)}</Text>
                      </View>
                    ))}
                    <View style={styles.expenseTotalRow}>
                      <Text style={styles.expenseTotalLabel}>Total</Text>
                      <Text style={styles.expenseTotalValue}>{Rs(totalExpense)}</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Manage Daily Entry card ── */}
        {fetched && !loading && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Manage Daily Entry</Text>
            <Text style={styles.hint}>Snapshot values for {branchName} on {display(date)}.</Text>

            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={styles.label}>Bank Funds</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={bank}
                  onChangeText={setBank}
                />
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>Charity Cash</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={charity}
                  onChangeText={setCharity}
                />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={styles.label}>GST Cash</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={gst}
                  onChangeText={setGst}
                />
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>Cash In Hand</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={cashInHand}
                  onChangeText={setCashInHand}
                />
              </View>
            </View>

            <View style={styles.fullRow}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Enter Notes"
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveEntry}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>{record ? 'Update Entry' : 'Save Entry'}</Text>
              }
            </TouchableOpacity>
          </View>
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

export default DailyExpense;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  addBtn: {
    backgroundColor: R, borderRadius: 6, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12, gap: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  fullRow: { marginBottom: 14 },
  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  col2: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  hint: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 14 },

  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },

  goBtn: {
    backgroundColor: '#222', borderRadius: 6, alignItems: 'center',
    paddingVertical: 11, marginTop: 4,
  },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  exportRow: { flexDirection: 'row', gap: 8 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 5,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  errTextOutside: { color: R, fontSize: 13, marginBottom: 10, fontWeight: '500' },
  successTextOutside: { color: '#2E7D32', fontSize: 13, marginBottom: 10, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 16, fontSize: 13 },
  emptyHint: { fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 12 },

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
    paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#FFEBEE',
  },
  expenseTotalLabel: { fontSize: 13, fontWeight: '700', color: R },
  expenseTotalValue: { fontSize: 14, fontWeight: '800', color: R },

  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 13, color: '#222', backgroundColor: '#FAFAFA',
  },
  textarea: { height: 70, textAlignVertical: 'top' },

  saveBtn: {
    backgroundColor: '#2E7D32', borderRadius: 6, alignItems: 'center',
    paddingVertical: 12, marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
