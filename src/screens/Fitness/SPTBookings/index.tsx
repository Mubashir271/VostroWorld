import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
  getSPTBookingTrainers,
  getSPTSlots,
  getClientNames,
  getSPTBookings,
} from '../../../api/employeeDashboard';

interface Trainer { id: number; name: string; }
interface Slot { id: number; name: string; }
interface Client { id: number; name: string; phone?: string; }
interface BookingRow {
  id: number;
  branch_name?: string;
  customer_name?: string;
  client_name?: string;
  trainer_name?: string;
  slot_name?: string;
  package_name?: string;
  session_count?: number;
  total_sessions?: number;
  start_date?: string;
  end_date?: string;
}

const display = (iso?: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

const LIMITS = [25, 50, 100];

const COLS = [
  { key: 'sr', label: 'Sr#', width: 40 },
  { key: 'branch', label: 'Branch Name', width: 90 },
  { key: 'client', label: 'Client Name', width: 140 },
  { key: 'trainer', label: 'Trainer Name', width: 130 },
  { key: 'slot', label: 'Slot Name', width: 170 },
  { key: 'sessions', label: 'Total Sessions', width: 90 },
  { key: 'start', label: 'Start Date', width: 90 },
  { key: 'end', label: 'End Date', width: 90 },
  { key: 'action', label: 'Action', width: 70 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);
const PAGE_SIZE = 25;

const SPTBookings = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  // dropdowns data
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // filter state
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientModal, setClientModal] = useState(false);

  const [trainerId, setTrainerId] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerModal, setTrainerModal] = useState(false);

  const [slotId, setSlotId] = useState('');
  const [slotName, setSlotName] = useState('');
  const [slotModal, setSlotModal] = useState(false);

  const [limit, setLimit] = useState(PAGE_SIZE);
  const [limitModal, setLimitModal] = useState(false);

  // results
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const loadTrainers = useCallback(async () => {
    try {
      const res = await getSPTBookingTrainers({ branch_id: listBranchId });
      const list = res?.data ?? [];
      setTrainers((Array.isArray(list) ? list : []).map((t: any) => ({
        id: t.id,
        name: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim(),
      })));
    } catch {}
  }, [listBranchId]);

  const loadSlots = useCallback(async (uid?: number) => {
    setSlotsLoading(true);
    try {
      const res = await getSPTSlots({ branch_id: listBranchId, user_id: uid });
      const list = res?.data ?? [];
      setSlots(Array.isArray(list) ? list.map((s: any) => ({ id: s.id, name: s.name })) : []);
    } catch {}
    finally { setSlotsLoading(false); }
  }, [listBranchId]);

  const loadClients = useCallback(async () => {
    try {
      const res = await getClientNames({ branch_id: listBranchId });
      const list = res?.data ?? [];
      setClients((Array.isArray(list) ? list : []).map((c: any) => ({
        id: c.id,
        name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
        phone: c.phone,
      })));
    } catch {}
  }, [listBranchId]);

  useFocusEffect(useCallback(() => {
    loadTrainers();
    loadSlots();
    loadClients();
  }, [loadTrainers, loadSlots, loadClients]));

  const onTrainerSelect = async (id: string, name: string) => {
    setTrainerId(id);
    setTrainerName(name);
    setSlotId('');
    setSlotName('');
    await loadSlots(id ? Number(id) : undefined);
  };

  const search = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSPTBookings({
        branch_id: listBranchId,
        page: 1,
        limit: 500,
        user_id: trainerId || '',
        package_id: slotId || '',
        client_id: clientId || '',
      });
      const data: BookingRow[] = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
      setFetched(true);
      setPage(1);
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 404 || s === 422) { setRows([]); setFetched(true); }
      else setError(e?.response?.data?.message ?? 'Failed to load SPT bookings.');
    } finally {
      setLoading(false);
    }
  }, [listBranchId, trainerId, slotId, clientId]);

  useEffect(() => { setPage(1); }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const pagedRows = rows.slice((page - 1) * limit, page * limit);

  const filteredClients = clientSearch.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients;

  return (
    <View style={styles.root}>
      <AppHeader
        title="SPT Bookings"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New SPT Bookings</Text>

          {/* Row 1: Branch + Client */}
          <View style={styles.row2}>
            <View style={styles.col2}>
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
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Client Name</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setClientModal(true)}>
                <Text style={clientId ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                  {clientId ? clients.find(c => String(c.id) === clientId)?.name ?? 'Client' : 'Enter Client Name'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Trainer + Slot */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Available Trainers</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTrainerModal(true)}>
                <Text style={trainerId ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                  {trainerName || 'Select Trainer'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Slots</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setSlotModal(true)}>
                {slotsLoading
                  ? <ActivityIndicator size="small" color={R} style={{ flex: 1 }} />
                  : <Text style={slotId ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                      {slotName || 'Select Slot'}
                    </Text>
                }
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Toolbar: Search + Limit + PDF */}
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.searchBtn} onPress={search}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.searchBtnText}>Search</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.limitBtn} onPress={() => setLimitModal(true)}>
              <Text style={styles.limitText}>{limit}</Text>
              <Icon name="chevron-down" size={14} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.pdfBtn}>
              <Icon name="file-pdf-box" size={14} color="#fff" />
              <Text style={styles.pdfBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>

          {!!error && <Text style={styles.errText}>{error}</Text>}
        </View>

        {/* Results table */}
        {fetched && (
          <View style={styles.card}>
            {loading
              ? <ActivityIndicator color={R} style={{ marginVertical: 30 }} />
              : rows.length === 0
                ? <Text style={styles.emptyText}>No Record Found</Text>
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ width: TABLE_W }}>
                      <View style={styles.thead}>
                        {COLS.map(c => (
                          <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                        ))}
                      </View>
                      {pagedRows.map((r, i) => (
                        <View key={r.id ?? i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: COLS[0].width }]}>{(page - 1) * limit + i + 1}</Text>
                          <Text style={[styles.td, { width: COLS[1].width }]} numberOfLines={1}>{r.branch_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]} numberOfLines={1}>{r.customer_name ?? r.client_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[3].width, textAlign: 'left' }]} numberOfLines={1}>{r.trainer_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[4].width, textAlign: 'left' }]} numberOfLines={1}>{r.slot_name ?? r.package_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[5].width }]}>{r.total_sessions ?? r.session_count ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[6].width }]}>{display(r.start_date)}</Text>
                          <Text style={[styles.td, { width: COLS[7].width }]}>{display(r.end_date)}</Text>
                          <Text style={[styles.td, { width: COLS[8].width, color: R, fontWeight: '700' }]}>View</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
            }
            {!loading && rows.length > limit && (
              <View style={styles.pagination}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage(1)}>
                  <Text style={[styles.pageEdge, page === 1 && styles.pageDisabled]}>First</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage(p => Math.max(1, p - 1))}>
                  <Text style={[styles.pageArrow, page === 1 && styles.pageDisabled]}>‹</Text>
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumScroll}>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
                    <TouchableOpacity key={n} onPress={() => setPage(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
                      <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(p => Math.min(totalPages, p + 1))}>
                  <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabled]}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(totalPages)}>
                  <Text style={[styles.pageEdge, page === totalPages && styles.pageDisabled]}>Last</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Client modal with search */}
      <Modal visible={clientModal} transparent animationType="slide" onRequestClose={() => setClientModal(false)}>
        <View style={styles.slideSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Client</Text>
            <TouchableOpacity onPress={() => setClientModal(false)}>
              <Icon name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search client..."
            placeholderTextColor="#aaa"
            value={clientSearch}
            onChangeText={setClientSearch}
            autoFocus
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setClientId(''); setClientSearch(''); setClientModal(false); }}
            >
              <Text style={styles.dropdownItemText}>All Clients</Text>
            </TouchableOpacity>
            {filteredClients.slice(0, 100).map(c => (
              <TouchableOpacity
                key={c.id}
                style={styles.dropdownItem}
                onPress={() => { setClientId(String(c.id)); setClientSearch(''); setClientModal(false); }}
              >
                <Text style={styles.dropdownItemText}>{c.name}</Text>
                {c.phone ? <Text style={styles.dropdownItemSub}>{c.phone}</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Trainer modal */}
      <Modal visible={trainerModal} transparent animationType="fade" onRequestClose={() => setTrainerModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setTrainerModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Trainer</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { onTrainerSelect('', ''); setTrainerModal(false); }}>
                <Text style={styles.dropdownItemText}>All Trainers</Text>
              </TouchableOpacity>
              {trainers.map(t => (
                <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { onTrainerSelect(String(t.id), t.name); setTrainerModal(false); }}>
                  <Text style={styles.dropdownItemText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Slot modal */}
      <Modal visible={slotModal} transparent animationType="fade" onRequestClose={() => setSlotModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSlotModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Slot</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSlotId(''); setSlotName(''); setSlotModal(false); }}>
                <Text style={styles.dropdownItemText}>All Slots</Text>
              </TouchableOpacity>
              {slots.map(s => (
                <TouchableOpacity key={s.id} style={styles.dropdownItem} onPress={() => { setSlotId(String(s.id)); setSlotName(s.name); setSlotModal(false); }}>
                  <Text style={styles.dropdownItemText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Limit modal */}
      <Modal visible={limitModal} transparent animationType="fade" onRequestClose={() => setLimitModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setLimitModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Per Page</Text>
            {LIMITS.map(l => (
              <TouchableOpacity key={l} style={styles.dropdownItem} onPress={() => { setLimit(l); setPage(1); setLimitModal(false); }}>
                <Text style={[styles.dropdownItemText, limit === l && { color: R, fontWeight: '700' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default SPTBookings;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  errText: { color: R, fontSize: 13, marginBottom: 6, fontWeight: '500' },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  col2: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
    minHeight: 42, justifyContent: 'center',
  },
  staticText: { fontSize: 13, color: '#444' },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    minHeight: 42,
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },

  toolbar: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  searchBtn: {
    backgroundColor: '#1A1A1A', borderRadius: 6,
    paddingHorizontal: 20, paddingVertical: 10, minWidth: 80, alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  limitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA',
  },
  limitText: { fontSize: 13, color: '#333' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: R, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9,
  },
  pdfBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 30, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 9 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  pageEdge: { fontSize: 12, fontWeight: '700', color: R },
  pageArrow: { fontSize: 16, fontWeight: '700', color: R, paddingHorizontal: 4 },
  pageDisabled: { color: '#BBB' },
  pageNumScroll: { flexGrow: 0, maxWidth: 220 },
  pageNum: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  pageNumActive: { backgroundColor: R, borderColor: R },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemSub: { fontSize: 11, color: '#999', marginTop: 2 },

  slideSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '80%', padding: 16,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontWeight: '700', fontSize: 16, color: '#222' },
  searchInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#222', backgroundColor: '#FAFAFA', marginBottom: 8,
  },
});
