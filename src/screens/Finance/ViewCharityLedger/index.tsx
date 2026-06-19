import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCharityLedger, getCharityBalance, deleteCharityEntry } from '../../../api/employeeDashboard';

interface LedgerRow {
  id: number;
  date?: string;
  notes?: string;
  credit?: string | number;
  debit?: string | number;
  to?: string | null;
  from?: string | null;
  f_cash_balance?: string | number;
  w_cash_balance?: string | number;
  total_charity?: string | number;
}

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
// Backend stores `date` as a UTC timestamp at Asia/Karachi midnight (UTC+5),
// so naively splitting on 'T' shows the calendar date one day early.
const display = (iso?: string) => {
  if (!iso) return '-';
  if (!iso.includes('T')) {
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  }
  const local = new Date(new Date(iso).getTime() + 5 * 60 * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
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
  { key: 'sr',     label: 'Sr#',           width: 45  },
  { key: 'date',   label: 'Date',          width: 100 },
  { key: 'notes',  label: 'Notes',         width: 220 },
  { key: 'to',     label: 'Credit To',     width: 100 },
  { key: 'credit', label: 'Credit',        width: 100 },
  { key: 'from',   label: 'Debit From',    width: 100 },
  { key: 'debit',  label: 'Debit',         width: 100 },
  { key: 'fbal',   label: 'Faisal Bal.',   width: 110 },
  { key: 'wbal',   label: 'Waqas Bal.',    width: 110 },
  { key: 'total',  label: 'Total Charity', width: 120 },
  { key: 'act',    label: 'Actions',       width: 90  },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const ViewCharityLedger = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [startDate, setStartDate] = useState(() => startOfMonth());
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [opening, setOpening] = useState<{ f: number; w: number; total: number; date?: string } | null>(null);
  const [balances, setBalances] = useState<{ f: number; w: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ledgerRes, balRes] = await Promise.all([
        getCharityLedger({ branch_id: branchId, start_date: startDate, end_date: endDate, limit: 500 }),
        getCharityBalance(branchId),
      ]);
      const data: LedgerRow[] = ledgerRes?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
      const ob = ledgerRes?.opening_balance;
      setOpening(ob ? {
        f: parseFloat(ob.f_balance ?? 0) || 0,
        w: parseFloat(ob.w_balance ?? 0) || 0,
        total: parseFloat(ob.total_balance ?? 0) || 0,
        date: ob.date,
      } : null);
      setBalances({
        f: parseFloat(balRes?.f_cash_balance ?? 0) || 0,
        w: parseFloat(balRes?.w_cash_balance ?? 0) || 0,
        total: parseFloat(balRes?.total_charity ?? 0) || 0,
      });
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
  }, [branchId, startDate, endDate]);

  const handleDelete = async (id: number) => {
    try {
      await deleteCharityEntry(id);
      flash('Entry deleted.');
      load();
    } catch {
      setError('Failed to delete entry.');
    }
  };

  const setQuick = (s: string, e: string) => { setStartDate(s); setEndDate(e); };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Charity Ledger"
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
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddCharity')}>
              <Icon name="plus" size={14} color="#fff" />
              <Text style={styles.addBtnText}>Add Charity</Text>
            </TouchableOpacity>
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

          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Results card ── */}
        {(fetched || loading) && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Charity Ledger</Text>
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
                      {opening && (
                        <View style={[styles.tr, { backgroundColor: '#FFF3E0' }]}>
                          <Text style={[styles.td, { width: COLS[0].width }]}>1</Text>
                          <Text style={[styles.td, { width: COLS[1].width }]}>{display(opening.date)}</Text>
                          <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left', fontWeight: '600' }]}>Opening Balance</Text>
                          <Text style={[styles.td, { width: COLS[3].width }]}>-</Text>
                          <Text style={[styles.td, { width: COLS[4].width }]}>-</Text>
                          <Text style={[styles.td, { width: COLS[5].width }]}>-</Text>
                          <Text style={[styles.td, { width: COLS[6].width }]}>-</Text>
                          <Text style={[styles.td, { width: COLS[7].width, fontWeight: '600' }]}>{Rs(opening.f)}</Text>
                          <Text style={[styles.td, { width: COLS[8].width, fontWeight: '600' }]}>{Rs(opening.w)}</Text>
                          <Text style={[styles.td, { width: COLS[9].width, fontWeight: '600' }]}>{Rs(opening.total)}</Text>
                          <View style={[styles.td, styles.actionCell, { width: COLS[10].width }]} />
                        </View>
                      )}
                      {rows.map((row, i) => (
                        <View key={row.id ?? i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: COLS[0].width }]}>{(opening ? 2 : 1) + i}</Text>
                          <Text style={[styles.td, { width: COLS[1].width }]}>{display(row.date)}</Text>
                          <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]}>{row.notes || '-'}</Text>
                          <Text style={[styles.td, { width: COLS[3].width }]}>{row.to || '-'}</Text>
                          <Text style={[styles.td, { width: COLS[4].width }]}>{parseFloat(String(row.credit ?? 0)) ? Rs(row.credit) : '-'}</Text>
                          <Text style={[styles.td, { width: COLS[5].width }]}>{row.from || '-'}</Text>
                          <Text style={[styles.td, { width: COLS[6].width }]}>{parseFloat(String(row.debit ?? 0)) ? Rs(row.debit) : '-'}</Text>
                          <Text style={[styles.td, { width: COLS[7].width }]}>{Rs(row.f_cash_balance)}</Text>
                          <Text style={[styles.td, { width: COLS[8].width }]}>{Rs(row.w_cash_balance)}</Text>
                          <Text style={[styles.td, { width: COLS[9].width, fontWeight: '600' }]}>{Rs(row.total_charity)}</Text>
                          <View style={[styles.td, styles.actionCell, { width: COLS[10].width }]}>
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

            {balances && (
              <View style={styles.balanceBox}>
                <Text style={styles.balanceTitle}>Final Balances</Text>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Faisal Balance:</Text>
                  <Text style={styles.balanceValue}>Rs {Rs(balances.f)}/-</Text>
                </View>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Waqas Balance:</Text>
                  <Text style={styles.balanceValue}>Rs {Rs(balances.w)}/-</Text>
                </View>
                <View style={[styles.balanceRow, { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 6, marginTop: 4 }]}>
                  <Text style={[styles.balanceLabel, { fontWeight: '700' }]}>Total Charity:</Text>
                  <Text style={[styles.balanceValue, { fontWeight: '700' }]}>Rs {Rs(balances.total)}/-</Text>
                </View>
              </View>
            )}
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

export default ViewCharityLedger;

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
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 4, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 11, color: '#333', paddingHorizontal: 4, textAlign: 'center', alignSelf: 'center' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: {
    backgroundColor: R, borderRadius: 4, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 4, paddingHorizontal: 7,
  },
  deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  balanceBox: {
    marginTop: 14, padding: 12, borderRadius: 8, backgroundColor: '#FAFAFA',
    borderWidth: 1, borderColor: '#EEE',
  },
  balanceTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  balanceLabel: { fontSize: 13, color: '#444' },
  balanceValue: { fontSize: 13, color: '#1A1A1A' },
});
