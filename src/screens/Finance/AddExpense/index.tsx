import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  addExpenseRows, getExpenseCategories, getExpenseSubCategories, getExpensePaymentMethods,
} from '../../../api/employeeDashboard';

interface Option { id: number; name: string; }

const TRANSACTION_TYPES = ['Sales Counter', 'Office Counter', 'Bank Account', 'Personal'];

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const today = () => fmt(new Date());

interface ExpenseRow {
  id: number;
  category: Option | null;
  subCategory: Option | null;
  transactionType: string;
  amount: string;
  paymentMethod: Option | null;
  chequeNumber: string;
  date: string;
  description: string;
}

const emptyRow = (id: number): ExpenseRow => ({
  id, category: null, subCategory: null, transactionType: '', amount: '',
  paymentMethod: null, chequeNumber: '', date: today(), description: '',
});

const AddExpense = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<Option[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Option[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [rows, setRows] = useState<ExpenseRow[]>([emptyRow(1), emptyRow(2), emptyRow(3)]);
  const [nextId, setNextId] = useState(4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [activeCategoryRow, setActiveCategoryRow] = useState<number | null>(null);
  const [activeSubCategoryRow, setActiveSubCategoryRow] = useState<number | null>(null);
  const [activeTransactionRow, setActiveTransactionRow] = useState<number | null>(null);
  const [activePaymentRow, setActivePaymentRow] = useState<number | null>(null);
  const [activeDateRow, setActiveDateRow] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingLists(true);
      try {
        const [cats, subs, methods] = await Promise.all([
          getExpenseCategories(), getExpenseSubCategories(), getExpensePaymentMethods(),
        ]);
        setCategories(cats);
        setSubCategories(subs);
        setPaymentMethods(methods);
      } catch {
        setError('Failed to load categories. Pull to retry.');
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const updateRow = (id: number, patch: Partial<ExpenseRow>) => {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows(rs => [...rs, emptyRow(nextId)]);
    setNextId(n => n + 1);
  };

  const removeRow = (id: number) => {
    if (rows.length === 1) return;
    setRows(rs => rs.filter(r => r.id !== id));
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.category && r.amount && !isNaN(Number(r.amount)));
    if (validRows.length === 0) {
      setError('Please fill at least one row with Category and Amount.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addExpenseRows(validRows.map(r => ({
        branch_id: branchId,
        occurrence_date: r.date,
        amount: parseFloat(r.amount),
        category_id: r.category!.id,
        sub_category_id: r.subCategory?.id,
        transaction_type: r.transactionType || undefined,
        payment_type_id: r.paymentMethod?.id,
        cheque_number: r.paymentMethod?.name === 'Cheque' ? (r.chequeNumber || undefined) : undefined,
        description: r.description || undefined,
      })));
      flash(`${validRows.length} expense${validRows.length === 1 ? '' : 's'} submitted successfully.`);
      setRows([emptyRow(nextId)]);
      setNextId(n => n + 1);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit expenses.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Add Expense"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>Expense Manager</Text>
            <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate('Expenses')}>
              <Text style={styles.viewBtnText}>View Expenses</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>! The Fields With *Must Required Or Fill.</Text>

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          {loadingLists ? (
            <ActivityIndicator color="#C62828" style={{ marginVertical: 20 }} />
          ) : rows.map((row, idx) => (
            <View key={row.id} style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowNum}>Entry #{idx + 1}</Text>
                {rows.length > 1 && (
                  <TouchableOpacity onPress={() => removeRow(row.id)}>
                    <Icon name="close-circle" size={20} color="#C62828" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category | Subcategory */}
              <View style={styles.row2}>
                <View style={styles.col2}>
                  <Text style={styles.label}>Category *</Text>
                  <TouchableOpacity style={styles.picker} onPress={() => setActiveCategoryRow(row.id)}>
                    <Text style={row.category ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                      {row.category?.name || 'Select Option'}
                    </Text>
                    <Icon name="chevron-down" size={15} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={styles.col2}>
                  <Text style={styles.label}>Subcategory</Text>
                  <TouchableOpacity style={styles.picker} onPress={() => setActiveSubCategoryRow(row.id)}>
                    <Text style={row.subCategory ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                      {row.subCategory?.name || 'Select Option'}
                    </Text>
                    <Icon name="chevron-down" size={15} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Transaction | Amount */}
              <View style={styles.row2}>
                <View style={styles.col2}>
                  <Text style={styles.label}>Transaction</Text>
                  <TouchableOpacity style={styles.picker} onPress={() => setActiveTransactionRow(row.id)}>
                    <Text style={row.transactionType ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                      {row.transactionType || 'Select Option'}
                    </Text>
                    <Icon name="chevron-down" size={15} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={styles.col2}>
                  <Text style={styles.label}>Amount *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Amount"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    value={row.amount}
                    onChangeText={v => updateRow(row.id, { amount: v })}
                  />
                </View>
              </View>

              {/* Payment Method | Date (or Cheque Number) */}
              <View style={styles.row2}>
                <View style={styles.col2}>
                  <Text style={styles.label}>Payment Method</Text>
                  <TouchableOpacity style={styles.picker} onPress={() => setActivePaymentRow(row.id)}>
                    <Text style={row.paymentMethod ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                      {row.paymentMethod?.name || 'Select Option'}
                    </Text>
                    <Icon name="chevron-down" size={15} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={styles.col2}>
                  {row.paymentMethod?.name === 'Cheque' ? (
                    <>
                      <Text style={styles.label}>Cheque Number</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter Cheque #"
                        placeholderTextColor="#aaa"
                        value={row.chequeNumber}
                        onChangeText={v => updateRow(row.id, { chequeNumber: v })}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.label}>Date</Text>
                      <TouchableOpacity style={styles.picker} onPress={() => setActiveDateRow(row.id)}>
                        <Text style={styles.pickerText}>{display(row.date)}</Text>
                        <Icon name="calendar" size={15} color="#666" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {row.paymentMethod?.name === 'Cheque' && (
                <View style={styles.row2}>
                  <View style={styles.col2}>
                    <Text style={styles.label}>Date</Text>
                    <TouchableOpacity style={styles.picker} onPress={() => setActiveDateRow(row.id)}>
                      <Text style={styles.pickerText}>{display(row.date)}</Text>
                      <Icon name="calendar" size={15} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.col2} />
                </View>
              )}

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Description"
                placeholderTextColor="#aaa"
                value={row.description}
                onChangeText={v => updateRow(row.id, { description: v })}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
            <Icon name="plus" size={16} color="#1565C0" />
            <Text style={styles.addRowBtnText}> Add Another Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitBtnText}>Submit All Expense</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category dropdown */}
      <Modal visible={activeCategoryRow !== null} transparent animationType="fade" onRequestClose={() => setActiveCategoryRow(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setActiveCategoryRow(null)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Category</Text>
            <ScrollView>
              {categories.map(opt => (
                <TouchableOpacity key={opt.id} style={styles.dropdownItem}
                  onPress={() => { if (activeCategoryRow !== null) updateRow(activeCategoryRow, { category: opt }); setActiveCategoryRow(null); }}>
                  <Text style={styles.dropdownItemText}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Subcategory dropdown */}
      <Modal visible={activeSubCategoryRow !== null} transparent animationType="fade" onRequestClose={() => setActiveSubCategoryRow(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setActiveSubCategoryRow(null)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Subcategory</Text>
            <ScrollView>
              {subCategories.map(opt => (
                <TouchableOpacity key={opt.id} style={styles.dropdownItem}
                  onPress={() => { if (activeSubCategoryRow !== null) updateRow(activeSubCategoryRow, { subCategory: opt }); setActiveSubCategoryRow(null); }}>
                  <Text style={styles.dropdownItemText}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transaction Type dropdown */}
      <Modal visible={activeTransactionRow !== null} transparent animationType="fade" onRequestClose={() => setActiveTransactionRow(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setActiveTransactionRow(null)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Transaction</Text>
            {TRANSACTION_TYPES.map(t => (
              <TouchableOpacity key={t} style={styles.dropdownItem}
                onPress={() => { if (activeTransactionRow !== null) updateRow(activeTransactionRow, { transactionType: t }); setActiveTransactionRow(null); }}>
                <Text style={styles.dropdownItemText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Method dropdown */}
      <Modal visible={activePaymentRow !== null} transparent animationType="fade" onRequestClose={() => setActivePaymentRow(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setActivePaymentRow(null)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Payment Method</Text>
            {paymentMethods.map(opt => (
              <TouchableOpacity key={opt.id} style={styles.dropdownItem}
                onPress={() => { if (activePaymentRow !== null) updateRow(activePaymentRow, { paymentMethod: opt }); setActivePaymentRow(null); }}>
                <Text style={styles.dropdownItemText}>{opt.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date picker */}
      <DateTimePickerModal
        isVisible={activeDateRow !== null}
        mode="date"
        date={new Date((rows.find(r => r.id === activeDateRow)?.date ?? today()) + 'T00:00:00')}
        onConfirm={d => {
          if (activeDateRow !== null) updateRow(activeDateRow, { date: fmt(d) });
          setActiveDateRow(null);
        }}
        onCancel={() => setActiveDateRow(null)}
      />
    </View>
  );
};

export default AddExpense;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  viewBtn: {
    borderWidth: 1, borderColor: '#555', borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  viewBtnText: { fontSize: 13, color: '#333', fontWeight: '600' },
  hint: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 14 },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  successText: { color: '#2E7D32', fontSize: 13, marginBottom: 8, fontWeight: '500' },

  rowCard: {
    borderWidth: 1, borderColor: '#EEE', borderRadius: 8,
    padding: 12, marginBottom: 12, backgroundColor: '#FAFAFA',
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowNum: { fontSize: 13, fontWeight: '700', color: '#333' },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col2: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: '#222', backgroundColor: '#fff',
  },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#fff',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },

  addRowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#1565C0', borderRadius: 6,
    paddingVertical: 10, marginBottom: 14, borderStyle: 'dashed',
  },
  addRowBtnText: { color: '#1565C0', fontWeight: '600', fontSize: 13 },

  submitBtn: {
    backgroundColor: R, borderRadius: 6,
    alignItems: 'center', paddingVertical: 13,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '75%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
