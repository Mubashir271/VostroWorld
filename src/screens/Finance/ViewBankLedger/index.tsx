import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getBankLedger } from '../../../api/employeeDashboard';

interface LedgerRow {
  id: number;
  date?: string;
  description?: string;
  amount?: number | string;
  type?: string;       // "Credit" | "Debit"
  resource?: string;
  // computed client-side:
  _debit?: number;
  _credit?: number;
  _balance?: number;
}

const withRunningBalance = (rows: LedgerRow[], openingBalance: number): LedgerRow[] => {
  let balance = openingBalance;
  return rows.map(r => {
    const amt = parseFloat(String(r.amount ?? 0)) || 0;
    const isCredit = (r.type ?? '').toLowerCase() === 'credit';
    const debit = isCredit ? 0 : amt;
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
  { key: 'sr',       label: 'Sr#',         width: 42  },
  { key: 'date',     label: 'Date',        width: 90  },
  { key: 'desc',     label: 'Description', width: 230 },
  { key: 'resource', label: 'Resource',    width: 110 },
  { key: 'debit',    label: 'Debit',       width: 100 },
  { key: 'credit',   label: 'Credit',      width: 100 },
  { key: 'balance',  label: 'Balance',     width: 120 },
  { key: 'actions',  label: 'Actions',     width: 90  },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const ViewBankLedger = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [startDate, setStartDate] = useState(() => startOfMonth());
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [openingBalance, setOpeningBalance] = useState<{ balance: number; date?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const flashNote = (msg: string) => { setNote(msg); setTimeout(() => setNote(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ledgerRes = await getBankLedger({ branch_id: branchId, start_date: startDate, end_date: endDate, limit: 500 });
      const data: LedgerRow[] = ledgerRes?.data?.data ?? ledgerRes?.data ?? [];
      const ob = ledgerRes?.opening_balance;
      const obBalance = parseFloat(ob?.balance ?? 0) || 0;
      setOpeningBalance(ob ? { balance: obBalance, date: ob.date } : null);
      setRows(withRunningBalance(Array.isArray(data) ? data : [], obBalance));
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setRows([]);
        setOpeningBalance(null);
        setFetched(true);
      } else {
        setError(e?.response?.data?.message || 'Failed to load ledger. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setQuick = (s: string, e: string) => { setStartDate(s); setEndDate(e); };

  const visibleRows = search.trim()
    ? rows.filter(r =>
        (r.description ?? '').toLowerCase().includes(search.trim().toLowerCase()) ||
        (r.resource ?? '').toLowerCase().includes(search.trim().toLowerCase()))
    : rows;

  const totalBalance = rows.length > 0 ? rows[rows.length - 1]._balance ?? 0 : (openingBalance?.balance ?? 0);

  return (
    <View style={styles.root}>
      <AppHeader
        title="Bank Ledger"
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
            <View style={styles.headerBtns}>
              <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddBankCash')}>
                <Icon name="plus" size={14} color="#fff" />
                <Text style={styles.addBtnText}>Add Bank Cash</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.goBackBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>

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

          {/* Quick Dates */}
          <Text style={styles.quickLabel}>Quick Dates</Text>
          <View style={styles.quickSection}>
            {[
              { label: 'Last',     items: [{ l: 'Year', s: startOfYear(), e: today() }, { l: 'Quarter', s: startOfQuarter(), e: today() }, { l: 'Month', s: startOfMonth(), e: today() }, { l: 'Yesterday', s: yesterday(), e: yesterday() }] },
              { label: 'To-Date',  items: [{ l: 'Year', s: startOfYear(), e: today() }, { l: 'Quarter', s: startOfQuarter(), e: today() }, { l: 'Month', s: startOfMonth(), e: today() }, { l: 'Today', s: today(), e: today() }] },
              { label: 'Previous', items: [{ l: '365 Days', s: daysAgo(365), e: today() }, { l: '90 Days', s: daysAgo(90), e: today() }, { l: '30 Days', s: daysAgo(30), e: today() }, { l: '9 Days', s: daysAgo(9), e: today() }] },
            ].map(group => (
              <View key={group.label} style={styles.quickGroup}>
                <Text style={styles.quickGroupLabel}>{group.label}</Text>
                <View style={styles.quickBtns}>
                  {group.items.map(q => (
                    <TouchableOpacity key={q.l} style={styles.quickBtn} onPress={() => setQuick(q.s, q.e)}>
                      <Text style={styles.quickBtnText}>{q.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.label}>Search</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search description or resource"
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />

          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Results card ── */}
        {(fetched || loading) && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Bank Cash Ledger</Text>
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
            {!!note && <Text style={styles.noteText}>{note}</Text>}

            {loading
              ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
              : visibleRows.length === 0 && !openingBalance
                ? <Text style={styles.emptyText}>No records found.</Text>
                : (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View style={{ width: TABLE_W }}>
                        <View style={styles.thead}>
                          {COLS.map(c => (
                            <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                          ))}
                        </View>
                        {openingBalance && (
                          <View style={styles.tr}>
                            <Text style={[styles.td, { width: COLS[0].width }]}>1</Text>
                            <Text style={[styles.td, { width: COLS[1].width }]}>{display(openingBalance.date)}</Text>
                            <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left', fontWeight: '600' }]}>Opening Balance</Text>
                            <Text style={[styles.td, { width: COLS[3].width }]}>-</Text>
                            <Text style={[styles.td, { width: COLS[4].width }]}>{openingBalance.balance < 0 ? Rs(Math.abs(openingBalance.balance)) : '-'}</Text>
                            <Text style={[styles.td, { width: COLS[5].width }]}>{openingBalance.balance >= 0 ? Rs(openingBalance.balance) : '-'}</Text>
                            <Text style={[styles.td, { width: COLS[6].width, fontWeight: '600' }]}>{Rs(openingBalance.balance)}</Text>
                            <View style={[styles.td, { width: COLS[7].width }]} />
                          </View>
                        )}
                        {visibleRows.map((row, i) => (
                          <View key={row.id ?? i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                            <Text style={[styles.td, { width: COLS[0].width }]}>{(openingBalance ? 2 : 1) + i}</Text>
                            <Text style={[styles.td, { width: COLS[1].width }]}>{display(row.date)}</Text>
                            <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]}>{row.description || '-'}</Text>
                            <Text style={[styles.td, { width: COLS[3].width }]}>{row.resource || '-'}</Text>
                            <Text style={[styles.td, { width: COLS[4].width }]}>{row._debit ? Rs(row._debit) : '-'}</Text>
                            <Text style={[styles.td, { width: COLS[5].width }]}>{row._credit ? Rs(row._credit) : '-'}</Text>
                            <Text style={[styles.td, { width: COLS[6].width, fontWeight: '600' }]}>{Rs(row._balance ?? 0)}</Text>
                            <View style={[styles.td, styles.actionCell, { width: COLS[7].width }]}>
                              <TouchableOpacity
                                style={styles.actionIconBtn}
                                onPress={() => flashNote('Editing and deleting bank ledger entries requires backend confirmation before going live.')}
                              >
                                <Icon name="pencil-outline" size={15} color="#9E9E9E" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.actionIconBtn}
                                onPress={() => flashNote('Editing and deleting bank ledger entries requires backend confirmation before going live.')}
                              >
                                <Icon name="trash-can-outline" size={15} color="#9E9E9E" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>

                    <View style={styles.summaryBox}>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Total Balance:</Text>
                        <Text style={[styles.summaryValue, { fontWeight: '700' }]}>{Rs(totalBalance)}</Text>
                      </View>
                    </View>
                  </>
                )
            }
          </View>
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

export default ViewBankLedger;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  headerBtns: { flexDirection: 'row', gap: 8 },
  addBtn: {
    backgroundColor: R, borderRadius: 6, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12, gap: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  goBackBtn: {
    borderWidth: 1, borderColor: '#555', borderRadius: 6,
    paddingVertical: 7, paddingHorizontal: 12, justifyContent: 'center',
  },
  goBackBtnText: { color: '#333', fontWeight: '600', fontSize: 13 },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  col2: { flex: 1 },
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

  searchInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9, fontSize: 13,
    color: '#222', backgroundColor: '#FAFAFA', marginBottom: 14,
  },

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
  noteText: { color: '#E65100', fontSize: 12, marginBottom: 8, fontStyle: 'italic' },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 9 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  actionIconBtn: { padding: 2 },

  summaryBox: {
    marginTop: 14, padding: 12, borderRadius: 8, backgroundColor: '#FAFAFA',
    borderWidth: 1, borderColor: '#EEE',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: 13, color: '#444' },
  summaryValue: { fontSize: 13, color: '#1A1A1A' },
});
