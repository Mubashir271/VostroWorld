// src/screens/Fitness/PTDashboard/index.tsx
//
// PT Dashboard — the app's version of the web admin's /pt-dashboard page, the
// personal trainer's (role 9) landing screen.
//
// Every figure comes from one call, GET
// /v1/fitness/commission-portal/trainer/summary, which is what the web page
// itself uses (confirmed in the 2026-09-23 HAR). Nothing is recomputed here:
// the web's tiles and this screen's tiles read the same fields, so the two
// cannot drift apart. Verified against prod on 2026-09-23 for
// adeela@vostroworld.com — 20 active clients, 27.3% retention (3 renewed / 11
// expired), Rs 277,515 month sales, 12 present, 159 sessions conducted, 475
// remaining, 8 expiring — all matching the web page side by side.
//
// Layout mirrors the web's sections and their order (Today at a glance →
// Packages & attendance → My clients + SOPs), but the styling is the app's own
// — #F7F8FA canvas, white cards, #E63946 accent — not the web's Bootstrap.
//
// The two web panels that scroll internally (Packages & attendance, My
// clients) scroll here too, as capped-height nested lists, so the page keeps
// its shape instead of growing to 20+ rows per panel.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import BurgerSVG from '../../../assets/svg/BurgerSVG';
import {
  getTrainerSummary, getTrainerSOPs, PTSummaryResponse, TrainerSOP,
} from '../../../api/trainer';

type Summary = PTSummaryResponse['data'];

// Panels are capped rather than sized to their content: the web's equivalents
// scroll inside a fixed pane, and an uncapped list would push SOPs and the
// rest of the page far below the fold.
const PANEL_MAX_H = 260;
const CLIENTS_MAX_H = 340;

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// "2026-09-27" → "27 Sep 2026". Parsed by hand rather than via `new Date(s)`:
// a bare date string is treated as UTC and can render as the previous day in
// a behind-UTC zone.
const fmtDate = (s?: string): string => {
  if (!s) return '—';
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return s;
  return `${d} ${MONTHS[m - 1] ?? ''} ${y}`;
};

const fmtLongToday = (): string => {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// The web writes money as "Rs 277,515" — no decimals.
const fmtMoney = (n?: number): string =>
  `Rs ${Math.round(Number(n ?? 0)).toLocaleString('en-US')}`;

// "2026-08-26" + "2026-09-25" → "26 Aug – 25 Sep", the trainer's commission
// cycle as the web labels it.
const fmtPeriod = (start?: string, end?: string): string => {
  if (!start || !end) return '—';
  const [, sm, sd] = start.split('-').map(Number);
  const [, em, ed] = end.split('-').map(Number);
  return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]}`;
};

// Cycle day-of-month pair, e.g. "26→25", shown next to the Sessions tile.
const cycleTag = (start?: string, end?: string): string => {
  if (!start || !end) return '';
  return `(${Number(start.split('-')[2])}→${Number(end.split('-')[2])})`;
};

const daysLeftTone = (d: number) =>
  d <= 3 ? { bg: '#FFEBEE', fg: '#C62828' }
    : d <= 7 ? { bg: '#FFF3E0', fg: '#E65100' }
      : { bg: '#E8F1FC', fg: '#1E88E5' };

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({
  label, value, sub, icon, color, bg, accent,
}: {
  label: string; value: string; sub: string;
  icon: string; color: string; bg: string; accent: string;
}) => (
  <View style={[styles.statCard, { borderLeftColor: accent }]}>
    <View style={styles.statTop}>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={16} color={color} />
      </View>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statSub} numberOfLines={2}>{sub}</Text>
  </View>
);

const PanelHeader = ({ title, badge }: { title: string; badge: string }) => (
  <View style={styles.panelHeader}>
    <Text style={styles.panelTitle}>{title}</Text>
    <View style={styles.panelBadge}>
      <Text style={styles.panelBadgeText}>{badge}</Text>
    </View>
  </View>
);

const Empty = ({ text }: { text: string }) => (
  <Text style={styles.emptyText}>{text}</Text>
);

// ── Screen ────────────────────────────────────────────────────────────────────

const PTDashboard = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);

  // Branch-scoped login: the trainer is pinned to their own branch, matching
  // the standing rule that only branch-less logins get a picker.
  const branchId = profile?.branchId || '';

  const [data, setData] = useState<Summary | null>(null);
  const [sops, setSops] = useState<TrainerSOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await getTrainerSummary({ branch_id: branchId });
      setData(res?.data ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not load the dashboard.');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    // SOPs are a second, independent call (the web loads them the same way).
    // A failure here must not blank the dashboard, so it is swallowed and the
    // panel simply renders empty.
    try {
      const rows = await getTrainerSOPs({ branch_id: branchId, limit: 5 });
      setSops(Array.isArray(rows) ? rows : []);
    } catch {
      setSops([]);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const expiring = data?.expiring_soon ?? [];
  const checkins = data?.checkins_today?.clients ?? [];
  const clients = data?.clients ?? [];
  const cycle = data?.sessions_cycle;

  const statCards = useMemo(() => {
    const r = data?.retention;
    const s = data?.sales;
    return [
      {
        label: 'ACTIVE CLIENTS',
        value: String(data?.active_clients ?? 0),
        sub: 'Clients on a running PT package',
        icon: 'account-group', color: '#2E7D32', bg: '#E8F5E9', accent: '#2E7D32',
      },
      {
        label: 'RETENTION RATE',
        value: `${r?.rate ?? 0}%`,
        sub: `${r?.renewed ?? 0} renewed / ${r?.expired_this_month ?? 0} expired this month`,
        icon: 'autorenew', color: '#1E88E5', bg: '#E8F1FC', accent: '#1E88E5',
      },
      {
        label: 'SALES',
        value: fmtMoney(s?.month),
        sub: `Today ${fmtMoney(s?.today)}`,
        icon: 'cash-multiple', color: '#E63946', bg: '#FFE5E5', accent: '#E63946',
      },
      {
        label: 'PRESENT TODAY',
        value: String(data?.checkins_today?.present_count ?? 0),
        sub: 'Checked-in clients',
        icon: 'account-check', color: '#2E7D32', bg: '#E8F5E9', accent: '#2E7D32',
      },
      {
        label: `SESSIONS ${cycleTag(cycle?.period?.start, cycle?.period?.end)}`.trim(),
        value: String(cycle?.conducted ?? 0),
        sub: `${fmtPeriod(cycle?.period?.start, cycle?.period?.end)} · Remaining ${cycle?.remaining ?? 0}`,
        icon: 'lightning-bolt', color: '#8E24AA', bg: '#F3E5F5', accent: '#8E24AA',
      },
    ];
  }, [data, cycle]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <AppHeader
        title="PT Dashboard"
        leftIcon={
          navigation.canGoBack()
            ? <Icon name="arrow-left" size={24} color="#1A1A1A" />
            : <BurgerSVG width={24} height={24} />
        }
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.openDrawer())}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />
          }
        >
          {/* ── Title block ── */}
          <Text style={styles.eyebrow}>PERSONAL TRAINER</Text>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>
                {`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'PT Dashboard'}
              </Text>
              <Text style={styles.pageDate}>{fmtLongToday()}</Text>
            </View>
            <TouchableOpacity
              style={styles.trackerBtn}
              onPress={() => navigation.navigate('SessionTracker')}
              activeOpacity={0.85}
            >
              <Icon name="clipboard-check-outline" size={14} color="#FFF" />
              <Text style={styles.trackerBtnText}>Session Tracker</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color="#C62828" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Today at a glance ── */}
          <Text style={styles.sectionTitle}>Today at a glance</Text>
          <View style={styles.statsGrid}>
            {statCards.map(c => <StatCard key={c.label} {...c} />)}
          </View>

          {/* ── Packages & attendance ── */}
          <Text style={styles.sectionTitle}>Packages & attendance</Text>

          <View style={styles.card}>
            <PanelHeader
              title="Expiring Soon (14 days)"
              badge={`${expiring.length} client${expiring.length === 1 ? '' : 's'}`}
            />
            {expiring.length === 0 ? (
              <Empty text="No packages expiring in the next 14 days." />
            ) : (
              <ScrollView style={{ maxHeight: PANEL_MAX_H }} nestedScrollEnabled>
                {expiring.map((e, i) => {
                  const tone = daysLeftTone(e.days_left);
                  return (
                    <View key={`${e.client_id}-${i}`} style={[styles.row, i > 0 && styles.rowBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName} numberOfLines={1}>{e.name}</Text>
                        <Text style={styles.rowSub} numberOfLines={1}>{e.package_name}</Text>
                        <Text style={styles.rowMeta}>
                          Ends {fmtDate(e.end_date)} · {e.sessions_remaining} left
                        </Text>
                      </View>
                      <View style={[styles.pill, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.pillText, { color: tone.fg }]}>
                          {e.days_left}d
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={[styles.card, { marginTop: 10 }]}>
            <PanelHeader
              title="Today's Check-ins"
              badge={`${data?.checkins_today?.present_count ?? 0} present`}
            />
            {checkins.length === 0 ? (
              <Empty text="No client check-ins recorded today." />
            ) : (
              <ScrollView style={{ maxHeight: PANEL_MAX_H }} nestedScrollEnabled>
                {checkins.map((c, i) => (
                  <View key={`${c.client_id}-${i}`} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(c.name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.rowName, { flex: 1 }]} numberOfLines={1}>{c.name}</Text>
                    <View style={styles.timeBox}>
                      <Text style={styles.timeText}>{c.check_in_time}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* ── My clients ── */}
          <Text style={styles.sectionTitle}>My clients</Text>

          <View style={styles.card}>
            <PanelHeader title="Active Clients" badge={`${clients.length}`} />
            <Text style={styles.panelHint}>Assessments · sessions remaining</Text>
            {clients.length === 0 ? (
              <Empty text="No active clients." />
            ) : (
              <ScrollView style={{ maxHeight: CLIENTS_MAX_H }} nestedScrollEnabled>
                {clients.map((c, i) => (
                  <View key={`${c.client_id}-${i}`} style={[styles.clientRow, i > 0 && styles.rowBorder]}>
                    <View style={styles.clientTop}>
                      <Text style={styles.rowName} numberOfLines={1}>{c.name}</Text>
                      {c.is_present_today ? (
                        <View style={styles.presentPill}>
                          <Text style={styles.presentPillText}>Present</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.rowSub} numberOfLines={1}>{c.package_name}</Text>
                    <Text style={styles.rowMeta}>
                      Ends {fmtDate(c.end_date)} · {c.sessions_delivered}/{c.total_sessions} · {c.sessions_remaining} left
                    </Text>

                    <View style={styles.assessRow}>
                      {c.has_pre_assessment ? (
                        <>
                          <TouchableOpacity
                            style={styles.assessBtn}
                            onPress={() => navigation.navigate('ViewAssessment', {
                              clientId: c.client_id, clientName: c.name,
                            })}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.assessBtnText}>View</Text>
                          </TouchableOpacity>
                          {c.has_post_assessment ? (
                            <View style={styles.doneTag}>
                              <Icon name="check" size={12} color="#2E7D32" />
                              <Text style={styles.doneTagText}>Post done</Text>
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <TouchableOpacity
                          style={[styles.assessBtn, styles.assessBtnPrimary]}
                          onPress={() => navigation.navigate('AddPreAssessment', {
                            clientId: c.client_id, clientName: c.name,
                          })}
                          activeOpacity={0.8}
                        >
                          <Icon name="plus" size={12} color="#E63946" />
                          <Text style={styles.assessBtnText}>Add Pre</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* ── SOPs ── */}
          <View style={styles.rowHeader}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>SOPs</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SOPs')}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {sops.length === 0 ? (
              <Empty text="No SOPs published." />
            ) : (
              sops.map((s: any, i: number) => (
                <TouchableOpacity
                  key={s?.id ?? i}
                  style={[styles.sopRow, i > 0 && styles.rowBorder]}
                  onPress={() => navigation.navigate('SOPs')}
                  activeOpacity={0.8}
                >
                  <Icon name="file-document-outline" size={18} color="#E63946" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sopTitle} numberOfLines={2}>{s?.title ?? '—'}</Text>
                    {s?.sop_for ? (
                      <Text style={styles.rowMeta} numberOfLines={1}>{s.sop_for}</Text>
                    ) : null}
                  </View>
                  <Icon name="chevron-right" size={18} color="#CCC" />
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 14, paddingBottom: 30 },

  // Title block
  eyebrow: { fontSize: 10, fontWeight: '800', color: '#2E7D32', letterSpacing: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 },
  pageTitle: { fontSize: 19, fontWeight: '900', color: '#1a1a1a' },
  pageDate: { fontSize: 11.5, color: '#888', marginTop: 2 },
  trackerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E63946', borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 9,
  },
  trackerBtnText: { fontSize: 11.5, fontWeight: '700', color: '#FFF' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', borderRadius: 10, padding: 11, marginTop: 12,
  },
  errorText: { flex: 1, fontSize: 12.5, color: '#C62828' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 10, marginTop: 18 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  viewAll: { fontSize: 12, fontWeight: '700', color: '#E63946' },

  // Stat cards
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderLeftWidth: 3,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  statLabel: { flex: 1, fontSize: 9.5, color: '#888', fontWeight: '800', letterSpacing: 0.4 },
  statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 21, fontWeight: '900', color: '#1a1a1a', marginTop: 8 },
  statSub: { fontSize: 10, color: '#999', marginTop: 3, fontWeight: '500', lineHeight: 14 },

  // Panels
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  panelTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: '#1a1a1a' },
  panelBadge: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  panelBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#64748B' },
  panelHint: { fontSize: 10.5, color: '#999', marginTop: 3, fontWeight: '600' },

  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 14 },

  // Generic rows
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  rowName: { fontSize: 13.5, fontWeight: '700', color: '#1a1a1a' },
  rowSub: { fontSize: 11, color: '#999', marginTop: 2 },
  rowMeta: { fontSize: 10.5, color: '#AAA', marginTop: 3, fontWeight: '500' },

  pill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '800' },

  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFE5E5',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#E63946' },
  timeBox: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  timeText: { fontSize: 10.5, fontWeight: '800', color: '#2E7D32' },

  // Client rows
  clientRow: { paddingVertical: 11 },
  clientTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  presentPill: { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  presentPillText: { fontSize: 10, fontWeight: '800', color: '#2E7D32' },

  assessRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  assessBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8,
    paddingHorizontal: 11, paddingVertical: 6,
  },
  assessBtnPrimary: { borderColor: '#FFCDD2', backgroundColor: '#FFF5F5' },
  assessBtnText: { fontSize: 11.5, fontWeight: '700', color: '#E63946' },
  doneTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  doneTagText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },

  // SOPs
  sopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  sopTitle: { fontSize: 12.5, fontWeight: '700', color: '#1a1a1a' },
});

export default PTDashboard;
