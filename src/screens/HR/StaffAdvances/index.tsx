import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  getHRStaffFines,
  addStaffAdvance,
  getStaffNamesForBranch,
  getExpensePaymentMethods,
  getBankingDetailsListing,
} from '../../../api/employeeDashboard';

// addStaffAdvance's write contract is NOT confirmed — see the function's
// comment in employeeDashboard.ts. Gated off until a real submit is
// captured in a HAR, same pattern as AddStaff/StaffPromotion.
const ADD_ENABLED = false;

const PAGE_SIZE = 25;

interface Option { id: number; name: string; }
interface StaffOption { id: number; first_name: string; last_name: string; }
interface BankOption { id: number; bank_name: string; account_no: string; }

interface AdvanceRecord {
  id: number;
  user_fname?: string;
  user_lname?: string;
  amount: number;
  return_month?: string;
  transaction_type?: string;
  payment_method?: string | null;
  reason?: string;
  occurrence_date?: string;
}

// Reused from the confirmed G13 Cash Ledger transaction_type enum — the
// screenshot only confirmed 3 of these (Bank Account, Sales Counter,
// Personal) for this specific page; the rest are a best-guess reuse.
const TRANSACTION_TYPES = ['Bank Account', 'G13', 'Mr Arif', 'Mr Waqas Credit Card', 'Office Counter', 'Personal', 'Sales Counter'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const fmtDate = (s?: string) => {
  if (!s) return '-';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d || ''}/${m || ''}/${y || ''}`;
};

const EMPTY_FORM = {
  advanceDate: today(),
  staffId: '', staffName: '',
  amount: '',
  returnMonth: '',
  transactionType: '',
  paymentMethod: '',
  bankId: '', bankName: '',
  reason: '',
};

const StaffAdvances = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [records, setRecords] = useState<AdvanceRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Option[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);

  const [fromDate, setFromDate] = useState(firstOfMonth());
  const [toDate, setToDate] = useState(today());

  const [showDatePicker, setShowDatePicker] = useState<'advanceDate' | 'from' | 'to' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const [staffModal, setStaffModal] = useState(false);
  const [monthModal, setMonthModal] = useState(false);
  const [transactionModal, setTransactionModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [bankModal, setBankModal] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await getHRStaffFines({
        branch_id: branchId, category: 'Advance',
        start_date: fromDate, end_date: toDate,
        limit: PAGE_SIZE, page: pageNum,
      });
      const rows: AdvanceRecord[] = res?.data?.data ?? [];
      setRecords(Array.isArray(rows) ? rows : []);
      setTotalPages(res?.data?.last_page ?? 1);
      setPage(pageNum);
    } catch {
      setRecords([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [branchId, fromDate, toDate]);

  const loadStaff = useCallback(async () => {
    try {
      const res = await getStaffNamesForBranch({ branch_id: branchId });
      const list: StaffOption[] = res?.data ?? [];
      setStaffList(Array.isArray(list) ? list : []);
    } catch {}
  }, [branchId]);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const list = await getExpensePaymentMethods();
      setPaymentMethods(Array.isArray(list) ? list : []);
    } catch {}
  }, []);

  const loadBanks = useCallback(async () => {
    try {
      const res = await getBankingDetailsListing({ branch_id: branchId });
      const list: BankOption[] = res?.data ?? [];
      setBanks(Array.isArray(list) ? list : []);
    } catch {}
  }, [branchId]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { loadStaff(); loadPaymentMethods(); loadBanks(); }, [loadStaff, loadPaymentMethods, loadBanks]);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const resetForm = () => setForm({ ...EMPTY_FORM });

  const handleSave = async () => {
    if (!ADD_ENABLED) return;
    if (!form.staffId) { setError('Please select a staff member.'); return; }
    if (!form.amount.trim()) { setError('Amount is required.'); return; }
    if (!form.returnMonth) { setError('Return Month is required.'); return; }
    if (!form.transactionType) { setError('Transaction is required.'); return; }
    if (!form.paymentMethod) { setError('Payment Method is required.'); return; }
    if (form.transactionType === 'Bank Account' && !form.bankId) { setError('Bank Details is required.'); return; }
    if (!form.reason.trim()) { setError('Reason is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await addStaffAdvance({
        branch_id: branchId,
        user_id: parseInt(form.staffId, 10),
        amount: parseFloat(form.amount),
        return_month: form.returnMonth,
        transaction_type: form.transactionType,
        payment_method: form.paymentMethod,
        bank_id: form.bankId ? parseInt(form.bankId, 10) : undefined,
        reason: form.reason.trim(),
        occurrence_date: form.advanceDate,
        category: 'Advance',
      });
      flash('Advance added successfully.');
      resetForm();
      load(1);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : (msg ? Object.values(msg).flat().join(' ') : 'Failed to add advance.'));
    } finally {
      setSaving(false);
    }
  };

  const openDatePicker = (which: 'advanceDate' | 'from' | 'to') => {
    setPickerDate(new Date(which === 'advanceDate' ? form.advanceDate : which === 'from' ? fromDate : toDate));
    setShowDatePicker(which);
  };
  const onDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(null);
    if (selected && showDatePicker) {
      const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
      if (showDatePicker === 'advanceDate') setForm(f => ({ ...f, advanceDate: iso }));
      else if (showDatePicker === 'from') setFromDate(iso);
      else setToDate(iso);
      setPickerDate(selected);
    }
  };

  const grandTotal = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <View style={styles.root}>
      <AppHeader
        title="Manage Staff Advances"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manage Staff Advances</Text>
          <Text style={styles.hint}>! The Fields With *Must Required Or Fill.</Text>
          {!ADD_ENABLED && (
            <Text style={styles.disabledNote}>
              Adding advances is temporarily disabled while the API contract is confirmed — no submit has been captured yet. The form below is ready to go once confirmed (see PROJECT_STATUS.md).
            </Text>
          )}
          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          <View style={styles.row3}>
            <Field label="Advance Date" required>
              <TouchableOpacity style={styles.picker} onPress={() => openDatePicker('advanceDate')}>
                <Text style={styles.pickerText}>{fmtDate(form.advanceDate)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            <Field label="Name" required>
              <TouchableOpacity style={styles.picker} onPress={() => setStaffModal(true)}>
                <Text style={form.staffName ? styles.pickerText : styles.placeholder}>{form.staffName || 'Select Names'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            <Field label="Amount" required>
              <TextInput style={styles.input} placeholder="Amount" placeholderTextColor="#aaa" keyboardType="numeric"
                value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} />
            </Field>
          </View>

          <View style={styles.row3}>
            <Field label="Return Month" required>
              <TouchableOpacity style={styles.picker} onPress={() => setMonthModal(true)}>
                <Text style={form.returnMonth ? styles.pickerText : styles.placeholder}>{form.returnMonth || 'Select Month'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            <Field label="Transaction" required>
              <TouchableOpacity style={styles.picker} onPress={() => setTransactionModal(true)}>
                <Text style={form.transactionType ? styles.pickerText : styles.placeholder}>{form.transactionType || 'Select Transaction'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            {form.transactionType === 'Bank Account' ? (
              <Field label="Bank Details" required>
                <TouchableOpacity style={styles.picker} onPress={() => setBankModal(true)}>
                  <Text style={form.bankName ? styles.pickerText : styles.placeholder}>{form.bankName || 'Select Bank'}</Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </Field>
            ) : (
              <Field label="Payment Method" required>
                <TouchableOpacity style={styles.picker} onPress={() => setPaymentModal(true)}>
                  <Text style={form.paymentMethod ? styles.pickerText : styles.placeholder}>{form.paymentMethod || 'Select Payment Method'}</Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </Field>
            )}
          </View>

          <View style={styles.row3}>
            {form.transactionType === 'Bank Account' && (
              <Field label="Payment Method" required>
                <TouchableOpacity style={styles.picker} onPress={() => setPaymentModal(true)}>
                  <Text style={form.paymentMethod ? styles.pickerText : styles.placeholder}>{form.paymentMethod || 'Select Payment Method'}</Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </Field>
            )}
            <Field label="Reason" required>
              <TextInput style={styles.input} placeholder="N/A" placeholderTextColor="#aaa"
                value={form.reason} onChangeText={v => setForm(f => ({ ...f, reason: v }))} />
            </Field>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.saveBtn, (saving || !ADD_ENABLED) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || !ADD_ENABLED}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Add Advance</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Advances table ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Advances</Text>

          <View style={styles.row3}>
            <Field label="From">
              <TouchableOpacity style={styles.picker} onPress={() => openDatePicker('from')}>
                <Text style={styles.pickerText}>{fmtDate(fromDate)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            <Field label="To">
              <TouchableOpacity style={styles.picker} onPress={() => openDatePicker('to')}>
                <Text style={styles.pickerText}>{fmtDate(toDate)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            <View style={styles.col3}>
              <Text style={styles.label}> </Text>
              <TouchableOpacity style={styles.generateBtn} onPress={() => load(1)}>
                <Text style={styles.generateBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading
            ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
            : records.length === 0
              ? <Text style={styles.emptyText}>No Record Found</Text>
              : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: 800 }}>
                      <View style={styles.thead}>
                        {['#', 'Name', 'Amount', 'Return Month', 'Transaction', 'Payment', 'Reason', 'Date'].map(h => (
                          <Text key={h} style={[styles.th, { width: h === 'Name' ? 140 : h === 'Reason' ? 140 : 100 }]}>{h}</Text>
                        ))}
                      </View>
                      {records.map((rec, i) => (
                        <View key={rec.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: 100 }]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                          <Text style={[styles.td, { width: 140, textAlign: 'left' }]}>{`${rec.user_fname ?? ''} ${rec.user_lname ?? ''}`.trim() || '-'}</Text>
                          <Text style={[styles.td, { width: 100 }]}>{`Rs ${Number(rec.amount || 0).toLocaleString()}`}</Text>
                          <Text style={[styles.td, { width: 100 }]}>{rec.return_month ?? '-'}</Text>
                          <Text style={[styles.td, { width: 100 }]}>{rec.transaction_type ?? '-'}</Text>
                          <Text style={[styles.td, { width: 100 }]}>{rec.payment_method ?? '-'}</Text>
                          <Text style={[styles.td, { width: 140 }]}>{rec.reason ?? '-'}</Text>
                          <Text style={[styles.td, { width: 100 }]}>{fmtDate(rec.occurrence_date)}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  {totalPages > 1 && (
                    <View style={styles.pagination}>
                      <TouchableOpacity disabled={page <= 1} onPress={() => load(page - 1)} style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}>
                        <Icon name="chevron-left" size={18} color={page <= 1 ? '#ccc' : '#C62828'} />
                      </TouchableOpacity>
                      <Text style={styles.pageText}>Page {page} of {totalPages}</Text>
                      <TouchableOpacity disabled={page >= totalPages} onPress={() => load(page + 1)} style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}>
                        <Icon name="chevron-right" size={18} color={page >= totalPages ? '#ccc' : '#C62828'} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.grandTotal}>Grand Total: Rs {grandTotal.toLocaleString()}/-</Text>
                </>
              )
          }
        </View>
      </ScrollView>

      {!!showDatePicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
      {Platform.OS === 'ios' && !!showDatePicker && (
        <TouchableOpacity style={styles.iosDone} onPress={() => setShowDatePicker(null)}>
          <Text style={styles.iosDoneText}>Done</Text>
        </TouchableOpacity>
      )}

      {/* Staff dropdown */}
      <Modal visible={staffModal} transparent animationType="fade" onRequestClose={() => setStaffModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStaffModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Staff</Text>
            <ScrollView>
              {staffList.map(s => (
                <TouchableOpacity key={s.id} style={styles.dropdownItem}
                  onPress={() => { setForm(f => ({ ...f, staffId: String(s.id), staffName: `${s.first_name} ${s.last_name}` })); setStaffModal(false); }}>
                  <Text style={styles.dropdownItemText}>{s.first_name} {s.last_name}</Text>
                </TouchableOpacity>
              ))}
              {staffList.length === 0 && <Text style={styles.emptyText}>No staff found.</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Return Month dropdown */}
      <Modal visible={monthModal} transparent animationType="fade" onRequestClose={() => setMonthModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMonthModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Month</Text>
            <ScrollView>
              {MONTHS.map(m => (
                <TouchableOpacity key={m} style={styles.dropdownItem}
                  onPress={() => { setForm(f => ({ ...f, returnMonth: m })); setMonthModal(false); }}>
                  <Text style={[styles.dropdownItemText, form.returnMonth === m && styles.dropdownItemActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transaction dropdown */}
      <Modal visible={transactionModal} transparent animationType="fade" onRequestClose={() => setTransactionModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTransactionModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Transaction</Text>
            {TRANSACTION_TYPES.map(t => (
              <TouchableOpacity key={t} style={styles.dropdownItem}
                onPress={() => { setForm(f => ({ ...f, transactionType: t, bankId: '', bankName: '' })); setTransactionModal(false); }}>
                <Text style={[styles.dropdownItemText, form.transactionType === t && styles.dropdownItemActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Method dropdown */}
      <Modal visible={paymentModal} transparent animationType="fade" onRequestClose={() => setPaymentModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPaymentModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Payment Method</Text>
            <ScrollView>
              {paymentMethods.map(p => (
                <TouchableOpacity key={p.id} style={styles.dropdownItem}
                  onPress={() => { setForm(f => ({ ...f, paymentMethod: p.name })); setPaymentModal(false); }}>
                  <Text style={styles.dropdownItemText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bank Details dropdown */}
      <Modal visible={bankModal} transparent animationType="fade" onRequestClose={() => setBankModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBankModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Bank</Text>
            <ScrollView>
              {banks.map(b => (
                <TouchableOpacity key={b.id} style={styles.dropdownItem}
                  onPress={() => { setForm(f => ({ ...f, bankId: String(b.id), bankName: `${b.bank_name} (${b.account_no})` })); setBankModal(false); }}>
                  <Text style={styles.dropdownItemText}>{b.bank_name} ({b.account_no})</Text>
                </TouchableOpacity>
              ))}
              {banks.length === 0 && <Text style={styles.emptyText}>No banks found.</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <View style={styles.col3}>
    <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
    {children}
  </View>
);

export default StaffAdvances;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  hint: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  disabledNote: {
    fontSize: 12, color: '#E65100', backgroundColor: '#FFF3E0',
    borderRadius: 6, padding: 10, marginBottom: 14, fontWeight: '500',
  },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  successText: { color: '#2E7D32', fontSize: 13, marginBottom: 8, fontWeight: '500' },

  row3: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col3: { flex: 1 },

  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 11, color: '#222', backgroundColor: '#FAFAFA',
  },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#FAFAFA', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 11, color: '#222', flex: 1 },
  placeholder: { fontSize: 11, color: '#aaa', flex: 1 },

  generateBtn: { backgroundColor: '#1A1A1A', borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  saveBtn: { backgroundColor: R, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 22 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 6, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 6, textAlign: 'center', alignSelf: 'center' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 },
  pageBtn: { padding: 6, borderRadius: 6, backgroundColor: '#FFF0F0' },
  pageBtnDisabled: { backgroundColor: '#F5F5F5' },
  pageText: { fontSize: 13, color: '#444', fontWeight: '600' },

  grandTotal: { textAlign: 'right', fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemActive: { color: R, fontWeight: '700' },

  iosDone: {
    position: 'absolute', bottom: 0, right: 0, left: 0,
    backgroundColor: '#fff', padding: 14, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#EEE',
  },
  iosDoneText: { color: R, fontWeight: '700', fontSize: 15 },
});
