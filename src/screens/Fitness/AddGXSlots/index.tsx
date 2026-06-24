import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { SelectionField } from '../../../components/SelectionField';
import { SelectionModal } from '../../../components/SelectionModal';
import { RootState } from '../../../redux/store';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import { getPackages } from '../../../api/dashboard';
import { getTimeSlots, getGXTrainers, addGXSlot } from '../../../api/employeeDashboard';

// addGXSlot() is wired and ready; flip ADD_ENABLED once the real payload
// contract is confirmed (see the function's comment in employeeDashboard.ts
// and PROJECT_STATUS.md's "2026-06-24 — repeat incident" note).
const ADD_ENABLED = false;

// Confirmed live via /v1/branches/get 2026-06-24: id 1 = G 13, id 15 = F 11.
const BRANCH_OPTIONS = [
  { id: '15', label: 'F 11' },
  { id: '1', label: 'G 13' },
];

// GX category code (see API_REFERENCE.md Category Code Reference).
const GX_CATEGORY = 15;

interface Option { id: string; label: string; }

interface SlotRow {
  id: number;
  branchName: string;
  slotName: string;
  trainer: string;
  sessionCount: number;
  bookingCapacity: number;
  timeSlot: string;
  days: string;
  active: boolean;
}

const fmtTimeSlot = (ts: any[]): string => {
  if (!ts?.length) return '—';
  return ts.map(t => `${t.start_time} To ${t.end_time}`).join(', ');
};

const fmtDays = (ts: any[]): string => {
  if (!ts?.length) return '—';
  const days = ts.flatMap(t => (t.booking_days ?? []).map((d: any) => d.day));
  return days.length ? days.join(', ') : '—';
};

const AddGXSlots = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.user);

  const [branchId, setBranchId] = useState(String(profile?.branchId ?? 15));
  const [branchModal, setBranchModal] = useState(false);

  const [trainers, setTrainers] = useState<Option[]>([]);
  const [trainer, setTrainer] = useState<Option | null>(null);
  const [trainerModal, setTrainerModal] = useState(false);

  const [timeSlots, setTimeSlots] = useState<Option[]>([]);
  const [timeSlot, setTimeSlot] = useState<Option | null>(null);
  const [timeSlotModal, setTimeSlotModal] = useState(false);

  const [slotName, setSlotName] = useState('');
  const [bookingSpace, setBookingSpace] = useState('');
  const [sessionCount, setSessionCount] = useState('');

  const [rows, setRows] = useState<SlotRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const branchLabel = BRANCH_OPTIONS.find(b => b.id === branchId)?.label ?? '';

  const loadTrainers = useCallback(async () => {
    try {
      const res = await getGXTrainers({ branch_id: Number(branchId) });
      const raw: any[] = res?.data ?? res ?? [];
      setTrainers((Array.isArray(raw) ? raw : []).map(t => ({ id: String(t.id), label: t.name ?? t.full_name ?? `Trainer #${t.id}` })));
    } catch {
      setTrainers([]);
    }
  }, [branchId]);

  const loadTimeSlots = useCallback(async () => {
    try {
      const res = await getTimeSlots({ branch_id: Number(branchId), limit: 200 });
      const raw: any[] = res?.data?.data ?? [];
      setTimeSlots(raw.map(t => ({ id: String(t.id), label: `${t.start_time} To ${t.end_time}` })));
    } catch {
      setTimeSlots([]);
    }
  }, [branchId]);

  const loadSlots = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await getPackages({ branch_id: Number(branchId), category: GX_CATEGORY, limit: 200 });
      const raw: any[] = res?.data?.data ?? [];
      setRows(raw.map((p: any) => ({
        id: p.id,
        branchName: p.branches_name ?? branchLabel,
        slotName: p.package_name ?? '—',
        trainer: [p.user_first_name, p.user_last_name].filter(Boolean).join(' ') || '—',
        sessionCount: p.session_count ?? 0,
        bookingCapacity: p.booking_capacity ?? 0,
        timeSlot: fmtTimeSlot(p.time_slot),
        days: fmtDays(p.time_slot),
        active: String(p.status) === '1',
      })));
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [branchId, branchLabel]);

  useEffect(() => { loadTrainers(); loadTimeSlots(); loadSlots(); }, [loadTrainers, loadTimeSlots, loadSlots]);

  const resetForm = () => {
    setTrainer(null);
    setTimeSlot(null);
    setSlotName('');
    setBookingSpace('');
    setSessionCount('');
  };

  const handleAdd = async () => {
    if (!ADD_ENABLED) return;
    if (!trainer) { dispatch(showSnackbar({ message: 'Please select a trainer', type: 'error' })); return; }
    if (!slotName.trim()) { dispatch(showSnackbar({ message: 'Please enter a slot name', type: 'error' })); return; }
    if (!timeSlot) { dispatch(showSnackbar({ message: 'Please select a time slot', type: 'error' })); return; }
    if (!bookingSpace.trim()) { dispatch(showSnackbar({ message: 'Please enter booking space', type: 'error' })); return; }
    if (!sessionCount.trim()) { dispatch(showSnackbar({ message: 'Please enter number of sessions', type: 'error' })); return; }

    setSubmitting(true);
    try {
      await addGXSlot({
        branch_id: Number(branchId),
        package_name: slotName.trim(),
        category: '15',
        user_id: Number(trainer.id),
        booking_capacity: Number(bookingSpace),
        session_count: Number(sessionCount),
        time_id: Number(timeSlot.id),
      });
      dispatch(showSnackbar({ message: 'GX slot added', type: 'success' }));
      resetForm();
      loadSlots();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      dispatch(showSnackbar({ message: typeof msg === 'string' ? msg : 'Failed to add GX slot', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add GX Slot"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add GX Slot</Text>
          </View>
          <View style={styles.form}>
            <Text style={styles.requiredNote}>! The Fields With <Text style={styles.req}>*</Text> Must Be Required Or Filled.</Text>
            {/* {!ADD_ENABLED && (
              <Text style={styles.disabledNote}>
                Adding slots is disabled until the backend's package-creation contract is confirmed (it crashed on a minimal test payload during discovery — see PROJECT_STATUS.md). The form below is fully wired and ready to enable.
              </Text>
            )} */}

            <SelectionField
              label="Branch Name *"
              value={branchLabel}
              placeholder="Select Branch"
              onPress={() => ADD_ENABLED && setBranchModal(true)}
            />

            <SelectionField
              label="Trainer Allocate *"
              value={trainer?.label ?? ''}
              placeholder="Select Trainer"
              onPress={() => ADD_ENABLED && setTrainerModal(true)}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Slot Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Slot Name"
                placeholderTextColor="#9CA3AF"
                value={slotName}
                onChangeText={setSlotName}
                editable={ADD_ENABLED}
              />
            </View>

            <SelectionField
              label="Available Time Slots *"
              value={timeSlot?.label ?? ''}
              placeholder="Select Time Slot"
              onPress={() => ADD_ENABLED && setTimeSlotModal(true)}
            />

            <View style={styles.row2}>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.label}>Booking Space *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Booking Space"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={bookingSpace}
                  onChangeText={setBookingSpace}
                  editable={ADD_ENABLED}
                />
              </View>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.label}>Number of Session *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Session Count"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={sessionCount}
                  onChangeText={setSessionCount}
                  editable={ADD_ENABLED}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.addBtn, (!ADD_ENABLED || submitting) && { opacity: 0.5 }]}
              onPress={handleAdd}
              disabled={!ADD_ENABLED || submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.addBtnText}>Add</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All GX Slots</Text>
            <Text style={styles.sectionCount}>{rows.length} record{rows.length !== 1 ? 's' : ''}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 38 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Branch Name</Text>
                <Text style={[tbl.headerCell, { width: 170 }]}>Slot Name</Text>
                <Text style={[tbl.headerCell, { width: 130 }]}>Trainer</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Sessions</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Booking</Text>
                <Text style={[tbl.headerCell, { width: 150 }]}>Time Slot</Text>
                <Text style={[tbl.headerCell, { width: 180 }]}>Days</Text>
                <Text style={[tbl.headerCell, { width: 80 }]}>Status</Text>
              </View>
              {loadingList ? (
                <View style={styles.noRecord}><ActivityIndicator size="small" color="#C0392B" /></View>
              ) : rows.length === 0 ? (
                <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
              ) : (
                rows.map((r, i) => (
                  <View key={r.id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{i + 1}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{r.branchName}</Text>
                    <Text style={[tbl.cell, { width: 170 }]} numberOfLines={1}>{r.slotName}</Text>
                    <Text style={[tbl.cell, { width: 130 }]} numberOfLines={1}>{r.trainer}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{r.sessionCount}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{r.bookingCapacity}</Text>
                    <Text style={[tbl.cell, { width: 150 }]} numberOfLines={1}>{r.timeSlot}</Text>
                    <Text style={[tbl.cell, { width: 180 }]} numberOfLines={1}>{r.days}</Text>
                    <View style={[tbl.cell, { width: 80 }]}>
                      <View style={[btn.statusBadge, r.active ? btn.statusActive : btn.statusInactive]}>
                        <Text style={[btn.statusText, { color: r.active ? '#2A9348' : '#C0392B' }]}>{r.active ? 'Active' : 'Inactive'}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <SelectionModal
        visible={branchModal}
        title="Select Branch"
        options={BRANCH_OPTIONS}
        selectedValue={branchLabel}
        onSelect={(val: string) => {
          const opt = BRANCH_OPTIONS.find(b => b.label === val);
          if (opt) setBranchId(opt.id);
          setBranchModal(false);
        }}
        onClose={() => setBranchModal(false)}
      />

      <SelectionModal
        visible={trainerModal}
        title="Select Trainer"
        options={trainers}
        selectedValue={trainer?.label ?? ''}
        onSelect={(val: string) => {
          setTrainer(trainers.find(t => t.label === val) ?? null);
          setTrainerModal(false);
        }}
        onClose={() => setTrainerModal(false)}
      />

      <SelectionModal
        visible={timeSlotModal}
        title="Select Time Slot"
        options={timeSlots}
        selectedValue={timeSlot?.label ?? ''}
        onSelect={(val: string) => {
          setTimeSlot(timeSlots.find(t => t.label === val) ?? null);
          setTimeSlotModal(false);
        }}
        onClose={() => setTimeSlotModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F7F8FA' },
  scroll:           { padding: 12, paddingBottom: 30 },
  section:          { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  sectionCount:     { fontSize: 12, color: '#888' },
  form:             { padding: 14 },
  requiredNote:     { fontSize: 12, color: '#888', marginBottom: 12 },
  req:              { color: '#E63946' },
  disabledNote:     { fontSize: 12, color: '#B45309', backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 8, padding: 10, marginBottom: 14, lineHeight: 17 },
  fieldContainer:   { marginBottom: 16 },
  label:            { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input:            { backgroundColor: '#FAFAFA', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14, color: '#1F2937' },
  row2:             { flexDirection: 'row', gap: 10 },
  addBtn:           { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addBtnText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
  noRecord:         { paddingVertical: 24, alignItems: 'center', minWidth: 900 },
  noRecordText:     { fontSize: 13, color: '#999' },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:    { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:  { color: '#888' },
});

const btn = StyleSheet.create({
  statusBadge:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  statusActive:  { backgroundColor: '#E6F7EC' },
  statusInactive:{ backgroundColor: '#FBEAEA' },
  statusText:    { fontSize: 11, fontWeight: '700' },
});

export default AddGXSlots;
