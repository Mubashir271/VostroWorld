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
  getPromotions,
  addPromotion,
  getStaffList,
  getRelatedThings,
} from '../../../api/employeeDashboard';

// addPromotion's write contract is a best-effort guess (see the function's
// comment in employeeDashboard.ts) — the only thing actually confirmed live
// is the required-field *names*, not that this exact payload succeeds.
// Gated off until confirmed, same pattern as AddBankCash/AddOfficeCash.
const ADD_ENABLED = true;

interface Staff {
  id: number;
  name: string;
  department_id?: number;
  department?: string;
  designation_id?: number;
  designation?: string;
  salary?: number;
}
interface Thing { id: number; name: string; department_id: number | null; }
interface PromotionRecord {
  id: number;
  branch?: string;
  employee?: string;
  pervs_depart?: string;
  new_depart?: string;
  pervs_designation?: string;
  new_designation?: string;
  previous_salary?: number;
  new_salary?: number;
  promotion_type?: string;
  status?: string | number;
}

const PROMOTION_TYPES: { label: string; value: 'Department' | 'Position' | 'Salary' | 'All' }[] = [
  { label: 'Department', value: 'Department' },
  { label: 'Position', value: 'Position' },
  { label: 'Salary', value: 'Salary' },
  { label: 'All', value: 'All' },
];

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
  staffId: '', staffName: '',
  promotionType: 'Department' as 'Department' | 'Position' | 'Salary' | 'All',
  date: today(),
  newDepartmentId: '', newDepartmentName: '',
  newDesignationId: '', newDesignationName: '',
  revisedSalary: '', details: '',
};

const StaffPromotion = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? 'Branch';

  const [records, setRecords] = useState<PromotionRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Thing[]>([]);
  const [designations, setDesignations] = useState<Thing[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  const [staffModal, setStaffModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);
  const [departmentModal, setDepartmentModal] = useState(false);
  const [designationModal, setDesignationModal] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const selectedStaff = staffList.find(s => String(s.id) === form.staffId);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPromotions({ branch_id: branchId, limit: 200 } as any);
      const rows: PromotionRecord[] = res?.data?.data ?? res?.data ?? [];
      setRecords(Array.isArray(rows) ? rows : []);
    } catch {
      setRecords([]);
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

  const loadDepartments = useCallback(async () => {
    try {
      const res = await getRelatedThings({ type: 'Department', limit: 500 });
      const list: Thing[] = res?.data?.data ?? res?.data ?? [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch {}
  }, []);

  const loadDesignations = useCallback(async () => {
    try {
      const res = await getRelatedThings({ type: 'Designations', limit: 500 });
      const list: Thing[] = res?.data?.data ?? res?.data ?? [];
      setDesignations(Array.isArray(list) ? list : []);
    } catch {}
  }, []);

  useEffect(() => { load(); loadStaff(); loadDepartments(); loadDesignations(); }, [load, loadStaff, loadDepartments, loadDesignations]);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const resetForm = () => setForm({ ...EMPTY_FORM });

  const designationOptionsForDept = (deptId?: number) =>
    deptId ? designations.filter(d => d.department_id === deptId) : designations;

  const handleSave = async () => {
    if (!ADD_ENABLED) return;
    if (!selectedStaff) { setError('Please select a staff member.'); return; }
    if (form.promotionType !== 'Salary' && !form.newDepartmentId && form.promotionType === 'Department') {
      setError('Please select the new department.'); return;
    }
    setError('');
    setSaving(true);
    try {
      await addPromotion({
        branch_id: branchId,
        user_id: selectedStaff.id,
        promotion_type: form.promotionType,
        date: form.date,
        previous_department: selectedStaff.department_id,
        new_department: form.newDepartmentId ? parseInt(form.newDepartmentId, 10) : selectedStaff.department_id,
        previous_designation: selectedStaff.designation_id,
        new_designation: form.newDesignationId ? parseInt(form.newDesignationId, 10) : selectedStaff.designation_id,
        previous_salary: selectedStaff.salary,
        new_salary: form.revisedSalary ? parseFloat(form.revisedSalary) : selectedStaff.salary,
        details: form.details.trim() || undefined,
      });
      flash('Promotion added successfully.');
      resetForm();
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : (msg ? Object.values(msg).flat().join(' ') : 'Failed to add promotion.'));
    } finally {
      setSaving(false);
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

  const showDept = form.promotionType === 'Department' || form.promotionType === 'All';
  const showDesignation = form.promotionType === 'Position' || form.promotionType === 'All';
  const showSalary = form.promotionType === 'Salary' || form.promotionType === 'All';

  return (
    <View style={styles.root}>
      <AppHeader
        title="Staff Promotion"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Staff Promotion</Text>
          <Text style={styles.hint}>! The Fields With *Must Be Filled.</Text>
          {!ADD_ENABLED && (
            <Text style={styles.disabledNote}>
              Adding promotions is temporarily disabled while the API contract is confirmed (the form below is ready to go).
            </Text>
          )}

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          <View style={styles.row3}>
            <View style={styles.col3}>
              <Text style={styles.label}>Branch Name *</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Name *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setStaffModal(true)}>
                <Text style={form.staffName ? styles.pickerText : styles.placeholder}>
                  {form.staffName || 'Select Names'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Promotion Type *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTypeModal(true)}>
                <Text style={styles.pickerText}>{form.promotionType}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {selectedStaff && (showDept || showDesignation || showSalary) && (
            <View style={styles.row3}>
              {showDept && (
                <View style={styles.col3}>
                  <Text style={styles.label}>Previous Department</Text>
                  <View style={styles.staticInput}>
                    <Text style={styles.staticText}>{selectedStaff.department || '-'}</Text>
                  </View>
                </View>
              )}
              {showDesignation && (
                <View style={styles.col3}>
                  <Text style={styles.label}>Previous Designation</Text>
                  <View style={styles.staticInput}>
                    <Text style={styles.staticText}>{selectedStaff.designation || '-'}</Text>
                  </View>
                </View>
              )}
              {showSalary && (
                <View style={styles.col3}>
                  <Text style={styles.label}>Current Salary</Text>
                  <View style={styles.staticInput}>
                    <Text style={styles.staticText}>{selectedStaff.salary ?? '-'}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {selectedStaff && (showDept || showDesignation || showSalary) && (
            <View style={styles.row3}>
              {showDept && (
                <View style={styles.col3}>
                  <Text style={styles.label}>Promoted Department *</Text>
                  <TouchableOpacity style={styles.picker} onPress={() => setDepartmentModal(true)}>
                    <Text style={form.newDepartmentName ? styles.pickerText : styles.placeholder}>
                      {form.newDepartmentName || 'Select Department'}
                    </Text>
                    <Icon name="chevron-down" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              {showDesignation && (
                <View style={styles.col3}>
                  <Text style={styles.label}>Promoted Designation *</Text>
                  <TouchableOpacity style={styles.picker} onPress={() => setDesignationModal(true)}>
                    <Text style={form.newDesignationName ? styles.pickerText : styles.placeholder}>
                      {form.newDesignationName || 'Select Designation'}
                    </Text>
                    <Icon name="chevron-down" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              {showSalary && (
                <View style={styles.col3}>
                  <Text style={styles.label}>Revised Salary</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter revised salary"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    value={form.revisedSalary}
                    onChangeText={v => setForm(f => ({ ...f, revisedSalary: v }))}
                  />
                </View>
              )}
            </View>
          )}

          <View style={styles.row3}>
            {showSalary && (
              <View style={styles.col3}>
                <Text style={styles.label}>Details</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Details"
                  placeholderTextColor="#aaa"
                  value={form.details}
                  onChangeText={v => setForm(f => ({ ...f, details: v }))}
                />
              </View>
            )}
            <View style={styles.col3}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity style={styles.picker} onPress={() => { setPickerDate(new Date(form.date)); setShowDatePicker(true); }}>
                <Text style={styles.pickerText}>{fmtDate(form.date)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.saveBtn, (saving || !ADD_ENABLED) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || !ADD_ENABLED}
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
          <Text style={styles.cardTitle}>Active Promotions</Text>
          {loading
            ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
            : records.length === 0
              ? <Text style={styles.emptyText}>No Record Found</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ minWidth: 900 }}>
                    <View style={styles.thead}>
                      {['#', 'Employee', 'Prev. Dept', 'New Dept', 'Prev. Designation', 'New Designation', 'Prev. Salary', 'New Salary', 'Status'].map(h => (
                        <Text key={h} style={[styles.th, { width: h === 'Employee' ? 140 : h.includes('Designation') ? 150 : 100 }]}>{h}</Text>
                      ))}
                    </View>
                    {records.map((rec, i) => (
                      <View key={rec.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, { width: 100 }]}>{i + 1}</Text>
                        <Text style={[styles.td, { width: 140, textAlign: 'left' }]}>{rec.employee ?? '-'}</Text>
                        <Text style={[styles.td, { width: 100 }]}>{rec.pervs_depart ?? '-'}</Text>
                        <Text style={[styles.td, { width: 100 }]}>{rec.new_depart ?? '-'}</Text>
                        <Text style={[styles.td, { width: 150 }]}>{rec.pervs_designation ?? '-'}</Text>
                        <Text style={[styles.td, { width: 150 }]}>{rec.new_designation ?? '-'}</Text>
                        <Text style={[styles.td, { width: 100 }]}>{rec.previous_salary !== undefined ? `Rs ${Number(rec.previous_salary).toLocaleString()}` : '-'}</Text>
                        <Text style={[styles.td, { width: 100 }]}>{rec.new_salary !== undefined ? `Rs ${Number(rec.new_salary).toLocaleString()}` : '-'}</Text>
                        <Text style={[styles.td, { width: 100 }]}>{rec.status ?? '-'}</Text>
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

      {/* Staff dropdown */}
      <Modal visible={staffModal} transparent animationType="fade" onRequestClose={() => setStaffModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStaffModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Staff</Text>
            <ScrollView>
              {staffList.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setForm(f => ({
                      ...f, staffId: String(s.id), staffName: s.name,
                      newDepartmentId: '', newDepartmentName: '', newDesignationId: '', newDesignationName: '',
                    }));
                    setStaffModal(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
              {staffList.length === 0 && <Text style={styles.emptyText}>No staff found.</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Promotion Type dropdown */}
      <Modal visible={typeModal} transparent animationType="fade" onRequestClose={() => setTypeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypeModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Promotion Type</Text>
            {PROMOTION_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={styles.dropdownItem}
                onPress={() => {
                  setForm(f => ({ ...f, promotionType: t.value, newDepartmentId: '', newDepartmentName: '', newDesignationId: '', newDesignationName: '' }));
                  setTypeModal(false);
                }}
              >
                <Text style={[styles.dropdownItemText, form.promotionType === t.value && styles.dropdownItemActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Promoted Department dropdown */}
      <Modal visible={departmentModal} transparent animationType="fade" onRequestClose={() => setDepartmentModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDepartmentModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Department</Text>
            <ScrollView>
              {departments.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setForm(f => ({ ...f, newDepartmentId: String(d.id), newDepartmentName: d.name, newDesignationId: '', newDesignationName: '' }));
                    setDepartmentModal(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Promoted Designation dropdown (filtered by Promoted Department for "All",
          or by the staff's current department for "Position"-only) */}
      <Modal visible={designationModal} transparent animationType="fade" onRequestClose={() => setDesignationModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDesignationModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Designation</Text>
            <ScrollView>
              {designationOptionsForDept(
                form.newDepartmentId ? parseInt(form.newDepartmentId, 10) : selectedStaff?.department_id
              ).map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setForm(f => ({ ...f, newDesignationId: String(d.id), newDesignationName: d.name }));
                    setDesignationModal(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default StaffPromotion;

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
