import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  getAllLeaveQuota,
  addLeaveQuota,
  updateLeaveQuota,
  deleteLeaveQuota,
  getStaffList,
} from '../../../api/employeeDashboard';

interface QuotaRecord {
  id: number;
  branch_id?: number;
  branch_name?: string;
  user_id?: number;
  staff_name?: string;
  name?: string;
  leave_type: string;
  number_of_leaves: number;
  status?: string | number;
}

interface Staff { id: number; name: string; }

const LEAVE_TYPES = ['Medical', 'Casual', 'Annual'];

const COLS = [
  { key: 'sr',      label: 'Sr#',           width: 50  },
  { key: 'branch',  label: 'Branch Name',   width: 110 },
  { key: 'staff',   label: 'Staff',         width: 175 },
  { key: 'type',    label: 'Leave Type',    width: 110 },
  { key: 'no',      label: 'No. of Leaves', width: 110 },
  { key: 'status',  label: 'Status',        width: 90  },
  { key: 'actions', label: 'Actions',       width: 220 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const STATUS_LABEL = (s: any) => {
  if (s === 1 || s === '1' || s === 'Active') return 'Active';
  return 'Inactive';
};
const STATUS_COLOR = (s: any) => STATUS_LABEL(s) === 'Active' ? '#1B5E20' : '#B71C1C';
const STATUS_BG = (s: any) => STATUS_LABEL(s) === 'Active' ? '#E8F5E9' : '#FFEBEE';

const LeaveQuota = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branch_name ?? 'Branch';

  const [records, setRecords] = useState<QuotaRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form
  const [addStaffId, setAddStaffId] = useState('');
  const [addStaffName, setAddStaffName] = useState('');
  const [addLeaveType, setAddLeaveType] = useState('Medical');
  const [addNoLeaves, setAddNoLeaves] = useState('');

  // Update modal
  const [editRecord, setEditRecord] = useState<QuotaRecord | null>(null);
  const [editLeaveType, setEditLeaveType] = useState('Medical');
  const [editNoLeaves, setEditNoLeaves] = useState('');

  // Filter
  const [filterStaffId, setFilterStaffId] = useState('');
  const [filterStaffName, setFilterStaffName] = useState('');

  // Dropdown modals
  const [staffModal, setStaffModal] = useState(false);
  const [addTypeModal, setAddTypeModal] = useState(false);
  const [editTypeModal, setEditTypeModal] = useState(false);
  const [filterStaffModal, setFilterStaffModal] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { branch_id: branchId, limit: 500 };
      if (filterStaffId) params.user_id = parseInt(filterStaffId, 10);
      const res = await getAllLeaveQuota(params);
      const rows: QuotaRecord[] = res?.data?.data ?? res?.data ?? [];
      setRecords(Array.isArray(rows) ? rows : []);
    } catch {
      setError('Failed to load leave quotas.');
    } finally {
      setLoading(false);
    }
  }, [branchId, filterStaffId]);

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

  const handleAdd = async () => {
    if (!addStaffId) { setError('Please select a staff member.'); return; }
    if (!addLeaveType) { setError('Please select a leave type.'); return; }
    if (!addNoLeaves || isNaN(Number(addNoLeaves)) || Number(addNoLeaves) <= 0) {
      setError('No. of Leaves must be a positive number.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addLeaveQuota({
        branch_id: branchId,
        user_id: parseInt(addStaffId, 10),
        leave_type: addLeaveType,
        number_of_leaves: parseInt(addNoLeaves, 10),
      });
      flash('Leave quota added successfully.');
      setAddStaffId('');
      setAddStaffName('');
      setAddLeaveType('Medical');
      setAddNoLeaves('');
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to add leave quota.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (rec: QuotaRecord) => {
    setEditRecord(rec);
    setEditLeaveType(rec.leave_type);
    setEditNoLeaves(String(rec.number_of_leaves));
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    if (!editNoLeaves || isNaN(Number(editNoLeaves)) || Number(editNoLeaves) <= 0) {
      setError('No. of Leaves must be a positive number.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updateLeaveQuota(editRecord.id, {
        leave_type: editLeaveType,
        number_of_leaves: parseInt(editNoLeaves, 10),
      });
      flash('Leave quota updated.');
      setEditRecord(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const handleInactive = async (rec: QuotaRecord) => {
    try {
      await deleteLeaveQuota(rec.id);
      flash('Leave quota set to inactive.');
      load();
    } catch {
      setError('Failed to update status.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteLeaveQuota(id);
      flash('Leave quota deleted.');
      load();
    } catch {
      setError('Failed to delete.');
    }
  };

  const displayed = filterStaffId
    ? records.filter(r => String(r.user_id) === filterStaffId)
    : records;

  return (
    <View style={styles.root}>
      <AppHeader
        title="Leave Quota"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* ── Add form card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Leave Quota</Text>
          <Text style={styles.hint}>! The Fields With *Must Required Or Fill.</Text>

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          {/* Row: Branch | Staff | Leave Type */}
          <View style={styles.row3}>
            <View style={styles.col3}>
              <Text style={styles.label}>Branch Name*</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Staff Name *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setStaffModal(true)}>
                <Text style={addStaffName ? styles.pickerText : styles.placeholder}>
                  {addStaffName || 'Select Staff'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Leave Type*</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setAddTypeModal(true)}>
                <Text style={styles.pickerText}>{addLeaveType}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* No of Leaves + Add button */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>No. Of Leaves*</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter No. Of Leaves"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={addNoLeaves}
                onChangeText={v => setAddNoLeaves(v)}
              />
            </View>
            <View style={[styles.col2, styles.addBtnWrapper]}>
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
          </View>
        </View>

        {/* ── Table card ── */}
        <View style={styles.card}>
          {/* Staff filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Select Staff</Text>
            <TouchableOpacity style={styles.filterPicker} onPress={() => setFilterStaffModal(true)}>
              <Text style={filterStaffName ? styles.pickerText : styles.placeholder}>
                {filterStaffName || 'Select Name'}
              </Text>
              <Icon name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
            {!!filterStaffId && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setFilterStaffId(''); setFilterStaffName(''); }}>
                <Icon name="close-circle" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {loading
            ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
            : displayed.length === 0
              ? <Text style={styles.emptyText}>No leave quotas found.</Text>
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
                    {displayed.map((rec, i) => (
                      <View key={rec.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, { width: COLS[0].width }]}>{i + 1}</Text>
                        <Text style={[styles.td, { width: COLS[1].width }]}>{rec.branch_name ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[2].width }]}>{rec.staff_name ?? rec.name ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[3].width }]}>{rec.leave_type}</Text>
                        <Text style={[styles.td, { width: COLS[4].width }]}>{rec.number_of_leaves}</Text>
                        <View style={[styles.td, { width: COLS[5].width }]}>
                          <View style={[styles.badge, { backgroundColor: STATUS_BG(rec.status) }]}>
                            <Text style={[styles.badgeText, { color: STATUS_COLOR(rec.status) }]}>
                              {STATUS_LABEL(rec.status)}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.td, styles.actionCell, { width: COLS[6].width }]}>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(rec)}>
                            <Icon name="refresh" size={13} color="#1565C0" />
                            <Text style={[styles.actionBtnText, { color: '#1565C0' }]}> Update</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => handleInactive(rec)}>
                            <Icon name="minus-circle-outline" size={13} color="#E65100" />
                            <Text style={[styles.actionBtnText, { color: '#E65100' }]}> Inactive</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(rec.id)}>
                            <Icon name="delete-outline" size={13} color="#C62828" />
                            <Text style={[styles.actionBtnText, { color: '#C62828' }]}> Delete</Text>
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

      {/* Update modal */}
      <Modal visible={!!editRecord} transparent animationType="fade" onRequestClose={() => setEditRecord(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditRecord(null)}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Update Leave Quota</Text>
            {!!error && <Text style={styles.errText}>{error}</Text>}

            <Text style={styles.label}>Leave Type*</Text>
            <TouchableOpacity style={[styles.picker, { marginBottom: 12 }]} onPress={() => setEditTypeModal(true)}>
              <Text style={styles.pickerText}>{editLeaveType}</Text>
              <Icon name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>

            <Text style={styles.label}>No. Of Leaves*</Text>
            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              keyboardType="numeric"
              value={editNoLeaves}
              onChangeText={setEditNoLeaves}
              placeholder="Number of leaves"
              placeholderTextColor="#aaa"
            />

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditRecord(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, saving && styles.addBtnDisabled]}
                onPress={handleUpdate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.addBtnText}>Update</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Leave Type modal */}
      <Modal visible={editTypeModal} transparent animationType="fade" onRequestClose={() => setEditTypeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditTypeModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Leave Type</Text>
            {LEAVE_TYPES.map(t => (
              <TouchableOpacity key={t} style={styles.dropdownItem}
                onPress={() => { setEditLeaveType(t); setEditTypeModal(false); }}>
                <Text style={styles.dropdownItemText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Staff modal */}
      <Modal visible={staffModal} transparent animationType="fade" onRequestClose={() => setStaffModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStaffModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Staff</Text>
            <ScrollView>
              {staffList.map(s => (
                <TouchableOpacity key={s.id} style={styles.dropdownItem}
                  onPress={() => { setAddStaffId(String(s.id)); setAddStaffName(s.name); setStaffModal(false); }}>
                  <Text style={styles.dropdownItemText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
              {staffList.length === 0 && <Text style={styles.emptyText}>No staff found.</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Leave Type modal */}
      <Modal visible={addTypeModal} transparent animationType="fade" onRequestClose={() => setAddTypeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddTypeModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Leave Type</Text>
            {LEAVE_TYPES.map(t => (
              <TouchableOpacity key={t} style={styles.dropdownItem}
                onPress={() => { setAddLeaveType(t); setAddTypeModal(false); }}>
                <Text style={[styles.dropdownItemText, addLeaveType === t && { color: '#C62828', fontWeight: '700' }]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Staff modal */}
      <Modal visible={filterStaffModal} transparent animationType="fade" onRequestClose={() => setFilterStaffModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterStaffModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Staff</Text>
            <ScrollView>
              {staffList.map(s => (
                <TouchableOpacity key={s.id} style={styles.dropdownItem}
                  onPress={() => { setFilterStaffId(String(s.id)); setFilterStaffName(s.name); setFilterStaffModal(false); }}>
                  <Text style={styles.dropdownItemText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
              {staffList.length === 0 && <Text style={styles.emptyText}>No staff found.</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default LeaveQuota;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  hint: { fontSize: 12, color: '#666', marginBottom: 12, fontStyle: 'italic' },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  successText: { color: '#2E7D32', fontSize: 13, marginBottom: 8, fontWeight: '500' },

  row3: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col3: { flex: 1 },
  row2: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  col2: { flex: 1 },
  addBtnWrapper: { justifyContent: 'flex-end' },

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

  addBtn: { backgroundColor: R, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 24, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#444', width: 90 },
  filterPicker: {
    flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  clearBtn: { padding: 4 },

  // table
  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 6, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 4, textAlign: 'center', alignSelf: 'center' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'nowrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 4 },
  actionBtnText: { fontSize: 11, fontWeight: '600' },

  badge: { borderRadius: 4, paddingVertical: 3, paddingHorizontal: 7, alignSelf: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  // modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400,
  },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },

  editBox: {
    backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '85%',
  },
  editTitle: { fontWeight: '700', fontSize: 16, marginBottom: 14, color: '#1A1A1A' },

  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#999', borderRadius: 6,
    paddingVertical: 10, paddingHorizontal: 18,
  },
  cancelBtnText: { color: '#555', fontSize: 13 },
});
