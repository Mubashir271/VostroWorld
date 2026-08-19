import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
  getSwitchedTimeSlots,
  deleteSwitchedTimeSlot,
  getSPTAppointmentTrainers,
} from '../../../api/employeeDashboard';

// GET index confirmed live 2026-07-01 via HAR. Form POST and the
// "Available Bookings" / "Available Time Slots" dropdowns were NOT captured
// (user never clicked a trainer in the web admin form), so form submit is gated.

const R = '#C62828';
const PAGE_SIZE = 25;

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso?: string) => {
  if (!iso) return '—';
  const parts = iso.slice(0, 10).split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};
const today = () => fmt(new Date());

interface Trainer { id: number; name: string; }

const statusColor = (s: string) => {
  if (s === 'Approved') return '#2E7D32';
  if (s === 'Rejected') return R;
  return '#E65100';
};

const SwitchBookingTime = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  // ── form state
  const [formTrainer, setFormTrainer] = useState<Trainer | null>(null);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [reason, setReason] = useState('');
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | 'filter' | null>(null);

  // ── table filter state
  const [filterTrainer, setFilterTrainer] = useState<Trainer | null>(null);

  // ── shared trainers list
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [showFormTrainerModal, setShowFormTrainerModal] = useState(false);
  const [showFilterTrainerModal, setShowFilterTrainerModal] = useState(false);

  // ── table data
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  // ── form feedback
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const flash = (msg: string) => {
    setFormSuccess(msg);
    setTimeout(() => setFormSuccess(''), 3000);
  };

  const loadTrainers = useCallback(async () => {
    try {
      const res = await getSPTAppointmentTrainers({ branch_id: listBranchId });
      const list = res?.data ?? [];
      setTrainers((Array.isArray(list) ? list : []).map((t: any) => ({
        id: t.id,
        name: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim(),
      })));
    } catch {}
  }, [listBranchId]);

  const loadTable = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setListError('');
    try {
      const res = await getSwitchedTimeSlots({
        branch_id: listBranchId,
        trainer_id: filterTrainer ? filterTrainer.id : undefined,
        page: targetPage,
        limit: PAGE_SIZE,
      });
      const data = res?.data;
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setRows(list);
      setTotalPages(Math.max(1, res?.totalPages ?? 1));
      setTotalRecords(res?.totalRecord ?? list.length);
      setPage(targetPage);
    } catch (e: any) {
      setListError(e?.response?.data?.message ?? 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, [listBranchId, filterTrainer]);

  useFocusEffect(useCallback(() => {
    loadTrainers();
    loadTable(1);
  }, [loadTrainers, loadTable]));

  const handleSwitchTime = () => {
    Alert.alert(
      'Not Yet Confirmed',
      'The Switch Time form endpoints (Available Bookings, Available Time Slots, and the submit POST) were not captured in the HAR. Submit is disabled until they are confirmed.',
    );
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Delete this time slot switch request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteSwitchedTimeSlot(id);
            loadTable(page);
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message ?? 'Delete failed.');
          }
        },
      },
    ]);
  };

  const oldTime = (row: any) => {
    const ts = row?.detail?.time_slot;
    if (!ts) return '—';
    return `${ts.start_time} To ${ts.end_time}`;
  };

  const newTime = (row: any) => {
    const t = row?.time;
    if (!t) return '—';
    return `${t.start_time} To ${t.end_time}`;
  };

  const trainerName = (row: any) => row?.detail?.time_slot?.trainer_name ?? '—';
  const clientName = (row: any) => row?.detail?.order_detail?.client_name ?? '—';

  return (
    <View style={styles.root}>
      <AppHeader
        title="Switch Booking Time"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Switch Time Slots Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Switch Time Slots</Text>
          <Text style={styles.hint}>Fields marked * are required.</Text>

          <BranchField
            label="Branch Name *"
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

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Available Trainers *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowFormTrainerModal(true)}>
                <Text style={formTrainer ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                  {formTrainer?.name ?? 'Select Trainer'}
                </Text>
                <Icon name="chevron-down" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Available Bookings *</Text>
              <TouchableOpacity style={styles.pickerDisabled} onPress={() =>
                Alert.alert('Not Confirmed', 'Available Bookings endpoint not yet confirmed from HAR.')
              }>
                <Text style={styles.placeholder}>Select Time Slot</Text>
                <Icon name="chevron-down" size={15} color="#aaa" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Available Time Slots *</Text>
          <TouchableOpacity style={styles.pickerDisabled} onPress={() =>
            Alert.alert('Not Confirmed', 'Available Time Slots endpoint not yet confirmed from HAR.')
          }>
            <Text style={styles.placeholder}>No Time Slot Found</Text>
            <Icon name="chevron-down" size={15} color="#aaa" />
          </TouchableOpacity>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Start Date *</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={14} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>End Date *</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={14} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholder="Enter reason (optional)"
            placeholderTextColor="#aaa"
            value={reason}
            onChangeText={setReason}
          />

          {!!formError && <Text style={styles.errText}>{formError}</Text>}
          {!!formSuccess && <Text style={styles.successText}>{formSuccess}</Text>}

          <Text style={styles.noteText}>
            Note: Form submit is disabled — Available Bookings / Time Slots endpoints not yet confirmed from HAR.
          </Text>

          <TouchableOpacity style={styles.switchBtn} onPress={handleSwitchTime} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.switchBtnText}>Switch Time</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Switched Time Slots Table */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Switched Time Slots</Text>

          <View style={styles.tableControls}>
            <TouchableOpacity style={styles.filterPicker} onPress={() => setShowFilterTrainerModal(true)}>
              <Text style={filterTrainer ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                {filterTrainer?.name ?? 'Available Trainers'}
              </Text>
              <Icon name="chevron-down" size={14} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchBtn} onPress={() => loadTable(1)}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          {!!listError && <Text style={styles.errText}>{listError}</Text>}

          {loading
            ? <ActivityIndicator color={R} style={{ marginVertical: 20 }} />
            : rows.length === 0
              ? <Text style={styles.emptyText}>No records found.</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    <View style={styles.thead}>
                      {['Sr#', 'Branch Name', 'Trainer Name', 'Client Name', 'Old Time', 'New Time', 'Reason', 'Request Status', 'Date', 'Actions'].map(h => (
                        <Text key={h} style={[styles.th,
                          h === 'Sr#' ? styles.colSr :
                          h === 'Reason' ? styles.colReason :
                          h === 'Request Status' ? styles.colStatus :
                          h === 'Actions' ? styles.colActions :
                          styles.colMed
                        ]}>{h}</Text>
                      ))}
                    </View>
                    {rows.map((r, i) => (
                      <View key={r.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, styles.colSr]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                        <Text style={[styles.td, styles.colMed]}>{r.branch_name ?? '—'}</Text>
                        <Text style={[styles.td, styles.colMed]}>{trainerName(r)}</Text>
                        <Text style={[styles.td, styles.colMed]}>{clientName(r)}</Text>
                        <Text style={[styles.td, styles.colMed]}>{oldTime(r)}</Text>
                        <Text style={[styles.td, styles.colMed]}>{newTime(r)}</Text>
                        <Text style={[styles.td, styles.colReason]}>{r.reason ?? '—'}</Text>
                        <View style={[styles.td, styles.colStatus, { alignItems: 'center' }]}>
                          <View style={[styles.statusBadge, { backgroundColor: statusColor(r.request_status ?? '') }]}>
                            <Text style={styles.statusText}>{r.request_status ?? '—'}</Text>
                          </View>
                        </View>
                        <Text style={[styles.td, styles.colMed]}>{display(r.date)}</Text>
                        <TouchableOpacity
                          style={[styles.td, styles.colActions, { alignItems: 'center' }]}
                          onPress={() => handleDelete(r.id)}
                        >
                          <Icon name="delete-circle-outline" size={20} color={R} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )
          }
        </View>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={page === 1} onPress={() => loadTable(1)}>
              <Text style={[styles.pageEdge, page === 1 && styles.pageDisabled]}>First</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={page === 1} onPress={() => loadTable(page - 1)}>
              <Text style={[styles.pageArrow, page === 1 && styles.pageDisabled]}>‹</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumScroll}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <TouchableOpacity key={n} onPress={() => loadTable(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
                  <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity disabled={page === totalPages} onPress={() => loadTable(page + 1)}>
              <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabled]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={page === totalPages} onPress={() => loadTable(totalPages)}>
              <Text style={[styles.pageEdge, page === totalPages && styles.pageDisabled]}>Last</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={!!pickerFor && pickerFor !== 'filter'}
        mode="date"
        date={new Date((pickerFor === 'start' ? startDate : endDate) + 'T00:00:00')}
        onConfirm={d => {
          if (pickerFor === 'start') setStartDate(fmt(d));
          else setEndDate(fmt(d));
          setPickerFor(null);
        }}
        onCancel={() => setPickerFor(null)}
      />

      {/* Form Trainer Modal */}
      <Modal visible={showFormTrainerModal} transparent animationType="fade" onRequestClose={() => setShowFormTrainerModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowFormTrainerModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Trainer</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setFormTrainer(null); setShowFormTrainerModal(false); }}>
                <Text style={styles.dropdownItemText}>Select Trainer</Text>
              </TouchableOpacity>
              {trainers.map(t => (
                <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { setFormTrainer(t); setShowFormTrainerModal(false); }}>
                  <Text style={styles.dropdownItemText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Trainer Modal */}
      <Modal visible={showFilterTrainerModal} transparent animationType="fade" onRequestClose={() => setShowFilterTrainerModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowFilterTrainerModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Filter by Trainer</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setFilterTrainer(null); setShowFilterTrainerModal(false); }}>
                <Text style={styles.dropdownItemText}>All Trainers</Text>
              </TouchableOpacity>
              {trainers.map(t => (
                <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { setFilterTrainer(t); setShowFilterTrainerModal(false); }}>
                  <Text style={styles.dropdownItemText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default SwitchBookingTime;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  hint: { fontSize: 12, color: '#E65100', marginBottom: 10 },
  noteText: { fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 8 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 10 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  row2: { flexDirection: 'row', gap: 10 },
  col2: { flex: 1 },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerDisabled: {
    borderWidth: 1, borderColor: '#EEE', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F5F5F5',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },
  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, fontSize: 13, color: '#222',
    backgroundColor: '#FAFAFA',
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  errText: { color: R, fontSize: 13, marginTop: 8, fontWeight: '500' },
  successText: { color: '#2E7D32', fontSize: 13, marginTop: 8, fontWeight: '500' },
  switchBtn: {
    backgroundColor: R, borderRadius: 6, alignItems: 'center',
    paddingVertical: 12, marginTop: 14,
  },
  switchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  tableControls: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'center' },
  filterPicker: {
    flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  searchBtn: {
    backgroundColor: '#222', borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 16, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 11, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },
  colSr: { width: 32 },
  colMed: { width: 120 },
  colReason: { width: 160 },
  colStatus: { width: 90 },
  colActions: { width: 60 },

  statusBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  pageEdge: { fontSize: 12, fontWeight: '700', color: R },
  pageArrow: { fontSize: 18, fontWeight: '700', color: R, paddingHorizontal: 4 },
  pageDisabled: { color: '#BBB' },
  pageNumScroll: { flexGrow: 0, maxWidth: 200 },
  pageNum: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  pageNumActive: { backgroundColor: R, borderColor: R },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
