// src/screens/Nutrition/NutritionDashboard/index.tsx
//
// Nutrition Dashboard — the app's version of the web's /nutrition/dashboard.
// Layout and data rules were read from the web bundle (main.f794ea60.js) and
// the 2026-10-06 HAR of a nutritionist login:
//  • A nutritionist (role '10') sees only their own figures — every call
//    carries nutritionist_id = their staff id. Admins see the whole branch.
//  • "Conversions" = Paid + Gold + Silver + Platinum from conversion_stats.
//  • The week calendar is Monday–Sunday, loaded with
//    /v1/nutrition/appointments?start_date=&end_date=&limit=200, bucketed by
//    appointment_date in local time and sorted by appointment_time.
// Styling is the app's own, not the web's Bootstrap.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
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
import { isNutritionist } from '../../../config/permissions';
import { useBranchSelector, BranchOption } from '../../../hooks/useBranchSelector';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import BurgerSVG from '../../../assets/svg/BurgerSVG';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// The web's "Conversions Appointments" tile counts only these outcomes.
const CONVERTED = ['Paid', 'Gold', 'Silver', 'Platinum'];

const STAT_CARDS = [
  { key: 'total', label: 'Total Appointments', icon: 'calendar-check', color: '#1E88E5', bg: '#E8F1FC' },
  { key: 'today', label: 'Today Appointments', icon: 'calendar-today', color: '#43A047', bg: '#E8F5E9' },
  { key: 'upcoming', label: 'Upcoming Appointments', icon: 'clock-outline', color: '#00ACC1', bg: '#E0F7FA' },
  { key: 'conversions', label: 'Conversions', icon: 'trophy-outline', color: '#FB8C00', bg: '#FFF3E0' },
];

const QUICK_ACTIONS = [
  { icon: 'calendar-plus', label: 'New Appointment', screen: 'AddNutritionAppointment', color: '#E63946' },
  { icon: 'format-list-bulleted', label: 'All Appointments', screen: 'NutritionAppointments', color: '#43A047' },
  { icon: 'notebook-outline', label: 'Meal Plans', screen: 'ViewMealsPlan', color: '#1A1A1A' },
  { icon: 'hospital-building', label: 'Health Camps', screen: 'HealthCamps', color: '#8E24AA' },
  { icon: 'account-plus-outline', label: 'Referral Sheet', screen: 'ReferralSheet', color: '#FB8C00' },
];

const BAR_COLORS = ['#E63946', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1'];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Monday of the week containing `d`, at local midnight.
const weekStartOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

// The API stores appointment_date as local midnight serialised to UTC
// ("2026-10-04T19:00:00Z" is 5 Oct in PKT), so read it back in local time,
// as the web's moment() does.
const localDay = (s?: string) => {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(s).slice(0, 10) : ymd(d);
};

const fmtTime = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ap = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ap}`;
};

// Badge colours follow the web: Paid green, Gold/Platinum amber, Silver cyan,
// Not Attended red, any other outcome blue, none grey.
const conversionColor = (c?: string | null) => {
  if (!c) return '#6C757D';
  if (c === 'Paid') return '#2E7D32';
  if (c === 'Gold' || c === 'Platinum') return '#F59E0B';
  if (c === 'Silver') return '#0891B2';
  if (c === 'Not Attended') return '#C62828';
  return '#1E88E5';
};

const staffName = (p?: { first_name?: string; last_name?: string } | null) =>
  p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || undefined : undefined;

const show = (v: any) => (v === null || v === undefined ? '—' : String(v));

// `asHome` is set when this is a nutritionist's Home tab, where the left
// action must always open the drawer.
const NutritionDashboard = ({ asHome = false }: { asHome?: boolean }) => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);

  // Every nutrition statistics endpoint requires a real branch id: confirmed
  // live 2026-09-21 that `all` and `0` both come back "The selected branch id
  // is invalid", while 1 and 15 return data. Super admin has branch_id 0, so
  // it has to pick one — the web sends an empty branch_id here and 422s every
  // panel, which is why that page renders blank for super admin.
  const { options, loadingOptions, needsPicker } = useBranchSelector();
  const ownBranchId = profile?.branchId || null;

  const [pickedBranch, setPickedBranch] = useState<BranchOption | null>(null);
  const [branchOpen, setBranchOpen] = useState(false);

  const branchId = needsPicker ? pickedBranch?.id ?? null : ownBranchId;
  const branchLabel = needsPicker
    ? pickedBranch?.name ?? 'Select Branch'
    : profile?.branchName ?? '';

  // A nutritionist's dashboard is scoped to their own appointments and plans.
  const nutritionistId = isNutritionist(profile?.role) ? profile?.id : undefined;

  // Default to the first branch so the screen has data on arrival.
  useEffect(() => {
    if (needsPicker && !pickedBranch && options.length) { setPickedBranch(options[0]); }
  }, [needsPicker, pickedBranch, options]);

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()));
  const [weekAppts, setWeekAppts] = useState<any[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    // Nothing to ask for until a branch is settled; firing now would just 422.
    if (!branchId) { setLoading(needsPicker && loadingOptions); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const params = { branch_id: branchId, ...(nutritionistId ? { nutritionist_id: nutritionistId } : {}) };
    try {
      const [apptRes, dietRes, campRes, referralRes] = await Promise.all([
        getAppointmentsStatistics(params).catch(() => null),
        getDietPlansStatistics(params).catch(() => null),
        getHealthCampsStatistics(params).catch(() => null),
        getReferralsStatistics(params).catch(() => null),
      ]);
      setStats({
        appt: apptRes?.data?.data ?? null,
        diet: dietRes?.data?.data ?? null,
        camp: campRes?.data?.data ?? null,
        referral: referralRes?.data?.data ?? null,
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, nutritionistId, needsPicker, loadingOptions]);

  const loadWeek = useCallback(async () => {
    if (!branchId) return;
    setWeekLoading(true);
    try {
      const res = await getNutritionAppointments({
        branch_id: branchId,
        ...(nutritionistId ? { nutritionist_id: nutritionistId } : {}),
        start_date: ymd(weekStart),
        end_date: ymd(addDays(weekStart, 6)),
        limit: 200,
        page: 1,
      });
      const rows = res?.data?.data;
      setWeekAppts(Array.isArray(rows) ? rows : []);
    } catch {
      setWeekAppts([]);
    } finally {
      setWeekLoading(false);
    }
  }, [branchId, nutritionistId, weekStart]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadWeek(); }, [loadWeek]);

  const refreshAll = () => { load(true); loadWeek(); };

  const appt = stats?.appt ?? {};
  const diet = stats?.diet ?? {};
  const camp = stats?.camp ?? {};
  const referral = stats?.referral ?? {};
  const conversionStats: any[] = appt.conversion_stats ?? [];

  const statValues: Record<string, any> = {
    total: appt.total_appointments ?? 0,
    today: appt.today_appointments ?? 0,
    upcoming: appt.upcoming_appointments ?? 0,
    conversions: conversionStats
      .filter(c => CONVERTED.includes(c.conversion))
      .reduce((sum, c) => sum + (c.count || 0), 0),
  };

  const summaryTiles = [
    { label: 'Diet Plans', sub: 'This Month', value: diet.this_month, total: diet.total, icon: 'notebook-outline', color: '#0D7A5F', bg: '#E6F4EF', screen: 'ViewMealsPlan' },
    { label: 'Health Camps', sub: 'This Month', value: camp.this_month, total: camp.total, icon: 'hospital-building', color: '#6610F2', bg: '#EFE7FE', screen: 'HealthCamps' },
    { label: 'Referrals', sub: 'This Week', value: referral.current_week?.referrals, total: referral.total_referrals, icon: 'account-plus-outline', color: '#FB8C00', bg: '#FFF3E0', screen: 'ReferralSheet' },
  ];

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const todayKey = ymd(new Date());
  const byDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const a of weekAppts) {
      const k = localDay(a.appointment_date);
      (m[k] ||= []).push(a);
    }
    Object.values(m).forEach(list => list.sort((a, b) =>
      String(a.appointment_time ?? '~').localeCompare(String(b.appointment_time ?? '~'))));
    return m;
  }, [weekAppts]);

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${pad(weekStart.getDate())} ${MONTHS[weekStart.getMonth()]} – ${pad(weekEnd.getDate())} ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  const goals: any[] = diet.goals ?? [];
  const maxGoal = Math.max(...goals.map((g: any) => g.count), 1);
  const firstName = profile?.firstName ? `, ${profile.firstName}${profile?.lastName ? ` ${profile.lastName}` : ''}` : '';

  return (
    <View style={styles.container}>
      <AppHeader
        title="Nutrition Dashboard"
        leftIcon={
          !asHome && navigation.canGoBack()
            ? <Icon name="arrow-left" size={24} color="#1A1A1A" />
            : <BurgerSVG width={24} height={24} />
        }
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => (!asHome && navigation.canGoBack() ? navigation.goBack() : navigation.openDrawer())}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} colors={['#E63946']} />}
        >
          {/* Branch picker — super admin has no branch of its own, and every
              statistics call here requires a real one. */}
          {needsPicker && (
            <TouchableOpacity
              style={styles.branchControl}
              onPress={() => setBranchOpen(true)}
              activeOpacity={0.7}
            >
              <Icon name="office-building" size={16} color="#64748B" />
              <Text style={styles.branchControlText} numberOfLines={1}>{branchLabel}</Text>
              <Icon name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
          )}

          <Text style={styles.welcome}>Welcome back{firstName}!</Text>

          {/* Stat cards */}
          <View style={styles.statsGrid}>
            {STAT_CARDS.map(c => (
              <View key={c.key} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: c.bg }]}>
                  <Icon name={c.icon} size={20} color={c.color} />
                </View>
                <Text style={styles.statValue}>{statValues[c.key]}</Text>
                <Text style={styles.statLabel}>{c.label}</Text>
              </View>
            ))}
          </View>

          {/* Diet plans / health camps / referrals at a glance */}
          {summaryTiles.map(t => (
            <TouchableOpacity
              key={t.label}
              style={[styles.tile, { borderLeftColor: t.color }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(t.screen)}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
                <Icon name={t.icon} size={20} color={t.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileLabel}>{t.label.toUpperCase()}</Text>
                <Text style={styles.tileLine}>
                  <Text style={[styles.tileValue, { color: t.color }]}>{show(t.value)}</Text>  {t.sub}
                </Text>
                <Text style={styles.tileTotal}>All time: {show(t.total)}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#BBB" />
            </TouchableOpacity>
          ))}

          {/* Week calendar */}
          <View style={styles.weekHeader}>
            <View style={styles.weekTitleRow}>
              <Icon name="calendar-week" size={16} color="#1a1a1a" />
              <Text style={styles.weekTitle}>{weekLabel}</Text>
            </View>
            <View style={styles.weekNav}>
              <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekStart(w => addDays(w, -7))}>
                <Icon name="chevron-left" size={18} color="#555" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.weekNavBtn, styles.weekTodayBtn]} onPress={() => setWeekStart(weekStartOf(new Date()))}>
                <Text style={styles.weekTodayText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekStart(w => addDays(w, 7))}>
                <Icon name="chevron-right" size={18} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.card}>
            {weekLoading ? (
              <ActivityIndicator color="#E63946" style={{ paddingVertical: 30 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
                {days.map((d, i) => {
                  const key = ymd(d);
                  const list = byDay[key] ?? [];
                  const isToday = key === todayKey;
                  return (
                    <View key={key} style={[styles.dayCol, isToday && styles.dayColToday]}>
                      <View style={[styles.dayHead, isToday && styles.dayHeadToday]}>
                        <Text style={[styles.dayDow, isToday && styles.dayTextToday]}>{DOW[i]}</Text>
                        <Text style={[styles.dayNum, isToday && styles.dayTextToday]}>{d.getDate()}</Text>
                        <Text style={[styles.dayMon, isToday && styles.dayTextToday]}>{MONTHS[d.getMonth()]}</Text>
                        {list.length > 0 ? (
                          <View style={[styles.dayCount, isToday && styles.dayCountToday]}>
                            <Text style={[styles.dayCountText, isToday && styles.dayCountTextToday]}>{list.length}</Text>
                          </View>
                        ) : null}
                      </View>
                      <ScrollView style={styles.dayBody} nestedScrollEnabled>
                        {list.length === 0 ? (
                          <Text style={styles.dayEmpty}>–</Text>
                        ) : list.map(a => {
                          const trainer = staffName(a.trainer);
                          return (
                            <View key={a.id} style={styles.appt}>
                              {a.appointment_time ? (
                                <Text style={styles.apptTime}>
                                  <Icon name="clock-outline" size={10} color="#1E88E5" /> {fmtTime(a.appointment_time)}
                                </Text>
                              ) : null}
                              <Text style={styles.apptName} numberOfLines={2}>{a.client_name || 'Client'}</Text>
                              {trainer ? (
                                <Text style={styles.apptStaff} numberOfLines={2}>
                                  <Icon name="account-outline" size={10} color="#999" /> {trainer}
                                </Text>
                              ) : null}
                              {a.conversion ? (
                                <View style={[styles.apptBadge, { backgroundColor: conversionColor(a.conversion) }]}>
                                  <Text style={styles.apptBadgeText} numberOfLines={1}>{a.conversion}</Text>
                                </View>
                              ) : null}
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Diet Plans Issued */}
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Diet Plans Issued</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ViewMealsPlan')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{show(diet.total)}</Text>
                <Text style={styles.miniStatLabel}>Total</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{show(diet.this_week)}</Text>
                <Text style={styles.miniStatLabel}>This Week</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#43A047' }]}>{show(diet.issued_count)}</Text>
                <Text style={styles.miniStatLabel}>Clients</Text>
              </View>
            </View>

            {goals.length > 0 ? (
              <>
                <Text style={styles.subTitle}>Top Goals</Text>
                {goals.map((g: any, i: number) => (
                  <View key={`${g.goal}-${i}`} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>{g.goal}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${(g.count / maxGoal) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
                    </View>
                    <Text style={styles.barValue}>{g.count}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </View>

          {/* Health Camps */}
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Health Camps</Text>
            <TouchableOpacity onPress={() => navigation.navigate('HealthCamps')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{show(camp.total)}</Text>
                <Text style={styles.miniStatLabel}>Total</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{show(camp.this_week)}</Text>
                <Text style={styles.miniStatLabel}>This Week</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{show(camp.upcoming)}</Text>
                <Text style={styles.miniStatLabel}>Upcoming</Text>
              </View>
            </View>
          </View>

          {/* Referral Sheet */}
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Referral Sheet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ReferralSheet')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#E63946' }]}>{show(referral.total_referrals)}</Text>
                <Text style={styles.miniStatLabel}>Total Referrals</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#FB8C00' }]}>{show(referral.total_transformations)}</Text>
                <Text style={styles.miniStatLabel}>Transformations</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#1E88E5' }]}>{show(referral.total_active_clients)}</Text>
                <Text style={styles.miniStatLabel}>Active Clients</Text>
              </View>
            </View>

            <Text style={styles.subTitle}>This Week</Text>
            <View style={styles.weekStatsRow}>
              <View style={styles.weekItem}>
                <Icon name="account-plus-outline" size={16} color="#666" />
                <Text style={styles.weekLabel}>Referrals</Text>
                <Text style={styles.weekValue}>{referral.current_week?.referrals ?? 0}</Text>
              </View>
              <View style={styles.weekItem}>
                <Icon name="lightbulb-outline" size={16} color="#666" />
                <Text style={styles.weekLabel}>Transformations</Text>
                <Text style={styles.weekValue}>{referral.current_week?.transformations ?? 0}</Text>
              </View>
              <View style={styles.weekItem}>
                <Icon name="account-multiple-outline" size={16} color="#666" />
                <Text style={styles.weekLabel}>Active Clients</Text>
                <Text style={styles.weekValue}>{referral.current_week?.active_clients ?? 0}</Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <View style={[styles.badgeBox, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="google" size={16} color="#43A047" />
                <Text style={styles.badgeValue}>{show(referral.total_google_reviews)}</Text>
                <Text style={styles.badgeLabel}>Google Reviews</Text>
              </View>
              <View style={[styles.badgeBox, { backgroundColor: '#FBEAEA' }]}>
                <Icon name="video-outline" size={16} color="#E63946" />
                <Text style={styles.badgeValue}>{show(referral.total_video_shoots)}</Text>
                <Text style={styles.badgeLabel}>Video Shoots</Text>
              </View>
            </View>
          </View>

          {/* Conversion Stats — the web lists the first ten. */}
          <Text style={styles.sectionTitle}>Conversion Stats</Text>
          <View style={styles.card}>
            {conversionStats.length === 0 ? (
              <Text style={styles.emptyText}>No conversion data.</Text>
            ) : conversionStats.slice(0, 10).map((c: any, i: number) => (
              <View key={`${c.conversion}-${i}`} style={styles.convRow}>
                <Text style={styles.convLabel}>{c.conversion || 'Unknown'}</Text>
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
            <TouchableOpacity style={styles.actionCard} onPress={refreshAll}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFF5F5' }]}>
                <Icon name="refresh" size={22} color="#64748B" />
              </View>
              <Text style={styles.actionLabel}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <Modal visible={branchOpen} transparent animationType="fade" onRequestClose={() => setBranchOpen(false)}>
        <TouchableOpacity style={styles.modalBack} activeOpacity={1} onPress={() => setBranchOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Branch</Text>
            {loadingOptions ? (
              <ActivityIndicator color="#E63946" style={styles.modalLoader} />
            ) : (
              <ScrollView>
                {options.map(o => (
                  <TouchableOpacity
                    key={o.id}
                    style={styles.modalRow}
                    onPress={() => { setPickedBranch(o); setBranchOpen(false); }}
                  >
                    <Text style={styles.modalRowText}>{o.name}</Text>
                    {pickedBranch?.id === o.id && <Icon name="check" size={18} color="#E63946" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  branchControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  branchControlText: { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '500' },

  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 30 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, maxHeight: '60%' },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  modalLoader: { marginVertical: 16 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  modalRowText: { fontSize: 13.5, color: '#334155' },
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

  welcome: { fontSize: 13, color: '#777', marginBottom: 10 },

  tile: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12,
    padding: 12, marginTop: 10, borderLeftWidth: 3,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  tileIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 11, fontWeight: '800', color: '#555', letterSpacing: 0.4 },
  tileLine: { fontSize: 12, color: '#777', marginTop: 2 },
  tileValue: { fontSize: 18, fontWeight: '900' },
  tileTotal: { fontSize: 11, color: '#999', marginTop: 1 },

  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  weekTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  weekTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  weekNav: { flexDirection: 'row', gap: 4 },
  weekNavBtn: {
    height: 30, minWidth: 30, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  weekTodayBtn: { paddingHorizontal: 10, borderColor: '#FFCDD2' },
  weekTodayText: { fontSize: 12, fontWeight: '700', color: '#E63946' },
  weekRow: { gap: 8 },
  dayCol: { width: 128, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden' },
  dayColToday: { borderColor: '#E63946', borderWidth: 1.5 },
  dayHead: { alignItems: 'center', paddingVertical: 8, backgroundColor: '#F7F8FA' },
  dayHeadToday: { backgroundColor: '#1A1A1A' },
  dayDow: { fontSize: 11, fontWeight: '700', color: '#777' },
  dayNum: { fontSize: 18, fontWeight: '900', color: '#1a1a1a', lineHeight: 22 },
  dayMon: { fontSize: 11, color: '#999' },
  dayTextToday: { color: '#FFF' },
  dayCount: { marginTop: 4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dayCountToday: { backgroundColor: '#FFF' },
  dayCountText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  dayCountTextToday: { color: '#1A1A1A' },
  dayBody: { maxHeight: 280, padding: 5 },
  dayEmpty: { textAlign: 'center', color: '#BBB', paddingVertical: 24 },
  appt: { backgroundColor: '#F3F7FD', borderLeftWidth: 3, borderLeftColor: '#1E88E5', borderRadius: 6, padding: 6, marginBottom: 5 },
  apptTime: { fontSize: 10.5, fontWeight: '800', color: '#1E88E5' },
  apptName: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', marginTop: 1 },
  apptStaff: { fontSize: 10.5, color: '#888', marginTop: 1 },
  apptBadge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  apptBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#FFF' },

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

  weekStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
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
