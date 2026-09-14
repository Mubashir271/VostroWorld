// src/screens/HR/PTAttendance/index.tsx
//
// HR › Manage Staff › Pt Attendance — mirrors the web admin's /pt-attendance
// page (see the "PT Attendance" block in api/employeeDashboard.ts).
//
//  • Add Session Attendance: Branch → Trainer → Package (per trainer) → Time
//    (trainer schedule for that package) → Trainer / Client Attendance → Date.
//    Picking a package runs the web's "attendance is complete" check; saving
//    runs its "client was not present" confirm and duplicate check first.
//  • Active / Inactive Session Attendance: server-paginated 25 per page, with
//    the web's Filter By Trainer / Filter By Package on the active table.
//  • Row actions: Update (web allows Admin, Super Admin, Fitness Manager only)
//    and Inactive on active rows; Active and Delete on inactive rows.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import ClientNameCell from '../../../components/ClientNameCell';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootState } from '../../../redux/store';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import { isAdmin, isFitnessManager } from '../../../config/permissions';
import {
  getBranchesNameList, getSessionAttendancePage, getTrainerNameList,
  getTrainerPackageOrders, isSessionAttendanceOpen, getTrainerScheduleForOrder,
  isSessionAttendanceFree, addSessionAttendance, updateSessionAttendance,
  getSessionAttendanceInfo, setSessionAttendanceStatus,
  SessionAttendanceRow, TrainerPackageOrder,
} from '../../../api/employeeDashboard';

type Option = { label: string; value: string };

// Web's option lists: the Add form offers Contacted / Cancel / No Show for both
// columns (trainer defaults to Contacted); the Update page offers Delivered /
// Cancel / No Show.
const ADD_STATUSES = ['Contacted', 'Cancel', 'No Show'];
const UPDATE_STATUSES = ['Delivered', 'Cancel', 'No Show'];
const PAGE_SIZE = 25;

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseDate = (s: string) => {
  const [y, m, d] = (s ?? '').split('-').map(Number);
  return y ? new Date(y, m - 1, d) : new Date();
};
const dmy = (s: string) => { const [y, m, d] = (s ?? '').split('-'); return d ? `${d}-${m}-${y}` : '-'; };

const Dropdown = ({ label, options, value, onChange, disabled }: {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const sel = options.find(o => o.value === value)?.label ?? label;
  return (
    <View>
      <TouchableOpacity
        style={[styles.selectBtn, disabled && styles.selectBtnDisabled]}
        onPress={() => !disabled && setOpen(v => !v)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.selectBtnText, !value && { color: '#bbb' }]} numberOfLines={1}>{sel}</Text>
        {!disabled && <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />}
      </TouchableOpacity>
      {open && (
        <View style={styles.inlineDropdown}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled">
            {options.length === 0 ? (
              <Text style={styles.dropdownEmpty}>No options</Text>
            ) : options.map(opt => (
              <TouchableOpacity key={opt.value || '__all'} style={styles.dropdownItem} onPress={() => { onChange(opt.value); setOpen(false); }}>
                <Text style={[styles.dropdownText, value === opt.value && styles.dropdownSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// Windowed so a 2,000+ page table renders a handful of buttons, not thousands.
const Pagination = ({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (n: number) => void }) => {
  const pages = useMemo(() => {
    const RANGE = 7;
    let start = Math.max(1, page - Math.floor(RANGE / 2));
    const end = Math.min(totalPages, start + RANGE - 1);
    start = Math.max(1, Math.min(start, end - RANGE + 1));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);
  if (totalPages <= 1) return null;
  return (
    <View style={styles.pagination}>
      <TouchableOpacity disabled={page === 1} onPress={() => onChange(1)}>
        <Text style={[styles.pageEdgeText, page === 1 && styles.pageDisabledText]}>First Page</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={page === 1} onPress={() => onChange(Math.max(1, page - 1))}>
        <Text style={[styles.pageArrow, page === 1 && styles.pageDisabledText]}>‹</Text>
      </TouchableOpacity>
      {pages.map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
          <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity disabled={page === totalPages} onPress={() => onChange(Math.min(totalPages, page + 1))}>
        <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabledText]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={page === totalPages} onPress={() => onChange(totalPages)}>
        <Text style={[styles.pageEdgeText, page === totalPages && styles.pageDisabledText]}>Last Page</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Add / Update form ─────────────────────────────────────────────────────────

type FormValues = {
  branchId: string;
  trainerId: string;
  orderId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  scheduleId: string;
  trainerStatus: string;
  clientStatus: string;
  date: Date;
};

const blankForm = (branchId: string): FormValues => ({
  branchId, trainerId: '', orderId: '', clientId: '', clientName: '', clientEmail: '',
  scheduleId: '', trainerStatus: 'Contacted', clientStatus: '', date: new Date(),
});

const SessionForm = ({
  mode, initial, branchOptions, branchLocked, onSaved, onCancel,
}: {
  mode: 'add' | 'update';
  initial: FormValues & { id?: number };
  branchOptions: Option[];
  branchLocked: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}) => {
  const dispatch = useDispatch();
  const [v, setV] = useState<FormValues>(initial);
  const [trainers, setTrainers] = useState<Option[]>([]);
  const [orders, setOrders] = useState<TrainerPackageOrder[]>([]);
  const [schedules, setSchedules] = useState<{ id: string; label: string }[]>([]);
  const [completeError, setCompleteError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const statuses = mode === 'add' ? ADD_STATUSES : UPDATE_STATUSES;
  const patch = (p: Partial<FormValues>) => setV(prev => ({ ...prev, ...p }));

  useEffect(() => { setV(initial); }, [initial]);

  // Trainers for the chosen branch ('' lists every branch, as the web does).
  useEffect(() => {
    let cancelled = false;
    getTrainerNameList(v.branchId)
      .then(list => {
        if (!cancelled) setTrainers(list.map(t => ({ label: `${t.first_name} ${t.last_name}`.trim(), value: String(t.id) })));
      })
      .catch(() => { if (!cancelled) setTrainers([]); });
    return () => { cancelled = true; };
  }, [v.branchId]);

  const loadSchedule = useCallback(async (orderId: string, trainerId: string) => {
    setSchedules([]);
    setCompleteError('');
    if (!orderId) return;
    try {
      if (!(await isSessionAttendanceOpen(orderId))) {
        setCompleteError('Attendance is complete');
        Alert.alert('Error!', 'Attendance is complete');
      }
    } catch {}
    try {
      setSchedules(await getTrainerScheduleForOrder(orderId, trainerId));
    } catch {
      setSchedules([]);
    }
  }, []);

  // Packages for the chosen trainer.
  useEffect(() => {
    let cancelled = false;
    if (!v.trainerId) { setOrders([]); return; }
    getTrainerPackageOrders(v.trainerId)
      .then(list => { if (!cancelled) setOrders(list); })
      .catch(() => { if (!cancelled) setOrders([]); });
    return () => { cancelled = true; };
  }, [v.trainerId]);

  // Update mode starts on an existing package — load its checks once.
  useEffect(() => {
    if (mode === 'update' && initial.orderId && initial.trainerId) {
      loadSchedule(initial.orderId, initial.trainerId);
    }
  }, [mode, initial, loadSchedule]);

  const onSelectTrainer = (trainerId: string) => {
    patch({ trainerId, orderId: '', clientId: '', clientName: '', clientEmail: '', scheduleId: '' });
    setSchedules([]);
    setCompleteError('');
  };

  const onSelectOrder = (orderId: string) => {
    const o = orders.find(x => String(x.order_id) === orderId);
    patch({
      orderId, scheduleId: '',
      clientId: o ? String(o.client_id) : '',
      clientName: o?.client_name ?? '',
      clientEmail: o?.client_email ?? '',
    });
    loadSchedule(orderId, v.trainerId);
  };

  const confirmClientAbsent = () => new Promise<boolean>(resolve => {
    const conducted = v.trainerStatus === 'Delivered';
    const absent = ['No Show', 'Cancel', 'Canceled'].includes(v.clientStatus);
    if (!(conducted && absent)) { resolve(true); return; }
    Alert.alert(
      'Client was not present',
      'Client was not present. Please confirm why you are marking this session as conducted.',
      [
        { text: 'Go back', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Yes, save anyway', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });

  const submit = async () => {
    const missing =
      (!v.branchId && 'Branch Name') ||
      (!v.trainerId && 'Trainer') ||
      (!v.orderId && 'Package') ||
      // The web always requires Time, but most packages have no trainer
      // schedule (verified on prod), which would block saving entirely — so
      // it is required only when the package actually offers times.
      (schedules.length > 0 && !v.scheduleId && 'Time') ||
      (!v.trainerStatus && 'Trainer Attendance') ||
      (!v.clientStatus && 'Client Attendance');
    if (missing) {
      dispatch(showSnackbar({ message: `${missing} is required`, type: 'error' }));
      return;
    }
    if (completeError) {
      Alert.alert('Error!', completeError);
      return;
    }
    if (!(await confirmClientAbsent())) return;

    const payload = {
      branch_id: v.branchId,
      trainer_id: v.trainerId,
      order_id: v.orderId,
      client_id: v.clientId,
      staff_status: v.trainerStatus,
      client_status: v.clientStatus,
      client_name: v.clientName,
      email: v.clientEmail,
      date: fmtDate(v.date),
      trainer_schedule_id: v.scheduleId,
    };

    setSaving(true);
    try {
      const free = await isSessionAttendanceFree(
        { trainer_id: v.trainerId, order_id: v.orderId, date: payload.date },
        mode === 'update' ? initial.id : undefined,
      );
      if (!free) {
        Alert.alert('Error!', 'Already Exists.');
        return;
      }
      if (mode === 'add') {
        await addSessionAttendance(payload);
        dispatch(showSnackbar({ message: 'Added Successfully!', type: 'success' }));
        setV(blankForm(initial.branchId));
        setOrders([]);
        setSchedules([]);
      } else {
        await updateSessionAttendance(initial.id!, payload);
        dispatch(showSnackbar({ message: 'Updated Successfully!', type: 'success' }));
      }
      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      dispatch(showSnackbar({
        message: typeof msg === 'string' ? msg : mode === 'add' ? 'Failed to add session' : 'Failed to update session',
        type: 'error',
      }));
    } finally {
      setSaving(false);
    }
  };

  const orderOptions = orders.map(o => ({ label: `${o.package_name} for ${o.client_name}`, value: String(o.order_id) }));
  const statusOptions = statuses.map(s => ({ label: s, value: s }));

  return (
    <View style={mode === 'add' ? styles.formCard : styles.editCard}>
      <Text style={styles.formTitle}>{mode === 'add' ? 'Add Session Attendance' : `Update Session Attendance #${initial.id}`}</Text>

      <Text style={styles.fieldLabel}>Branch Name *</Text>
      <Dropdown
        label="Select Branch"
        options={branchOptions}
        value={v.branchId}
        onChange={branchId => { patch({ branchId }); onSelectTrainer(''); }}
        disabled={branchLocked}
      />

      <Text style={styles.fieldLabel}>Trainer *</Text>
      <Dropdown label="Select Name" options={trainers} value={v.trainerId} onChange={onSelectTrainer} />

      <Text style={styles.fieldLabel}>Package *</Text>
      <Dropdown label="Select Package" options={orderOptions} value={v.orderId} onChange={onSelectOrder} />

      <Text style={styles.fieldLabel}>Time{schedules.length > 0 ? ' *' : ''}</Text>
      <Dropdown
        label={v.orderId && schedules.length === 0 ? 'No schedule for this package' : 'Select Time'}
        options={schedules.map(s => ({ label: s.label, value: s.id }))}
        value={v.scheduleId}
        onChange={scheduleId => patch({ scheduleId })}
      />

      <Text style={styles.fieldLabel}>Trainer Attendance *</Text>
      <Dropdown label="Select Trainer Attendance" options={statusOptions} value={v.trainerStatus} onChange={trainerStatus => patch({ trainerStatus })} />

      <Text style={styles.fieldLabel}>Client Attendance *</Text>
      <Dropdown label="Select Client Attendance" options={statusOptions} value={v.clientStatus} onChange={clientStatus => patch({ clientStatus })} />

      <Text style={styles.fieldLabel}>Date *</Text>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDatePicker(true)}>
        <Icon name="calendar" size={14} color="#555" />
        <Text style={styles.selectBtnText}>{fmtDate(v.date)}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={v.date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowDatePicker(false); if (d) patch({ date: d }); }}
        />
      )}

      {!!completeError && <Text style={styles.errorText}>{completeError}</Text>}

      <View style={styles.editBtnRow}>
        <TouchableOpacity style={[styles.addBtn, { flex: 1 }, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>{mode === 'add' ? 'Add' : 'Update'}</Text>}
        </TouchableOpacity>
        {onCancel && (
          <TouchableOpacity style={[styles.addBtn, { flex: 1, marginLeft: 8, backgroundColor: '#888' }]} onPress={onCancel} disabled={saving}>
            <Text style={styles.addBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────

const PTAttendance = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.user);

  // Branch-scoped logins stay on their own branch; HR / super admin ('' branch)
  // see and choose every branch, like the web.
  const ownBranch = profile?.branchId ? String(profile.branchId) : '';
  const canUpdate = isAdmin(profile?.role) || isFitnessManager(profile?.role);

  const [branchOptions, setBranchOptions] = useState<Option[]>(
    ownBranch ? [{ label: profile?.branchName ?? 'My Branch', value: ownBranch }] : [],
  );
  const [filterTrainers, setFilterTrainers] = useState<Option[]>([]);
  const [filterOrders, setFilterOrders] = useState<Option[]>([]);

  const [filterTrainerId, setFilterTrainerId] = useState('');
  const [filterOrderId, setFilterOrderId] = useState('');

  const [active, setActive] = useState<SessionAttendanceRow[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  const [activeTotal, setActiveTotal] = useState(0);
  const [loadingActive, setLoadingActive] = useState(true);

  const [inactive, setInactive] = useState<SessionAttendanceRow[]>([]);
  const [inactivePage, setInactivePage] = useState(1);
  const [inactiveTotalPages, setInactiveTotalPages] = useState(1);
  const [inactiveTotal, setInactiveTotal] = useState(0);
  const [loadingInactive, setLoadingInactive] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [addInitial, setAddInitial] = useState<FormValues>(() => blankForm(ownBranch));
  const [editInitial, setEditInitial] = useState<(FormValues & { id: number }) | null>(null);

  useEffect(() => {
    if (ownBranch) return;
    getBranchesNameList()
      .then(res => setBranchOptions((res?.data ?? []).map((b: any) => ({ label: String(b.name), value: String(b.id) }))))
      .catch(() => {});
  }, [ownBranch]);

  useEffect(() => {
    getTrainerNameList(ownBranch)
      .then(list => setFilterTrainers(list.map(t => ({ label: `${t.first_name} ${t.last_name}`.trim(), value: String(t.id) }))))
      .catch(() => setFilterTrainers([]));
  }, [ownBranch]);

  useEffect(() => {
    setFilterOrderId('');
    if (!filterTrainerId) { setFilterOrders([]); return; }
    getTrainerPackageOrders(filterTrainerId)
      .then(list => setFilterOrders(list.map(o => ({ label: `${o.package_name} for ${o.client_name}`, value: String(o.order_id) }))))
      .catch(() => setFilterOrders([]));
  }, [filterTrainerId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingActive(true);
    getSessionAttendancePage({
      branch_id: ownBranch, status: '1',
      trainer_id: filterTrainerId || undefined,
      order_id: filterOrderId || undefined,
      limit: PAGE_SIZE, page: activePage,
    })
      .then(r => {
        if (cancelled) return;
        setActive(r.rows); setActiveTotalPages(Math.max(1, r.totalPages)); setActiveTotal(r.total);
      })
      .catch(() => { if (!cancelled) { setActive([]); setActiveTotalPages(1); setActiveTotal(0); } })
      .finally(() => { if (!cancelled) { setLoadingActive(false); setRefreshing(false); } });
    return () => { cancelled = true; };
  }, [ownBranch, filterTrainerId, filterOrderId, activePage, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setLoadingInactive(true);
    getSessionAttendancePage({ branch_id: ownBranch, status: '0', limit: PAGE_SIZE, page: inactivePage })
      .then(r => {
        if (cancelled) return;
        setInactive(r.rows); setInactiveTotalPages(Math.max(1, r.totalPages)); setInactiveTotal(r.total);
      })
      .catch(() => { if (!cancelled) { setInactive([]); setInactiveTotalPages(1); setInactiveTotal(0); } })
      .finally(() => { if (!cancelled) setLoadingInactive(false); });
    return () => { cancelled = true; };
  }, [ownBranch, inactivePage, reloadKey]);

  const reload = () => setReloadKey(k => k + 1);

  const runAction = (row: SessionAttendanceRow, action: 0 | 1 | 2) => {
    const label = action === 0 ? 'Inactive' : action === 1 ? 'Active' : 'Delete';
    Alert.alert(
      `${label} session?`,
      `${row.order?.client_name ?? 'Client'} — ${dmy(row.date)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 1 ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await setSessionAttendanceStatus(row.id, action);
              dispatch(showSnackbar({
                message: action === 0 ? 'Inactivated Successfully!' : action === 1 ? 'Activated Successfully!' : 'Deleted Successfully!',
                type: 'success',
              }));
              reload();
            } catch (err: any) {
              const msg = err?.response?.data?.message;
              dispatch(showSnackbar({ message: typeof msg === 'string' ? msg : `Could not ${label.toLowerCase()} session`, type: 'error' }));
            }
          },
        },
      ],
    );
  };

  const openUpdate = async (row: SessionAttendanceRow) => {
    try {
      const info = (await getSessionAttendanceInfo(ownBranch, row.id)) ?? row;
      setEditInitial({
        id: row.id,
        branchId: String(info.branch_id ?? ''),
        trainerId: String(info.trainer_id ?? ''),
        orderId: String(info.order_id ?? ''),
        clientId: String(info.client_id ?? ''),
        clientName: info.order?.client_name ?? '',
        clientEmail: '',
        scheduleId: info.trainer_schedule_id ? String(info.trainer_schedule_id) : '',
        trainerStatus: info.staff_status ?? '',
        clientStatus: info.client_status ?? '',
        date: parseDate(info.date),
      });
    } catch {
      dispatch(showSnackbar({ message: 'Could not load this session', type: 'error' }));
    }
  };

  const renderTable = (rows: SessionAttendanceRow[], page: number, isActive: boolean, loading: boolean) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={[styles.tableHeader, !isActive && { backgroundColor: '#607D8B' }]}>
          <Text style={[styles.th, styles.colSr]}>Sr#</Text>
          <Text style={[styles.th, styles.colName]}>Trainer Name</Text>
          <Text style={[styles.th, styles.colName]}>Client Name</Text>
          <Text style={[styles.th, styles.colPkg]}>Package Name</Text>
          <Text style={[styles.th, styles.colStatus]}>Trainer Attendance</Text>
          <Text style={[styles.th, styles.colStatus]}>Client Attendance</Text>
          <Text style={[styles.th, styles.colDate]}>Date</Text>
          <Text style={[styles.th, styles.colActions]}>Actions</Text>
        </View>
        {loading ? (
          <View style={styles.emptyRow}><ActivityIndicator color="#E63946" /></View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyRow}>
            <Icon name="dumbbell" size={40} color="#ddd" />
            <Text style={styles.emptyText}>No Record Found</Text>
          </View>
        ) : rows.map((row, idx) => (
          <View key={row.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
            <Text style={[styles.td, styles.colSr]}>{(page - 1) * PAGE_SIZE + idx + 1}</Text>
            <Text style={[styles.td, styles.colName]}>{row.trainer?.trainer_name ?? '-'}</Text>
            <ClientNameCell
              name={row.order?.client_name}
              clientId={row.client_id ?? row.order?.client_id}
              style={[styles.td, styles.colName, styles.clientText]}
              numberOfLines={2}
              fallback="-"
            />
            <Text style={[styles.td, styles.colPkg]}>{row.order?.name ?? '-'}</Text>
            <Text style={[styles.td, styles.colStatus, statusColor(row.staff_status)]}>{row.staff_status ?? '-'}</Text>
            <Text style={[styles.td, styles.colStatus, statusColor(row.client_status)]}>{row.client_status ?? '-'}</Text>
            <Text style={[styles.td, styles.colDate]}>{dmy(row.date)}</Text>
            <View style={styles.colActions}>
              {isActive ? (
                <>
                  {canUpdate && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => openUpdate(row)}>
                      <Icon name="repeat" size={13} color="#43A047" />
                      <Text style={[styles.actionText, { color: '#43A047' }]}>Update</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => runAction(row, 0)}>
                    <Icon name="close-circle-outline" size={13} color="#E63946" />
                    <Text style={[styles.actionText, { color: '#E63946' }]}>Inactive</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => runAction(row, 1)}>
                    <Icon name="check-circle-outline" size={13} color="#43A047" />
                    <Text style={[styles.actionText, { color: '#43A047' }]}>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => runAction(row, 2)}>
                    <Icon name="delete-outline" size={13} color="#E63946" />
                    <Text style={[styles.actionText, { color: '#E63946' }]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="PT Attendance"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(); }} colors={['#E63946']} />}
      >
        {editInitial ? (
          <SessionForm
            mode="update"
            initial={editInitial}
            branchOptions={branchOptions}
            branchLocked
            onSaved={() => { setEditInitial(null); reload(); }}
            onCancel={() => setEditInitial(null)}
          />
        ) : (
          <SessionForm
            mode="add"
            initial={addInitial}
            branchOptions={branchOptions}
            branchLocked={!!ownBranch}
            onSaved={() => { setAddInitial(blankForm(ownBranch)); setActivePage(1); reload(); }}
          />
        )}

        {/* Active Session Attendance */}
        <Text style={styles.sectionTitle}>Active Session Attendance</Text>
        <View style={styles.filterRow}>
          <View style={styles.filterCol}>
            <Text style={styles.filterLabel}>Filter By Trainer</Text>
            <Dropdown
              label="Select Trainer"
              options={[{ label: 'All Trainers', value: '' }, ...filterTrainers]}
              value={filterTrainerId}
              onChange={id => { setFilterTrainerId(id); setActivePage(1); }}
            />
          </View>
          <View style={styles.filterCol}>
            <Text style={styles.filterLabel}>Filter By Package</Text>
            <Dropdown
              label={filterTrainerId ? 'Select Package' : 'Select a trainer first'}
              options={filterTrainerId ? [{ label: 'All Packages', value: '' }, ...filterOrders] : []}
              value={filterOrderId}
              onChange={id => { setFilterOrderId(id); setActivePage(1); }}
              disabled={!filterTrainerId}
            />
          </View>
        </View>
        {renderTable(active, activePage, true, loadingActive)}
        <Pagination page={activePage} totalPages={activeTotalPages} onChange={setActivePage} />
        {!loadingActive && activeTotal > 0 && (
          <Text style={styles.footnote}>Page {activePage} of {activeTotalPages} · {activeTotal} entries</Text>
        )}

        {/* Inactive Session Attendance */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Inactive Session Attendance</Text>
        {renderTable(inactive, inactivePage, false, loadingInactive)}
        <Pagination page={inactivePage} totalPages={inactiveTotalPages} onChange={setInactivePage} />
        {!loadingInactive && inactiveTotal > 0 && (
          <Text style={styles.footnote}>Page {inactivePage} of {inactiveTotalPages} · {inactiveTotal} entries</Text>
        )}
      </ScrollView>
    </View>
  );
};

const statusColor = (s: string) => {
  if (!s) return {};
  const lower = s.toLowerCase();
  if (lower === 'delivered') return styles.statusDelivered;
  if (lower === 'no show') return styles.statusNoShow;
  if (lower === 'cancel') return styles.statusCancel;
  if (lower === 'contacted') return styles.statusContacted;
  return {};
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll: { padding: 16, paddingBottom: 40 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  editCard: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, borderWidth: 1, borderColor: '#BBDEFB' },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 10 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFAFA', gap: 8 },
  selectBtnDisabled: { backgroundColor: '#F0F0F0' },
  selectBtnText: { fontSize: 14, color: '#333', flex: 1 },
  inlineDropdown: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, marginTop: 4, zIndex: 100 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownText: { fontSize: 14, color: '#333' },
  dropdownSelected: { color: '#E63946', fontWeight: '700' },
  dropdownEmpty: { fontSize: 13, color: '#aaa', padding: 14, textAlign: 'center' },
  errorText: { fontSize: 12, color: '#E63946', fontWeight: '700', marginTop: 10 },
  addBtn: { backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  editBtnRow: { flexDirection: 'row' },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  filterCol: { flex: 1 },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#777', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E63946', paddingVertical: 10, paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f5', alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  th: { fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' },
  td: { fontSize: 11, color: '#333', textAlign: 'center' },
  clientText: { color: '#E63946', fontWeight: '600' },
  colSr: { width: 34 },
  colName: { width: 120 },
  colPkg: { width: 170 },
  colStatus: { width: 82 },
  colDate: { width: 80 },
  colActions: { width: 150, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 6 },
  actionText: { fontSize: 11, fontWeight: '700' },
  emptyRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptyText: { fontSize: 13, color: '#aaa', marginTop: 8 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, marginBottom: 6, flexWrap: 'wrap' },
  pageEdgeText: { fontSize: 12, fontWeight: '700', color: '#E63946' },
  pageArrow: { fontSize: 16, fontWeight: '700', color: '#E63946', paddingHorizontal: 4 },
  pageDisabledText: { color: '#BBB' },
  pageNum: { minWidth: 30, height: 30, paddingHorizontal: 4, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center' },
  pageNumActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },
  footnote: { fontSize: 11, color: '#999', textAlign: 'center', marginBottom: 8 },
  statusDelivered: { color: '#43A047', fontWeight: '700' },
  statusNoShow: { color: '#E63946', fontWeight: '700' },
  statusCancel: { color: '#FB8C00', fontWeight: '700' },
  statusContacted: { color: '#1E88E5', fontWeight: '700' },
});

export default PTAttendance;
