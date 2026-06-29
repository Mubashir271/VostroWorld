import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import {
  getStaffList, getBranchesNameList, getDepartmentNames, getDesignationNames,
} from '../../../api/employeeDashboard';

// Rebuilt 2026-06-29 to match the web admin's "View Staff" page, confirmed
// via a HAR network capture (not guessed): the page fetches `/v1/auth/get`
// with `branch_id`/`status`/`department_id`/`gender` as real query params
// (Branch/Status/Department/"Select Type" = gender), while "Select
// Designation" has no corresponding query param in the capture — it's a
// client-side filter on the already-fetched rows. Branch/Department/
// Designation dropdown options come from three small `{id,name}` list
// endpoints also confirmed in the capture (`getBranchesNameList`,
// `getDepartmentNames`, `getDesignationNames`). Branch defaults to "All"
// (no `branch_id` sent) since HR users aren't tied to one branch.
interface Option { id: number; name: string; }
interface StaffRow {
  id: number;
  name: string;
  father_name?: string;
  branch_name?: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  gender?: string;
  status?: string;
}

const GENDER_OPTIONS = ['Male', 'Female'];
const PAGE_SIZE = 25;

const COLS = [
  { key: 'sr', label: 'Sr#', width: 36 },
  { key: 'name', label: 'Name', width: 140 },
  { key: 'father', label: 'Father Name', width: 130 },
  { key: 'branch', label: 'Branch Name', width: 80 },
  { key: 'designation', label: 'Designation', width: 130 },
  { key: 'department', label: 'Department', width: 130 },
  { key: 'email', label: 'Email', width: 170 },
  { key: 'phone', label: 'Phone', width: 120 },
  { key: 'gender', label: 'Gender', width: 70 },
  { key: 'status', label: 'Status', width: 70 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const ViewStaff = () => {
  const navigation = useNavigation<any>();

  const [branches, setBranches] = useState<Option[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [branchModal, setBranchModal] = useState(false);

  const [departments, setDepartments] = useState<Option[]>([]);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [departmentModal, setDepartmentModal] = useState(false);

  const [designations, setDesignations] = useState<Option[]>([]);
  const [designationName, setDesignationName] = useState('');
  const [designationModal, setDesignationModal] = useState(false);

  const [gender, setGender] = useState('');
  const [genderModal, setGenderModal] = useState(false);

  const [status, setStatus] = useState<'1' | '0'>('1');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const loadFilters = useCallback(async () => {
    try {
      const [b, d, des] = await Promise.all([
        getBranchesNameList(), getDepartmentNames(), getDesignationNames(),
      ]);
      setBranches(b?.data ?? []);
      setDepartments(d?.data ?? []);
      setDesignations(des?.data ?? []);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getStaffList({
        branch_id: branchId ?? undefined,
        department_id: departmentId ?? undefined,
        gender: gender || undefined,
        status: Number(status),
        limit: 100,
      });
      const data: StaffRow[] = res?.data?.data ?? [];
      setRows(data);
    } catch (e: any) {
      const code = e?.response?.status;
      if (code === 404 || code === 422) setRows([]);
      else setError(e?.response?.data?.message || 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  }, [branchId, departmentId, gender, status]);

  useFocusEffect(useCallback(() => { loadFilters(); load(); }, [loadFilters, load]));

  const visibleRows = rows.filter(r => {
    if (designationName && r.designation !== designationName) return false;
    if (search.trim() && !r.name?.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  useEffect(() => { setPage(1); }, [designationName, search, rows]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const pagedRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <View style={styles.root}>
      <AppHeader
        title="View Staff"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filters</Text>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Branch</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setBranchModal(true)}>
                <Text style={styles.pickerText}>
                  {branchId ? branches.find(b => b.id === branchId)?.name ?? 'Branch' : 'All Branches'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Search By Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                placeholderTextColor="#aaa"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Select Type</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setGenderModal(true)}>
                <Text style={gender ? styles.pickerText : styles.placeholder}>{gender || 'Select Type'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Select Department</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setDepartmentModal(true)}>
                <Text style={departmentId ? styles.pickerText : styles.placeholder}>
                  {departmentId ? departments.find(d => d.id === departmentId)?.name : 'Select Department'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Select Designation</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setDesignationModal(true)}>
                <Text style={designationName ? styles.pickerText : styles.placeholder}>{designationName || 'Select Designation'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.pillRow}>
                {(['1', '0'] as const).map(s => (
                  <TouchableOpacity key={s} style={[styles.pill, status === s && styles.pillActive]} onPress={() => setStatus(s)}>
                    <Text style={[styles.pillText, status === s && styles.pillTextActive]}>{s === '1' ? 'Active' : 'Inactive'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Search</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{status === '1' ? 'Active' : 'Inactive'} Staff ({visibleRows.length})</Text>
          {loading
            ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
            : visibleRows.length === 0
              ? <Text style={styles.emptyText}>No staff found.</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ width: TABLE_W }}>
                    <View style={styles.thead}>
                      {COLS.map(c => (
                        <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                      ))}
                    </View>
                    {pagedRows.map((r, i) => (
                      <View key={r.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, { width: COLS[0].width }]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                        <Text style={[styles.td, { width: COLS[1].width, textAlign: 'left' }]} numberOfLines={1}>{r.name ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]} numberOfLines={1}>{r.father_name ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[3].width }]}>{r.branch_name ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[4].width, textAlign: 'left' }]} numberOfLines={1}>{r.designation ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[5].width, textAlign: 'left' }]} numberOfLines={1}>{r.department ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[6].width, textAlign: 'left' }]} numberOfLines={1}>{r.email ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[7].width }]}>{r.phone ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[8].width }]}>{r.gender ?? '-'}</Text>
                        <Text style={[styles.td, { width: COLS[9].width, color: r.status === '1' ? '#2E7D32' : '#C62828', fontWeight: '700' }]}>
                          {r.status === '1' ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )
          }
          {!loading && visibleRows.length > PAGE_SIZE && (
            <View style={styles.pagination}>
              <TouchableOpacity disabled={page === 1} onPress={() => setPage(1)}>
                <Text style={[styles.pageEdgeText, page === 1 && styles.pageDisabledText]}>First Page</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={page === 1} onPress={() => setPage(p => Math.max(1, p - 1))}>
                <Text style={[styles.pageArrow, page === 1 && styles.pageDisabledText]}>‹</Text>
              </TouchableOpacity>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumScroll}>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
                  <TouchableOpacity key={n} onPress={() => setPage(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
                    <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(p => Math.min(totalPages, p + 1))}>
                <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabledText]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(totalPages)}>
                <Text style={[styles.pageEdgeText, page === totalPages && styles.pageDisabledText]}>Last Page</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={branchModal} transparent animationType="fade" onRequestClose={() => setBranchModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBranchModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Branch</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setBranchId(null); setBranchModal(false); }}>
                <Text style={styles.dropdownItemText}>All Branches</Text>
              </TouchableOpacity>
              {branches.map(b => (
                <TouchableOpacity key={b.id} style={styles.dropdownItem} onPress={() => { setBranchId(b.id); setBranchModal(false); }}>
                  <Text style={styles.dropdownItemText}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={departmentModal} transparent animationType="fade" onRequestClose={() => setDepartmentModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDepartmentModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Department</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setDepartmentId(null); setDepartmentModal(false); }}>
                <Text style={styles.dropdownItemText}>All Departments</Text>
              </TouchableOpacity>
              {departments.map(d => (
                <TouchableOpacity key={d.id} style={styles.dropdownItem} onPress={() => { setDepartmentId(d.id); setDepartmentModal(false); }}>
                  <Text style={styles.dropdownItemText}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={designationModal} transparent animationType="fade" onRequestClose={() => setDesignationModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDesignationModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Designation</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setDesignationName(''); setDesignationModal(false); }}>
                <Text style={styles.dropdownItemText}>All Designations</Text>
              </TouchableOpacity>
              {designations.map(d => (
                <TouchableOpacity key={d.id} style={styles.dropdownItem} onPress={() => { setDesignationName(d.name); setDesignationModal(false); }}>
                  <Text style={styles.dropdownItemText}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={genderModal} transparent animationType="fade" onRequestClose={() => setGenderModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGenderModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Type</Text>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setGender(''); setGenderModal(false); }}>
              <Text style={styles.dropdownItemText}>All</Text>
            </TouchableOpacity>
            {GENDER_OPTIONS.map(g => (
              <TouchableOpacity key={g} style={styles.dropdownItem} onPress={() => { setGender(g); setGenderModal(false); }}>
                <Text style={styles.dropdownItemText}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default ViewStaff;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  errText: { color: R, fontSize: 13, marginHorizontal: 4, marginBottom: 8, fontWeight: '500' },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  col2: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9, fontSize: 13,
    color: '#222', backgroundColor: '#FAFAFA',
  },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 6, paddingVertical: 10, alignItems: 'center', backgroundColor: '#FAFAFA' },
  pillActive: { backgroundColor: R, borderColor: R },
  pillText: { fontSize: 13, color: '#555', fontWeight: '600' },
  pillTextActive: { color: '#FFF' },

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 12 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  pageEdgeText: { fontSize: 12, fontWeight: '700', color: R },
  pageArrow: { fontSize: 16, fontWeight: '700', color: R, paddingHorizontal: 4 },
  pageDisabledText: { color: '#BBB' },
  pageNumScroll: { flexGrow: 0, maxWidth: 220 },
  pageNum: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  pageNumActive: { backgroundColor: R, borderColor: R },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
