import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl, Modal, Pressable,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import { getTrainerClients, getTakenSlots, markTrainerAttendance } from '../../api/trainer';

interface Client {
  order_id: number;
  client_id: number;
  client_name: string;
  client_phone: string;
  package_id: number;
  package_name: string;
  package_type: string | null;
  session_count: number;
  total_sessions: number;
  sessions_delivered: number;
  sessions_remaining: number;
  no_show_count: number;
  cancel_count: number;
  end_date: string;
  last_session_date: string;
  is_client_present: boolean;
  today_session_status: string | null;
  today_time_slot: string | null;
  branch_id: number;
}

// Same hourly slots the web Session Tracker offers: 06:00-07:00 … 21:00-22:00.
const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
});

const SESSION_TYPES = ['PT', 'SPT', 'GX', 'Befit'];
const sessionType = (c: Client) =>
  c.package_type && SESSION_TYPES.includes(c.package_type) ? c.package_type : 'PT';

const today = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => {
  const [y, m, dd] = d.split('-');
  return `${dd} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;
};

export default function SessionTrackerScreen() {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId;

  const [clients, setClients]           = useState<Client[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [isTrainerPresent, setPresent]  = useState(false);
  const [checkDate, setCheckDate]       = useState(today());
  const [search, setSearch]             = useState('');
  const [marking, setMarking]           = useState<number | null>(null); // order_id being marked
  const [slotClient, setSlotClient]     = useState<Client | null>(null); // Present sheet target
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [takenSlots, setTakenSlots]     = useState<string[]>([]);

  const fetchClients = useCallback(async (date = checkDate) => {
    try {
      const res = await getTrainerClients({ branch_id: branchId, include_expired: 0, check_date: date });
      setClients((res?.data as any) ?? []);
      setPresent(!!(res as any)?.is_trainer_present);
    } catch (e) {
      console.log('Session tracker error:', e);
    }
  }, [branchId, checkDate]);

  useEffect(() => {
    setLoading(true);
    fetchClients().finally(() => setLoading(false));
  }, [fetchClients]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients().finally(() => setRefreshing(false));
  };

  // Mirrors the web tracker: the time slot is picked when marking Present, and a
  // No Show is recorded with no slot (staff Delivered, client No Show).
  const submitMark = async (client: Client, clientStatus: 'Delivered' | 'No Show', timeSlot: string | null) => {
    try {
      setMarking(client.order_id);
      await markTrainerAttendance({
        branch_id: client.branch_id || branchId!,
        client_id: client.client_id,
        order_id: client.order_id,
        package_id: client.package_id,
        date: checkDate,
        staff_status: 'Delivered',
        client_status: clientStatus,
        time_slot: timeSlot,
        type: sessionType(client),
      });
      setSlotClient(null);
      Alert.alert(
        clientStatus === 'Delivered' ? 'Session Marked' : 'No-Show Recorded',
        clientStatus === 'Delivered'
          ? `${client.client_name} — ${timeSlot}, ${fmtDate(checkDate)}`
          : `${client.client_name} marked as No-Show.`,
      );
      fetchClients();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      Alert.alert('Error', typeof msg === 'string' ? msg : 'Failed to mark session.');
    } finally {
      setMarking(null);
    }
  };

  const openPresent = (client: Client) => {
    setSelectedSlot(null);
    setTakenSlots([]);
    setSlotClient(client);
    getTakenSlots(checkDate)
      .then(res => setTakenSlots(res?.taken_slots ?? []))
      .catch(() => {});
  };

  const confirmNoShow = (client: Client) => {
    Alert.alert('Mark as No-Show?', `${client.client_name} — ${fmtDate(checkDate)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, No-Show', style: 'destructive', onPress: () => submitMark(client, 'No Show', null) },
    ]);
  };

  const filtered = clients.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase()),
  );

  // Summary stats
  const totalDone      = clients.reduce((s, c) => s + c.sessions_delivered, 0);
  const totalRemaining = clients.reduce((s, c) => s + c.sessions_remaining, 0);
  const totalNoShows   = clients.reduce((s, c) => s + c.no_show_count, 0);
  const checkedIn      = clients.filter(c => !!c.is_client_present).length;

  return (
    <>
      <AppHeader
        title="Session Tracker"
        leftIcon={<Icon name="arrow-left" size={24} color="#333" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          style={s.container}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E63946" />}
        >
          {/* Header info */}
          <Text style={s.subtitle}>Mark attendance • Track sessions • View commission</Text>

          {/* Presence banner */}
          <View style={[s.banner, { backgroundColor: isTrainerPresent ? '#dcfce7' : '#fef9c3' }]}>
            <Icon
              name={isTrainerPresent ? 'check-circle' : 'alert-circle'}
              size={16}
              color={isTrainerPresent ? '#16a34a' : '#a16207'}
            />
            <Text style={[s.bannerText, { color: isTrainerPresent ? '#16a34a' : '#a16207' }]}>
              {isTrainerPresent
                ? `You are Present on ${fmtDate(checkDate)}. Session marking is enabled.`
                : `You are Absent on ${fmtDate(checkDate)}. Session marking is disabled.`}
            </Text>
          </View>

          {/* Search */}
          <View style={s.searchBox}>
            <Icon name="magnify" size={18} color="#94a3b8" />
            <TextInput
              style={s.searchInput}
              placeholder="Search client..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Session Date */}
          <View style={s.dateRow}>
            <Text style={s.dateLabel}>Session Date</Text>
            <TextInput
              style={s.dateInput}
              value={checkDate}
              onChangeText={d => { setCheckDate(d); fetchClients(d); }}
              placeholder="YYYY-MM-DD"
            />
          </View>

          {/* Stats pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsRow}>
            {[
              { label: `${clients.length} Active Clients`, color: '#3b82f6' },
              { label: `${totalDone} Done`,               color: '#16a34a' },
              { label: `${totalRemaining} Remaining`,     color: '#E63946' },
              { label: `${totalNoShows} No Shows`,        color: '#ef4444' },
              { label: `${checkedIn} Checked In`,         color: '#0ea5e9' },
            ].map(p => (
              <View key={p.label} style={[s.pill, { backgroundColor: p.color }]}>
                <Text style={s.pillText}>{p.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Client cards */}
          {filtered.length === 0
            ? <Text style={s.empty}>No clients found</Text>
            : filtered.map(client => {
                const progress = client.session_count > 0
                  ? Math.round((client.sessions_delivered / client.session_count) * 100)
                  : 0;
                const isDelivered = client.today_session_status === 'Delivered';
                const isMarking   = marking === client.order_id;
                // Marking is allowed only when nothing is recorded yet for this date,
                // the trainer is present, and the client has checked in.
                const blockedReason = client.today_session_status
                  ? `Already marked: ${client.today_session_status}`
                  : !isTrainerPresent
                    ? 'Your attendance is not marked for this date'
                    : !client.is_client_present
                      ? 'Client has not checked in'
                      : null;

                const barColor = progress >= 70 ? '#3b82f6' : progress >= 40 ? '#eab308' : '#E63946';

                return (
                  <View key={client.order_id} style={s.card}>
                    {/* Client header */}
                    <View style={s.cardHeader}>
                      <View style={s.clientAvatar}>
                        <Icon name="account" size={22} color="#64748b" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.clientName}>{client.client_name}</Text>
                        <Text style={s.clientPhone}>{client.client_phone}</Text>
                        <View style={s.packageBadge}>
                          <Text style={s.packageBadgeNum}>{sessionType(client)}</Text>
                          <Text style={s.packageName}>{client.package_name}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Session counts */}
                    <View style={s.statsRow}>
                      <View style={s.statCol}>
                        <Text style={[s.statNum, { color: '#3b82f6' }]}>{client.session_count}</Text>
                        <Text style={s.statLabel}>Total</Text>
                      </View>
                      <View style={s.statCol}>
                        <Text style={[s.statNum, { color: '#16a34a' }]}>{client.sessions_delivered}</Text>
                        <Text style={s.statLabel}>Done</Text>
                      </View>
                      <View style={s.statCol}>
                        <Text style={[s.statNum, { color: '#E63946' }]}>{client.sessions_remaining}</Text>
                        <Text style={s.statLabel}>Remaining</Text>
                      </View>
                    </View>

                    {/* Secondary stats */}
                    <View style={s.statsRow}>
                      <View style={s.statCol}>
                        <Text style={[s.statNum, { color: '#94a3b8' }]}>{client.no_show_count}</Text>
                        <Text style={s.statLabel}>No Shows</Text>
                      </View>
                      <View style={s.statCol}>
                        <Text style={[s.statNum, { color: '#94a3b8' }]}>{client.cancel_count}</Text>
                        <Text style={s.statLabel}>Cancelled</Text>
                      </View>
                      <View style={s.statCol}>
                        <Text style={[s.statNum, { color: '#E63946', fontSize: 12 }]}>{client.end_date}</Text>
                        <Text style={s.statLabel}>Expires</Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={s.progressRow}>
                      <Text style={s.progressLabel}>Progress</Text>
                      <Text style={s.progressPct}>{progress}%</Text>
                    </View>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${progress}%` as any, backgroundColor: barColor }]} />
                    </View>

                    {/* Session status */}
                    {isDelivered ? (
                      <View style={s.deliveredCard}>
                        <Icon name="check" size={20} color="#16a34a" />
                        <Text style={s.deliveredTitle}>Session Delivered</Text>
                        <Text style={s.deliveredTime}>⏰ {client.today_time_slot}</Text>
                        <Text style={s.deliveredSub}>Already recorded for this date</Text>
                      </View>
                    ) : blockedReason ? (
                      <View style={s.notCheckedIn}>
                        <Text style={s.notCheckedInText}>{blockedReason}</Text>
                        <View style={s.actionRow}>
                          <View style={[s.actionBtn, s.actionBtnDisabled]}>
                            <Text style={s.actionBtnDisabledText}>✓ Present</Text>
                          </View>
                          <View style={[s.actionBtn, s.actionBtnDisabled]}>
                            <Text style={s.actionBtnDisabledText}>✗ No-Show</Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={s.actionRow}>
                        <TouchableOpacity
                          style={[s.actionBtn, s.presentBtn]}
                          onPress={() => openPresent(client)}
                          disabled={isMarking}
                        >
                          {isMarking
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={s.presentBtnText}>✓ Present</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.actionBtn, s.noShowBtn]}
                          onPress={() => confirmNoShow(client)}
                          disabled={isMarking}
                        >
                          <Text style={s.noShowBtnText}>✗ No-Show</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={s.lastSession}>
                      Last: {client.last_session_date ? fmtDate(client.last_session_date) : '—'}
                    </Text>
                  </View>
                );
              })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Present → pick the session's time slot */}
      <Modal visible={!!slotClient} transparent animationType="slide" onRequestClose={() => setSlotClient(null)}>
        <Pressable style={s.sheetOverlay} onPress={() => marking === null && setSlotClient(null)}>
          <Pressable style={s.sheet}>
            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Mark as Present</Text>
                <Text style={s.sheetSub} numberOfLines={1}>
                  {slotClient?.client_name} · {slotClient?.package_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSlotClient(null)} disabled={marking !== null}>
                <Icon name="close" size={22} color="#E63946" />
              </TouchableOpacity>
            </View>

            <Text style={s.sheetLabel}>Session Date: {fmtDate(checkDate)}</Text>
            <Text style={s.sheetLabel}>Time Slot *</Text>
            <View style={s.slotGrid}>
              {TIME_SLOTS.map(slot => {
                const taken = takenSlots.includes(slot);
                const active = selectedSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[s.slotBtn, active && s.slotBtnActive, taken && s.slotBtnTaken]}
                    onPress={() => setSelectedSlot(slot)}
                    disabled={taken}
                  >
                    <Text style={[s.slotText, active && s.slotTextActive, taken && s.slotTextTaken]}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.confirmBtn, (!selectedSlot || marking !== null) && { opacity: 0.5 }]}
              disabled={!selectedSlot || marking !== null}
              onPress={() => slotClient && selectedSlot && submitMark(slotClient, 'Delivered', selectedSlot)}
            >
              {marking !== null
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.confirmBtnText}>Confirm Session</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f8fafc', padding: 14 },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subtitle:           { fontSize: 12, color: '#64748b', marginBottom: 10 },
  banner:             { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10, marginBottom: 12 },
  bannerText:         { fontSize: 13, fontWeight: '600', flex: 1 },
  searchBox:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  searchInput:        { flex: 1, fontSize: 14, color: '#1e293b' },
  dateRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dateLabel:          { fontSize: 13, fontWeight: '600', color: '#374151' },
  dateInput:          { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, fontSize: 13, color: '#1e293b', backgroundColor: '#fff' },
  pillsRow:           { marginBottom: 14 },
  pill:               { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8 },
  pillText:           { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty:              { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  // Client card
  card:               { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  cardHeader:         { flexDirection: 'row', gap: 10, marginBottom: 12 },
  clientAvatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  clientName:         { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  clientPhone:        { fontSize: 12, color: '#64748b', marginTop: 2 },
  packageBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  packageBadgeNum:    { fontSize: 11, backgroundColor: '#3b82f6', color: '#fff', borderRadius: 9, paddingHorizontal: 6, height: 18, textAlign: 'center', lineHeight: 18, fontWeight: '700', overflow: 'hidden' },
  packageName:        { fontSize: 12, color: '#64748b' },
  statsRow:           { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  statCol:            { alignItems: 'center', flex: 1 },
  statNum:            { fontSize: 20, fontWeight: '700' },
  statLabel:          { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  progressRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, marginTop: 4 },
  progressLabel:      { fontSize: 12, color: '#374151' },
  progressPct:        { fontSize: 12, color: '#374151', fontWeight: '600' },
  progressTrack:      { height: 6, backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
  progressFill:       { height: '100%', borderRadius: 4 },
  // Delivered
  deliveredCard:      { backgroundColor: '#dcfce7', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 },
  deliveredTitle:     { fontSize: 14, fontWeight: '700', color: '#16a34a', marginTop: 4 },
  deliveredTime:      { fontSize: 12, color: '#64748b', marginTop: 2 },
  deliveredSub:       { fontSize: 11, color: '#86efac', marginTop: 2 },
  // Not checked in
  notCheckedIn:       { marginBottom: 8 },
  notCheckedInText:   { fontSize: 12, color: '#a16207', backgroundColor: '#fef9c3', borderRadius: 6, padding: 8, marginBottom: 8, textAlign: 'center' },
  actionRow:          { flexDirection: 'row', gap: 10 },
  actionBtn:          { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnDisabled:  { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  actionBtnDisabledText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  presentBtn:         { backgroundColor: '#22c55e' },
  presentBtnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  noShowBtn:          { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },
  noShowBtnText:      { color: '#64748b', fontWeight: '600', fontSize: 13 },
  lastSession:        { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 },
  // Time slot sheet
  sheetOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:              { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  sheetHeader:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sheetTitle:         { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  sheetSub:           { fontSize: 12, color: '#64748b', marginTop: 2 },
  sheetLabel:         { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  slotGrid:           { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  slotBtn:            { width: '48.5%', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', alignItems: 'center', marginBottom: 8 },
  slotBtnActive:      { backgroundColor: '#FFE5E5', borderColor: '#E63946' },
  slotBtnTaken:       { backgroundColor: '#f1f5f9' },
  slotText:           { fontSize: 13, fontWeight: '600', color: '#374151' },
  slotTextActive:     { color: '#E63946' },
  slotTextTaken:      { color: '#cbd5e1', textDecorationLine: 'line-through' },
  confirmBtn:         { backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});
