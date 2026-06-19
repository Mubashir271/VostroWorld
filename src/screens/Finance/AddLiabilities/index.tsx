import React, { useState } from 'react';
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
import { addLiability } from '../../../api/employeeDashboard';

const CATEGORIES = ['Credit Card', 'Current Liability', 'General', 'Taxes'];

const SUBCATEGORIES: Record<string, string[]> = {
  'Credit Card':        ['Visa', 'MasterCard', 'Amex', 'Other'],
  'Current Liability':  ['Short Term Loan', 'Payable', 'Other'],
  'General':            ['Other'],
  'Taxes':              ['Income Tax', 'GST', 'Other'],
};

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const today = () => fmt(new Date());

interface LiabilityRow {
  id: number;
  category: string;
  subCategory: string;
  creditorName: string;
  creditorContact: string;
  amount: string;
  description: string;
  dueDate: string;
}

const emptyRow = (id: number): LiabilityRow => ({
  id, category: '', subCategory: '', creditorName: '',
  creditorContact: '', amount: '', description: '', dueDate: today(),
});

const AddLiabilities = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [rows, setRows] = useState<LiabilityRow[]>([emptyRow(1), emptyRow(2), emptyRow(3)]);
  const [nextId, setNextId] = useState(4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState<{ rowId: number; field: 'category' | 'subCategory' } | null>(null);
  const [activeDateRow, setActiveDateRow] = useState<number | null>(null);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const updateRow = (id: number, field: keyof LiabilityRow, value: string) => {
    setRows(rs => rs.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'category') updated.subCategory = '';
      return updated;
    }));
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
      await Promise.all(validRows.map(r =>
        addLiability({
          branch_id: branchId,
          category: r.category,
          sub_category: r.subCategory || undefined,
          creditor_name: r.creditorName || undefined,
          creditor_contact: r.creditorContact || undefined,
          amount: parseFloat(r.amount),
          description: r.description || undefined,
          due_date: r.dueDate,
        })
      ));
      flash(`${validRows.length} liabilit${validRows.length === 1 ? 'y' : 'ies'} submitted successfully.`);
      setRows([emptyRow(nextId)]);
      setNextId(n => n + 1);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit liabilities.');
    } finally {
      setSaving(false);
    }
  };

  const dropdownOptions = activeDropdown?.field === 'category'
    ? CATEGORIES
    : SUBCATEGORIES[rows.find(r => r.id === activeDropdown?.rowId)?.category ?? ''] ?? [];

  return (
    <View style={styles.root}>
      <AppHeader
        title="Add Liabilities"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>Liabilities Management</Text>
            <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate('ViewLiabilitiesLedger')}>
              <Text style={styles.viewBtnText}>View Liabilities</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>! The Fields With *Must Required Or Fill.</Text>

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          {rows.map((row, idx) => (
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
                  <TouchableOpacity
                    style={styles.picker}
                    onPress={() => setActiveDropdown({ rowId: row.id, field: 'category' })}
                  >
                    <Text style={row.category ? styles.pickerText : styles.placeholder}>
                      {row.category || 'Select Option'}
                    </Text>
                    <Icon name="chevron-down" size={15} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={styles.col2}>
                  <Text style={styles.label}>Subcategory</Text>
                  <TouchableOpacity
                    style={[styles.picker, !row.category && styles.pickerDisabled]}
                    onPress={() => row.category && setActiveDropdown({ rowId: row.id, field: 'subCategory' })}
                  >
                    <Text style={row.subCategory ? styles.pickerText : styles.placeholder}>
                      {row.subCategory || 'Select Option'}
                    </Text>
                    <Icon name="chevron-down" size={15} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Creditor Name | Creditor Contact */}
              <View style={styles.row2}>
                <View style={styles.col2}>
                  <Text style={styles.label}>Creditor Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Name"
                    placeholderTextColor="#aaa"
                    value={row.creditorName}
                    onChangeText={v => updateRow(row.id, 'creditorName', v)}
                  />
                </View>
                <View style={styles.col2}>
                  <Text style={styles.label}>Creditor Contact</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g 92xxxxxxxxxxx"
                    placeholderTextColor="#aaa"
                    keyboardType="phone-pad"
                    value={row.creditorContact}
                    onChangeText={v => updateRow(row.id, 'creditorContact', v)}
                  />
                </View>
              </View>

              {/* Amount | Due Date */}
              <View style={styles.row2}>
                <View style={styles.col2}>
                  <Text style={styles.label}>Amount *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Amount"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    value={row.amount}
                    onChangeText={v => updateRow(row.id, 'amount', v)}
                  />
                </View>
                <View style={styles.col2}>
                  <Text style={styles.label}>Due Date</Text>
                  <TouchableOpacity style={styles.picker} onPress={() => setActiveDateRow(row.id)}>
                    <Text style={styles.pickerText}>{display(row.dueDate)}</Text>
                    <Icon name="calendar" size={15} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Description"
                placeholderTextColor="#aaa"
                value={row.description}
                onChangeText={v => updateRow(row.id, 'description', v)}
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
              : <Text style={styles.submitBtnText}>Submit All Liabilities</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category / Subcategory dropdown */}
      <Modal
        visible={!!activeDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setActiveDropdown(null)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>
              {activeDropdown?.field === 'category' ? 'Select Category' : 'Select Subcategory'}
            </Text>
            <ScrollView>
              {dropdownOptions.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={styles.dropdownItem}
                  onPress={() => {
                    if (activeDropdown) updateRow(activeDropdown.rowId, activeDropdown.field, opt);
                    setActiveDropdown(null);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date picker */}
      <DateTimePickerModal
        isVisible={activeDateRow !== null}
        mode="date"
        date={new Date((rows.find(r => r.id === activeDateRow)?.dueDate ?? today()) + 'T00:00:00')}
        onConfirm={d => {
          if (activeDateRow !== null) updateRow(activeDateRow, 'dueDate', fmt(d));
          setActiveDateRow(null);
        }}
        onCancel={() => setActiveDateRow(null)}
      />
    </View>
  );
};

export default AddLiabilities;

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
  pickerDisabled: { opacity: 0.5 },
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
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '75%', maxHeight: 350 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
