import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  getLiabilityLedger,
  getLiabilityBalance,
  deleteLiabilityEntry,
  updateLiabilityEntry,
} from '../../../api/employeeDashboard';

interface LedgerRow {
  id: number;
  date?: string;
  description?: string;
  amount?: number;
  type?: string;           // "Credit" | "Debit"
  transaction_type?: string; // resource/source label
  branch_name?: string;
  // computed:
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

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const d = new Date(); const q = Math.floor(d.getMonth() / 3);
  return `${d.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`;
};
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fmt(d); };
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return fmt(d); };

const COLS = [
  { key: 'sr',       label: 'Sr#',         width: 50  },
  { key: 'date',     label: 'Date',        width: 110 },
  { key: 'desc',     label: 'Description', width: 260 },
  { key: 'resource', label: 'Resource',    width: 120 },
  { key: 'debit',    label: 'Debit',       width: 100 },
  { key: 'credit',   label: 'Credit',      width: 100 },
  { key: 'balance',  label: 'Balance',     width: 110 },
  { key: 'actions',  label: 'Actions',     width: 120 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const ViewLiabilitiesLedger = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [startDate, setStartDate] = useState(() => startOfMonth());
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit modal
  const [editRow, setEditRow] = useState<LedgerRow | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ledgerRes, balRes] = await Promise.all([
        getLiabilityLedger({ branch_id: branchId, start_date: startDate, end_date: endDate, limit: 500 }),
        getLiabilityBalance(branchId),
      ]);
      const data: LedgerRow[] = ledgerRes?.data?.data ?? ledgerRes?.data ?? [];
      setRows(withRunningBalance(Array.isArray(data) ? data : []));
      const bal = balRes?.data?.balance ?? balRes?.balance ?? balRes?.data ?? null;
      setTotalBalance(bal !== null ? parseFloat(bal) : null);
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
      await deleteLiabilityEntry(id);
      flash('Entry deleted.');
      load();
    } catch {
      setError('Failed to delete entry.');
    }
  };

  const openEdit = (row: LedgerRow) => {
    setEditRow(row);
    setEditDesc(row.description ?? '');
    setEditAmount(String(row.amount ?? ''));
  };

  const handleUpdate = async () => {
    if (!editRow) return;
    setEditSaving(true);
    try {
      await updateLiabilityEntry(editRow.id, {
        description: editDesc.trim() || undefined,
        amount: editAmount ? parseFloat(editAmount) : undefined,
      });
      flash('Entry updated.');
      setEditRow(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update entry.');
    } finally {
      setEditSaving(false);
    }
  };

  const setQuick = (s: string, e: string) => { setStartDate(s); setEndDate(e); };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Liabilities Ledger"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Date filter card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Dates</Text>
            <View style={styles.topBtns}>
              <TouchableOpacity style={styles.topBtn} onPress={() => navigation.navigate('AddLiabilities')}>
                <Text style={styles.topBtnText}>Add Liabilities</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.topBtn, styles.topBtnDark]} onPress={() => navigation.goBack()}>
                <Text style={styles.topBtnText}>Go Back</Text>
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

          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {/* Results card */}
        {(fetched || loading) && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Liabilities Ledger</Text>
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
                  <>
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
                            <Text style={[styles.td, { width: COLS[3].width }]}>{row.transaction_type || 'N/A'}</Text>
                            <Text style={[styles.td, { width: COLS[4].width }]}>{row._debit ? Rs(row._debit) : '-'}</Text>
                            <Text style={[styles.td, { width: COLS[5].width }]}>{row._credit ? Rs(row._credit) : '-'}</Text>
                            <Text style={[styles.td, { width: COLS[6].width, fontWeight: '600' }]}>{Rs(row._balance ?? 0)}</Text>
                            <View style={[styles.td, styles.actionCell, { width: COLS[7].width }]}>
                              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(row)}>
                                <Icon name="pencil" size={12} color="#fff" />
                                <Text style={styles.editBtnText}> Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(row.id)}>
                                <Icon name="delete" size={12} color="#fff" />
                                <Text style={styles.deleteBtnText}> Del</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                    {totalBalance !== null && (
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Balance:</Text>
                        <Text style={styles.totalValue}>{totalBalance.toLocaleString()}</Text>
                      </View>
                    )}
                  </>
                )
            }
          </View>
        )}
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={!!editRow} transparent animationType="fade" onRequestClose={() => setEditRow(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEditRow(null)}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Edit Entry</Text>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.fieldInput, { marginBottom: 12 }]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Description"
              placeholderTextColor="#aaa"
            />
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={[styles.fieldInput, { marginBottom: 16 }]}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor="#aaa"
            />
            <View style={styles.editBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditRow(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.updateBtn, editSaving && { opacity: 0.6 }]}
                onPress={handleUpdate}
                disabled={editSaving}
              >
                {editSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.updateBtnText}>Update</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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

export default ViewLiabilitiesLedger;

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
  topBtns: { flexDirection: 'row', gap: 8 },
  topBtn: {
    borderWidth: 1, borderColor: R, borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 10, backgroundColor: R,
  },
  topBtnDark: { backgroundColor: '#444', borderColor: '#444' },
  topBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

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
    backgroundColor: '#222', borderRadius: 6,
    alignItems: 'center', paddingVertical: 11, marginTop: 4,
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
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  editBtn: {
    backgroundColor: '#1565C0', borderRadius: 4, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 4, paddingHorizontal: 6,
  },
  editBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: R, borderRadius: 4, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 4, paddingHorizontal: 6,
  },
  deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    alignItems: 'center', paddingTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#EEE', marginTop: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
  totalValue: { fontSize: 14, fontWeight: '700', color: R },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  editBox: { backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '85%' },
  editTitle: { fontWeight: '700', fontSize: 16, marginBottom: 14, color: '#1A1A1A' },
  fieldInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#222',
  },
  editBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#999', borderRadius: 6,
    paddingVertical: 9, paddingHorizontal: 18,
  },
  cancelBtnText: { color: '#555', fontSize: 13 },
  updateBtn: { backgroundColor: R, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 20 },
  updateBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
