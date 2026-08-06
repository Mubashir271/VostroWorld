import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getG13Ledger, deleteG13Entry } from '../../../api/employeeDashboard';

const TRANSACTIONS = [
  'All', 'Bank Account', 'Sales Counter', 'Office Counter',
  'Personal', 'G13', 'Mr Arif', 'Mr Waqas Credit Card',
];

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const displayDate = (iso: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const fmtAmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 0 });
const today = () => fmt(new Date());
const yearStart = () => `${new Date().getFullYear()}-01-01`;

interface G13Row {
  id: number;
  amount: number;
  type: string;
  transaction_type: string;
  description: string;
  date: string;
  _debit: number;
  _credit: number;
  _balance: number;
}

const withRunningBalance = (rows: Omit<G13Row, '_debit' | '_credit' | '_balance'>[]): G13Row[] => {
  let balance = 0;
  return rows.map(r => {
    const amt = parseFloat(String(r.amount ?? 0)) || 0;
    const isCredit = (r.type ?? '').toLowerCase() === 'credit';
    const debit = isCredit ? 0 : amt;
    const credit = isCredit ? amt : 0;
    balance += credit - debit;
    return { ...r, _debit: debit, _credit: credit, _balance: balance };
  });
};

const G13CashLedger = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [startDate, setStartDate] = useState(yearStart());
  const [endDate, setEndDate] = useState(today());
  const [txFilter, setTxFilter] = useState('All');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTxPicker, setShowTxPicker] = useState(false);

  const [rows, setRows] = useState<G13Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { branch_id: branchId, start_date: startDate, end_date: endDate, limit: 500 };
      if (txFilter !== 'All') params.transaction_type = txFilter;
      const res = await getG13Ledger(params);
      const raw = res?.data?.data ?? res?.data ?? [];
      setRows(withRunningBalance(Array.isArray(raw) ? raw : []));
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
  }, [branchId, startDate, endDate, txFilter]);

  useFocusEffect(useCallback(() => { fetchLedger(); }, [fetchLedger]));

  const setQuickLast = (unit: 'year' | 'quarter' | 'month' | 'yesterday') => {
    const now = new Date();
    let s = new Date(now);
    if (unit === 'year') s = new Date(now.getFullYear(), 0, 1);
    else if (unit === 'quarter') s = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    else if (unit === 'month') s = new Date(now.getFullYear(), now.getMonth(), 1);
    else { s = new Date(now); s.setDate(now.getDate() - 1); setEndDate(fmt(s)); }
    setStartDate(fmt(s));
    if (unit !== 'yesterday') setEndDate(today());
  };

  const setQuickPrev = (days: number) => {
    const now = new Date();
    const s = new Date(now);
    s.setDate(now.getDate() - days);
    setStartDate(fmt(s));
    setEndDate(today());
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    try {
      await deleteG13Entry(deleteId);
      setRows(rs => rs.filter(r => r.id !== deleteId));
      setDeleteId(null);
    } catch {
      setError('Failed to delete entry.');
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalBalance = rows.length > 0 ? rows[rows.length - 1]._balance : 0;

  return (
    <View style={styles.root}>
      <AppHeader
        title="G-13 Cash Ledger"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Top action buttons */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.topBtn} onPress={() => navigation.navigate('AddG13Cash')}>
            <Text style={styles.topBtnText}>Add G-13 Cash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBtnOutline} onPress={() => navigation.goBack()}>
            <Text style={styles.topBtnOutlineText}>Go Back</Text>
          </TouchableOpacity>
        </View>

        {/* Filter card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dates</Text>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Start date</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.pickerText}>{displayDate(startDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>End date</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.pickerText}>{displayDate(endDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Dates */}
          <Text style={styles.quickLabel}>Quick Dates</Text>
          <View style={styles.quickRow}>
            <Text style={styles.quickGroup}>Last</Text>
            {(['year', 'quarter', 'month', 'yesterday'] as const).map(u => (
              <TouchableOpacity key={u} style={styles.quickBtn} onPress={() => setQuickLast(u)}>
                <Text style={styles.quickBtnText}>{u.charAt(0).toUpperCase() + u.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.quickRow}>
            <Text style={styles.quickGroup}>To-Date</Text>
            {(['year', 'quarter', 'month'] as const).map(u => (
              <TouchableOpacity key={u} style={styles.quickBtn} onPress={() => {
                const now = new Date();
                let s = new Date(now);
                if (u === 'year') s = new Date(now.getFullYear(), 0, 1);
                else if (u === 'quarter') s = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                else s = new Date(now.getFullYear(), now.getMonth(), 1);
                setStartDate(fmt(s)); setEndDate(today());
              }}>
                <Text style={styles.quickBtnText}>{u.charAt(0).toUpperCase() + u.slice(1)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.quickBtn} onPress={() => { setStartDate(today()); setEndDate(today()); }}>
              <Text style={styles.quickBtnText}>Today</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickRow}>
            <Text style={styles.quickGroup}>Previous</Text>
            {[365, 90, 30, 9].map(d => (
              <TouchableOpacity key={d} style={styles.quickBtn} onPress={() => setQuickPrev(d)}>
                <Text style={styles.quickBtnText}>{d} Days</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transaction filter */}
          <Text style={styles.label}>Transaction</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowTxPicker(true)}>
            <Text style={styles.pickerText}>{txFilter}</Text>
            <Icon name="chevron-down" size={15} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.goBtn} onPress={fetchLedger}>
            <Text style={styles.goBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        {/* Ledger table */}
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>G-13 Cash Ledger</Text>
            <View style={styles.exportRow}>
              <TouchableOpacity style={styles.exportBtn}>
                <Icon name="file-pdf-box" size={14} color="#fff" />
                <Text style={styles.exportBtnText}> PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exportBtn, styles.exportBtnGreen]}>
                <Icon name="microsoft-excel" size={14} color="#fff" />
                <Text style={styles.exportBtnText}> Excel</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!!error && <Text style={styles.errText}>{error}</Text>}

          {loading ? (
            <ActivityIndicator color={R} size="large" style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                {/* Table head */}
                <View style={[styles.tableRow, styles.tableHeadRow]}>
                  {['Sr#', 'Date', 'Description', 'Transaction', 'Debit', 'Credit', 'Balance', 'Actions'].map(h => (
                    <Text key={h} style={[styles.tableHeadCell, h === 'Description' && styles.wideCell]}>{h}</Text>
                  ))}
                </View>
                {rows.length === 0 ? (
                  <Text style={styles.emptyText}>No records found.</Text>
                ) : (
                  rows.map((row, idx) => (
                    <View key={row.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                      <Text style={styles.tableCell}>{idx + 1}</Text>
                      <Text style={styles.tableCell}>{displayDate(row.date)}</Text>
                      <Text style={[styles.tableCell, styles.wideCell]} numberOfLines={2}>{row.description || '-'}</Text>
                      <Text style={styles.tableCell}>{row.transaction_type || '-'}</Text>
                      <Text style={[styles.tableCell, row._debit > 0 && styles.debitText]}>
                        {row._debit > 0 ? fmtAmt(row._debit) : '-'}
                      </Text>
                      <Text style={[styles.tableCell, row._credit > 0 && styles.creditText]}>
                        {row._credit > 0 ? fmtAmt(row._credit) : '-'}
                      </Text>
                      <Text style={[styles.tableCell, styles.balanceText]}>{fmtAmt(row._balance)}</Text>
                      <View style={[styles.tableCell, styles.actionsCell]}>
                        <TouchableOpacity onPress={() => setDeleteId(row.id)}>
                          <Icon name="trash-can-outline" size={18} color="#C62828" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}

          {rows.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Balance:</Text>
              <Text style={styles.totalValue}>{fmtAmt(totalBalance)}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Transaction filter modal */}
      <Modal visible={showTxPicker} transparent animationType="fade" onRequestClose={() => setShowTxPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowTxPicker(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Transaction</Text>
            <ScrollView>
              {TRANSACTIONS.map(t => (
                <TouchableOpacity key={t} style={styles.dropdownItem}
                  onPress={() => { setTxFilter(t); setShowTxPicker(false); }}>
                  <Text style={[styles.dropdownItemText, txFilter === t && styles.dropdownItemActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete confirm modal */}
      <Modal visible={deleteId !== null} transparent animationType="fade" onRequestClose={() => setDeleteId(null)}>
        <View style={styles.overlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Delete Entry</Text>
            <Text style={styles.confirmMsg}>Are you sure you want to delete this entry?</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteId(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
                {deleting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.deleteBtnText}>Delete</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date pickers */}
      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        date={new Date(startDate + 'T00:00:00')}
        onConfirm={d => { setStartDate(fmt(d)); setShowStartPicker(false); }}
        onCancel={() => setShowStartPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        date={new Date(endDate + 'T00:00:00')}
        onConfirm={d => { setEndDate(fmt(d)); setShowEndPicker(false); }}
        onCancel={() => setShowEndPicker(false)}
      />
    </View>
  );
};

export default G13CashLedger;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },

  topRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  topBtn: {
    backgroundColor: R, borderRadius: 6,
    paddingVertical: 9, paddingHorizontal: 14,
  },
  topBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  topBtnOutline: {
    borderWidth: 1, borderColor: '#555', borderRadius: 6,
    paddingVertical: 9, paddingHorizontal: 14,
  },
  topBtnOutlineText: { color: '#333', fontWeight: '600', fontSize: 13 },

  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  col2: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },

  quickLabel: { fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 6 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 },
  quickGroup: { fontSize: 11, color: '#888', width: 52 },
  quickBtn: {
    borderWidth: 1, borderColor: '#CCC', borderRadius: 4,
    paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#F8F8F8',
  },
  quickBtnText: { fontSize: 11, color: '#444' },

  goBtn: {
    backgroundColor: '#333', borderRadius: 6,
    alignItems: 'center', paddingVertical: 11, marginTop: 4,
  },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tableTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  exportRow: { flexDirection: 'row', gap: 6 },
  exportBtn: {
    backgroundColor: R, borderRadius: 5, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8,
  },
  exportBtnGreen: { backgroundColor: '#388E3C' },
  exportBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },

  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tableHeadRow: { backgroundColor: R },
  tableRowAlt: { backgroundColor: '#FFF8F8' },
  tableHeadCell: {
    width: 90, paddingVertical: 10, paddingHorizontal: 6,
    color: '#fff', fontWeight: '700', fontSize: 12,
  },
  tableCell: {
    width: 90, paddingVertical: 10, paddingHorizontal: 6,
    fontSize: 12, color: '#333',
  },
  wideCell: { width: 160 },
  actionsCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  debitText: { color: '#C62828', fontWeight: '600' },
  creditText: { color: '#2E7D32', fontWeight: '600' },
  balanceText: { fontWeight: '600', color: '#1A1A1A' },

  emptyText: { textAlign: 'center', color: '#888', padding: 20, fontSize: 13 },

  totalRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEE',
    gap: 8,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#444' },
  totalValue: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '72%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemActive: { color: R, fontWeight: '700' },

  confirmBox: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '80%' },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: '#555', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#CCC', borderRadius: 6, alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { fontSize: 14, color: '#444' },
  deleteBtn: { flex: 1, backgroundColor: R, borderRadius: 6, alignItems: 'center', paddingVertical: 10 },
  deleteBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
