import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import { addOfficeCashEntry } from '../../../api/employeeDashboard';

// Submission is intentionally disabled for now — see hint text below.
// addOfficeCashEntry() is wired and ready; flip ADD_ENABLED once confirmed.
const ADD_ENABLED = false;

const TYPES = ['Credit', 'Debit'];
const RESOURCES = ['Bank Account', 'Others', 'Office Counter', 'Personal', 'Sales Counter', 'G13'];

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
const today = () => fmt(new Date());

const AddOfficeCash = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchId, branchName, select: selectBranch,
  } = useBranchSelector();

  const [amount, setAmount] = useState('');
  const [type, setType] = useState('');
  const [resource, setResource] = useState('');
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [addToPettyCash, setAddToPettyCash] = useState(false);

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const handleAdd = async () => {
    if (!ADD_ENABLED) return;
    if (branchId == null) { setError('Please select a branch.'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Amount is required and must be a positive number.');
      return;
    }
    if (!type) {
      setError('Please select a Type.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addOfficeCashEntry({
        branch_id: branchId,
        amount: parseFloat(amount),
        type: type as 'Credit' | 'Debit',
        resource: resource || undefined,
        date,
        description: description.trim() || undefined,
        is_petty_cash: addToPettyCash ? 1 : 0,
      });
      flash('Office cash entry added successfully.');
      setAmount(''); setType(''); setResource(''); setDate(today()); setDescription(''); setAddToPettyCash(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : (msg ? Object.values(msg).flat().join(' ') : 'Failed to add entry.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Add Office Cash"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>Add Office Cash</Text>
            <TouchableOpacity style={styles.viewLedgerBtn} onPress={() => navigation.navigate('ViewOfficeLedger')}>
              <Icon name="book-open-variant" size={14} color="#fff" />
              <Text style={styles.viewLedgerBtnText}> View Ledger</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>! The Fields With *Must Required Or Fill.</Text>
          {!ADD_ENABLED && (
            <Text style={styles.disabledNote}>
              Adding entries is temporarily disabled while the API contract is confirmed. The form below is ready to go.
            </Text>
          )}

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          {/* Row 1: Branch | Amount */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <BranchField
                label="Branch Name*"
                needsPicker={needsPicker}
                branchName={branchName}
                options={branchOptions}
                loadingOptions={loadingBranches}
                onSelect={selectBranch}
                labelStyle={styles.label}
                staticStyle={styles.staticInput}
                staticTextStyle={styles.staticText}
                pickerStyle={styles.picker}
                pickerTextStyle={styles.pickerText}
                placeholderStyle={styles.placeholder}
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Amount*</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Amount"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                editable={ADD_ENABLED}
              />
            </View>
          </View>

          {/* Row 2: Type | Resource */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Type*</Text>
              <TouchableOpacity
                style={[styles.picker, !type && styles.pickerError]}
                onPress={() => ADD_ENABLED && setShowTypePicker(true)}
              >
                <Text style={type ? styles.pickerText : styles.placeholder}>
                  {type || 'Select Type'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Resource*</Text>
              <TouchableOpacity style={styles.picker} onPress={() => ADD_ENABLED && setShowResourcePicker(true)}>
                <Text style={resource ? styles.pickerText : styles.placeholder}>
                  {resource || 'Select Resource'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 3: Date | Description */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => ADD_ENABLED && setShowDatePicker(true)}>
                <Text style={styles.pickerText}>{display(date)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Description"
                placeholderTextColor="#aaa"
                value={description}
                onChangeText={setDescription}
                editable={ADD_ENABLED}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => ADD_ENABLED && setAddToPettyCash(v => !v)}
          >
            <View style={[styles.checkbox, addToPettyCash && styles.checkboxChecked]}>
              {addToPettyCash && <Icon name="check" size={13} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Add to petty cash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, (saving || !ADD_ENABLED) && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={saving || !ADD_ENABLED}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.addBtnText}>Add</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Type picker modal */}
      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Type</Text>
            {TYPES.map(t => (
              <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setType(t); setShowTypePicker(false); }}>
                <Text style={[styles.dropdownItemText, type === t && styles.dropdownItemActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Resource picker modal */}
      <Modal visible={showResourcePicker} transparent animationType="fade" onRequestClose={() => setShowResourcePicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowResourcePicker(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Resource</Text>
            {RESOURCES.map(r => (
              <TouchableOpacity key={r} style={styles.dropdownItem} onPress={() => { setResource(r); setShowResourcePicker(false); }}>
                <Text style={[styles.dropdownItemText, resource === r && styles.dropdownItemActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date picker */}
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

export default AddOfficeCash;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  viewLedgerBtn: {
    backgroundColor: '#555', borderRadius: 6, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12,
  },
  viewLedgerBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  hint: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  disabledNote: {
    fontSize: 12, color: '#E65100', backgroundColor: '#FFF3E0',
    borderRadius: 6, padding: 10, marginBottom: 14, fontWeight: '500',
  },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  successText: { color: '#2E7D32', fontSize: 13, marginBottom: 8, fontWeight: '500' },

  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  col2: { flex: 1 },

  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 13, color: '#222', backgroundColor: '#FAFAFA',
  },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 11, backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 11, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerError: { borderColor: R },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: R,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: R },
  checkboxLabel: { fontSize: 13, color: '#333' },

  addBtn: {
    backgroundColor: R, borderRadius: 6, alignItems: 'center',
    paddingVertical: 12, marginTop: 4,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '75%', maxHeight: 420 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemActive: { color: R, fontWeight: '700' },
});
