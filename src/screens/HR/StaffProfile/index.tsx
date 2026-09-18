// src/screens/HR/StaffProfile/index.tsx
//
// Staff profile — the app's counterpart of the web admin's
// /staff-profile/:id, opened from staff names in Staff Attendance and
// Employee Attendance. Laid out as the web's eight tabs (General Info, Salary
// Records, Rewards, Fines, Employment Actions, Leave Quota, Education and
// Experience, Verified Documents). Requests mirror the web page field-for-field,
// taken from HARs of the HR login opening a profile (2026-09-14, 2026-09-18):
//
//   /auth/get/{id}                                  profile
//   /staff-timing/get        staff_id, limit 999999  duty hours (nested)
//   /hr/employee-profile-entries/index              qualifications & experience
//   /hr/staff-documents/index approval_status=Approved   verified documents
//   /salary                  26th → 25th window      salary records
//   /users-finance/get       category Reward | Fine  rewards / fines, 25/page
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
// HR and admin logins get the web's Add Reward, Add Fine, Add Warning and
// Add Promotion actions; everyone else sees the profile read-only. The web's
// Update Profile form, Print and per-row delete are not mirrored here.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, TextInput, Platform, Linking,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import api from '../../../api/service';
import {
  getBranchesNameList, addStaffDocument, addStaffFinanceEntry,
} from '../../../api/employeeDashboard';
import { isAdmin, isHR } from '../../../config/permissions';
import { RootState } from '../../../redux/store';

const R = '#E63946';
const PAGE_SIZE = 25;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const TABS = [
  { key: 'general', label: 'General Info', icon: 'account' },
  { key: 'salary', label: 'Salary Records', icon: 'file-document' },
  { key: 'rewards', label: 'Rewards', icon: 'gift' },
  { key: 'fines', label: 'Fines', icon: 'cash-minus' },
  { key: 'employment', label: 'Employment Actions', icon: 'briefcase' },
  { key: 'leave', label: 'Leave Quota', icon: 'card-account-details' },
  { key: 'education', label: 'Education and Experience', icon: 'school' },
  { key: 'documents', label: 'Verified Documents', icon: 'check-decagram' },
] as const;
type TabKey = typeof TABS[number]['key'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
// The web's salary window for a month: 26th of the previous month → 25th.
const salaryWindow = (year: number, month: number) => ({
  start: iso(new Date(year, month - 1, 26)),
  end: iso(new Date(year, month, 25)),
});
const monthStart = () => { const n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth(), 1)); };

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
const num = (v: any) => Number(v) || 0;
const rs = (n: any) => `Rs ${Math.round(num(n)).toLocaleString()}/-`;
const time12 = (t: any) => {
  const [h, m] = String(t ?? '').split(':').map(Number);
  if (Number.isNaN(h)) return 'N/A';
  return `${pad(((h + 11) % 12) + 1)}:${pad(m || 0)} ${h < 12 ? 'AM' : 'PM'}`;
};

const rowsOf = (body: any): any[] => {
  const d = body?.data ?? body;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};
const pagesOf = (body: any) =>
  num(body?.totalPages ?? body?.pagination?.total_pages ?? body?.last_page ?? body?.data?.last_page) || 1;

// GET that treats 404 (this API's "no records") and other failures as empty.
const getBody = async (path: string, params: Record<string, any>) => {
  try {
    return (await api.get(path, { params })).data;
  } catch {
    return null;
  }
};
const getList = async (path: string, params: Record<string, any>) => rowsOf(await getBody(path, params));

const errText = (e: any, fallback: string) => {
  const msg = e?.response?.data?.message;
  return typeof msg === 'string' ? msg : msg ? Object.values(msg).flat().join(' ') : fallback;
};

// ─── Small building blocks ───────────────────────────────────────────────────

const Row = ({ label, value }: { label: string; value: any }) => (
  <View style={s.infoRow}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{dash(value)}</Text>
  </View>
);

const Card = ({ title, sub, right, children }: {
  title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode;
}) => (
  <View style={s.card}>
    <View style={s.cardHead}>
      <View style={s.flex1}>
        <Text style={s.cardTitle}>{title}</Text>
        {sub ? <Text style={s.cardSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
    {children}
  </View>
);

const Badge = ({ text }: { text: string }) => {
  const ok = /approved|active|employed|^1$/i.test(text);
  const bad = /reject|terminat|resign|inactive/i.test(text);
  return (
    <Text style={[s.badge, ok ? s.badgeOk : bad ? s.badgeBad : s.badgeWarn]}>{dash(text)}</Text>
  );
};

type Col = { title: string; width: number; render: (r: any, i: number) => React.ReactNode };

// Red-header, horizontally scrolling table — the HR screens' table pattern.
const Table = ({ cols, rows, empty = 'No Record Found', offset = 0 }: {
  cols: Col[]; rows: any[]; empty?: string; offset?: number;
}) => {
  if (rows.length === 0) return <Text style={s.emptyInline}>{empty}</Text>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={s.thead}>
          {cols.map(c => <Text key={c.title} style={[s.th, { width: c.width }]}>{c.title}</Text>)}
        </View>
        {rows.map((r, i) => (
          <View key={r.id ?? i} style={[s.tr, i % 2 === 1 && s.trAlt]}>
            {cols.map(c => {
              const v = c.render(r, offset + i);
              return typeof v === 'string' || typeof v === 'number'
                ? <Text key={c.title} style={[s.td, { width: c.width }]}>{v}</Text>
                : <View key={c.title} style={[s.tdBox, { width: c.width }]}>{v}</View>;
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const Pager = ({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) =>
  pages > 1 ? (
    <View style={s.pagination}>
      <TouchableOpacity disabled={page <= 1} onPress={() => onPage(page - 1)} style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}>
        <Icon name="chevron-left" size={18} color={page <= 1 ? '#ccc' : R} />
      </TouchableOpacity>
      <Text style={s.pageText}>Page {page} of {pages}</Text>
      <TouchableOpacity disabled={page >= pages} onPress={() => onPage(page + 1)} style={[s.pageBtn, page >= pages && s.pageBtnDisabled]}>
        <Icon name="chevron-right" size={18} color={page >= pages ? '#ccc' : R} />
      </TouchableOpacity>
    </View>
  ) : null;

const DateField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.input} onPress={() => setOpen(true)}>
        <Text style={s.inputText}>{dmy(value)}</Text>
        <Icon name="calendar" size={18} color="#888" />
      </TouchableOpacity>
      {open && (
        <>
          <DateTimePicker
            value={fromIso(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_: any, d?: Date) => {
              if (Platform.OS === 'android') setOpen(false);
              if (d) onChange(iso(d));
            }}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity onPress={() => setOpen(false)} style={s.iosDone}>
              <Text style={s.iosDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const Field = ({ label, value, onChange, placeholder, numeric, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; numeric?: boolean; multiline?: boolean;
}) => (
  <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={[s.input, s.inputText, multiline && s.inputMulti]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#aaa"
      keyboardType={numeric ? 'numeric' : 'default'}
      multiline={multiline}
    />
  </View>
);

const Status = ({ error, success }: { error: string; success: string }) => (
  <>
    {error ? <Text style={s.errText}>{error}</Text> : null}
    {success ? <Text style={s.successText}>{success}</Text> : null}
  </>
);

const PrimaryBtn = ({ label, onPress, busy, dark }: { label: string; onPress: () => void; busy?: boolean; dark?: boolean }) => (
  <TouchableOpacity style={[dark ? s.darkBtn : s.saveBtn, busy && s.btnDisabled]} onPress={onPress} disabled={busy}>
    {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>{label}</Text>}
  </TouchableOpacity>
);

// ─── Rewards / Fines tab ─────────────────────────────────────────────────────
// Both tabs are the same web component with a different category: an Add form
// (Fines adds a Deduction Date) above a From/To + Generate list, 25/page.

const FinanceTab = ({ category, staff, staffName, viewerBranch, canEdit }: {
  category: 'Reward' | 'Fine'; staff: any; staffName: string;
  viewerBranch: number | ''; canEdit: boolean;
}) => {
  const isFine = category === 'Fine';
  const today = iso(new Date());
  const [form, setForm] = useState({ date: today, amount: '', reason: 'N/A', deduction: today });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const body = await getBody('/v1/users-finance/get', {
      page: p, user_id: staff.id, branch_id: viewerBranch, status: 1,
      limit: PAGE_SIZE, start_date: from, end_date: to, category,
    });
    setRows(rowsOf(body));
    setPages(pagesOf(body));
    setPage(p);
    setLoading(false);
  }, [staff.id, viewerBranch, from, to, category]);

  // Generate is explicit on the web; load once on open with the default range.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1); }, []);

  const save = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setFormError('Amount is required.'); return; }
    if (!form.reason.trim()) { setFormError('Reason is required.'); return; }
    setFormError('');
    setSaving(true);
    try {
      await addStaffFinanceEntry({
        branch_id: staff.branch_id,
        user_id: staff.id,
        amount,
        category,
        occurrence_date: form.date,
        return_month: isFine ? form.deduction : form.date,
        reason: form.reason.trim(),
      });
      setSuccess(`${category} added successfully.`);
      setTimeout(() => setSuccess(''), 3000);
      setForm({ date: today, amount: '', reason: 'N/A', deduction: today });
      load(1);
    } catch (e: any) {
      setFormError(errText(e, `Failed to add ${category.toLowerCase()}.`));
    } finally {
      setSaving(false);
    }
  };

  const cols: Col[] = [
    { title: 'Sr#', width: 50, render: (_r, i) => String(i + 1) },
    { title: 'Name', width: 140, render: r => dash([r.user_fname, r.user_lname].filter(Boolean).join(' ') || staffName) },
    { title: 'Amount', width: 110, render: r => rs(r.amount) },
    { title: 'Reason', width: 200, render: r => dash(r.reason) },
    { title: 'Date', width: 100, render: r => dmy(r.occurrence_date) },
    ...(isFine ? [{ title: 'Deduction Date', width: 120, render: (r: any) => dmy(r.return_month) }] : []),
  ];

  return (
    <>
      {canEdit && (
        <Card title={`Add ${category}`}>
          <DateField label={`${category} Date`} value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
          <View style={s.field}>
            <Text style={s.label}>Name</Text>
            <View style={[s.input, s.inputLocked]}><Text style={s.inputText}>{staffName}</Text></View>
          </View>
          <Field label="Amount *" value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} placeholder="Amount" numeric />
          <Field label="Reason *" value={form.reason} onChange={v => setForm(f => ({ ...f, reason: v }))} multiline />
          {isFine && (
            <DateField label="Deduction Date" value={form.deduction} onChange={v => setForm(f => ({ ...f, deduction: v }))} />
          )}
          <Status error={formError} success={success} />
          <PrimaryBtn label={`Add ${category}`} onPress={save} busy={saving} dark />
        </Card>
      )}

      <Card title={isFine ? 'View Fine' : 'View Rewards'}>
        <View style={s.twoCol}>
          <View style={s.flex1}><DateField label="From" value={from} onChange={setFrom} /></View>
          <View style={s.flex1}><DateField label="To" value={to} onChange={setTo} /></View>
        </View>
        <PrimaryBtn label="Generate" onPress={() => load(1)} dark />
        <View style={s.gap} />
        {loading
          ? <ActivityIndicator color={R} style={s.inlineSpinner} />
          : <Table cols={cols} rows={rows} offset={(page - 1) * PAGE_SIZE} />}
        <Pager page={page} pages={pages} onPage={load} />
      </Card>
    </>
  );
};

// ─── Salary Records tab ──────────────────────────────────────────────────────

const SalaryTab = ({ staffId, viewerBranch }: { staffId: number; viewerBranch: number | '' }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const w = salaryWindow(y, m);
    const rows = await getList('/v1/salary', {
      branch_id: viewerBranch, start_date: w.start, end_date: w.end,
      limit: 25, page: 1, user_id: staffId, status: 1,
    });
    setRow(rows.find((r: any) => Number(r.id) === staffId) ?? rows[0] ?? null);
    setLoading(false);
  }, [staffId, viewerBranch]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(year, month); }, []);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  };

  const commission = num(row?.commission?.commission);
  const net = row
    ? num(row.salary) + num(row.medical) + commission + num(row.reward) + num(row.components_addition)
      - num(row.fine) - num(row.advance) - num(row.loan) - num(row.cafe)
      - num(row.components_deduction) - num(row.detections)
    : 0;
  const w = salaryWindow(year, month);

  return (
    <Card title="View Salary" sub={`Monthly · ${dmy(w.start)} → ${dmy(w.end)}`}>
      <View style={s.monthRow}>
        <TouchableOpacity style={s.pageBtn} onPress={() => shift(-1)}>
          <Icon name="chevron-left" size={18} color={R} />
        </TouchableOpacity>
        <Text style={s.monthText}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity style={s.pageBtn} onPress={() => shift(1)}>
          <Icon name="chevron-right" size={18} color={R} />
        </TouchableOpacity>
      </View>
      <PrimaryBtn label="Generate" onPress={() => load(year, month)} dark />
      <View style={s.gap} />
      {loading ? <ActivityIndicator color={R} style={s.inlineSpinner} /> : !row
        ? <Text style={s.emptyInline}>No Record Found</Text>
        : (
          <>
            <Row label="Department" value={row.department} />
            <Row label="Designation" value={row.designation} />
            <Row label="Salary" value={rs(row.salary)} />
            <Row label="Commission" value={rs(commission)} />
            <Row label="Reward" value={rs(row.reward)} />
            <Row label="Medical" value={rs(row.medical)} />
            <Row label="Advance" value={rs(row.advance)} />
            <Row label="Fine" value={rs(row.fine)} />
            <Row label="Monthly Installment" value={rs(row.loan)} />
            <Row label="Cafe" value={rs(row.cafe)} />
            <Row label="Deduction" value={rs(row.detections)} />
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Net Salary</Text>
              <Text style={s.totalValue}>{rs(net)}</Text>
            </View>
          </>
        )}
    </Card>
  );
};

// ─── Employment Actions tab ──────────────────────────────────────────────────

const EmploymentTab = ({ staff, promotions, warnings, canEdit, onWarningAdded }: {
  staff: any; promotions: any[]; warnings: any[]; canEdit: boolean; onWarningAdded: () => void;
}) => {
  const navigation = useNavigation<any>();
  const [form, setForm] = useState({ date: iso(new Date()), code: '', subject: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const increments = promotions.filter(p => num(p.new_salary) !== num(p.previous_salary));
  const moves = promotions.filter(p =>
    dash(p.pervs_depart) !== dash(p.new_depart) || dash(p.pervs_designation) !== dash(p.new_designation));

  const addWarning = async () => {
    if (!form.subject.trim()) { setError('Subject / Reason is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await addStaffDocument({
        branch_id: staff.branch_id,
        user_id: staff.id,
        document_category: 'Letter',
        document_type: 'Warning Letter',
        issue_date: form.date,
        subject: form.subject.trim(),
        document_code: form.code.trim() || undefined,
      });
      setSuccess('Warning added successfully.');
      setTimeout(() => setSuccess(''), 3000);
      setForm({ date: iso(new Date()), code: '', subject: '' });
      onWarningAdded();
    } catch (e: any) {
      setError(errText(e, 'Failed to add warning.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card
        title="Promotions & Salary Changes"
        sub="Promotion history and salary increments for this staff member"
        right={canEdit ? (
          <TouchableOpacity style={s.smallBtn} onPress={() => navigation.navigate('StaffPromotion')}>
            <Icon name="plus" size={14} color="#fff" />
            <Text style={s.smallBtnText}>Add Promotion</Text>
          </TouchableOpacity>
        ) : undefined}
      >
        <Row label="Joining Date" value={dmy(staff.joining)} />
        <Row label="Starting Salary" value={rs(staff.salary)} />

        <Text style={s.subHead}>Salary Increment</Text>
        <Table
          empty="N/A"
          rows={increments}
          cols={[
            { title: 'Date', width: 100, render: r => dmy(r.date) },
            { title: 'Current Salary', width: 120, render: r => rs(r.previous_salary) },
            { title: 'Increment', width: 110, render: r => rs(num(r.new_salary) - num(r.previous_salary)) },
            { title: 'Revised Salary', width: 120, render: r => rs(r.new_salary) },
            { title: 'Details', width: 180, render: r => dash(r.details) },
          ]}
        />

        <Text style={s.subHead}>Promotion</Text>
        <Table
          empty="N/A"
          rows={moves}
          cols={[
            { title: 'Date', width: 100, render: r => dmy(r.date) },
            { title: 'Promoted Department', width: 160, render: r => dash(r.new_depart) },
            { title: 'Previous Designation', width: 160, render: r => dash(r.pervs_designation) },
            { title: 'Promoted Designation', width: 160, render: r => dash(r.new_designation) },
            { title: 'Salary', width: 110, render: r => rs(r.new_salary) },
          ]}
        />
      </Card>

      <Card title="Disciplinary Action" sub="Warning letters and misconduct records for this staff member">
        {canEdit && (
          <>
            <DateField label="Issue Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
            <Field label="Document Code" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} placeholder="Optional" />
            <Field label="Subject / Reason" value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} placeholder="e.g. Late attendance / Misconduct" />
            <Status error={error} success={success} />
            <PrimaryBtn label="+ Add Warning" onPress={addWarning} busy={saving} dark />
            <View style={s.gap} />
          </>
        )}
        <Table
          rows={warnings}
          cols={[
            { title: 'Sr#', width: 50, render: (_r, i) => String(i + 1) },
            { title: 'Type', width: 120, render: r => dash(r.document_type) },
            { title: 'Subject', width: 240, render: r => dash(r.subject) },
            { title: 'Issue Date', width: 100, render: r => dmy(r.issue_date) },
            { title: 'Code', width: 140, render: r => dash(r.document_code) },
            { title: 'Status', width: 90, render: r => <Badge text={String(r.status) === '1' ? 'Active' : 'Inactive'} /> },
          ]}
        />
      </Card>
    </>
  );
};

// ─── Screen ──────────────────────────────────────────────────────────────────

type Data = {
  duty: any[]; entries: any[]; docs: any[];
  promotions: any[]; warnings: any[]; quota: any[]; leaves: any[];
};

const EMPTY_DATA: Data = {
  duty: [], entries: [], docs: [], promotions: [], warnings: [], quota: [], leaves: [],
};

const LEAVE_ORDER = ['Medical', 'Casual', 'Annual'];

const StaffProfileScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const staffId = Number(route.params?.staffId);
  const { profile: viewer } = useSelector((state: RootState) => state.user);
  // '' (all) only for viewers with no branch of their own — HR / super admin.
  const viewerBranch: number | '' = viewer?.branchId || '';
  const canEdit = isHR(viewer?.role) || isAdmin(viewer?.role);

  const [tab, setTab] = useState<TabKey>('general');
  const [staff, setStaff] = useState<any | null>(null);
  const [data, setData] = useState<Data>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Bumped on pull-to-refresh so the self-loading tabs remount and refetch.
  const [reloadKey, setReloadKey] = useState(0);

  const loadWarnings = useCallback((branch: any) =>
    getList('/v1/hr/staff-documents/index', { page: 1, branch_id: branch, limit: 25, user_id: staffId, document_type: 'Warning Letter' }),
  [staffId]);

  const load = useCallback(async () => {
    if (!staffId) { setError('No staff member selected.'); setLoading(false); return; }
    setError('');
    try {
      const res = await api.get(`/v1/auth/get/${staffId}`);
      const p = rowsOf(res.data)[0];
      if (!p) { setError('Staff profile not found.'); return; }
      setStaff(p);

      const staffBranch = p.branch_id ?? '';
      const promotionBranches: (number | string)[] = viewerBranch
        ? [viewerBranch]
        : await getBranchesNameList()
          .then(r => (r?.data ?? []).map((b: any) => b.id))
          .catch(() => (staffBranch ? [staffBranch] : []));

      const [timing, entries, docs, promotionSets, warnings, quota, leaves] = await Promise.all([
        getList('/v1/staff-timing/get', { page: 1, branch_id: viewerBranch, staff_id: staffId, limit: 999999 }),
        getList('/v1/hr/employee-profile-entries/index', { branch_id: staffBranch, user_id: staffId, status: 1, limit: 200 }),
        getList('/v1/hr/staff-documents/index', { page: 1, branch_id: staffBranch, user_id: staffId, approval_status: 'Approved', status: 1, limit: 200 }),
        Promise.all(promotionBranches.map(b => getList('/v1/hr/promotion/index', { user_id: staffId, branch_id: b }))),
        loadWarnings(staffBranch),
        getList('/v1/hr/leaves-quota/index', { page: 1, user_id: staffId, branch_id: viewerBranch, limit: 25 }),
        getList('/v1/hr/leave-application/index', { branch_id: viewerBranch, user_id: staffId, limit: 99999999, page: 1 }),
      ]);

      // staff-timing/get nests the days under the staff row.
      const duty = (timing.find((t: any) => Number(t.id) === staffId)?.duty_hours ?? timing[0]?.duty_hours ?? [])
        .filter((d: any) => String(d.status ?? '1') === '1')
        .sort((a: any, b: any) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));

      setData({
        duty, entries, docs,
        promotions: promotionSets.flat().sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))),
        warnings,
        quota: [...quota].sort((a: any, b: any) => LEAVE_ORDER.indexOf(a.leave_type) - LEAVE_ORDER.indexOf(b.leave_type)),
        leaves,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load this staff profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staffId, viewerBranch, loadWarnings]);

  useEffect(() => { load(); }, [load]);

  const refreshWarnings = async () => {
    const warnings = await loadWarnings(staff?.branch_id ?? '');
    setData(d => ({ ...d, warnings }));
  };

  const name = staff ? [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() : '';
  // The API returns the bare folder URL when there's no photo.
  const image = staff?.image && !String(staff.image).endsWith('/') ? String(staff.image) : null;
  const employment = dash(staff?.employment_status) !== 'N/A'
    ? String(staff.employment_status)
    : String(staff?.status) === '1' ? 'Active' : 'Inactive';

  const entriesOf = (type: string) => data.entries.filter(e => String(e.entry_type).toLowerCase() === type);
  const entryCols: Col[] = [
    { title: 'Title', width: 140, render: r => dash(r.title) },
    { title: 'Institute / Company', width: 170, render: r => dash(r.organization) },
    { title: 'Location', width: 110, render: r => dash(r.location) },
    { title: 'Start Date', width: 100, render: r => dmy(r.start_date) },
    { title: 'End Date', width: 100, render: r => dmy(r.end_date) },
    { title: 'Description', width: 180, render: r => dash(r.description) },
  ];

  const renderTab = () => {
    switch (tab) {
      case 'general':
        return (
          <>
            <Card title="Staff Name">
              <Row label="First Name" value={staff.first_name} />
              <Row label="Last Name" value={staff.last_name} />
              <Row label="Father's Name" value={staff.father_name} />
              <Row label="DOB" value={dmy(staff.dob)} />
            </Card>
            <Card title="Staff Contact Detail">
              <Row label="Email" value={staff.email} />
              <Row label="Official Email" value={staff.official_email} />
              <Row label="Phone" value={staff.phone} />
              <Row label="Emergency Contact No" value={staff.emergency_contact_no} />
              <Row label="Blood Group" value={staff.blood_group} />
              <Row label="CNIC" value={staff.cnic} />
            </Card>
            <Card title="Staff Address Detail">
              <Row label="Address" value={staff.address} />
              <Row label="City" value={staff.city} />
            </Card>
            <Card title="Staff Duty Time">
              {data.duty.length === 0 ? <Text style={s.emptyInline}>No duty hours found</Text> : (
                <View style={s.dutyGrid}>
                  {data.duty.map((d, i) => (
                    <View key={d.id ?? i} style={s.dutyCell}>
                      <Text style={s.dutyDay}>{dash(d.day)}</Text>
                      <Text style={s.dutyTime}>{time12(d.start_time)} to {time12(d.end_time)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
            <Card title="Employee Status">
              <Row label="Employee Status" value={staff.employment_status} />
              <Row label="Employment End Date" value={dmy(staff.employment_end_date)} />
            </Card>
            <Card title="Staff Other Details">
              <Row label="Gender" value={staff.gender} />
              <Row label="Branch" value={staff.branch_name} />
              <Row label="Department" value={staff.department} />
              <Row label="Designation" value={staff.designation} />
              <Row label="Joining Date" value={dmy(staff.joining)} />
              <Row label="Appointment Date" value={dmy(staff.appointment_date)} />
              <Row label="Confirmation Date" value={dmy(staff.confirmation_date)} />
              <Row label="Salary" value={rs(staff.salary)} />
              <Row label="Commission" value={staff.commission != null ? `${staff.commission}%` : null} />
            </Card>
          </>
        );
      case 'salary':
        return <SalaryTab key={reloadKey} staffId={staffId} viewerBranch={viewerBranch} />;
      case 'rewards':
      case 'fines':
        return (
          <FinanceTab
            key={`${tab}-${reloadKey}`}
            category={tab === 'rewards' ? 'Reward' : 'Fine'}
            staff={staff}
            staffName={name}
            viewerBranch={viewerBranch}
            canEdit={canEdit}
          />
        );
      case 'employment':
        return (
          <EmploymentTab
            staff={staff}
            promotions={data.promotions}
            warnings={data.warnings}
            canEdit={canEdit}
            onWarningAdded={refreshWarnings}
          />
        );
      case 'leave':
        return (
          <>
            <Card title="Leave Quota">
              <Table
                rows={data.quota}
                cols={[
                  { title: 'Description', width: 130, render: r => `${dash(r.leave_type)} Leave` },
                  { title: 'Entitlement', width: 100, render: r => String(num(r.number_of_leaves)) },
                  { title: 'Approved', width: 90, render: r => String(num(r.leaves_taken)) },
                  { title: 'Pending', width: 90, render: r => String(num(r.user_info?.[`pending${r.leave_type}Leaves`])) },
                  { title: 'Balance', width: 90, render: r => String(Math.max(0, num(r.number_of_leaves) - num(r.leaves_taken))) },
                ]}
              />
            </Card>
            <Card title="Applications">
              <Table
                rows={data.leaves}
                cols={[
                  { title: 'Type of Absence', width: 130, render: r => dash(r.leave_status) },
                  { title: 'Leave Type', width: 100, render: r => dash(r.leave_type) },
                  { title: 'Category', width: 100, render: r => dash(r.category) },
                  { title: 'From', width: 100, render: r => dmy(r.from) },
                  { title: 'To', width: 100, render: r => dmy(r.to) },
                  { title: 'No. Of Leaves', width: 100, render: r => String(num(r.number_of_leaves)) },
                  { title: 'Application Status', width: 140, render: r => <Badge text={String(r.application_status ?? '')} /> },
                ]}
              />
            </Card>
          </>
        );
      case 'education':
        return (
          <Card title="Employee Added Qualifications, Experience & Education">
            <Text style={s.subHead}>Qualification</Text>
            <Table rows={entriesOf('qualification')} cols={entryCols} empty="No qualification records added by employee yet." />
            <Text style={s.subHead}>Experience</Text>
            <Table rows={entriesOf('experience')} cols={entryCols} empty="No experience records added by employee yet." />
            <Text style={s.subHead}>Education</Text>
            <Table rows={entriesOf('education')} cols={entryCols} empty="No education records added by employee yet." />
          </Card>
        );
      case 'documents':
        return (
          <Card title="Verified Documents">
            <Table
              rows={data.docs}
              cols={[
                { title: 'Category', width: 100, render: r => dash(r.document_category) },
                { title: 'Title', width: 240, render: r => dash(r.subject) },
                { title: 'Code', width: 140, render: r => dash(r.document_code) },
                { title: 'Issue Date', width: 100, render: r => dmy(r.issue_date) },
                // The web shows "HR" when there is no reviewer (HR-issued letters).
                { title: 'Approved By', width: 130, render: r => r.reviewer?.name ?? 'HR' },
                { title: 'Review Notes', width: 130, render: r => dash(r.review_notes) },
                {
                  title: 'File', width: 120, render: r => r.file_url
                    ? <Text style={s.link} onPress={() => Linking.openURL(r.file_url)}>View Document</Text>
                    : <Text style={s.td}>N/A</Text>,
                },
              ]}
            />
          </Card>
        );
    }
  };

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
        <ActivityIndicator size="large" style={s.spinner} color={R} />
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
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); setReloadKey(k => k + 1); load(); }}
              colors={[R]}
            />
          }
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
            {TABS.map(t => {
              const active = t.key === tab;
              return (
                <TouchableOpacity key={t.key} style={[s.tab, active && s.tabActive]} onPress={() => setTab(t.key)}>
                  <Icon name={t.icon} size={14} color={active ? '#FFF' : '#444'} />
                  <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {renderTab()}
        </ScrollView>
      )}
    </>
  );
};

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  content:      { padding: 12, paddingBottom: 32 },
  spinner:      { marginTop: 60 },
  inlineSpinner:{ marginVertical: 20 },
  flex1:        { flex: 1 },
  gap:          { height: 12 },
  hero:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1, borderLeftWidth: 3, borderLeftColor: R },
  heroTop:      { flexDirection: 'row', gap: 12 },
  avatar:       { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F5F7FA' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  heroName:     { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  heroSub:      { fontSize: 11, color: '#888', marginTop: 3, lineHeight: 15 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 },
  chip:         { backgroundColor: '#F0F0F0', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:     { fontSize: 12, color: '#444', fontWeight: '500' },
  tabs:         { gap: 8, paddingBottom: 12 },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, elevation: 1 },
  tabActive:    { backgroundColor: R },
  tabText:      { fontSize: 12, color: '#444', fontWeight: '600' },
  tabTextActive:{ color: '#FFF' },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  cardHead:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: R },
  cardSub:      { fontSize: 11, color: '#888', marginTop: 2 },
  subHead:      { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginTop: 14, marginBottom: 6 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  infoLabel:    { fontSize: 12, color: '#888' },
  infoValue:    { fontSize: 13, color: '#1A1A1A', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  totalLabel:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  totalValue:   { fontSize: 14, fontWeight: '800', color: R },
  dutyGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dutyCell:     { backgroundColor: '#F5F7FA', borderRadius: 8, padding: 8, width: '48%' },
  dutyDay:      { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  dutyTime:     { fontSize: 11, color: '#555', marginTop: 2 },
  monthRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthText:    { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  twoCol:       { flexDirection: 'row', gap: 10 },
  field:        { marginBottom: 10 },
  label:        { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FFF' },
  inputLocked:  { backgroundColor: '#F0F0F0' },
  inputText:    { fontSize: 13, color: '#1A1A1A' },
  inputMulti:   { minHeight: 60, textAlignVertical: 'top' },
  iosDone:      { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 10 },
  iosDoneText:  { color: R, fontWeight: '700', fontSize: 15 },
  errText:      { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  successText:  { color: '#2E7D32', fontSize: 13, marginBottom: 8, fontWeight: '500' },
  saveBtn:      { backgroundColor: R, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  darkBtn:      { backgroundColor: '#1A1A1A', borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  btnDisabled:  { opacity: 0.6 },
  btnText:      { color: '#FFF', fontWeight: '700', fontSize: 13 },
  smallBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1A1A', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { color: '#FFF', fontWeight: '700', fontSize: 11 },
  thead:        { flexDirection: 'row', backgroundColor: R, paddingVertical: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  th:           { color: '#FFF', fontWeight: '700', fontSize: 12, paddingHorizontal: 6 },
  tr:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt:        { backgroundColor: '#FAFAFA' },
  td:           { fontSize: 12, color: '#333', paddingHorizontal: 6 },
  tdBox:        { paddingHorizontal: 6 },
  link:         { fontSize: 12, color: R, fontWeight: '600' },
  pagination:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 },
  pageBtn:      { padding: 6, borderRadius: 6, backgroundColor: '#FFF0F0' },
  pageBtnDisabled: { backgroundColor: '#F5F5F5' },
  pageText:     { fontSize: 13, color: '#444', fontWeight: '600' },
  badge:        { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', alignSelf: 'flex-start' },
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
