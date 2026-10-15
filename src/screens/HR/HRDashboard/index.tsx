import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Pressable, Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import BurgerSVG from '../../../assets/svg/BurgerSVG';
import { RootState } from '../../../redux/store';
import { getStaffList, getBranchesNameList, getDepartmentNames, getDesignationNames } from '../../../api/employeeDashboard';
import api from '../../../api/service';

// The web's HR dashboard (/hr-dashboard) builds every figure in the browser
// from the calls below — HAR 2026-10-15, HR login. There is no summary
// endpoint: /v1/hr/dashboard is never called by the web.
//   /v1/auth/get?status=1&limit=1000&account_type=staff          roster
//   /v1/attendance/index?category=2&type=Staff&start_date=prev&end_date=next
//   /v1/hr/leave-application/index?status=1&limit=1000           every application
//   /v1/hr/employee-duty-hour-requests/index?approval_status=Pending  (404 when none)
//   /v1/hr/staff-documents/index?approval_status=Pending              (404 when none)
// Every count below was checked against that capture: 79 staff (F-11 55,
// G-13 24); today F-11 45 present / 12 late, G-13 23 / 2; Present Details
// 140, Late 29, Absent 3, Leave 2; approved leave 127 / 24 / 12 = 163.

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
};

const fmtDisplay = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** "YYYY-MM-DD" as a local date — `new Date(iso)` is UTC and can slip a day. */
const parseIso = (iso?: string | null): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!m || m[1] === '0000') return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const dayLabel = (iso?: string) => {
  const d = parseIso(iso);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
};

const monthDay = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

/** Whole years from `from` to `at` — the web's "Age" and anniversary "Years". */
const completedYears = (from: Date, at: Date) =>
  at.getFullYear() - from.getFullYear() -
  (at.getMonth() < from.getMonth() || (at.getMonth() === from.getMonth() && at.getDate() < from.getDate()) ? 1 : 0);

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// ── Attendance row helpers, ported from the web's own dashboard logic ────────
// (main.1010f2c7.js, captured 2026-09-17).

/** Duty window: `duty_hours` is "HH:MM - HH:MM" when set, else start/end_time. */
const dutyWindowOf = (a: any): { start: string | null; end: string | null } => {
  const dh = a?.duty_hours;
  if (dh && typeof dh === 'string' && dh.includes('-')) {
    const [s1, e1] = dh.split('-').map((x: string) => x.trim());
    return { start: s1 || null, end: e1 || null };
  }
  return { start: a?.start_time || null, end: a?.end_time || null };
};

const toMinutes = (t?: string | null): number | null => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

/**
 * "Late By" text. The API's `is_late` flag wins when present; the 15-minute
 * grace period is only the fallback for rows where it is null — same
 * precedence the web uses.
 */
const lateInfo = (a: any, dutyStart: string | null): { isLate: boolean; text: string; minutes: number } => {
  const start = toMinutes(dutyStart);
  const checkin = toMinutes(a?.checkin_time_24h);
  if (start == null || checkin == null) {
    return { isLate: Number(a?.is_late) === 1, text: Number(a?.is_late) === 1 ? 'Late' : 'On Time', minutes: 0 };
  }
  const diff = checkin > start ? checkin - start : 0;
  const isLate = a?.is_late != null ? Number(a.is_late) === 1 : checkin > start + 15;
  if (!isLate) return { isLate: false, text: 'On Time', minutes: 0 };
  const h = Math.floor(diff / 60);
  return { isLate: true, text: `${h > 0 ? `${h}h ` : ''}${diff % 60}m`.trim(), minutes: diff };
};

/** Records from either `{data: [...]}` or Laravel's `{data: {data: [...]}}`. */
const listOf = (res: any): any[] => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const BRANCH_COLORS = { f11: '#1E88E5', g13: '#43A047' };
const DEPT_COLORS = ['#E63946', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#D81B60', '#F57F17'];

type BranchKey = 'f11' | 'g13' | 'other';
type DayStats = { present: number; onTime: number; late: number; absent: number; leave: number };
type DayKey = 'prev' | 'today' | 'next';

const DAY_TITLES: Record<DayKey, string> = { prev: 'Previous Day', today: 'Today', next: 'Next Day' };
const ZERO_DAY: DayStats = { present: 0, onTime: 0, late: 0, absent: 0, leave: 0 };

// ── Tables ────────────────────────────────────────────────────────────────────

type AttCol = { label: string; key: string; w: number; badge?: 'status' | 'late'; date?: boolean };

const PRESENT_COLS: AttCol[] = [
  { label: 'Employee', key: 'name', w: 150 },
  { label: 'Date', key: 'date', w: 100, date: true },
  { label: 'Duty Hours', key: 'duty_hours', w: 150 },
  { label: 'Check In', key: 'checkin_time', w: 90 },
  { label: 'Check Out', key: 'checkout_time', w: 90 },
  { label: 'Working Hours', key: 'working_hours', w: 100 },
  { label: 'Branch', key: 'branch', w: 70 },
  { label: 'Designation', key: 'designation', w: 140 },
  { label: 'Department', key: 'department', w: 140 },
  { label: 'Status', key: 'status', w: 90, badge: 'status' },
];

const LATE_COLS: AttCol[] = [
  { label: 'Employee', key: 'name', w: 150 },
  { label: 'Date', key: 'date', w: 100, date: true },
  { label: 'Duty Hours', key: 'duty_hours', w: 150 },
  { label: 'Check In', key: 'checkin_time', w: 90 },
  { label: 'Late By', key: 'late_time', w: 90, badge: 'late' },
  { label: 'Branch', key: 'branch', w: 70 },
  { label: 'Designation', key: 'designation', w: 140 },
  { label: 'Department', key: 'department', w: 140 },
];

const ABSENT_COLS: AttCol[] = [
  { label: 'Employee', key: 'name', w: 150 },
  { label: 'Date', key: 'date', w: 100, date: true },
  { label: 'Reason', key: 'reason', w: 140 },
  { label: 'Remarks', key: 'remarks', w: 140 },
  { label: 'Branch', key: 'branch', w: 70 },
  { label: 'Designation', key: 'designation', w: 140 },
  { label: 'Department', key: 'department', w: 140 },
];

// Staff Register — the Staff Details section and the Total / F-11 / G-13 popups.
const STAFF_COLS: AttCol[] = [
  { label: 'Employee', key: 'name', w: 170 },
  { label: 'Employee ID', key: 'uid', w: 110 },
  { label: 'Branch', key: 'branch', w: 70 },
  { label: 'Department', key: 'department', w: 160 },
  { label: 'Designation', key: 'designation', w: 170 },
  { label: 'Joining Date', key: 'joining', w: 110, date: true },
  { label: 'Phone', key: 'phone', w: 130 },
];

// Approved Leaves — one row per person per day of the window.
const LEAVE_COLS: AttCol[] = [
  { label: 'Employee', key: 'name', w: 150 },
  { label: 'Date', key: 'date', w: 100, date: true },
  { label: 'Leave From', key: 'leave_from_date', w: 100, date: true },
  { label: 'Leave To', key: 'leave_to_date', w: 100, date: true },
  { label: 'Leave Type', key: 'leave_type', w: 90 },
  { label: 'Reason', key: 'reason', w: 220 },
  { label: 'Branch', key: 'branch', w: 70 },
  { label: 'Designation', key: 'designation', w: 140 },
  { label: 'Department', key: 'department', w: 140 },
];

// Pending leave applications.
const LEAVE_REQUEST_COLS: AttCol[] = [
  { label: 'Employee', key: 'name', w: 150 },
  { label: 'Branch', key: 'branch', w: 70 },
  { label: 'Leave Type', key: 'leave_type', w: 90 },
  { label: 'From', key: 'from', w: 100, date: true },
  { label: 'To', key: 'to', w: 100, date: true },
  { label: 'Days', key: 'days', w: 50 },
  { label: 'Reason', key: 'reason', w: 220 },
  { label: 'Submitted', key: 'submitted', w: 100, date: true },
];

// Duty-hour and document requests 404 when there are none, so no row has
// been captured yet; these read the field names the other HR lists use.
const REQUEST_COLS: AttCol[] = [
  { label: 'Employee', key: 'name', w: 170 },
  { label: 'Branch', key: 'branch', w: 70 },
  { label: 'Date', key: 'date', w: 100, date: true },
  { label: 'Status', key: 'status', w: 90 },
];

const DEPT_DETAIL_COLS: AttCol[] = [
  { label: 'Department', key: 'name', w: 170 },
  { label: 'F-11', key: 'f11', w: 50 },
  { label: 'G-13', key: 'g13', w: 50 },
  { label: 'Total', key: 'total', w: 50 },
  { label: 'Designations', key: 'designations', w: 280 },
];

const AttTable = ({ rows, cols, empty, index = true }: { rows: any[]; cols: AttCol[]; empty: string; index?: boolean }) => {
  if (!rows || rows.length === 0) return <Text style={styles.attEmpty}>{empty}</Text>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={styles.attHeadRow}>
          {index && <Text style={[styles.attTh, styles.attSr]}>S.No</Text>}
          {cols.map(c => (
            <Text key={c.key} style={[styles.attTh, { width: c.w }]}>{c.label}</Text>
          ))}
        </View>
        {rows.map((r, i) => (
          <View key={r.id ?? i} style={[styles.attRow, i % 2 === 1 && styles.attRowAlt]}>
            {index && <Text style={[styles.attTd, styles.attSr]}>{i + 1}</Text>}
            {cols.map(c => {
              const v = r[c.key];
              if (c.badge) {
                const amber = c.badge === 'late' || String(v) === 'Late';
                return (
                  <View key={c.key} style={{ width: c.w }}>
                    <View style={[styles.attBadge, amber ? styles.attBadgeLate : styles.attBadgeOk]}>
                      <Text style={styles.attBadgeText}>{v ?? '—'}</Text>
                    </View>
                  </View>
                );
              }
              const blank = v == null || v === '' || String(v).startsWith('0000');
              return (
                <Text key={c.key} style={[styles.attTd, { width: c.w }]} numberOfLines={2}>
                  {blank ? 'N/A' : c.date ? dayLabel(String(v)) : String(v)}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionTitle = ({ title, note }: { title: string; note?: string }) => (
  <View>
    <Text style={styles.sectionTitle}>{title}</Text>
    {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
  </View>
);

const Card = ({ title, note, children }: { title: string; note?: string; children?: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {note ? <Text style={styles.cardNote}>{note}</Text> : null}
    {children}
  </View>
);

const StaffCard = ({ label, value, sub, color, onPress }: { label: string; value: any; sub?: string; color: string; onPress?: () => void }) => (
  <TouchableOpacity style={[styles.staffCard, { borderTopColor: color }]} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
    <Text style={styles.staffLabel}>{label}</Text>
    <Text style={[styles.staffValue, { color }]}>{value ?? '—'}</Text>
    {sub ? <Text style={styles.staffSub}>{sub}</Text> : null}
  </TouchableOpacity>
);

const Legend = ({ items }: { items: { label: string; color: string }[] }) => (
  <View style={styles.legend}>
    {items.map(i => (
      <View key={i.label} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: i.color }]} />
        <Text style={styles.legendText}>{i.label}</Text>
      </View>
    ))}
  </View>
);

/** Donut split across slices, same drawing as the Admin Dashboard's. */
const Donut = ({ parts, size, centre, caption }: {
  parts: { value: number; color: string }[]; size: number; centre: number; caption: string;
}) => {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={20} fill="none" />
        {total > 0 && parts.map((p, i) => {
          const len = (p.value / total) * c;
          const el = (
            <Circle
              key={i}
              cx={size / 2} cy={size / 2} r={r}
              stroke={p.color} strokeWidth={20} fill="none"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </G>
      <SvgText x={size / 2} y={size / 2 + 2} fontSize={18} fontWeight="800" fill="#1a1a1a" textAnchor="middle">{centre}</SvgText>
      <SvgText x={size / 2} y={size / 2 + 18} fontSize={11} fill="#888" textAnchor="middle">{caption}</SvgText>
    </Svg>
  );
};

/**
 * The web's bar charts as labelled horizontal bars — readable at phone width,
 * where the web's vertical bars with rotated axis labels are not.
 */
type BarGroup = { label: string; bars: { value: number; color: string }[] };
const BarGroups = ({ groups }: { groups: BarGroup[] }) => {
  const max = Math.max(1, ...groups.flatMap(g => g.bars.map(b => b.value)));
  return (
    <View style={styles.barGroups}>
      {groups.map(g => (
        <View key={g.label} style={styles.barGroup}>
          <Text style={styles.barGroupLabel}>{g.label}</Text>
          {g.bars.map((b, i) => (
            <View key={i} style={styles.barLine}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(b.value / max) * 100}%`, backgroundColor: b.color }]} />
              </View>
              <Text style={styles.barValue}>{b.value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const BranchPerformance = ({ title, staff, day, color }: { title: string; staff: number; day: DayStats; color: string }) => (
  <View style={[styles.card, styles.perfCard, { borderTopColor: color }]}>
    <View style={styles.perfHead}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.perfStaff}>{staff} staff</Text>
    </View>
    <View style={styles.perfGrid}>
      {([
        ['Present', day.present, '#1a1a1a'],
        ['On time', day.onTime, '#43A047'],
        ['Late', day.late, '#FB8C00'],
        ['Absent', day.absent, '#E63946'],
        ['On leave', day.leave, '#1E88E5'],
      ] as const).map(([label, value, c]) => (
        <View key={label} style={styles.perfCell}>
          <Text style={styles.perfLabel}>{label}</Text>
          <Text style={[styles.perfValue, { color: c }]}>{value}</Text>
        </View>
      ))}
    </View>
    <Text style={styles.cardNote}>
      {day.onTime} on time out of {day.present} present ({pct(day.onTime, day.present)}%).
    </Text>
  </View>
);

const AttendanceDayCard = ({
  title, date, day, f11, g13, highlighted, onPress,
}: {
  title: string; date: string; day: DayStats; f11: DayStats; g13: DayStats; highlighted?: boolean; onPress?: () => void;
}) => (
  <TouchableOpacity
    style={[styles.attCard, highlighted && styles.attCardHighlighted]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.7}
  >
    <View style={styles.attCardHeader}>
      <Text style={[styles.attCardTitle, highlighted && styles.attCardTitleHighlighted]}>{title}</Text>
      <Text style={styles.attCardDate}>{dayLabel(date)}</Text>
    </View>
    <View style={styles.attGrid}>
      <View style={styles.attCell}>
        <Text style={styles.attCellLabel}>Present</Text>
        <Text style={[styles.attCellVal, { color: '#43A047' }]}>{day.present}</Text>
      </View>
      <View style={styles.attCell}>
        <Text style={styles.attCellLabel}>On Leave</Text>
        <Text style={styles.attCellVal}>{day.leave}</Text>
      </View>
      <View style={styles.attCell}>
        <Text style={styles.attCellLabel}>Late</Text>
        <Text style={[styles.attCellVal, { color: '#FB8C00' }]}>{day.late}</Text>
      </View>
      <View style={styles.attCell}>
        <Text style={styles.attCellLabel}>Absent</Text>
        <Text style={[styles.attCellVal, { color: '#E63946' }]}>{day.absent}</Text>
      </View>
    </View>
    <View style={styles.branchBreakdown}>
      <Text style={styles.branchBreakText}>F-11: P {f11.present} | L {f11.late} | A {f11.absent} | Lv {f11.leave}</Text>
      <Text style={styles.branchBreakText}>G-13: P {g13.present} | L {g13.late} | A {g13.absent} | Lv {g13.leave}</Text>
    </View>
  </TouchableOpacity>
);

const SummaryBanner = ({
  title, color, counts, onPress,
}: {
  title: string; color: string; counts: Record<DayKey, number>; onPress?: () => void;
}) => (
  <TouchableOpacity
    style={[styles.summaryBanner, { borderLeftColor: color }]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.7}
  >
    <View style={styles.summaryBannerHeader}>
      <Text style={[styles.summaryBannerTitle, { color }]}>{title}</Text>
      <View style={[styles.summaryBannerBadge, { backgroundColor: color }]}>
        <Text style={styles.summaryBannerBadgeText}>{counts.prev + counts.today + counts.next}</Text>
      </View>
    </View>
    <Text style={styles.summaryBannerSub}>Quick day-wise summary</Text>
    <View style={styles.summaryChips}>
      <View style={styles.summaryChip}><Text style={styles.summaryChipText}>Previous Day: {counts.prev}</Text></View>
      <View style={styles.summaryChip}><Text style={styles.summaryChipText}>Today: {counts.today}</Text></View>
      <View style={styles.summaryChip}><Text style={styles.summaryChipText}>Next Day: {counts.next}</Text></View>
    </View>
  </TouchableOpacity>
);

const ApprovalCard = ({ label, value, color, note }: { label: string; value: number; color: string; note: string }) => (
  <View style={styles.approvalCard}>
    <Text style={styles.approvalLabel}>{label}</Text>
    <Text style={[styles.approvalValue, { color }]}>{value}</Text>
    <Text style={styles.approvalNote}>{note}</Text>
  </View>
);

const CollapsibleSection = ({
  title, count, color, children,
}: {
  title: string; count: number; color: string; children?: React.ReactNode;
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
      {open && <View style={{ marginTop: 10 }}>{children}</View>}
    </View>
  );
};

// ── Card details popup ────────────────────────────────────────────────────────
// What the web's HR dashboard shows when a card is clicked (captured
// 2026-09-30): count chips on top, then one or more tables. Everything comes
// from the data already loaded — the web makes no extra calls either.
type DetailSection = { title: string; color: string; rows: any[]; cols: AttCol[]; empty: string };
type DetailSheet = { title: string; subtitle: string; badges: { label: string; value: number }[]; sections: DetailSection[] };

const DetailsModal = ({ sheet, onClose }: { sheet: DetailSheet | null; onClose: () => void }) => (
  <Modal visible={!!sheet} animationType="slide" onRequestClose={onClose}>
    {/* A full-screen Modal is a separate native root outside the app's safe-area
        provider, so it needs its own — without it the insets read 0 and the
        header slides under the status bar / notch. */}
    <SafeAreaProvider>
    {/* Bottom only: AppHeader pads the top inset itself. */}
    <SafeAreaView style={styles.detailSafe} edges={['bottom']}>
      <AppHeader
        title={sheet?.title ?? ''}
        leftIcon={<Icon name="close" size={24} color="#1A1A1A" />}
        onLeftPress={onClose}
        backgroundColor="#FFE5E5"
      />
      <ScrollView style={styles.detailBody} contentContainerStyle={styles.scroll}>
        {!!sheet?.subtitle && <Text style={styles.detailSubtitle}>{sheet.subtitle}</Text>}
        <View style={styles.detailBadges}>
          {sheet?.badges.map(b => (
            <View key={b.label} style={styles.summaryChip}>
              <Text style={styles.summaryChipText}>{b.label}: {b.value}</Text>
            </View>
          ))}
        </View>
        {sheet?.sections.map(sec => (
          <View key={sec.title} style={styles.card}>
            <View style={styles.detailSectionHead}>
              <Text style={[styles.collapseTitle, { color: sec.color }]}>{sec.title}</Text>
              <View style={[styles.collapseBadge, { backgroundColor: sec.color + '20' }]}>
                <Text style={[styles.collapseBadgeText, { color: sec.color }]}>{sec.rows.length}</Text>
              </View>
            </View>
            <AttTable rows={sec.rows} cols={sec.cols} empty={sec.empty} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
    </SafeAreaProvider>
  </Modal>
);

// ── Picker sheet (branch / department / designation) ─────────────────────────

type Option = { id: string; label: string; value?: number };
type Picker = { title: string; options: Option[]; selected: string; onPick: (o: Option) => void };

const PickerModal = ({ picker, onClose }: { picker: Picker | null; onClose: () => void }) => (
  <Modal visible={!!picker} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      {/* Bottom edge only: keeps the last option clear of the home indicator. */}
      <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{picker?.title}</Text>
        <ScrollView style={{ maxHeight: 420 }}>
          {picker?.options.map(opt => {
            const on = picker.selected === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.modalOption, on && styles.modalOptionSelected]}
                onPress={() => { picker.onPick(opt); onClose(); }}
              >
                <Icon name={on ? 'check-circle' : 'circle-outline'} size={20} color={on ? '#E63946' : '#ccc'} style={{ marginRight: 10 }} />
                <Text style={[styles.modalOptionText, on && { color: '#E63946', fontWeight: '700' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Pressable>
  </Modal>
);

const FilterField = ({ icon, text, onPress }: { icon: string; text: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.filterField} onPress={onPress}>
    <Icon name={icon} size={16} color="#666" style={{ marginRight: 6 }} />
    <Text style={styles.filterFieldText} numberOfLines={1}>{text}</Text>
    <Icon name="chevron-down" size={16} color="#666" />
  </TouchableOpacity>
);

// ── Main Screen ───────────────────────────────────────────────────────────────

const ALL_BRANCHES: Option = { id: '0', label: 'All Branches', value: undefined };
const ALL_DEPTS: Option = { id: '0', label: 'All departments' };
const ALL_DESIGS: Option = { id: '0', label: 'All designations' };

type Raw = { staff: any[]; att: any[]; leaves: any[]; duty: any[]; docs: any[]; branchId?: number; date: Date };

// `asHome` is set when this is the HR login's Home tab, where the left action
// opens the drawer instead of going back.
const HRDashboard = ({ asHome = false }: { asHome?: boolean }) => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);

  const [raw, setRaw] = useState<Raw | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Branch-scoped logins (e.g. the F-11 / G-13 admins) only get their own
  // branch; "All Branches" is for users with no branch (HR, super admin).
  const ownBranch: Option | null = profile?.branchId
    ? { id: String(profile.branchId), label: profile.branchName ?? 'My Branch', value: profile.branchId as number }
    : null;

  // Real ids come from /v1/branches/branches-name-list: F 11 = 15, G 13 = 1
  // (not the reverse), so this stays dynamic rather than hardcoded.
  const [branchOptions, setBranchOptions] = useState<Option[]>([ownBranch ?? ALL_BRANCHES]);
  const [branch, setBranch] = useState<Option>(ownBranch ?? ALL_BRANCHES);
  const [deptOptions, setDeptOptions] = useState<Option[]>([ALL_DEPTS]);
  const [dept, setDept] = useState<Option>(ALL_DEPTS);
  const [desigOptions, setDesigOptions] = useState<Option[]>([ALL_DESIGS]);
  const [desig, setDesig] = useState<Option>(ALL_DESIGS);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [sheet, setSheet] = useState<DetailSheet | null>(null);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const named = (res: any): Option[] =>
      (res?.data ?? []).map((x: any) => ({ id: String(x.id), label: x.name, value: Number(x.id) }));
    if (!profile?.branchId) {
      getBranchesNameList().then(res => setBranchOptions([ALL_BRANCHES, ...named(res)])).catch(() => {});
    }
    getDepartmentNames().then(res => setDeptOptions([ALL_DEPTS, ...named(res)])).catch(() => {});
    getDesignationNames().then(res => setDesigOptions([ALL_DESIGS, ...named(res)])).catch(() => {});
  }, [profile?.branchId]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const prevStr = fmtDate(new Date(date.getTime() - 86400000));
      const nextStr = fmtDate(new Date(date.getTime() + 86400000));
      const bId = branch.value;
      const [staffRes, attRes, leaveRes, dutyRes, docRes] = await Promise.allSettled([
        // account_type=staff, as the web sends: without it the server's
        // default counts login accounts into Total Staff.
        getStaffList({ branch_id: bId, status: 1, limit: 1000, account_type: 'staff' }),
        api.get('/v1/attendance/index', {
          params: { category: 2, type: 'Staff', branch_id: bId, start_date: prevStr, end_date: nextStr, limit: 1000, page: 1 },
        }),
        api.get('/v1/hr/leave-application/index', { params: { page: 1, branch_id: bId, status: 1, limit: 1000 } }),
        api.get('/v1/hr/employee-duty-hour-requests/index', {
          params: { branch_id: bId, approval_status: 'Pending', status: 1, limit: 1000 },
        }),
        api.get('/v1/hr/staff-documents/index', {
          params: { page: 1, branch_id: bId, approval_status: 'Pending', status: 1, limit: 1000 },
        }),
      ]);
      // A rejected call (the two request lists 404 when empty) reads as no rows.
      const rows = (r: PromiseSettledResult<any>, unwrap = true) =>
        r.status === 'fulfilled' ? listOf(unwrap ? r.value?.data : r.value) : [];
      setRaw({
        staff: rows(staffRes, false),
        att: rows(attRes),
        leaves: rows(leaveRes),
        duty: rows(dutyRes),
        docs: rows(docRes),
        branchId: bId,
        date,
      });
    } catch {
      setRaw(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, branch]);

  useEffect(() => { load(); }, [load]);

  // ── Everything the page shows, derived from the five lists ────────────────
  // Department / designation narrow the roster client-side — the web sends
  // neither to the API (department_id is blank on its /auth/get call).
  const d = useMemo(() => {
    if (!raw) return null;
    const f11Id = branchOptions.find(o => o.label === 'F 11')?.value ?? 15;
    const g13Id = branchOptions.find(o => o.label === 'G 13')?.value ?? 1;
    const keyOf = (id: any): BranchKey =>
      Number(id) === Number(f11Id) ? 'f11' : Number(id) === Number(g13Id) ? 'g13' : 'other';
    const branchName = (id: any) => ({ f11: 'F 11', g13: 'G 13', other: 'N/A' }[keyOf(id)]);
    // The API does not enforce branch scoping (verified 2026-09-14).
    const inBranch = (r: any) => raw.branchId === undefined || Number(r?.branch_id) === Number(raw.branchId);
    const narrowed = dept.id !== '0' || desig.id !== '0';

    const staff = raw.staff
      .filter(inBranch)
      .filter(s => dept.id === '0' || String(s.department_id) === dept.id)
      .filter(s => desig.id === '0' || String(s.designation_id) === desig.id);
    const staffById: Record<string, any> = {};
    staff.forEach(s => { staffById[String(s.id)] = s; });

    const prevStr = fmtDate(new Date(raw.date.getTime() - 86400000));
    const todayStr = fmtDate(raw.date);
    const nextStr = fmtDate(new Date(raw.date.getTime() + 86400000));
    const dates: Record<DayKey, string> = { prev: prevStr, today: todayStr, next: nextStr };

    const staffCount = { f11: 0, g13: 0, other: 0, total: staff.length };
    staff.forEach(s => { staffCount[keyOf(s.branch_id)]++; });

    // Attendance counts only people on this roster — that is how the web gets
    // G-13 today to 23 present / 2 late from 24 / 3 raw rows.
    const att = raw.att.filter(inBranch).filter(a => staffById[String(a.attendee_id)]);
    const attRows = att
      .map((a: any) => {
        const w = dutyWindowOf(a);
        const late = lateInfo(a, w.start);
        const who = staffById[String(a.attendee_id)];
        const present = a.attendance_status === 'Present';
        return {
          id: `${a.id ?? a.attendee_id}-${a.date}`,
          branch_id: a.branch_id,
          department_id: who?.department_id,
          name: `${a.attendee?.first_name ?? ''} ${a.attendee?.last_name ?? ''}`.trim() || who?.name || 'N/A',
          date: a.date,
          duty_hours: w.start && w.end ? `${w.start} - ${w.end}` : 'N/A',
          checkin_time: a.checkin_time_12h ?? 'N/A',
          checkout_time: a.checkout_time_12h ?? 'N/A',
          working_hours: a.working_hours ?? 'N/A',
          branch: branchName(a.branch_id),
          designation: a.designation ?? who?.designation ?? 'N/A',
          department: who?.department ?? 'N/A',
          reason: a.reason ?? 'N/A',
          remarks: a.remarks ?? 'N/A',
          late_time: late.text,
          _lateMin: late.minutes,
          status: late.isLate ? 'Late' : 'Present',
          _present: present,
          _late: present && late.isLate,
          _absent: a.attendance_status === 'Absent',
        };
      })
      .sort((x, y) => String(x.date).localeCompare(String(y.date)) || x.name.localeCompare(y.name));

    // Leave applications. Approvals and leave types count every application
    // in scope (the web's "Other" column is a third branch, id 33); "On leave"
    // counts approved ones covering a window day for someone on the roster.
    const apps = raw.leaves
      .filter(inBranch)
      .filter(l => !narrowed || staffById[String(l.user_id ?? l.user_info?.id)]);
    const leaveRows = apps
      .filter(l => l.application_status === 'Approved')
      .flatMap(l => {
        const uid = String(l.user_id ?? l.user_info?.id ?? '');
        const who = staffById[uid];
        if (!who || !l.from || !l.to) return [];
        return [prevStr, todayStr, nextStr]
          .filter(day => day >= l.from && day <= l.to)
          .map(day => ({
            id: `${l.id}-${uid}-${day}`,
            branch_id: l.branch_id ?? who.branch_id,
            department_id: who.department_id,
            name: l.user_info?.name || who.name || 'N/A',
            date: day,
            leave_from_date: l.from,
            leave_to_date: l.to,
            leave_type: l.leave_type || 'N/A',
            reason: l.reason || 'N/A',
            branch: l.branch_info?.name || who.branch_name || 'N/A',
            designation: who.designation || 'N/A',
            department: who.department || 'N/A',
          }));
      })
      .sort((x, y) => x.date.localeCompare(y.date) || x.name.localeCompare(y.name));

    const statsOf = (day: string, match: (r: any) => boolean = () => true): DayStats => {
      const rows = attRows.filter(r => r.date === day && match(r));
      const present = rows.filter(r => r._present).length;
      const late = rows.filter(r => r._late).length;
      return {
        present, late, onTime: present - late,
        absent: rows.filter(r => r._absent).length,
        leave: leaveRows.filter(r => r.date === day && match(r)).length,
      };
    };
    const isF11 = (r: any) => keyOf(r.branch_id) === 'f11';
    const isG13 = (r: any) => keyOf(r.branch_id) === 'g13';
    const days = {} as Record<DayKey, { all: DayStats; f11: DayStats; g13: DayStats }>;
    (Object.keys(dates) as DayKey[]).forEach(k => {
      days[k] = { all: statsOf(dates[k]), f11: statsOf(dates[k], isF11), g13: statsOf(dates[k], isG13) };
    });

    // Departments: totals per branch plus a designation breakdown, largest first.
    const deptMap: Record<string, { id: any; total: number; f11: number; g13: number; desigs: Record<string, number> }> = {};
    staff.forEach(s => {
      const name = s.department || 'Other';
      if (!deptMap[name]) deptMap[name] = { id: s.department_id, total: 0, f11: 0, g13: 0, desigs: {} };
      const e = deptMap[name];
      e.total++;
      const k = keyOf(s.branch_id);
      if (k !== 'other') e[k]++;
      const dn = s.designation || 'N/A';
      e.desigs[dn] = (e.desigs[dn] ?? 0) + 1;
    });
    const depts = Object.entries(deptMap)
      .map(([name, e]) => ({
        name, id: e.id, total: e.total, f11: e.f11, g13: e.g13,
        designations: Object.entries(e.desigs).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} (${c})`).join(', '),
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    // Selected day by department — alphabetical, as the web lists it.
    const fmtStats = (s: DayStats) => `${s.present} / ${s.late} / ${s.absent} / ${s.leave}`;
    const deptDay = [...depts]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(dp => {
        const inDept = (r: any) => String(r.department_id) === String(dp.id);
        return {
          id: dp.name,
          name: dp.name,
          f11: fmtStats(statsOf(todayStr, r => inDept(r) && isF11(r))),
          g13: fmtStats(statsOf(todayStr, r => inDept(r) && isG13(r))),
        };
      });

    // Birthdays (everyone born this month) and anniversaries (whose next
    // anniversary falls this month — so past ones drop out, exactly as on the
    // web, where only Ghulam Fareed's Oct 17 showed on Oct 15). Ages and
    // years are completed years at the selected date.
    const sel = raw.date;
    const person = (s: any) => ({
      id: s.id, branch_id: s.branch_id, name: s.name || 'N/A', branch: s.branch_name || 'N/A',
      designation: s.designation || 'N/A', department: s.department || 'N/A',
    });
    const birthdays = staff
      .map(s => ({ s, dob: parseIso(s.dob) }))
      .filter(({ dob }) => dob && dob.getMonth() === sel.getMonth())
      .map(({ s, dob }) => ({ ...person(s), day: dob!.getDate(), when: monthDay(dob!), years: completedYears(dob!, sel) }))
      .sort((a, b) => a.day - b.day);
    const anniversaries = staff
      .map(s => ({ s, j: parseIso(s.joining) }))
      .filter(({ j }) => !!j)
      .map(({ s, j }) => {
        let next = new Date(sel.getFullYear(), j!.getMonth(), j!.getDate());
        if (next < new Date(sel.getFullYear(), sel.getMonth(), sel.getDate())) next = new Date(sel.getFullYear() + 1, j!.getMonth(), j!.getDate());
        return { s, j: j!, next };
      })
      .filter(({ next }) => next.getMonth() === sel.getMonth() && next.getFullYear() === sel.getFullYear())
      .map(({ s, j, next }) => ({ ...person(s), day: next.getDate(), when: dayLabel(fmtDate(next)), years: completedYears(j, sel) }))
      .sort((a, b) => a.day - b.day);

    // Per-branch tallies for the tables with F-11 / G-13 / Other / Total.
    const tally = (rows: any[], branchOf: (r: any) => any = r => r.branch_id) => {
      const t = { f11: 0, g13: 0, other: 0, total: rows.length };
      rows.forEach(r => { t[keyOf(branchOf(r))]++; });
      return t;
    };
    const pendingApps = apps.filter(l => l.application_status === 'Pending');
    const approvedApps = apps.filter(l => l.application_status === 'Approved');
    const duty = raw.duty.filter(inBranch);
    const docs = raw.docs.filter(inBranch);
    const approvalsTable = [
      { id: 'pl', name: 'Pending leave', ...tally(pendingApps) },
      { id: 'al', name: 'Approved leave', ...tally(approvedApps) },
      { id: 'dh', name: 'Duty-hour requests', ...tally(duty) },
      { id: 'dr', name: 'Document reviews', ...tally(docs) },
      { id: 'bd', name: 'Birthdays this month', ...tally(birthdays) },
      { id: 'an', name: 'Anniversaries this month', ...tally(anniversaries) },
    ];

    const byType = (list: any[]) => {
      const m: Record<string, any[]> = {};
      list.forEach(l => {
        const t = l.leave_type || 'Unspecified';
        (m[t] = m[t] ?? []).push(l);
      });
      return Object.entries(m)
        .map(([name, rows]) => ({ id: name, name, ...tally(rows) }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    };

    const bucket = (s: any) => {
      const j = parseIso(s.joining);
      const y = j ? completedYears(j, sel) : 0;
      return y < 1 ? 0 : y < 3 ? 1 : y < 5 ? 2 : 3;
    };
    const service = ['Under 1 year', '1–3 years', '3–5 years', '5 years or more'].map((name, i) => ({
      id: name, name, ...tally(staff.filter(s => bucket(s) === i)),
    }));

    const staffRegister = staff
      .map(s => ({
        id: s.id, branch_id: s.branch_id, name: s.name || 'N/A', uid: s.uid || 'N/A',
        branch: s.branch_name || 'N/A', department: s.department || 'N/A',
        designation: s.designation || 'N/A', joining: s.joining, phone: s.phone || 'N/A',
      }))
      .sort((x, y) => x.department.localeCompare(y.department) || x.name.localeCompare(y.name));

    const leaveRequests = pendingApps.map(l => ({
      id: l.id, name: l.user_info?.name || 'N/A', branch: l.branch_info?.name || branchName(l.branch_id),
      leave_type: l.leave_type || 'Unspecified', from: l.from, to: l.to, days: l.number_of_leaves ?? 'N/A',
      reason: l.reason || 'N/A', submitted: l.submission_date,
    }));
    const requestRows = (list: any[]) => list.map((r, i) => ({
      id: r.id ?? i,
      name: r.user_info?.name || r.staff_info?.name || r.name || 'N/A',
      branch: r.branch_info?.name || branchName(r.branch_id),
      date: r.date || r.created_at,
      status: r.approval_status || 'Pending',
    }));

    return {
      f11Id, g13Id, dates, staffCount, days, depts, deptDay, birthdays, anniversaries,
      approvalsTable, pendingLeaveTypes: byType(pendingApps), approvedLeaveTypes: byType(approvedApps), service,
      counts: { pendingLeave: pendingApps.length, approvedLeave: approvedApps.length, duty: duty.length, docs: docs.length },
      details: {
        staff: staffRegister,
        present: attRows.filter(r => r._present),
        // Late: by date, then most-late first, as the web sorts it.
        late: attRows.filter(r => r._late)
          .sort((x, y) => String(x.date).localeCompare(String(y.date)) || y._lateMin - x._lateMin),
        absent: attRows.filter(r => r._absent),
        leave: leaveRows,
        leaveRequests,
        duty: requestRows(duty),
        docs: requestRows(docs),
      },
    };
  }, [raw, dept, desig, branchOptions]);

  // Which branches the selected scope covers.
  const showF11 = !!d && (branch.value === undefined || branch.value === d.f11Id);
  const showG13 = !!d && (branch.value === undefined || branch.value === d.g13Id);
  const branchSeries = [
    ...(showF11 ? [{ key: 'f11' as const, label: 'F-11', color: BRANCH_COLORS.f11 }] : []),
    ...(showG13 ? [{ key: 'g13' as const, label: 'G-13', color: BRANCH_COLORS.g13 }] : []),
  ];
  const scopeLabel = branch.value === undefined ? 'All Branches' : branch.label;

  // ── Card popups (same content as the web's) ────────────────────────────────
  const openStaff = (scope: 'all' | 'f11' | 'g13') => {
    if (!d) return;
    const rows = scope === 'all'
      ? d.details.staff
      : d.details.staff.filter(r => Number(r.branch_id) === Number(scope === 'f11' ? d.f11Id : d.g13Id));
    setSheet({
      title: { all: 'Total Staff Details', f11: 'F-11 Staff Details', g13: 'G-13 Staff Details' }[scope],
      subtitle: `Current scope: ${scopeLabel}`,
      badges: [{ label: 'Records', value: rows.length }],
      sections: [{ title: 'Staff Register', color: '#1a1a1a', rows, cols: STAFF_COLS, empty: 'No staff records found for this scope.' }],
    });
  };

  const openDay = (k: DayKey) => {
    if (!d) return;
    const day = d.dates[k];
    const s = d.days[k].all;
    const onDay = (r: any) => r.date === day;
    setSheet({
      title: `${DAY_TITLES[k]} Details`,
      subtitle: dayLabel(day),
      badges: [
        { label: 'Present', value: s.present },
        { label: 'Late', value: s.late },
        { label: 'Absent', value: s.absent },
        { label: 'On Leave', value: s.leave },
      ],
      sections: [
        { title: 'Present Staff', color: '#43A047', rows: d.details.present.filter(onDay), cols: PRESENT_COLS, empty: 'No present staff found for this day.' },
        { title: 'Late Staff', color: '#FB8C00', rows: d.details.late.filter(onDay), cols: LATE_COLS, empty: 'No late staff found for this day.' },
        { title: 'Absent Staff', color: '#E63946', rows: d.details.absent.filter(onDay), cols: ABSENT_COLS, empty: 'No absent staff found for this day.' },
        { title: 'Approved Leaves', color: '#00ACC1', rows: d.details.leave.filter(onDay), cols: LEAVE_COLS, empty: 'No approved leave records found for this day.' },
      ],
    });
  };

  const openSummary = (kind: 'late' | 'absent') => {
    if (!d) return;
    const title = kind === 'late' ? 'Late Summary Details' : 'Absent Summary Details';
    setSheet({
      title,
      subtitle: `Attendance window: ${dayLabel(d.dates.prev)} to ${dayLabel(d.dates.next)}`,
      badges: (['prev', 'today', 'next'] as DayKey[]).map(k => ({ label: DAY_TITLES[k], value: d.days[k].all[kind] })),
      sections: [kind === 'late'
        ? { title, color: '#FB8C00', rows: d.details.late, cols: LATE_COLS, empty: 'No late staff found in the current 3-day summary window.' }
        : { title, color: '#E63946', rows: d.details.absent, cols: ABSENT_COLS, empty: 'No absent staff found in the current 3-day summary window.' }],
    });
  };

  const branchCols = (first: string, w = 150): AttCol[] => [
    { label: first, key: 'name', w },
    { label: 'F-11', key: 'f11', w: 50 },
    { label: 'G-13', key: 'g13', w: 50 },
    { label: 'Other', key: 'other', w: 50 },
    { label: 'Total', key: 'total', w: 50 },
  ];

  const PeopleTable = ({ rows, kind }: { rows: any[]; kind: 'birthday' | 'anniversary' }) => (
    <>
      {branchSeries.map(b => {
        const list = rows.filter(r => Number(r.branch_id) === Number(b.key === 'f11' ? d?.f11Id : d?.g13Id));
        return (
          <View key={b.key} style={{ marginTop: 8 }}>
            <View style={styles.peopleHead}>
              <Text style={styles.peopleBranch}>{b.label}</Text>
              <Text style={styles.peopleCount}>{list.length}</Text>
            </View>
            {list.length === 0 ? (
              <Text style={styles.attEmpty}>
                No {kind === 'birthday' ? 'birthdays' : 'anniversaries'} at {b.label} this month.
              </Text>
            ) : list.map((p, i) => (
              <View key={p.id} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.peopleName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.peopleSub} numberOfLines={1}>{p.designation} · {p.department}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: kind === 'birthday' ? '#E63946' : '#1a1a1a' }]}>
                  <Text style={styles.tagText}>{p.when}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: kind === 'birthday' ? '#00ACC1' : '#43A047' }]}>
                  <Text style={styles.tagText}>{p.years} years</Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const today = d?.days.today;

  return (
    <View style={styles.container}>
      <AppHeader
        title="HR Dashboard"
        leftIcon={
          !asHome && navigation.canGoBack()
            ? <Icon name="arrow-left" size={24} color="#1A1A1A" />
            : <BurgerSVG width={24} height={24} />
        }
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => (!asHome && navigation.canGoBack() ? navigation.goBack() : navigation.openDrawer())}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, picked) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (picked) setDate(picked);
          }}
        />
      )}

      <DetailsModal sheet={sheet} onClose={() => setSheet(null)} />
      <PickerModal picker={picker} onClose={() => setPicker(null)} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
      >
        {/* ── Filters ───────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardNote}>Filter the branch and date, then refresh the dashboard summary.</Text>
          <View style={styles.filterRow}>
            <FilterField
              icon="office-building"
              text={branch.label}
              onPress={() => setPicker({ title: 'Select Branch', options: branchOptions, selected: branch.id, onPick: setBranch })}
            />
            <FilterField icon="calendar" text={fmtDisplay(date)} onPress={() => setShowDatePicker(true)} />
          </View>
          <View style={styles.filterRow}>
            <FilterField
              icon="domain"
              text={dept.label}
              onPress={() => setPicker({ title: 'Select Department', options: deptOptions, selected: dept.id, onPick: setDept })}
            />
            <FilterField
              icon="badge-account-outline"
              text={desig.label}
              onPress={() => setPicker({ title: 'Select Designation', options: desigOptions, selected: desig.id, onPick: setDesig })}
            />
          </View>
          {d && (
            <Text style={styles.cardNote}>
              Attendance window: {dayLabel(d.dates.prev)} to {dayLabel(d.dates.next)}.
            </Text>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={() => load()}>
            <Text style={styles.refreshBtnText}>Refresh Dashboard</Text>
          </TouchableOpacity>
        </View>

        {loading || !d || !today ? (
          <View style={styles.center}>
            {loading
              ? <ActivityIndicator size="large" color="#E63946" />
              : <Text style={styles.emptyText}>Could not load the dashboard. Pull down to retry.</Text>}
          </View>
        ) : (
          <>
            {/* ── Staff Overview ───────────────────────────────────────── */}
            <SectionTitle title="Staff Overview" />
            <StaffCard
              label="Total Staff"
              value={d.staffCount.total}
              color="#E63946"
              sub="Active staff in scope (system logins & partners excluded; electricians included)."
              onPress={() => openStaff('all')}
            />
            <View style={styles.staffRow}>
              {showF11 && <StaffCard label="F-11 Staff" value={d.staffCount.f11} color="#00ACC1" sub="Branch Total" onPress={() => openStaff('f11')} />}
              {showG13 && <StaffCard label="G-13 Staff" value={d.staffCount.g13} color="#43A047" sub="Branch Total" onPress={() => openStaff('g13')} />}
            </View>

            {/* ── Branch performance ───────────────────────────────────── */}
            <SectionTitle
              title="Branch performance"
              note={`Today · ${dayLabel(d.dates.today)}. On time is present minus late.`}
            />
            {showF11 && <BranchPerformance title="F-11" staff={d.staffCount.f11} day={today.f11} color={BRANCH_COLORS.f11} />}
            {showG13 && <BranchPerformance title="G-13" staff={d.staffCount.g13} day={today.g13} color={BRANCH_COLORS.g13} />}

            {/* ── Charts ───────────────────────────────────────────────── */}
            <Card title="Staff by branch" note={`${d.staffCount.total} active staff in the current filter.`}>
              <View style={styles.donutWrap}>
                <Donut
                  size={150}
                  centre={d.staffCount.total}
                  caption="Staff"
                  parts={branchSeries.map(b => ({ value: d.staffCount[b.key], color: b.color }))}
                />
              </View>
              <Legend items={branchSeries.map(b => ({ label: `${b.label} (${d.staffCount[b.key]})`, color: b.color }))} />
            </Card>

            <Card title="Selected day by branch" note="Present, on time, late, absent and leave for the day shown above.">
              <BarGroups
                groups={([
                  ['Present', 'present'], ['On time', 'onTime'], ['Late', 'late'], ['Absent', 'absent'], ['On leave', 'leave'],
                ] as const).map(([label, k]) => ({
                  label,
                  bars: branchSeries.map(b => ({ value: today[b.key][k], color: b.color })),
                }))}
              />
              <Legend items={branchSeries} />
            </Card>

            <Card title="Attendance window by branch" note="Each bar is the branch count already shown on the day cards.">
              <BarGroups
                groups={(['prev', 'today', 'next'] as DayKey[]).map(k => ({
                  label: DAY_TITLES[k],
                  bars: branchSeries.flatMap(b => [
                    { value: d.days[k][b.key].present, color: b.color },
                    { value: d.days[k][b.key].absent, color: b.key === 'f11' ? '#C62828' : '#FB8C00' },
                  ]),
                }))}
              />
              <Legend
                items={branchSeries.flatMap(b => [
                  { label: `${b.label} present`, color: b.color },
                  { label: `${b.label} absent`, color: b.key === 'f11' ? '#C62828' : '#FB8C00' },
                ])}
              />
            </Card>

            <Card title="Late and leave by branch" note="Late staff are also included in present.">
              <BarGroups
                groups={(['prev', 'today', 'next'] as DayKey[]).map(k => ({
                  label: DAY_TITLES[k],
                  bars: branchSeries.flatMap(b => [
                    { value: d.days[k][b.key].late, color: b.key === 'f11' ? '#B5541C' : '#E0A526' },
                    { value: d.days[k][b.key].leave, color: b.key === 'f11' ? '#1565C0' : '#00796B' },
                  ]),
                }))}
              />
              <Legend
                items={branchSeries.flatMap(b => [
                  { label: `${b.label} late`, color: b.key === 'f11' ? '#B5541C' : '#E0A526' },
                  { label: `${b.label} on leave`, color: b.key === 'f11' ? '#1565C0' : '#00796B' },
                ])}
              />
            </Card>

            <Card title="Departments by branch" note="Bar length uses the same totals as the department cards.">
              <BarGroups
                groups={d.depts.map(dp => ({
                  label: dp.name,
                  bars: branchSeries.map(b => ({ value: dp[b.key], color: b.color })),
                }))}
              />
              <Legend items={branchSeries} />
            </Card>

            {/* ── Tables ───────────────────────────────────────────────── */}
            <Card title="Selected day by department" note="Present / late / absent / leave. Each person is counted in the branch they belong to.">
              <AttTable
                index={false}
                rows={d.deptDay}
                cols={[
                  { label: 'Department', key: 'name', w: 170 },
                  ...(showF11 ? [{ label: 'F-11 P / L / A / Lv', key: 'f11', w: 130 }] : []),
                  ...(showG13 ? [{ label: 'G-13 P / L / A / Lv', key: 'g13', w: 130 }] : []),
                ]}
                empty="No departments in the current filter."
              />
            </Card>

            <Card title="Approvals and this month" note="Pending work and celebrations, split by branch.">
              <AttTable index={false} rows={d.approvalsTable} cols={branchCols('Item', 170)} empty="" />
            </Card>

            <Card title="Service length" note="Grouped from each staff member's joining date.">
              <AttTable index={false} rows={d.service} cols={branchCols('Service')} empty="" />
            </Card>

            <Card title="Leave types" note="Pending and approved applications, counted once each.">
              <Text style={styles.subHead}>Pending</Text>
              <AttTable index={false} rows={d.pendingLeaveTypes} cols={branchCols('Type')} empty="No pending applications." />
              <Text style={styles.subHead}>Approved</Text>
              <AttTable index={false} rows={d.approvedLeaveTypes} cols={branchCols('Type')} empty="No approved applications." />
            </Card>

            {/* ── Department Summary ───────────────────────────────────── */}
            <SectionTitle title="Department Summary" />
            {d.depts.length > 0 ? d.depts.map((dp, i) => (
              <View key={dp.name} style={styles.card}>
                <View style={styles.deptCardHeader}>
                  <Text style={styles.deptCardName}>{dp.name}</Text>
                  <View style={[styles.deptBadge, { backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }]}>
                    <Text style={styles.deptBadgeText}>{dp.total}</Text>
                  </View>
                </View>
                <View style={styles.deptBranchRow}>
                  {showF11 && <Text style={styles.deptBranchChip}>F-11: {dp.f11}</Text>}
                  {showG13 && <Text style={styles.deptBranchChip}>G-13: {dp.g13}</Text>}
                </View>
                <View style={styles.splitBar}>
                  {showF11 && <View style={{ flex: dp.f11, backgroundColor: BRANCH_COLORS.f11 }} />}
                  {showG13 && <View style={{ flex: dp.g13, backgroundColor: BRANCH_COLORS.g13 }} />}
                </View>
                <Text style={styles.deptRoles}>{dp.designations}</Text>
              </View>
            )) : (
              <View style={[styles.card, styles.emptyBox]}>
                <Icon name="domain" size={32} color="#ccc" />
                <Text style={styles.emptyText}>No department data available</Text>
              </View>
            )}

            {/* ── Attendance Summary ───────────────────────────────────── */}
            <SectionTitle title="Attendance Summary" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attScroll}>
              {(['prev', 'today', 'next'] as DayKey[]).map(k => (
                <AttendanceDayCard
                  key={k}
                  title={DAY_TITLES[k]}
                  date={d.dates[k]}
                  day={d.days[k].all}
                  f11={d.days[k].f11}
                  g13={d.days[k].g13}
                  highlighted={k === 'today'}
                  onPress={() => openDay(k)}
                />
              ))}
            </ScrollView>

            <SummaryBanner
              title="Late Summary"
              color="#FB8C00"
              counts={{ prev: d.days.prev.all.late, today: d.days.today.all.late, next: d.days.next.all.late }}
              onPress={() => openSummary('late')}
            />
            <SummaryBanner
              title="Absent Summary"
              color="#E63946"
              counts={{ prev: d.days.prev.all.absent, today: d.days.today.all.absent, next: d.days.next.all.absent }}
              onPress={() => openSummary('absent')}
            />

            {/* ── Approvals ────────────────────────────────────────────── */}
            <SectionTitle title="Approvals" />
            <View style={styles.approvalRow}>
              <ApprovalCard
                label="Pending Leave Applications"
                value={d.counts.pendingLeave}
                color="#FB8C00"
                note="Review, approve, or reject leave requests below. Quota updates on approval."
              />
              <ApprovalCard
                label="Approved Leave Applications"
                value={d.counts.approvedLeave}
                color="#43A047"
                note="Approved leave records currently loaded for the selected branch."
              />
            </View>
            <View style={styles.approvalRow}>
              <ApprovalCard
                label="Pending Duty-Hour Requests"
                value={d.counts.duty}
                color="#FB8C00"
                note="Employees can request new timings, but changes only apply after HR approval."
              />
              <ApprovalCard
                label="Pending Document Reviews"
                value={d.counts.docs}
                color="#00ACC1"
                note="Approved documents become view-only on the employee dashboard."
              />
            </View>

            {/* ── Birthdays / Anniversaries ────────────────────────────── */}
            <Card title={`Birthdays This Month (${raw!.date.toLocaleDateString('en-US', { month: 'long' })})`}>
              <PeopleTable rows={d.birthdays} kind="birthday" />
            </Card>
            <Card title={`Anniversaries This Month (${raw!.date.toLocaleDateString('en-US', { month: 'long' })})`}>
              <PeopleTable rows={d.anniversaries} kind="anniversary" />
            </Card>

            {/* ── Details (collapsible) ────────────────────────────────── */}
            <SectionTitle title="Details" note="All detailed views stay collapsed by default and appear only when opened." />
            <View style={styles.detailsCard}>
              <CollapsibleSection title="Staff Details" count={d.details.staff.length} color="#E63946">
                <AttTable rows={d.details.staff} cols={STAFF_COLS} empty="No staff records found for this scope." />
              </CollapsibleSection>
              <View style={styles.divider} />
              <CollapsibleSection title="Department Details" count={d.depts.length} color="#1a1a1a">
                <AttTable rows={d.depts} cols={DEPT_DETAIL_COLS} empty="No departments in the current filter." />
              </CollapsibleSection>
              <View style={styles.divider} />
              <CollapsibleSection title="Present Details" count={d.details.present.length} color="#43A047">
                <AttTable rows={d.details.present} cols={PRESENT_COLS} empty="No present staff found in this window." />
              </CollapsibleSection>
              <View style={styles.divider} />
              <CollapsibleSection title="Late Details" count={d.details.late.length} color="#FB8C00">
                <AttTable rows={d.details.late} cols={LATE_COLS} empty="No late staff found in this window." />
              </CollapsibleSection>
              <View style={styles.divider} />
              <CollapsibleSection title="Absent Details" count={d.details.absent.length} color="#E63946">
                <AttTable rows={d.details.absent} cols={ABSENT_COLS} empty="No absent staff found in this window." />
              </CollapsibleSection>
              <View style={styles.divider} />
              <CollapsibleSection title="Leave Details" count={d.details.leave.length} color="#00ACC1">
                <AttTable rows={d.details.leave} cols={LEAVE_COLS} empty="No approved leave in this window." />
              </CollapsibleSection>
              <View style={styles.divider} />
              <CollapsibleSection title="Leave Application Requests" count={d.details.leaveRequests.length} color="#FB8C00">
                <AttTable rows={d.details.leaveRequests} cols={LEAVE_REQUEST_COLS} empty="No pending leave applications." />
              </CollapsibleSection>
              <View style={styles.divider} />
              <CollapsibleSection title="Duty-Hour Change Requests" count={d.details.duty.length} color="#FB8C00">
                <AttTable rows={d.details.duty} cols={REQUEST_COLS} empty="No pending duty-hour requests." />
              </CollapsibleSection>
              <View style={styles.divider} />
              <CollapsibleSection title="Document Approval Requests" count={d.details.docs.length} color="#E63946">
                <AttTable rows={d.details.docs} cols={REQUEST_COLS} empty="No pending document reviews." />
              </CollapsibleSection>
            </View>

            <View style={{ height: 30 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const shadow = { elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll: { padding: 14, paddingBottom: 20 },
  center: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },

  // Cards
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, ...shadow },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  cardNote: { fontSize: 11, color: '#888', marginTop: 3, marginBottom: 8, lineHeight: 15 },
  subHead: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', marginTop: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 8, marginTop: 12 },
  sectionNote: { fontSize: 11, color: '#888', marginTop: -4, marginBottom: 8 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  filterField: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA',
  },
  filterFieldText: { flex: 1, fontSize: 13, color: '#333' },
  refreshBtn: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Picker
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

  // Staff Overview
  staffRow: { flexDirection: 'row', gap: 10 },
  staffCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderTopWidth: 3, ...shadow },
  staffLabel: { fontSize: 12, fontWeight: '700', color: '#555' },
  staffValue: { fontSize: 26, fontWeight: '900', marginTop: 2 },
  staffSub: { fontSize: 10, color: '#888', marginTop: 4 },

  // Branch performance
  perfCard: { borderTopWidth: 3 },
  perfHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  perfStaff: { fontSize: 12, color: '#555', fontWeight: '600' },
  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  perfCell: { width: '31%', backgroundColor: '#F5F6FA', borderRadius: 8, padding: 8 },
  perfLabel: { fontSize: 11, color: '#888' },
  perfValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  // Charts
  donutWrap: { alignItems: 'center', marginVertical: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: '#555' },
  barGroups: { gap: 10 },
  barGroup: { gap: 3 },
  barGroupLabel: { fontSize: 12, fontWeight: '600', color: '#333' },
  barLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { width: 28, fontSize: 11, color: '#555', textAlign: 'right' },

  // Department
  deptCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  deptCardName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  deptBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  deptBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  deptBranchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  deptBranchChip: {
    fontSize: 12, backgroundColor: '#F0F0F0', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6, color: '#555', fontWeight: '600',
  },
  splitBar: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: '#F0F0F0', marginBottom: 8 },
  deptRoles: { fontSize: 12, color: '#888' },

  // Attendance
  attScroll: { marginBottom: 10 },
  attCard: {
    width: 220, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginRight: 10,
    borderWidth: 1, borderColor: '#eee', ...shadow,
  },
  attCardHighlighted: { borderColor: '#E63946', borderWidth: 2 },
  attCardHeader: { marginBottom: 8 },
  attCardTitle: { fontSize: 13, fontWeight: '700', color: '#888' },
  attCardTitleHighlighted: { color: '#E63946' },
  attCardDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  attGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  attCell: { width: '45%' },
  attCellLabel: { fontSize: 11, color: '#aaa' },
  attCellVal: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  branchBreakdown: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8, gap: 3 },
  branchBreakText: { fontSize: 11, color: '#888' },

  // Late/Absent Summary
  summaryBanner: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 4, ...shadow },
  summaryBannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  summaryBannerTitle: { fontSize: 13, fontWeight: '700' },
  summaryBannerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  summaryBannerBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  summaryBannerSub: { fontSize: 10, color: '#aaa', marginBottom: 8 },
  summaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summaryChip: { backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  summaryChipText: { fontSize: 12, color: '#555', fontWeight: '600' },

  // Approvals
  approvalRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  approvalCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, ...shadow },
  approvalLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 4 },
  approvalValue: { fontSize: 28, fontWeight: '900', marginBottom: 6 },
  approvalNote: { fontSize: 10, color: '#aaa', lineHeight: 14 },

  // Birthdays / anniversaries
  peopleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  peopleBranch: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  peopleCount: { fontSize: 12, fontWeight: '700', color: '#555', backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  peopleName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  peopleSub: { fontSize: 11, color: '#888', marginTop: 1 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center', gap: 6, borderRadius: 6 },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  tagText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  // Tables
  attHeadRow:  { flexDirection: 'row', backgroundColor: '#F3F6FA', paddingVertical: 9, paddingHorizontal: 4, borderRadius: 6 },
  attTh:       { fontSize: 11, fontWeight: '700', color: '#44506A', paddingHorizontal: 6 },
  attRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  attRowAlt:   { backgroundColor: '#FAFBFD' },
  attTd:       { fontSize: 11, color: '#333', paddingHorizontal: 6 },
  attSr:       { width: 42 },
  attEmpty:    { fontSize: 12, color: '#999', paddingVertical: 14, textAlign: 'center' },
  attBadge:    { alignSelf: 'flex-start', marginHorizontal: 6, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  attBadgeOk:   { backgroundColor: '#2E7D32' },
  attBadgeLate: { backgroundColor: '#F0AD2B' },
  attBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Detail popup
  detailSafe:  { flex: 1, backgroundColor: '#FFE5E5' },
  detailBody:  { flex: 1, backgroundColor: '#F5F7FA' },
  detailSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  detailBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  detailSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },

  // Details
  detailsCard: { backgroundColor: '#fff', borderRadius: 12, ...shadow },
  collapseWrapper: { paddingHorizontal: 14, paddingVertical: 12 },
  collapseRow: { flexDirection: 'row', alignItems: 'center' },
  collapseTitle: { fontSize: 14, fontWeight: '700' },
  collapseBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  collapseBadgeText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 14 },

  // Empty
  emptyBox: { alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: '#aaa' },
});

export default HRDashboard;
