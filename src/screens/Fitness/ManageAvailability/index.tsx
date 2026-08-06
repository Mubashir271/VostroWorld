import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getAppointmentTrainers } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const TIME_SLOTS = [
  '07:00 AM To 08:00 AM', '08:00 AM To 09:00 AM', '09:00 AM To 10:00 AM',
  '10:00 AM To 11:00 AM', '11:00 AM To 12:00 PM', '12:00 PM To 01:00 PM',
  '01:00 PM To 02:00 PM', '02:00 PM To 03:00 PM', '03:00 PM To 04:00 PM',
  '04:00 PM To 05:00 PM', '05:00 PM To 06:00 PM', '06:00 PM To 07:00 PM',
  '07:00 PM To 08:00 PM', '08:00 PM To 09:00 PM', '09:00 PM To 10:00 PM',
  '10:00 PM To 11:00 PM',
];

const trainerLabel = (t: any) => t?.full_name || `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim() || '—';

interface AssignedRow {
  id: number;
  branchName: string;
  trainerName: string;
  slots: string[];
}

const ManageAvailability = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const branchName = profile?.branchName ?? `Branch ${branchId}`;

  const [trainers, setTrainers] = useState<any[]>([]);
  const [trainer, setTrainer] = useState<any>(null);
  const [trainerDropOpen, setTrainerDropOpen] = useState(false);
  const [trainerError, setTrainerError] = useState(false);

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const [assigned, setAssigned] = useState<AssignedRow[]>([]);

  useEffect(() => {
    getAppointmentTrainers({ branch_id: branchId })
      .then(res => setTrainers(res.data?.data ?? []))
      .catch(() => setTrainers([]));
  }, [branchId]);

  const toggleSlot = (slot: string) => {
    setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  };

  const handleAdd = () => {
    if (!trainer) { setTrainerError(true); return; }
    if (selectedSlots.length === 0) return;
    setTrainerError(false);
    setAssigned(prev => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map(r => r.id)) + 1 : 1,
        branchName,
        trainerName: trainerLabel(trainer),
        slots: selectedSlots,
      },
    ]);
    setTrainer(null);
    setSelectedSlots([]);
  };

  const removeAssigned = (id: number) => setAssigned(prev => prev.filter(r => r.id !== id));

  return (
    <View style={styles.container}>
      <AppHeader
        title="Manage Availability"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {/* Assign Time Slots */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assign Time Slots</Text>
          <Text style={styles.notice}>! The Fields With *Must Required Or Fill.</Text>

          <View style={styles.row2}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Branch Name <Text style={styles.req}>*</Text></Text>
              <View style={styles.readonlyBox}>
                <Text style={styles.readonlyText}>{branchName}</Text>
                <Icon name="chevron-down" size={18} color="#aaa" />
              </View>
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Available Trainers <Text style={styles.req}>*</Text></Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setTrainerDropOpen(v => !v)}>
                <Text style={styles.dropdownText} numberOfLines={1}>{trainer ? trainerLabel(trainer) : 'Select Trainer'}</Text>
                <Icon name={trainerDropOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
              </TouchableOpacity>
              {trainerDropOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {trainers.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.dropdownItem, trainer?.id === t.id && styles.dropdownItemActive]}
                        onPress={() => { setTrainer(t); setTrainerDropOpen(false); setTrainerError(false); }}
                      >
                        <Text style={[styles.dropdownItemText, trainer?.id === t.id && styles.dropdownItemTextActive]}>{trainerLabel(t)}</Text>
                        {trainer?.id === t.id && <Icon name="check" size={14} color="#E63946" />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {trainerError && <Text style={styles.errorText}>Trainer is required</Text>}
            </View>
          </View>

          <Text style={styles.fieldLabel}>Available Time Slots <Text style={styles.req}>*</Text></Text>
          <View style={styles.slotsGrid}>
            {TIME_SLOTS.map(slot => (
              <TouchableOpacity key={slot} style={styles.slotItem} onPress={() => toggleSlot(slot)}>
                <Icon
                  name={selectedSlots.includes(slot) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={18}
                  color={selectedSlots.includes(slot) ? '#E63946' : '#999'}
                />
                <Text style={styles.slotLabel}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Assigned table */}
        <View style={styles.tableCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 48 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Branch Name</Text>
                <Text style={[tbl.headerCell, { width: 140 }]}>Trainer Name</Text>
                <Text style={[tbl.headerCell, { width: 320 }]}>Assigned Time Slots</Text>
                <Text style={[tbl.headerCell, { width: 140 }]}>Actions</Text>
              </View>

              {assigned.length === 0 ? (
                <View style={styles.noRecord}>
                  <Text style={styles.noRecordText}>No Record Found</Text>
                </View>
              ) : (
                assigned.map((item, i) => (
                  <View key={item.id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, { width: 48 }]}>{i + 1}</Text>
                    <Text style={[tbl.cell, { width: 90 }]}>{item.branchName}</Text>
                    <Text style={[tbl.cell, tbl.cellRed, { width: 140 }]} numberOfLines={1}>{item.trainerName}</Text>
                    <Text style={[tbl.cell, { width: 320 }]}>{item.slots.join(' | ')}</Text>
                    <View style={[tbl.cell, { width: 140, flexDirection: 'row', gap: 14 }]}>
                      <TouchableOpacity>
                        <Text style={styles.updateText}>Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeAssigned(item.id)}>
                        <Text style={styles.deleteText}>Delete</Text>
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
  errorText:    { fontSize: 12, color: '#E63946', marginTop: 4 },

  row2:         { flexDirection: 'row', gap: 10 },

  readonlyBox:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F5F5F5' },
  readonlyText: { fontSize: 14, color: '#555' },

  dropdown:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dropdownText: { fontSize: 14, color: '#1A1A1A', flex: 1 },
  dropdownMenu: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemActive: { backgroundColor: '#FFF5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },
  dropdownItemTextActive: { color: '#E63946', fontWeight: '700' },

  slotsGrid:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, marginTop: 4 },
  slotItem:     { flexDirection: 'row', alignItems: 'center', gap: 6, width: '50%', paddingVertical: 6 },
  slotLabel:    { fontSize: 12, color: '#333' },

  addBtn:       { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 30 },
  addBtnText:   { color: '#FFF', fontSize: 14, fontWeight: '700' },

  tableCard:    { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  noRecord:     { paddingVertical: 28, alignItems: 'center', minWidth: 738 },
  noRecordText: { fontSize: 14, color: '#999' },

  updateText:   { fontSize: 12, fontWeight: '700', color: '#43A047' },
  deleteText:   { fontSize: 12, fontWeight: '700', color: '#E63946' },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { fontSize: 12, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:    { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 13, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellRed:    { color: '#C0392B', fontWeight: '600' },
});

export default ManageAvailability;
