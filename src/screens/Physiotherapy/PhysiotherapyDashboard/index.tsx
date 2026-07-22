import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getPhysioDashboard } from '../../../api/physio';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const STAT_CARDS = [
  { key: 'total', label: 'Total Appointments', icon: 'calendar-check', color: '#1E88E5', bg: '#E8F1FC' },
  { key: 'today', label: 'Today', icon: 'calendar-today', color: '#43A047', bg: '#E8F5E9' },
  { key: 'upcoming', label: 'Upcoming', icon: 'clock-outline', color: '#00ACC1', bg: '#E0F7FA' },
  { key: 'gx_clients', label: 'GX Clients', icon: 'account-multiple-outline', color: '#FB8C00', bg: '#FFF3E0' },
];

const QUICK_ACTIONS = [
  { icon: 'calendar-clock', label: 'Appointments', screen: 'PhysiotherapyAppointments', color: '#1E88E5' },
  { icon: 'file-document-outline', label: 'Prescriptions', screen: 'PhysiotherapyPrescriptions', color: '#1a1a1a' },
  { icon: 'run', label: 'GX', screen: 'PhysiotherapyGX', color: '#00ACC1' },
  { icon: 'account-arrow-right-outline', label: 'Referrals', screen: 'PhysiotherapyDailyClientReferral', color: '#FB8C00' },
  { icon: 'account-details-outline', label: 'Patient Details', screen: 'PhysiotherapyPatientDetails', color: '#8E24AA' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// appointment_date/created_at come back as UTC instants that represent
// midnight in the branch's local time (Asia/Karachi); converting through
// the device's UTC calendar date would show them a day early.
const toKarachiDateStr = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  } catch {
    return iso.split('T')[0];
  }
};

const fmtSlot = (start?: string, end?: string) => {
  const fmt = (t?: string) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ap = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:${m} ${ap}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
};

const fmtDDMMYY = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

const PhysiotherapyDashboard = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const firstName = profile?.firstName || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(fmtDate(new Date()));

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getPhysioDashboard({ branch_id: branchId, week_start: selectedDate });
      const body = res?.data?.data ?? null;
      setData(body);
      if (body?.week?.start) setSelectedDate(body.week.start);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const cards = data?.cards;
  const weekAppointments: any[] = data?.week_appointments ?? [];
  const upcomingAppointments: any[] = data?.upcoming_appointments ?? [];
  const recentPrescriptions: any[] = data?.recent_prescriptions ?? [];

  const weekStart = data?.week?.start ?? selectedDate;
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return fmtDate(d);
  });

  const countsByDate: Record<string, number> = {};
  weekAppointments.forEach(a => {
    const dStr = toKarachiDateStr(a.appointment_date);
    countsByDate[dStr] = (countsByDate[dStr] ?? 0) + 1;
  });

  const todayStr = fmtDate(new Date());
  const [activeDay, setActiveDay] = useState(todayStr);
  const dayAppointments = weekAppointments
    .filter(a => toKarachiDateStr(a.appointment_date) === activeDay)
    .sort((a, b) => (a.slot_start ?? '').localeCompare(b.slot_start ?? ''));

  const stats = {
    total: cards?.appointments?.total ?? 0,
    today: cards?.appointments?.today ?? 0,
    upcoming: cards?.appointments?.upcoming ?? 0,
    gx_clients: cards?.gx_clients ?? 0,
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Physio Dashboard"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          <Text style={styles.welcome}>Welcome back{firstName ? `, ${firstName}` : ''}!</Text>

          {/* Stat cards */}
          <View style={styles.statsGrid}>
            {STAT_CARDS.map(c => (
              <View key={c.key} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: c.bg }]}>
                  <Icon name={c.icon} size={20} color={c.color} />
                </View>
                <Text style={styles.statValue}>{(stats as any)[c.key] ?? 0}</Text>
                <Text style={styles.statLabel}>{c.label}</Text>
              </View>
            ))}
          </View>

          {/* Prescriptions / Referrals / Responses */}
          <View style={styles.miniCardsRow}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardTitle}>Prescriptions</Text>
              <View style={styles.miniCardRow}><Text style={styles.miniCardLabel}>Total</Text><Text style={styles.miniCardValue}>{cards?.prescriptions?.total ?? 0}</Text></View>
              <View style={styles.miniCardRow}><Text style={styles.miniCardLabel}>This Month</Text><Text style={styles.miniCardValue}>{cards?.prescriptions?.this_month ?? 0}</Text></View>
              <View style={styles.miniCardRow}><Text style={styles.miniCardLabel}>This Week</Text><Text style={styles.miniCardValue}>{cards?.prescriptions?.this_week ?? 0}</Text></View>
            </View>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardTitle}>Daily Referrals</Text>
              <View style={styles.miniCardRow}><Text style={styles.miniCardLabel}>Total Rows</Text><Text style={styles.miniCardValue}>{cards?.referrals?.total_records ?? 0}</Text></View>
              <View style={styles.miniCardRow}><Text style={styles.miniCardLabel}>Total Referred</Text><Text style={styles.miniCardValue}>{cards?.referrals?.total_referred ?? 0}</Text></View>
              <View style={styles.miniCardRow}><Text style={styles.miniCardLabel}>This Week Referred</Text><Text style={styles.miniCardValue}>{cards?.referrals?.this_week_referred ?? 0}</Text></View>
            </View>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardTitle}>Client Responses</Text>
              <View style={styles.miniCardRow}><Text style={styles.miniCardLabel}>Total</Text><Text style={styles.miniCardValue}>{cards?.responses?.total ?? 0}</Text></View>
              <View style={styles.miniCardRow}><Text style={styles.miniCardLabel}>This Week</Text><Text style={styles.miniCardValue}>{cards?.responses?.this_week ?? 0}</Text></View>
            </View>
          </View>

          {/* Week strip */}
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>
              {data?.week ? `${fmtDDMMYY(data.week.start)} - ${fmtDDMMYY(data.week.end)}` : 'This Week'}
            </Text>
            <TouchableOpacity onPress={() => setActiveDay(todayStr)}>
              <Text style={styles.viewAll}>Today</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekStrip}>
            {weekDates.map((dStr, i) => {
              const isActive = dStr === activeDay;
              const isToday = dStr === todayStr;
              const count = countsByDate[dStr] ?? 0;
              const dayNum = dStr.split('-')[2];
              return (
                <TouchableOpacity
                  key={dStr}
                  style={[styles.dayCard, isActive && styles.dayCardActive]}
                  onPress={() => setActiveDay(dStr)}
                >
                  <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>{WEEK_DAYS[i]}</Text>
                  <Text style={[styles.dayNum, isActive && styles.dayLabelActive]}>{dayNum}</Text>
                  {isToday && !isActive && <View style={styles.todayDot} />}
                  {count > 0 && (
                    <View style={[styles.dayBadge, isActive && styles.dayBadgeActive]}>
                      <Text style={[styles.dayBadgeText, isActive && styles.dayBadgeTextActive]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.card}>
            {dayAppointments.length === 0 ? (
              <Text style={styles.emptyText}>No appointments on this day.</Text>
            ) : (
              dayAppointments.map((a, i) => (
                <View key={a.id ?? i} style={[styles.apptRow, i > 0 && styles.apptRowBorder]}>
                  <View style={styles.apptTimeBox}>
                    <Text style={styles.apptTime}>{fmtSlot(a.slot_start, a.slot_end)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.apptName}>{a.client_name}</Text>
                    <Text style={styles.apptStaff}>
                      <Icon name="account-outline" size={12} color="#999" /> {a.physio ? `${a.physio.first_name} ${a.physio.last_name}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.apptTypeBadge}>
                    <Text style={styles.apptTypeText}>{a.appointment_source ?? '—'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Upcoming Appointments */}
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PhysiotherapyAppointments')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {upcomingAppointments.length === 0 ? (
              <Text style={styles.emptyText}>No upcoming appointments.</Text>
            ) : (
              upcomingAppointments.map((a, i) => (
                <View key={a.id ?? i} style={[styles.apptRow, i > 0 && styles.apptRowBorder]}>
                  <View style={styles.apptTimeBox}>
                    <Text style={styles.apptTime}>{fmtDDMMYY(toKarachiDateStr(a.appointment_date))}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.apptName}>{a.client_name}</Text>
                    <Text style={styles.apptStaff}>{fmtSlot(a.slot_start, a.slot_end)}</Text>
                  </View>
                  <View style={styles.apptTypeBadge}>
                    <Text style={styles.apptTypeText}>{a.appointment_source ?? '—'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Recent Prescriptions */}
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Recent Prescriptions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PhysiotherapyPrescriptions')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {recentPrescriptions.length === 0 ? (
              <Text style={styles.emptyText}>No prescription records yet.</Text>
            ) : (
              recentPrescriptions.map((p, i) => (
                <View key={p.id ?? i} style={[styles.apptRow, i > 0 && styles.apptRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.apptName}>{p.client_name ?? '—'}</Text>
                    <Text style={styles.apptStaff}>{p.region ?? p.diagnosis ?? '—'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.actionCard}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#FFF5F5' }]}>
                  <Icon name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.actionCard} onPress={() => load(true)}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFF5F5' }]}>
                <Icon name="refresh" size={22} color="#43A047" />
              </View>
              <Text style={styles.actionLabel}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 14, paddingBottom: 30 },

  welcome: { fontSize: 13, color: '#888', marginBottom: 10, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, fontWeight: '600' },

  miniCardsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  miniCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  miniCardTitle: { fontSize: 11, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  miniCardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  miniCardLabel: { fontSize: 10, color: '#888' },
  miniCardValue: { fontSize: 11, fontWeight: '700', color: '#333' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 10, marginTop: 16 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  viewAll: { fontSize: 12, fontWeight: '700', color: '#E63946' },

  weekStrip: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  dayCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3 },
  dayCardActive: { backgroundColor: '#E63946' },
  dayLabel: { fontSize: 10, color: '#888', fontWeight: '700' },
  dayLabelActive: { color: '#fff' },
  dayNum: { fontSize: 14, color: '#1a1a1a', fontWeight: '800', marginTop: 2 },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#E63946', marginTop: 4 },
  dayBadge: { marginTop: 4, backgroundColor: '#FFF5F5', borderRadius: 8, minWidth: 16, alignItems: 'center', paddingHorizontal: 4 },
  dayBadgeActive: { backgroundColor: '#fff' },
  dayBadgeText: { fontSize: 9, fontWeight: '800', color: '#E63946' },
  dayBadgeTextActive: { color: '#E63946' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 10 },

  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  apptRowBorder: { borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  apptTimeBox: { backgroundColor: '#FFF5F5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  apptTime: { fontSize: 11, fontWeight: '700', color: '#E63946' },
  apptName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  apptStaff: { fontSize: 11, color: '#999', marginTop: 2 },
  apptTypeBadge: { backgroundColor: '#E8F1FC', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  apptTypeText: { fontSize: 10, fontWeight: '700', color: '#1E88E5', textTransform: 'capitalize' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '31%', backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 10, color: '#555', textAlign: 'center', fontWeight: '600' },
});

export default PhysiotherapyDashboard;
