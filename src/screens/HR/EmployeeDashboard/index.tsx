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
  TextInput, Alert, Modal,
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
import {
  getEmployeeDashboardStats, getStaffDetail, getAttendanceList, getDutyHours,
  getSalaryList, getLeaveApplications, getProfileEntries, getStaffDocuments,
  updateStaffProfile,
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
const TAB_EMPTY: Record<string, [string, string]> = {
  Attendance: ['🗓️', 'No Attendance'],
  'Duty Hours': ['⏰', 'No Duty Hours'],
  Salary: ['💰', 'No Salary Records'],
  Leave: ['🌴', 'No Leave Applications'],
  'Qualifications & Experience': ['🎓', 'No Qualifications'],
  Documents: ['📄', 'No Documents'],
};

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
        rows = list(await getDutyHours({ branch_id: branchId, staff_id: userId, limit: 50 }));
      } else if (t === 'Salary') {
        // The web calls /v1/salary with a date window — getSalaryList, not
        // getSalarySlips. It answers 403 for a blank role ("Unauthorized. Your
        // role cannot access this resource."), handled below.
        rows = list(await getSalaryList({
          branch_id: branchId, user_id: userId,
          start_date: monthsAgo(1), end_date: fmtDate(new Date()), limit: 50,
        }));
      } else if (t === 'Leave') {
        rows = list(await getLeaveApplications(common as any));
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
    () => ['Employee', p.department_name ?? p.department, p.designation, p.branch_name ?? profile?.branchName]
      .map(v => String(v ?? '').trim()).filter(v => v && v !== 'null'),
    [p, profile],
  );

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
            <Row label="Role" value="Employee" />
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
    if (rows.length === 0) {
      const [icon, title] = TAB_EMPTY[tab] ?? ['📋', 'No Records'];
      return <Empty icon={icon} title={title} subtitle={`Nothing saved against your profile yet.`} />;
    }

    if (tab === 'Duty Hours') {
      return (
        <View style={s.card}>
          {rows.map((r, i) => (
            <View key={r.id ?? i} style={s.listRow}>
              <View style={s.flex1}>
                <Text style={s.listTitle}>{dash(r.day ?? r.week_day)}</Text>
                <Text style={s.listSub}>{dash(r.start_time)} — {dash(r.end_time)}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (tab === 'Salary') {
      return (
        <View style={s.card}>
          {rows.map((r, i) => (
            <View key={r.id ?? i} style={s.listRow}>
              <View style={s.flex1}>
                <Text style={s.listTitle}>{dash(r.month ?? r.salary_month ?? r.date)}</Text>
                <Text style={s.listSub}>{dash(r.status ?? r.payment_status)}</Text>
              </View>
              <Text style={s.listAmount}>{rs(r.net_salary ?? r.salary ?? r.amount)}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (tab === 'Leave') {
      return (
        <View style={s.card}>
          {rows.map((r, i) => (
            <View key={r.id ?? i} style={s.listRow}>
              <View style={s.flex1}>
                <Text style={s.listTitle}>{dash(r.leave_type)}</Text>
                <Text style={s.listSub}>{dash(r.start_date)} → {dash(r.end_date)}</Text>
              </View>
              <Text style={[s.badge, s.badgeWarn]}>
                {dash(r.application_status ?? r.leave_status)}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    if (tab === 'Qualifications & Experience') {
      return (
        <View style={s.card}>
          {rows.map((r, i) => (
            <View key={r.id ?? i} style={s.listRow}>
              <View style={s.flex1}>
                <Text style={s.listTitle}>{dash(r.title)}</Text>
                <Text style={s.listSub}>
                  {dash(r.organization)}{r.start_date ? ` · ${dash(r.start_date)} → ${dash(r.end_date)}` : ''}
                </Text>
              </View>
              <Text style={s.listTag}>{dash(r.entry_type)}</Text>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={s.card}>
        {rows.map((r, i) => (
          <View key={r.id ?? i} style={s.listRow}>
            <View style={s.flex1}>
              <Text style={s.listTitle}>{dash(r.document_type)}</Text>
              <Text style={s.listSub}>{dash(r.document_category)}</Text>
            </View>
            <Text style={[s.badge, String(r.approval_status) === 'Approved' ? s.badgeOk : s.badgeWarn]}>
              {dash(r.approval_status)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <AppHeader
        title="Employee Dashboard"
        leftIcon={<Icon name="menu" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.openDrawer?.()}
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
