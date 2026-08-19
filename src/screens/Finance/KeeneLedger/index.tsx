import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import { getKeeneLedger, deleteKeeneEntry } from '../../../api/employeeDashboard';

interface LedgerRow {
  id: number;
  date?: string;
  description?: string;
  amount?: number;
  type?: string;   // "Credit" | "Debit"
  cc_charges?: string | number;
  // computed client-side:
  _debit?: number;
  _credit?: number;
  _balance?: number;
}

const withRunningBalance = (rows: LedgerRow[]): LedgerRow[] => {
  let balance = 0;
  return rows.map(r => {
    const amt = parseFloat(String(r.amount ?? 0)) || 0;
    const isCredit = (r.type ?? '').toLowerCase() === 'credit';
    const debit  = isCredit ? 0 : amt;
    const credit = isCredit ? amt : 0;
    balance += credit - debit;
    return { ...r, _debit: debit, _credit: credit, _balance: balance };
  });
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
const Rs = (n: any) => {
  if (n === undefined || n === null || n === '') return '-';
  const v = parseFloat(n) || 0;
  return v.toLocaleString();
};

const today = () => fmt(new Date());
const startOfYear = () => `${new Date().getFullYear()}-01-01`;
const startOfQuarter = () => {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  return `${d.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`;
};
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fmt(d); };
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return fmt(d); };

const COLS = [
  { key: 'sr',    label: 'Sr#',         width: 50  },
  { key: 'date',  label: 'Date',        width: 110 },
  { key: 'desc',  label: 'Description', width: 310 },
  { key: 'debit', label: 'Debit',       width: 110 },
  { key: 'credit',label: 'Credit',      width: 110 },
  { key: 'bal',   label: 'Balance',     width: 120 },
  { key: 'act',   label: 'Actions',     width: 90  },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const KeeneLedger = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  const [startDate, setStartDate] = useState(() => startOfMonth());
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getKeeneLedger({ branch_id: listBranchId, start_date: startDate, end_date: endDate, limit: 500 });
      const data: LedgerRow[] = res?.data?.data ?? res?.data ?? [];
      setRows(withRunningBalance(Array.isArray(data) ? data : []));
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setRows([]);
      } else {
        setError(e?.response?.data?.message || 'Failed to load ledger. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [listBranchId, startDate, endDate]);

  const handleDelete = async (id: number) => {
    try {
      await deleteKeeneEntry(id);
      flash('Entry deleted.');
      load();
    } catch {
      setError('Failed to delete entry.');
    }
  };

  const setQuick = (s: string, e: string) => { setStartDate(s); setEndDate(e); };

  const onDatePick = (d: Date) => {
    const iso = fmt(d);
    if (pickerFor === 'start') setStartDate(iso);
    else setEndDate(iso);
    setPickerFor(null);
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Keene Ledger"
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
            <Text style={styles.cardTitle}>Dates</Text>
            <TouchableOpacity style={styles.addKeeneBtn} onPress={() => navigation.navigate('AddKeene')}>
              <Icon name="plus" size={14} color="#fff" />
              <Text style={styles.addKeeneBtnText}>Add Keene</Text>
            </TouchableOpacity>
          </View>

          {/* Branch + Start + End */}
          <View style={styles.row3}>
            <View style={styles.col3}>
              <BranchField
                needsPicker={needsPicker}
                branchName={branchName}
                options={branchOptions}
                loadingOptions={loadingBranches}
                onSelect={selectBranch}
              />
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Start date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>End date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Dates */}
          <Text style={styles.quickLabel}>Quick Dates</Text>
          <View style={styles.quickSection}>
            <View style={styles.quickGroup}>
              <Text style={styles.quickGroupLabel}>Last</Text>
              <View style={styles.quickBtns}>
                {[
                  { label: 'Year',      s: startOfYear(),  e: today() },
                  { label: 'Quarter',   s: startOfQuarter(), e: today() },
                  { label: 'Month',     s: startOfMonth(), e: today() },
                  { label: 'Yesterday', s: yesterday(),    e: yesterday() },
                ].map(q => (
                  <TouchableOpacity key={q.label} style={styles.quickBtn} onPress={() => setQuick(q.s, q.e)}>
                    <Text style={styles.quickBtnText}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.quickGroup}>
              <Text style={styles.quickGroupLabel}>To-Date</Text>
              <View style={styles.quickBtns}>
                {[
                  { label: 'Year',    s: startOfYear(),  e: today() },
                  { label: 'Quarter', s: startOfQuarter(), e: today() },
                  { label: 'Month',   s: startOfMonth(), e: today() },
                  { label: 'Today',   s: today(),        e: today() },
                ].map(q => (
                  <TouchableOpacity key={q.label} style={styles.quickBtn} onPress={() => setQuick(q.s, q.e)}>
                    <Text style={styles.quickBtnText}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.quickGroup}>
              <Text style={styles.quickGroupLabel}>Previous</Text>
              <View style={styles.quickBtns}>
                {[
                  { label: '365 Days', n: 365 },
                  { label: '90 Days',  n: 90  },
                  { label: '30 Days',  n: 30  },
                  { label: '9 Days',   n: 9   },
                ].map(q => (
                  <TouchableOpacity key={q.label} style={styles.quickBtn} onPress={() => setQuick(daysAgo(q.n), today())}>
                    <Text style={styles.quickBtnText}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Results card ── */}
        {(fetched || loading) && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Keene Ledger</Text>
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

            {!!error && <Text style={styles.errText}>{error}</Text>}
            {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

            {loading
              ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
              : rows.length === 0
                ? <Text style={styles.emptyText}>No records found for the selected date range.</Text>
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ width: TABLE_W }}>
                      <View style={styles.thead}>
                        {COLS.map(c => (
                          <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                        ))}
                      </View>
                      {rows.map((row, i) => (
                        <View key={row.id ?? i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: COLS[0].width }]}>{i + 1}</Text>
                          <Text style={[styles.td, { width: COLS[1].width }]}>{display(row.date)}</Text>
                          <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]}>{row.description || '-'}</Text>
                          <Text style={[styles.td, { width: COLS[3].width }]}>{row._debit ? Rs(row._debit) : '-'}</Text>
                          <Text style={[styles.td, { width: COLS[4].width }]}>{row._credit ? Rs(row._credit) : '-'}</Text>
                          <Text style={[styles.td, { width: COLS[5].width, fontWeight: '600' }]}>{Rs(row._balance ?? 0)}</Text>
                          <View style={[styles.td, styles.actionCell, { width: COLS[6].width }]}>
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(row.id)}>
                              <Icon name="delete" size={13} color="#fff" />
                              <Text style={styles.deleteBtnText}> Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
            }
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={!!pickerFor}
        mode="date"
        date={toDate(pickerFor === 'start' ? startDate : endDate)}
        onConfirm={onDatePick}
        onCancel={() => setPickerFor(null)}
      />
    </View>
  );
};

export default KeeneLedger;

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
  addKeeneBtn: {
    backgroundColor: R, borderRadius: 6, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12, gap: 4,
  },
  addKeeneBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  row3: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  col3: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },

  quickLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  quickSection: { gap: 8, marginBottom: 14 },
  quickGroup: {},
  quickGroupLabel: { fontSize: 11, fontWeight: '600', color: '#888', marginBottom: 5 },
  quickBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickBtn: {
    borderWidth: 1, borderColor: '#CCC', borderRadius: 5,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FAFAFA',
  },
  quickBtnText: { fontSize: 12, color: '#333' },

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

  errText: { color: R, fontSize: 13, marginBottom: 8 },
  successText: { color: '#2E7D32', fontSize: 13, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 9 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 6, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 6, textAlign: 'center', alignSelf: 'center' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: {
    backgroundColor: R, borderRadius: 4, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 4, paddingHorizontal: 7,
  },
  deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
