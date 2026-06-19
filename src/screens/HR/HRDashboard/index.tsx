import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Pressable, Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootState } from '../../../redux/store';
import { getHRDashboard } from '../../../api/employeeDashboard';
import api from '../../../api/service';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BranchBreakdown {
  present?: number;
  late?: number;
  absent?: number;
  on_leave?: number;
  onLeave?: number;
}

interface AttendanceDay {
  date?: string;
  present?: number;
  on_leave?: number;
  onLeave?: number;
  late?: number;
  absent?: number;
  f11?: BranchBreakdown;
  g13?: BranchBreakdown;
  'f-11'?: BranchBreakdown;
  'g-13'?: BranchBreakdown;
}

interface DeptSummary {
  name?: string;
  department?: string;
  total?: number;
  count?: number;
  f11?: number;
  g13?: number;
  'f-11'?: number;
  'g-13'?: number;
  roles?: string;
  designations?: string;
}

interface PersonRow {
  name?: string;
  employee?: string;
  employee_name?: string;
  branch?: string;
  designation?: string;
  department?: string;
  date?: string;
  birthday?: string;
  anniversary?: string;
  age?: number | string;
}

interface HRDashData {
  // Staff overview - multiple possible shapes
  staff_overview?: { total?: number; f11?: number; g13?: number };
  staffOverview?: { total?: number; f11?: number; g13?: number };
  total_staff?: number;
  totalStaff?: number;
  f11_staff?: number;
  g13_staff?: number;
  // Departments
  departments?: DeptSummary[];
  department_summary?: DeptSummary[];
  // Attendance
  attendance?: {
    previous_day?: AttendanceDay;
    previousDay?: AttendanceDay;
    today?: AttendanceDay;
    next_day?: AttendanceDay;
    nextDay?: AttendanceDay;
  };
  // Summaries
  late_summary?: { previous_day?: number; today?: number; next_day?: number };
  lateSummary?: { previousDay?: number; today?: number; nextDay?: number };
  absent_summary?: { previous_day?: number; today?: number; next_day?: number };
  absentSummary?: { previousDay?: number; today?: number; nextDay?: number };
  // Approvals
  approvals?: {
    pending_duty_hour_requests?: number;
    pending_document_reviews?: number;
    pendingDutyHourRequests?: number;
    pendingDocumentReviews?: number;
  };
  // Birthdays / anniversaries
  birthdays?: PersonRow[];
  anniversaries?: PersonRow[];
  // Expandable details
  details?: {
    staff_details?: any[];
    staffDetails?: any[];
    department_details?: any[];
    departmentDetails?: any[];
    present_details?: any[];
    presentDetails?: any[];
    late_details?: any[];
    lateDetails?: any[];
    absent_details?: any[];
    absentDetails?: any[];
    leave_details?: any[];
    leaveDetails?: any[];
    duty_hour_requests?: any[];
    dutyHourRequests?: any[];
    document_approval_requests?: any[];
    documentApprovalRequests?: any[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
};

const fmtDisplay = (d: Date) => {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const dayLabel = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getAttendanceDay = (data: HRDashData, key: 'previous_day' | 'today' | 'next_day'): AttendanceDay => {
  const camKey: Record<string, string> = { previous_day: 'previousDay', today: 'today', next_day: 'nextDay' };
  return (data.attendance as any)?.[key] ?? (data.attendance as any)?.[camKey[key]] ?? {};
};

const getBranchBreakdown = (day: AttendanceDay, branch: 'f11' | 'g13'): BranchBreakdown => {
  return (day as any)[branch] ?? (day as any)[branch === 'f11' ? 'f-11' : 'g-13'] ?? {};
};

const DEPT_COLORS = ['#E63946', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#D81B60', '#F57F17'];

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionTitle = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const StaffCard = ({ label, value, sub }: { label: string; value: any; sub?: string }) => (
  <View style={styles.staffCard}>
    <Text style={styles.staffValue}>{value ?? '—'}</Text>
    <Text style={styles.staffLabel}>{label}</Text>
    {sub ? <Text style={styles.staffSub}>{sub}</Text> : null}
  </View>
);

const AttendanceDayCard = ({
  title,
  highlighted,
  day,
}: {
  title: string;
  highlighted?: boolean;
  day: AttendanceDay;
}) => {
  const f11 = getBranchBreakdown(day, 'f11');
  const g13 = getBranchBreakdown(day, 'g13');
  const present = day.present ?? 0;
  const onLeave = day.on_leave ?? day.onLeave ?? 0;
  const late = day.late ?? 0;
  const absent = day.absent ?? 0;

  return (
    <View style={[styles.attCard, highlighted && styles.attCardHighlighted]}>
      <View style={styles.attCardHeader}>
        <Text style={[styles.attCardTitle, highlighted && styles.attCardTitleHighlighted]}>{title}</Text>
        {day.date ? <Text style={styles.attCardDate}>{dayLabel(day.date)}</Text> : null}
      </View>
      <View style={styles.attGrid}>
        <View style={styles.attCell}>
          <Text style={styles.attCellLabel}>Present</Text>
          <Text style={[styles.attCellVal, { color: '#43A047' }]}>{present}</Text>
        </View>
        <View style={styles.attCell}>
          <Text style={styles.attCellLabel}>On Leave</Text>
          <Text style={styles.attCellVal}>{onLeave}</Text>
        </View>
        <View style={styles.attCell}>
          <Text style={styles.attCellLabel}>Late</Text>
          <Text style={[styles.attCellVal, { color: '#FB8C00' }]}>{late}</Text>
        </View>
        <View style={styles.attCell}>
          <Text style={styles.attCellLabel}>Absent</Text>
          <Text style={[styles.attCellVal, { color: '#E63946' }]}>{absent}</Text>
        </View>
      </View>
      {(f11.present != null || g13.present != null) && (
        <View style={styles.branchBreakdown}>
          <Text style={styles.branchBreakText}>
            F-11: P {f11.present ?? 0} | L {f11.late ?? 0} | A {f11.absent ?? 0} | Lv {f11.on_leave ?? f11.onLeave ?? 0}
          </Text>
          <Text style={styles.branchBreakText}>
            G-13: P {g13.present ?? 0} | L {g13.late ?? 0} | A {g13.absent ?? 0} | Lv {g13.on_leave ?? g13.onLeave ?? 0}
          </Text>
        </View>
      )}
    </View>
  );
};

const SummaryBanner = ({
  title,
  color,
  prev,
  today,
  next,
}: {
  title: string;
  color: string;
  prev: any;
  today: any;
  next: any;
}) => (
  <View style={[styles.summaryBanner, { borderLeftColor: color }]}>
    <View style={styles.summaryBannerHeader}>
      <Text style={[styles.summaryBannerTitle, { color }]}>{title}</Text>
      <View style={[styles.summaryBannerBadge, { backgroundColor: color }]}>
        <Text style={styles.summaryBannerBadgeText}>{(prev ?? 0) + (today ?? 0) + (next ?? 0)}</Text>
      </View>
    </View>
    <Text style={styles.summaryBannerSub}>Quick day-wise summary</Text>
    <View style={styles.summaryChips}>
      <View style={styles.summaryChip}><Text style={styles.summaryChipText}>Previous Day: {prev ?? 0}</Text></View>
      <View style={styles.summaryChip}><Text style={styles.summaryChipText}>Today: {today ?? 0}</Text></View>
      <View style={styles.summaryChip}><Text style={styles.summaryChipText}>Next Day: {next ?? 0}</Text></View>
    </View>
  </View>
);

const ApprovalCard = ({ label, value, color }: { label: string; value: any; color: string }) => (
  <View style={styles.approvalCard}>
    <Text style={styles.approvalLabel}>{label}</Text>
    <Text style={[styles.approvalValue, { color }]}>{value ?? 0}</Text>
    <Text style={styles.approvalNote}>
      {label.includes('Duty') ? 'Employees can request new timings, but changes only apply after HR approval.' : 'Approved documents become view-only on the employee dashboard.'}
    </Text>
  </View>
);

const CollapsibleSection = ({
  title,
  count,
  color,
  children,
}: {
  title: string;
  count: number;
  color: string;
  children?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.collapseWrapper}>
      <TouchableOpacity style={styles.collapseRow} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Text style={[styles.collapseTitle, { color }]}>{title}</Text>
        <View style={[styles.collapseBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.collapseBadgeText, { color }]}>{count}</Text>
        </View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#999" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      {open && children}
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

const BRANCH_OPTIONS = [
  { id: '0', label: 'All Branches', branch_id: undefined },
  { id: '1', label: 'F 11', branch_id: 1 },
  { id: '2', label: 'G 13', branch_id: 2 },
];

const HRDashboard = () => {
  const navigation = useNavigation<any>();
  useSelector((state: RootState) => state.user);

  const [data, setData] = useState<HRDashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState(BRANCH_OPTIONS[0]);
  const [branchModalVisible, setBranchModalVisible] = useState(false);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const todayStr = fmtDate(date);
      const prevStr = fmtDate(new Date(date.getTime() - 86400000));
      const nextStr = fmtDate(new Date(date.getTime() + 86400000));
      const bId = selectedBranch.branch_id;

      // Try dedicated dashboard endpoint first (may not exist on backend yet)
      const dashParams: any = { date: todayStr };
      if (bId !== undefined) dashParams.branch_id = bId;
      const dashRes = await getHRDashboard(dashParams);
      const dashData = dashRes?.data ?? dashRes;
      if (dashData && (dashData.total_staff || dashData.staff_overview || dashData.departments)) {
        setData(dashData);
        return;
      }

      // Fallback: combine multiple endpoints.
      // NOTE: attendance works at /attendance/index (no v1 prefix); approvals at /v1/hr/...
      const attParams = (dateStr: string) => ({
        params: { branch_id: bId, category: 2, start_date: dateStr, end_date: dateStr, limit: 9999 },
      });

      const [dutyReqRes, docReqRes, attPrevRes, attTodayRes, attNextRes] =
        await Promise.allSettled([
          api.get('/v1/hr/employee-duty-hour-requests/index', {
            params: { branch_id: bId, approval_status: 'Pending', limit: 1 },
          }),
          api.get('/v1/hr/staff-documents/index', {
            params: { branch_id: bId, approval_status: 'Pending', limit: 1 },
          }),
          api.get('/v1/attendance/index', attParams(prevStr)),
          api.get('/v1/attendance/index', attParams(todayStr)),
          api.get('/v1/attendance/index', attParams(nextStr)),
        ]);

      const ok = <T,>(r: PromiseSettledResult<T>): T | null =>
        r.status === 'fulfilled' ? r.value : null;

      // Parse an attendance response into summary counts + per-branch breakdowns.
      // uid prefix "SF11" = F-11 branch, "SG13" = G-13 branch.
      const parseAttDay = (res: PromiseSettledResult<any>, dateStr: string) => {
        const raw = ok(res);
        const list: any[] = raw?.data?.data?.data ?? raw?.data?.data ?? [];
        const total: number = raw?.data?.data?.total ?? list.length;

        const present = list.filter((a: any) => a.attendance_status === 'Present').length;
        const late    = list.filter((a: any) => a.is_late === 1).length;
        const absent  = list.filter((a: any) => a.attendance_status === 'Absent').length;
        const on_leave = list.filter((a: any) => a.attendance_status === 'Leave').length;

        const isF11 = (a: any) => String(a.attendee?.uid ?? '').startsWith('SF');
        const isG13 = (a: any) => String(a.attendee?.uid ?? '').startsWith('SG');

        const f11List = list.filter(isF11);
        const g13List = list.filter(isG13);

        return {
          date: dateStr,
          present,
          late,
          absent,
          on_leave,
          total,
          f11: {
            present: f11List.filter((a: any) => a.attendance_status === 'Present').length,
            late:    f11List.filter((a: any) => a.is_late === 1).length,
            absent:  f11List.filter((a: any) => a.attendance_status === 'Absent').length,
            on_leave: f11List.filter((a: any) => a.attendance_status === 'Leave').length,
          },
          g13: {
            present: g13List.filter((a: any) => a.attendance_status === 'Present').length,
            late:    g13List.filter((a: any) => a.is_late === 1).length,
            absent:  g13List.filter((a: any) => a.attendance_status === 'Absent').length,
            on_leave: g13List.filter((a: any) => a.attendance_status === 'Leave').length,
          },
          _list: list,
        };
      };

      const prevDay  = parseAttDay(attPrevRes, prevStr);
      const todayDay = parseAttDay(attTodayRes, todayStr);
      const nextDay  = parseAttDay(attNextRes, nextStr);

      // Derive staff count from today's total attendance records (all on-schedule staff).
      const totalStaff = todayDay.total;
      const f11Total = todayDay._list.filter((a: any) => String(a.attendee?.uid ?? '').startsWith('SF')).length;
      const g13Total = todayDay._list.filter((a: any) => String(a.attendee?.uid ?? '').startsWith('SG')).length;

      // Group today's attendance by designation for department summary.
      const desigMap: Record<string, { total: number; f11: number; g13: number }> = {};
      todayDay._list.forEach((a: any) => {
        const dept = a.designation || 'Other';
        if (!desigMap[dept]) desigMap[dept] = { total: 0, f11: 0, g13: 0 };
        desigMap[dept].total++;
        if (String(a.attendee?.uid ?? '').startsWith('SF')) desigMap[dept].f11++;
        if (String(a.attendee?.uid ?? '').startsWith('SG')) desigMap[dept].g13++;
      });
      const depts = Object.entries(desigMap)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, d]) => ({ name, total: d.total, f11: d.f11, g13: d.g13 }));

      // Pending approvals
      const dutyRaw = ok(dutyReqRes);
      const docRaw  = ok(docReqRes);
      const pendingDuty = dutyRaw?.data?.data?.total ?? dutyRaw?.data?.total ?? 0;
      const pendingDocs = docRaw?.data?.data?.total  ?? docRaw?.data?.total  ?? 0;

      setData({
        total_staff: totalStaff,
        f11_staff:   f11Total,
        g13_staff:   g13Total,
        departments: depts,
        attendance: {
          previous_day: prevDay,
          today:        todayDay,
          next_day:     nextDay,
        },
        late_summary: {
          previous_day: prevDay.late,
          today:        todayDay.late,
          next_day:     nextDay.late,
        },
        absent_summary: {
          previous_day: prevDay.absent,
          today:        todayDay.absent,
          next_day:     nextDay.absent,
        },
        approvals: {
          pending_duty_hour_requests: pendingDuty,
          pending_document_reviews:   pendingDocs,
        },
        details: {
          present_details: todayDay._list.filter((a: any) => a.attendance_status === 'Present'),
          late_details:    todayDay._list.filter((a: any) => a.is_late === 1),
          absent_details:  todayDay._list.filter((a: any) => a.attendance_status === 'Absent'),
        },
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, selectedBranch]);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const totalStaff = data?.staff_overview?.total ?? data?.staffOverview?.total ?? data?.total_staff ?? data?.totalStaff ?? 0;
  const f11Staff = data?.staff_overview?.f11 ?? data?.staffOverview?.f11 ?? data?.f11_staff ?? 0;
  const g13Staff = data?.staff_overview?.g13 ?? data?.staffOverview?.g13 ?? data?.g13_staff ?? 0;

  const depts: DeptSummary[] = data?.departments ?? data?.department_summary ?? [];

  const prevDay = getAttendanceDay(data ?? {}, 'previous_day');
  const today = getAttendanceDay(data ?? {}, 'today');
  const nextDay = getAttendanceDay(data ?? {}, 'next_day');

  const lateS = data?.late_summary ?? (data?.lateSummary ? {
    previous_day: (data.lateSummary as any).previousDay,
    today: (data.lateSummary as any).today,
    next_day: (data.lateSummary as any).nextDay,
  } : undefined);

  const absentS = data?.absent_summary ?? (data?.absentSummary ? {
    previous_day: (data.absentSummary as any).previousDay,
    today: (data.absentSummary as any).today,
    next_day: (data.absentSummary as any).nextDay,
  } : undefined);

  const pendingDutyHours = data?.approvals?.pending_duty_hour_requests ?? data?.approvals?.pendingDutyHourRequests ?? 0;
  const pendingDocReviews = data?.approvals?.pending_document_reviews ?? data?.approvals?.pendingDocumentReviews ?? 0;

  const birthdays: PersonRow[] = data?.birthdays ?? [];
  const anniversaries: PersonRow[] = data?.anniversaries ?? [];

  const details = data?.details;
  const staffDetails = details?.staff_details ?? details?.staffDetails ?? [];
  const deptDetails = details?.department_details ?? details?.departmentDetails ?? [];
  const presentDetails = details?.present_details ?? details?.presentDetails ?? [];
  const lateDetails = details?.late_details ?? details?.lateDetails ?? [];
  const absentDetails = details?.absent_details ?? details?.absentDetails ?? [];
  const leaveDetails = details?.leave_details ?? details?.leaveDetails ?? [];
  const dutyHourReqs = details?.duty_hour_requests ?? details?.dutyHourRequests ?? [];
  const docApprovalReqs = details?.document_approval_requests ?? details?.documentApprovalRequests ?? [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HR Dashboard</Text>
        <TouchableOpacity onPress={() => load(true)}>
          <Icon name="refresh" size={22} color="#E63946" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersBar}>
        <Text style={styles.filtersSubtitle}>Filter the branch and date, then refresh the dashboard summary.</Text>
        <View style={styles.filterRow}>
          {/* Branch selector */}
          <TouchableOpacity style={styles.filterField} onPress={() => setBranchModalVisible(true)}>
            <Icon name="office-building" size={16} color="#666" style={{ marginRight: 6 }} />
            <Text style={styles.filterFieldText} numberOfLines={1}>{selectedBranch.label}</Text>
            <Icon name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>

          {/* Date selector */}
          <TouchableOpacity style={styles.filterField} onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar" size={16} color="#666" style={{ marginRight: 6 }} />
            <Text style={styles.filterFieldText}>{fmtDisplay(date)}</Text>
            <Icon name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => load()}>
          <Text style={styles.refreshBtnText}>Refresh Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.scopeText}>Current Scope: {selectedBranch.label}. Summary cards stay visible, while details remain collapsed at the bottom unless opened.</Text>
      </View>

      {/* DatePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, d) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (d) setDate(d);
          }}
        />
      )}

      {/* Branch Modal */}
      <Modal visible={branchModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setBranchModalVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Branch</Text>
            {BRANCH_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.modalOption, selectedBranch.id === opt.id && styles.modalOptionSelected]}
                onPress={() => { setSelectedBranch(opt); setBranchModalVisible(false); }}
              >
                <Icon
                  name={selectedBranch.id === opt.id ? 'check-circle' : 'circle-outline'}
                  size={20}
                  color={selectedBranch.id === opt.id ? '#E63946' : '#ccc'}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.modalOptionText, selectedBranch.id === opt.id && { color: '#E63946', fontWeight: '700' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          {/* ── Staff Overview ─────────────────────────────────────────── */}
          <SectionTitle title="Staff Overview" />
          <View style={styles.staffRow}>
            <StaffCard label="Total Staff" value={totalStaff} sub="Active staff in scope, excluding HR login accounts." />
            <StaffCard label="F-11 Staff" value={f11Staff} sub="Branch Total" />
            <StaffCard label="G-13 Staff" value={g13Staff} sub="Branch Total" />
          </View>

          {/* ── Department Summary ─────────────────────────────────────── */}
          <SectionTitle title="Department Summary" />
          {depts.length > 0 ? (
            <View style={styles.deptGrid}>
              {depts.map((dept, i) => {
                const deptName = dept.name ?? dept.department ?? `Dept ${i + 1}`;
                const deptTotal = dept.total ?? dept.count ?? 0;
                const df11 = dept.f11 ?? (dept as any)['f-11'];
                const dg13 = dept.g13 ?? (dept as any)['g-13'];
                const color = DEPT_COLORS[i % DEPT_COLORS.length];
                return (
                  <View key={`${deptName}-${i}`} style={styles.deptCard}>
                    <View style={styles.deptCardHeader}>
                      <Text style={styles.deptCardName}>{deptName}</Text>
                      <View style={[styles.deptBadge, { backgroundColor: color }]}>
                        <Text style={styles.deptBadgeText}>{deptTotal}</Text>
                      </View>
                    </View>
                    {(df11 != null || dg13 != null) && (
                      <View style={styles.deptBranchRow}>
                        {df11 != null && <Text style={styles.deptBranchChip}>F-11: {df11}</Text>}
                        {dg13 != null && <Text style={styles.deptBranchChip}>G-13: {dg13}</Text>}
                      </View>
                    )}
                    {(dept.roles ?? dept.designations) ? (
                      <Text style={styles.deptRoles}>{dept.roles ?? dept.designations}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Icon name="domain" size={32} color="#ccc" />
              <Text style={styles.emptyText}>No department data available</Text>
            </View>
          )}

          {/* ── Attendance Summary ─────────────────────────────────────── */}
          <SectionTitle title="Attendance Summary" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attScroll}>
            <AttendanceDayCard title="Previous Day" day={prevDay} />
            <AttendanceDayCard title="Today" day={today} highlighted />
            <AttendanceDayCard title="Next Day" day={nextDay} />
          </ScrollView>

          {/* ── Late & Absent Summary ──────────────────────────────────── */}
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <SummaryBanner
                title="Late Summary"
                color="#FB8C00"
                prev={lateS?.previous_day}
                today={lateS?.today}
                next={lateS?.next_day}
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <SummaryBanner
                title="Absent Summary"
                color="#E63946"
                prev={absentS?.previous_day}
                today={absentS?.today}
                next={absentS?.next_day}
              />
            </View>
          </View>

          {/* ── Approvals ─────────────────────────────────────────────── */}
          <SectionTitle title="Approvals" />
          <View style={styles.approvalRow}>
            <ApprovalCard label="Pending Duty-Hour Requests" value={pendingDutyHours} color="#FB8C00" />
            <View style={{ width: 10 }} />
            <ApprovalCard label="Pending Document Reviews" value={pendingDocReviews} color="#1E88E5" />
          </View>

          {/* ── Birthdays ─────────────────────────────────────────────── */}
          <SectionTitle title={`Birthdays This Month`} />
          {birthdays.length > 0 ? (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                {['Employee', 'Branch', 'Designation', 'Dept', 'Date', 'Age'].map(h => (
                  <Text key={h} style={[styles.tableHeaderCell, h === 'Employee' && { flex: 2 }]}>{h}</Text>
                ))}
              </View>
              {birthdays.map((b, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{b.name ?? b.employee ?? b.employee_name ?? '—'}</Text>
                  <Text style={styles.tableCell} numberOfLines={1}>{b.branch ?? '—'}</Text>
                  <Text style={styles.tableCell} numberOfLines={1}>{b.designation ?? '—'}</Text>
                  <Text style={styles.tableCell} numberOfLines={1}>{b.department ?? '—'}</Text>
                  <View style={[styles.tableCellTag, { backgroundColor: getAgeColor(b.age) }]}>
                    <Text style={styles.tableCellTagText}>{b.date ?? b.birthday ?? '—'}</Text>
                  </View>
                  <View style={[styles.tableCellTag, { backgroundColor: '#E63946' }]}>
                    <Text style={styles.tableCellTagText}>{b.age ? `${b.age} yrs` : '—'}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Icon name="cake-variant" size={28} color="#ccc" />
              <Text style={styles.emptyText}>No birthdays this month</Text>
            </View>
          )}

          {/* ── Anniversaries ─────────────────────────────────────────── */}
          <SectionTitle title="Anniversaries This Month" />
          {anniversaries.length > 0 ? (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                {['Employee', 'Branch', 'Designation', 'Dept', 'Date', 'Yrs'].map(h => (
                  <Text key={h} style={[styles.tableHeaderCell, h === 'Employee' && { flex: 2 }]}>{h}</Text>
                ))}
              </View>
              {anniversaries.map((a, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{a.name ?? a.employee ?? a.employee_name ?? '—'}</Text>
                  <Text style={styles.tableCell} numberOfLines={1}>{a.branch ?? '—'}</Text>
                  <Text style={styles.tableCell} numberOfLines={1}>{a.designation ?? '—'}</Text>
                  <Text style={styles.tableCell} numberOfLines={1}>{a.department ?? '—'}</Text>
                  <View style={[styles.tableCellTag, { backgroundColor: '#1E88E5' }]}>
                    <Text style={styles.tableCellTagText}>{a.date ?? a.anniversary ?? '—'}</Text>
                  </View>
                  <View style={[styles.tableCellTag, { backgroundColor: '#43A047' }]}>
                    <Text style={styles.tableCellTagText}>{a.age ? `${a.age} yrs` : '—'}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No anniversaries this month.</Text>
            </View>
          )}

          {/* ── Details (collapsible) ──────────────────────────────────── */}
          <SectionTitle title="Details" />
          <Text style={styles.detailsNote}>All detailed views stay collapsed by default and appear only when opened.</Text>

          <View style={styles.detailsCard}>
            <CollapsibleSection title="Staff Details" count={staffDetails.length || totalStaff} color="#1a1a1a">
              {staffDetails.map((s: any, i: number) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailRowText}>{s.name ?? s.employee_name ?? JSON.stringify(s)}</Text>
                </View>
              ))}
            </CollapsibleSection>

            <View style={styles.divider} />

            <CollapsibleSection title="Department Details" count={deptDetails.length || depts.length} color="#1a1a1a">
              {(deptDetails.length > 0 ? deptDetails : depts).map((d: any, i: number) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailRowText}>{d.name ?? d.department ?? JSON.stringify(d)}</Text>
                  <Text style={styles.detailRowSub}>{d.total ?? d.count ?? ''}</Text>
                </View>
              ))}
            </CollapsibleSection>

            <View style={styles.divider} />

            <CollapsibleSection title="Present Details" count={presentDetails.length || (today.present ?? 0)} color="#43A047">
              {presentDetails.map((p: any, i: number) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailRowText}>{p.name ?? p.employee_name ?? JSON.stringify(p)}</Text>
                </View>
              ))}
            </CollapsibleSection>

            <View style={styles.divider} />

            <CollapsibleSection title="Late Details" count={lateDetails.length || (lateS?.today ?? 0)} color="#FB8C00">
              {lateDetails.map((l: any, i: number) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailRowText}>{l.name ?? l.employee_name ?? JSON.stringify(l)}</Text>
                </View>
              ))}
            </CollapsibleSection>

            <View style={styles.divider} />

            <CollapsibleSection title="Absent Details" count={absentDetails.length || (absentS?.today ?? 0)} color="#E63946">
              {absentDetails.map((a: any, i: number) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailRowText}>{a.name ?? a.employee_name ?? JSON.stringify(a)}</Text>
                </View>
              ))}
            </CollapsibleSection>

            <View style={styles.divider} />

            <CollapsibleSection title="Leave Details" count={leaveDetails.length} color="#8E24AA">
              {leaveDetails.map((l: any, i: number) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailRowText}>{l.name ?? l.employee_name ?? JSON.stringify(l)}</Text>
                </View>
              ))}
            </CollapsibleSection>

            <View style={styles.divider} />

            <CollapsibleSection title="Duty-Hour Change Requests" count={dutyHourReqs.length} color="#00ACC1">
              {dutyHourReqs.map((r: any, i: number) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailRowText}>{r.name ?? r.employee_name ?? JSON.stringify(r)}</Text>
                </View>
              ))}
            </CollapsibleSection>

            <View style={styles.divider} />

            <CollapsibleSection title="Document Approval Requests" count={docApprovalReqs.length} color="#1E88E5">
              {docApprovalReqs.map((r: any, i: number) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailRowText}>{r.name ?? r.document_type ?? JSON.stringify(r)}</Text>
                </View>
              ))}
            </CollapsibleSection>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getAgeColor = (age: any) => {
  if (!age) return '#999';
  const a = Number(age);
  if (a < 25) return '#43A047';
  if (a < 30) return '#1E88E5';
  if (a < 40) return '#FB8C00';
  return '#E63946';
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },

  // Filters bar
  filtersBar: { backgroundColor: '#fff', padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filtersSubtitle: { fontSize: 12, color: '#888', marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  filterField: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA',
  },
  filterFieldText: { flex: 1, fontSize: 13, color: '#333' },
  refreshBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', marginBottom: 8,
  },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scopeText: { fontSize: 11, color: '#aaa', lineHeight: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 16, textAlign: 'center' },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    paddingHorizontal: 14, borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee', backgroundColor: '#FAFAFA',
  },
  modalOptionSelected: { borderColor: '#E63946', backgroundColor: '#FFF5F5' },
  modalOptionText: { fontSize: 15, color: '#333' },

  // Scroll
  scroll: { padding: 14, paddingBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 10, marginTop: 14 },

  // Staff Overview
  staffRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  staffCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  staffValue: { fontSize: 26, fontWeight: '900', color: '#1E88E5' },
  staffLabel: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  staffSub: { fontSize: 10, color: '#888', marginTop: 4 },

  // Department
  deptGrid: { gap: 8, marginBottom: 4 },
  deptCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  deptCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  deptCardName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  deptBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  deptBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  deptBranchRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  deptBranchChip: {
    fontSize: 12, backgroundColor: '#F0F0F0', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6, color: '#555', fontWeight: '600',
  },
  deptRoles: { fontSize: 12, color: '#888' },

  // Attendance
  attScroll: { marginBottom: 4 },
  attCard: {
    width: 220, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginRight: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    borderWidth: 1, borderColor: '#eee',
  },
  attCardHighlighted: { borderColor: '#1E88E5', borderWidth: 2 },
  attCardHeader: { marginBottom: 8 },
  attCardTitle: { fontSize: 13, fontWeight: '700', color: '#888' },
  attCardTitleHighlighted: { color: '#1E88E5' },
  attCardDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  attGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  attCell: { width: '45%' },
  attCellLabel: { fontSize: 11, color: '#aaa' },
  attCellVal: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  branchBreakdown: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8, gap: 3 },
  branchBreakText: { fontSize: 11, color: '#888' },

  // Late/Absent Summary
  summaryRow: { flexDirection: 'row', marginBottom: 4 },
  summaryBanner: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  summaryBannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  summaryBannerTitle: { fontSize: 13, fontWeight: '700' },
  summaryBannerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  summaryBannerBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  summaryBannerSub: { fontSize: 10, color: '#aaa', marginBottom: 8 },
  summaryChips: { gap: 4 },
  summaryChip: { backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  summaryChipText: { fontSize: 12, color: '#555', fontWeight: '600' },

  // Approvals
  approvalRow: { flexDirection: 'row', marginBottom: 4 },
  approvalCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  approvalLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 4 },
  approvalValue: { fontSize: 30, fontWeight: '900', marginBottom: 6 },
  approvalNote: { fontSize: 10, color: '#aaa', lineHeight: 14 },

  // Table
  tableCard: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, marginBottom: 4,
  },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F5F6FA', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableHeaderCell: { flex: 1, fontSize: 11, fontWeight: '700', color: '#888' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tableCell: { flex: 1, fontSize: 12, color: '#333' },
  tableCellTag: { flex: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, marginRight: 2 },
  tableCellTagText: { fontSize: 11, color: '#fff', fontWeight: '600', textAlign: 'center' },

  // Details
  detailsNote: { fontSize: 12, color: '#aaa', marginBottom: 10 },
  detailsCard: {
    backgroundColor: '#fff', borderRadius: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  collapseWrapper: { paddingHorizontal: 14, paddingVertical: 12 },
  collapseRow: { flexDirection: 'row', alignItems: 'center' },
  collapseTitle: { fontSize: 14, fontWeight: '700' },
  collapseBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  collapseBadgeText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', marginTop: 6 },
  detailRowText: { fontSize: 13, color: '#333' },
  detailRowSub: { fontSize: 13, color: '#888' },

  // Empty
  emptyBox: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', gap: 8, marginBottom: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  emptyText: { fontSize: 13, color: '#aaa' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default HRDashboard;
