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
  getSalaryComponents,
  addSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent,
  getStaffList,
} from '../../../api/employeeDashboard';

interface SalaryComp {
  id: number;
  branch_name?: string;
  staff_name?: string;
  user_name?: string;
  component_name?: string;
  name?: string;
  type: string;
  amount: number;
  salary_month?: string;
  date?: string;
  description?: string;
}

interface Staff { id: number; name: string; }

const TYPE_OPTIONS = ['Addition (+)', 'Deduction (-)'];
const TYPE_KEY: Record<string, string> = {
  'Addition (+)': 'Addition',
  'Deduction (-)': 'Deduction',
};
const TYPE_DISPLAY: Record<string, string> = {
  Addition: '+ Addition',
  Deduction: '- Deduction',
};
const TYPE_COLOR: Record<string, string> = {
  Addition: '#1B5E20',
  Deduction: '#B71C1C',
};
const TYPE_BG: Record<string, string> = {
  Addition: '#E8F5E9',
  Deduction: '#FFEBEE',
};

const COLS = [
  { key: 'sr',        label: '#',             width: 45  },
  { key: 'branch',    label: 'Branch',        width: 90  },
  { key: 'staff',     label: 'Staff',         width: 160 },
  { key: 'component', label: 'Component',     width: 160 },
  { key: 'type',      label: 'Type',          width: 130 },
  { key: 'amount',    label: 'Amount',        width: 110 },
  { key: 'month',     label: 'Salary Month',  width: 120 },
  { key: 'date',      label: 'Date',          width: 110 },
  { key: 'desc',      label: 'Description',   width: 160 },
  { key: 'actions',   label: 'Actions',       width: 100 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const fmtDate = (s?: string) => {
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${d || ''}/${m || ''}/${y || ''}`;
};
const fmtMonth = (s?: string) => {
  if (!s) return '-';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m] = s.split('-');
  return `${months[parseInt(m, 10) - 1] || ''} ${y || ''}`;
};

const EMPTY_FORM = {
  staffId: '',
  staffName: '',
  componentName: '',
  typeLabel: 'Deduction (-)',
  amount: '',
  date: today(),
  salaryMonth: thisMonth(),
  description: '',
};

const SalaryComponent = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branch_name ?? 'Branch';

  const [records, setRecords] = useState<SalaryComp[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<number | null>(null);

  // picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  // dropdown modals
  const [staffModal, setStaffModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSalaryComponents({ branch_id: branchId, limit: 200 });
      const rows: SalaryComp[] = res?.data?.data ?? res?.data ?? [];
      setRecords(Array.isArray(rows) ? rows : []);
    } catch {
      setError('Failed to load salary components.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const loadStaff = useCallback(async () => {
    try {
      const res = await getStaffList({ branch_id: branchId, limit: 500 });
      const list: Staff[] = res?.data?.data ?? res?.data ?? [];
      setStaffList(Array.isArray(list) ? list : []);
    } catch {}
  }, [branchId]);

  useEffect(() => {
    load();
    loadStaff();
  }, [load, loadStaff]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
  };

  const handleSave = async () => {
    if (!form.staffId) { setError('Please select a staff member.'); return; }
    if (!form.componentName.trim()) { setError('Component Name is required.'); return; }
    if (!form.amount || isNaN(Number(form.amount))) { setError('Amount is required.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        branch_id: branchId,
        user_id: parseInt(form.staffId, 10),
        component_name: form.componentName.trim(),
        type: TYPE_KEY[form.typeLabel],
        amount: parseFloat(form.amount),
        date: form.date,
        salary_month: form.salaryMonth,
        description: form.description.trim(),
      };
      if (editId) {
        await updateSalaryComponent(editId, payload);
        flash('Component updated successfully.');
      } else {
        await addSalaryComponent(payload);
        flash('Component saved successfully.');
      }
      resetForm();
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save component.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rec: SalaryComp) => {
    setEditId(rec.id);
    const typeLabel = rec.type === 'Addition' ? 'Addition (+)' : 'Deduction (-)';
    setForm({
      staffId: String((rec as any).user_id ?? ''),
      staffName: rec.staff_name ?? rec.user_name ?? '',
      componentName: rec.component_name ?? rec.name ?? '',
      typeLabel,
      amount: String(rec.amount ?? ''),
      date: rec.date ?? today(),
      salaryMonth: rec.salary_month ?? thisMonth(),
      description: rec.description ?? '',
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSalaryComponent(id);
      flash('Component deleted.');
      load();
    } catch {
      setError('Failed to delete component.');
    }
  };

  const onDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
      setForm(f => ({ ...f, date: iso }));
      setPickerDate(selected);
    }
  };

  const onMonthChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowMonthPicker(false);
    if (selected) {
      const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}`;
      setForm(f => ({ ...f, salaryMonth: iso }));
      setPickerDate(selected);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Salary Component"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* ── Form card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {editId ? 'Update Salary Component' : 'Add Salary Component'}
          </Text>

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          {/* Row 1: Branch | Staff | Component */}
          <View style={styles.row3}>
            <View style={styles.col3}>
              <Text style={styles.label}>Branch Name *</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
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
              <Text style={styles.label}>Component Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Transport Allowance"
                placeholderTextColor="#aaa"
                value={form.componentName}
                onChangeText={v => setForm(f => ({ ...f, componentName: v }))}
              />
            </View>
          </View>

          {/* Row 2: Type | Amount | Date | Salary Month */}
          <View style={styles.row4}>
            <View style={styles.col4}>
              <Text style={styles.label}>Type *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTypeModal(true)}>
                <Text style={styles.pickerText}>{form.typeLabel}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="Amount"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
              />
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => { setPickerDate(new Date(form.date)); setShowDatePicker(true); }}>
                <Text style={styles.pickerText}>{fmtDate(form.date)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col4}>
              <Text style={styles.label}>Apply in Salary Month *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => { setPickerDate(new Date(form.salaryMonth + '-01')); setShowMonthPicker(true); }}>
                <Text style={styles.pickerText}>{fmtMonth(form.salaryMonth)}</Text>
                <Icon name="calendar-month" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.fullRow}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Optional description"
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
            />
          </View>

          <View style={styles.btnRow}>
            {editId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>{editId ? 'Update Component' : 'Save Component'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Table card ── */}
        <View style={styles.card}>
          {loading
            ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
            : records.length === 0
              ? <Text style={styles.emptyText}>No salary components found.</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ width: TABLE_W }}>
                    {/* Header */}
                    <View style={styles.thead}>
                      {COLS.map(c => (
                        <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                      ))}
                    </View>
                    {/* Rows */}
                    {records.map((rec, i) => (
                      <View key={rec.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, { width: COLS[0].width }]}>{i + 1}</Text>
                        <Text style={[styles.td, { width: COLS[1].width }]}>{rec.branch_name ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[2].width }]}>{rec.staff_name ?? rec.user_name ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[3].width }]}>{rec.component_name ?? rec.name ?? '-'}</Text>
                        <View style={[styles.td, { width: COLS[4].width }]}>
                          <View style={[styles.badge, { backgroundColor: TYPE_BG[rec.type] ?? '#EEE' }]}>
                            <Text style={[styles.badgeText, { color: TYPE_COLOR[rec.type] ?? '#333' }]}>
                              {TYPE_DISPLAY[rec.type] ?? rec.type}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.td, { width: COLS[5].width }]}>Rs. {Number(rec.amount || 0).toLocaleString()}</Text>
                        <Text style={[styles.td, { width: COLS[6].width }]}>{fmtMonth(rec.salary_month)}</Text>
                        <Text style={[styles.td, { width: COLS[7].width }]}>{fmtDate(rec.date)}</Text>
                        <Text style={[styles.td, { width: COLS[8].width }]}>{rec.description || '-'}</Text>
                        <View style={[styles.td, styles.actionCell, { width: COLS[9].width }]}>
                          <TouchableOpacity onPress={() => handleEdit(rec)} style={styles.iconBtn}>
                            <Icon name="pencil" size={16} color="#1565C0" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(rec.id)} style={styles.iconBtn}>
                            <Icon name="delete" size={16} color="#C62828" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )
          }
        </View>
      </ScrollView>

      {/* Date picker */}
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

      {/* Month picker */}
      {showMonthPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onMonthChange}
        />
      )}
      {Platform.OS === 'ios' && showMonthPicker && (
        <TouchableOpacity style={styles.iosDone} onPress={() => setShowMonthPicker(false)}>
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

      {/* Type dropdown modal */}
      <Modal visible={typeModal} transparent animationType="fade" onRequestClose={() => setTypeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypeModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Type</Text>
            {TYPE_OPTIONS.map(t => (
              <TouchableOpacity
                key={t}
                style={styles.dropdownItem}
                onPress={() => { setForm(f => ({ ...f, typeLabel: t })); setTypeModal(false); }}
              >
                <Text style={styles.dropdownItemText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default SalaryComponent;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  errText: { color: '#C62828', fontSize: 13, marginBottom: 8, fontWeight: '500' },
  successText: { color: '#2E7D32', fontSize: 13, marginBottom: 8, fontWeight: '500' },

  row3: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col3: { flex: 1 },
  row4: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col4: { flex: 1 },
  fullRow: { marginBottom: 10 },

  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: '#222', backgroundColor: '#FAFAFA',
  },
  textarea: { height: 72, textAlignVertical: 'top' },
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
  cancelBtn: {
    borderWidth: 1, borderColor: '#999', borderRadius: 6,
    paddingVertical: 10, paddingHorizontal: 18,
  },
  cancelBtnText: { color: '#555', fontSize: 13 },

  // table
  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 6, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 6, textAlign: 'center', alignSelf: 'center' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 4 },

  badge: { borderRadius: 4, paddingVertical: 3, paddingHorizontal: 6, alignSelf: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400,
  },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },

  iosDone: {
    position: 'absolute', bottom: 0, right: 0, left: 0,
    backgroundColor: '#fff', padding: 14, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#EEE',
  },
  iosDoneText: { color: R, fontWeight: '700', fontSize: 15 },
});
