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

interface Attendee {
  uid: string;
  first_name: string;
  last_name: string;
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

const DESIGNATION_DEPT: Record<string, string> = {
  'Personal Trainer': 'Fitness',
  'General Trainer': 'Fitness',
  'Housekeeper': 'Housekeeping',
  'Housekeeping Supervisor': 'Housekeeping',
  'Towel Counter': 'Facility and Maintenance',
  'Electrician': 'Facility and Maintenance',
  'Sales Manager': 'Sales',
  'Assistant Manager Sales': 'Sales',
  'Nutritionist': 'Nutrition',
  'HR Manager': 'Human Resource',
  'HR Intern': 'Human Resource',
  'Cafe Assistant': 'Cafe',
  'Accounts and Finance Manager': 'Accounts & Finance',
  'Physiotherapist': 'Physiotherapy',
  'Director': 'Managements & Directors',
  'Executive Director': 'Managements & Directors',
  'Videographer': 'Media & Marketing',
  'Content Strategist': 'Media & Marketing',
};

const getDept = (designation: string): string => {
  if (!designation) return 'Other';
  if (DESIGNATION_DEPT[designation]) return DESIGNATION_DEPT[designation];
  const lower = designation.toLowerCase();
  if (lower.includes('trainer')) return 'Fitness';
  if (lower.includes('house')) return 'Housekeeping';
  if (lower.includes('sales')) return 'Sales';
  if (lower.includes('nutrition')) return 'Nutrition';
  if (lower.includes('hr') || lower.includes('human')) return 'Human Resource';
  if (lower.includes('cafe')) return 'Cafe';
  if (lower.includes('account') || lower.includes('finance')) return 'Accounts & Finance';
  if (lower.includes('physio')) return 'Physiotherapy';
  if (lower.includes('director') || lower.includes('manager')) return 'Managements & Directors';
  if (lower.includes('media') || lower.includes('market')) return 'Media & Marketing';
  return 'Other';
};

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

const fmtDate = (d: Date) => d.toISOString().split('T')[0];

const EmployeeAttendance = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>(String(branchId));
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [activeDept, setActiveDept] = useState('All Employees');

  const [summary, setSummary] = useState<Summary>({ on_time: 0, late: 0, absent: 0, leave: 0 });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (isRefresh = false, pageNum = 1) => {
    if (isRefresh) { setRefreshing(true); setPage(1); }
    else if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    const dateStr = fmtDate(selectedDate);
    const bid = selectedBranch || String(branchId);

    const [summaryRes, listRes] = await Promise.allSettled([
      api.get('/v1/attendance/summery', { params: { branch_id: bid } }),
      api.get('/v1/attendance/index', {
        params: { category: 2, branch_id: bid, start_date: dateStr, end_date: dateStr, limit: 25, page: pageNum },
      }),
    ]);

    if (summaryRes.status === 'fulfilled') {
      const s = summaryRes.value.data?.data ?? summaryRes.value.data ?? {};
      setSummary({ on_time: s.on_time ?? 0, late: s.late ?? 0, absent: s.absent ?? 0, leave: s.leave ?? 0 });
    }

    if (listRes.status === 'fulfilled') {
      const raw = listRes.value.data?.data ?? listRes.value.data ?? {};
      const list: AttendanceRecord[] = raw.data ?? [];
      setTotal(raw.total ?? list.length);
      setLastPage(raw.last_page ?? 1);
      if (pageNum === 1) setRecords(list);
      else setRecords(prev => [...prev, ...list]);
      setPage(pageNum);
    } else {
      if (pageNum === 1) setRecords([]);
    }

    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [selectedDate, selectedBranch, branchId]);

  useEffect(() => { load(false, 1); }, [load]);

  const depts = ['All Employees', ...Array.from(new Set(records.map(r => getDept(r.designation)).filter(Boolean)))].sort((a, b) => a === 'All Employees' ? -1 : b === 'All Employees' ? 1 : a.localeCompare(b));

  const filtered = records.filter(r => {
    const dept = getDept(r.designation);
    const matchDept = activeDept === 'All Employees' || dept === activeDept;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.attendee?.first_name?.toLowerCase().includes(q) ||
      r.attendee?.last_name?.toLowerCase().includes(q) ||
      r.attendee?.uid?.toLowerCase().includes(q) ||
      r.designation?.toLowerCase().includes(q);
    return matchDept && matchSearch;
  });

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {depts.map(d => (
          <TouchableOpacity key={d} style={[styles.deptTab, activeDept === d && styles.deptTabActive]} onPress={() => setActiveDept(d)}>
            <Text style={[styles.deptTabText, activeDept === d && styles.deptTabTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true, 1)} colors={['#E63946']} />}
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
              {filtered.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Icon name="calendar-blank" size={40} color="#ddd" />
                  <Text style={styles.emptyText}>No attendance records</Text>
                </View>
              ) : (
                filtered.map((rec, idx) => {
                  const dateObj = new Date(rec.date + 'T00:00:00');
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const fullName = `${rec.attendee?.first_name ?? ''} ${rec.attendee?.last_name ?? ''}`.trim();
                  const isLate = rec.is_late === 1;
                  return (
                    <View key={rec.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                      <Text style={[styles.td, styles.colSr]}>{idx + 1}</Text>
                      <Text style={[styles.td, styles.colId]}>{rec.attendee?.uid ?? '-'}</Text>
                      <View style={styles.colName}>
                        <Text style={styles.tdName}>{fullName || '-'}</Text>
                        <Text style={styles.tdDesig}>{rec.designation ?? ''}</Text>
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

          {page < lastPage && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={() => load(false, page + 1)} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.loadMoreText}>Load More</Text>}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  summaryBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  summaryLbl: { fontSize: 10, color: '#888', marginTop: 2 },
  tabScroll: { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  deptTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F0F0F0', marginRight: 6 },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
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
  colName: { width: 140, paddingHorizontal: 4 },
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
  loadMoreBtn: { margin: 16, backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  loadMoreText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default EmployeeAttendance;
