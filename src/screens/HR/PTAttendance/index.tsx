import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootState } from '../../../redux/store';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import api from '../../../api/service';

interface Trainer {
  id: number;
  name: string;
  uid?: string;
}

interface RosterClient {
  client_id: number;
  order_id: number;
  package_id: number;
  client_name: string;
  package_name: string;
  time_slot?: string;
}

interface Session {
  id: number;
  trainer_name: string;
  client_name: string;
  package_name: string;
  staff_status: string;
  client_status: string;
  date: string;
  status: string;
  trainer_id?: number;
  client_id?: number;
  order_id?: number;
  package_id?: number;
  time_slot?: string;
}

const BRANCH_OPTIONS = [
  { label: 'F 11', value: '1' },
  { label: 'G 13', value: '15' },
];

const TRAINER_STATUSES = ['Contacted', 'Delivered', 'No Show', 'Cancel'];
const CLIENT_STATUSES = ['Delivered', 'No Show', 'Cancel'];

const fmtDate = (d: Date) => d.toISOString().split('T')[0];

const Dropdown = ({ label, options, value, onChange }: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const sel = options.find(o => o.value === value)?.label ?? label;
  return (
    <View>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(v => !v)}>
        <Text style={[styles.selectBtnText, !value && { color: '#bbb' }]}>{sel}</Text>
        <Icon name="chevron-down" size={16} color="#888" />
      </TouchableOpacity>
      {open && (
        <View style={styles.inlineDropdown}>
          {options.map(opt => (
            <TouchableOpacity key={opt.value} style={styles.dropdownItem} onPress={() => { onChange(opt.value); setOpen(false); }}>
              <Text style={[styles.dropdownText, value === opt.value && styles.dropdownSelected]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const PTAttendance = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [roster, setRoster] = useState<RosterClient[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [inactiveSessions, setInactiveSessions] = useState<Session[]>([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activePage, setActivePage] = useState(1);
  const [activeLastPage, setActiveLastPage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const [inactiveLastPage, setInactiveLastPage] = useState(1);

  const [filterTrainerId, setFilterTrainerId] = useState('');

  const [formBranch, setFormBranch] = useState(String(branchId));
  const [formTrainerId, setFormTrainerId] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formOrderId, setFormOrderId] = useState('');
  const [formPackageId, setFormPackageId] = useState('');
  const [formTimeSlot, setFormTimeSlot] = useState('');
  const [formTrainerStatus, setFormTrainerStatus] = useState('');
  const [formClientStatus, setFormClientStatus] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editTrainerStatus, setEditTrainerStatus] = useState('');
  const [editClientStatus, setEditClientStatus] = useState('');

  const loadTrainers = useCallback(async () => {
    try {
      const res = await api.get('/fitness/commission-portal/hr/trainers', { params: { branch_id: formBranch || branchId } });
      const list = res.data?.data ?? res.data ?? [];
      setTrainers(Array.isArray(list) ? list : []);
    } catch {
      setTrainers([]);
    }
  }, [formBranch, branchId]);

  const loadRoster = useCallback(async (trainerId: string) => {
    if (!trainerId) { setRoster([]); return; }
    try {
      const res = await api.get('/fitness/commission-portal/trainer/roster', {
        params: { branch_id: formBranch || branchId, trainer_id: trainerId },
      });
      const list = res.data?.data ?? res.data ?? [];
      setRoster(Array.isArray(list) ? list : []);
    } catch {
      setRoster([]);
    }
  }, [formBranch, branchId]);

  const loadSessions = useCallback(async (isRefresh = false, aPage = 1, iPage = 1) => {
    if (isRefresh) setRefreshing(true);

    const bid = branchId;
    const tId = filterTrainerId || undefined;

    const [activeRes, inactiveRes] = await Promise.allSettled([
      api.get('/fitness/commission-portal/hr/sessions', {
        params: { branch_id: bid, trainer_id: tId, status: 'Active', limit: 25, page: aPage },
      }),
      api.get('/fitness/commission-portal/hr/sessions', {
        params: { branch_id: bid, trainer_id: tId, status: 'Inactive', limit: 25, page: iPage },
      }),
    ]);

    if (activeRes.status === 'fulfilled') {
      const raw = activeRes.value.data?.data ?? activeRes.value.data ?? {};
      const list: Session[] = raw.data ?? (Array.isArray(raw) ? raw : []);
      setActiveLastPage(raw.last_page ?? 1);
      setActiveSessions(aPage === 1 ? list : prev => [...prev, ...list]);
      setActivePage(aPage);
    } else if (aPage === 1) setActiveSessions([]);

    if (inactiveRes.status === 'fulfilled') {
      const raw = inactiveRes.value.data?.data ?? inactiveRes.value.data ?? {};
      const list: Session[] = raw.data ?? (Array.isArray(raw) ? raw : []);
      setInactiveLastPage(raw.last_page ?? 1);
      setInactiveSessions(iPage === 1 ? list : prev => [...prev, ...list]);
      setInactivePage(iPage);
    } else if (iPage === 1) setInactiveSessions([]);

    setRefreshing(false);
    setLoadingMore(false);
  }, [branchId, filterTrainerId]);

  const init = useCallback(async () => {
    setLoadingInit(true);
    await Promise.allSettled([loadTrainers(), loadSessions(false, 1, 1)]);
    setLoadingInit(false);
  }, [loadTrainers, loadSessions]);

  useEffect(() => { init(); }, [branchId]);

  useEffect(() => {
    if (formTrainerId) loadRoster(formTrainerId);
    else setRoster([]);
  }, [formTrainerId]);

  const handleAdd = async () => {
    if (!formTrainerId || !formClientId || !formTrainerStatus || !formClientStatus) {
      dispatch(showSnackbar({ message: 'Please fill all required fields', type: 'error' }));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/fitness/commission-portal/hr/sessions', {
        branch_id: formBranch || branchId,
        trainer_id: Number(formTrainerId),
        client_id: Number(formClientId),
        order_id: Number(formOrderId),
        package_id: Number(formPackageId),
        date: fmtDate(formDate),
        time_slot: formTimeSlot,
        staff_status: formTrainerStatus,
        client_status: formClientStatus,
      });
      dispatch(showSnackbar({ message: 'Session attendance added', type: 'success' }));
      setFormTrainerId('');
      setFormClientId('');
      setFormOrderId('');
      setFormPackageId('');
      setFormTimeSlot('');
      setFormTrainerStatus('');
      setFormClientStatus('');
      setRoster([]);
      loadSessions(false, 1, 1);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to add session';
      dispatch(showSnackbar({ message: msg, type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (session: Session) => {
    try {
      await api.put(`/fitness/commission-portal/hr/sessions/${session.id}`, {
        staff_status: editTrainerStatus || session.staff_status,
        client_status: editClientStatus || session.client_status,
      });
      dispatch(showSnackbar({ message: 'Session updated', type: 'success' }));
      setEditSession(null);
      loadSessions(false, 1, 1);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update session';
      dispatch(showSnackbar({ message: msg, type: 'error' }));
    }
  };

  const handleInactive = async (session: Session) => {
    try {
      await api.put(`/fitness/commission-portal/hr/sessions/${session.id}`, { status: 'Inactive' });
      dispatch(showSnackbar({ message: 'Session marked inactive', type: 'success' }));
      loadSessions(false, 1, 1);
    } catch {
      dispatch(showSnackbar({ message: 'Could not update status', type: 'error' }));
    }
  };

  const handleActivate = async (session: Session) => {
    try {
      await api.put(`/fitness/commission-portal/hr/sessions/${session.id}`, { status: 'Active' });
      dispatch(showSnackbar({ message: 'Session activated', type: 'success' }));
      loadSessions(false, 1, 1);
    } catch {
      dispatch(showSnackbar({ message: 'Could not activate session', type: 'error' }));
    }
  };

  const handleDelete = async (session: Session) => {
    try {
      await api.delete(`/fitness/commission-portal/hr/sessions/${session.id}`);
      dispatch(showSnackbar({ message: 'Session deleted', type: 'success' }));
      loadSessions(false, 1, 1);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete session', type: 'error' }));
    }
  };

  const trainerOptions = trainers.map(t => ({ label: t.name, value: String(t.id) }));
  const rosterOptions = roster.map(r => ({ label: r.client_name, value: String(r.client_id) }));
  const packageOptions = roster.map(r => ({ label: r.package_name, value: String(r.package_id) }));
  const timeSlotOptions = Array.from(new Set(roster.map(r => r.time_slot).filter(Boolean))).map(s => ({ label: s!, value: s! }));

  const onSelectRosterClient = (clientId: string) => {
    setFormClientId(clientId);
    const entry = roster.find(r => String(r.client_id) === clientId);
    if (entry) {
      setFormOrderId(String(entry.order_id));
      setFormPackageId(String(entry.package_id));
      if (entry.time_slot) setFormTimeSlot(entry.time_slot);
    }
  };

  const renderSessionRow = (session: Session, idx: number, isActive: boolean) => (
    <View key={session.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
      <Text style={[styles.td, styles.colSr]}>{idx + 1}</Text>
      <Text style={[styles.td, styles.colName]}>{session.trainer_name ?? '-'}</Text>
      <Text style={[styles.td, styles.colName]}>{session.client_name ?? '-'}</Text>
      <Text style={[styles.td, styles.colPkg]}>{session.package_name ?? '-'}</Text>
      <Text style={[styles.td, styles.colStatus, statusColor(session.staff_status)]}>{session.staff_status ?? '-'}</Text>
      <Text style={[styles.td, styles.colStatus, statusColor(session.client_status)]}>{session.client_status ?? '-'}</Text>
      <Text style={[styles.td, styles.colDate]}>{session.date ?? '-'}</Text>
      <View style={[styles.colActions]}>
        {isActive ? (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditSession(session); setEditTrainerStatus(session.staff_status); setEditClientStatus(session.client_status); }}>
              <Icon name="pencil" size={14} color="#1E88E5" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF3E0' }]} onPress={() => handleInactive(session)}>
              <Icon name="eye-off" size={14} color="#FB8C00" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => handleActivate(session)}>
              <Icon name="check-circle" size={14} color="#43A047" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDelete(session)}>
              <Icon name="delete" size={14} color="#E63946" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (loadingInit) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="PT Attendance"
          leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
          onLeftPress={() => navigation.goBack()}
        />
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="PT Attendance"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true, 1, 1)} colors={['#E63946']} />}
      >
        {/* Add Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Session Attendance</Text>

          <Text style={styles.fieldLabel}>Branch Name *</Text>
          <Dropdown label="Select Branch" options={BRANCH_OPTIONS} value={formBranch} onChange={setFormBranch} />

          <Text style={styles.fieldLabel}>Trainer *</Text>
          <Dropdown label="Select Trainer" options={trainerOptions} value={formTrainerId} onChange={setFormTrainerId} />

          <Text style={styles.fieldLabel}>Client *</Text>
          <Dropdown label="Select Client" options={rosterOptions} value={formClientId} onChange={onSelectRosterClient} />

          {timeSlotOptions.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Time</Text>
              <Dropdown label="Select Time" options={timeSlotOptions} value={formTimeSlot} onChange={setFormTimeSlot} />
            </>
          )}

          <Text style={styles.fieldLabel}>Trainer Attendance *</Text>
          <Dropdown
            label="Trainer Status"
            options={TRAINER_STATUSES.map(s => ({ label: s, value: s }))}
            value={formTrainerStatus}
            onChange={setFormTrainerStatus}
          />

          <Text style={styles.fieldLabel}>Client Attendance *</Text>
          <Dropdown
            label="Client Status"
            options={CLIENT_STATUSES.map(s => ({ label: s, value: s }))}
            value={formClientStatus}
            onChange={setFormClientStatus}
          />

          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar" size={14} color="#555" />
            <Text style={styles.selectBtnText}>{fmtDate(formDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, d) => { setShowDatePicker(false); if (d) setFormDate(d); }}
            />
          )}

          <TouchableOpacity style={[styles.addBtn, submitting && { opacity: 0.7 }]} onPress={handleAdd} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>Add</Text>}
          </TouchableOpacity>
        </View>

        {/* Edit Modal inline */}
        {editSession && (
          <View style={styles.editCard}>
            <Text style={styles.formTitle}>Update Session #{editSession.id}</Text>
            <Text style={styles.fieldLabel}>Trainer Attendance</Text>
            <Dropdown
              label="Trainer Status"
              options={TRAINER_STATUSES.map(s => ({ label: s, value: s }))}
              value={editTrainerStatus}
              onChange={setEditTrainerStatus}
            />
            <Text style={styles.fieldLabel}>Client Attendance</Text>
            <Dropdown
              label="Client Status"
              options={CLIENT_STATUSES.map(s => ({ label: s, value: s }))}
              value={editClientStatus}
              onChange={setEditClientStatus}
            />
            <View style={styles.editBtnRow}>
              <TouchableOpacity style={[styles.addBtn, { flex: 1, marginRight: 6 }]} onPress={() => handleUpdate(editSession)}>
                <Text style={styles.addBtnText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { flex: 1, backgroundColor: '#888' }]} onPress={() => setEditSession(null)}>
                <Text style={styles.addBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Filter */}
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Dropdown
              label="Filter by Trainer"
              options={[{ label: 'All Trainers', value: '' }, ...trainerOptions]}
              value={filterTrainerId}
              onChange={v => { setFilterTrainerId(v); loadSessions(false, 1, 1); }}
            />
          </View>
        </View>

        {/* Active Sessions */}
        <Text style={styles.sectionTitle}>Active Session Attendance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colSr]}>#</Text>
              <Text style={[styles.th, styles.colName]}>Trainer</Text>
              <Text style={[styles.th, styles.colName]}>Client</Text>
              <Text style={[styles.th, styles.colPkg]}>Package</Text>
              <Text style={[styles.th, styles.colStatus]}>T.Att</Text>
              <Text style={[styles.th, styles.colStatus]}>C.Att</Text>
              <Text style={[styles.th, styles.colDate]}>Date</Text>
              <Text style={[styles.th, styles.colActions]}>Actions</Text>
            </View>
            {activeSessions.length === 0 ? (
              <View style={styles.emptyRow}>
                <Icon name="dumbbell" size={40} color="#ddd" />
                <Text style={styles.emptyText}>No active sessions</Text>
              </View>
            ) : (
              activeSessions.map((s, i) => renderSessionRow(s, i, true))
            )}
          </View>
        </ScrollView>
        {activePage < activeLastPage && (
          <TouchableOpacity style={styles.loadMoreBtn} onPress={() => { setLoadingMore(true); loadSessions(false, activePage + 1, inactivePage); }} disabled={loadingMore}>
            {loadingMore ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.loadMoreText}>Load More Active</Text>}
          </TouchableOpacity>
        )}

        {/* Inactive Sessions */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Inactive Session Attendance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={[styles.tableHeader, { backgroundColor: '#607D8B' }]}>
              <Text style={[styles.th, styles.colSr]}>#</Text>
              <Text style={[styles.th, styles.colName]}>Trainer</Text>
              <Text style={[styles.th, styles.colName]}>Client</Text>
              <Text style={[styles.th, styles.colPkg]}>Package</Text>
              <Text style={[styles.th, styles.colStatus]}>T.Att</Text>
              <Text style={[styles.th, styles.colStatus]}>C.Att</Text>
              <Text style={[styles.th, styles.colDate]}>Date</Text>
              <Text style={[styles.th, styles.colActions]}>Actions</Text>
            </View>
            {inactiveSessions.length === 0 ? (
              <View style={styles.emptyRow}>
                <Icon name="dumbbell" size={40} color="#ddd" />
                <Text style={styles.emptyText}>No inactive sessions</Text>
              </View>
            ) : (
              inactiveSessions.map((s, i) => renderSessionRow(s, i, false))
            )}
          </View>
        </ScrollView>
        {inactivePage < inactiveLastPage && (
          <TouchableOpacity style={[styles.loadMoreBtn, { backgroundColor: '#607D8B' }]} onPress={() => { setLoadingMore(true); loadSessions(false, activePage, inactivePage + 1); }} disabled={loadingMore}>
            {loadingMore ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.loadMoreText}>Load More Inactive</Text>}
          </TouchableOpacity>
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
  selectBtnText: { fontSize: 14, color: '#333', flex: 1 },
  inlineDropdown: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, marginTop: 4, zIndex: 100 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownText: { fontSize: 14, color: '#333' },
  dropdownSelected: { color: '#E63946', fontWeight: '700' },
  addBtn: { backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  editBtnRow: { flexDirection: 'row', marginTop: 16 },
  filterRow: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E63946', paddingVertical: 10, paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f5', alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  th: { fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' },
  td: { fontSize: 11, color: '#333', textAlign: 'center' },
  colSr: { width: 28 },
  colName: { width: 100 },
  colPkg: { width: 110 },
  colStatus: { width: 70 },
  colDate: { width: 90 },
  colActions: { width: 70, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  actionBtn: { padding: 5, backgroundColor: '#E3F2FD', borderRadius: 6 },
  emptyRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptyText: { fontSize: 13, color: '#aaa', marginTop: 8 },
  loadMoreBtn: { marginTop: 10, backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  loadMoreText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statusDelivered: { color: '#43A047', fontWeight: '700' },
  statusNoShow: { color: '#E63946', fontWeight: '700' },
  statusCancel: { color: '#FB8C00', fontWeight: '700' },
  statusContacted: { color: '#1E88E5', fontWeight: '700' },
});

export default PTAttendance;
