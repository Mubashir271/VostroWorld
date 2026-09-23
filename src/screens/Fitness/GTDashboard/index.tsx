// src/screens/Fitness/GTDashboard/index.tsx
//
// GT Dashboard — the app's version of the web admin's /gt-dashboard, the
// General Trainer's (role '17') working screen.
//
// A General Trainer assesses clients and refers suitable ones to a personal
// trainer, then records whether that referral converted. The page is three
// things: a date-ranged tile row, a client-assessment panel (range list plus a
// per-client full history), and the BeFit referral form and its conversion
// table.
//
// Backed by /v1/fitness/general-trainer/* — see api/generalTrainer.ts for
// which parts are live-verified and which are transcribed from the web bundle.
// Unlike the PT summary, everything here is scoped to a date range, so the
// range controls drive a refetch rather than filtering in memory.
//
// Styling is the app's own (#F7F8FA canvas, white cards, #E63946 accent), not
// the web's Bootstrap.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { RootState } from '../../../redux/store';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import BurgerSVG from '../../../assets/svg/BurgerSVG';
import {
  getGTSummary, getGTClientAssessments, storeBefitReferral,
  updateBefitConversion, CONVERSION_STATUSES,
  GTSummaryResponse, GTAssessment, ConversionStatus,
} from '../../../api/generalTrainer';
import { getClientNames } from '../../../api/employeeDashboard';

type Summary = GTSummaryResponse['data'];

const PANEL_MAX_H = 300;

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Parsed by hand rather than via `new Date(s)`: a bare date string is treated
// as UTC and can render as the previous day in a behind-UTC zone.
const fmtDate = (s?: string | null): string => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(s);
  return `${d} ${MONTHS[m - 1] ?? ''} ${y}`;
};

const fmtLongToday = (): string => {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const rangeLabel = (a: string, b: string) => `${fmtDate(a)} – ${fmtDate(b)}`;

const monthStart = () => { const d = new Date(); d.setDate(1); return iso(d); };

const num = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v));

const conversionTone = (v: any) => {
  const t = String(v ?? 'Pending');
  if (t === 'Yes') return { bg: '#E8F5E9', fg: '#2E7D32' };
  if (t === 'No') return { bg: '#FFEBEE', fg: '#C62828' };
  return { bg: '#FFF4E5', fg: '#B45309' };
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon, color, bg, accent }: {
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
    <View style={styles.panelBadge}><Text style={styles.panelBadgeText}>{badge}</Text></View>
  </View>
);

const AssessmentRow = ({ a, first }: { a: GTAssessment; first: boolean }) => (
  <View style={[styles.stackRow, !first && styles.rowBorder]}>
    <View style={styles.panelRow}>
      <Text style={[styles.rowName, styles.flex1]} numberOfLines={1}>{a.client_name}</Text>
      <Text style={styles.rowDate}>{fmtDate(a.date)}</Text>
    </View>
    <View style={styles.metricRow}>
      <View style={styles.metric}>
        <Text style={styles.metricValue}>{num(a.weight)}</Text>
        <Text style={styles.metricLabel}>Weight</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricValue}>{num(a.body_mass_index)}</Text>
        <Text style={styles.metricLabel}>BMI</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricValue}>{num(a.fat)}</Text>
        <Text style={styles.metricLabel}>Fat %</Text>
      </View>
    </View>
    <Text style={styles.rowMeta} numberOfLines={1}>
      {a.category && a.category !== 'N/A' ? `${a.category} · ` : ''}
      Added by {a.added_by || '—'}
    </Text>
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────

const GTDashboard = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);

  // Branch-scoped login: pinned to their own branch, per the standing rule
  // that only branch-less logins (super admin, HR) get a picker.
  const branchId = profile?.branchId || '';

  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(iso(new Date()));
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);

  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Client list backs both the timeline picker and the referral form. It is a
  // big list (2,675 rows live on this branch), so both pickers search rather
  // than scroll.
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);

  // Timeline panel
  const [timelineId, setTimelineId] = useState<number | 0>(0);
  const [timeline, setTimeline] = useState<GTAssessment[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Referral form
  const [refClient, setRefClient] = useState<{ id: number; name: string } | null>(null);
  const [refTrainer, setRefTrainer] = useState<{ id: number; name: string } | null>(null);
  const [refDate, setRefDate] = useState(iso(new Date()));
  const [refDatePicker, setRefDatePicker] = useState(false);
  const [refNotes, setRefNotes] = useState('');
  const [refClientOpen, setRefClientOpen] = useState(false);
  const [refTrainerOpen, setRefTrainerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Conversion editor
  const [convFor, setConvFor] = useState<number | 0>(0);

  const [query, setQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await getGTSummary({ branch_id: branchId, start_date: start, end_date: end });
      setData(res?.data ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not load the dashboard.');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, start, end]);

  useEffect(() => { load(); }, [load]);

  // One-off: the client list does not change with the date range.
  useEffect(() => {
    getClientNames({ branch_id: branchId })
      .then(res => {
        const rows = res?.data ?? [];
        setClients(
          (Array.isArray(rows) ? rows : []).map((c: any) => ({
            id: c.id,
            name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || `Client #${c.id}`,
          })),
        );
      })
      .catch(() => setClients([]));
  }, [branchId]);

  // Timeline is a per-client full history, independent of the range.
  useEffect(() => {
    if (!timelineId) { setTimeline(null); return; }
    let cancelled = false;
    setTimelineLoading(true);
    getGTClientAssessments(timelineId)
      .then(rows => { if (!cancelled) setTimeline(rows); })
      .catch(() => { if (!cancelled) setTimeline([]); })
      .finally(() => { if (!cancelled) setTimelineLoading(false); });
    return () => { cancelled = true; };
  }, [timelineId]);

  const saveReferral = async () => {
    if (!refClient) { Alert.alert('Select a client', 'Choose the client you are referring.'); return; }
    if (!refTrainer) { Alert.alert('Select a trainer', 'Choose the personal trainer to refer to.'); return; }
    setSaving(true);
    try {
      await storeBefitReferral({
        branch_id: branchId,
        client_id: refClient.id,
        trainer_id: refTrainer.id,
        referral_date: refDate,
        notes: refNotes.trim(),
      });
      setRefClient(null); setRefTrainer(null); setRefNotes('');
      await load(true);
      Alert.alert('Saved', 'BeFit referral saved.');
    } catch (e: any) {
      Alert.alert('Not saved', e?.response?.data?.message || 'Could not save the referral.');
    } finally { setSaving(false); }
  };

  const setConversion = async (id: number, status: ConversionStatus) => {
    setConvFor(0);
    try {
      await updateBefitConversion(id, status, iso(new Date()));
      await load(true);
    } catch (e: any) {
      Alert.alert('Not updated', e?.response?.data?.message || 'Could not update conversion.');
    }
  };

  const stats = data?.referral_stats;
  const assessments = data?.assessments ?? [];
  const referrals = data?.referrals ?? [];
  const trainers = data?.trainers ?? [];

  const statCards = useMemo(() => [
    {
      label: 'ASSESSMENTS', value: String(data?.assessment_count ?? 0),
      sub: 'In the selected date range',
      icon: 'clipboard-pulse-outline', color: '#2E7D32', bg: '#E8F5E9', accent: '#2E7D32',
    },
    {
      label: 'BEFIT REFERRALS', value: String(stats?.total ?? 0),
      sub: 'Clients pushed to personal training',
      icon: 'send-outline', color: '#1E88E5', bg: '#E8F1FC', accent: '#1E88E5',
    },
    {
      label: 'CONVERTED TO PT', value: String(stats?.converted ?? 0),
      sub: 'Marked as signed up',
      icon: 'account-check-outline', color: '#2E7D32', bg: '#E8F5E9', accent: '#2E7D32',
    },
    {
      label: 'PENDING', value: String(stats?.pending ?? 0),
      sub: 'Awaiting conversion decision',
      icon: 'timer-sand', color: '#E65100', bg: '#FFF3E0', accent: '#E65100',
    },
    {
      label: 'NOT CONVERTED', value: String(stats?.not_converted ?? 0),
      sub: 'Did not take PT',
      icon: 'close-circle-outline', color: '#C62828', bg: '#FFEBEE', accent: '#C62828',
    },
  ], [data, stats]);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q ? clients.filter(c => c.name.toLowerCase().includes(q) || String(c.id).includes(q)) : clients;
    // The list runs to thousands; the picker shows a workable slice and the
    // search narrows it, rather than mounting every row.
    return rows.slice(0, 80);
  }, [clients, query]);

  const timelineClient = clients.find(c => c.id === timelineId);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <AppHeader
        title="GT Dashboard"
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
          {/* ── Title + range ── */}
          <Text style={styles.eyebrow}>GENERAL TRAINER</Text>
          <Text style={styles.pageTitle}>
            {`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'GT Dashboard'}
          </Text>
          <Text style={styles.pageDate}>{fmtLongToday()}</Text>

          <View style={styles.rangeRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setPicker('start')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={styles.dateText}>{fmtDate(start)}</Text>
            </TouchableOpacity>
            <Text style={styles.rangeSep}>→</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setPicker('end')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={styles.dateText}>{fmtDate(end)}</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color="#C62828" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── At a glance ── */}
          <Text style={styles.sectionTitle}>{rangeLabel(start, end)} at a glance</Text>
          <View style={styles.statsGrid}>
            {statCards.map(c => <StatCard key={c.label} {...c} />)}
          </View>

          {/* ── Client assessments ── */}
          <Text style={styles.sectionTitle}>Client assessments</Text>

          <View style={styles.card}>
            <PanelHeader
              title="Assessment timeline"
              badge={`${assessments.length} record${assessments.length === 1 ? '' : 's'} in range`}
            />

            <Text style={styles.fieldLabel}>CLIENT TIMELINE</Text>
            <TouchableOpacity style={styles.select} onPress={() => setTimelineOpen(true)}>
              <Text
                style={[styles.selectText, !timelineClient && styles.selectPlaceholder]}
                numberOfLines={1}
              >
                {timelineClient ? `${timelineClient.name} (#${timelineClient.id})` : 'Select a client to see their full history…'}
              </Text>
              <Icon name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.smallBtn, !timelineId && styles.smallBtnOff]}
                disabled={!timelineId}
                onPress={() => navigation.navigate('AddPreAssessment', {
                  clientId: timelineId, clientName: timelineClient?.name,
                })}
              >
                <Text style={[styles.smallBtnText, !timelineId && styles.smallBtnTextOff]}>Add Pre</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, !timelineId && styles.smallBtnOff]}
                disabled={!timelineId}
                onPress={() => navigation.navigate('ViewAssessment', {
                  clientId: timelineId, clientName: timelineClient?.name,
                })}
              >
                <Text style={[styles.smallBtnText, !timelineId && styles.smallBtnTextOff]}>Full page</Text>
              </TouchableOpacity>
            </View>

            {timelineId ? (
              timelineLoading ? (
                <ActivityIndicator color="#E63946" style={styles.inlineLoader} />
              ) : (timeline?.length ?? 0) === 0 ? (
                <Text style={styles.emptyText}>No assessments recorded for this client.</Text>
              ) : (
                <ScrollView style={{ maxHeight: PANEL_MAX_H }} nestedScrollEnabled>
                  {timeline!.map((a, i) => <AssessmentRow key={a.id} a={a} first={i === 0} />)}
                </ScrollView>
              )
            ) : assessments.length === 0 ? (
              <Text style={styles.emptyText}>
                No assessments in this date range. Pick a client above to see their full history.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: PANEL_MAX_H }} nestedScrollEnabled>
                {assessments.map((a, i) => <AssessmentRow key={a.id} a={a} first={i === 0} />)}
              </ScrollView>
            )}
          </View>

          {/* ── Refer to BeFit ── */}
          <View style={[styles.card, styles.cardGap]}>
            <PanelHeader title="Refer to BeFit" badge="Push client to a PT" />

            <Text style={styles.fieldLabel}>SEARCH CLIENT</Text>
            <TouchableOpacity style={styles.select} onPress={() => setRefClientOpen(true)}>
              <Text
                style={[styles.selectText, !refClient && styles.selectPlaceholder]}
                numberOfLines={1}
              >
                {refClient ? `${refClient.name} (#${refClient.id})` : 'Select client…'}
              </Text>
              <Icon name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>PERSONAL TRAINER</Text>
            <TouchableOpacity style={styles.select} onPress={() => setRefTrainerOpen(true)}>
              <Text
                style={[styles.selectText, !refTrainer && styles.selectPlaceholder]}
                numberOfLines={1}
              >
                {refTrainer?.name ?? 'Select PT…'}
              </Text>
              <Icon name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>REFERRAL DATE</Text>
            <TouchableOpacity style={styles.select} onPress={() => setRefDatePicker(true)}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={styles.selectText}>{fmtDate(refDate)}</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>NOTES</Text>
            <TextInput
              style={[styles.input, styles.inputArea]}
              placeholder="Anything the trainer should know"
              placeholderTextColor="#B0B0B0"
              multiline
              numberOfLines={3}
              value={refNotes}
              onChangeText={setRefNotes}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={saveReferral} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={styles.primaryBtnText}>Save BeFit referral</Text>}
            </TouchableOpacity>
          </View>

          {/* ── BeFit conversions ── */}
          <Text style={styles.sectionTitle}>BeFit conversions</Text>
          <View style={styles.card}>
            <PanelHeader
              title="My BeFit referrals"
              badge={`${stats?.converted ?? 0} converted · ${stats?.pending ?? 0} pending`}
            />
            {referrals.length === 0 ? (
              <Text style={styles.emptyText}>No BeFit referrals in this date range.</Text>
            ) : (
              <ScrollView style={{ maxHeight: PANEL_MAX_H }} nestedScrollEnabled>
                {referrals.map((r, i) => {
                  const tone = conversionTone(r.converted_to_pt);
                  return (
                    <View key={r.id} style={[styles.stackRow, i > 0 && styles.rowBorder]}>
                      <View style={styles.panelRow}>
                        <Text style={[styles.rowName, styles.flex1]} numberOfLines={1}>{r.client_name}</Text>
                        <Text style={styles.rowDate}>{fmtDate(r.referral_date)}</Text>
                      </View>
                      <Text style={styles.rowSub} numberOfLines={1}>PT: {r.trainer_name || '—'}</Text>
                      {r.notes ? <Text style={styles.rowMeta}>{r.notes}</Text> : null}
                      <View style={styles.panelRow}>
                        <TouchableOpacity
                          style={[styles.pill, { backgroundColor: tone.bg }]}
                          onPress={() => setConvFor(r.id)}
                        >
                          <Text style={[styles.pillText, { color: tone.fg }]}>
                            {r.converted_to_pt || 'Pending'}
                          </Text>
                          <Icon name="chevron-down" size={13} color={tone.fg} />
                        </TouchableOpacity>
                        {r.converted_at
                          ? <Text style={styles.rowMeta}>{fmtDate(r.converted_at)}</Text>
                          : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Range pickers ── */}
      <DateTimePickerModal
        isVisible={picker !== null}
        mode="date"
        date={new Date(picker === 'end' ? end : start)}
        onConfirm={d => {
          const v = iso(d);
          // Keep the range ordered: moving the start past the end drags the
          // end with it rather than producing an inverted window.
          if (picker === 'end') setEnd(v < start ? start : v);
          else { setStart(v); if (end < v) setEnd(v); }
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
      />
      <DateTimePickerModal
        isVisible={refDatePicker}
        mode="date"
        date={new Date(refDate)}
        onConfirm={d => { setRefDate(iso(d)); setRefDatePicker(false); }}
        onCancel={() => setRefDatePicker(false)}
      />

      {/* ── Client pickers (timeline + referral share one searchable list) ── */}
      <Modal
        visible={timelineOpen || refClientOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { setTimelineOpen(false); setRefClientOpen(false); }}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => { setTimelineOpen(false); setRefClientOpen(false); }}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select client</Text>
            <TextInput
              style={styles.input}
              placeholder="Name, ID, or phone"
              placeholderTextColor="#B0B0B0"
              value={query}
              onChangeText={setQuery}
            />
            <ScrollView>
              {filteredClients.length === 0 ? (
                <Text style={styles.emptyText}>No clients match that search.</Text>
              ) : filteredClients.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.optionRow}
                  onPress={() => {
                    if (timelineOpen) { setTimelineId(c.id); setTimelineOpen(false); }
                    else { setRefClient(c); setRefClientOpen(false); }
                    setQuery('');
                  }}
                >
                  <Text style={styles.optionText} numberOfLines={1}>{c.name} (#{c.id})</Text>
                </TouchableOpacity>
              ))}
              {clients.length > filteredClients.length ? (
                <Text style={styles.sheetNote}>
                  Showing {filteredClients.length} of {clients.length} — search to narrow.
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Trainer picker ── */}
      <Modal visible={refTrainerOpen} transparent animationType="fade" onRequestClose={() => setRefTrainerOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setRefTrainerOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select personal trainer</Text>
            <ScrollView>
              {trainers.length === 0 ? (
                <Text style={styles.emptyText}>No trainers available.</Text>
              ) : trainers.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.optionRow}
                  onPress={() => { setRefTrainer(t); setRefTrainerOpen(false); }}
                >
                  <Text style={styles.optionText} numberOfLines={1}>{t.name}</Text>
                  {refTrainer?.id === t.id && <Icon name="check" size={18} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Conversion picker ── */}
      <Modal visible={!!convFor} transparent animationType="fade" onRequestClose={() => setConvFor(0)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setConvFor(0)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Converted to PT?</Text>
            {CONVERSION_STATUSES.map(st => (
              <TouchableOpacity
                key={st}
                style={styles.optionRow}
                onPress={() => setConversion(convFor as number, st)}
              >
                <Text style={styles.optionText}>{st}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 14, paddingBottom: 30 },
  flex1: { flex: 1 },

  eyebrow: { fontSize: 10, fontWeight: '800', color: '#2E7D32', letterSpacing: 1 },
  pageTitle: { fontSize: 19, fontWeight: '900', color: '#1a1a1a', marginTop: 4 },
  pageDate: { fontSize: 11.5, color: '#888', marginTop: 2 },

  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10,
  },
  dateText: { fontSize: 12.5, color: '#1a1a1a', fontWeight: '600' },
  rangeSep: { fontSize: 13, color: '#9CA3AF' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', borderRadius: 10, padding: 11, marginTop: 12,
  },
  errorText: { flex: 1, fontSize: 12.5, color: '#C62828' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 10, marginTop: 18 },

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

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  cardGap: { marginTop: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  panelTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: '#1a1a1a' },
  panelBadge: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  panelBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#64748B' },

  fieldLabel: { fontSize: 9.5, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5, marginTop: 14 },
  select: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11, marginTop: 6,
    backgroundColor: '#FAFAFA',
  },
  selectText: { flex: 1, fontSize: 13, color: '#1A1A1A' },
  selectPlaceholder: { color: '#B0B0B0' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 6,
    fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA',
  },
  inputArea: { minHeight: 74, textAlignVertical: 'top' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: {
    borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFF5F5',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  smallBtnOff: { borderColor: '#EFEFEF', backgroundColor: '#FAFAFA' },
  smallBtnText: { fontSize: 11.5, fontWeight: '700', color: '#E63946' },
  smallBtnTextOff: { color: '#C4C4C4' },

  primaryBtn: {
    backgroundColor: '#E63946', borderRadius: 10,
    alignItems: 'center', paddingVertical: 12, marginTop: 16,
  },
  primaryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  stackRow: { paddingVertical: 11 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  rowName: { fontSize: 13.5, fontWeight: '700', color: '#1a1a1a' },
  rowSub: { fontSize: 11.5, color: '#666', marginTop: 3 },
  rowDate: { fontSize: 11, color: '#999', fontWeight: '600' },
  rowMeta: { fontSize: 10.5, color: '#AAA', marginTop: 3, fontWeight: '500' },

  metricRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  metric: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  metricValue: { fontSize: 13.5, fontWeight: '800', color: '#1a1a1a' },
  metricLabel: { fontSize: 9.5, color: '#9CA3AF', marginTop: 1, fontWeight: '600' },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 11, fontWeight: '800' },

  emptyText: { fontSize: 12.5, color: '#9CA3AF', textAlign: 'center', paddingVertical: 18, lineHeight: 18 },
  inlineLoader: { marginVertical: 20 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 26 },
  sheet: { backgroundColor: '#fff', borderRadius: 14, padding: 16, maxHeight: '72%' },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  sheetNote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingVertical: 10 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9',
  },
  optionText: { flex: 1, fontSize: 13.5, color: '#334155' },
});

export default GTDashboard;
