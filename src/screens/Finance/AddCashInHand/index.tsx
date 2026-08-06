import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { addCashInHandEntry } from '../../../api/employeeDashboard';

const R = '#C62828';

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

const AUTO_FIELDS = [
  'Opening Cash Balance',
  'Sale Counter Amount (Auto)',
  'Cafe Amount (Auto)',
  'Expense Amount (Auto)',
  'GST Amount (Auto)',
  'Charity Amount 2.5% (Auto)',
  'Total Amount',
];

const AddCashInHand = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const branchName = profile?.branchName ?? 'Branch';

  const [date, setDate] = useState(today());
  const [bank, setBank] = useState('');
  const [cashInHand, setCashInHand] = useState('');
  const [charity, setCharity] = useState('');
  const [gst, setGst] = useState('');
  const [description, setDescription] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      await addCashInHandEntry({
        branch_id: branchId,
        date,
        bank: bank ? parseFloat(bank) : undefined,
        cash_in_hand: cashInHand ? parseFloat(cashInHand) : undefined,
        charity: charity ? parseFloat(charity) : undefined,
        gst: gst ? parseFloat(gst) : undefined,
        description: description.trim() || undefined,
      });
      flash('Cash in hand entry added successfully.');
      setBank('');
      setCashInHand('');
      setCharity('');
      setGst('');
      setDescription('');
      setDate(today());
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to add entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Add Cash In Hand"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Cash In Hand</Text>

          <Text style={styles.label}>Branch Name</Text>
          <View style={styles.staticInput}>
            <Text style={styles.staticText}>{branchName}</Text>
          </View>

          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{display(date)}</Text>
            <Icon name="calendar" size={15} color="#666" />
          </TouchableOpacity>

          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Auto-calculated Fields</Text>
          {AUTO_FIELDS.map(f => (
            <View key={f} style={styles.autoRow}>
              <Text style={styles.autoLabel}>{f}</Text>
              <Text style={styles.autoValue}>Auto</Text>
            </View>
          ))}

          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Manual Entry</Text>

          <Text style={styles.label}>Bank Amount</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Enter bank amount"
            placeholderTextColor="#aaa"
            value={bank}
            onChangeText={setBank}
          />

          <Text style={styles.label}>Cash In Hand</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Enter cash in hand"
            placeholderTextColor="#aaa"
            value={cashInHand}
            onChangeText={setCashInHand}
          />

          <Text style={styles.label}>Charity Amount</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Enter charity amount"
            placeholderTextColor="#aaa"
            value={charity}
            onChangeText={setCharity}
          />

          <Text style={styles.label}>GST Amount</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Enter GST amount"
            placeholderTextColor="#aaa"
            value={gst}
            onChangeText={setGst}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholder="Enter description"
            placeholderTextColor="#aaa"
            value={description}
            onChangeText={setDescription}
          />

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitBtnText}>Add Cash In Hand</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => navigation.navigate('ViewCashInHand')}
          >
            <Text style={styles.viewBtnText}>View Cash In Hand</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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

export default AddCashInHand;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  sectionHeader: {
    fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#EAEAEA', paddingBottom: 6,
  },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 8 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },
  autoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#F7F7F7',
    borderRadius: 6, marginBottom: 4,
  },
  autoLabel: { fontSize: 12, color: '#555', flex: 1 },
  autoValue: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, fontSize: 13, color: '#222',
    backgroundColor: '#FAFAFA', marginBottom: 2,
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  errText: { color: R, fontSize: 13, marginTop: 10, fontWeight: '500' },
  successText: { color: '#388E3C', fontSize: 13, marginTop: 10, fontWeight: '500' },
  submitBtn: {
    backgroundColor: R, borderRadius: 6, alignItems: 'center',
    paddingVertical: 13, marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  viewBtn: {
    borderWidth: 1, borderColor: '#555', borderRadius: 6,
    alignItems: 'center', paddingVertical: 11, marginTop: 10,
  },
  viewBtnText: { color: '#444', fontWeight: '600', fontSize: 14 },
});
