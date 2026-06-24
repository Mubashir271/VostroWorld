import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { RootState } from '../../../redux/store';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import { getTimeSlots, addTimeSlot, updateTimeSlot } from '../../../api/employeeDashboard';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const displayTime = (d: Date) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

interface SlotRow {
  id: number;
  branchName: string;
  startTime: string;
  endTime: string;
}

const TimeSlots = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? `Branch ${branchId}`;

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTimeSlots({ branch_id: branchId, limit: 200 });
      const raw: any[] = res?.data?.data ?? [];
      setSlots(raw.map(r => ({
        id: r.id,
        branchName: r.branch_name ?? branchName,
        startTime: r.start_time,
        endTime: r.end_time,
      })));
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, branchName]);

  useEffect(() => { load(); }, [load]);

  const handlePickerConfirm = (date: Date) => {
    if (pickerFor === 'start') setStartTime(date);
    else setEndTime(date);
    setPickerFor(null);
  };

  const resetForm = () => {
    setStartTime(null);
    setEndTime(null);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!startTime || !endTime) return;
    setSubmitting(true);
    try {
      const payload = { start_time: displayTime(startTime), end_time: displayTime(endTime) };
      if (editingId) {
        // `updateTimeSlot`'s payload is unconfirmed (route exists, fields not
        // live-tested) — assumed to mirror the confirmed `addTimeSlot` contract.
        await updateTimeSlot(editingId, payload);
        dispatch(showSnackbar({ message: 'Time slot updated', type: 'success' }));
      } else {
        await addTimeSlot({ branch_id: branchId, ...payload });
        dispatch(showSnackbar({ message: 'Time slot added', type: 'success' }));
      }
      resetForm();
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? `Failed to ${editingId ? 'update' : 'add'} time slot`;
      dispatch(showSnackbar({ message: typeof msg === 'string' ? msg : 'Something went wrong', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const parseTime = (s: string): Date => {
    const [time, period] = s.split(' ');
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, parseInt(mStr, 10), 0, 0);
    return d;
  };

  const handleEdit = (slot: SlotRow) => {
    setEditingId(slot.id);
    setStartTime(parseTime(slot.startTime));
    setEndTime(parseTime(slot.endTime));
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Time Slots"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {/* Add Time Slots */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editingId ? 'Update Time Slot' : 'Add Time Slots'}</Text>
          <Text style={styles.notice}>! The Fields With *Must Required Or Fill.</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Branch Name <Text style={styles.req}>*</Text></Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{branchName}</Text>
              <Icon name="chevron-down" size={18} color="#aaa" />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Start Time <Text style={styles.req}>*</Text></Text>
              <TouchableOpacity style={styles.dateBox} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{startTime ? displayTime(startTime) : '12:30 PM'}</Text>
                <Icon name="clock-outline" size={16} color="#888" />
              </TouchableOpacity>
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>End Time <Text style={styles.req}>*</Text></Text>
              <TouchableOpacity style={styles.dateBox} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{endTime ? displayTime(endTime) : '12:30 PM'}</Text>
                <Icon name="clock-outline" size={16} color="#888" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.addBtn, (submitting || !startTime || !endTime) && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={submitting || !startTime || !endTime}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.addBtnText}>{editingId ? 'Update' : 'Add'}</Text>}
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#888' }]} onPress={resetForm}>
                <Text style={styles.addBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Time Slots table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>All Time Slots</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 48 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 110 }]}>Branch Name</Text>
                <Text style={[tbl.headerCell, { width: 110 }]}>Start Time</Text>
                <Text style={[tbl.headerCell, { width: 110 }]}>End Time</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Actions</Text>
              </View>

              {loading ? (
                <View style={styles.noRecord}><ActivityIndicator size="small" color="#C0392B" /></View>
              ) : slots.length === 0 ? (
                <View style={styles.noRecord}>
                  <Text style={styles.noRecordText}>No Record Found</Text>
                </View>
              ) : (
                slots.map((item, i) => (
                  <View key={item.id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, { width: 48 }]}>{i + 1}</Text>
                    <Text style={[tbl.cell, { width: 110 }]}>{item.branchName}</Text>
                    <Text style={[tbl.cell, { width: 110 }]}>{item.startTime}</Text>
                    <Text style={[tbl.cell, { width: 110 }]}>{item.endTime}</Text>
                    <View style={[tbl.cell, { width: 90 }]}>
                      <TouchableOpacity onPress={() => handleEdit(item)}>
                        <Text style={styles.updateText}>Update</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      <DateTimePickerModal
        isVisible={pickerFor !== null}
        mode="time"
        date={(pickerFor === 'start' ? startTime : endTime) ?? new Date()}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerFor(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  cardTitle:    { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  notice:       { fontSize: 12, color: '#E63946', marginBottom: 12 },

  field:        { marginBottom: 14 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  req:          { color: '#E63946' },

  row2:         { flexDirection: 'row', gap: 10 },

  readonlyBox:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F5F5F5' },
  readonlyText: { fontSize: 14, color: '#555' },

  dateBox:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 14, color: '#1A1A1A' },

  addBtn:       { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 30 },
  addBtnText:   { color: '#FFF', fontSize: 14, fontWeight: '700' },

  tableCard:    { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  tableHeader:  { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tableTitle:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  noRecord:     { paddingVertical: 28, alignItems: 'center', minWidth: 518 },
  noRecordText: { fontSize: 14, color: '#999' },

  updateText:   { fontSize: 12, fontWeight: '700', color: '#43A047' },
  inactiveText: { fontSize: 12, fontWeight: '700', color: '#E63946' },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { fontSize: 12, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:    { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 13, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
});

export default TimeSlots;
