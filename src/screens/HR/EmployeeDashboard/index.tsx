// src/screens/HR/EmployeeDashboard/index.tsx
//
// The web admin's Employee Dashboard — the entire surface a staff record with
// no role gets. Confirmed live 2026-09-07 with khawar1973.kk@gmail.com
// (Executive Director, branch 15): a blank `role` resolves to "Employee" and
// the menu holds this one item.
//
// Everything here is already-existing API: getEmployeeDashboardStats supplies
// the five tiles and today's attendance in one batched call, and each tab
// binds to its own endpoint in api/employeeDashboard.ts.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image,
  TextInput, Alert, Modal, Linking,
} from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import QuickDates from '../../../components/QuickDates';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { roleLabelOf } from '../../../config/permissions';
import {
  getEmployeeDashboardStats, getStaffDetail, getAttendanceList, getDutyHours,
  getSalaryList, getLeaveApplications, getProfileEntries, getStaffDocuments,
  updateStaffProfile,
  // Panels the web's page loads alongside each tab's main list. Adding these
  // is what turns Duty Hours / Salary / Leave from a flat list into the web's
  // two- and three-panel layouts.
  getDutyHourRequests, createDutyHourRequest,
  getLeaveQuota, checkLeaveExists, checkLeaveEligibility,
  checkLeaveAvailability, submitLeaveApplication,
  getPromotions, createProfileEntry, updateProfileEntry, addStaffDocument,
} from '../../../api/employeeDashboard';

const TABS = [
  'Profile', 'Attendance', 'Duty Hours', 'Salary', 'Leave',
  'Qualifications & Experience', 'Documents',
] as const;
type Tab = typeof TABS[number];

// The web's wording, shown when the signed-in employee has no branch.
const NO_BRANCH_MESSAGE = 'Branch is not assigned on this employee profile.';

const fmtDate = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const monthsAgo = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return fmtDate(d); };
// The web's date fields read MM/DD/YYYY; its table column reads M/D/YYYY.
const display = (iso: string) => { const [y, m, d] = (iso ?? '').split('-'); return y ? `${m}/${d}/${y}` : '—'; };
const cellDate = (iso: string) => {
  const [y, m, d] = String(iso ?? '').split('-');
  return y ? `${Number(m)}/${Number(d)}/${y}` : '—';
};
// "Late" is derived, not a status value: rows come back attendance_status
// "Present" with is_late 1, and the web's Status column reads LATE.
const attStatus = (r: any) => (Number(r?.is_late) ? 'Late' : String(r?.attendance_status ?? '').trim() || 'N/A');
// duty_hours is usually null; the slot lives in start_time/end_time.
const dutyWindow = (r: any) => {
  const dh = String(r?.duty_hours ?? '').trim();
  if (dh && dh !== 'null') return dh;
  const a = String(r?.start_time ?? '').trim();
  const b = String(r?.end_time ?? '').trim();
  return a && b ? `${a} - ${b}` : 'N/A';
};
const rs = (n: any) => `Rs ${Math.round(Number(n) || 0).toLocaleString()}`;
const dash = (v: any) => {
  const s = String(v ?? '').trim();
  return s && s !== 'null' && s !== '0000-00-00' ? s : 'N/A';
};

// The API answers oldest first; the web lists the newest date on top. Stable
// sort keeps same-day rows in the API's order, as on the web.
const newestFirst = (rows: any[]) =>
  [...rows].sort((a, b) => String(b?.date ?? '').localeCompare(String(a?.date ?? '')));

const list = (res: any): any[] => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
};

// Emoji + title + subtitle, the empty/error block every other screen uses
// (TransactionReport, DetailedCafeReport).
// Approval/application states share one vocabulary across duty-hour requests,
// leave applications and documents, so one mapper serves all three panels.
const statusTone = (v: any) => {
  const t = String(v ?? '').trim().toLowerCase();
  if (t === 'approved') return s.badgeOk;
  if (t === 'rejected' || t === 'declined') return s.badgeBad;
  return s.badgeWarn;
};

// Dropdown option lists. The web renders these as <select>s whose options are
// hardcoded in its bundle rather than fetched, so they are mirrored literally.
const LEAVE_TYPES = ['Annual', 'Casual', 'Sick', 'Unpaid', 'Maternity'];
const ENTRY_TYPES = ['Qualification', 'Experience', 'Education'];
const DOC_TYPES = ['CNIC', 'CV', 'Experience Letter', 'Certificate', 'Other'];

// One bottom-sheet picker for every <select> on the page.
const OptionSheet = ({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title: string;
  options: { key: string; label: string }[];
  selected: string; onSelect: (key: string) => void; onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
      <View style={s.sheet}>
        <View style={s.sheetHead}>
          <Text style={s.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Icon name="close" size={20} color="#888" />
          </TouchableOpacity>
        </View>
        <ScrollView>
          {options.length === 0
            ? <Text style={s.emptyInline}>Nothing to choose from.</Text>
            : options.map(o => (
              <TouchableOpacity key={o.key} style={s.optionRow} onPress={() => onSelect(o.key)}>
                <Text style={s.optionText} numberOfLines={1}>{o.label}</Text>
                {selected === o.key && <Icon name="check" size={18} color="#E63946" />}
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

const Chip = ({ text }: { text: string }) => (
  <View style={s.chip}><Text style={s.chipText}>{text}</Text></View>
);

const StatTile = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <View style={s.tile}>
    <Text style={s.tileLabel}>{label}</Text>
    <Text style={s.tileValue}>{value}</Text>
    <Text style={s.tileHint}>{hint}</Text>
  </View>
);

const Row = ({ label, value }: { label: string; value: any }) => (
  <View style={s.infoRow}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{dash(value)}</Text>
  </View>
);

const Section = ({ tag, title, subtitle, children }: {
  tag: string; title: string; subtitle?: string; children: React.ReactNode;
}) => (
  <View style={s.card}>
    <Text style={s.sectionTag}>{tag}</Text>
    <Text style={s.sectionTitle}>{title}</Text>
    {!!subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
    {children}
  </View>
);

const Empty = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <View style={s.empty}>
    <Text style={s.emptyIcon}>{icon}</Text>
    <Text style={s.emptyTitle}>{title}</Text>
    <Text style={s.emptySubtitle}>{subtitle}</Text>
  </View>
);

// `focusContact` is a timestamp, not a boolean, so tapping the drawer's edit
// icon again re-triggers the jump even when the tab is already Profile.
const EmployeeDashboardScreen = ({ focusContact }: { focusContact?: number }) => {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const userId = Number(profile?.id ?? 0);
  const branchId = profile?.branchId || '';

  const [tab, setTab] = useState<Tab>('Profile');
  const [stats, setStats] = useState<any>(null);
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tabData, setTabData] = useState<Record<string, any[]>>({});
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState<Record<string, string>>({});

  // Attendance carries its own range, like the web's Attendance History filter.
  const [attStart, setAttStart] = useState(monthsAgo(1));
  const [attEnd, setAttEnd] = useState(fmtDate(new Date()));
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);

  // Secondary data per tab. `tabData` holds each tab's main list; the web's
  // page loads a companion list beside it — duty-hour requests next to the
  // slots, promotions next to salary, quota next to leave applications — and
  // these panels are what the app was missing.
  const [extra, setExtra] = useState<Record<string, any[]>>({});

  // ── Tab forms ──────────────────────────────────────────────────────────────
  // Every one of these posts to an endpoint that has never been exercised
  // against production (writes are read-only-verified only), so each submit
  // surfaces the server's own message rather than assuming success.
  const [dutyForm, setDutyForm] = useState({ slotId: 0, start: '', end: '', reason: '' });
  const [dutySlotOpen, setDutySlotOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'Annual', category: 'Full' as 'Full' | 'Half',
    from: fmtDate(new Date()), to: fmtDate(new Date()), reason: '',
  });
  const [leavePicker, setLeavePicker] = useState<'from' | 'to' | null>(null);
  const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    id: 0, entry_type: 'Qualification', title: '', organization: '',
    location: '', start_date: '', end_date: '', description: '',
  });
  const [entryTypeOpen, setEntryTypeOpen] = useState(false);
  const [entryPicker, setEntryPicker] = useState<'start' | 'end' | null>(null);
  const [docForm, setDocForm] = useState({
    document_type: 'CNIC', subject: '', document_code: '',
    issue_date: fmtDate(new Date()), description: '',
  });
  const [docTypeOpen, setDocTypeOpen] = useState(false);
  const [docPicker, setDocPicker] = useState(false);
  const [docFile, setDocFile] = useState<Asset | null>(null);
  const [submitting, setSubmitting] = useState('');

  // "Update Contact Details" — the one editable surface the web gives this role.
  const [form, setForm] = useState({ cnic: '', email: '', phone: '', password: '', address: '' });
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const seeded = useRef(false);

  // The web's "Change Information" modal: first name, last name, email.
  const [modalOpen, setModalOpen] = useState(false);
  const [identity, setIdentity] = useState({ first_name: '', last_name: '', email: '' });
  const [savingIdentity, setSavingIdentity] = useState(false);
  const handledEdit = useRef<number | undefined>(undefined);

  // The web pre-fills this form from /v1/auth/get/{id} rather than showing
  // empty placeholders, so the employee edits their current details instead of
  // retyping them. Seed once, and never re-seed over a half-typed edit.
  const seedForm = useCallback((src: any) => {
    if (!src) return;
    setForm({
      cnic: String(src.cnic ?? ''),
      email: String(src.email ?? ''),
      phone: String(src.phone ?? ''),
      password: '', // never pre-filled; blank means "leave the password alone"
      address: String(src.address ?? ''),
    });
  }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    Promise.allSettled([
      getEmployeeDashboardStats({ branch_id: branchId, user_id: userId }),
      getStaffDetail(userId, Number(branchId) || 0),
    ]).then(([st, sd]) => {
      if (cancelled) return;
      if (st.status === 'fulfilled') setStats(st.value);
      if (sd.status === 'fulfilled') {
        const rec = sd.value?.data;
        setStaff(Array.isArray(rec) ? rec[0] : rec ?? null);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, branchId]);

  // Each tab fetches once, on first visit.
  const loadTab = useCallback(async (t: Tab) => {
    if (t === 'Profile' || tabData[t]) return;
    // The web refuses to load attendance for a profile with no branch (HR,
    // branch_id 0) and says so, rather than querying and showing "no records".
    if (t === 'Attendance' && !branchId) {
      setTabData(d => ({ ...d, Attendance: [] }));
      setTabError(e => ({ ...e, Attendance: NO_BRANCH_MESSAGE }));
      return;
    }
    setTabLoading(true);
    const common = { branch_id: branchId, user_id: userId, limit: 50 };
    try {
      let rows: any[] = [];
      if (t === 'Attendance') {
        rows = newestFirst(list(await getAttendanceList({
          branch_id: branchId, member_id: userId,
          start_date: attStart, end_date: attEnd, limit: 500,
        })));
      } else if (t === 'Duty Hours') {
        // Two panels: the assigned slots, and the change requests raised
        // against them. Settled, not awaited together — a 404 on either (which
        // is how this API family says "none") must not blank the other.
        const [slots, reqs] = await Promise.allSettled([
          getDutyHours({ branch_id: branchId, staff_id: userId, limit: 50 }),
          getDutyHourRequests({ branch_id: branchId, user_id: userId, limit: 100 }),
        ]);
        rows = slots.status === 'fulfilled' ? list(slots.value) : [];
        setExtra(x => ({ ...x, 'Duty Hours': reqs.status === 'fulfilled' ? list(reqs.value) : [] }));
      } else if (t === 'Salary') {
        // The web calls /v1/salary with a date window — getSalaryList, not
        // getSalarySlips. It answers 403 for a blank role ("Unauthorized. Your
        // role cannot access this resource."), handled below.
        //
        // Promotions back the web's "Career Growth" panel and are fetched
        // separately so a 403 on /v1/salary still leaves that panel populated —
        // confirmed 2026-09-23 that role 17 gets 403 on salary but 200 on
        // promotions, and the web shows the promotion row regardless.
        const [sal, promos] = await Promise.allSettled([
          getSalaryList({
            branch_id: branchId, user_id: userId,
            start_date: monthsAgo(1), end_date: fmtDate(new Date()), limit: 50,
          }),
          getPromotions({ branch_id: branchId, user_id: userId, limit: 50 }),
        ]);
        setExtra(x => ({ ...x, Salary: promos.status === 'fulfilled' ? list(promos.value) : [] }));
        if (sal.status === 'rejected') throw sal.reason;
        rows = list(sal.value);
      } else if (t === 'Leave') {
        const [apps, quota] = await Promise.allSettled([
          getLeaveApplications(common as any),
          getLeaveQuota({ branch_id: branchId, user_id: userId, limit: 100 }),
        ]);
        rows = apps.status === 'fulfilled' ? list(apps.value) : [];
        setExtra(x => ({ ...x, Leave: quota.status === 'fulfilled' ? list(quota.value) : [] }));
      } else if (t === 'Qualifications & Experience') {
        rows = list(await getProfileEntries(common as any));
      } else if (t === 'Documents') {
        rows = list(await getStaffDocuments(common as any));
      }
      setTabData(d => ({ ...d, [t]: rows }));
    } catch (err: any) {
      // 404 here means "no records" — the whole HR family answers that way, and
      // for this account leaves-quota, leave-application, profile-entries,
      // staff-documents and duty-hour-requests all did. 403 is different: the
      // role is barred from the resource, and saying "no records" would be a lie.
      setTabData(d => ({ ...d, [t]: [] }));
      if (err?.response?.status === 403) {
        setTabError(e => ({
          ...e,
          [t]: err?.response?.data?.message || 'Your role cannot access this.',
        }));
      }
    } finally {
      setTabLoading(false);
    }
  }, [branchId, userId, tabData, attStart, attEnd]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  // "Load Attendance" re-runs the range, so it must bypass loadTab's
  // fetch-once-per-tab cache.
  const reloadAttendance = useCallback(async () => {
    if (!branchId) {
      setTabError(e => ({ ...e, Attendance: NO_BRANCH_MESSAGE }));
      return;
    }
    if (attEnd < attStart) {
      setTabError(e => ({ ...e, Attendance: 'End date must be after the start date.' }));
      return;
    }
    setTabLoading(true);
    setTabError(e => ({ ...e, Attendance: '' }));
    try {
      const res = await getAttendanceList({
        branch_id: branchId, member_id: userId,
        start_date: attStart, end_date: attEnd, limit: 500,
      });
      setTabData(d => ({ ...d, Attendance: newestFirst(list(res)) }));
    } catch (err: any) {
      setTabData(d => ({ ...d, Attendance: [] }));
      if (err?.response?.status === 403) {
        setTabError(e => ({
          ...e,
          Attendance: err?.response?.data?.message || 'Your role cannot access this.',
        }));
      }
    } finally {
      setTabLoading(false);
    }
  }, [branchId, userId, attStart, attEnd]);

  useEffect(() => {
    if (seeded.current) return;
    const src = staff ?? profile;
    if (!src) return;
    seeded.current = true;
    seedForm(src);
  }, [staff, profile, seedForm]);

  // Drawer edit icon → the web's "Change Information" modal, seeded with the
  // current record.
  //
  // Keyed on the signal, not on staff/profile: a successful submit calls
  // setStaff(fresh), and without this guard that state change re-runs the
  // effect while focusContact still holds the same timestamp, re-opening the
  // modal the moment it closes. A fresh tap carries a new timestamp and passes.
  useEffect(() => {
    if (!focusContact || handledEdit.current === focusContact) return;
    handledEdit.current = focusContact;
    const src: any = staff ?? profile ?? {};
    setIdentity({
      first_name: String(src.first_name ?? ''),
      last_name: String(src.last_name ?? ''),
      email: String(src.email ?? ''),
    });
    setModalOpen(true);
  }, [focusContact, staff, profile]);

  const submitIdentity = useCallback(async () => {
    if (!identity.first_name.trim() || !identity.last_name.trim() || !identity.email.trim()) {
      Alert.alert('Missing details', 'First name, last name and email are all required.');
      return;
    }
    setSavingIdentity(true);
    try {
      await updateStaffProfile(userId, identity);
      // Close as soon as the write lands — the re-read below is only to
      // refresh what's behind the modal, and shouldn't hold it open.
      setModalOpen(false);
      Alert.alert('Saved', 'Profile updated successfully.');
      try {
        const sd = await getStaffDetail(userId, Number(branchId) || 0);
        const rec = sd?.data;
        const fresh = Array.isArray(rec) ? rec[0] : rec ?? null;
        if (fresh) { setStaff(fresh); seedForm(fresh); }
      } catch {
        // The save succeeded; a failed refresh must not report otherwise.
      }
    } catch (err: any) {
      Alert.alert(
        'Update failed',
        err?.response?.data?.message || 'Unable to update profile.',
      );
    } finally {
      setSavingIdentity(false);
    }
  }, [identity, userId, branchId, seedForm]);

  const pickPhoto = () => {
    launchImageLibrary({ mediaType: 'photo' }, res => {
      if (res.didCancel || res.errorCode) return;
      const a = res.assets?.[0];
      if (a?.uri) setPhoto(a);
    });
  };

  // The web accepts PDF here too, but this app has no document-picker
  // dependency, so uploads are limited to images from the library — enough for
  // a CNIC or a certificate photo, which is what the library is mostly filled
  // with. Adding PDFs needs a file-picker package.
  const pickDocument = () => {
    launchImageLibrary({ mediaType: 'photo' }, res => {
      if (res.didCancel || res.errorCode) return;
      const a = res.assets?.[0];
      if (a?.uri) setDocFile(a);
    });
  };

  const saveProfile = useCallback(async () => {
    const filled = Object.values(form).some(v => v.trim() !== '');
    if (!filled && !photo) {
      Alert.alert('Nothing to save', 'Fill at least one field, or pick a new photo.');
      return;
    }
    setSaving(true);
    try {
      await updateStaffProfile(
        userId,
        form,
        photo?.uri ? { uri: photo.uri, type: photo.type, fileName: photo.fileName } : null,
      );
      // Re-read the record so the Profile rows and this form both show what
      // was actually stored, not what was typed.
      const sd = await getStaffDetail(userId, Number(branchId) || 0);
      const rec = sd?.data;
      const fresh = Array.isArray(rec) ? rec[0] : rec ?? null;
      setStaff(fresh);
      seedForm(fresh ?? { ...form, password: '' });
      setPhoto(null);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert(
        'Update failed',
        err?.response?.data?.message || 'Unable to update profile.',
      );
    } finally {
      setSaving(false);
    }
  }, [form, photo, userId, branchId, seedForm]);

  const onPickDate = (d: Date) => {
    const v = fmtDate(d);
    if (picker === 'start') { setAttStart(v); if (v > attEnd) setAttEnd(v); }
    else { setAttEnd(v); if (v < attStart) setAttStart(v); }
    setPicker(null);
  };

  // Prefer the fuller /auth/get/{id} record, falling back to the login profile.
  const p = useMemo<any>(() => staff ?? profile ?? {}, [staff, profile]);
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Employee';
  const att = stats?.todayAttendance;

  const rows = tabData[tab] ?? [];

  // Mirrors the web's five Attendance cards. Present counts every day the
  // employee showed up, late ones included — 4 present + 3 absent = 7 records
  // on 2026-09-09, with 4 of those 4 present days flagged late.
  const attSummary = useMemo(() => {
    const r = tabData.Attendance ?? [];
    return {
      total: r.length,
      present: r.filter(x => String(x.attendance_status) === 'Present').length,
      late: r.filter(x => Number(x.is_late) === 1).length,
      absent: r.filter(x => String(x.attendance_status) === 'Absent').length,
    };
  }, [tabData.Attendance]);

  const chips = useMemo(
    // First chip was the literal 'Employee'; the web's first chip is the role,
    // which reads "General Trainer" for role 17 and "Personal Trainer" for 9.
    () => [roleLabelOf(p.role ?? profile?.role, profile?.type),
      p.department_name ?? p.department, p.designation,
      p.branch_name ?? profile?.branchName]
      .map(v => String(v ?? '').trim()).filter(v => v && v !== 'null'),
    [p, profile],
  );

  // ── Tab submit handlers ─────────────────────────────────────────────────────
  // Each refetches its tab on success by clearing the cached entry, so the new
  // record appears without a manual reload.
  const invalidate = (t: Tab) => setTabData(d => { const n = { ...d }; delete n[t]; return n; });

  const showError = (e: any, fallback: string) =>
    Alert.alert('Not saved', e?.response?.data?.message || e?.message || fallback);

  const submitDutyRequest = async () => {
    if (!dutyForm.slotId) { Alert.alert('Select a slot', 'Choose the duty slot you want changed.'); return; }
    if (!dutyForm.start.trim() || !dutyForm.end.trim()) {
      Alert.alert('Times required', 'Enter the requested start and end time as HH:mm.'); return;
    }
    const slot = (tabData['Duty Hours'] ?? []).find((r: any) => r.id === dutyForm.slotId);
    setSubmitting('duty');
    try {
      await createDutyHourRequest({
        branch_id: branchId, user_id: userId,
        staff_timing_id: dutyForm.slotId,
        day: String(slot?.day ?? ''),
        requested_start_time: dutyForm.start.trim(),
        requested_end_time: dutyForm.end.trim(),
        reason: dutyForm.reason.trim(),
      });
      setDutyForm({ slotId: 0, start: '', end: '', reason: '' });
      invalidate('Duty Hours');
      Alert.alert('Request sent', 'HR will review your duty-hour change.');
    } catch (e) { showError(e, 'Could not send the request.'); }
    finally { setSubmitting(''); }
  };

  // The web validates in three steps before storing — overlap, probation,
  // then quota — and each answers 409 with the reason. Running them in order
  // means the employee gets that reason instead of a generic failure.
  const submitLeave = async () => {
    const days = Math.max(
      1,
      Math.round((Date.parse(leaveForm.to) - Date.parse(leaveForm.from)) / 86400000) + 1,
    );
    if (!leaveForm.reason.trim()) { Alert.alert('Reason required', 'Enter a reason for the leave.'); return; }
    if (Date.parse(leaveForm.to) < Date.parse(leaveForm.from)) {
      Alert.alert('Check the dates', 'The end date is before the start date.'); return;
    }
    setSubmitting('leave');
    try {
      await checkLeaveExists({
        user_id: userId, from: leaveForm.from, to: leaveForm.to,
        leave_type: leaveForm.type, number_of_leaves: days,
      });
      await checkLeaveEligibility({ user_id: userId, date: leaveForm.from });
      await checkLeaveAvailability({
        user_id: userId, leave_type: leaveForm.type, number_of_leaves: days,
      });
      await submitLeaveApplication({
        branch_id: branchId, user_id: userId,
        leave_status: 'Pending', leave_type: leaveForm.type,
        category: leaveForm.category,
        from: leaveForm.from, to: leaveForm.to,
        number_of_leaves: days, reason: leaveForm.reason.trim(),
      });
      setLeaveForm(f => ({ ...f, reason: '' }));
      invalidate('Leave');
      Alert.alert('Request sent', 'Your leave application has been submitted.');
    } catch (e) { showError(e, 'Could not submit the leave request.'); }
    finally { setSubmitting(''); }
  };

  const submitEntry = async () => {
    if (!entryForm.title.trim()) { Alert.alert('Title required', 'Enter a title for this record.'); return; }
    setSubmitting('entry');
    try {
      const body = {
        title: entryForm.title.trim(),
        organization: entryForm.organization.trim(),
        location: entryForm.location.trim(),
        start_date: entryForm.start_date,
        end_date: entryForm.end_date,
        description: entryForm.description.trim(),
      };
      if (entryForm.id) await updateProfileEntry(entryForm.id, body);
      else await createProfileEntry({
        branch_id: branchId, user_id: userId,
        entry_type: entryForm.entry_type, ...body,
      });
      setEntryForm({
        id: 0, entry_type: entryForm.entry_type, title: '', organization: '',
        location: '', start_date: '', end_date: '', description: '',
      });
      invalidate('Qualifications & Experience');
    } catch (e) { showError(e, 'Could not save the record.'); }
    finally { setSubmitting(''); }
  };

  const archiveEntry = (row: any) => {
    Alert.alert('Archive record', `Archive "${row.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', style: 'destructive',
        onPress: async () => {
          try {
            await updateProfileEntry(row.id, { status: 0 });
            invalidate('Qualifications & Experience');
          } catch (e) { showError(e, 'Could not archive the record.'); }
        },
      },
    ]);
  };

  const submitDocument = async () => {
    if (!docFile) { Alert.alert('File required', 'Choose a document to upload.'); return; }
    setSubmitting('doc');
    try {
      await addStaffDocument({
        branch_id: branchId, user_id: userId,
        document_type: docForm.document_type,
        document_category: docForm.document_type,
        issue_date: docForm.issue_date,
        subject: docForm.subject.trim(),
        description: docForm.description.trim(),
        document_code: docForm.document_code.trim(),
        document_file: {
          uri: docFile.uri, type: docFile.type ?? 'image/jpeg',
          name: docFile.fileName ?? 'document.jpg',
        },
      });
      setDocFile(null);
      setDocForm(f => ({ ...f, subject: '', document_code: '', description: '' }));
      invalidate('Documents');
      Alert.alert('Uploaded', 'Your document is pending HR approval.');
    } catch (e) { showError(e, 'Could not upload the document.'); }
    finally { setSubmitting(''); }
  };

  const renderTab = () => {
    if (tab === 'Profile') {
      return (
        <>
          <Section tag="PROFILE" title="Personal Information"
            subtitle="This includes the main employee details created by HR.">
            <Row label="Employee ID" value={p.uid} />
            <Row label="First Name" value={p.first_name} />
            <Row label="Last Name" value={p.last_name} />
            <Row label="Father Name" value={p.father_name} />
            <Row label="Gender" value={p.gender} />
            <Row label="Date of Birth" value={p.dob} />
            <Row label="CNIC" value={p.cnic} />
            <Row label="Personal Email" value={p.email} />
            <Row label="Official Email" value={p.official_email} />
            <Row label="Phone" value={p.phone} />
            <Row label="Address" value={p.address} />
          </Section>

          <Section tag="EMPLOYMENT" title="Job Information"
            subtitle="Core employment information currently assigned to your profile.">
            {/* Was hardcoded to "Employee". The web prints the account's real
                role, and this screen is no longer blank-role-only — a personal
                trainer and a general trainer both reach it. */}
            <Row label="Role" value={roleLabelOf(p.role ?? profile?.role, profile?.type)} />
            <Row label="Department" value={p.department_name ?? p.department} />
            <Row label="Designation" value={p.designation} />
            <Row label="Branch" value={p.branch_name ?? profile?.branchName} />
            <Row label="Joining Date" value={p.joining} />
            <Row label="Salary" value={p.salary ? rs(p.salary) : null} />
          </Section>

          <Section tag="REFERENCE" title="Additional HR Details"
            subtitle="Any extra information saved by HR appears here.">
            <Row label="City" value={p.city} />
            <Row label="Appointment Date" value={p.appointment_date} />
            {/* The web shows this and the API returns it (confirmed live
                2026-09-23: confirmation_date "2024-10-22"); it was simply
                never rendered. */}
            <Row label="Confirmation Date" value={p.confirmation_date} />
            <Row label="Employment Status" value={p.employment_status} />
            <Row label="Employment End Date" value={p.employment_end_date} />
            <Row label="Monthly Medical" value={p.monthly_medical} />
            <Row label="Emergency Contact No" value={p.emergency_contact_no} />
            <Row label="Blood Group" value={p.blood_group} />
            <Row label="Is Login Account" value={String(p.is_login_account ?? 0)} />
          </Section>

          <Section tag="EDITABLE" title="Update Contact Details"
            subtitle="You can update CNIC, personal email, password, phone number, address, and profile picture here. Official email is managed by HR.">
            <TextInput style={s.input} placeholder="CNIC" placeholderTextColor="#B0B0B0"
              value={form.cnic} onChangeText={v => setForm(f => ({ ...f, cnic: v }))} />
            <TextInput style={s.input} placeholder="Email" placeholderTextColor="#B0B0B0"
              autoCapitalize="none" keyboardType="email-address"
              value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
            <TextInput style={s.input} placeholder="Phone Number" placeholderTextColor="#B0B0B0"
              keyboardType="phone-pad"
              value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} />
            <TextInput style={s.input} placeholder="New Password" placeholderTextColor="#B0B0B0"
              secureTextEntry autoCapitalize="none"
              value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} />
            <TextInput style={[s.input, s.inputArea]} placeholder="Address" placeholderTextColor="#B0B0B0"
              multiline numberOfLines={4}
              value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} />

            <TouchableOpacity style={s.fileBtn} onPress={pickPhoto}>
              <Icon name="image-outline" size={16} color="#E63946" />
              <Text style={s.fileText} numberOfLines={1}>
                {photo?.fileName || photo?.uri ? (photo.fileName ?? 'Photo selected') : 'Choose File'}
              </Text>
            </TouchableOpacity>
            <Text style={s.hint}>
              Upload a new profile picture if you want to replace the current one.
            </Text>

            <TouchableOpacity style={s.goBtn} onPress={saveProfile} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={s.goText}>Save Profile Updates</Text>}
            </TouchableOpacity>
            {/* Only non-empty fields are sent — the web filters the same way,
                and posting "" would blank the stored value. */}
            <Text style={s.footnote}>
              Leave New Password blank to keep your current password.
            </Text>
          </Section>
        </>
      );
    }

    // Attendance owns its filter card, so it renders before the shared
    // loading/empty short-circuits — the range controls must stay on screen
    // even when a range comes back with nothing.
    if (tab === 'Attendance') {
      const todayStatus = att ? attStatus(att) : 'N/A';
      return (
        <>
          <View style={s.tiles}>
            <StatTile label="Attendance Records" value={String(attSummary.total)} hint="Within selected date range" />
            <StatTile label="Present" value={String(attSummary.present)} hint="Marked present" />
            <StatTile label="Late" value={String(attSummary.late)} hint="Late arrivals" />
            <StatTile label="Absent" value={String(attSummary.absent)} hint="Marked absent" />
            <StatTile label="Today Status" value={todayStatus} hint={`Check in ${dash(att?.checkin_time_12h)}`} />
          </View>

          <View style={s.card}>
            <Text style={s.sectionTag}>ATTENDANCE</Text>
            <Text style={s.sectionTitle}>Attendance History</Text>
            <Text style={s.sectionSub}>
              Filter by start and end date to review your detailed attendance history.
            </Text>

            <View style={s.row}>
              <TouchableOpacity style={s.dateBtn} onPress={() => setPicker('start')}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.fieldText}>{display(attStart)}</Text>
              </TouchableOpacity>
              <Text style={s.sep}>→</Text>
              <TouchableOpacity style={s.dateBtn} onPress={() => setPicker('end')}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.fieldText}>{display(attEnd)}</Text>
              </TouchableOpacity>
            </View>

            <QuickDates onRange={(a, b) => { setAttStart(a); setAttEnd(b); }} disabled={tabLoading} />

            <TouchableOpacity style={s.goBtn} onPress={reloadAttendance} disabled={tabLoading}>
              {tabLoading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={s.goText}>Load Attendance</Text>}
            </TouchableOpacity>
          </View>

          {tabLoading && <ActivityIndicator size="large" style={s.spinner} color="#E63946" />}

          {!tabLoading && !!tabError.Attendance && (
            <Empty icon="⚠️" title="Not Available" subtitle={tabError.Attendance} />
          )}

          {!tabLoading && !tabError.Attendance && rows.length === 0 && (
            <Empty icon="🗓️" title="No Attendance" subtitle="No attendance records in the selected range." />
          )}

          {!tabLoading && !tabError.Attendance && rows.length > 0 && (
            <View style={s.tableCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={tbl.header}>
                    <Text style={[tbl.headerCell, tbl.wDate]}>Date</Text>
                    <Text style={[tbl.headerCell, tbl.wStatus]}>Status</Text>
                    <Text style={[tbl.headerCell, tbl.wDuty]}>Duty Hours</Text>
                    <Text style={[tbl.headerCell, tbl.wTime]}>Check In</Text>
                    <Text style={[tbl.headerCell, tbl.wTime]}>Check Out</Text>
                    <Text style={[tbl.headerCell, tbl.wWorking]}>Working Hours</Text>
                    <Text style={[tbl.headerCell, tbl.wRemarks]}>Remarks</Text>
                  </View>
                  {rows.map((r, i) => {
                    const st = attStatus(r);
                    return (
                      <View key={r.id ?? i} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
                        <Text style={[tbl.cell, tbl.wDate]}>{cellDate(r.date)}</Text>
                        <View style={tbl.wStatus}>
                          <Text style={[
                            tbl.pill,
                            st === 'Present' ? tbl.pillOk : st === 'Late' ? tbl.pillWarn : tbl.pillBad,
                          ]}>
                            {st.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[tbl.cell, tbl.wDuty]}>{dutyWindow(r)}</Text>
                        <Text style={[tbl.cell, tbl.wTime]}>{dash(r.checkin_time_12h)}</Text>
                        <Text style={[tbl.cell, tbl.wTime]}>{dash(r.checkout_time_12h)}</Text>
                        <Text style={[tbl.cell, tbl.wWorking]}>{dash(r.working_hours)}</Text>
                        <Text style={[tbl.cell, tbl.wRemarks, tbl.muted]}>{dash(r.remarks)}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </>
      );
    }

    if (tabLoading) return <ActivityIndicator size="large" style={s.spinner} color="#E63946" />;
    if (tabError[tab]) {
      return <Empty icon="⚠️" title="Not Available" subtitle={tabError[tab]} />;
    }
    // No blanket "no records" short-circuit any more: every tab below carries
    // a form the web keeps on screen even with nothing saved (the live GT
    // account has no leave quota and no applications, and the web still shows
    // the Request Leave form). Emptiness is stated per panel instead.

    const aux = extra[tab] ?? [];
    const noneYet = (text: string) => <Text style={s.emptyInline}>{text}</Text>;

    if (tab === 'Duty Hours') {
      const slot = rows.find((r: any) => r.id === dutyForm.slotId);
      return (
        <>
          <Section tag="CURRENT SCHEDULE" title="Assigned Duty Hours"
            subtitle="These are your currently active duty-hour slots.">
            {rows.length === 0 ? noneYet('No duty hours assigned yet.') : rows.map((r, i) => (
              <View key={r.id ?? i} style={s.panelRow}>
                <View style={s.flex1}>
                  <Text style={s.listTitle}>{dash(r.day ?? r.week_day)}</Text>
                  <Text style={s.listSub}>{dash(r.start_time)} — {dash(r.end_time)}</Text>
                </View>
                <Text style={[s.badge, s.badgeOk]}>ACTIVE</Text>
              </View>
            ))}
          </Section>

          <Section tag="APPROVAL FLOW" title="Request Duty-Hour Change"
            subtitle="Requested timing changes are sent to HR and only apply after approval.">
            <TouchableOpacity style={s.select} onPress={() => setDutySlotOpen(true)}>
              <Text style={[s.selectText, !slot && s.selectPlaceholder]} numberOfLines={1}>
                {slot ? `${slot.day} · ${slot.start_time}—${slot.end_time}` : 'Select current slot'}
              </Text>
              <Icon name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
            <View style={s.row}>
              <TextInput style={[s.input, s.flex1]} placeholder="Start (HH:mm)" placeholderTextColor="#B0B0B0"
                value={dutyForm.start} onChangeText={v => setDutyForm(f => ({ ...f, start: v }))} />
              <TextInput style={[s.input, s.flex1]} placeholder="End (HH:mm)" placeholderTextColor="#B0B0B0"
                value={dutyForm.end} onChangeText={v => setDutyForm(f => ({ ...f, end: v }))} />
            </View>
            <TextInput style={[s.input, s.inputArea]} placeholder="Reason for requested change"
              placeholderTextColor="#B0B0B0" multiline numberOfLines={3}
              value={dutyForm.reason} onChangeText={v => setDutyForm(f => ({ ...f, reason: v }))} />
            <TouchableOpacity style={s.goBtn} onPress={submitDutyRequest} disabled={submitting === 'duty'}>
              {submitting === 'duty'
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={s.goText}>Submit Request</Text>}
            </TouchableOpacity>
          </Section>

          <Section tag="REQUEST HISTORY" title="Duty-Hour Requests"
            subtitle="Pending requests can be edited until HR reviews them.">
            {aux.length === 0 ? noneYet('No duty-hour requests yet.') : aux.map((r: any, i: number) => (
              <View key={r.id ?? i} style={s.stackRow}>
                <View style={s.panelRow}>
                  <Text style={[s.listTitle, s.flex1]}>{dash(r.day)}</Text>
                  <Text style={[s.badge, statusTone(r.approval_status)]}>
                    {String(r.approval_status ?? '').toUpperCase() || 'PENDING'}
                  </Text>
                </View>
                <Text style={s.listSub}>Current: {dash(r.current_start_time)} - {dash(r.current_end_time)}</Text>
                <Text style={s.listSub}>Requested: {dash(r.requested_start_time)} - {dash(r.requested_end_time)}</Text>
                {!!String(r.reason ?? '').trim() && <Text style={s.listSub}>Reason: {r.reason}</Text>}
              </View>
            ))}
          </Section>
        </>
      );
    }

    if (tab === 'Salary') {
      // /v1/salary 403s for some roles (confirmed for 17), and the web still
      // renders the breakdown from the staff profile's salary. `latest` is
      // simply absent in that case and every figure falls back to 0/profile.
      const latest: any = rows[0] ?? {};
      const base = Number(latest.salary ?? p.salary ?? 0);
      return (
        <>
          <View style={s.tiles}>
            <StatTile label="Base Salary" value={rs(base)} hint="Current salary" />
            <StatTile label="Deductions" value={rs(latest.deduction ?? 0)} hint="Latest deductions" />
            <StatTile label="Medical" value={rs(latest.medical ?? p.monthly_medical ?? 0)} hint="Medical allowance" />
          </View>

          <Section tag="PAYROLL" title="Salary Breakdown"
            subtitle="A quick snapshot of the most recent salary figures available in the system.">
            <Row label="Base Salary" value={rs(base)} />
            <Row label="Reward" value={rs(latest.reward ?? 0)} />
            <Row label="Advance" value={rs(latest.advance ?? 0)} />
            <Row label="Fine" value={rs(latest.fine ?? 0)} />
            <Row label="Loan" value={rs(latest.loan ?? 0)} />
            <Row label="Net Salary" value={rs(latest.net_salary ?? 0)} />
            <TouchableOpacity style={s.goBtn} onPress={() => navigation.navigate('MySalarySlip')}>
              <Text style={s.goText}>Open Salary Slip</Text>
            </TouchableOpacity>
          </Section>

          <Section tag="CAREER GROWTH" title="Promotions and Salary Changes"
            subtitle="Recent promotion history and salary changes are shown here.">
            {aux.length === 0 ? noneYet('No promotions recorded.') : aux.map((r: any, i: number) => (
              <View key={r.id ?? i} style={s.stackRow}>
                <View style={s.panelRow}>
                  <Text style={[s.listTitle, s.flex1]}>{dash(r.new_designation ?? r.promotion_type)}</Text>
                  <Text style={[s.badge, s.badgeOk]}>RECORDED</Text>
                </View>
                <Text style={s.listSub}>Effective: {dash(r.date ?? r.joining)}</Text>
                <Text style={s.listSub}>New Salary: {rs(r.new_salary)}</Text>
              </View>
            ))}
          </Section>
        </>
      );
    }

    if (tab === 'Leave') {
      return (
        <>
          <Section tag="LEAVE SUMMARY" title="Quota and Recent Applications"
            subtitle="Track remaining quota and see the status of your recent leave applications.">
            {aux.length === 0
              ? noneYet('No leave quota assigned. HR-assigned leave quota will appear here once it is available.')
              : aux.map((q: any, i: number) => (
                <View key={q.id ?? i} style={s.panelRow}>
                  <Text style={[s.listTitle, s.flex1]}>{dash(q.leave_type)}</Text>
                  <Text style={s.listSub}>{dash(q.remaining_leaves ?? q.total_leaves)} left</Text>
                </View>
              ))}

            <Text style={s.panelHeading}>Application History</Text>
            {rows.length === 0 ? noneYet('No leave applications yet.') : rows.map((r, i) => (
              <View key={r.id ?? i} style={s.panelRow}>
                <View style={s.flex1}>
                  <Text style={s.listTitle}>{dash(r.leave_type)}</Text>
                  <Text style={s.listSub}>{dash(r.from ?? r.start_date)} → {dash(r.to ?? r.end_date)}</Text>
                </View>
                <Text style={[s.badge, statusTone(r.application_status ?? r.leave_status)]}>
                  {String(r.application_status ?? r.leave_status ?? '').toUpperCase() || 'PENDING'}
                </Text>
              </View>
            ))}
          </Section>

          <Section tag="APPLY" title="Request Leave"
            subtitle="Submit a leave request and the system will validate quota and eligibility before saving it.">
            <View style={s.row}>
              <TouchableOpacity style={[s.select, s.flex1]} onPress={() => setLeaveTypeOpen(true)}>
                <Text style={s.selectText}>{leaveForm.type}</Text>
                <Icon name="chevron-down" size={18} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.select, s.flex1]}
                onPress={() => setLeaveForm(f => ({ ...f, category: f.category === 'Full' ? 'Half' : 'Full' }))}
              >
                <Text style={s.selectText}>{leaveForm.category} Day</Text>
                <Icon name="swap-horizontal" size={16} color="#999" />
              </TouchableOpacity>
            </View>
            <View style={s.row}>
              <TouchableOpacity style={[s.dateBtn, s.flex1]} onPress={() => setLeavePicker('from')}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.fieldText}>{display(leaveForm.from)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dateBtn, s.flex1]} onPress={() => setLeavePicker('to')}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.fieldText}>{display(leaveForm.to)}</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={[s.input, s.inputArea]} placeholder="Reason for leave"
              placeholderTextColor="#B0B0B0" multiline numberOfLines={3}
              value={leaveForm.reason} onChangeText={v => setLeaveForm(f => ({ ...f, reason: v }))} />
            <Text style={s.hint}>Select a start and end date to calculate leave days.</Text>
            <TouchableOpacity style={s.goBtn} onPress={submitLeave} disabled={submitting === 'leave'}>
              {submitting === 'leave'
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={s.goText}>Submit Leave Request</Text>}
            </TouchableOpacity>
          </Section>
        </>
      );
    }

    if (tab === 'Qualifications & Experience') {
      // The web splits the one endpoint's rows into three panels by
      // entry_type. Confirmed live: this account has Qualification(1),
      // Experience(2), Education(1).
      const groups: [string, string][] = [
        ['Qualification', 'All saved qualification details linked to your profile.'],
        ['Experience', 'All saved experience details linked to your profile.'],
        ['Education', 'All saved education details linked to your profile.'],
      ];
      return (
        <>
          <Section tag="PROFILE BUILDING" title="Add Qualification or Experience"
            subtitle="Add qualifications, work experience, and education details to keep your employee profile complete.">
            <TouchableOpacity style={s.select} onPress={() => setEntryTypeOpen(true)} disabled={!!entryForm.id}>
              <Text style={s.selectText}>{entryForm.entry_type}</Text>
              {!entryForm.id && <Icon name="chevron-down" size={18} color="#999" />}
            </TouchableOpacity>
            <TextInput style={s.input} placeholder="Title" placeholderTextColor="#B0B0B0"
              value={entryForm.title} onChangeText={v => setEntryForm(f => ({ ...f, title: v }))} />
            <TextInput style={s.input} placeholder="Institute / Company" placeholderTextColor="#B0B0B0"
              value={entryForm.organization} onChangeText={v => setEntryForm(f => ({ ...f, organization: v }))} />
            <TextInput style={s.input} placeholder="Location" placeholderTextColor="#B0B0B0"
              value={entryForm.location} onChangeText={v => setEntryForm(f => ({ ...f, location: v }))} />
            <View style={s.row}>
              <TouchableOpacity style={[s.dateBtn, s.flex1]} onPress={() => setEntryPicker('start')}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.fieldText}>{entryForm.start_date ? display(entryForm.start_date) : 'Start date'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dateBtn, s.flex1]} onPress={() => setEntryPicker('end')}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.fieldText}>{entryForm.end_date ? display(entryForm.end_date) : 'End date'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={[s.input, s.inputArea]} placeholder="Description"
              placeholderTextColor="#B0B0B0" multiline numberOfLines={3}
              value={entryForm.description} onChangeText={v => setEntryForm(f => ({ ...f, description: v }))} />
            <TouchableOpacity style={s.goBtn} onPress={submitEntry} disabled={submitting === 'entry'}>
              {submitting === 'entry'
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={s.goText}>{entryForm.id ? 'Update Record' : 'Save Record'}</Text>}
            </TouchableOpacity>
            {!!entryForm.id && (
              <TouchableOpacity
                onPress={() => setEntryForm({
                  id: 0, entry_type: entryForm.entry_type, title: '', organization: '',
                  location: '', start_date: '', end_date: '', description: '',
                })}
              >
                <Text style={s.footnote}>Cancel edit</Text>
              </TouchableOpacity>
            )}
          </Section>

          {groups.map(([type, sub]) => {
            const items = rows.filter((r: any) => String(r.entry_type) === type);
            return (
              <Section key={type} tag="SAVED RECORDS" title={type} subtitle={sub}>
                {items.length === 0 ? noneYet(`No ${type.toLowerCase()} records yet.`) : items.map((r: any, i: number) => (
                  <View key={r.id ?? i} style={s.stackRow}>
                    <View style={s.panelRow}>
                      <Text style={[s.listTitle, s.flex1]}>{dash(r.title)}</Text>
                      <View style={s.rowActions}>
                        <TouchableOpacity
                          onPress={() => setEntryForm({
                            id: r.id, entry_type: String(r.entry_type),
                            title: String(r.title ?? ''), organization: String(r.organization ?? ''),
                            location: String(r.location ?? ''),
                            start_date: String(r.start_date ?? ''), end_date: String(r.end_date ?? ''),
                            description: String(r.description ?? ''),
                          })}
                        >
                          <Text style={s.linkBtn}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => archiveEntry(r)}>
                          <Text style={s.linkBtn}>Archive</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={s.listSub}>
                      {dash(r.organization)}{r.location ? ` | ${r.location}` : ''}
                    </Text>
                    <Text style={s.listSub}>
                      {dash(r.start_date)} to {r.end_date ? r.end_date : 'N/A'}
                    </Text>
                    {!!String(r.description ?? '').trim() && (
                      <Text style={s.listSub}>{r.description}</Text>
                    )}
                  </View>
                ))}
              </Section>
            );
          })}
        </>
      );
    }

    // ── Documents ──
    return (
      <>
        <Section tag="VERIFICATION" title="Upload Document"
          subtitle="Upload CNIC, CV, experience letters, or any other supporting document for HR review.">
          <TouchableOpacity style={s.select} onPress={() => setDocTypeOpen(true)}>
            <Text style={s.selectText}>{docForm.document_type}</Text>
            <Icon name="chevron-down" size={18} color="#999" />
          </TouchableOpacity>
          <TextInput style={s.input} placeholder="Document Title" placeholderTextColor="#B0B0B0"
            value={docForm.subject} onChangeText={v => setDocForm(f => ({ ...f, subject: v }))} />
          <TextInput style={s.input} placeholder="Document Code (Optional)" placeholderTextColor="#B0B0B0"
            value={docForm.document_code} onChangeText={v => setDocForm(f => ({ ...f, document_code: v }))} />
          <TouchableOpacity style={s.dateBtn} onPress={() => setDocPicker(true)}>
            <Icon name="calendar" size={14} color="#E63946" />
            <Text style={s.fieldText}>{display(docForm.issue_date)}</Text>
          </TouchableOpacity>
          <TextInput style={[s.input, s.inputArea]} placeholder="Description (Optional)"
            placeholderTextColor="#B0B0B0" multiline numberOfLines={3}
            value={docForm.description} onChangeText={v => setDocForm(f => ({ ...f, description: v }))} />
          <TouchableOpacity style={s.fileBtn} onPress={pickDocument}>
            <Icon name="file-upload-outline" size={16} color="#E63946" />
            <Text style={s.fileText} numberOfLines={1}>
              {docFile?.fileName ?? (docFile ? 'File selected' : 'Choose File')}
            </Text>
          </TouchableOpacity>
          <Text style={s.hint}>
            Uploaded documents stay pending until HR approves them. Allowed file types: PDF, JPG, JPEG, PNG. Max size: 5 MB.
          </Text>
          <TouchableOpacity style={s.goBtn} onPress={submitDocument} disabled={submitting === 'doc'}>
            {submitting === 'doc'
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={s.goText}>Upload Document</Text>}
          </TouchableOpacity>
        </Section>

        <Section tag="DOCUMENT LIBRARY" title="Uploaded and Verified Documents"
          subtitle="View status, review notes, and replace documents while they are still pending or rejected.">
          {rows.length === 0 ? noneYet('No documents uploaded yet.') : rows.map((r, i) => {
            const approved = String(r.approval_status) === 'Approved';
            return (
              <View key={r.id ?? i} style={s.stackRow}>
                <View style={s.panelRow}>
                  <Text style={[s.listTitle, s.flex1]}>{dash(r.subject ?? r.document_type)}</Text>
                  <Text style={[s.badge, statusTone(r.approval_status)]}>
                    {String(r.approval_status ?? '').toUpperCase() || 'PENDING'}
                  </Text>
                </View>
                <Text style={s.listSub}>
                  {dash(r.document_category)} | {dash(r.issue_date)}
                </Text>
                {!!r.original_file_name && (
                  <Text style={s.listSub}>File: {r.original_file_name}</Text>
                )}
                {approved ? (
                  <View style={s.panelRow}>
                    {r.file_url
                      ? <TouchableOpacity onPress={() => Linking.openURL(String(r.file_url))}>
                          <Text style={s.linkBtn}>View Document</Text>
                        </TouchableOpacity>
                      : <View />}
                    <Text style={s.lockNote}>Locked after approval</Text>
                  </View>
                ) : (
                  <Text style={s.lockNote}>Upload a replacement above while this is {String(r.approval_status ?? 'pending').toLowerCase()}.</Text>
                )}
              </View>
            );
          })}
        </Section>
      </>
    );
  };


  return (
    <>
      {/* Two ways in, two different left actions. For a blank-role employee
          this screen *is* the Home tab, so there is nothing to go back to and
          the burger opens the drawer. A personal trainer reaches it as a
          pushed stack route from the drawer's Dashboard group, where a burger
          is wrong — that path needs a back button. canGoBack() distinguishes
          them without either caller having to pass a flag. */}
      <AppHeader
        title="Employee Dashboard"
        leftIcon={
          navigation.canGoBack?.()
            ? <Icon name="arrow-left" size={24} color="#1A1A1A" />
            : <Icon name="menu" size={24} color="#1A1A1A" />
        }
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() =>
          navigation.canGoBack?.() ? navigation.goBack() : navigation.openDrawer?.()
        }
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <ActivityIndicator size="large" style={s.spinner} color="#E63946" />
      ) : (
        <ScrollView style={s.screen} contentContainerStyle={s.content}>
          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroTop}>
              {p.image ? (
                <Image source={{ uri: p.image }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Icon name="account" size={30} color="#B0B0B0" />
                </View>
              )}
              <View style={s.flex1}>
                <Text style={s.sectionTag}>EMPLOYEE DASHBOARD</Text>
                <Text style={s.heroName}>{fullName}</Text>
                <Text style={s.heroSub}>
                  A simple space for profile updates, leave requests, salary details,
                  documents, and HR approvals.
                </Text>
              </View>
            </View>

            <View style={s.chipRow}>{chips.map(c => <Chip key={c} text={c} />)}</View>

            <View style={s.heroCards}>
              <View style={s.heroCard}>
                <Text style={s.heroCardLine}>Today: {new Date().toLocaleDateString()}</Text>
                <Text style={s.heroCardLine}>Check In: {dash(att?.checkin_time_12h)}</Text>
                <Text style={s.heroCardLine}>Check Out: {dash(att?.checkout_time_12h)}</Text>
                {/* "Late" is derived, not a status value: the 2026-09-07 row
                    came back attendance_status "Present" with is_late 1, and
                    the web's card reads Late. */}
                <Text style={s.heroCardLine}>
                  Status: {att ? (Number(att.is_late) ? 'Late' : dash(att.attendance_status)) : 'N/A'}
                </Text>
              </View>
              <View style={s.heroCard}>
                <Text style={s.heroCardLine}>Employee ID: {dash(p.uid)}</Text>
                <Text style={s.heroCardLine}>Joining: {dash(p.joining)}</Text>
              </View>
            </View>
          </View>

          {/* Tiles */}
          <View style={s.tiles}>
            {/* `||`, not `??`: /v1/salary 403s for this role, so the batched
                stats call resolves currentSalary to a literal 0 rather than
                null and `??` would keep it, showing Rs 0 where the web reads
                Rs 500,000. The tile is "From staff profile" — fall back to it. */}
            <StatTile label="Current Salary" value={rs(stats?.currentSalary || p.salary)} hint="From staff profile" />
            <StatTile label="Pending Requests" value={String(stats?.pendingRequests ?? 0)} hint="Duty-hour requests awaiting approval" />
            <StatTile label="Duty Slots" value={String(stats?.dutySlotsCount ?? 0)} hint="Active work days" />
            <StatTile label="Leave Balance" value={String(stats?.leaveBalance ?? 0)} hint="Remaining leave days" />
            <StatTile label="Approved Documents" value={String(stats?.approvedDocs ?? 0)} hint="Verified staff documents" />
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={s.tabRow} contentContainerStyle={s.tabContent}>
            {TABS.map(t => (
              <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {renderTab()}
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="fade"
        onRequestClose={() => setModalOpen(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Change Information</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={10}>
                <Icon name="close" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>First Name</Text>
            <TextInput style={s.input} placeholder="First Name" placeholderTextColor="#B0B0B0"
              value={identity.first_name}
              onChangeText={v => setIdentity(i => ({ ...i, first_name: v }))} />

            <Text style={s.fieldLabel}>Last Name</Text>
            <TextInput style={s.input} placeholder="Last Name" placeholderTextColor="#B0B0B0"
              value={identity.last_name}
              onChangeText={v => setIdentity(i => ({ ...i, last_name: v }))} />

            <Text style={s.fieldLabel}>Email</Text>
            <TextInput style={s.input} placeholder="Email" placeholderTextColor="#B0B0B0"
              autoCapitalize="none" keyboardType="email-address"
              value={identity.email}
              onChangeText={v => setIdentity(i => ({ ...i, email: v }))} />

            <TouchableOpacity style={s.goBtn} onPress={submitIdentity} disabled={savingIdentity}>
              {savingIdentity
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={s.goText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={picker !== null}
        mode="date"
        date={new Date(picker === 'start' ? attStart : attEnd)}
        maximumDate={picker === 'start' ? new Date(attEnd) : new Date()}
        minimumDate={picker === 'end' ? new Date(attStart) : undefined}
        onConfirm={onPickDate}
        onCancel={() => setPicker(null)}
      />

      {/* ── Tab form pickers ── */}
      <DateTimePickerModal
        isVisible={leavePicker !== null}
        mode="date"
        date={new Date(leavePicker === 'to' ? leaveForm.to : leaveForm.from)}
        onConfirm={d => {
          setLeaveForm(f => leavePicker === 'to'
            ? { ...f, to: fmtDate(d) }
            // Moving the start past the end would submit a negative range, so
            // the end follows it rather than being left behind.
            : { ...f, from: fmtDate(d), to: f.to < fmtDate(d) ? fmtDate(d) : f.to });
          setLeavePicker(null);
        }}
        onCancel={() => setLeavePicker(null)}
      />

      <DateTimePickerModal
        isVisible={entryPicker !== null}
        mode="date"
        onConfirm={d => {
          setEntryForm(f => entryPicker === 'end'
            ? { ...f, end_date: fmtDate(d) }
            : { ...f, start_date: fmtDate(d) });
          setEntryPicker(null);
        }}
        onCancel={() => setEntryPicker(null)}
      />

      <DateTimePickerModal
        isVisible={docPicker}
        mode="date"
        date={new Date(docForm.issue_date)}
        onConfirm={d => { setDocForm(f => ({ ...f, issue_date: fmtDate(d) })); setDocPicker(false); }}
        onCancel={() => setDocPicker(false)}
      />

      <OptionSheet
        visible={dutySlotOpen}
        title="Select current slot"
        options={(tabData['Duty Hours'] ?? []).map((r: any) => ({
          key: String(r.id),
          label: `${r.day} · ${r.start_time}—${r.end_time}`,
        }))}
        selected={String(dutyForm.slotId || '')}
        onSelect={k => {
          const row = (tabData['Duty Hours'] ?? []).find((r: any) => String(r.id) === k);
          // Prefill the requested times with the current ones, as the web
          // does — most requests move one end of the slot, not both.
          setDutyForm(f => ({
            ...f, slotId: Number(k),
            start: f.start || String(row?.start_time ?? ''),
            end: f.end || String(row?.end_time ?? ''),
          }));
          setDutySlotOpen(false);
        }}
        onClose={() => setDutySlotOpen(false)}
      />

      <OptionSheet
        visible={leaveTypeOpen}
        title="Leave type"
        options={LEAVE_TYPES.map(t => ({ key: t, label: t }))}
        selected={leaveForm.type}
        onSelect={k => { setLeaveForm(f => ({ ...f, type: k })); setLeaveTypeOpen(false); }}
        onClose={() => setLeaveTypeOpen(false)}
      />

      <OptionSheet
        visible={entryTypeOpen}
        title="Record type"
        options={ENTRY_TYPES.map(t => ({ key: t, label: t }))}
        selected={entryForm.entry_type}
        onSelect={k => { setEntryForm(f => ({ ...f, entry_type: k })); setEntryTypeOpen(false); }}
        onClose={() => setEntryTypeOpen(false)}
      />

      <OptionSheet
        visible={docTypeOpen}
        title="Document type"
        options={DOC_TYPES.map(t => ({ key: t, label: t }))}
        selected={docForm.document_type}
        onSelect={k => { setDocForm(f => ({ ...f, document_type: k })); setDocTypeOpen(false); }}
        onClose={() => setDocTypeOpen(false)}
      />
    </>
  );
};

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  content:      { padding: 12, paddingBottom: 32 },
  spinner:      { marginTop: 60 },
  flex1:        { flex: 1 },

  // The hero is a plain white card like every other screen's, with the red
  // accent bar rather than the web's blue panel.
  hero:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#E63946' },
  heroTop:      { flexDirection: 'row', gap: 12 },
  avatar:       { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F5F7FA' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  heroName:     { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  heroSub:      { fontSize: 11, color: '#888', marginTop: 3, lineHeight: 15 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip:         { backgroundColor: '#F0F0F0', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:     { fontSize: 12, color: '#444', fontWeight: '500' },
  heroCards:    { flexDirection: 'row', gap: 8, marginTop: 12 },
  heroCard:     { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#EFEFEF' },
  heroCardLine: { fontSize: 11, color: '#555', marginBottom: 2 },

  tiles:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tile:         { flexGrow: 1, minWidth: '47%', backgroundColor: '#FFF', borderRadius: 10, padding: 12, elevation: 1 },
  tileLabel:    { fontSize: 10, color: '#888', marginBottom: 4 },
  tileValue:    { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  tileHint:     { fontSize: 10, color: '#AAA', marginTop: 2 },

  tabRow:       { flexGrow: 0, marginBottom: 12 },
  tabContent:   { gap: 6, paddingVertical: 2 },
  tab:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  tabActive:    { backgroundColor: '#E63946', borderColor: '#E63946' },
  tabText:      { fontSize: 13, color: '#555', fontWeight: '600' },
  tabTextActive:{ color: '#FFF', fontWeight: '700' },

  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  // Table card keeps its own padding off so the header band reaches the edges.
  tableCard:    { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, elevation: 1, overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  fieldText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:          { fontSize: 14, color: '#999' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  input:        { borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA', fontSize: 13, color: '#1A1A1A', marginBottom: 8 },
  inputArea:    { height: 88, textAlignVertical: 'top' },
  fileBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  fileText:     { fontSize: 13, color: '#1A1A1A', fontWeight: '500', flex: 1 },
  hint:         { fontSize: 11, color: '#999', marginTop: 6, marginBottom: 10 },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  sheet:        { backgroundColor: '#FFF', borderRadius: 12, padding: 16 },
  sheetHead:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle:   { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  fieldLabel:   { fontSize: 11, color: '#888', marginBottom: 4 },
  footnote:     { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8 },
  sectionTag:   { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  sectionSub:   { fontSize: 11, color: '#888', marginTop: 2, marginBottom: 10 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  infoLabel:    { fontSize: 12, color: '#888' },
  infoValue:    { fontSize: 13, color: '#1A1A1A', fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  listRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  listTitle:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  listSub:      { fontSize: 11, color: '#888', marginTop: 2 },
  listAmount:   { fontSize: 13, fontWeight: '800', color: '#2E7D32' },
  listTag:      { fontSize: 11, color: '#C0392B', fontWeight: '700' },
  badge:        { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  badgeOk:      { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  badgeWarn:    { backgroundColor: '#FFF4E5', color: '#B45309' },
  badgeBad:     { backgroundColor: '#FFEBEE', color: '#C62828' },

  // ── Panel layout (Duty Hours / Salary / Leave / Q&E / Documents) ──
  // A row of a multi-line record, and the stack it sits in. `listRow` draws a
  // bottom rule per row, which reads wrong when one record spans several
  // lines, so grouped records use `stackRow` for the rule instead.
  panelRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stackRow:     { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  panelHeading: { fontSize: 12, fontWeight: '800', color: '#374151', marginTop: 16, marginBottom: 4 },
  emptyInline:  { fontSize: 12.5, color: '#9CA3AF', paddingVertical: 12, textAlign: 'center' },
  rowActions:   { flexDirection: 'row', gap: 12, alignItems: 'center' },
  linkBtn:      { fontSize: 12, fontWeight: '700', color: '#E63946' },
  lockNote:     { fontSize: 11, color: '#9CA3AF', marginTop: 4, flex: 1, textAlign: 'right' },
  select: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11, marginTop: 10,
    backgroundColor: '#FAFAFA',
  },
  selectText:        { flex: 1, fontSize: 13, color: '#1A1A1A' },
  selectPlaceholder: { color: '#B0B0B0' },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9',
  },
  optionText:   { flex: 1, fontSize: 13.5, color: '#334155' },

  empty:        { alignItems: 'center', paddingVertical: 50 },
  emptyIcon:    { fontSize: 44, marginBottom: 10 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
});

// Same table idiom as TransactionReport / DetailedCafeReport.
const tbl = StyleSheet.create({
  header:     { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:        { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:     { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  muted:      { color: '#888' },
  pill:       { fontSize: 10, fontWeight: '800', textAlign: 'center', paddingVertical: 3, borderRadius: 10, overflow: 'hidden', marginHorizontal: 4 },
  pillOk:     { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  pillWarn:   { backgroundColor: '#FFF4E5', color: '#B45309' },
  pillBad:    { backgroundColor: '#FDECEA', color: '#C0392B' },
  wDate:      { width: 84 },
  wStatus:    { width: 84 },
  wDuty:      { width: 128 },
  wTime:      { width: 92 },
  wWorking:   { width: 100 },
  wRemarks:   { width: 96 },
});

export default EmployeeDashboardScreen;
