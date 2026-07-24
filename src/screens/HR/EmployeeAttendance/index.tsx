import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Platform,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import api from '../../../api/service';

interface Attendee {
  uid: string;
  first_name: string;
  last_name: string;
  image?: string;
}

interface AttendanceRecord {
  id: number;
  branch_id: number;
  attendance_status: string;
  is_late: number;
  date: string;
  duty_hours: string;
  checkin_time_12h: string;
  checkout_time_12h: string;
  working_hours: string;
  designation: string;
  attendee: Attendee;
}

interface Summary {
  on_time: number;
  late: number;
  absent: number;
  leave: number;
}

interface Department {
  id: number | null;
  name: string;
}

const ALL_EMPLOYEES: Department = { id: null, name: 'All Employees' };

const branchName = (uid: string) => {
  if (!uid) return '';
  if (uid.startsWith('SF')) return 'F-11';
  if (uid.startsWith('SG')) return 'G-13';
  return uid.substring(0, 2);
};

// Confirmed live via /v1/branches/get 2026-06-24: id 1 = G 13, id 15 = F 11.
const BRANCH_OPTIONS = [
  { label: 'All Branches', value: '' },
  { label: 'F-11', value: '15' },
  { label: 'G-13', value: '1' },
];

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const PAGE_SIZE = 25;

// Memoized so it never re-renders while `load()` flips `loading`/`records` —
// the tab row was losing its label paint specifically on "All Employees"/
// "Fitness" (the two slowest-loading, highest-row-count depts), consistent
// with a Fabric repaint glitch triggered by the sibling table's reflow
// during its loading-spinner ↔ loaded-table transition. Isolating this row
// from that reflow removes the trigger.
const DeptTabs = React.memo(({ depts, activeDept, onSelect }: {
  depts: Department[];
  activeDept: Department;
  onSelect: (d: Department) => void;
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
    {depts.map(d => (
      <TouchableOpacity key={d.id ?? 'all'} style={[styles.deptTab, activeDept.id === d.id && styles.deptTabActive]} onPress={() => onSelect(d)}>
        <Text style={[styles.deptTabText, activeDept.id === d.id && styles.deptTabTextActive]}>{d.name}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
));

const EmployeeAttendance = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [depts, setDepts] = useState<Department[]>([ALL_EMPLOYEES]);
  const [activeDept, setActiveDept] = useState<Department>(ALL_EMPLOYEES);

  const [summary, setSummary] = useState<Summary>({ on_time: 0, late: 0, absent: 0, leave: 0 });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Canonical department list (id + name) — matches web admin's dept tabs
  // exactly. Attendance rows carry a `designation`, not a department, so
  // filtering has to go through the server via `department_id` rather than
  // guessing a department from the designation text client-side.
  useEffect(() => {
    api.get('/v1/related_things/get-names-list', { params: { type: 'Department' } })
      .then(res => {
        const list: Department[] = (res.data?.data ?? []).map((d: any) => ({ id: d.id, name: d.name }));
        setDepts([ALL_EMPLOYEES, ...list]);
      })
      .catch(() => {});
  }, []);

  // Fetches every page for the selected day/branch/department (a single
  // day's roster is small, ~90 rows max at "All Branches") so it can be
  // paginated 25/page client-side to match the web admin's page controls.
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const dateStr = fmtDate(selectedDate);
    const bid = selectedBranch;
    const indexParams: Record<string, any> = { category: 2, branch_id: bid, start_date: dateStr, end_date: dateStr, limit: 100 };
    if (activeDept.id != null) indexParams.department_id = activeDept.id;

    const [summaryRes, firstRes, countRes] = await Promise.allSettled([
      api.get('/v1/attendance/summery', { params: { branch_id: bid } }),
      api.get('/v1/attendance/index', { params: { ...indexParams, page: 1 } }),
      // "Total Employees" headcount — distinct from the attendance list's row
      // count, which only includes staff with an attendance record for the
      // selected day. Confirmed live via HAR 2026-07-07.
      api.get('/v1/auth/count', { params: { branch_id: bid } }),
    ]);

    if (summaryRes.status === 'fulfilled') {
      const s = summaryRes.value.data?.data ?? summaryRes.value.data ?? {};
      setSummary({ on_time: s.on_time ?? 0, late: s.late ?? 0, absent: s.absent ?? 0, leave: s.leave ?? 0 });
    }

    if (countRes.status === 'fulfilled') {
      setTotal(countRes.value.data?.data ?? 0);
    } else {
      setTotal(0);
    }

    if (firstRes.status === 'fulfilled') {
      const raw = firstRes.value.data?.data ?? firstRes.value.data ?? {};
      const list: AttendanceRecord[] = raw.data ?? [];
      const lastPage: number = raw.last_page ?? 1;
      if (lastPage > 1) {
        const rest = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) => api.get('/v1/attendance/index', { params: { ...indexParams, page: i + 2 } })),
        );
        rest.forEach(r => list.push(...(r.data?.data?.data ?? r.data?.data ?? [])));
      }
      setRecords(list);
    } else {
      setRecords([]);
    }

    setPage(1);
    setLoading(false);
    setRefreshing(false);
  }, [selectedDate, selectedBranch, activeDept]);

  useEffect(() => { load(false); }, [load]);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return !q ||
      r.attendee?.first_name?.toLowerCase().includes(q) ||
      r.attendee?.last_name?.toLowerCase().includes(q) ||
      r.attendee?.uid?.toLowerCase().includes(q) ||
      r.designation?.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const selectedBranchLabel = BRANCH_OPTIONS.find(b => b.value === selectedBranch)?.label ?? 'All Branches';

  return (
    <View style={styles.container}>
      <AppHeader
        title="Employee Attendance"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
      />

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{total}</Text>
          <Text style={styles.summaryLbl}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#43A047' }]}>{summary.on_time}</Text>
          <Text style={styles.summaryLbl}>On Time</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#FB8C00' }]}>{summary.late}</Text>
          <Text style={styles.summaryLbl}>Late In</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#E63946' }]}>{summary.absent}</Text>
          <Text style={styles.summaryLbl}>Absent</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#1E88E5' }]}>{summary.leave}</Text>
          <Text style={styles.summaryLbl}>On Leave</Text>
        </View>
      </View>

      {/* Dept Tabs */}
      <DeptTabs depts={depts} activeDept={activeDept} onSelect={setActiveDept} />

      {/* Filters Row */}
      <View style={styles.filtersRow}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowBranchDropdown(v => !v)}>
          <Icon name="office-building" size={14} color="#555" />
          <Text style={styles.filterBtnText}>{selectedBranchLabel}</Text>
          <Icon name="chevron-down" size={14} color="#888" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar" size={14} color="#555" />
          <Text style={styles.filterBtnText}>{fmtDate(selectedDate)}</Text>
        </TouchableOpacity>
      </View>

      {showBranchDropdown && (
        <View style={styles.dropdown}>
          {BRANCH_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.value} style={styles.dropdownItem} onPress={() => { setSelectedBranch(opt.value); setShowBranchDropdown(false); }}>
              <Text style={[styles.dropdownText, selectedBranch === opt.value && { color: '#E63946', fontWeight: '700' }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_, date) => { setShowDatePicker(false); if (date) setSelectedDate(date); }}
        />
      )}

      {/* Search */}
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

      {/* Always mounted, same shape whether loading or not — swapping this
          subtree for a small centered spinner on every load() call was
          triggering a full-tree relayout that reached the dept tab row
          above (worse the bigger the resulting table, hence "All Employees"/
          "Fitness" being the most visibly affected). An overlay keeps the
          tree shape constant regardless of how much data comes back. */}
      <View style={styles.contentArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          {/* Table Header */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colSr]}>#</Text>
                <Text style={[styles.th, styles.colId]}>EMP ID</Text>
                <Text style={[styles.th, styles.colName]}>Name / Designation</Text>
                <Text style={[styles.th, styles.colDuty]}>Duty Hrs</Text>
                <Text style={[styles.th, styles.colBranch]}>Branch</Text>
                <Text style={[styles.th, styles.colDate]}>Date</Text>
                <Text style={[styles.th, styles.colDay]}>Day</Text>
                <Text style={[styles.th, styles.colTime]}>Clock In</Text>
                <Text style={[styles.th, styles.colTime]}>Clock Out</Text>
                <Text style={[styles.th, styles.colStatus]}>Status</Text>
                <Text style={[styles.th, styles.colLate]}>Late</Text>
                <Text style={[styles.th, styles.colWork]}>Work Hrs</Text>
              </View>
              {pagedRows.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Icon name="calendar-blank" size={40} color="#ddd" />
                  <Text style={styles.emptyText}>No attendance records</Text>
                </View>
              ) : (
                pagedRows.map((rec, idx) => {
                  const dateObj = new Date(rec.date + 'T00:00:00');
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const fullName = `${rec.attendee?.first_name ?? ''} ${rec.attendee?.last_name ?? ''}`.trim();
                  const isLate = rec.is_late === 1;
                  return (
                    <View key={rec.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                      <Text style={[styles.td, styles.colSr]}>{(page - 1) * PAGE_SIZE + idx + 1}</Text>
                      <Text style={[styles.td, styles.colId]}>{rec.attendee?.uid ?? '-'}</Text>
                      <View style={[styles.colName, styles.colNameRow]}>
                        {rec.attendee?.image ? (
                          <FastImage source={{ uri: rec.attendee.image }} style={styles.avatar} />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            <Icon name="account" size={16} color="#bbb" />
                          </View>
                        )}
                        <View style={styles.colNameText}>
                          <Text style={styles.tdName}>{fullName || '-'}</Text>
                          <Text style={styles.tdDesig}>{rec.designation ?? ''}</Text>
                        </View>
                      </View>
                      <Text style={[styles.td, styles.colDuty]}>{rec.duty_hours ?? '-'}</Text>
                      <Text style={[styles.td, styles.colBranch]}>{branchName(rec.attendee?.uid ?? '')}</Text>
                      <Text style={[styles.td, styles.colDate]}>{rec.date}</Text>
                      <Text style={[styles.td, styles.colDay]}>{dayName}</Text>
                      <Text style={[styles.td, styles.colTime]}>{rec.checkin_time_12h ?? '-'}</Text>
                      <Text style={[styles.td, styles.colTime]}>{rec.checkout_time_12h ?? '-'}</Text>
                      <Text style={[styles.td, styles.colStatus, rec.attendance_status === 'Present' ? styles.statusPresent : styles.statusAbsent]}>
                        {rec.attendance_status ?? '-'}
                      </Text>
                      <Text style={[styles.td, styles.colLate, isLate && styles.lateCell]}>{isLate ? 'Yes' : 'No'}</Text>
                      <Text style={[styles.td, styles.colWork]}>{rec.working_hours ?? '-'}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          {filtered.length > PAGE_SIZE && (
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
        </ScrollView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#E63946" />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  summaryBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  summaryLbl: { fontSize: 10, color: '#888', marginTop: 2 },
  tabScroll: { flexGrow: 0, height: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabContent: { alignItems: 'center', paddingHorizontal: 10, gap: 6 },
  deptTab: { justifyContent: 'center', alignItems: 'center', minHeight: 32, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F0F0F0', marginRight: 6 },
  deptTabActive: { backgroundColor: '#E63946' },
  deptTabText: { fontSize: 12, color: '#666', fontWeight: '600' },
  deptTabTextActive: { color: '#fff' },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F6FA', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  filterBtnText: { fontSize: 13, color: '#333', fontWeight: '600' },
  dropdown: { position: 'absolute', top: 160, left: 12, zIndex: 100, backgroundColor: '#fff', borderRadius: 10, elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, minWidth: 160, borderWidth: 1, borderColor: '#eee' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownText: { fontSize: 14, color: '#333' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  contentArea: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245,246,250,0.85)', alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 30 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E63946', paddingVertical: 10, paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  th: { fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' },
  td: { fontSize: 11, color: '#333', textAlign: 'center', alignSelf: 'center' },
  tdName: { fontSize: 12, color: '#1a1a1a', fontWeight: '700' },
  tdDesig: { fontSize: 10, color: '#888', marginTop: 1 },
  colSr: { width: 30 },
  colId: { width: 90 },
  colName: { width: 170, paddingHorizontal: 4 },
  colNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colNameText: { flexShrink: 1 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee' },
  avatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  colDuty: { width: 110 },
  colBranch: { width: 50 },
  colDate: { width: 90 },
  colDay: { width: 40 },
  colTime: { width: 90 },
  colStatus: { width: 70 },
  colLate: { width: 45 },
  colWork: { width: 70 },
  statusPresent: { color: '#43A047', fontWeight: '700' },
  statusAbsent: { color: '#E63946', fontWeight: '700' },
  lateCell: { color: '#E63946', fontWeight: '700' },
  emptyRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 14, color: '#aaa', marginTop: 10 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, marginBottom: 16, flexWrap: 'wrap' },
  pageEdgeText: { fontSize: 12, fontWeight: '700', color: '#E63946' },
  pageArrow: { fontSize: 16, fontWeight: '700', color: '#E63946', paddingHorizontal: 4 },
  pageDisabledText: { color: '#BBB' },
  pageNumScroll: { flexGrow: 0, maxWidth: 220 },
  pageNum: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  pageNumActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },
});

export default EmployeeAttendance;
