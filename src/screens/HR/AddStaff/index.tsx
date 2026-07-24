import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Platform,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  registerStaff,
  getBranchesNameList,
  getDepartmentNames,
  getDesignationNames,
} from '../../../api/employeeDashboard';

// registerStaff's write contract is inferred (see the function's comment in
// employeeDashboard.ts) — the backend previously 500'd on an incomplete
// payload. Gated off until a real submit is captured in a HAR, same pattern
// as StaffPromotion/AddBankCash/AddOfficeCash.
const ADD_ENABLED = false;

interface Option { id: number; name: string; }

const GENDERS: Array<'Male' | 'Female' | 'Others'> = ['Male', 'Female', 'Others'];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (s?: string) => {
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${d || ''}/${m || ''}/${y || ''}`;
};

const EMPTY_FORM = {
  firstName: '', lastName: '', fatherName: '',
  email: '', officialEmail: '', password: '',
  cnic: '', dob: today(), cellNumber: '',
  emergencyContact: '', bloodGroup: '',
  gender: 'Others' as 'Male' | 'Female' | 'Others',
  city: '', address: '',
  branchId: '', branchName: '',
  departmentId: '', departmentName: '',
  designationId: '', designationName: '',
  role: '',
  cardNumber: '',
  joiningDate: today(), appointmentDate: today(),
  probationPeriod: '', salary: '', medical: '',
};

const AddStaff = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);

  const [branches, setBranches] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [datePickerField, setDatePickerField] = useState<'dob' | 'joiningDate' | 'appointmentDate' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const [branchModal, setBranchModal] = useState(false);
  const [genderModal, setGenderModal] = useState(false);
  const [departmentModal, setDepartmentModal] = useState(false);
  const [designationModal, setDesignationModal] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadBranches = useCallback(async () => {
    try {
      const res = await getBranchesNameList();
      const list: Option[] = res?.data ?? [];
      setBranches(Array.isArray(list) ? list : []);
      if (profile?.branchId) {
        const match = list.find((b: Option) => b.id === profile.branchId);
        if (match) setForm(f => ({ ...f, branchId: String(match.id), branchName: match.name }));
      }
    } catch {}
  }, [profile?.branchId]);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await getDepartmentNames();
      const list: Option[] = res?.data ?? [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch {}
  }, []);

  const loadDesignations = useCallback(async () => {
    try {
      const res = await getDesignationNames();
      const list: Option[] = res?.data ?? [];
      setDesignations(Array.isArray(list) ? list : []);
    } catch {}
  }, []);

  useEffect(() => { loadBranches(); loadDepartments(); loadDesignations(); }, [loadBranches, loadDepartments, loadDesignations]);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const resetForm = () => { setForm({ ...EMPTY_FORM }); setPhotoUri(null); };

  const handlePickPhoto = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.assets && response.assets[0]?.uri) {
        setPhotoUri(response.assets[0].uri);
      }
    });
  };

  const handleSave = async () => {
    if (!ADD_ENABLED) return;
    if (!form.firstName.trim()) { setError('First Name is required.'); return; }
    if (!form.lastName.trim()) { setError('Last Name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!form.password.trim()) { setError('Password is required.'); return; }
    if (!form.cnic.trim()) { setError('CNIC is required.'); return; }
    if (!form.cellNumber.trim()) { setError('Cell Number is required.'); return; }
    if (!form.branchId) { setError('Branch is required.'); return; }
    if (!form.salary.trim()) { setError('Salary is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await registerStaff({
        branch_id: parseInt(form.branchId, 10),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        father_name: form.fatherName.trim() || undefined,
        email: form.email.trim(),
        official_email: form.officialEmail.trim() || undefined,
        password: form.password,
        cnic: form.cnic.trim(),
        dob: form.dob || undefined,
        phone: form.cellNumber.trim(),
        emergency_contact_no: form.emergencyContact.trim() || undefined,
        blood_group: form.bloodGroup.trim() || undefined,
        gender: form.gender,
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined,
        department_id: form.departmentId ? parseInt(form.departmentId, 10) : undefined,
        designation_id: form.designationId ? parseInt(form.designationId, 10) : undefined,
        role: form.role.trim() || undefined,
        joining: form.joiningDate || undefined,
        appointment_date: form.appointmentDate || undefined,
        probation_duration: form.probationPeriod ? parseInt(form.probationPeriod, 10) : undefined,
        salary: parseFloat(form.salary),
        monthly_medical: form.medical ? parseFloat(form.medical) : undefined,
      });
      flash('Staff added successfully.');
      resetForm();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : (msg ? Object.values(msg).flat().join(' ') : 'Failed to add staff.'));
    } finally {
      setSaving(false);
    }
  };

  const openDatePicker = (field: 'dob' | 'joiningDate' | 'appointmentDate') => {
    setPickerDate(new Date(form[field] || today()));
    setDatePickerField(field);
  };
  const onDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setDatePickerField(null);
    if (selected && datePickerField) {
      const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
      setForm(f => ({ ...f, [datePickerField]: iso }));
      setPickerDate(selected);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Add Staff"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add New Staff</Text>
          <Text style={styles.hint}>! The Fields With *Must Required Or Fill.</Text>
          {!ADD_ENABLED && (
            <Text style={styles.disabledNote}>
              Adding staff is temporarily disabled while the API contract is confirmed — the backend previously 500'd on an incomplete payload. The form below is ready to go once confirmed.
            </Text>
          )}
          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          <View style={styles.row3}>
            <Field label="First Name" required>
              <TextInput style={styles.input} placeholder="Enter First Name" placeholderTextColor="#aaa"
                value={form.firstName} onChangeText={v => setForm(f => ({ ...f, firstName: v }))} />
            </Field>
            <Field label="Last Name" required>
              <TextInput style={styles.input} placeholder="Enter Last Name" placeholderTextColor="#aaa"
                value={form.lastName} onChangeText={v => setForm(f => ({ ...f, lastName: v }))} />
            </Field>
            <Field label="Father's Name">
              <TextInput style={styles.input} placeholder="Enter Father's Name" placeholderTextColor="#aaa"
                value={form.fatherName} onChangeText={v => setForm(f => ({ ...f, fatherName: v }))} />
            </Field>
          </View>

          <View style={styles.row3}>
            <Field label="Email" required>
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aaa" keyboardType="email-address" autoCapitalize="none"
                value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
            </Field>
            <Field label="Official Email">
              <TextInput style={styles.input} placeholder="Official Email" placeholderTextColor="#aaa" keyboardType="email-address" autoCapitalize="none"
                value={form.officialEmail} onChangeText={v => setForm(f => ({ ...f, officialEmail: v }))} />
            </Field>
            <Field label="Password" required>
              <TextInput style={styles.input} placeholder="Enter Password" placeholderTextColor="#aaa" secureTextEntry
                value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} />
            </Field>
          </View>

          <View style={styles.row3}>
            <Field label="CNIC" required>
              <TextInput style={styles.input} placeholder="XXXXX-XXXXXXX-X" placeholderTextColor="#aaa"
                value={form.cnic} onChangeText={v => setForm(f => ({ ...f, cnic: v }))} />
            </Field>
            <Field label="DOB">
              <TouchableOpacity style={styles.picker} onPress={() => openDatePicker('dob')}>
                <Text style={styles.pickerText}>{fmtDate(form.dob)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            <Field label="Cell Number" required>
              <TextInput style={styles.input} placeholder="e.g 92xxxxxxxxxx" placeholderTextColor="#aaa" keyboardType="phone-pad"
                value={form.cellNumber} onChangeText={v => setForm(f => ({ ...f, cellNumber: v }))} />
            </Field>
          </View>

          <View style={styles.row3}>
            <Field label="Emergency Contact No">
              <TextInput style={styles.input} placeholder="e.g 92xxxxxxxxxx" placeholderTextColor="#aaa" keyboardType="phone-pad"
                value={form.emergencyContact} onChangeText={v => setForm(f => ({ ...f, emergencyContact: v }))} />
            </Field>
            <Field label="Blood Group">
              <TextInput style={styles.input} placeholder="Enter Blood Group" placeholderTextColor="#aaa"
                value={form.bloodGroup} onChangeText={v => setForm(f => ({ ...f, bloodGroup: v }))} />
            </Field>
            <Field label="Gender" required>
              <TouchableOpacity style={styles.picker} onPress={() => setGenderModal(true)}>
                <Text style={styles.pickerText}>{form.gender}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
          </View>

          <View style={styles.row3}>
            <Field label="City">
              <TextInput style={styles.input} placeholder="City" placeholderTextColor="#aaa"
                value={form.city} onChangeText={v => setForm(f => ({ ...f, city: v }))} />
            </Field>
            <Field label="Address">
              <TextInput style={styles.input} placeholder="Address" placeholderTextColor="#aaa"
                value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} />
            </Field>
            <Field label="Branch Name" required>
              <TouchableOpacity style={styles.picker} onPress={() => setBranchModal(true)}>
                <Text style={form.branchName ? styles.pickerText : styles.placeholder}>{form.branchName || 'Select Branch'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
          </View>

          <View style={styles.row3}>
            <Field label="Department" required>
              <TouchableOpacity style={styles.picker} onPress={() => setDepartmentModal(true)}>
                <Text style={form.departmentName ? styles.pickerText : styles.placeholder}>{form.departmentName || 'Select Department'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            <Field label="Designation" required>
              <TouchableOpacity style={styles.picker} onPress={() => setDesignationModal(true)}>
                <Text style={form.designationName ? styles.pickerText : styles.placeholder}>{form.designationName || 'Select Designation'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            <Field label="Role">
              <TextInput style={styles.input} placeholder="e.g Finance Person" placeholderTextColor="#aaa"
                value={form.role} onChangeText={v => setForm(f => ({ ...f, role: v }))} />
            </Field>
          </View>

          <View style={styles.row3}>
            <Field label="Card Number">
              <TextInput style={styles.input} placeholder="Card Number" placeholderTextColor="#aaa"
                value={form.cardNumber} onChangeText={v => setForm(f => ({ ...f, cardNumber: v }))} />
            </Field>
            <Field label="Joining Date" required>
              <TouchableOpacity style={styles.picker} onPress={() => openDatePicker('joiningDate')}>
                <Text style={styles.pickerText}>{fmtDate(form.joiningDate)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
            <Field label="Appointment Date">
              <TouchableOpacity style={styles.picker} onPress={() => openDatePicker('appointmentDate')}>
                <Text style={styles.pickerText}>{fmtDate(form.appointmentDate)}</Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </Field>
          </View>

          <View style={styles.row3}>
            <Field label="Probation Period (months)">
              <TextInput style={styles.input} placeholder="Enter months" placeholderTextColor="#aaa" keyboardType="numeric"
                value={form.probationPeriod} onChangeText={v => setForm(f => ({ ...f, probationPeriod: v }))} />
            </Field>
            <Field label="Salary" required>
              <TextInput style={styles.input} placeholder="Salary" placeholderTextColor="#aaa" keyboardType="numeric"
                value={form.salary} onChangeText={v => setForm(f => ({ ...f, salary: v }))} />
            </Field>
            <Field label="Medical">
              <TextInput style={styles.input} placeholder="Medical" placeholderTextColor="#aaa" keyboardType="numeric"
                value={form.medical} onChangeText={v => setForm(f => ({ ...f, medical: v }))} />
            </Field>
          </View>

          <View style={styles.uploadRow}>
            <Text style={styles.label}>Upload Image</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickPhoto}>
              <Text style={styles.uploadBtnText}>Choose File</Text>
            </TouchableOpacity>
            <Text style={styles.uploadFileName} numberOfLines={1}>{photoUri ? photoUri.split('/').pop() : 'no file selected'}</Text>
            {!!photoUri && <FastImage source={{ uri: photoUri }} style={styles.preview} />}
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.saveBtn, (saving || !ADD_ENABLED) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || !ADD_ENABLED}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Add Staff</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {datePickerField && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
      {Platform.OS === 'ios' && datePickerField && (
        <TouchableOpacity style={styles.iosDone} onPress={() => setDatePickerField(null)}>
          <Text style={styles.iosDoneText}>Done</Text>
        </TouchableOpacity>
      )}

      <PickerModal visible={branchModal} title="Select Branch" options={branches}
        onClose={() => setBranchModal(false)}
        onSelect={(o) => { setForm(f => ({ ...f, branchId: String(o.id), branchName: o.name })); setBranchModal(false); }} />

      <PickerModal visible={departmentModal} title="Select Department" options={departments}
        onClose={() => setDepartmentModal(false)}
        onSelect={(o) => { setForm(f => ({ ...f, departmentId: String(o.id), departmentName: o.name })); setDepartmentModal(false); }} />

      <PickerModal visible={designationModal} title="Select Designation" options={designations}
        onClose={() => setDesignationModal(false)}
        onSelect={(o) => { setForm(f => ({ ...f, designationId: String(o.id), designationName: o.name })); setDesignationModal(false); }} />

      <Modal visible={genderModal} transparent animationType="fade" onRequestClose={() => setGenderModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGenderModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Gender</Text>
            {GENDERS.map(g => (
              <TouchableOpacity key={g} style={styles.dropdownItem}
                onPress={() => { setForm(f => ({ ...f, gender: g })); setGenderModal(false); }}>
                <Text style={[styles.dropdownItemText, form.gender === g && styles.dropdownItemActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <View style={styles.col3}>
    <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
    {children}
  </View>
);

const PickerModal = ({ visible, title, options, onClose, onSelect }: {
  visible: boolean; title: string; options: Option[]; onClose: () => void; onSelect: (o: Option) => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.dropdownBox}>
        <Text style={styles.dropdownTitle}>{title}</Text>
        <ScrollView>
          {options.map(o => (
            <TouchableOpacity key={o.id} style={styles.dropdownItem} onPress={() => onSelect(o)}>
              <Text style={styles.dropdownItemText}>{o.name}</Text>
            </TouchableOpacity>
          ))}
          {options.length === 0 && <Text style={styles.emptyText}>No options found.</Text>}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

export default AddStaff;

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
    fontSize: 11, color: '#222', backgroundColor: '#FAFAFA',
  },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#FAFAFA', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 11, color: '#222', flex: 1 },
  placeholder: { fontSize: 11, color: '#aaa', flex: 1 },

  uploadRow: { marginBottom: 14 },
  uploadBtn: {
    backgroundColor: '#EEE', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16,
    alignSelf: 'flex-start', marginTop: 4, marginBottom: 6,
  },
  uploadBtnText: { fontSize: 13, color: '#333', fontWeight: '600' },
  uploadFileName: { fontSize: 12, color: '#888' },
  preview: { width: 60, height: 60, borderRadius: 6, marginTop: 8 },

  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  saveBtn: { backgroundColor: R, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 22 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

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
