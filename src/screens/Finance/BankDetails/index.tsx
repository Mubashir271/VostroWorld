import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import { getBankDetails, addBankDetail } from '../../../api/employeeDashboard';

// Submission is intentionally disabled for now — see hint text below.
// addBankDetail() is wired and ready; flip ADD_ENABLED once the endpoint is confirmed.
const ADD_ENABLED = false;

interface BankAccountRow {
  id: number;
  branch_name?: string;
  bank_name?: string;
  account_no?: string;
  account_title?: string;
  status?: string;
}

const BankDetails = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchId, branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  const [bankName, setBankName] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [rows, setRows] = useState<BankAccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const flashNote = (msg: string) => { setNote(msg); setTimeout(() => setNote(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getBankDetails(listBranchId);
      const data = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setRows([]);
      } else {
        setError(e?.response?.data?.message || 'Failed to load bank accounts. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [listBranchId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!ADD_ENABLED) return;
    if (branchId == null) { setFormError('Please select a branch.'); return; }
    if (!bankName.trim() || !accountTitle.trim() || !accountNumber.trim()) {
      setFormError('All fields are required.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      await addBankDetail({
        branch_id: branchId,
        name: bankName.trim(),
        account_no: accountNumber.trim(),
        account_title: accountTitle.trim(),
      });
      flash('Bank detail added successfully.');
      setBankName(''); setAccountTitle(''); setAccountNumber('');
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'Failed to add bank detail.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Bank Details"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* ── Add Bank Details card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Bank Details</Text>
          <Text style={styles.hint}>! The Fields With *Must Required Or Fill.</Text>
          {!ADD_ENABLED && (
            <Text style={styles.disabledNote}>
              Adding bank accounts is temporarily disabled while the API contract is confirmed. The form below is ready to go.
            </Text>
          )}

          {!!formError && <Text style={styles.errText}>{formError}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

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
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Bank Name*</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Bank Name"
                placeholderTextColor="#aaa"
                value={bankName}
                onChangeText={setBankName}
                editable={ADD_ENABLED}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Account Title*</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Account Title"
                placeholderTextColor="#aaa"
                value={accountTitle}
                onChangeText={setAccountTitle}
                editable={ADD_ENABLED}
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Account Number*</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Account Number"
                placeholderTextColor="#aaa"
                value={accountNumber}
                onChangeText={setAccountNumber}
                editable={ADD_ENABLED}
              />
            </View>
          </View>

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

        {/* ── View Account Details card ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>View Account Details</Text>
            <TouchableOpacity style={styles.exportBtn}>
              <Icon name="file-pdf-box" size={14} color="#fff" />
              <Text style={styles.exportBtnText}> PDF</Text>
            </TouchableOpacity>
          </View>

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!note && <Text style={styles.noteText}>{note}</Text>}

          {loading ? (
            <ActivityIndicator color={R} style={{ marginVertical: 30 }} />
          ) : rows.length === 0 ? (
            <Text style={styles.emptyText}>No bank accounts found.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.thead}>
                  {['Sr#', 'Branch', 'Bank Name', 'Account #', 'Account Title', 'Status', 'Actions'].map(h => (
                    <Text key={h} style={[styles.th, h === 'Actions' && styles.thWide]}>{h}</Text>
                  ))}
                </View>
                {rows.map((row, i) => (
                  <View key={row.id ?? i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                    <Text style={styles.td}>{i + 1}</Text>
                    <Text style={styles.td}>{row.branch_name || '-'}</Text>
                    <Text style={styles.td}>{row.bank_name || '-'}</Text>
                    <Text style={styles.td}>{row.account_no || '-'}</Text>
                    <Text style={styles.td}>{row.account_title || '-'}</Text>
                    <Text style={[styles.td, row.status === 'Active' && styles.activeText]}>{row.status || '-'}</Text>
                    <View style={[styles.td, styles.thWide, styles.actionCell]}>
                      <TouchableOpacity onPress={() => flashNote('Updating, deactivating and deleting bank accounts requires backend confirmation before going live.')}>
                        <Text style={styles.actionUpdate}>Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => flashNote('Updating, deactivating and deleting bank accounts requires backend confirmation before going live.')}>
                        <Text style={styles.actionInactive}>Inactive</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => flashNote('Updating, deactivating and deleting bank accounts requires backend confirmation before going live.')}>
                        <Text style={styles.actionDelete}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default BankDetails;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  hint: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  disabledNote: {
    fontSize: 12, color: '#E65100', backgroundColor: '#FFF3E0',
    borderRadius: 6, padding: 10, marginBottom: 14, fontWeight: '500',
  },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  successText: { color: '#2E7D32', fontSize: 13, marginBottom: 8, fontWeight: '500' },
  noteText: { color: '#E65100', fontSize: 12, marginBottom: 8, fontStyle: 'italic' },

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

  addBtn: { backgroundColor: R, borderRadius: 6, alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  exportBtn: {
    backgroundColor: R, borderRadius: 5, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10,
  },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 9 },
  th: { width: 90, color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 6, textAlign: 'center' },
  thWide: { width: 180 },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { width: 90, fontSize: 12, color: '#333', paddingHorizontal: 6, textAlign: 'center', alignSelf: 'center' },
  activeText: { color: '#2E7D32', fontWeight: '600' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  actionUpdate: { color: '#9E9E9E', fontSize: 12, fontWeight: '600' },
  actionInactive: { color: '#9E9E9E', fontSize: 12, fontWeight: '600' },
  actionDelete: { color: '#9E9E9E', fontSize: 12, fontWeight: '600' },
});
