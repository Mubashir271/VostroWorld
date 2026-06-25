import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Switch, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import {
  getRelatedThings,
  addRelatedThing,
  updateRelatedThing,
  deleteRelatedThing,
  setRelatedThingStatus,
} from '../../../api/employeeDashboard';

interface Thing {
  id: number;
  name: string;
  department_id: number | null;
  department: string | null;
  description: string | null;
  type: string;
  status: string | number;
}

const CATEGORIES: { label: string; type: string }[] = [
  { label: 'Department', type: 'Department' },
  { label: 'Designations', type: 'Designations' },
];

const ResourceManager = () => {
  const navigation = useNavigation<any>();

  const [category, setCategory] = useState<'Department' | 'Designations'>('Department');
  const [items, setItems] = useState<Thing[]>([]);
  const [departments, setDepartments] = useState<Thing[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [departmentName, setDepartmentName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);

  const [departmentModal, setDepartmentModal] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const loadDepartments = useCallback(async () => {
    try {
      const res = await getRelatedThings({ type: 'Department', limit: 500 });
      const rows: Thing[] = res?.data?.data ?? res?.data ?? [];
      setDepartments(Array.isArray(rows) ? rows : []);
    } catch {}
  }, []);

  const load = useCallback(async (type: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await getRelatedThings({ type, limit: 500 });
      const rows: Thing[] = res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(rows) ? rows : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDepartments(); }, [loadDepartments]);
  useEffect(() => { load(category); }, [category, load]);

  const resetForm = () => {
    setName('');
    setDepartmentId(null);
    setDepartmentName('');
    setEditId(null);
  };

  const handleCategoryChange = (type: 'Department' | 'Designations') => {
    setCategory(type);
    resetForm();
    setError('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(category === 'Department' ? 'Department Name is required.' : 'Designation Name is required.');
      return;
    }
    if (category === 'Designations' && !departmentId) {
      setError('Please select a Department.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (editId) {
        await updateRelatedThing(editId, {
          name: name.trim(),
          ...(category === 'Designations' ? { department_id: departmentId! } : {}),
        });
        flash(`${category === 'Department' ? 'Department' : 'Designation'} updated successfully.`);
      } else {
        await addRelatedThing({
          name: name.trim(),
          type: category,
          ...(category === 'Designations' ? { department_id: departmentId! } : {}),
        });
        flash(`${category === 'Department' ? 'Department' : 'Designation'} added successfully.`);
      }
      resetForm();
      load(category);
      if (category === 'Department') loadDepartments();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : (msg ? Object.values(msg).flat().join(' ') : 'Failed to save.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rec: Thing) => {
    setEditId(rec.id);
    setName(rec.name);
    if (category === 'Designations') {
      setDepartmentId(rec.department_id ?? null);
      setDepartmentName(rec.department ?? '');
    }
  };

  const handleDelete = (rec: Thing) => {
    Alert.alert(
      'Delete',
      `Delete "${rec.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRelatedThing(rec.id);
              flash('Deleted successfully.');
              load(category);
            } catch {
              setError('Failed to delete record.');
            }
          },
        },
      ],
    );
  };

  const handleToggleStatus = async (rec: Thing) => {
    const nextActive = !(String(rec.status) === '1');
    setItems(prev => prev.map(it => it.id === rec.id ? { ...it, status: nextActive ? '1' : '0' } : it));
    try {
      await setRelatedThingStatus(rec.id, nextActive);
    } catch {
      setItems(prev => prev.map(it => it.id === rec.id ? { ...it, status: rec.status } : it));
      setError('Failed to update status.');
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Resource Manager"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editId ? 'Update' : 'Add'} {category === 'Department' ? 'Department' : 'Designation'}</Text>
          <Text style={styles.hint}>! The Fields With *Must Be Filled.</Text>

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          <View style={styles.fullRow}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.segmentRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.type}
                  style={[styles.segmentBtn, category === c.type && styles.segmentBtnActive]}
                  onPress={() => handleCategoryChange(c.type as 'Department' | 'Designations')}
                >
                  <Text style={[styles.segmentText, category === c.type && styles.segmentTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {category === 'Designations' && (
            <View style={styles.fullRow}>
              <Text style={styles.label}>Department *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setDepartmentModal(true)}>
                <Text style={departmentName ? styles.pickerText : styles.placeholder}>
                  {departmentName || 'Select Department'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.fullRow}>
            <Text style={styles.label}>{category === 'Department' ? 'Department Name' : 'Designation Name'} *</Text>
            <TextInput
              style={styles.input}
              placeholder={category === 'Department' ? 'Enter Department Name' : 'Enter Designation Name'}
              placeholderTextColor="#aaa"
              value={name}
              onChangeText={setName}
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
                : <Text style={styles.saveBtnText}>{editId ? 'Update' : 'Add'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Table card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{category === 'Department' ? 'Departments' : 'Designations'}</Text>
          {loading
            ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
            : items.length === 0
              ? <Text style={styles.emptyText}>No Record Found</Text>
              : (
                <View>
                  <View style={styles.thead}>
                    <Text style={[styles.th, { width: 40 }]}>#</Text>
                    <Text style={[styles.th, { flex: 1.4 }]}>{category === 'Department' ? 'Department Name' : 'Designation Name'}</Text>
                    {category === 'Designations' && <Text style={[styles.th, { flex: 1 }]}>Department</Text>}
                    <Text style={[styles.th, { width: 60 }]}>Status</Text>
                    <Text style={[styles.th, { width: 80 }]}>Actions</Text>
                  </View>
                  {items.map((rec, i) => (
                    <View key={rec.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                      <Text style={[styles.td, { width: 40 }]}>{i + 1}</Text>
                      <Text style={[styles.td, { flex: 1.4, textAlign: 'left' }]}>{rec.name}</Text>
                      {category === 'Designations' && (
                        <Text style={[styles.td, { flex: 1 }]}>{rec.department ?? '-'}</Text>
                      )}
                      <View style={[styles.td, { width: 60, alignItems: 'center' }]}>
                        <Switch
                          value={String(rec.status) === '1'}
                          onValueChange={() => handleToggleStatus(rec)}
                          trackColor={{ false: '#ccc', true: '#EF9A9A' }}
                          thumbColor={String(rec.status) === '1' ? R : '#999'}
                        />
                      </View>
                      <View style={[styles.td, styles.actionCell, { width: 80 }]}>
                        <TouchableOpacity onPress={() => handleEdit(rec)} style={styles.iconBtn}>
                          <Icon name="pencil" size={16} color="#1565C0" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(rec)} style={styles.iconBtn}>
                          <Icon name="delete" size={16} color="#C62828" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )
          }
        </View>
      </ScrollView>

      {/* Department dropdown modal (for Designations) */}
      <Modal visible={departmentModal} transparent animationType="fade" onRequestClose={() => setDepartmentModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDepartmentModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Department</Text>
            <ScrollView>
              {departments.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.dropdownItem}
                  onPress={() => { setDepartmentId(d.id); setDepartmentName(d.name); setDepartmentModal(false); }}
                >
                  <Text style={styles.dropdownItemText}>{d.name}</Text>
                </TouchableOpacity>
              ))}
              {departments.length === 0 && <Text style={styles.emptyText}>No departments found.</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default ResourceManager;

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

  fullRow: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 13, color: '#222', backgroundColor: '#FAFAFA',
  },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#FAFAFA', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },

  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentBtn: {
    flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingVertical: 10, alignItems: 'center', backgroundColor: '#FAFAFA',
  },
  segmentBtnActive: { backgroundColor: R, borderColor: R },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#444' },
  segmentTextActive: { color: '#fff' },

  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  saveBtn: { backgroundColor: R, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 22 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#999', borderRadius: 6,
    paddingVertical: 10, paddingHorizontal: 18,
  },
  cancelBtnText: { color: '#555', fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8, alignItems: 'center' },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 6, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 6, textAlign: 'center' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 4 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
