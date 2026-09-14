// src/screens/HR/StaffProfile/index.tsx
//
// Read-only staff profile — the app's counterpart of the web admin's
// /staff-profile/:id, opened from staff names in Staff Attendance and
// Employee Attendance. Requests mirror the web page field-for-field, taken
// from a HAR of the HR login opening a profile (2026-09-14):
//
//   /auth/get/{id}                                  profile
//   /staff-timing/get        staff_id, limit 999999  duty hours (nested)
//   /hr/employee-profile-entries/index              qualifications & experience
//   /hr/staff-documents/index approval_status=Approved   verified documents
//   /salary                  26th → 25th window      current salary sheet
//   /users-finance/get       category Reward | Fine  this month
//   /hr/promotion/index                             promotions
//   /hr/staff-documents/index document_type=Warning Letter
//   /hr/leaves-quota/index                          leave quota
//   /hr/leave-application/index                     leave applications
//
// List endpoints answer 404 for "no records"; treated as empty. Where the web
// sends an empty branch_id the app sends the viewer's own branch instead when
// they have one, so branch-scoped logins never ask for all branches.
//
// One deliberate difference: the web calls /hr/promotion/index with an empty
// branch_id, which 422s ("The branch id must be an integer") — so HR never sees
// promotions there. Promotions only match on the promotion record's own branch
// (verified on prod), so the app asks each branch the viewer may see.
//
// The web page's Update Profile form is not mirrored here.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import api from '../../../api/service';
import { getBranchesNameList } from '../../../api/employeeDashboard';
import { RootState } from '../../../redux/store';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// The web's salary window: 26th of last month → 25th of this month.
const salaryWindow = () => {
  const now = new Date();
  return {
    start: iso(new Date(now.getFullYear(), now.getMonth() - 1, 26)),
    end: iso(new Date(now.getFullYear(), now.getMonth(), 25)),
  };
};
const monthToDate = () => {
  const now = new Date();
  return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) };
};

const dash = (v: any) => {
  const s = String(v ?? '').trim();
  return s && s !== 'null' && s !== 'N/A' && s !== '0000-00-00' ? s : 'N/A';
};
const dmy = (v: any) => {
  const s = dash(v);
  if (s === 'N/A') return s;
  const [y, m, d] = s.slice(0, 10).split('-');
  return d ? `${d}-${m}-${y}` : s;
};
const rs = (n: any) => `Rs ${Math.round(Number(n) || 0).toLocaleString()}`;

const rowsOf = (body: any): any[] => {
  const d = body?.data ?? body;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

// GET that treats 404 (this API's "no records") and other failures as empty.
const getList = async (path: string, params: Record<string, any>) => {
  try {
    const res = await api.get(path, { params });
    return rowsOf(res.data);
  } catch {
    return [];
  }
};

const Row = ({ label, value }: { label: string; value: any }) => (
  <View style={s.infoRow}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{dash(value)}</Text>
  </View>
);

const Section = ({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) => (
  <View style={s.card}>
    <Text style={s.sectionTag}>{tag}</Text>
    <Text style={s.sectionTitle}>{title}</Text>
    <View style={s.sectionBody}>{children}</View>
  </View>
);

const Empty = ({ text }: { text: string }) => <Text style={s.emptyInline}>{text}</Text>;

const Badge = ({ text }: { text: string }) => {
  const ok = /approved|active|^1$/i.test(text);
  const bad = /reject|terminat|resign|inactive/i.test(text);
  return (
    <Text style={[s.badge, ok ? s.badgeOk : bad ? s.badgeBad : s.badgeWarn]}>{dash(text)}</Text>
  );
};

type Data = {
  duty: any[]; entries: any[]; docs: any[]; salary: any | null;
  rewards: any[]; fines: any[]; promotions: any[]; warnings: any[];
  quota: any[]; leaves: any[];
};

const EMPTY_DATA: Data = {
  duty: [], entries: [], docs: [], salary: null, rewards: [], fines: [],
  promotions: [], warnings: [], quota: [], leaves: [],
};

const StaffProfileScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const staffId = Number(route.params?.staffId);
  const { profile: viewer } = useSelector((state: RootState) => state.user);
  // '' (all) only for viewers with no branch of their own — HR / super admin.
  const viewerBranch: number | '' = viewer?.branchId || '';

  const [staff, setStaff] = useState<any | null>(null);
  const [data, setData] = useState<Data>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!staffId) { setError('No staff member selected.'); setLoading(false); return; }
    setError('');
    try {
      const res = await api.get(`/v1/auth/get/${staffId}`);
      const p = rowsOf(res.data)[0];
      if (!p) { setError('Staff profile not found.'); return; }
      setStaff(p);

      const staffBranch = p.branch_id ?? '';
      const sal = salaryWindow();
      const mtd = monthToDate();

      const promotionBranches: (number | string)[] = viewerBranch
        ? [viewerBranch]
        : await getBranchesNameList()
          .then(r => (r?.data ?? []).map((b: any) => b.id))
          .catch(() => (staffBranch ? [staffBranch] : []));

      const [timing, entries, docs, salary, rewards, fines, promotionSets, warnings, quota, leaves] = await Promise.all([
        getList('/v1/staff-timing/get', { page: 1, branch_id: viewerBranch, staff_id: staffId, limit: 999999 }),
        getList('/v1/hr/employee-profile-entries/index', { branch_id: staffBranch, user_id: staffId, status: 1, limit: 200 }),
        getList('/v1/hr/staff-documents/index', { page: 1, branch_id: staffBranch, user_id: staffId, approval_status: 'Approved', status: 1, limit: 200 }),
        getList('/v1/salary', { branch_id: viewerBranch, start_date: sal.start, end_date: sal.end, limit: 25, page: 1, user_id: staffId, status: 1 }),
        getList('/v1/users-finance/get', { page: 1, user_id: staffId, branch_id: viewerBranch, status: 1, limit: 25, start_date: mtd.start, end_date: mtd.end, category: 'Reward' }),
        getList('/v1/users-finance/get', { page: 1, user_id: staffId, branch_id: viewerBranch, status: 1, limit: 25, start_date: mtd.start, end_date: mtd.end, category: 'Fine' }),
        Promise.all(promotionBranches.map(b => getList('/v1/hr/promotion/index', { user_id: staffId, branch_id: b }))),
        getList('/v1/hr/staff-documents/index', { page: 1, branch_id: staffBranch, limit: 25, user_id: staffId, document_type: 'Warning Letter' }),
        getList('/v1/hr/leaves-quota/index', { page: 1, user_id: staffId, branch_id: viewerBranch, limit: 25 }),
        getList('/v1/hr/leave-application/index', { branch_id: viewerBranch, user_id: staffId, limit: 99999999, page: 1 }),
      ]);

      // staff-timing/get nests the days under the staff row.
      const duty = (timing.find((t: any) => Number(t.id) === staffId)?.duty_hours ?? timing[0]?.duty_hours ?? [])
        .filter((d: any) => String(d.status ?? '1') === '1')
        .sort((a: any, b: any) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));

      setData({
        duty, entries, docs,
        salary: salary.find((r: any) => Number(r.id) === staffId) ?? salary[0] ?? null,
        rewards, fines,
        promotions: promotionSets.flat().sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))),
        warnings, quota, leaves,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load this staff profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staffId, viewerBranch]);

  useEffect(() => { load(); }, [load]);

  const name = staff ? [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() : '';
  // The API returns the bare folder URL when there's no photo.
  const image = staff?.image && !String(staff.image).endsWith('/') ? String(staff.image) : null;
  const employment = dash(staff?.employment_status) !== 'N/A'
    ? String(staff.employment_status)
    : String(staff?.status) === '1' ? 'Active' : 'Inactive';
  const sal = data.salary;
  const commission = Number(sal?.commission?.commission ?? 0);

  return (
    <>
      <AppHeader
        title="Staff Profile"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <ActivityIndicator size="large" style={s.spinner} color="#E63946" />
      ) : error ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={s.emptyTitle}>Not Available</Text>
          <Text style={s.emptySubtitle}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={s.screen}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={['#E63946']} />}
        >
          <View style={s.hero}>
            <View style={s.heroTop}>
              {image ? (
                <FastImage source={{ uri: image }} style={s.avatar} resizeMode={FastImage.resizeMode.cover} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Icon name="account" size={30} color="#BBB" />
                </View>
              )}
              <View style={s.flex1}>
                <Text style={s.heroName}>{name || 'N/A'}</Text>
                <Text style={s.heroSub}>Staff ID: {dash(staff?.uid)}</Text>
                <Text style={s.heroSub}>{dash(staff?.designation)} · {dash(staff?.department)}</Text>
              </View>
            </View>
            <View style={s.chipRow}>
              <View style={s.chip}><Text style={s.chipText}>{dash(staff?.branch_name)}</Text></View>
              <Badge text={employment} />
            </View>
          </View>

          <Section tag="PROFILE" title="Personal Information">
            <Row label="Father Name" value={staff?.father_name} />
            <Row label="Gender" value={staff?.gender} />
            <Row label="CNIC" value={staff?.cnic} />
            <Row label="Date of Birth" value={dmy(staff?.dob)} />
            <Row label="Blood Group" value={staff?.blood_group} />
          </Section>

          <Section tag="CONTACT" title="Staff Contact Detail">
            <Row label="Phone" value={staff?.phone} />
            <Row label="Email" value={staff?.email} />
            <Row label="Official Email" value={staff?.official_email} />
            <Row label="Emergency Contact No" value={staff?.emergency_contact_no} />
            <Row label="Address" value={staff?.address} />
            <Row label="City" value={staff?.city} />
          </Section>

          <Section tag="EMPLOYMENT" title="Staff Other Details">
            <Row label="Branch" value={staff?.branch_name} />
            <Row label="Department" value={staff?.department} />
            <Row label="Designation" value={staff?.designation} />
            <Row label="Joining Date" value={dmy(staff?.joining)} />
            <Row label="Appointment Date" value={dmy(staff?.appointment_date)} />
            <Row label="Confirmation Date" value={dmy(staff?.confirmation_date)} />
            <Row label="Employee Status" value={staff?.employment_status} />
            <Row label="Employment End Date" value={dmy(staff?.employment_end_date)} />
            <Row label="Commission" value={staff?.commission != null ? `${staff.commission}%` : null} />
          </Section>

          <Section tag="DUTY" title="Staff Duty Time">
            {data.duty.length === 0 ? <Empty text="No duty hours found" /> : data.duty.map((d, i) => (
              <View key={d.id ?? i} style={s.listRow}>
                <Text style={[s.listTitle, s.flex1]}>{dash(d.day)}</Text>
                <Text style={s.listSub}>{dash(d.start_time)} - {dash(d.end_time)}</Text>
              </View>
            ))}
          </Section>

          <Section tag="SALARY" title={`Salary (${dmy(salaryWindow().start)} → ${dmy(salaryWindow().end)})`}>
            {!sal ? <Empty text="No salary record for this period" /> : (
              <>
                <Row label="Salary" value={rs(sal.salary)} />
                <Row label="Medical" value={rs(sal.medical)} />
                <Row label="Commission" value={rs(commission)} />
                <Row label="Reward" value={rs(sal.reward)} />
                <Row label="Components (+)" value={rs(sal.components_addition)} />
                <Row label="Fine" value={rs(sal.fine)} />
                <Row label="Advance" value={rs(sal.advance)} />
                <Row label="Loan Installment" value={rs(sal.loan)} />
                <Row label="Cafe" value={rs(sal.cafe)} />
                <Row label="Components (-)" value={rs(sal.components_deduction)} />
                <Row label="Deduction" value={rs(sal.detections)} />
              </>
            )}
          </Section>

          <Section tag="REWARDS" title="Rewards (this month)">
            {data.rewards.length === 0 ? <Empty text="No rewards this month" /> : data.rewards.map((r, i) => (
              <View key={r.id ?? i} style={s.listRow}>
                <View style={s.flex1}>
                  <Text style={s.listTitle}>{dash(r.reason)}</Text>
                  <Text style={s.listSub}>{dmy(r.occurrence_date)}</Text>
                </View>
                <Text style={[s.amount, s.amountOk]}>+{rs(r.amount)}</Text>
              </View>
            ))}
          </Section>

          <Section tag="FINES" title="Fines (this month)">
            {data.fines.length === 0 ? <Empty text="No fines this month" /> : data.fines.map((r, i) => (
              <View key={r.id ?? i} style={s.listRow}>
                <View style={s.flex1}>
                  <Text style={s.listTitle}>{dash(r.reason)}</Text>
                  <Text style={s.listSub}>{dmy(r.occurrence_date)}</Text>
                </View>
                <Text style={[s.amount, s.amountBad]}>-{rs(r.amount)}</Text>
              </View>
            ))}
          </Section>

          <Section tag="PROMOTIONS" title="Active Promotions">
            {data.promotions.length === 0 ? <Empty text="No promotions found" /> : data.promotions.map((r, i) => (
              <View key={r.id ?? i} style={s.block}>
                <View style={s.blockHead}>
                  <Text style={s.listTitle}>{dmy(r.date)}</Text>
                  <Text style={s.listSub}>{dash(r.branch)}</Text>
                </View>
                <Row label="Department" value={`${dash(r.pervs_depart)} → ${dash(r.new_depart)}`} />
                <Row label="Designation" value={`${dash(r.pervs_designation)} → ${dash(r.new_designation)}`} />
                <Row label="Salary" value={`${rs(r.previous_salary)} → ${rs(r.new_salary)}`} />
                {dash(r.details) !== 'N/A' && <Row label="Details" value={r.details} />}
              </View>
            ))}
          </Section>

          <Section tag="DISCIPLINARY" title="Warning Letters">
            {data.warnings.length === 0 ? <Empty text="No warning letters" /> : data.warnings.map((r, i) => (
              <View key={r.id ?? i} style={s.listRow}>
                <View style={s.flex1}>
                  <Text style={s.listTitle}>{dash(r.subject ?? r.document_type)}</Text>
                  <Text style={s.listSub}>{dmy(r.issue_date)}{r.description ? ` · ${r.description}` : ''}</Text>
                </View>
                <Badge text={String(r.approval_status ?? '')} />
              </View>
            ))}
          </Section>

          <Section tag="EDUCATION" title="Qualifications & Experience">
            {data.entries.length === 0 ? <Empty text="No qualifications or experience records found" /> : data.entries.map((r, i) => (
              <View key={r.id ?? i} style={s.listRow}>
                <View style={s.flex1}>
                  <Text style={s.listTitle}>{dash(r.title)}</Text>
                  <Text style={s.listSub}>
                    {dash(r.organization)}{r.start_date ? ` · ${dmy(r.start_date)} → ${dmy(r.end_date)}` : ''}
                  </Text>
                </View>
                <Text style={s.listTag}>{dash(r.entry_type)}</Text>
              </View>
            ))}
          </Section>

          <Section tag="DOCUMENTS" title="Verified Documents">
            {data.docs.length === 0 ? <Empty text="No verified documents" /> : data.docs.map((r, i) => (
              <View key={r.id ?? i} style={s.listRow}>
                <View style={s.flex1}>
                  <Text style={s.listTitle}>{dash(r.document_type)}</Text>
                  <Text style={s.listSub}>{dash(r.document_category)}{r.issue_date ? ` · ${dmy(r.issue_date)}` : ''}</Text>
                </View>
                <Badge text={String(r.approval_status ?? '')} />
              </View>
            ))}
          </Section>

          <Section tag="LEAVE" title="Leave Quota">
            {data.quota.length === 0 ? <Empty text="No leave quota" /> : data.quota.map((r, i) => {
              const taken = Number(r.leaves_taken ?? 0);
              const total = Number(r.number_of_leaves ?? 0);
              return (
                <View key={r.id ?? i} style={s.listRow}>
                  <View style={s.flex1}>
                    <Text style={s.listTitle}>{dash(r.leave_type)}</Text>
                    <Text style={s.listSub}>{dash(r.branch_info?.name)}</Text>
                  </View>
                  <Text style={s.listSub}>{taken} / {total} taken · {Math.max(0, total - taken)} left</Text>
                </View>
              );
            })}
          </Section>

          <Section tag="LEAVE" title="Leave Applications">
            {data.leaves.length === 0 ? <Empty text="No leave applications" /> : data.leaves.map((r, i) => (
              <View key={r.id ?? i} style={s.listRow}>
                <View style={s.flex1}>
                  <Text style={s.listTitle}>{dash(r.leave_type)} · {dash(r.category)}</Text>
                  <Text style={s.listSub}>
                    {dmy(r.from)} → {dmy(r.to)} · {r.number_of_leaves ?? 0} day{Number(r.number_of_leaves) === 1 ? '' : 's'}
                  </Text>
                  {dash(r.reason) !== 'N/A' && <Text style={s.listSub}>{r.reason}</Text>}
                </View>
                <Badge text={String(r.application_status ?? '')} />
              </View>
            ))}
          </Section>
        </ScrollView>
      )}
    </>
  );
};

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  content:      { padding: 12, paddingBottom: 32 },
  spinner:      { marginTop: 60 },
  flex1:        { flex: 1 },
  hero:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#E63946' },
  heroTop:      { flexDirection: 'row', gap: 12 },
  avatar:       { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F5F7FA' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  heroName:     { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  heroSub:      { fontSize: 11, color: '#888', marginTop: 3, lineHeight: 15 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 },
  chip:         { backgroundColor: '#F0F0F0', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:     { fontSize: 12, color: '#444', fontWeight: '500' },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  sectionTag:   { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  sectionBody:  { marginTop: 6 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  infoLabel:    { fontSize: 12, color: '#888' },
  infoValue:    { fontSize: 13, color: '#1A1A1A', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  listRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  listTitle:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  listSub:      { fontSize: 11, color: '#888', marginTop: 2 },
  listTag:      { fontSize: 11, color: '#C0392B', fontWeight: '700' },
  block:        { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EFEFEF' },
  blockHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  amount:       { fontSize: 13, fontWeight: '800' },
  amountOk:     { color: '#2E7D32' },
  amountBad:    { color: '#C62828' },
  badge:        { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  badgeOk:      { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  badgeWarn:    { backgroundColor: '#FFF4E5', color: '#B45309' },
  badgeBad:     { backgroundColor: '#FFEBEE', color: '#C62828' },
  emptyInline:  { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 14 },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 44, marginBottom: 10 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
});

export default StaffProfileScreen;
