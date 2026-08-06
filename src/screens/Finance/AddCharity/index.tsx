import React, { useState, useEffect, useCallback } from 'react';
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
import { addCharityEntry, getCharityBalance } from '../../../api/employeeDashboard';

const TYPES = ['Credit', 'Debit', 'Transfer'];
const PEOPLE = ['Faisal', 'Waqas'];

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
const Rs = (n: any) => {
  const v = parseFloat(n) || 0;
  return v.toLocaleString();
};

const AddCharity = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const branchName = profile?.branchName ?? 'Branch';

  const [amount, setAmount] = useState('');
  const [type, setType] = useState('');
  const [person, setPerson] = useState('');
  const [fromPerson, setFromPerson] = useState('');
  const [toPerson, setToPerson] = useState('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showPersonPicker, setShowPersonPicker] = useState<'person' | 'from' | 'to' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [balances, setBalances] = useState<{ f: number; w: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const loadBalances = useCallback(async () => {
    try {
      const res = await getCharityBalance(branchId);
      setBalances({
        f: parseFloat(res?.f_cash_balance ?? 0) || 0,
        w: parseFloat(res?.w_cash_balance ?? 0) || 0,
        total: parseFloat(res?.total_charity ?? 0) || 0,
      });
    } catch {
      setBalances(null);
    }
  }, [branchId]);

  useEffect(() => { loadBalances(); }, [loadBalances]);

  const resetForm = () => {
    setAmount(''); setType(''); setPerson(''); setFromPerson(''); setToPerson('');
    setDate(today()); setNotes('');
  };

  const handleAdd = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Amount is required and must be a positive number.');
      return;
    }
    if (!type) {
      setError('Please select a Transaction Type.');
      return;
    }
    if (type === 'Transfer') {
      if (!fromPerson || !toPerson) {
        setError('Please select both From Person and To Person.');
        return;
      }
    } else if (!person) {
      setError('Please select a Person.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addCharityEntry({
        branch_id: branchId,
        date,
        type: type as 'Credit' | 'Debit' | 'Transfer',
        amount: parseFloat(amount),
        ...(type === 'Transfer'
          ? { from_person: fromPerson as 'Faisal' | 'Waqas', to_person: toPerson as 'Faisal' | 'Waqas' }
          : { person: person as 'Faisal' | 'Waqas' }),
        notes: notes.trim() || undefined,
      });
      flash('Charity transaction added successfully.');
      resetForm();
      loadBalances();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : (msg ? Object.values(msg).flat().join(' ') : 'Failed to add transaction.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Add Charity Transaction"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>Add Charity Transaction</Text>
            <TouchableOpacity style={styles.viewLedgerBtn} onPress={() => navigation.navigate('ViewCharityLedger')}>
              <Icon name="book-open-variant" size={14} color="#fff" />
              <Text style={styles.viewLedgerBtnText}> View Ledger</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>! The Fields With *Must Be Filled.</Text>

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          {balances && (
            <View style={styles.balanceBox}>
              <Text style={styles.balanceTitle}>Current Balances (Till Today)</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceItem}>Faisal: <Text style={styles.balanceValue}>Rs {Rs(balances.f)}/-</Text></Text>
                <Text style={styles.balanceItem}>Waqas: <Text style={styles.balanceValue}>Rs {Rs(balances.w)}/-</Text></Text>
              </View>
              <Text style={[styles.balanceItem, { marginTop: 4 }]}>Total Charity: <Text style={styles.balanceValue}>Rs {Rs(balances.total)}/-</Text></Text>
            </View>
          )}

          {/* Row 1: Branch | Date */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Branch Name*</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.pickerText}>{display(date)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Transaction Type | Amount */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Transaction Type*</Text>
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

          {/* Row 3: Person (Credit/Debit) OR From/To (Transfer) */}
          {type === 'Transfer' ? (
            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={styles.label}>From Person*</Text>
                <TouchableOpacity style={styles.picker} onPress={() => setShowPersonPicker('from')}>
                  <Text style={fromPerson ? styles.pickerText : styles.placeholder}>
                    {fromPerson || 'Select Person'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>To Person*</Text>
                <TouchableOpacity style={styles.picker} onPress={() => setShowPersonPicker('to')}>
                  <Text style={toPerson ? styles.pickerText : styles.placeholder}>
                    {toPerson || 'Select Person'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.fullRow}>
              <Text style={styles.label}>Person*</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowPersonPicker('person')}>
                <Text style={person ? styles.pickerText : styles.placeholder}>
                  {person || 'Select Person'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Notes */}
          <View style={styles.fullRow}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Enter Notes"
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <TouchableOpacity
            style={[styles.addBtn, saving && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.addBtnText}>Add Charity Transaction</Text>
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
              <TouchableOpacity
                key={t}
                style={styles.dropdownItem}
                onPress={() => {
                  setType(t);
                  setPerson(''); setFromPerson(''); setToPerson('');
                  setShowTypePicker(false);
                }}
              >
                <Text style={[styles.dropdownItemText, type === t && styles.dropdownItemActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Person picker modal */}
      <Modal visible={!!showPersonPicker} transparent animationType="fade" onRequestClose={() => setShowPersonPicker(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPersonPicker(null)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Person</Text>
            {PEOPLE.map(p => (
              <TouchableOpacity
                key={p}
                style={styles.dropdownItem}
                onPress={() => {
                  if (showPersonPicker === 'person') setPerson(p);
                  else if (showPersonPicker === 'from') setFromPerson(p);
                  else if (showPersonPicker === 'to') setToPerson(p);
                  setShowPersonPicker(null);
                }}
              >
                <Text style={styles.dropdownItemText}>{p}</Text>
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

export default AddCharity;

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

  hint: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 14 },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  successText: { color: '#2E7D32', fontSize: 13, marginBottom: 8, fontWeight: '500' },

  balanceBox: {
    marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: '#E3F2FD',
    borderWidth: 1, borderColor: '#BBDEFB',
  },
  balanceTitle: { fontSize: 12, fontWeight: '700', color: '#1565C0', marginBottom: 6 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceItem: { fontSize: 12, color: '#444' },
  balanceValue: { fontWeight: '700', color: '#1A1A1A' },

  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  col2: { flex: 1 },
  fullRow: { marginBottom: 14 },

  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 13, color: '#222', backgroundColor: '#FAFAFA',
  },
  textarea: { height: 80, textAlignVertical: 'top' },
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

  addBtn: {
    backgroundColor: R, borderRadius: 6, alignItems: 'center',
    paddingVertical: 12, marginTop: 4,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '70%' },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemActive: { color: R, fontWeight: '700' },
});
