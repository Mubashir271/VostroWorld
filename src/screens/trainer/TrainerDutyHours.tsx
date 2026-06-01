import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import api from '../../api/service';
import { createDutyHourRequest } from '../../api/employeeDashboard';

interface DutySlot {
  id: number;
  day: string;
  start_time: string;
  end_time: string;
}

export default function TrainerDutyHours() {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId;
  const userId   = profile?.id;

  const [slots, setSlots]       = useState<DutySlot[]>([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<DutySlot | null>(null);
  const [reqStart, setReqStart] = useState('');
  const [reqEnd, setReqEnd]     = useState('');
  const [reason, setReason]     = useState('');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => { fetchSlots(); }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/staff-timing/index', {
        params: { branch_id: branchId, staff_id: userId, status: 1, limit: 999 },
      });
      const list: DutySlot[] = res?.data?.data?.data ?? res?.data?.data ?? [];
      setSlots(list);
    } catch (e) {
      console.log('Duty slots error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSlot) { Alert.alert('Select a slot first'); return; }
    if (!reqStart || !reqEnd) { Alert.alert('Enter requested start and end time'); return; }
    try {
      setSubmitting(true);
      await createDutyHourRequest({
        branch_id: branchId!,
        user_id: userId!,
        staff_timing_id: selectedSlot.id,
        day: selectedSlot.day,
        requested_start_time: reqStart,
        requested_end_time: reqEnd,
        reason,
      });
      Alert.alert('Success', 'Request submitted successfully');
      setSelectedSlot(null); setReqStart(''); setReqEnd(''); setReason('');
    } catch (e) {
      Alert.alert('Error', 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader
        title="Duty Hours"
        leftIcon={<Icon name="arrow-left" size={24} color="#333" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

          {/* Current Schedule */}
          <View style={s.section}>
            <Text style={s.sectionBadge}>CURRENT SCHEDULE</Text>
            <Text style={s.sectionTitle}>Assigned Duty Hours</Text>
            <Text style={s.sectionSub}>These are your currently active duty-hour slots.</Text>
            {slots.length === 0 ? (
              <Text style={s.empty}>No duty slots found</Text>
            ) : (
              slots.map(slot => (
                <View key={slot.id} style={s.slotCard}>
                  <View>
                    <Text style={s.slotDay}>{slot.day}</Text>
                    <Text style={s.slotTime}>{slot.start_time} - {slot.end_time}</Text>
                  </View>
                  <View style={s.activeBadge}>
                    <Text style={s.activeBadgeText}>ACTIVE</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Request Change */}
          <View style={s.section}>
            <Text style={s.sectionBadge}>APPROVAL FLOW</Text>
            <Text style={s.sectionTitle}>Request Duty-Hour Change</Text>
            <Text style={s.sectionSub}>Requested timing changes are sent to HR and only apply after approval.</Text>

            <Text style={s.fieldLabel}>Select Current Slot</Text>
            <TouchableOpacity style={s.dropdown} onPress={() => setShowPicker(!showPicker)}>
              <Text style={[s.dropdownText, !selectedSlot && { color: '#9ca3af' }]}>
                {selectedSlot ? `${selectedSlot.day}  ${selectedSlot.start_time} - ${selectedSlot.end_time}` : 'Select current slot'}
              </Text>
              <Icon name={showPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
            </TouchableOpacity>
            {showPicker && (
              <View style={s.dropdownList}>
                {slots.map(slot => (
                  <TouchableOpacity
                    key={slot.id}
                    style={s.dropdownItem}
                    onPress={() => { setSelectedSlot(slot); setShowPicker(false); }}
                  >
                    <Text style={s.dropdownItemText}>{slot.day}  {slot.start_time} - {slot.end_time}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.fieldLabel}>Requested Start Time (HH:mm)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 09:00"
              value={reqStart}
              onChangeText={setReqStart}
            />

            <Text style={s.fieldLabel}>Requested End Time (HH:mm)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 17:00"
              value={reqEnd}
              onChangeText={setReqEnd}
            />

            <Text style={s.fieldLabel}>Reason for Change</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="Reason for requested change"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitBtnText}>Submit Request</Text>}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section:         { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionBadge:    { fontSize: 11, fontWeight: '700', color: '#0ea5e9', letterSpacing: 1, marginBottom: 6 },
  sectionTitle:    { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  sectionSub:      { fontSize: 13, color: '#64748b', marginBottom: 16 },
  empty:           { color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },
  slotCard:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, marginBottom: 10 },
  slotDay:         { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  slotTime:        { fontSize: 13, color: '#64748b' },
  activeBadge:     { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  fieldLabel:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  dropdown:        { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' },
  dropdownText:    { fontSize: 14, color: '#1e293b' },
  dropdownList:    { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, marginTop: 4, backgroundColor: '#fff' },
  dropdownItem:    { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemText:{ fontSize: 14, color: '#1e293b' },
  input:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f9fafb' },
  textarea:        { height: 100, textAlignVertical: 'top' },
  submitBtn:       { backgroundColor: '#1e293b', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  submitBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
