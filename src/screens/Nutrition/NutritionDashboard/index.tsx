import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import {
  getAppointmentsStatistics,
  getDietPlansStatistics,
  getHealthCampsStatistics,
  getReferralsStatistics,
  getNutritionAppointments,
} from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const DEMO = {
  total_appointments: 387,
  today_appointments: 1,
  upcoming_appointments: 0,
  conversion_appointments: 0,
  diet_plans: {
    total: 95,
    this_week: 7,
    issued: 95,
    top_goals: [
      { label: 'Fat loss', count: 48 },
      { label: 'Muscle and strength gain', count: 29 },
      { label: 'Metabolic issue', count: 11 },
      { label: 'IBS', count: 4 },
      { label: 'Conditioning', count: 2 },
      { label: 'Muscle gain', count: 1 },
    ],
  },
  health_camps: { total: 0, this_week: 0, upcoming: 0 },
  referral_sheet: {
    total_referrals: 235,
    transformations: 63,
    active_clients: 1331,
    google_reviews: 3,
    video_shoots: 0,
    week_referrals: 0,
    week_transformations: 0,
    week_active_clients: 0,
  },
  conversion_stats: [
    { label: 'Unknown', count: 1 },
    { label: '2nd Assessment', count: 68 },
    { label: '3rd Assessment', count: 42 },
    { label: '4th Assessment', count: 16 },
    { label: '5th Assessment', count: 20 },
    { label: '6th Assessment', count: 12 },
    { label: '7th Assessment', count: 3 },
    { label: '8th Assessment', count: 1 },
    { label: '9th Assessment', count: 5 },
    { label: 'Assessment', count: 15 },
  ],
  today_appointments_list: [
    { time: '1:00 PM', client_name: 'Naila Anjum', staff: 'Sidra Sharif', type: '2nd Assessment' },
  ],
};

const STAT_CARDS = [
  { key: 'total_appointments', label: 'Total Appointments', icon: 'calendar-check', color: '#1E88E5', bg: '#E8F1FC' },
  { key: 'today_appointments', label: 'Today Appointments', icon: 'calendar-today', color: '#43A047', bg: '#E8F5E9' },
  { key: 'upcoming_appointments', label: 'Upcoming Appointments', icon: 'clock-outline', color: '#00ACC1', bg: '#E0F7FA' },
  { key: 'conversion_appointments', label: 'Conversions', icon: 'trophy-outline', color: '#FB8C00', bg: '#FFF3E0' },
];

const BAR_COLORS = ['#E63946', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1'];

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtTime = (t?: string) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ap = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ap}`;
};

const staffName = (p?: { first_name?: string; last_name?: string }) =>
  p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || undefined : undefined;

const QUICK_ACTIONS = [
  { icon: 'calendar-plus', label: 'New Appointment', screen: 'AddNutritionAppointment', color: '#1E88E5' },
  { icon: 'format-list-bulleted', label: 'All Appointments', screen: 'NutritionAppointments', color: '#43A047' },
  { icon: 'notebook-outline', label: 'Diet Plans', screen: 'ViewMealsPlan', color: '#1A1A1A' },
  { icon: 'hospital-building', label: 'Health Camps', screen: 'NutritionDashboard', color: '#8E24AA' },
  { icon: 'account-plus-outline', label: 'Referral Sheet', screen: 'NutritionDashboard', color: '#FB8C00' },
  { icon: 'account-multiple-outline', label: 'Clients Details', screen: 'ClientsDetails', color: '#E63946' },
];

const NutritionDashboard = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const today = fmtDate(new Date());
      const [apptRes, dietRes, campRes, referralRes, todayRes] = await Promise.all([
        getAppointmentsStatistics({ branch_id: branchId }).catch(() => null),
        getDietPlansStatistics({ branch_id: branchId }).catch(() => null),
        getHealthCampsStatistics({ branch_id: branchId }).catch(() => null),
        getReferralsStatistics({ branch_id: branchId }).catch(() => null),
        getNutritionAppointments({ branch_id: branchId, start_date: today, end_date: today }).catch(() => null),
      ]);

      const appt = apptRes?.data?.data ?? null;
      const diet = dietRes?.data?.data ?? null;
      const camp = campRes?.data?.data ?? null;
      const referral = referralRes?.data?.data ?? null;
      const todayAppts = todayRes?.data?.data ?? [];

      if (!appt && !diet && !camp && !referral) {
        setData(null);
      } else {
        setData({
          total_appointments: appt?.total_appointments,
          today_appointments: appt?.today_appointments,
          upcoming_appointments: appt?.upcoming_appointments,
          conversion_appointments: 0,
          conversion_stats: (appt?.conversion_stats ?? []).map((c: any) => ({
            label: c.conversion ?? 'Unknown',
            count: c.count,
          })),
          today_appointments_list: (Array.isArray(todayAppts) ? todayAppts : []).map((a: any) => ({
            time: fmtTime(a.appointment_time),
            client_name: a.client_name ?? '—',
            staff: staffName(a.nutritionist) ?? staffName(a.trainer),
            type: a.conversion || a.consultation || '—',
          })),
          diet_plans: diet ? {
            total: diet.total,
            this_week: diet.this_week,
            issued: diet.issued_count,
            top_goals: (diet.goals ?? []).map((g: any) => ({ label: g.goal, count: g.count })),
          } : null,
          health_camps: camp ? {
            total: camp.total,
            this_week: camp.this_week,
            upcoming: camp.upcoming,
          } : null,
          referral_sheet: referral ? {
            total_referrals: referral.total_referrals,
            transformations: referral.total_transformations,
            active_clients: referral.total_active_clients,
            google_reviews: referral.total_google_reviews,
            video_shoots: referral.total_video_shoots,
            week_referrals: referral.current_week?.referrals,
            week_transformations: referral.current_week?.transformations,
            week_active_clients: referral.current_week?.active_clients,
          } : null,
        });
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const d = data ?? DEMO;
  const dietPlans = d.diet_plans ?? DEMO.diet_plans;
  const healthCamps = d.health_camps ?? DEMO.health_camps;
  const referral = d.referral_sheet ?? DEMO.referral_sheet;
  const conversionStats = d.conversion_stats ?? DEMO.conversion_stats;
  const todayList = d.today_appointments_list ?? DEMO.today_appointments_list;

  const maxGoal = Math.max(...(dietPlans.top_goals ?? []).map((g: any) => g.count), 1);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Nutrition Dashboard"
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
          {/* Stat cards */}
          <View style={styles.statsGrid}>
            {STAT_CARDS.map(c => (
              <View key={c.key} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: c.bg }]}>
                  <Icon name={c.icon} size={20} color={c.color} />
                </View>
                <Text style={styles.statValue}>{d[c.key] ?? 0}</Text>
                <Text style={styles.statLabel}>{c.label}</Text>
              </View>
            ))}
          </View>

          {/* Today's appointments */}
          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          <View style={styles.card}>
            {todayList.length === 0 ? (
              <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
            ) : (
              todayList.map((a: any, i: number) => (
                <View key={i} style={[styles.apptRow, i > 0 && styles.apptRowBorder]}>
                  <View style={styles.apptTimeBox}>
                    <Text style={styles.apptTime}>{a.time}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.apptName}>{a.client_name}</Text>
                    {a.staff ? <Text style={styles.apptStaff}><Icon name="account-outline" size={12} color="#999" /> {a.staff}</Text> : null}
                  </View>
                  <View style={styles.apptTypeBadge}>
                    <Text style={styles.apptTypeText}>{a.type}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Diet Plans */}
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Diet Plans Issued</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ViewMealsPlan')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{dietPlans.total}</Text>
                <Text style={styles.miniStatLabel}>Total</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{dietPlans.this_week}</Text>
                <Text style={styles.miniStatLabel}>This Week</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#43A047' }]}>{dietPlans.issued}</Text>
                <Text style={styles.miniStatLabel}>Issued</Text>
              </View>
            </View>

            <Text style={styles.subTitle}>Top Goals</Text>
            {(dietPlans.top_goals ?? []).map((g: any, i: number) => (
              <View key={g.label} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{g.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(g.count / maxGoal) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
                </View>
                <Text style={styles.barValue}>{g.count}</Text>
              </View>
            ))}
          </View>

          {/* Health Camps */}
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Health Camps</Text>
            <TouchableOpacity onPress={() => navigation.navigate('NutritionDashboard')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{healthCamps.total}</Text>
                <Text style={styles.miniStatLabel}>Total</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{healthCamps.this_week}</Text>
                <Text style={styles.miniStatLabel}>This Week</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{healthCamps.upcoming}</Text>
                <Text style={styles.miniStatLabel}>Upcoming</Text>
              </View>
            </View>
          </View>

          {/* Referral Sheet */}
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Referral Sheet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('NutritionDashboard')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#E63946' }]}>{referral.total_referrals}</Text>
                <Text style={styles.miniStatLabel}>Total Referrals</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#FB8C00' }]}>{referral.transformations}</Text>
                <Text style={styles.miniStatLabel}>Transformations</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#1E88E5' }]}>{referral.active_clients}</Text>
                <Text style={styles.miniStatLabel}>Active Clients</Text>
              </View>
            </View>

            <Text style={styles.subTitle}>This Week</Text>
            <View style={styles.weekRow}>
              <View style={styles.weekItem}>
                <Icon name="account-plus-outline" size={16} color="#666" />
                <Text style={styles.weekLabel}>Referrals</Text>
                <Text style={styles.weekValue}>{referral.week_referrals ?? 0}</Text>
              </View>
              <View style={styles.weekItem}>
                <Icon name="lightbulb-outline" size={16} color="#666" />
                <Text style={styles.weekLabel}>Transformations</Text>
                <Text style={styles.weekValue}>{referral.week_transformations ?? 0}</Text>
              </View>
              <View style={styles.weekItem}>
                <Icon name="account-multiple-outline" size={16} color="#666" />
                <Text style={styles.weekLabel}>Active Clients</Text>
                <Text style={styles.weekValue}>{referral.week_active_clients ?? 0}</Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <View style={[styles.badgeBox, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="google" size={16} color="#43A047" />
                <Text style={styles.badgeValue}>{referral.google_reviews}</Text>
                <Text style={styles.badgeLabel}>Google Reviews</Text>
              </View>
              <View style={[styles.badgeBox, { backgroundColor: '#FBEAEA' }]}>
                <Icon name="video-outline" size={16} color="#E63946" />
                <Text style={styles.badgeValue}>{referral.video_shoots}</Text>
                <Text style={styles.badgeLabel}>Video Shoots</Text>
              </View>
            </View>
          </View>

          {/* Conversion Stats */}
          <Text style={styles.sectionTitle}>Conversion Stats</Text>
          <View style={styles.card}>
            {conversionStats.map((c: any) => (
              <View key={c.label} style={styles.convRow}>
                <Text style={styles.convLabel}>{c.label}</Text>
                <View style={styles.convBadge}>
                  <Text style={styles.convBadgeText}>{c.count}</Text>
                </View>
              </View>
            ))}
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

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 10, marginTop: 16 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  viewAll: { fontSize: 12, fontWeight: '700', color: '#E63946' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 10 },

  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  apptRowBorder: { borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  apptTimeBox: { backgroundColor: '#FFF5F5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  apptTime: { fontSize: 11, fontWeight: '700', color: '#E63946' },
  apptName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  apptStaff: { fontSize: 11, color: '#999', marginTop: 2 },
  apptTypeBadge: { backgroundColor: '#E8F1FC', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  apptTypeText: { fontSize: 10, fontWeight: '700', color: '#1E88E5' },

  miniStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  miniStat: { alignItems: 'center', flex: 1 },
  miniStatValue: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  miniStatLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },

  subTitle: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 110, fontSize: 11, color: '#555', fontWeight: '600' },
  barTrack: { flex: 1, height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barValue: { width: 24, fontSize: 11, color: '#888', textAlign: 'right' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  weekItem: { alignItems: 'center', flex: 1, gap: 4 },
  weekLabel: { fontSize: 10, color: '#999' },
  weekValue: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },

  badgeRow: { flexDirection: 'row', gap: 10 },
  badgeBox: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  badgeValue: { fontSize: 16, fontWeight: '900', color: '#1a1a1a' },
  badgeLabel: { fontSize: 10, color: '#666', fontWeight: '600' },

  convRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  convLabel: { fontSize: 13, color: '#333', fontWeight: '600' },
  convBadge: { backgroundColor: '#E8F1FC', borderRadius: 12, minWidth: 32, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3 },
  convBadgeText: { fontSize: 12, fontWeight: '800', color: '#1E88E5' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '31%', backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 10, color: '#555', textAlign: 'center', fontWeight: '600' },
});

export default NutritionDashboard;
