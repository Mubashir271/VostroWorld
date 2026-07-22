import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Platform, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppHeader from '../../../components/AppHeader';
import { RootState } from '../../../redux/store';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import {
  getGXTrainers, getPTRosterAdmin, getHRSessions, createHRSession, updateHRSession,
  deleteHRSession, getHRPortalCommissions, getHRPortalClients, recordHRCommissionPayment,
} from '../../../api/employeeDashboard';

// ── Shared types ──────────────────────────────────────────────────────────────

interface Trainer { id: number; name: string; commission: number; branch_id: number; branch_name: string; }
interface RosterEntry {
  client_id: number; client_name: string; order_id: number; package_id: number;
  package_name: string; time_slot?: string; order_status?: string | number;
  sessions_remaining?: number; end_date?: string;
}
interface SessionRow {
  id: number; date: string; day?: string; staff_status: string; client_status: string;
  type?: string; validate_status?: string; order_id?: number; client_name: string;
  client_id: number; trainer_name: string; trainer_id: number; package_name: string;
  package_start_date?: string; package_end_date?: string; branch_name?: string;
}
interface CommissionDetail {
  client_name: string; package_name: string; delivered_sessions?: number;
  no_show_count?: number; commission?: number; date_of_expiry?: string;
}
interface CommissionRow {
  id: number; name: string; branch: string; department?: string; designation?: string;
  commission_per: number; gross_commission: number; paid_commission: number;
  outstanding_commission: number; payout_status: string; payout_date?: string | null;
  total_delivered_sessions: number; total_client_no_show_sessions: number;
  total_remaining_contract_sessions: number; details?: CommissionDetail[];
}

const TABS = ['Sessions', 'Commissions', 'Session Report'] as const;
type PortalTab = typeof TABS[number];

const BRANCH_OPTIONS = [
  { label: 'All Branches', value: '' },
  { label: 'F-11', value: '15' },
  { label: 'G-13', value: '1' },
];

const STAFF_STATUS_OPTIONS = ['All', 'Contacted', 'Delivered', 'No Show', 'Cancel'];
const CLIENT_STATUS_OPTIONS = ['All', 'Delivered', 'No Show', 'Cancel'];

const apiDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dispDate = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
const Rs = (n: any) => `PKR ${Number(n || 0).toLocaleString()}`;

const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; };

// ── Reusable dropdown ─────────────────────────────────────────────────────────

const Dropdown = ({ label, value, options, onChange, disabled }: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const sel = options.find(o => o.value === value)?.label ?? label;
  return (
    <View style={{ position: 'relative', zIndex: open ? 50 : 1 }}>
      <TouchableOpacity
        style={[styles.ddBtn, disabled && styles.ddBtnDisabled]}
        onPress={() => !disabled && setOpen(v => !v)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.ddLabel}>{label}</Text>
          <Text style={styles.ddValue} numberOfLines={1}>{sel}</Text>
        </View>
        <Icon name="chevron-down" size={16} color="#888" />
      </TouchableOpacity>
      {open && (
        <View style={styles.ddList}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {options.map(opt => (
              <TouchableOpacity key={opt.value || opt.label} style={styles.ddItem} onPress={() => { onChange(opt.value); setOpen(false); }}>
                <Text style={[styles.ddItemText, value === opt.value && styles.ddItemTextSel]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const DateField = ({ label, date, onChange }: { label: string; date: Date; onChange: (d: Date) => void }) => {
  const [show, setShow] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.ddBtn} onPress={() => setShow(true)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ddLabel}>{label}</Text>
          <Text style={styles.ddValue}>{dispDate(date)}</Text>
        </View>
        <Icon name="calendar" size={16} color="#888" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShow(false); if (d) onChange(d); }}
        />
      )}
    </>
  );
};

const HRSessionCommissionPortal = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.user);
  const defaultBranch = profile?.branchId ?? 1;

  const [activeTab, setActiveTab] = useState<PortalTab>('Sessions');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [branch, setBranch] = useState('');

  useEffect(() => {
    getGXTrainers({ branch_id: (branch ? Number(branch) : defaultBranch) })
      .then(res => { const list = res?.data ?? res ?? []; setTrainers(Array.isArray(list) ? list : []); })
      .catch(() => setTrainers([]));
  }, [branch, defaultBranch]);

  const trainerOptions = [{ label: 'All Trainers', value: '' }, ...trainers.map(t => ({ label: t.name, value: String(t.id) }))];

  return (
    <View style={styles.container}>
      <AppHeader
        title="Session & Commission Portal"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
      />

      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Sessions' && (
        <SessionsTab
          branch={branch} setBranch={setBranch}
          trainerOptions={trainerOptions} trainers={trainers}
          defaultBranch={defaultBranch} dispatch={dispatch}
        />
      )}
      {activeTab === 'Commissions' && (
        <CommissionsTab
          branch={branch} setBranch={setBranch}
          trainerOptions={trainerOptions}
          defaultBranch={defaultBranch} dispatch={dispatch}
        />
      )}
      {activeTab === 'Session Report' && (
        <SessionReportTab
          branch={branch} setBranch={setBranch}
          trainerOptions={trainerOptions}
          defaultBranch={defaultBranch}
        />
      )}
    </View>
  );
};

// ── Sessions tab ──────────────────────────────────────────────────────────────

const SessionsTab = ({ branch, setBranch, trainerOptions, trainers, defaultBranch, dispatch }: any) => {
  const [trainerId, setTrainerId] = useState('');
  const [fromDate, setFromDate] = useState(monthAgo());
  const [toDate, setToDate] = useState(new Date());
  const [staffStatus, setStaffStatus] = useState('All');
  const [clientStatus, setClientStatus] = useState('All');
  const [perPage, setPerPage] = useState('25');

  const [rows, setRows] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editRow, setEditRow] = useState<SessionRow | null>(null);

  const bid = branch ? Number(branch) : defaultBranch;

  const load = useCallback(async (isRefresh = false, pageNum = 1) => {
    if (isRefresh) { setRefreshing(true); }
    else if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await getHRSessions({
        branch_id: bid,
        trainer_id: trainerId ? Number(trainerId) : undefined,
        staff_status: staffStatus === 'All' ? undefined : staffStatus,
        client_status: clientStatus === 'All' ? undefined : clientStatus,
        start_date: apiDate(fromDate),
        end_date: apiDate(toDate),
        limit: Number(perPage),
        page: pageNum,
      });
      const raw = res?.data ?? res ?? {};
      const list: SessionRow[] = raw.data ?? (Array.isArray(raw) ? raw : []);
      setTotal(raw.total ?? list.length);
      setLastPage(raw.last_page ?? 1);
      setRows(pageNum === 1 ? list : prev => [...prev, ...list]);
      setPage(pageNum);
    } catch {
      if (pageNum === 1) setRows([]);
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  }, [bid, trainerId, staffStatus, clientStatus, fromDate, toDate, perPage]);

  useEffect(() => { load(false, 1); }, [load]);

  const handleDelete = async (row: SessionRow) => {
    try {
      await deleteHRSession(row.id);
      dispatch(showSnackbar({ message: 'Session deleted', type: 'success' }));
      load(false, 1);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete session', type: 'error' }));
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true, 1)} colors={['#E63946']} />}
    >
      <View style={styles.filterGrid}>
        <View style={styles.filterCol}><Dropdown label="Branch" value={branch} options={BRANCH_OPTIONS} onChange={setBranch} /></View>
        <View style={styles.filterCol}><Dropdown label="Trainer" value={trainerId} options={trainerOptions} onChange={setTrainerId} /></View>
        <View style={styles.filterCol}><DateField label="From" date={fromDate} onChange={setFromDate} /></View>
        <View style={styles.filterCol}><DateField label="To" date={toDate} onChange={setToDate} /></View>
        <View style={styles.filterCol}><Dropdown label="Trainer Status" value={staffStatus} options={STAFF_STATUS_OPTIONS.map(s => ({ label: s, value: s }))} onChange={setStaffStatus} /></View>
        <View style={styles.filterCol}><Dropdown label="Client Status" value={clientStatus} options={CLIENT_STATUS_OPTIONS.map(s => ({ label: s, value: s }))} onChange={setClientStatus} /></View>
        <View style={styles.filterCol}><Dropdown label="Per Page" value={perPage} options={['25', '50', '100'].map(s => ({ label: s, value: s }))} onChange={setPerPage} /></View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.filterGoBtn} onPress={() => load(false, 1)}>
          <Icon name="magnify" size={16} color="#fff" />
          <Text style={styles.filterGoText}>Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Icon name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkBtn} onPress={() => setBulkOpen(true)}>
          <Icon name="layers-plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Bulk Add</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.totalText}>{total} total records</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, w.sr]}>#</Text>
              <Text style={[styles.th, w.date]}>Date</Text>
              <Text style={[styles.th, w.name]}>Trainer</Text>
              <Text style={[styles.th, w.name]}>Client</Text>
              <Text style={[styles.th, w.pkg]}>Package</Text>
              <Text style={[styles.th, w.status]}>Trainer St.</Text>
              <Text style={[styles.th, w.status]}>Client St.</Text>
              <Text style={[styles.th, w.type]}>Type</Text>
              <Text style={[styles.th, w.action]}>Actions</Text>
            </View>
            {rows.length === 0 ? (
              <View style={styles.emptyRow}><Text style={styles.emptyText}>No sessions found</Text></View>
            ) : rows.map((r, idx) => (
              <View key={r.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.td, w.sr]}>{idx + 1}</Text>
                <Text style={[styles.td, w.date]}>{r.date}</Text>
                <Text style={[styles.td, w.name]}>{r.trainer_name}</Text>
                <Text style={[styles.td, w.name]}>{r.client_name}</Text>
                <Text style={[styles.td, w.pkg]} numberOfLines={2}>{r.package_name}</Text>
                <Text style={[styles.td, w.status, statusColor(r.staff_status)]}>{r.staff_status}</Text>
                <Text style={[styles.td, w.status, statusColor(r.client_status)]}>{r.client_status}</Text>
                <Text style={[styles.td, w.type]}>{r.type ?? '-'}</Text>
                <View style={[w.action, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => setEditRow(r)}>
                    <Icon name="pencil" size={14} color="#1E88E5" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDelete(r)}>
                    <Icon name="delete" size={14} color="#E63946" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {page < lastPage && !loading && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={() => load(false, page + 1)} disabled={loadingMore}>
          {loadingMore ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.loadMoreText}>Load More</Text>}
        </TouchableOpacity>
      )}

      <AddSessionModal
        visible={addOpen} onClose={() => setAddOpen(false)}
        trainers={trainers} branch={bid} dispatch={dispatch}
        onDone={() => load(false, 1)}
      />
      <BulkAddModal
        visible={bulkOpen} onClose={() => setBulkOpen(false)}
        trainers={trainers} branch={bid} dispatch={dispatch}
        onDone={() => load(false, 1)}
      />
      <EditSessionModal
        row={editRow} onClose={() => setEditRow(null)} dispatch={dispatch}
        onDone={() => load(false, 1)}
      />
    </ScrollView>
  );
};

const statusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') return { color: '#43A047', fontWeight: '700' as const };
  if (s === 'no show') return { color: '#E63946', fontWeight: '700' as const };
  if (s === 'cancel') return { color: '#FB8C00', fontWeight: '700' as const };
  return { color: '#666' };
};

// ── Add Session modal ─────────────────────────────────────────────────────────

const AddSessionModal = ({ visible, onClose, trainers, branch, dispatch, onDone }: any) => {
  const [trainerId, setTrainerId] = useState('');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date());
  const [staffStatus, setStaffStatus] = useState('Delivered');
  const [clientStatus, setClientStatus] = useState('Delivered');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) { setTrainerId(''); setClientId(''); setRoster([]); }
  }, [visible]);

  useEffect(() => {
    if (!trainerId) { setRoster([]); return; }
    getPTRosterAdmin({ branch_id: branch, trainer_id: Number(trainerId) })
      .then(res => { const list = res?.data ?? res ?? []; setRoster(Array.isArray(list) ? list : []); })
      .catch(() => setRoster([]));
  }, [trainerId, branch]);

  const submit = async () => {
    const entry = roster.find(r => String(r.client_id) === clientId);
    if (!trainerId || !entry) {
      dispatch(showSnackbar({ message: 'Select trainer and client', type: 'error' }));
      return;
    }
    setSubmitting(true);
    try {
      await createHRSession({
        branch_id: branch,
        trainer_id: Number(trainerId),
        client_id: entry.client_id,
        order_id: entry.order_id,
        package_id: entry.package_id,
        date: apiDate(date),
        time_slot: entry.time_slot,
        staff_status: staffStatus,
        client_status: clientStatus,
      });
      dispatch(showSnackbar({ message: 'Session added', type: 'success' }));
      onDone(); onClose();
    } catch (err: any) {
      dispatch(showSnackbar({ message: err?.response?.data?.message ?? 'Failed to add session', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const trainerOpts = trainers.map((t: Trainer) => ({ label: t.name, value: String(t.id) }));
  const clientOpts = roster.map(r => ({ label: `${r.client_name} — ${r.package_name}`, value: String(r.client_id) }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Add Session</Text>
          <ScrollView>
            <Dropdown label="Trainer" value={trainerId} options={trainerOpts} onChange={v => { setTrainerId(v); setClientId(''); }} />
            <View style={{ height: 8 }} />
            <Dropdown label="Client / Package" value={clientId} options={clientOpts} onChange={setClientId} disabled={!trainerId} />
            <View style={{ height: 8 }} />
            <DateField label="Date" date={date} onChange={setDate} />
            <View style={{ height: 8 }} />
            <Dropdown label="Trainer Status" value={staffStatus} options={STAFF_STATUS_OPTIONS.filter(s => s !== 'All').map(s => ({ label: s, value: s }))} onChange={setStaffStatus} />
            <View style={{ height: 8 }} />
            <Dropdown label="Client Status" value={clientStatus} options={CLIENT_STATUS_OPTIONS.filter(s => s !== 'All').map(s => ({ label: s, value: s }))} onChange={setClientStatus} />
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Add</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Bulk Add modal (same trainer/client, several dates in one submit) ────────

const BulkAddModal = ({ visible, onClose, trainers, branch, dispatch, onDone }: any) => {
  const [trainerId, setTrainerId] = useState('');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [clientId, setClientId] = useState('');
  const [staffStatus, setStaffStatus] = useState('Delivered');
  const [clientStatus, setClientStatus] = useState('Delivered');
  const [dates, setDates] = useState<Date[]>([new Date()]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) { setTrainerId(''); setClientId(''); setRoster([]); setDates([new Date()]); }
  }, [visible]);

  useEffect(() => {
    if (!trainerId) { setRoster([]); return; }
    getPTRosterAdmin({ branch_id: branch, trainer_id: Number(trainerId) })
      .then(res => { const list = res?.data ?? res ?? []; setRoster(Array.isArray(list) ? list : []); })
      .catch(() => setRoster([]));
  }, [trainerId, branch]);

  const addDate = (d: Date) => { setPickerOpen(false); setDates(prev => [...prev, d]); };
  const removeDate = (idx: number) => setDates(prev => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    const entry = roster.find(r => String(r.client_id) === clientId);
    if (!trainerId || !entry || dates.length === 0) {
      dispatch(showSnackbar({ message: 'Select trainer, client and at least one date', type: 'error' }));
      return;
    }
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(dates.map(d => createHRSession({
        branch_id: branch,
        trainer_id: Number(trainerId),
        client_id: entry.client_id,
        order_id: entry.order_id,
        package_id: entry.package_id,
        date: apiDate(d),
        time_slot: entry.time_slot,
        staff_status: staffStatus,
        client_status: clientStatus,
      })));
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed === 0) {
        dispatch(showSnackbar({ message: `${dates.length} sessions added`, type: 'success' }));
      } else {
        dispatch(showSnackbar({ message: `${dates.length - failed} added, ${failed} failed`, type: 'error' }));
      }
      onDone(); onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const trainerOpts = trainers.map((t: Trainer) => ({ label: t.name, value: String(t.id) }));
  const clientOpts = roster.map(r => ({ label: `${r.client_name} — ${r.package_name}`, value: String(r.client_id) }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Bulk Add Sessions</Text>
          <ScrollView>
            <Dropdown label="Trainer" value={trainerId} options={trainerOpts} onChange={v => { setTrainerId(v); setClientId(''); }} />
            <View style={{ height: 8 }} />
            <Dropdown label="Client / Package" value={clientId} options={clientOpts} onChange={setClientId} disabled={!trainerId} />
            <View style={{ height: 8 }} />
            <Dropdown label="Trainer Status" value={staffStatus} options={STAFF_STATUS_OPTIONS.filter(s => s !== 'All').map(s => ({ label: s, value: s }))} onChange={setStaffStatus} />
            <View style={{ height: 8 }} />
            <Dropdown label="Client Status" value={clientStatus} options={CLIENT_STATUS_OPTIONS.filter(s => s !== 'All').map(s => ({ label: s, value: s }))} onChange={setClientStatus} />
            <View style={{ height: 12 }} />
            <Text style={styles.ddLabel}>Session Dates ({dates.length})</Text>
            {dates.map((d, i) => (
              <View key={i} style={styles.dateChipRow}>
                <Text style={styles.dateChipText}>{dispDate(d)}</Text>
                <TouchableOpacity onPress={() => removeDate(i)}><Icon name="close-circle" size={18} color="#E63946" /></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addDateBtn} onPress={() => setPickerOpen(true)}>
              <Icon name="plus" size={14} color="#E63946" />
              <Text style={styles.addDateText}>Add another date</Text>
            </TouchableOpacity>
            {pickerOpen && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => { if (d) addDate(d); else setPickerOpen(false); }}
              />
            )}
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Add All</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Edit session modal ────────────────────────────────────────────────────────

const EditSessionModal = ({ row, onClose, dispatch, onDone }: any) => {
  const [staffStatus, setStaffStatus] = useState('');
  const [clientStatus, setClientStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (row) { setStaffStatus(row.staff_status); setClientStatus(row.client_status); }
  }, [row]);

  if (!row) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      await updateHRSession(row.id, { staff_status: staffStatus, client_status: clientStatus });
      dispatch(showSnackbar({ message: 'Session updated', type: 'success' }));
      onDone(); onClose();
    } catch {
      dispatch(showSnackbar({ message: 'Failed to update session', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Edit Session — {row.client_name}</Text>
          <Dropdown label="Trainer Status" value={staffStatus} options={STAFF_STATUS_OPTIONS.filter(s => s !== 'All').map(s => ({ label: s, value: s }))} onChange={setStaffStatus} />
          <View style={{ height: 8 }} />
          <Dropdown label="Client Status" value={clientStatus} options={CLIENT_STATUS_OPTIONS.filter(s => s !== 'All').map(s => ({ label: s, value: s }))} onChange={setClientStatus} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Commissions tab ───────────────────────────────────────────────────────────

const CommissionsTab = ({ branch, setBranch, trainerOptions, defaultBranch, dispatch }: any) => {
  const [trainerId, setTrainerId] = useState('');
  const [fromDate, setFromDate] = useState(monthAgo());
  const [toDate, setToDate] = useState(new Date());
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [payTarget, setPayTarget] = useState<CommissionRow | null>(null);

  const bid = branch ? Number(branch) : defaultBranch;

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHRPortalCommissions({
        branch_id: bid,
        trainer_id: trainerId ? Number(trainerId) : undefined,
        start_date: apiDate(fromDate),
        end_date: apiDate(toDate),
        limit: 200,
      });
      const list: any[] = res?.data ?? res ?? [];
      const data: CommissionRow[] = list.map(item => ({
        id: item.id,
        name: item.name,
        branch: item.branch,
        department: item.department,
        designation: item.designation,
        commission_per: item.commission?.commission_per ?? 0,
        gross_commission: item.commission?.gross_commission ?? 0,
        paid_commission: item.commission?.paid_commission ?? 0,
        outstanding_commission: item.commission?.outstanding_commission ?? 0,
        payout_status: item.commission?.payout_status ?? 'unpaid',
        payout_date: item.commission?.payout_date,
        total_delivered_sessions: item.commission?.total_delivered_sessions ?? 0,
        total_client_no_show_sessions: item.commission?.total_client_no_show_sessions ?? 0,
        total_remaining_contract_sessions: item.commission?.total_remaining_contract_sessions ?? 0,
        details: item.commission?.details ?? [],
      }));
      setRows(data);
      setCalculated(true);
    } catch {
      setRows([]);
      setCalculated(true);
    } finally {
      setLoading(false);
    }
  }, [bid, trainerId, fromDate, toDate]);

  const totalGross = rows.reduce((s, r) => s + (r.gross_commission || 0), 0);
  const totalOutstanding = rows.reduce((s, r) => s + (r.outstanding_commission || 0), 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.filterGrid}>
        <View style={styles.filterCol}><Dropdown label="Branch" value={branch} options={BRANCH_OPTIONS} onChange={setBranch} /></View>
        <View style={styles.filterCol}><Dropdown label="Trainer" value={trainerId} options={trainerOptions} onChange={setTrainerId} /></View>
        <View style={styles.filterCol}><DateField label="From" date={fromDate} onChange={setFromDate} /></View>
        <View style={styles.filterCol}><DateField label="To" date={toDate} onChange={setToDate} /></View>
      </View>
      <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={loading}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : (
          <>
            <Icon name="calculator" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Calculate</Text>
          </>
        )}
      </TouchableOpacity>

      {calculated && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Trainers</Text>
            <Text style={styles.statValue}>{rows.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Gross Commission</Text>
            <Text style={[styles.statValue, { color: '#43A047' }]}>{Rs(totalGross)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Outstanding</Text>
            <Text style={[styles.statValue, { color: '#E63946' }]}>{Rs(totalOutstanding)}</Text>
          </View>
        </View>
      )}

      {!calculated ? (
        <View style={styles.center}>
          <Icon name="table-large" size={52} color="#DDD" />
          <Text style={styles.emptyText}>Set filters and tap Calculate</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}><Text style={styles.emptyText}>No commission records found</Text></View>
      ) : (
        rows.map(r => {
          const isOpen = expanded === r.id;
          const isSettled = r.payout_status?.toLowerCase() === 'settled' || r.payout_status?.toLowerCase() === 'paid';
          return (
            <View key={r.id} style={styles.commCard}>
              <TouchableOpacity style={styles.commCardHeader} onPress={() => setExpanded(isOpen ? null : r.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commName}>{r.name}</Text>
                  <Text style={styles.commSub}>{r.branch} · {r.commission_per}%</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.commGross}>{Rs(r.gross_commission)}</Text>
                  <Text style={[styles.commStatus, isSettled ? { color: '#43A047' } : { color: '#E63946' }]}>{r.payout_status}</Text>
                </View>
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#888" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}><Text style={[styles.badgeTxt, { color: '#2E7D32' }]}>{r.total_delivered_sessions} done</Text></View>
                <View style={[styles.badge, { backgroundColor: '#FFF3E0' }]}><Text style={[styles.badgeTxt, { color: '#E65100' }]}>{r.total_client_no_show_sessions} NS</Text></View>
                <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}><Text style={[styles.badgeTxt, { color: '#1565C0' }]}>{r.total_remaining_contract_sessions} remaining</Text></View>
              </View>
              <View style={styles.commRow2}>
                <Text style={styles.commRow2Text}>Paid: {Rs(r.paid_commission)}</Text>
                <Text style={styles.commRow2Text}>Outstanding: {Rs(r.outstanding_commission)}</Text>
              </View>
              {!isSettled && (
                <TouchableOpacity style={styles.recPayBtn} onPress={() => setPayTarget(r)}>
                  <Text style={styles.recPayText}>Record Payment</Text>
                </TouchableOpacity>
              )}
              {isOpen && (
                <View style={styles.detailBox}>
                  {(r.details ?? []).map((d, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={styles.detailClient} numberOfLines={1}>{d.client_name}</Text>
                      <Text style={styles.detailMeta}>{d.delivered_sessions ?? 0} delivered · {Rs(d.commission)}</Text>
                    </View>
                  ))}
                  {(r.details ?? []).length === 0 && <Text style={styles.emptySubText}>No client breakdown available</Text>}
                </View>
              )}
            </View>
          );
        })
      )}

      <RecordPaymentModal
        target={payTarget} onClose={() => setPayTarget(null)} dispatch={dispatch}
        branch={bid} fromDate={fromDate} toDate={toDate}
        onDone={() => calculate()}
      />
    </ScrollView>
  );
};

const RecordPaymentModal = ({ target, onClose, dispatch, branch, fromDate, toDate, onDone }: any) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (target) { setAmount(String(target.outstanding_commission ?? '')); setNote(''); } }, [target]);

  if (!target) return null;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      dispatch(showSnackbar({ message: 'Enter a valid amount', type: 'error' }));
      return;
    }
    setSubmitting(true);
    try {
      await recordHRCommissionPayment({
        trainer_id: target.id, branch_id: branch,
        start_date: apiDate(fromDate), end_date: apiDate(toDate),
        amount: amt, note,
      });
      dispatch(showSnackbar({ message: 'Payment recorded', type: 'success' }));
      onDone(); onClose();
    } catch {
      dispatch(showSnackbar({ message: 'Could not record payment — this action is pending backend confirmation', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Record Payment — {target.name}</Text>
          <Text style={styles.ddLabel}>Amount (PKR)</Text>
          <TextInput style={styles.textInput} value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <View style={{ height: 8 }} />
          <Text style={styles.ddLabel}>Note (optional)</Text>
          <TextInput style={styles.textInput} value={note} onChangeText={setNote} multiline />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Record</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Session Report tab ────────────────────────────────────────────────────────

const SessionReportTab = ({ branch, setBranch, trainerOptions, defaultBranch }: any) => {
  const [trainerId, setTrainerId] = useState('');
  const [clients, setClients] = useState<RosterEntry[]>([]);
  const [activeClientId, setActiveClientId] = useState('');
  const [oldClientId, setOldClientId] = useState('');
  const [fromDate, setFromDate] = useState(monthAgo());
  const [toDate, setToDate] = useState(new Date());
  const [staffStatus, setStaffStatus] = useState('All');
  const [clientStatus, setClientStatus] = useState('All');
  const [perPage, setPerPage] = useState('25');

  const [rows, setRows] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const bid = branch ? Number(branch) : defaultBranch;

  useEffect(() => {
    if (!trainerId) { setClients([]); setActiveClientId(''); setOldClientId(''); return; }
    getHRPortalClients({ trainer_id: Number(trainerId), branch_id: bid, include_expired: 1 })
      .then(res => { const list = res?.data ?? res ?? []; setClients(Array.isArray(list) ? list : []); })
      .catch(() => setClients([]));
  }, [trainerId, bid]);

  const isExpired = (c: RosterEntry) => {
    if (!c.end_date) return false;
    return new Date(c.end_date) < new Date();
  };
  const activeClientOpts = [{ label: 'All Active', value: '' }, ...clients.filter(c => !isExpired(c)).map(c => ({ label: c.client_name, value: String(c.client_id) }))];
  const oldClientOpts = [{ label: 'All Old', value: '' }, ...clients.filter(isExpired).map(c => ({ label: c.client_name, value: String(c.client_id) }))];

  const load = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const clientId = activeClientId || oldClientId;
      const res = await getHRSessions({
        branch_id: bid,
        trainer_id: trainerId ? Number(trainerId) : undefined,
        client_id: clientId ? Number(clientId) : undefined,
        staff_status: staffStatus === 'All' ? undefined : staffStatus,
        client_status: clientStatus === 'All' ? undefined : clientStatus,
        start_date: apiDate(fromDate),
        end_date: apiDate(toDate),
        limit: Number(perPage),
        page: pageNum,
      });
      const raw = res?.data ?? res ?? {};
      const list: SessionRow[] = raw.data ?? (Array.isArray(raw) ? raw : []);
      setTotal(raw.total ?? list.length);
      setLastPage(raw.last_page ?? 1);
      setRows(pageNum === 1 ? list : prev => [...prev, ...list]);
      setPage(pageNum);
    } catch {
      if (pageNum === 1) setRows([]);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, [bid, trainerId, activeClientId, oldClientId, staffStatus, clientStatus, fromDate, toDate, perPage]);

  useEffect(() => { load(1); }, [load]);

  const delivered = rows.filter(r => r.client_status?.toLowerCase() === 'delivered').length;
  const noShow = rows.filter(r => r.client_status?.toLowerCase() === 'no show').length;
  const canceled = rows.filter(r => r.client_status?.toLowerCase() === 'cancel').length;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.filterGrid}>
        <View style={styles.filterCol}><Dropdown label="Branch" value={branch} options={BRANCH_OPTIONS} onChange={setBranch} /></View>
        <View style={styles.filterCol}><Dropdown label="Trainer" value={trainerId} options={trainerOptions} onChange={v => { setTrainerId(v); setActiveClientId(''); setOldClientId(''); }} /></View>
        <View style={styles.filterCol}><Dropdown label="Active Client" value={activeClientId} options={activeClientOpts} onChange={setActiveClientId} disabled={!trainerId} /></View>
        <View style={styles.filterCol}><Dropdown label="Old Client" value={oldClientId} options={oldClientOpts} onChange={setOldClientId} disabled={!trainerId} /></View>
        <View style={styles.filterCol}><DateField label="From" date={fromDate} onChange={setFromDate} /></View>
        <View style={styles.filterCol}><DateField label="To" date={toDate} onChange={setToDate} /></View>
        <View style={styles.filterCol}><Dropdown label="Trainer Status" value={staffStatus} options={STAFF_STATUS_OPTIONS.map(s => ({ label: s, value: s }))} onChange={setStaffStatus} /></View>
        <View style={styles.filterCol}><Dropdown label="Client Status" value={clientStatus} options={CLIENT_STATUS_OPTIONS.map(s => ({ label: s, value: s }))} onChange={setClientStatus} /></View>
        <View style={styles.filterCol}><Dropdown label="Per Page" value={perPage} options={['25', '50', '100'].map(s => ({ label: s, value: s }))} onChange={setPerPage} /></View>
      </View>
      <TouchableOpacity style={styles.filterGoBtn} onPress={() => load(1)}>
        <Icon name="magnify" size={16} color="#fff" />
        <Text style={styles.filterGoText}>Filter</Text>
      </TouchableOpacity>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}><Text style={styles.statLabel}>Total Records</Text><Text style={styles.statValue}>{total}</Text></View>
        <View style={styles.statCard}><Text style={styles.statLabel}>Delivered</Text><Text style={[styles.statValue, { color: '#43A047' }]}>{delivered}</Text></View>
        <View style={styles.statCard}><Text style={styles.statLabel}>Client No Show</Text><Text style={[styles.statValue, { color: '#FB8C00' }]}>{noShow}</Text></View>
        <View style={styles.statCard}><Text style={styles.statLabel}>Canceled</Text><Text style={[styles.statValue, { color: '#E63946' }]}>{canceled}</Text></View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, w.sr]}>#</Text>
              <Text style={[styles.th, w.date]}>Date</Text>
              <Text style={[styles.th, w.name]}>Trainer</Text>
              <Text style={[styles.th, w.name]}>Client</Text>
              <Text style={[styles.th, w.pkg]}>Package</Text>
              <Text style={[styles.th, w.date]}>Pkg Start</Text>
              <Text style={[styles.th, w.date]}>Pkg End</Text>
              <Text style={[styles.th, w.status]}>Trainer St.</Text>
              <Text style={[styles.th, w.status]}>Client St.</Text>
              <Text style={[styles.th, w.type]}>Validated</Text>
            </View>
            {rows.length === 0 ? (
              <View style={styles.emptyRow}><Text style={styles.emptyText}>No records found</Text></View>
            ) : rows.map((r, idx) => (
              <View key={r.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.td, w.sr]}>{(page - 1) * Number(perPage) + idx + 1}</Text>
                <Text style={[styles.td, w.date]}>{r.date}</Text>
                <Text style={[styles.td, w.name]}>{r.trainer_name}</Text>
                <Text style={[styles.td, w.name]}>{r.client_name}</Text>
                <Text style={[styles.td, w.pkg]} numberOfLines={2}>{r.package_name}</Text>
                <Text style={[styles.td, w.date]}>{r.package_start_date ?? '-'}</Text>
                <Text style={[styles.td, w.date]}>{r.package_end_date ?? '-'}</Text>
                <Text style={[styles.td, w.status, statusColor(r.staff_status)]}>{r.staff_status}</Text>
                <Text style={[styles.td, w.status, statusColor(r.client_status)]}>{r.client_status}</Text>
                <Icon name={r.validate_status === '1' ? 'check-circle' : 'circle-outline'} size={16} color={r.validate_status === '1' ? '#43A047' : '#ccc'} style={w.type} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {page < lastPage && !loading && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={() => load(page + 1)} disabled={loadingMore}>
          {loadingMore ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.loadMoreText}>Load More</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const w = StyleSheet.create({
  sr: { width: 30 },
  date: { width: 90 },
  name: { width: 120 },
  pkg: { width: 160 },
  status: { width: 80 },
  type: { width: 60 },
  action: { width: 80 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll: { padding: 12, paddingBottom: 40 },

  tabRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 4, marginHorizontal: 12, marginTop: 10, borderRadius: 10, elevation: 1 },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#E63946' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#888' },
  tabTextActive: { color: '#fff' },

  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterCol: { width: '48%' },

  ddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  ddBtnDisabled: { opacity: 0.5 },
  ddLabel: { fontSize: 10, color: '#999' },
  ddValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  ddList: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, marginTop: 2 },
  ddItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  ddItemText: { fontSize: 13, color: '#333' },
  ddItemTextSel: { color: '#E63946', fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  filterGoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginBottom: 10 },
  filterGoText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#43A047', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1E88E5', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  calcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1A1A1A', paddingVertical: 12, borderRadius: 8, marginBottom: 10 },

  totalText: { fontSize: 12, color: '#888', marginBottom: 8 },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  emptySubText: { fontSize: 12, color: '#bbb', textAlign: 'center', paddingVertical: 8 },

  tableHeader: { flexDirection: 'row', backgroundColor: '#E63946', paddingVertical: 10, paddingHorizontal: 4, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  th: { fontSize: 10, fontWeight: '800', color: '#fff', textAlign: 'center' },
  td: { fontSize: 11, color: '#333', textAlign: 'center' },

  iconBtn: { backgroundColor: '#E3F2FD', padding: 6, borderRadius: 6 },

  loadMoreBtn: { marginTop: 12, backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  loadMoreText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: { flexGrow: 1, minWidth: '30%', backgroundColor: '#fff', borderRadius: 10, padding: 12, elevation: 1 },
  statLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },

  commCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  commCardHeader: { flexDirection: 'row', alignItems: 'center' },
  commName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  commSub: { fontSize: 11, color: '#888', marginTop: 2 },
  commGross: { fontSize: 14, fontWeight: '800', color: '#1B5E20' },
  commStatus: { fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'capitalize' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  commRow2: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  commRow2Text: { fontSize: 12, color: '#555' },
  recPayBtn: { marginTop: 10, borderWidth: 1, borderColor: '#E63946', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  recPayText: { color: '#E63946', fontWeight: '700', fontSize: 12 },
  detailBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailClient: { fontSize: 12, color: '#333', flex: 1 },
  detailMeta: { fontSize: 11, color: '#888' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', maxHeight: '85%' },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: '#555', fontWeight: '600' },
  modalSubmitBtn: { flex: 1, backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontWeight: '700' },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#333' },

  dateChipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  dateChipText: { fontSize: 13, color: '#333' },
  addDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start' },
  addDateText: { color: '#E63946', fontWeight: '600', fontSize: 12 },
});

export default HRSessionCommissionPortal;
