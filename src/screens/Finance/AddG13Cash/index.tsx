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
import { addG13Entry } from '../../../api/employeeDashboard';

const TYPES = ['Credit', 'Debit'];
const TRANSACTIONS = [
  'Bank Account', 'Sales Counter', 'Office Counter',
  'Personal', 'G13', 'Mr Arif', 'Mr Waqas Credit Card',
];
const BANK_ACCOUNTS = ['Bank AL Habib 0285-0981-006754-01-2'];

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const today = () => fmt(new Date());

const AddG13Cash = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? 'Branch';

  const [amount, setAmount] = useState('');
  const [type, setType] = useState('');
  const [transaction, setTransaction] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showTransactionPicker, setShowTransactionPicker] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const handleAdd = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Amount is required and must be a positive number.');
      return;
    }
    if (!type) { setError('Please select a Type.'); return; }
    if (!transaction) { setError('Please select a Transaction.'); return; }
    setError('');
    setSaving(true);
    try {
      await addG13Entry({
        branch_id: branchId,
        amount: parseFloat(amount),
        type,
        transaction_type: transaction,
        date,
        description: description.trim() || undefined,
        bank_details: bankDetails.trim() || undefined,
      });
      flash('G-13 cash entry added successfully.');
      setAmount('');
      setType('');
      setTransaction('');
      setBankDetails('');
      setDescription('');
      setDate(today());
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to add entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Add G-13 Cash"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>Add G-13 Cash</Text>
            <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate('G13CashLedger')}>
              <Text style={styles.viewBtnText}>View Ledger</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>! The Fields With *Must Required Or Fill.</Text>

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          {/* Row 1: Branch | Amount */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Branch Name*</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
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
              />
            </View>
          </View>

          {/* Row 2: Type | Transaction */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Type*</Text>
              <TouchableOpacity
                style={[styles.picker, !type && styles.pickerError]}
                onPress={() => setShowTypePicker(true)}
              >
                <Text style={type ? styles.pickerText : styles.placeholder}>
                  {type || 'Select Type'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Transaction*</Text>
              <TouchableOpacity
                style={[styles.picker, !transaction && styles.pickerError]}
                onPress={() => setShowTransactionPicker(true)}
              >
                <Text style={transaction ? styles.pickerText : styles.placeholder}>
                  {transaction || 'Select Transaction'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 3: Bank Details (only for Bank Account) | Date */}
          <View style={styles.row2}>
            {transaction === 'Bank Account' ? (
              <View style={styles.col2}>
                <Text style={styles.label}>Bank Details*</Text>
                <TouchableOpacity style={styles.picker} onPress={() => setShowBankPicker(true)}>
                  <Text style={bankDetails ? styles.pickerText : styles.placeholder}>
                    {bankDetails || 'Select Bank'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.col2} />
            )}
            <View style={styles.col2}>
              <Text style={styles.label}>Date*</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.pickerText}>{display(date)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputArea]}
            placeholder="Enter Description"
            placeholderTextColor="#aaa"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={[styles.addBtn, saving && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.addBtnText}>Add</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Type Modal */}
      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Type</Text>
            {TYPES.map(t => (
              <TouchableOpacity key={t} style={styles.dropdownItem}
                onPress={() => { setType(t); setShowTypePicker(false); }}>
                <Text style={[styles.dropdownItemText, type === t && styles.dropdownItemActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bank Account Modal */}
      <Modal visible={showBankPicker} transparent animationType="fade" onRequestClose={() => setShowBankPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowBankPicker(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Bank</Text>
            {BANK_ACCOUNTS.map(b => (
              <TouchableOpacity key={b} style={styles.dropdownItem}
                onPress={() => { setBankDetails(b); setShowBankPicker(false); }}>
                <Text style={[styles.dropdownItemText, bankDetails === b && styles.dropdownItemActive]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transaction Modal */}
      <Modal visible={showTransactionPicker} transparent animationType="fade" onRequestClose={() => setShowTransactionPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowTransactionPicker(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Transaction</Text>
            <ScrollView>
              {TRANSACTIONS.map(t => (
                <TouchableOpacity key={t} style={styles.dropdownItem}
                  onPress={() => {
                    setTransaction(t);
                    if (t !== 'Bank Account') setBankDetails('');
                    setShowTransactionPicker(false);
                  }}>
                  <Text style={[styles.dropdownItemText, transaction === t && styles.dropdownItemActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker */}
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

export default AddG13Cash;

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
  viewBtn: {
    borderWidth: 1, borderColor: '#555', borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  viewBtnText: { fontSize: 13, color: '#333', fontWeight: '600' },
  hint: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 14 },
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
  inputArea: { minHeight: 70, textAlignVertical: 'top', marginBottom: 14 },
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
  pickerError: { borderColor: '#e57373' },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },

  addBtn: { backgroundColor: R, borderRadius: 6, alignItems: 'center', paddingVertical: 12 },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '72%', maxHeight: 380 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemActive: { color: R, fontWeight: '700' },
});
