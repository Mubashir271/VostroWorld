import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
  getStaffList,
  getSalaryList,
  getHRStaffAttendance,
  getHRCommissionsReport,
  getHRLeaveApplications,
  getHRStaffFines,
  getHRStaffLoans,
  getHRStaffPromotions,
  getDepartmentNames,
  getDesignationNames,
} from '../../../api/employeeDashboard';

// Confirmed live 2026-07-01 via HAR — all endpoints verified.
// staff-loans (422 when staff_id empty) and hr/promotion (500) are broken
// server-side (web admin also shows the warning for those sections).

const R = '#C62828';
const LIMIT = 1000;

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso?: string) => {
  if (!iso) return '—';
  const parts = iso.slice(0, 10).split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};
const today = () => fmt(new Date());
const fmtRs = (val: any) => `Rs ${(parseFloat(val ?? 0) || 0).toLocaleString()}`;
const fullName = (s: any) => `${s?.first_name ?? ''} ${s?.last_name ?? ''}`.trim() || s?.name || '—';

interface DropdownItem { id: number | string; name: string; }

const DetailedHRReport = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  // ── filter state
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null);

  const [departments, setDepartments] = useState<DropdownItem[]>([]);
  const [designations, setDesignations] = useState<DropdownItem[]>([]);
  const [employees, setEmployees] = useState<DropdownItem[]>([]);

  const [department, setDepartment] = useState<DropdownItem | null>(null);
  const [designation, setDesignation] = useState<DropdownItem | null>(null);
  const [employee, setEmployee] = useState<DropdownItem | null>(null);

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showDesigModal, setShowDesigModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);

  // ── report data
  const [staffRows, setStaffRows] = useState<any[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [leaveRows, setLeaveRows] = useState<any[]>([]);
  const [salaryRows, setSalaryRows] = useState<any[]>([]);
  const [commissionRows, setCommissionRows] = useState<any[]>([]);
  const [fineRows, setFineRows] = useState<any[]>([]);
  const [advanceRows, setAdvanceRows] = useState<any[]>([]);
  const [loanRows, setLoanRows] = useState<any[]>([]);
  const [promotionRows, setPromotionRows] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const loadDropdowns = useCallback(async () => {
    try {
      const [depts, desigs, emps] = await Promise.all([
        getDepartmentNames(),
        getDesignationNames(),
        getStaffList({ branch_id: listBranchId, status: 1, limit: 500 }),
      ]);
      setDepartments(Array.isArray(depts?.data) ? depts.data : []);
      setDesignations(Array.isArray(desigs?.data) ? desigs.data : []);
      const empList: any[] = emps?.data?.data ?? [];
      setEmployees(empList.map((s: any) => ({ id: s.id, name: fullName(s) })));
    } catch {}
  }, [listBranchId]);

  useFocusEffect(useCallback(() => { loadDropdowns(); }, [loadDropdowns]));

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setFetched(false);
    const userId = employee ? employee.id : '';
    const deptId = department ? department.id : '';
    const desigId = designation ? designation.id : '';

    try {
      const [staffRes, attRes, leaveRes, salRes, commRes, fineRes, advRes, loanRes, promRes] =
        await Promise.allSettled([
          getStaffList({
            branch_id: listBranchId, status: 1, limit: LIMIT,
            department_id: deptId ? Number(deptId) : undefined,
            designation: desigId ? String(desigId) : undefined,
          }),
          getHRStaffAttendance({
            branch_id: listBranchId,
            start_date: fromDate, end_date: toDate,
            user_id: userId || undefined,
            limit: LIMIT,
          }),
          getHRLeaveApplications({
            branch_id: listBranchId, status: 1,
            user_id: userId || undefined,
            limit: LIMIT,
          }),
          getSalaryList({
            branch_id: listBranchId,
            start_date: fromDate, end_date: toDate,
            user_id: userId ? Number(userId) : undefined,
            limit: LIMIT,
          }),
          getHRCommissionsReport({
            branch_id: listBranchId,
            start_date: fromDate, end_date: toDate,
            user_id: userId || undefined,
            limit: LIMIT,
          }),
          getHRStaffFines({
            branch_id: listBranchId, category: 'Fine',
            user_id: userId || undefined,
            start_date: fromDate, end_date: toDate,
            limit: LIMIT,
          }),
          getHRStaffFines({
            branch_id: listBranchId, category: 'Advance',
            user_id: userId || undefined,
            start_date: fromDate, end_date: toDate,
            limit: LIMIT,
          }),
          getHRStaffLoans({
            branch_id: listBranchId,
            staff_id: userId || undefined,
            start_date: fromDate, end_date: toDate,
            status: 1, limit: LIMIT,
          }),
          getHRStaffPromotions({ branch_id: listBranchId, status: 1, limit: LIMIT }),
        ]);

      const safeArr = (r: PromiseSettledResult<any>, path?: string): any[] => {
        if (r.status === 'rejected') return [];
        const val = r.value;
        if (!val) return [];
        // handle nested data.data (attendance) or direct data[]
        const d = val?.data;
        if (Array.isArray(d)) return d;
        if (d?.data && Array.isArray(d.data)) return d.data;
        return [];
      };

      setStaffRows(safeArr(staffRes));
      setAttendanceRows(safeArr(attRes));
      setLeaveRows(safeArr(leaveRes));
      setSalaryRows(safeArr(salRes));
      setCommissionRows(safeArr(commRes));
      setFineRows(safeArr(fineRes));
      setAdvanceRows(safeArr(advRes));
      setLoanRows(safeArr(loanRes));
      setPromotionRows(safeArr(promRes));
      setFetched(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFromDate(today()); setToDate(today());
    setDepartment(null); setDesignation(null); setEmployee(null);
    setFetched(false);
    setStaffRows([]); setAttendanceRows([]); setLeaveRows([]);
    setSalaryRows([]); setCommissionRows([]); setFineRows([]);
    setAdvanceRows([]); setLoanRows([]); setPromotionRows([]);
  };

  // ── summary computations
  const presentCount = attendanceRows.filter(a => a.attendance_status === 'Present').length;
  const lateCount = attendanceRows.filter(a => a.is_late === 1).length;
  const absentCount = attendanceRows.filter(a => a.attendance_status === 'Absent').length;
  const approvedLeaves = leaveRows.filter(l => l.application_status === 'Approved').length;
  const netSalary = salaryRows.reduce((s, r) => {
    const sal = parseFloat(r.salary ?? 0) || 0;
    const fine = parseFloat(r.fine ?? 0) || 0;
    const advance = parseFloat(r.advance ?? 0) || 0;
    const loan = parseFloat(r.loan ?? 0) || 0;
    const reward = parseFloat(r.reward ?? 0) || 0;
    const det = parseFloat(r.detections ?? 0) || 0;
    const compAdd = parseFloat(r.components_addition ?? 0) || 0;
    const compDed = parseFloat(r.components_deduction ?? 0) || 0;
    return s + sal + reward + compAdd - fine - advance - loan - det - compDed;
  }, 0);
  const grossComm = commissionRows.reduce((s, r) => s + (parseFloat(r.commission?.commission ?? 0) || 0), 0);
  const totalFines = fineRows.reduce((s, r) => s + (parseFloat(r.amount ?? 0) || 0), 0);
  const totalAdvances = advanceRows.reduce((s, r) => s + (parseFloat(r.amount ?? 0) || 0), 0);
  const totalLoans = loanRows.reduce((s, r) => s + (parseFloat(r.amount ?? r.remaining_amount ?? 0) || 0), 0);

  const SectionCard = ({ title, count, children }: { title: string; count: number; children: React.ReactNode }) => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.recordsBadge}>
          <Text style={styles.recordsText}>Records: {count}</Text>
        </View>
      </View>
      {children}
    </View>
  );

  const EmptyRow = ({ msg }: { msg: string }) => (
    <Text style={styles.emptyText}>{msg}</Text>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Detailed HR Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Filters */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detailed HR Report</Text>
          <Text style={styles.subtitle}>
            Employee-wise and combined HR reporting for attendance, leave, payroll, fines, advances, commissions, loans, and movement history.
          </Text>

          <BranchField
            label="Branch Name"
            needsPicker={needsPicker}
            branchName={branchName}
            options={branchOptions}
            loadingOptions={loadingBranches}
            onSelect={selectBranch}
            labelStyle={styles.label}
            staticStyle={styles.staticInput}
            staticTextStyle={styles.staticText}
            pickerStyle={styles.picker}
            pickerTextStyle={styles.pickerText}
            placeholderStyle={styles.placeholder}
          />

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Department</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowDeptModal(true)}>
                <Text style={department ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                  {department?.name ?? 'All Departments'}
                </Text>
                <Icon name="chevron-down" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Designation</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowDesigModal(true)}>
                <Text style={designation ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                  {designation?.name ?? 'All Designations'}
                </Text>
                <Icon name="chevron-down" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Employee</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowEmpModal(true)}>
            <Text style={employee ? styles.pickerText : styles.placeholder} numberOfLines={1}>
              {employee?.name ?? 'All Employees'}
            </Text>
            <Icon name="chevron-down" size={15} color="#666" />
          </TouchableOpacity>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>From Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('from')}>
                <Text style={styles.dateText}>{display(fromDate)}</Text>
                <Icon name="calendar" size={14} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>To Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('to')}>
                <Text style={styles.dateText}>{display(toDate)}</Text>
                <Icon name="calendar" size={14} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {!!error && <Text style={styles.errText}>{error}</Text>}

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.genBtn, loading && styles.btnDisabled]} onPress={handleGenerate} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.genBtnText}>Generate Report</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        {fetched && (
          <>
            <View style={styles.summaryGrid}>
              {[
                { label: 'Employees in Scope', value: staffRows.length, color: '#1565C0' },
                { label: 'Present Marks', value: presentCount, color: '#2E7D32' },
                { label: 'Late Marks', value: lateCount, color: '#E65100' },
                { label: 'Absent Marks', value: absentCount, color: R },
                { label: 'Approved Leaves', value: approvedLeaves, color: '#6A1B9A' },
                { label: 'Net Salary', value: fmtRs(netSalary), color: '#1A1A1A' },
                { label: 'Gross Commission', value: fmtRs(grossComm), color: '#1A1A1A' },
                { label: 'Fines', value: fmtRs(totalFines), color: R },
                { label: 'Advances', value: fmtRs(totalAdvances), color: R },
                { label: 'Loan Outstanding', value: fmtRs(totalLoans), color: R },
              ].map(item => (
                <View key={item.label} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* Employee Scope Register */}
            <SectionCard title="Employee Scope Register" count={staffRows.length}>
              {staffRows.length === 0
                ? <EmptyRow msg="No employees found." />
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.thead}>
                        {['S.No', 'Employee', 'ID', 'Branch', 'Department', 'Designation', 'Salary', 'Comm%', 'Joining', 'Phone'].map(h => (
                          <Text key={h} style={[styles.th, h === 'Employee' ? styles.colWide : h === 'Phone' ? styles.colPhone : styles.colMed]}>{h}</Text>
                        ))}
                      </View>
                      {staffRows.map((s, i) => (
                        <View key={s.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                          <Text style={[styles.td, styles.colWide]}>{fullName(s)}</Text>
                          <Text style={[styles.td, styles.colMed]}>{s.uid ?? '—'}</Text>
                          <Text style={[styles.td, styles.colMed]}>{s.branch_name ?? '—'}</Text>
                          <Text style={[styles.td, styles.colMed]}>{s.department ?? '—'}</Text>
                          <Text style={[styles.td, styles.colMed]}>{s.designation ?? '—'}</Text>
                          <Text style={[styles.td, styles.colMed]}>{fmtRs(s.salary)}</Text>
                          <Text style={[styles.td, styles.colSr]}>{s.commission ?? 'N/A'}</Text>
                          <Text style={[styles.td, styles.colDate]}>{display(s.joining)}</Text>
                          <Text style={[styles.td, styles.colPhone]}>{s.phone ?? '—'}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
              }
            </SectionCard>

            {/* Attendance Register */}
            <SectionCard title="Attendance Register" count={attendanceRows.length}>
              {attendanceRows.length === 0
                ? <EmptyRow msg="No attendance records found." />
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.thead}>
                        {['S.No', 'Employee', 'Date', 'Department', 'Designation', 'Duty Hours', 'Check In', 'Check Out', 'Working Hrs', 'Status', 'Late By'].map(h => (
                          <Text key={h} style={[styles.th, h === 'Employee' ? styles.colWide : styles.colMed]}>{h}</Text>
                        ))}
                      </View>
                      {attendanceRows.map((a, i) => {
                        const att = a.attendee ?? {};
                        const name = fullName(att) || `ID ${a.attendee_id}`;
                        const isPresent = a.attendance_status === 'Present';
                        const isLate = a.is_late === 1;
                        const statusColor = isLate ? '#E65100' : isPresent ? '#2E7D32' : R;
                        return (
                          <View key={a.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                            <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                            <Text style={[styles.td, styles.colWide]}>{name}</Text>
                            <Text style={[styles.td, styles.colMed]}>{display(a.date)}</Text>
                            <Text style={[styles.td, styles.colMed]}>{att.department ?? a.designation ?? '—'}</Text>
                            <Text style={[styles.td, styles.colMed]}>{a.designation ?? '—'}</Text>
                            <Text style={[styles.td, styles.colMed]}>{a.duty_hours ?? '—'}</Text>
                            <Text style={[styles.td, styles.colMed]}>{a.checkin_time_12h ?? '—'}</Text>
                            <Text style={[styles.td, styles.colMed]}>{a.checkout_time_12h ?? '—'}</Text>
                            <Text style={[styles.td, styles.colMed]}>{a.working_hours ?? '—'}</Text>
                            <Text style={[styles.td, styles.colMed, { color: statusColor, fontWeight: '700' }]}>
                              {isLate ? 'Late' : a.attendance_status ?? '—'}
                            </Text>
                            <Text style={[styles.td, styles.colMed]}>{isLate ? (a.remarks ?? 'Late') : 'On Time'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                )
              }
            </SectionCard>

            {/* Leave Register */}
            <SectionCard title="Leave Register" count={leaveRows.length}>
              {leaveRows.length === 0
                ? <EmptyRow msg="No leave records matched the selected date range." />
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.thead}>
                        {['S.No', 'Employee', 'Leave Type', 'From', 'To', 'Days', 'Status'].map(h => (
                          <Text key={h} style={[styles.th, h === 'Employee' ? styles.colWide : styles.colMed]}>{h}</Text>
                        ))}
                      </View>
                      {leaveRows.map((l, i) => (
                        <View key={l.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                          <Text style={[styles.td, styles.colWide]}>{fullName(l.user_info)}</Text>
                          <Text style={[styles.td, styles.colMed]}>{l.leave_type ?? '—'}</Text>
                          <Text style={[styles.td, styles.colMed]}>{display(l.from)}</Text>
                          <Text style={[styles.td, styles.colMed]}>{display(l.to)}</Text>
                          <Text style={[styles.td, styles.colMed]}>{l.number_of_leaves ?? '—'}</Text>
                          <Text style={[styles.td, styles.colMed]}>{l.application_status ?? l.leave_status ?? '—'}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
              }
            </SectionCard>

            {/* Payroll Register */}
            <SectionCard title="Payroll Register" count={salaryRows.length}>
              {salaryRows.length === 0
                ? <EmptyRow msg="No payroll records found." />
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.thead}>
                        {['S.No', 'Employee', 'Department', 'Designation', 'Base Salary', 'Commission', 'Reward', 'Advance', 'Fine', 'Loan', 'Deduction', 'Net Payable'].map(h => (
                          <Text key={h} style={[styles.th, h === 'Employee' ? styles.colWide : styles.colMed]}>{h}</Text>
                        ))}
                      </View>
                      {salaryRows.map((s, i) => {
                        const sal = parseFloat(s.salary ?? 0) || 0;
                        const fine = parseFloat(s.fine ?? 0) || 0;
                        const advance = parseFloat(s.advance ?? 0) || 0;
                        const loan = parseFloat(s.loan ?? 0) || 0;
                        const reward = parseFloat(s.reward ?? 0) || 0;
                        const det = parseFloat(s.detections ?? 0) || 0;
                        const compAdd = parseFloat(s.components_addition ?? 0) || 0;
                        const compDed = parseFloat(s.components_deduction ?? 0) || 0;
                        const netPayable = sal + reward + compAdd - fine - advance - loan - det - compDed;
                        const commAmt = parseFloat(s.commission?.commission ?? 0) || 0;
                        return (
                          <View key={s.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                            <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                            <Text style={[styles.td, styles.colWide]}>{s.name ?? '—'}</Text>
                            <Text style={[styles.td, styles.colMed]}>{s.department ?? '—'}</Text>
                            <Text style={[styles.td, styles.colMed]}>{s.designation ?? '—'}</Text>
                            <Text style={[styles.td, styles.colMed]}>{fmtRs(sal)}</Text>
                            <Text style={[styles.td, styles.colMed]}>{fmtRs(commAmt)}</Text>
                            <Text style={[styles.td, styles.colMed]}>{fmtRs(reward)}</Text>
                            <Text style={[styles.td, styles.colMed]}>{fmtRs(advance)}</Text>
                            <Text style={[styles.td, styles.colMed]}>{fmtRs(fine)}</Text>
                            <Text style={[styles.td, styles.colMed]}>{fmtRs(loan)}</Text>
                            <Text style={[styles.td, styles.colMed]}>{fmtRs(det + compDed)}</Text>
                            <Text style={[styles.td, styles.colMed, { fontWeight: '700' }]}>{fmtRs(netPayable)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                )
              }
            </SectionCard>

            {/* Commission Register */}
            <SectionCard title="Commission Register" count={commissionRows.length}>
              {commissionRows.length === 0
                ? <EmptyRow msg="No commission records found." />
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.thead}>
                        {['S.No', 'Employee', 'Department', 'Designation', 'Comm%', 'Gross', 'Paid', 'Outstanding', 'PT', 'GX', 'SPT', 'Payout'].map(h => (
                          <Text key={h} style={[styles.th, h === 'Employee' ? styles.colWide : styles.colSm]}>{h}</Text>
                        ))}
                      </View>
                      {commissionRows.map((c, i) => {
                        const comm = c.commission ?? {};
                        const gross = parseFloat(comm.commission ?? 0) || 0;
                        const paid = parseFloat(c.last_month_paid ?? 0) || 0;
                        const outstanding = gross - paid;
                        return (
                          <View key={c.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                            <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                            <Text style={[styles.td, styles.colWide]}>{c.name ?? '—'}</Text>
                            <Text style={[styles.td, styles.colSm]}>{c.department ?? '—'}</Text>
                            <Text style={[styles.td, styles.colSm]}>{c.designation ?? '—'}</Text>
                            <Text style={[styles.td, styles.colSm]}>{comm.commission_per ?? 'N/A'}</Text>
                            <Text style={[styles.td, styles.colSm]}>{fmtRs(gross)}</Text>
                            <Text style={[styles.td, styles.colSm]}>{fmtRs(paid)}</Text>
                            <Text style={[styles.td, styles.colSm]}>{fmtRs(outstanding)}</Text>
                            <Text style={[styles.td, styles.colSm]}>{fmtRs(comm.pt_commission)}</Text>
                            <Text style={[styles.td, styles.colSm]}>{fmtRs(comm.gx_commission)}</Text>
                            <Text style={[styles.td, styles.colSm]}>{fmtRs(comm.small_pt_commission)}</Text>
                            <View style={[styles.td, styles.colSm, { alignItems: 'center' }]}>
                              <View style={styles.unpaidBadge}>
                                <Text style={styles.unpaidText}>unpaid</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                )
              }
            </SectionCard>

            {/* Fine Register */}
            <SectionCard title="Fine Register" count={fineRows.length}>
              {fineRows.length === 0
                ? <EmptyRow msg="No fines were found for the selected scope." />
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.thead}>
                        {['S.No', 'Employee', 'Amount', 'Date', 'Description'].map(h => (
                          <Text key={h} style={[styles.th, h === 'Employee' ? styles.colWide : h === 'Description' ? styles.colDesc : styles.colMed]}>{h}</Text>
                        ))}
                      </View>
                      {fineRows.map((f, i) => (
                        <View key={f.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                          <Text style={[styles.td, styles.colWide]}>{fullName(f.user_info ?? {})}</Text>
                          <Text style={[styles.td, styles.colMed]}>{fmtRs(f.amount)}</Text>
                          <Text style={[styles.td, styles.colMed]}>{display(f.date)}</Text>
                          <Text style={[styles.td, styles.colDesc]}>{f.description ?? '—'}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
              }
            </SectionCard>

            {/* Advance Register */}
            <SectionCard title="Advance Register" count={advanceRows.length}>
              {advanceRows.length === 0
                ? <EmptyRow msg="No advances were found for the selected scope." />
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.thead}>
                        {['S.No', 'Employee', 'Amount', 'Date', 'Description'].map(h => (
                          <Text key={h} style={[styles.th, h === 'Employee' ? styles.colWide : h === 'Description' ? styles.colDesc : styles.colMed]}>{h}</Text>
                        ))}
                      </View>
                      {advanceRows.map((a, i) => (
                        <View key={a.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                          <Text style={[styles.td, styles.colWide]}>{fullName(a.user_info ?? {})}</Text>
                          <Text style={[styles.td, styles.colMed]}>{fmtRs(a.amount)}</Text>
                          <Text style={[styles.td, styles.colMed]}>{display(a.date)}</Text>
                          <Text style={[styles.td, styles.colDesc]}>{a.description ?? '—'}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
              }
            </SectionCard>

            {/* Loan Register */}
            <SectionCard title="Loan Register" count={loanRows.length}>
              {loanRows.length === 0
                ? <EmptyRow msg="No loans were found for the selected scope." />
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.thead}>
                        {['S.No', 'Employee', 'Amount', 'Remaining', 'Start Date', 'Status'].map(h => (
                          <Text key={h} style={[styles.th, h === 'Employee' ? styles.colWide : styles.colMed]}>{h}</Text>
                        ))}
                      </View>
                      {loanRows.map((l, i) => (
                        <View key={l.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                          <Text style={[styles.td, styles.colWide]}>{fullName(l.staff_info ?? l.user_info ?? {})}</Text>
                          <Text style={[styles.td, styles.colMed]}>{fmtRs(l.amount)}</Text>
                          <Text style={[styles.td, styles.colMed]}>{fmtRs(l.remaining_amount)}</Text>
                          <Text style={[styles.td, styles.colMed]}>{display(l.return_start_date ?? l.date)}</Text>
                          <Text style={[styles.td, styles.colMed]}>{l.status ?? '—'}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
              }
            </SectionCard>

            {/* Promotion History */}
            <SectionCard title="Promotion History" count={promotionRows.length}>
              {promotionRows.length === 0
                ? <EmptyRow msg="No promotion history was found in the selected HR scope." />
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.thead}>
                        {['S.No', 'Employee', 'Old Designation', 'New Designation', 'Date'].map(h => (
                          <Text key={h} style={[styles.th, h === 'Employee' ? styles.colWide : styles.colMed]}>{h}</Text>
                        ))}
                      </View>
                      {promotionRows.map((p, i) => (
                        <View key={p.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                          <Text style={[styles.td, styles.colWide]}>{fullName(p.user_info ?? {})}</Text>
                          <Text style={[styles.td, styles.colMed]}>{p.old_designation ?? '—'}</Text>
                          <Text style={[styles.td, styles.colMed]}>{p.new_designation ?? '—'}</Text>
                          <Text style={[styles.td, styles.colMed]}>{display(p.date ?? p.created_at)}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
              }
            </SectionCard>
          </>
        )}

        {loading && <ActivityIndicator color={R} style={{ marginVertical: 30 }} />}
      </ScrollView>

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={!!pickerFor}
        mode="date"
        date={new Date((pickerFor === 'from' ? fromDate : toDate) + 'T00:00:00')}
        onConfirm={d => {
          if (pickerFor === 'from') setFromDate(fmt(d));
          else setToDate(fmt(d));
          setPickerFor(null);
        }}
        onCancel={() => setPickerFor(null)}
      />

      {/* Department Modal */}
      <Modal visible={showDeptModal} transparent animationType="fade" onRequestClose={() => setShowDeptModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDeptModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Department</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setDepartment(null); setShowDeptModal(false); }}>
                <Text style={styles.dropdownItemText}>All Departments</Text>
              </TouchableOpacity>
              {departments.map(d => (
                <TouchableOpacity key={d.id} style={styles.dropdownItem} onPress={() => { setDepartment(d); setShowDeptModal(false); }}>
                  <Text style={styles.dropdownItemText}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Designation Modal */}
      <Modal visible={showDesigModal} transparent animationType="fade" onRequestClose={() => setShowDesigModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDesigModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Designation</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setDesignation(null); setShowDesigModal(false); }}>
                <Text style={styles.dropdownItemText}>All Designations</Text>
              </TouchableOpacity>
              {designations.map(d => (
                <TouchableOpacity key={d.id} style={styles.dropdownItem} onPress={() => { setDesignation(d); setShowDesigModal(false); }}>
                  <Text style={styles.dropdownItemText}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Employee Modal */}
      <Modal visible={showEmpModal} transparent animationType="fade" onRequestClose={() => setShowEmpModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowEmpModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Employee</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setEmployee(null); setShowEmpModal(false); }}>
                <Text style={styles.dropdownItemText}>All Employees</Text>
              </TouchableOpacity>
              {employees.map(e => (
                <TouchableOpacity key={e.id} style={styles.dropdownItem} onPress={() => { setEmployee(e); setShowEmpModal(false); }}>
                  <Text style={styles.dropdownItemText}>{e.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default DetailedHRReport;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 17 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 8 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  row2: { flexDirection: 'row', gap: 10 },
  col2: { flex: 1 },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },
  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },
  errText: { color: '#C62828', fontSize: 13, marginTop: 8, fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  genBtn: {
    flex: 1, backgroundColor: '#C62828', borderRadius: 6,
    alignItems: 'center', paddingVertical: 12,
  },
  btnDisabled: { opacity: 0.6 },
  genBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resetBtn: {
    flex: 1, borderWidth: 1, borderColor: '#555', borderRadius: 6,
    alignItems: 'center', paddingVertical: 12,
  },
  resetBtnText: { color: '#444', fontWeight: '600', fontSize: 14 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  summaryCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 8, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  summaryLabel: { fontSize: 11, color: '#666', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  recordsBadge: {
    backgroundColor: '#1565C0', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
  },
  recordsText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 12, fontSize: 12 },

  thead: { flexDirection: 'row', backgroundColor: '#C62828', paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 11, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },

  colSr: { width: 32 },
  colSm: { width: 80 },
  colMed: { width: 100 },
  colWide: { width: 140 },
  colDate: { width: 88 },
  colPhone: { width: 130 },
  colDesc: { width: 160 },

  unpaidBadge: {
    backgroundColor: '#E65100', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  unpaidText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '82%', maxHeight: 420 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
