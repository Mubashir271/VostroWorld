import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
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
import { getGXClasses, addGXClass, updateGXClass, setGXClassStatus } from '../../../api/employeeDashboard';

// Confirmed live via /v1/branches/get 2026-06-24: id 1 = G 13, id 15 = F 11.
const BRANCH_OPTIONS = [
  { id: '15', label: 'F 11' },
  { id: '1', label: 'G 13' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_OPTIONS = DAYS.map(d => ({ id: d, label: d }));

// GX category code (see API_REFERENCE.md Category Code Reference).
const GX_CATEGORY = 15;

interface SlotOption {
  id: number;
  label: string;
}

interface GXClassRow {
  id: number;
  branchName: string;
  slotName: string;
  className: string;
  day: string;
  active: boolean;
}

const AddGXClass = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.user);

  const [branchId, setBranchId] = useState(String(profile?.branchId ?? 15));
  const [branchModal, setBranchModal] = useState(false);

  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slot, setSlot] = useState<SlotOption | null>(null);
  const [slotModal, setSlotModal] = useState(false);

  const [className, setClassName] = useState('');
  const [day, setDay] = useState('');
  const [dayModal, setDayModal] = useState(false);

  const [classes, setClasses] = useState<GXClassRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const branchLabel = BRANCH_OPTIONS.find(b => b.id === branchId)?.label ?? '';

  const loadSlots = useCallback(async () => {
    try {
      const res = await getPackages({ branch_id: Number(branchId), category: GX_CATEGORY, status: 1, limit: 200 });
      const raw: any[] = res?.data?.data ?? [];
      setSlots(raw.map(p => ({ id: p.id, label: p.package_name ?? `Slot #${p.id}` })));
    } catch {
      setSlots([]);
    }
  }, [branchId]);

  const loadClasses = useCallback(async () => {
    setLoadingList(true);
    try {
      // getGXClasses now calls /v1/packages/gx (HAR-confirmed 2026-08-06),
      // which returns { id, name, branch_name, time_slot: [{ start_time,
      // end_time, booking_days: [{ day, status }] }] } — there is no
      // `package`/`day`/`status` field on this shape, so the old mapping
      // below always produced blanks. NOTE: addGXClass/updateGXClass/
      // setGXClassStatus still write to the older /v1/fitness/gx-class/*
      // endpoints, which were never confirmed against this real resource —
      // treat Add/Update/Delete on this screen as unverified until a HAR
      // capture of the real GX class creation flow is available.
      const res = await getGXClasses({ branch_id: Number(branchId), limit: 200 });
      const raw: any[] = res?.data ?? [];
      setClasses(raw.map(r => {
        const days = (r.time_slot ?? [])
          .flatMap((ts: any) => (ts.booking_days ?? [])
            .filter((d: any) => d.status === 1 || d.status === '1')
            .map((d: any) => d.day))
          ;
        return {
          id: r.id,
          branchName: r.branch_name ?? branchLabel,
          slotName: r.time_slot?.[0] ? `${r.time_slot[0].start_time} To ${r.time_slot[0].end_time}` : '—',
          className: r.name ?? '—',
          day: days.length ? days.join(', ') : '—',
          active: true,
        };
      }));
    } catch {
      setClasses([]);
    } finally {
      setLoadingList(false);
    }
  }, [branchId, branchLabel]);

  useEffect(() => { loadSlots(); loadClasses(); }, [loadSlots, loadClasses]);

  const resetForm = () => {
    setSlot(null);
    setClassName('');
    setDay('');
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!slot) { dispatch(showSnackbar({ message: 'Please select a slot', type: 'error' })); return; }
    if (!className.trim()) { dispatch(showSnackbar({ message: 'Please enter a class name', type: 'error' })); return; }
    if (!day) { dispatch(showSnackbar({ message: 'Please select a day', type: 'error' })); return; }

    setSubmitting(true);
    try {
      const payload = { package_id: slot.id, name: className.trim(), day };
      if (editingId) {
        await updateGXClass(editingId, payload);
        dispatch(showSnackbar({ message: 'GX class updated', type: 'success' }));
      } else {
        await addGXClass(payload);
        dispatch(showSnackbar({ message: 'GX class added', type: 'success' }));
      }
      resetForm();
      loadClasses();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const text = typeof msg === 'string' ? msg : `Failed to ${editingId ? 'update' : 'add'} GX class`;
      dispatch(showSnackbar({ message: text, type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (row: GXClassRow) => {
    setEditingId(row.id);
    setClassName(row.className);
    setDay(row.day);
    const matched = slots.find(s => s.label === row.slotName);
    setSlot(matched ?? { id: 0, label: row.slotName });
  };

  const handleDelete = (row: GXClassRow) => {
    Alert.alert('Delete GX Class', `Deactivate "${row.className}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await setGXClassStatus(row.id, false);
            dispatch(showSnackbar({ message: 'GX class deactivated', type: 'success' }));
            if (editingId === row.id) resetForm();
            loadClasses();
          } catch {
            dispatch(showSnackbar({ message: 'Failed to deactivate GX class', type: 'error' }));
          }
        },
      },
    ]);
  };

  const slotOptions = slots.map(s => ({ id: String(s.id), label: s.label }));

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add GX Class"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{editingId ? 'Update GX Class' : 'Add GX Class'}</Text>
          </View>
          <View style={styles.form}>
            <Text style={styles.requiredNote}>! The Fields With <Text style={styles.req}>*</Text> Must Be Required Or Filled.</Text>

            <SelectionField
              label="Branch Name *"
              value={branchLabel}
              placeholder="Select Branch"
              onPress={() => setBranchModal(true)}
            />

            <SelectionField
              label="Slot Allocate *"
              value={slot?.label ?? ''}
              placeholder="Select Slot"
              onPress={() => setSlotModal(true)}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Class Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Class Name"
                placeholderTextColor="#9CA3AF"
                value={className}
                onChangeText={setClassName}
              />
            </View>

            <SelectionField
              label="Day Allocate *"
              value={day}
              placeholder="Select Day"
              onPress={() => setDayModal(true)}
            />

            <TouchableOpacity
              style={[styles.addBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.addBtnText}>{editingId ? 'Update' : 'Add'}</Text>}
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All GX Classes</Text>
            <Text style={styles.sectionCount}>{classes.length} record{classes.length !== 1 ? 's' : ''}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 38 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Branch Name</Text>
                <Text style={[tbl.headerCell, { width: 180 }]}>Slot Name</Text>
                <Text style={[tbl.headerCell, { width: 150 }]}>Class Name</Text>
                <Text style={[tbl.headerCell, { width: 100 }]}>Day</Text>
                <Text style={[tbl.headerCell, { width: 130 }]}>Actions</Text>
              </View>
              {loadingList ? (
                <View style={styles.noRecord}><ActivityIndicator size="small" color="#C0392B" /></View>
              ) : classes.length === 0 ? (
                <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
              ) : (
                classes.map((c, i) => (
                  <View key={c.id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{i + 1}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{c.branchName}</Text>
                    <Text style={[tbl.cell, { width: 180 }]} numberOfLines={1}>{c.slotName}</Text>
                    <Text style={[tbl.cell, { width: 150 }]} numberOfLines={1}>{c.className}</Text>
                    <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>{c.day}</Text>
                    <View style={[tbl.cell, { width: 130, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity style={[btn.pill, btn.update]} onPress={() => handleEdit(c)}>
                        <Icon name="pencil" size={12} color="#2A9348" />
                        <Text style={[btn.pillText, { color: '#2A9348' }]}>Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[btn.pill, btn.delete]} onPress={() => handleDelete(c)}>
                        <Icon name="trash-can-outline" size={12} color="#C0392B" />
                        <Text style={[btn.pillText, { color: '#C0392B' }]}>Delete</Text>
                      </TouchableOpacity>
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
        visible={slotModal}
        title="Select Slot"
        options={slotOptions}
        selectedValue={slot?.label ?? ''}
        onSelect={(val: string) => {
          const opt = slots.find(s => s.label === val);
          setSlot(opt ?? null);
          setSlotModal(false);
        }}
        onClose={() => setSlotModal(false)}
      />

      <SelectionModal
        visible={dayModal}
        title="Select Day"
        options={DAY_OPTIONS}
        selectedValue={day}
        onSelect={(val: string) => { setDay(val); setDayModal(false); }}
        onClose={() => setDayModal(false)}
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
  fieldContainer:   { marginBottom: 16 },
  label:            { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input:            { backgroundColor: '#FAFAFA', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14, color: '#1F2937' },
  addBtn:           { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addBtnText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cancelBtn:        { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:    { color: '#E63946', fontWeight: '600', fontSize: 13 },
  noRecord:         { paddingVertical: 24, alignItems: 'center', minWidth: 600 },
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
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  update:   { backgroundColor: '#E6F7EC' },
  delete:   { backgroundColor: '#FBEAEA' },
  pillText: { fontSize: 11, fontWeight: '700' },
});

export default AddGXClass;
