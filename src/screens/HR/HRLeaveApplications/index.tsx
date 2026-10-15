// HR › Leave Management › Leave Application — the app's mirror of the web's
// /leave-application page for the HR login (HAR + bundle main.828f47c7.js,
// 2026-10-15). Not the personal LeaveApplications screen, which only shows the
// signed-in user's own leave.
//
// Web behaviour reproduced:
//   - Add Leave/Absent for any staff member: Branch, Staff, Type of Absence
//     (Absent | Leave); Leave adds Leave Type (Medical | Casual | Annual) and
//     Category (Half | Full). Half locks From/To to today and counts 0.5;
//     otherwise days = To − From + 1. Saved as Pending, after the web's checks:
//       Absent: is-exist (409 "Already Exist!") → store
//       Leave:  eligibility (409 "User Not Eligible!") → is-exist →
//               availability (409 "Leave Not Available!") → store
//   - View Leave/Absent: Start/End date (default today), Staff, Type of
//     Absence, Application Status; 25 a page, server-paged.
//   - Approve / Reject / Delete only while Pending. Approving a "Leave" first
//     runs the availability check (409 = "Leave Not Available").
//   - PDF: the rows on screen as Leave_Applications.pdf (utils/leaveApplicationsPdf).
// Not mirrored: the per-row "Download" letter on approved applications.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal, Pressable, Platform, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import StaffNameCell from '../../../components/StaffNameCell';
import { RootState } from '../../../redux/store';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import api from '../../../api/service';
import {
  getBranchesNameList, getStaffNamesForBranch, addStaffLeave, checkLeaveAvailability,
  checkLeaveExists, checkLeaveEligibility,
  approveLeaveApplication, rejectLeaveApplication, deleteLeaveApplication,
} from '../../../api/employeeDashboard';
import { downloadLeaveApplicationsPdf } from '../../../utils/leaveApplicationsPdf';

const PAGE_SIZE = 25;

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseIso = (iso?: string | null): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** DD-MM-YYYY, as the web's table prints dates. */
const fmtDMY = (iso?: string) => {
  const d = parseIso(iso);
  return d ? `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` : 'N/A';
};

/** The web's day count: To − From + 1, at least 1; a Half day is 0.5. */
const daysBetween = (from: Date, to: Date, half: boolean) =>
  half ? 0.5 : Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);

const STATUS_COLORS: Record<string, string> = { Pending: '#F0AD2B', Approved: '#2E7D32', Rejected: '#E63946' };

type Option = { id: string; label: string };

const ABSENCE_TYPES: Option[] = [{ id: 'Absent', label: 'Absent' }, { id: 'Leave', label: 'Leave' }];
const LEAVE_TYPES: Option[] = ['Medical', 'Casual', 'Annual'].map(t => ({ id: t, label: t }));
const CATEGORIES: Option[] = [{ id: 'Half', label: 'Half' }, { id: 'Full', label: 'Full' }];
const APP_STATUSES: Option[] = [
  { id: '', label: 'All' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Rejected', label: 'Rejected' },
];

// ── Small inputs ──────────────────────────────────────────────────────────────

type Picker = { title: string; options: Option[]; selected: string; onPick: (o: Option) => void };

const PickerModal = ({ picker, onClose }: { picker: Picker | null; onClose: () => void }) => (
  <Modal visible={!!picker} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{picker?.title}</Text>
        <ScrollView style={{ maxHeight: 420 }}>
          {picker?.options.map(opt => {
            const on = picker.selected === opt.id;
            return (
              <TouchableOpacity
                key={opt.id || 'all'}
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

const Field = ({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.req}> *</Text> : null}</Text>
    {children}
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
  </View>
);

const SelectBox = ({ text, placeholder, onPress, disabled }: { text?: string; placeholder: string; onPress: () => void; disabled?: boolean }) => (
  <TouchableOpacity style={[styles.input, disabled && styles.inputDisabled]} onPress={onPress} disabled={disabled}>
    <Text style={[styles.inputText, !text && styles.placeholder]} numberOfLines={1}>{text || placeholder}</Text>
    <Icon name="chevron-down" size={16} color="#666" />
  </TouchableOpacity>
);

/** Date box; Android shows the system dialog, iOS a sheet with Done. */
const DateBox = ({ value, onChange, disabled }: { value: Date; onChange: (d: Date) => void; disabled?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <>
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        disabled={disabled}
        onPress={() => { setDraft(value); setOpen(true); }}
      >
        <Text style={styles.inputText}>{fmtDMY(fmtDate(value))}</Text>
        <Icon name="calendar" size={16} color="#666" />
      </TouchableOpacity>
      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={value}
          mode="date"
          onChange={(e, d) => { setOpen(false); if (e.type === 'set' && d) onChange(d); }}
        />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
            <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
              <DateTimePicker value={draft} mode="date" display="inline" onChange={(_, d) => d && setDraft(d)} />
              <TouchableOpacity style={styles.primaryBtn} onPress={() => { onChange(draft); setOpen(false); }}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  branch: null as Option | null,
  staff: null as Option | null,
  leaveStatus: '' as '' | 'Leave' | 'Absent',
  leaveType: '',
  category: '' as '' | 'Half' | 'Full',
  from: new Date(),
  to: new Date(),
  reason: '',
};

const HRLeaveApplications = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.user);
  const notify = (message: string, type: 'success' | 'error') => dispatch(showSnackbar({ message, type }));

  // A branch-pinned login only sees its own branch, as everywhere else.
  const ownBranchId = profile?.branchId ? Number(profile.branchId) : undefined;

  const [branches, setBranches] = useState<Option[]>([]);
  const [staff, setStaff] = useState<{ id: string; label: string; branch_id: number }[]>([]);
  const [picker, setPicker] = useState<Picker | null>(null);

  // ── Add form ──
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm(f => ({ ...f, ...patch }));
  const half = form.leaveStatus === 'Leave' && form.category === 'Half';
  const days = daysBetween(form.from, form.to, half);

  // ── List ──
  const [filters, setFilters] = useState({
    start: new Date(), end: new Date(), staff: null as Option | null, leaveStatus: '', appStatus: '',
  });
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const exportPdf = async () => {
    setExporting(true);
    try {
      await downloadLeaveApplicationsPdf(rows, (page - 1) * PAGE_SIZE, navigation);
    } catch {
      notify('Could not create the PDF.', 'error');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    getBranchesNameList()
      .then(res => setBranches(
        (res?.data ?? [])
          .filter((b: any) => ownBranchId === undefined || Number(b.id) === ownBranchId)
          .map((b: any) => ({ id: String(b.id), label: b.name })),
      ))
      .catch(() => {});
    // /v1/auth/get-name with an empty branch returns every branch's staff.
    getStaffNamesForBranch({ branch_id: ownBranchId ?? '' })
      .then(res => setStaff(
        (res?.data ?? [])
          .filter((s: any) => ownBranchId === undefined || Number(s.branch_id) === ownBranchId)
          .map((s: any) => ({
            id: String(s.id),
            label: [s.first_name, s.last_name].filter(Boolean).join(' '),
            branch_id: Number(s.branch_id),
          })),
      ))
      .catch(() => {});
  }, [ownBranchId]);

  const load = useCallback(async (p = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/v1/hr/leave-application/index', {
        params: {
          branch_id: ownBranchId ?? '',
          user_id: filters.staff?.id ?? '',
          leave_status: filters.leaveStatus,
          application_status: filters.appStatus,
          start_date: fmtDate(filters.start),
          end_date: fmtDate(filters.end),
          limit: PAGE_SIZE,
          page: p,
        },
      });
      const list: any[] = Array.isArray(res.data?.data) ? res.data.data : [];
      setRows(ownBranchId === undefined ? list : list.filter(r => Number(r.branch_id) === ownBranchId));
      setPages(Math.max(1, Number(res.data?.pagination?.total_pages) || 1));
      setTotal(Number(res.data?.pagination?.total_record) || list.length);
      setPage(p);
    } catch {
      // 404 is the API's "No record found".
      setRows([]); setPages(1); setTotal(0); setPage(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, ownBranchId]);

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Half day: the web pins From and To to today.
  useEffect(() => {
    if (half) set({ from: new Date(), to: new Date() });
  }, [half]);

  const staffOptions = useMemo(
    () => staff.filter(s => !form.branch || String(s.branch_id) === form.branch.id),
    [staff, form.branch],
  );

  // ── Add ──
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.branch) e.branch = 'Branch is required';
    if (!form.staff) e.staff = 'Staff is required';
    if (!form.leaveStatus) e.leaveStatus = 'Leave Status is required';
    if (form.leaveStatus === 'Leave' && !form.leaveType) e.leaveType = 'Leave Type is required';
    if (form.leaveStatus === 'Leave' && !form.category) e.category = 'Category is required';
    if (fmtDate(form.from) > fmtDate(form.to)) e.to = 'End date should be greater than start date!';
    setErrors(e);
    if (Object.keys(e).length) return;

    const isLeave = form.leaveStatus === 'Leave';
    const userId = Number(form.staff!.id);
    const from = fmtDate(form.from);
    const to = fmtDate(form.to);
    setSaving(true);
    // The web's pre-checks, each a 409 when it fails.
    const check = async (fn: () => Promise<any>, conflict: string) => {
      try {
        await fn();
        return true;
      } catch (err: any) {
        const st = err?.response?.status;
        notify(st === 409 ? conflict : st === 400 || st === 500 ? 'Unprocessable content!' : 'Could not verify the leave.', 'error');
        return false;
      }
    };
    try {
      if (isLeave && !(await check(() => checkLeaveEligibility({ user_id: userId, date: from }), 'User Not Eligible!'))) return;
      if (!(await check(() => checkLeaveExists({
        user_id: userId, from, to, leave_type: isLeave ? form.leaveType : '', number_of_leaves: days,
      }), 'Already Exist!'))) return;
      if (isLeave && !(await check(() => checkLeaveAvailability({
        user_id: userId, leave_type: form.leaveType, number_of_leaves: days,
      }), 'Leave Not Available!'))) return;

      const res = await addStaffLeave({
        branch_id: Number(form.branch!.id),
        user_id: userId,
        leave_status: form.leaveStatus as 'Leave' | 'Absent',
        leave_type: isLeave ? form.leaveType : null,
        category: isLeave ? (form.category as 'Half' | 'Full') : null,
        from,
        to,
        number_of_leaves: days,
        reason: form.reason.trim(),
      });
      if (res.status === 201 || res.status === 200) {
        notify('Added Successfully!', 'success');
        setForm({ ...EMPTY_FORM, from: new Date(), to: new Date() });
        load(page);
      }
    } catch (err: any) {
      const m = err?.response?.data?.messages ?? err?.response?.data?.message ?? 'Unable to add leave application.';
      notify(typeof m === 'object' ? Object.values(m).flat().join(' ') : String(m), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Row actions (Pending only, as on the web) ──
  const run = async (row: any, action: 'approve' | 'reject' | 'delete') => {
    setBusyId(row.id);
    const today = fmtDate(new Date());
    try {
      if (action === 'approve') {
        if (row.leave_status === 'Leave') {
          try {
            await checkLeaveAvailability({
              number_of_leaves: row.number_of_leaves,
              leave_type: row.leave_type,
              user_id: row.user_id ?? row.user_info?.id,
            });
          } catch (err: any) {
            notify(err?.response?.status === 409 ? 'Leave Not Available!' : 'Could not check leave availability.', 'error');
            return;
          }
        }
        await approveLeaveApplication(row.id, today);
        notify('Approved Successfully!', 'success');
      } else if (action === 'reject') {
        await rejectLeaveApplication(row.id, today);
        notify('Rejected Successfully!', 'success');
      } else {
        await deleteLeaveApplication(row.id);
        notify('Deleted Successfully!', 'success');
      }
      load(page);
    } catch (err: any) {
      notify(err?.response?.status === 500 ? 'Internal Server Error' : 'Action failed. Please try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirm = (row: any, action: 'approve' | 'reject' | 'delete') => {
    const verb = { approve: 'Approve', reject: 'Reject', delete: 'Delete' }[action];
    Alert.alert(
      `${verb} ${row.leave_status === 'Absent' ? 'absence' : 'leave'}?`,
      `${row.user_info?.name ?? 'This employee'} · ${fmtDMY(row.from)} to ${fmtDMY(row.to)} (${row.number_of_leaves})`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: verb, style: action === 'approve' ? 'default' : 'destructive', onPress: () => run(row, action) },
      ],
    );
  };

  const open = (p: Picker) => setPicker(p);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Leave Application"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <PickerModal picker={picker} onClose={() => setPicker(null)} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(page, true)} colors={['#E63946']} />}
      >
        {/* ── Add Leave/Absent ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Leave/Absent</Text>
          <Text style={styles.cardNote}>Fields marked * are required.</Text>

          <Field label="Branch Name" required error={errors.branch}>
            <SelectBox
              text={form.branch?.label}
              placeholder="Select Branch"
              onPress={() => open({
                title: 'Select Branch', options: branches, selected: form.branch?.id ?? '',
                onPick: o => set({ branch: o, staff: form.staff && staff.find(s => s.id === form.staff!.id)?.branch_id === Number(o.id) ? form.staff : null }),
              })}
            />
          </Field>

          <Field label="Available Staff" required error={errors.staff}>
            <SelectBox
              text={form.staff?.label}
              placeholder="Select Name"
              onPress={() => open({
                title: 'Select Staff', options: staffOptions, selected: form.staff?.id ?? '',
                // Picking someone sets their branch, as on the web.
                onPick: o => {
                  const b = staff.find(s => s.id === o.id)?.branch_id;
                  set({ staff: o, branch: branches.find(x => Number(x.id) === b) ?? form.branch });
                },
              })}
            />
          </Field>

          <Field label="Type of Absence" required error={errors.leaveStatus}>
            <SelectBox
              text={form.leaveStatus}
              placeholder="Select Type"
              onPress={() => open({
                title: 'Type of Absence', options: ABSENCE_TYPES, selected: form.leaveStatus,
                onPick: o => set({ leaveStatus: o.id as 'Leave' | 'Absent', leaveType: '', category: '' }),
              })}
            />
          </Field>

          {form.leaveStatus === 'Leave' && (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Leave Type" required error={errors.leaveType}>
                  <SelectBox
                    text={form.leaveType}
                    placeholder="Select Leave Type"
                    onPress={() => open({
                      title: 'Leave Type', options: LEAVE_TYPES, selected: form.leaveType,
                      onPick: o => set({ leaveType: o.id }),
                    })}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Category" required error={errors.category}>
                  <SelectBox
                    text={form.category}
                    placeholder="Select Type"
                    onPress={() => open({
                      title: 'Category', options: CATEGORIES, selected: form.category,
                      onPick: o => set({ category: o.id as 'Half' | 'Full' }),
                    })}
                  />
                </Field>
              </View>
            </View>
          )}

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="From" required>
                <DateBox value={form.from} disabled={half} onChange={d => set({ from: d })} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="To" required error={errors.to}>
                <DateBox value={form.to} disabled={half} onChange={d => set({ to: d })} />
              </Field>
            </View>
          </View>

          <Field label="No. Of Leaves/Absent" required>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.inputText}>{days}</Text>
            </View>
          </Field>

          <Field label="Reason">
            <TextInput
              style={[styles.input, styles.textInput]}
              placeholder="Enter Reason"
              placeholderTextColor="#9CA3AF"
              value={form.reason}
              onChangeText={t => set({ reason: t })}
            />
          </Field>

          <TouchableOpacity style={[styles.primaryBtn, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Add</Text>}
          </TouchableOpacity>
        </View>

        {/* ── View Leave/Absent ────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>View Leave/Absent</Text>
          <View style={[styles.row, { marginTop: 8 }]}>
            <View style={{ flex: 1 }}>
              <Field label="Start date">
                <DateBox value={filters.start} onChange={d => setFilters(f => ({ ...f, start: d }))} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="End date">
                <DateBox value={filters.end} onChange={d => setFilters(f => ({ ...f, end: d }))} />
              </Field>
            </View>
          </View>
          <Field label="Available Staff">
            <SelectBox
              text={filters.staff?.label}
              placeholder="All staff"
              onPress={() => open({
                title: 'Available Staff', options: [{ id: '', label: 'All staff' }, ...staff], selected: filters.staff?.id ?? '',
                onPick: o => setFilters(f => ({ ...f, staff: o.id ? o : null })),
              })}
            />
          </Field>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Type of Absence">
                <SelectBox
                  text={filters.leaveStatus || 'All'}
                  placeholder="All"
                  onPress={() => open({
                    title: 'Type of Absence', options: [{ id: '', label: 'All' }, ...ABSENCE_TYPES], selected: filters.leaveStatus,
                    onPick: o => setFilters(f => ({ ...f, leaveStatus: o.id })),
                  })}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Application Status">
                <SelectBox
                  text={filters.appStatus || 'All'}
                  placeholder="All"
                  onPress={() => open({
                    title: 'Application Status', options: APP_STATUSES, selected: filters.appStatus,
                    onPick: o => setFilters(f => ({ ...f, appStatus: o.id })),
                  })}
                />
              </Field>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => load(1)}>
            <Text style={styles.primaryBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHead}>
          <Text style={styles.countText}>{total} record{total === 1 ? '' : 's'}</Text>
          <TouchableOpacity
            style={[styles.pdfBtn, (exporting || loading) && { opacity: 0.6 }]}
            onPress={exportPdf}
            disabled={exporting || loading}
          >
            {exporting
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Icon name="file-pdf-box" size={16} color="#fff" /><Text style={styles.pdfText}>PDF</Text></>}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 30 }} />
        ) : rows.length === 0 ? (
          <View style={[styles.card, styles.empty]}>
            <Icon name="calendar-remove" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No record found</Text>
          </View>
        ) : rows.map((r, i) => {
          const pending = r.application_status === 'Pending';
          const busy = busyId === r.id;
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.rowHead}>
                <Text style={styles.sr}>{(page - 1) * PAGE_SIZE + i + 1}.</Text>
                <StaffNameCell name={r.user_info?.name} staffId={r.user_info?.id ?? r.user_id} style={styles.name} />
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[r.application_status] ?? '#2E7D32' }]}>
                  <Text style={styles.badgeText}>{r.application_status}</Text>
                </View>
              </View>
              <View style={styles.meta}>
                {([
                  ['Leave Status', r.leave_status],
                  ['Leave Type', r.leave_type || 'N/A'],
                  ['Category', r.category || 'N/A'],
                  ['From', fmtDMY(r.from)],
                  ['To', fmtDMY(r.to)],
                  ['No. Of Leaves', r.number_of_leaves],
                  ['Branch', r.branch_info?.name ?? 'N/A'],
                ] as const).map(([k, v]) => (
                  <View key={k} style={styles.metaCell}>
                    <Text style={styles.metaLabel}>{k}</Text>
                    <Text style={styles.metaValue}>{String(v ?? 'N/A')}</Text>
                  </View>
                ))}
              </View>
              {!!r.reason && <Text style={styles.reason}>“{r.reason}”</Text>}
              {pending && (
                <View style={styles.actions}>
                  {busy ? <ActivityIndicator color="#E63946" /> : (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, { borderColor: '#2E7D32' }]} onPress={() => confirm(r, 'approve')}>
                        <Icon name="check-circle-outline" size={16} color="#2E7D32" />
                        <Text style={[styles.actionText, { color: '#2E7D32' }]}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { borderColor: '#E63946' }]} onPress={() => confirm(r, 'reject')}>
                        <Icon name="close-circle-outline" size={16} color="#E63946" />
                        <Text style={[styles.actionText, { color: '#E63946' }]}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { borderColor: '#E63946' }]} onPress={() => confirm(r, 'delete')}>
                        <Icon name="trash-can-outline" size={16} color="#E63946" />
                        <Text style={[styles.actionText, { color: '#E63946' }]}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {pages > 1 && (
          <View style={styles.pager}>
            <TouchableOpacity style={[styles.pageBtn, page <= 1 && styles.pageBtnOff]} disabled={page <= 1} onPress={() => load(page - 1)}>
              <Icon name="chevron-left" size={18} color={page <= 1 ? '#CBD5E1' : '#334155'} />
            </TouchableOpacity>
            <Text style={styles.pageText}>Page {page} of {pages}</Text>
            <TouchableOpacity style={[styles.pageBtn, page >= pages && styles.pageBtnOff]} disabled={page >= pages} onPress={() => load(page + 1)}>
              <Icon name="chevron-right" size={18} color={page >= pages ? '#CBD5E1' : '#334155'} />
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const shadow = { elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll: { padding: 14, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, ...shadow },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  cardNote: { fontSize: 11, color: '#888', marginTop: 3, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },

  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 5 },
  req: { color: '#E63946' },
  fieldError: { fontSize: 11, color: '#E63946', marginTop: 3 },
  input: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
  },
  inputDisabled: { backgroundColor: '#EEEEEE' },
  inputText: { flex: 1, fontSize: 13, color: '#333' },
  textInput: { fontSize: 13, color: '#333' },
  placeholder: { color: '#9CA3AF' },
  primaryBtn: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  countText: { fontSize: 12, color: '#888', marginLeft: 2 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, minWidth: 70, justifyContent: 'center' },
  pdfText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sr: { fontSize: 13, color: '#888', fontWeight: '600' },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: '#E63946' },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaCell: { width: '31.5%', backgroundColor: '#F5F6FA', borderRadius: 8, padding: 8 },
  metaLabel: { fontSize: 10, color: '#888' },
  metaValue: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  reason: { fontSize: 12, color: '#555', marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, minHeight: 32, alignItems: 'center' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingVertical: 7 },
  actionText: { fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { fontSize: 13, color: '#aaa' },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 4 },
  pageBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pageBtnOff: { backgroundColor: '#F8FAFC' },
  pageText: { fontSize: 13, color: '#334155', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 16, textAlign: 'center' },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#eee', backgroundColor: '#FAFAFA',
  },
  modalOptionSelected: { borderColor: '#E63946', backgroundColor: '#FFF5F5' },
  modalOptionText: { fontSize: 15, color: '#333' },
});

export default HRLeaveApplications;
