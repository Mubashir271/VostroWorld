import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootState } from '../../../redux/store';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import api from '../../../api/service';

interface DutyHour {
  id: number;
  branch_id: number;
  branch_name: string;
  staff_id: number;
  staff_name: string;
  start_time: string;
  end_time: string;
  day: string;
}

interface StaffGroup {
  staff_id: number;
  staff_name: string;
  branch_name: string;
  branch_id: number;
  slots: DutyHour[];
}

const BRANCH_OPTIONS = [
  { label: 'F 11', value: '1' },
  { label: 'G 13', value: '15' },
  { label: 'All', value: '' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

const to12h = (t: string) => {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const DAY_ORDER = Object.fromEntries(DAYS.map((d, i) => [d, i]));

const StaffDutyHours = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [records, setRecords] = useState<DutyHour[]>([]);
  const [groups, setGroups] = useState<StaffGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedStaff, setExpandedStaff] = useState<Set<number>>(new Set());

  const [formBranch, setFormBranch] = useState(String(branchId));
  const [formStaffId, setFormStaffId] = useState('');
  const [fromTime, setFromTime] = useState(new Date());
  const [toTime, setToTime] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const groupRecords = (list: DutyHour[]): StaffGroup[] => {
    const map = new Map<number, StaffGroup>();
    list.forEach(r => {
      if (!map.has(r.staff_id)) {
        map.set(r.staff_id, {
          staff_id: r.staff_id,
          staff_name: r.staff_name,
          branch_name: r.branch_name,
          branch_id: r.branch_id,
          slots: [],
        });
      }
      map.get(r.staff_id)!.slots.push(r);
    });
    map.forEach(g => g.slots.sort((a, b) => (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99)));
    return Array.from(map.values());
  };

  const load = useCallback(async (isRefresh = false, pageNum = 1) => {
    if (isRefresh) { setRefreshing(true); setPage(1); }
    else if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await api.get('/v1/staff-timing/index', {
        params: { branch_id: branchId, status: 1, limit: 25, page: pageNum },
      });
      const raw = res.data?.data ?? res.data ?? {};
      const list: DutyHour[] = raw.data ?? (Array.isArray(raw) ? raw : []);
      setLastPage(raw.last_page ?? 1);
      const updated = pageNum === 1 ? list : [...records, ...list];
      setRecords(updated);
      setGroups(groupRecords(updated));
      setPage(pageNum);
    } catch {
      if (pageNum === 1) { setRecords([]); setGroups([]); }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [branchId, records]);

  useEffect(() => { load(false, 1); }, [branchId]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!formStaffId.trim()) {
      dispatch(showSnackbar({ message: 'Staff ID is required', type: 'error' }));
      return;
    }
    if (selectedDays.size === 0) {
      dispatch(showSnackbar({ message: 'Select at least one day', type: 'error' }));
      return;
    }
    setSubmitting(true);
    try {
      const startStr = fmtTime(fromTime);
      const endStr = fmtTime(toTime);
      await Promise.all(
        Array.from(selectedDays).map(day =>
          api.post('/v1/staff-timing/store', {
            branch_id: formBranch || branchId,
            staff_id: Number(formStaffId),
            day,
            start_time: startStr,
            end_time: endStr,
          })
        )
      );
      dispatch(showSnackbar({ message: 'Duty hours added successfully', type: 'success' }));
      setFormStaffId('');
      setSelectedDays(new Set());
      load(true, 1);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to add duty hours';
      dispatch(showSnackbar({ message: msg, type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (staffId: number) => {
    setExpandedStaff(prev => {
      const next = new Set(prev);
      next.has(staffId) ? next.delete(staffId) : next.add(staffId);
      return next;
    });
  };

  const filteredGroups = groups.filter(g => {
    const q = search.toLowerCase();
    return !q || g.staff_name.toLowerCase().includes(q) || String(g.staff_id).includes(q);
  });

  const formBranchLabel = BRANCH_OPTIONS.find(b => b.value === formBranch)?.label ?? 'All';

  return (
    <View style={styles.container}>
      <AppHeader
        title="Staff Duty Hours"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true, 1)} colors={['#E63946']} />}
      >
        {/* Add Duty Hours Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Duty Hours</Text>

          <Text style={styles.fieldLabel}>Branch Name *</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowBranchDropdown(v => !v)}>
            <Text style={styles.selectBtnText}>{formBranchLabel}</Text>
            <Icon name="chevron-down" size={16} color="#888" />
          </TouchableOpacity>
          {showBranchDropdown && (
            <View style={styles.inlineDropdown}>
              {BRANCH_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={styles.dropdownItem} onPress={() => { setFormBranch(opt.value); setShowBranchDropdown(false); }}>
                  <Text style={[styles.dropdownText, formBranch === opt.value && styles.dropdownSelected]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>Staff ID *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter staff numeric ID"
            value={formStaffId}
            onChangeText={setFormStaffId}
            keyboardType="numeric"
            placeholderTextColor="#bbb"
          />

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>From *</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowFromPicker(true)}>
                <Icon name="clock-outline" size={14} color="#555" />
                <Text style={styles.selectBtnText}>{fmtTime(fromTime)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>To *</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowToPicker(true)}>
                <Icon name="clock-outline" size={14} color="#555" />
                <Text style={styles.selectBtnText}>{fmtTime(toTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showFromPicker && (
            <DateTimePicker
              value={fromTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, t) => { setShowFromPicker(false); if (t) setFromTime(t); }}
            />
          )}
          {showToPicker && (
            <DateTimePicker
              value={toTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, t) => { setShowToPicker(false); if (t) setToTime(t); }}
            />
          )}

          <Text style={styles.fieldLabel}>Select Days *</Text>
          <View style={styles.daysGrid}>
            {DAYS.map(day => (
              <TouchableOpacity
                key={day}
                style={[styles.dayChip, selectedDays.has(day) && styles.dayChipActive]}
                onPress={() => toggleDay(day)}
              >
                <Icon
                  name={selectedDays.has(day) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={16}
                  color={selectedDays.has(day) ? '#fff' : '#888'}
                />
                <Text style={[styles.dayChipText, selectedDays.has(day) && styles.dayChipTextActive]}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.addBtn, submitting && { opacity: 0.7 }]} onPress={handleAdd} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>Add</Text>}
          </TouchableOpacity>
        </View>

        {/* View Table */}
        <Text style={styles.sectionTitle}>View Duty Hours</Text>
        <View style={styles.searchRow}>
          <Icon name="magnify" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#aaa"
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={16} color="#aaa" /></TouchableOpacity> : null}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
        ) : filteredGroups.length === 0 ? (
          <View style={styles.center}>
            <Icon name="clock-alert-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No duty hours found</Text>
          </View>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colSr]}>#</Text>
              <Text style={[styles.th, styles.colBranch]}>Branch</Text>
              <Text style={[styles.th, styles.colId]}>Staff ID</Text>
              <Text style={[styles.th, { flex: 1 }]}>Name</Text>
              <Text style={[styles.th, styles.colSlots]}>Slots</Text>
              <Text style={[styles.th, styles.colExpand]} />
            </View>
            {filteredGroups.map((g, idx) => (
              <View key={g.staff_id}>
                <TouchableOpacity style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]} onPress={() => toggleExpand(g.staff_id)}>
                  <Text style={[styles.td, styles.colSr]}>{idx + 1}</Text>
                  <Text style={[styles.td, styles.colBranch]}>{g.branch_name}</Text>
                  <Text style={[styles.td, styles.colId]}>{String(g.staff_id)}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{g.staff_name}</Text>
                  <Text style={[styles.td, styles.colSlots]}>{g.slots.length}</Text>
                  <Icon name={expandedStaff.has(g.staff_id) ? 'chevron-up' : 'chevron-down'} size={16} color="#888" style={styles.colExpand} />
                </TouchableOpacity>
                {expandedStaff.has(g.staff_id) && (
                  <View style={styles.expandedBlock}>
                    {g.slots.map(slot => (
                      <View key={slot.id} style={styles.slotRow}>
                        <Icon name="clock-outline" size={14} color="#1E88E5" />
                        <Text style={styles.slotDay}>{slot.day}</Text>
                        <Text style={styles.slotTime}>{to12h(slot.start_time)} – {to12h(slot.end_time)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {page < lastPage && (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => load(false, page + 1)} disabled={loadingMore}>
                {loadingMore ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.loadMoreText}>Load More</Text>}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll: { padding: 16, paddingBottom: 40 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 10 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFAFA', gap: 8 },
  selectBtnText: { fontSize: 14, color: '#333', flex: 1 },
  inlineDropdown: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, marginTop: 4, marginBottom: 4 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownText: { fontSize: 14, color: '#333' },
  dropdownSelected: { color: '#E63946', fontWeight: '700' },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: '#FAFAFA' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#ddd' },
  dayChipActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  dayChipText: { fontSize: 12, color: '#555', fontWeight: '600' },
  dayChipTextActive: { color: '#fff' },
  addBtn: { backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#aaa', marginTop: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E63946', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  th: { fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' },
  td: { fontSize: 12, color: '#333', textAlign: 'center' },
  colSr: { width: 30 },
  colBranch: { width: 50 },
  colId: { width: 80 },
  colSlots: { width: 45 },
  colExpand: { width: 24 },
  expandedBlock: { backgroundColor: '#F0F7FF', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0edf8' },
  slotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  slotDay: { fontSize: 13, fontWeight: '700', color: '#1E88E5', width: 90 },
  slotTime: { fontSize: 13, color: '#555' },
  loadMoreBtn: { marginTop: 12, backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  loadMoreText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default StaffDutyHours;
