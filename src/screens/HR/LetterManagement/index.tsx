import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
  getStaffDocuments,
  addStaffDocument,
  getStaffList,
} from '../../../api/employeeDashboard';

interface Staff { id: number; name: string; }
interface DocRecord {
  id: number;
  branch_name?: string;
  staff_name?: string;
  user_name?: string;
  document_category?: string;
  document_type?: string;
  issue_date?: string;
  document_code?: string;
  subject?: string;
  approval_status?: string;
  status?: string | number;
}

const CATEGORIES = ['Letter', 'Certificate', 'Form'];
const LETTER_TYPES = [
  'Offer Letter',
  'Bank Account Opening Letter',
  'Appointment Letter',
  'Confirmation Letter',
  'Warning Letter',
];

const COLS = [
  { key: 'sr',       label: '#',         width: 40  },
  { key: 'staff',    label: 'Staff',     width: 150 },
  { key: 'category', label: 'Category',  width: 100 },
  { key: 'type',     label: 'Type',      width: 180 },
  { key: 'date',     label: 'Issue Date', width: 100 },
  { key: 'code',     label: 'Doc Code',  width: 110 },
  { key: 'subject',  label: 'Subject',   width: 140 },
  { key: 'status',   label: 'Status',    width: 90  },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (s?: string) => {
  if (!s) return '-';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d || ''}/${m || ''}/${y || ''}`;
};

const EMPTY_FORM = {
  staffId: '',
  staffName: '',
  category: 'Letter',
  type: '',
  issueDate: today(),
  documentCode: '',
  subject: 'N/A',
};

const LetterManagement = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchId, branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  const [records, setRecords] = useState<DocRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  const [staffModal, setStaffModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getStaffDocuments({ branch_id: listBranchId, limit: 200 } as any);
      const rows: DocRecord[] = res?.data?.data ?? res?.data ?? [];
      setRecords(Array.isArray(rows) ? rows : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [listBranchId]);

  const loadStaff = useCallback(async () => {
    try {
      const res = await getStaffList({ branch_id: listBranchId, limit: 500 });
      const list: Staff[] = res?.data?.data ?? res?.data ?? [];
      setStaffList(Array.isArray(list) ? list : []);
    } catch {}
  }, [listBranchId]);

  useEffect(() => {
    load();
    loadStaff();
  }, [load, loadStaff]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const resetForm = () => setForm({ ...EMPTY_FORM });

  const handleSave = async () => {
    if (branchId == null) { setError('Please select a branch.'); return; }
    if (!form.staffId) { setError('Please select a Staff Name.'); return; }
    if (!form.type.trim()) { setError('Please select a Document Type.'); return; }
    if (!form.documentCode.trim()) { setError('Document Code is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await addStaffDocument({
        branch_id: branchId,
        user_id: parseInt(form.staffId, 10),
        document_category: form.category,
        document_type: form.type.trim(),
        issue_date: form.issueDate,
        document_code: form.documentCode.trim(),
        subject: form.subject.trim() || 'N/A',
      });
      flash('Document saved successfully.');
      resetForm();
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : (msg ? Object.values(msg).flat().join(' ') : 'Failed to save document.'));
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
      setForm(f => ({ ...f, issueDate: iso }));
      setPickerDate(selected);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Letter Management"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Document</Text>
          <Text style={styles.hint}>! The Fields With *Must Be Filled.</Text>

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          {/* Row 1: Branch | Staff | Document Category */}
          <View style={styles.row3}>
            <View style={styles.col3}>
              <BranchField
                label="Branch Name *"
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
            <View style={styles.col3}>
              <Text style={styles.label}>Staff Name *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setStaffModal(true)}>
                <Text style={form.staffName ? styles.pickerText : styles.placeholder}>
                  {form.staffName || 'Select Staff'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Document Category *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setCategoryModal(true)}>
                <Text style={styles.pickerText}>{form.category}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Document Type | Issue Date | Document Code */}
          <View style={styles.row3}>
            <View style={styles.col3}>
              <Text style={styles.label}>Document Type *</Text>
              {form.category === 'Letter' ? (
                <TouchableOpacity style={styles.picker} onPress={() => setTypeModal(true)}>
                  <Text style={form.type ? styles.pickerText : styles.placeholder}>
                    {form.type || 'Select Document Type'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Enter document type"
                  placeholderTextColor="#aaa"
                  value={form.type}
                  onChangeText={v => setForm(f => ({ ...f, type: v }))}
                />
              )}
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Issue Date</Text>
              <TouchableOpacity style={styles.picker} onPress={() => { setPickerDate(new Date(form.issueDate)); setShowDatePicker(true); }}>
                <Text style={styles.pickerText}>{fmtDate(form.issueDate)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Document Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Document Code"
                placeholderTextColor="#aaa"
                value={form.documentCode}
                onChangeText={v => setForm(f => ({ ...f, documentCode: v }))}
              />
            </View>
          </View>

          {/* Subject */}
          <View style={styles.fullRow}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Subject"
              placeholderTextColor="#aaa"
              value={form.subject}
              onChangeText={v => setForm(f => ({ ...f, subject: v }))}
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Add</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Table card ── */}
        <View style={styles.card}>
          {loading
            ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
            : records.length === 0
              ? <Text style={styles.emptyText}>No Record Found</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ width: TABLE_W }}>
                    <View style={styles.thead}>
                      {COLS.map(c => (
                        <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                      ))}
                    </View>
                    {records.map((rec, i) => (
                      <View key={rec.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, { width: COLS[0].width }]}>{i + 1}</Text>
                        <Text style={[styles.td, { width: COLS[1].width }]}>{rec.staff_name ?? rec.user_name ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[2].width }]}>{rec.document_category ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[3].width }]}>{rec.document_type ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[4].width }]}>{fmtDate(rec.issue_date)}</Text>
                        <Text style={[styles.td, { width: COLS[5].width }]}>{rec.document_code ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[6].width }]}>{rec.subject ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[7].width }]}>{rec.approval_status ?? '-'}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )
          }
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
      {Platform.OS === 'ios' && showDatePicker && (
        <TouchableOpacity style={styles.iosDone} onPress={() => setShowDatePicker(false)}>
          <Text style={styles.iosDoneText}>Done</Text>
        </TouchableOpacity>
      )}

      {/* Staff dropdown modal */}
      <Modal visible={staffModal} transparent animationType="fade" onRequestClose={() => setStaffModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStaffModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Staff</Text>
            <ScrollView>
              {staffList.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.dropdownItem}
                  onPress={() => { setForm(f => ({ ...f, staffId: String(s.id), staffName: s.name })); setStaffModal(false); }}
                >
                  <Text style={styles.dropdownItemText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
              {staffList.length === 0 && <Text style={styles.emptyText}>No staff found.</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Document Category dropdown modal */}
      <Modal visible={categoryModal} transparent animationType="fade" onRequestClose={() => setCategoryModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Document Category</Text>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={styles.dropdownItem}
                onPress={() => { setForm(f => ({ ...f, category: c, type: '' })); setCategoryModal(false); }}
              >
                <Text style={[styles.dropdownItemText, form.category === c && styles.dropdownItemActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Document Type dropdown modal (Letter category) */}
      <Modal visible={typeModal} transparent animationType="fade" onRequestClose={() => setTypeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypeModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Document Type</Text>
            {LETTER_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={styles.dropdownItem}
                onPress={() => { setForm(f => ({ ...f, type: t })); setTypeModal(false); }}
              >
                <Text style={[styles.dropdownItemText, form.type === t && styles.dropdownItemActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default LetterManagement;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  hint: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 14 },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  successText: { color: '#2E7D32', fontSize: 13, marginBottom: 8, fontWeight: '500' },

  row3: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col3: { flex: 1 },
  fullRow: { marginBottom: 10 },

  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: '#222', backgroundColor: '#FAFAFA',
  },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#FAFAFA', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },

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
