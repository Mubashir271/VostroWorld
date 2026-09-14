// src/screens/reports/FootfallReport/index.tsx
//
// Mirrors the web admin's Footfall Report (Reports › Footfall Report), which
// is four views over a single attendance query rather than four endpoints —
// see `getFootfallReport` in api/reports.ts for the capture notes.
//
//   Gender     — total/male/female, split donut, male-vs-female by hour
//   Branch     — top two branches, per-date branch trend
//   Peak Hours — busiest hour, entries/hour average, hourly bars + area
//   Combined   — whole-range totals, gender split, branch totals
//
// Gender/Branch/Peak Hours page through the API (Limit, default 25) and derive
// their figures from the current page's rows, exactly as the web does — its
// "Total Entries 25 / Male 14 / Female 11" is page one, not the 203-row day.
// Combined pulls the range in one 1000-row call and aggregates all of it.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Svg, { Circle, G, Rect, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import ClientNameCell from '../../../components/ClientNameCell';
import {
  getFootfallReport, getFootfallCombined, attendanceBranch, attendanceName, attendanceClientId,
  attendanceHour, FOOTFALL_MAX_DAYS, AttendanceRecord, FootfallCombinedResult,
} from '../../../api/reports';
import { getBranchesNameList } from '../../../api/employeeDashboard';

const MALE = '#2563EB';
const FEMALE = '#EC4899';

const CARD_W = Dimensions.get('window').width - 48; // screen padding + card padding

const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfMonth = () => { const d = new Date(); d.setDate(1); return fmt(d); };

const QUICK = [
  { label: 'Today',      start: today,             end: today },
  { label: 'Yesterday',  start: () => daysAgo(1),  end: () => daysAgo(1) },
  { label: 'This Month', start: startOfMonth,      end: today },
  { label: 'Last 30',    start: () => daysAgo(30), end: today },
];

const TABS = [
  { key: 'gender',   label: 'Gender' },
  { key: 'branch',   label: 'Branch' },
  { key: 'peak',     label: 'Peak Hours' },
  { key: 'combined', label: 'Combined' },
] as const;
type TabKey = typeof TABS[number]['key'];

// Lowercase on the wire — the Attendance Report capture shows the web sending
// gender=male, and the filter works (131 entries → 45). Rows come back
// capitalised ('Male'), so never compare a row's gender against these values.
const GENDERS = [
  { value: '',       label: 'All' },
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
];
const LIMITS = [10, 25, 50, 100].map(n => ({ value: String(n), label: String(n) }));

const hourLabel = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;
const timeLabel = (t: string) => {
  if (!t) return '';
  const [hh, mm] = t.split(':').map(Number);
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
};

type Option = { value: string; label: string };

const Dropdown = ({ label, value, options, onSelect, loading }: {
  label: string; value: string; options: Option[];
  onSelect: (v: string) => void; loading?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TouchableOpacity style={s.field} onPress={() => setOpen(true)}>
        <Text style={s.fieldText} numberOfLines={1}>
          {loading ? 'Loading…' : current?.label ?? '—'}
        </Text>
        <Icon name="chevron-down" size={16} color="#888" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[s.sheetRow, o.value === value && s.sheetRowActive]}
                  onPress={() => { onSelect(o.value); setOpen(false); }}
                >
                  <Text style={[s.sheetText, o.value === value && s.sheetTextActive]}>{o.label}</Text>
                  {o.value === value && <Icon name="check" size={16} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: React.ReactNode; color: string }) => (
  <View style={[s.statCard, { borderTopColor: color }]}>
    <Text style={[s.statValue, { color }]} numberOfLines={1}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

/** Male (bottom) / female (top) stacked columns — the web's hourly bar chart. */
const StackedBars = ({ data, width, height }: {
  data: { label: string; male: number; female: number }[]; width: number; height: number;
}) => {
  const max = Math.max(1, ...data.map(d => d.male + d.female));
  const gap = 8;
  const plot = height - 20;
  const bw = Math.max(6, (width - gap * (data.length + 1)) / data.length);
  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const x = gap + i * (bw + gap);
        const mh = (d.male / max) * plot;
        const fh = (d.female / max) * plot;
        const top = plot - mh - fh;
        return (
          <G key={d.label}>
            <Rect x={x} y={top} width={bw} height={fh} fill={FEMALE} />
            <Rect x={x} y={top + fh} width={bw} height={mh} fill={MALE} />
            <SvgText x={x + bw / 2} y={height - 5} fontSize={9} fill="#888" textAnchor="middle">
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

/** The web's "Hourly Usage (Area)" panel. */
const AreaChart = ({ data, width, height }: {
  data: { label: string; value: number }[]; width: number; height: number;
}) => {
  const max = Math.max(1, ...data.map(d => d.value));
  const plot = height - 20;
  const xs = (i: number) => (data.length === 1 ? width / 2 : (i / (data.length - 1)) * width);
  const ys = (v: number) => plot - (v / max) * (plot - 6);
  const line = data.map((d, i) => `${xs(i)},${ys(d.value)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polygon points={`0,${plot} ${line} ${width},${plot}`} fill="#14B8A6" fillOpacity={0.25} />
      <Polyline points={line} fill="none" stroke="#0D9488" strokeWidth={2} />
      {data.map((d, i) => (
        <SvgText key={d.label} x={xs(i)} y={height - 5} fontSize={9} fill="#888"
          textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
          {d.label}
        </SvgText>
      ))}
    </Svg>
  );
};

const SplitDonut = ({ male, female, size }: { male: number; female: number; size: number }) => {
  const total = male + female || 1;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const maleLen = (male / total) * c;
  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={FEMALE} strokeWidth={22} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={MALE} strokeWidth={22} fill="none"
          strokeDasharray={`${maleLen} ${c - maleLen}`} />
      </G>
      <SvgText x={size / 2} y={size / 2 + 5} fontSize={16} fontWeight="700" fill="#1A1A1A" textAnchor="middle">
        {male + female}
      </SvgText>
    </Svg>
  );
};

const HBars = ({ data }: { data: { label: string; value: number; color?: string }[] }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <View style={{ gap: 8 }}>
      {data.map(d => (
        <View key={d.label}>
          <View style={s.hbarHead}>
            <Text style={s.hbarLabel}>{d.label}</Text>
            <Text style={s.hbarValue}>{d.value}</Text>
          </View>
          <View style={s.hbarTrack}>
            <View style={[s.hbarFill, { width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? MALE }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

const Legend = () => (
  <View style={s.legend}>
    <View style={s.legendItem}><View style={[s.dot, { backgroundColor: MALE }]} /><Text style={s.legendText}>Male</Text></View>
    <View style={s.legendItem}><View style={[s.dot, { backgroundColor: FEMALE }]} /><Text style={s.legendText}>Female</Text></View>
  </View>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={s.card}>
    <Text style={s.cardTitle}>{title}</Text>
    {children}
  </View>
);

type Query = {
  start_date: string; end_date: string; branch_id: string; gender: string;
  start_time: string; end_time: string; limit: number;
};

type Filters = {
  startDate: string; endDate: string; branchId: string; gender: string;
  limit: string; startTime: string; endTime: string;
};

// `branchId` is '' (all branches) only for users without a branch of their own.
const newFilters = (branchId: string) => (): Filters => ({
  startDate: today(), endDate: today(), branchId, gender: '',
  limit: '25', startTime: '', endTime: '',
});

const newQuery = (branchId: string) => (): Query => ({
  start_date: today(), end_date: today(), branch_id: branchId, gender: '',
  start_time: '', end_time: '', limit: 25,
});

const byTab = <T,>(make: () => T): Record<TabKey, T> => ({
  gender: make(), branch: make(), peak: make(), combined: make(),
});

const FootfallReportScreen = () => {
  const navigation = useNavigation() as any;

  const [tab, setTab] = useState<TabKey>('gender');

  // Branch-scoped logins (F-11, G-13, Sales…) are pinned to their own branch;
  // only users with no branch (super admin, branch_id 0) may pick or see "All".
  const { profile } = useSelector((state: RootState) => state.user);
  const ownBranch = profile?.branchId ? String(profile.branchId) : '';

  // Every tab keeps its own filters, page and committed query — the web mounts
  // each tab as its own component, so a gender picked on Gender or a time set
  // on Combined does not leak into the others.
  const [drafts, setDrafts] = useState<Record<TabKey, Filters>>(() => byTab(newFilters(ownBranch)));
  const [queries, setQueries] = useState<Record<TabKey, Query>>(() => byTab(newQuery(ownBranch)));
  const [pages, setPages] = useState<Record<TabKey, number>>(() => byTab(() => 1));
  const [picker, setPicker] = useState<null | 'start' | 'end' | 'from' | 'to'>(null);

  const draft = drafts[tab];
  const query = queries[tab];
  const page = pages[tab];

  const patchDraft = useCallback((patch: Partial<Filters>) => {
    setDrafts(d => ({ ...d, [tab]: { ...d[tab], ...patch } }));
  }, [tab]);

  const setPage = useCallback((p: number) => {
    setPages(x => ({ ...x, [tab]: p }));
  }, [tab]);

  const [branches, setBranches] = useState<Option[]>(
    ownBranch
      ? [{ value: ownBranch, label: profile?.branchName ?? 'My Branch' }]
      : [{ value: '', label: 'All' }],
  );
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecord, setTotalRecord] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isCombined = tab === 'combined';

  useEffect(() => {
    if (ownBranch) return; // single fixed option, nothing to fetch
    let cancelled = false;
    setLoadingBranches(true);
    getBranchesNameList()
      .then(res => {
        if (cancelled) return;
        const list = (res?.data ?? []).map((b: any) => ({ value: String(b.id), label: String(b.name) }));
        setBranches([{ value: '', label: 'All' }, ...list]);
      })
      .catch(() => { if (!cancelled) setBranches([{ value: '', label: 'All' }]); })
      .finally(() => { if (!cancelled) setLoadingBranches(false); });
    return () => { cancelled = true; };
  }, [ownBranch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotice(null);
    const common = {
      branch_id: query.branch_id,
      start_date: query.start_date,
      end_date: query.end_date,
      gender: query.gender,
      start_time: query.start_time,
      end_time: query.end_time,
    };
    // Combined aggregates a day at a time — see getFootfallCombined for why a
    // single whole-range call would undercount.
    const request = isCombined
      ? getFootfallCombined(common)
      : getFootfallReport({ ...common, limit: query.limit, page });

    request
      .then(res => {
        if (cancelled) return;
        setRows(res.rows);
        setTotalPages(Math.max(1, res.totalPages));
        setTotalRecord(res.total);
        const combined = res as Partial<FootfallCombinedResult>;
        if (combined.days) {
          const parts: string[] = [];
          if (combined.cappedRange) parts.push(`Showing the first ${FOOTFALL_MAX_DAYS} days of the range.`);
          if (combined.truncatedDays?.length) parts.push(`${combined.truncatedDays.length} day(s) hit the 1000-row cap and are undercounted.`);
          setNotice(parts.join(' ') || null);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setRows([]); setTotalPages(1); setTotalRecord(0);
        // Say what actually failed. A bare "something went wrong" gave no way
        // to tell a timeout from a rejected filter combination.
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message;
        setError(
          err?.code === 'ECONNABORTED'
            ? 'The request timed out. Try a shorter date range.'
            : serverMsg || (status ? `Request failed (${status}).` : 'Could not load the footfall report.'),
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, page, isCombined]);

  const runQuery = () => {
    setPage(1);
    setQueries(q => ({
      ...q,
      [tab]: {
        start_date: draft.startDate, end_date: draft.endDate, branch_id: draft.branchId,
        gender: draft.gender, start_time: draft.startTime, end_time: draft.endTime,
        limit: Number(draft.limit),
      },
    }));
  };

  const onPickDate = (date: Date) => {
    if (picker === 'start') {
      const iso = fmt(date);
      patchDraft(iso > draft.endDate ? { startDate: iso, endDate: iso } : { startDate: iso });
    } else if (picker === 'end') {
      patchDraft({ endDate: fmt(date) });
    } else {
      const t = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      patchDraft(picker === 'from' ? { startTime: t } : { endTime: t });
    }
    setPicker(null);
  };

  // ── Aggregates over the rows currently in hand ──
  const male = useMemo(() => rows.filter(r => (r.gender ?? '').toLowerCase() === 'male').length, [rows]);
  const female = useMemo(() => rows.filter(r => (r.gender ?? '').toLowerCase() === 'female').length, [rows]);

  const byHour = useMemo(() => {
    const m = new Map<number, { male: number; female: number; total: number; branches: Record<string, number> }>();
    rows.forEach(r => {
      const h = attendanceHour(r);
      if (h === null) return;
      const e = m.get(h) ?? { male: 0, female: 0, total: 0, branches: {} };
      const g = (r.gender ?? '').toLowerCase();
      if (g === 'male') e.male++; else if (g === 'female') e.female++;
      e.total++;
      const b = attendanceBranch(r);
      e.branches[b] = (e.branches[b] ?? 0) + 1;
      m.set(h, e);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([hour, v]) => ({ hour, ...v }));
  }, [rows]);

  const byBranch = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach(r => m.set(attendanceBranch(r), (m.get(attendanceBranch(r)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [rows]);

  const byDate = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    rows.forEach(r => {
      const d = r.date;
      const e = m.get(d) ?? {};
      const b = attendanceBranch(r);
      e[b] = (e[b] ?? 0) + 1;
      m.set(d, e);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, b]) => ({ date, branches: b }));
  }, [rows]);

  const busiest = useMemo(
    () => byHour.reduce<{ hour: number; total: number } | null>(
      (best, h) => (!best || h.total > best.total ? { hour: h.hour, total: h.total } : best), null),
    [byHour],
  );
  const avgUtil = byHour.length ? rows.length / byHour.length : 0;

  const branchNames = useMemo(() => byBranch.map(b => b.label), [byBranch]);

  const pageWindow = useMemo(() => {
    const RANGE = 8;
    let start = Math.max(1, page - Math.floor(RANGE / 2));
    const end = Math.min(totalPages, start + RANGE - 1);
    start = Math.max(1, Math.min(start, end - RANGE + 1));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  // No page reset here — each tab remembers where it was.
  const switchTab = useCallback((k: TabKey) => setTab(k), []);

  const hourBars = byHour.map(h => ({ label: hourLabel(h.hour).replace(':00', ''), male: h.male, female: h.female }));
  const hourArea = byHour.map(h => ({ label: hourLabel(h.hour).replace(':00', ''), value: h.total }));

  const renderDetail = () => {
    if (tab === 'peak') {
      return (
        <View style={s.card}>
          <Text style={s.cardTitle}>Detail</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={tbl.header}>
                <Text style={[tbl.headerCell, { width: 80 }]}>Hour</Text>
                <Text style={[tbl.headerCell, { width: 56 }]}>Male</Text>
                <Text style={[tbl.headerCell, { width: 62 }]}>Female</Text>
                {branchNames.map(b => <Text key={b} style={[tbl.headerCell, { width: 62 }]}>{b}</Text>)}
              </View>
              {byHour.map((h, i) => (
                <View key={h.hour} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
                  <Text style={[tbl.cell, { width: 80 }]}>{hourLabel(h.hour)}</Text>
                  <Text style={[tbl.cell, { width: 56 }]}>{h.male}</Text>
                  <Text style={[tbl.cell, { width: 62 }]}>{h.female}</Text>
                  {branchNames.map(b => <Text key={b} style={[tbl.cell, { width: 62 }]}>{h.branches[b] ?? 0}</Text>)}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    }

    const cols = tab === 'branch'
      ? [{ l: 'Date', w: 86 }, { l: 'Branch', w: 66 }, { l: 'Gender', w: 62 }, { l: 'Name', w: 150 }]
      : [{ l: 'Date', w: 86 }, { l: 'Check-in', w: 84 }, { l: 'Check-out', w: 84 },
         { l: 'Branch', w: 66 }, { l: 'Gender', w: 62 }, { l: 'Full Name', w: 150 }, { l: 'Verified_by', w: 110 }];

    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>Detail</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={tbl.header}>
              {cols.map(c => <Text key={c.l} style={[tbl.headerCell, { width: c.w }]}>{c.l}</Text>)}
            </View>
            {rows.map((r, i) => (
              <View key={r.id} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
                <Text style={[tbl.cell, { width: 86 }]}>{r.date}</Text>
                {tab === 'gender' && <Text style={[tbl.cell, { width: 84 }]}>{r.checkin_time_12h ?? '—'}</Text>}
                {tab === 'gender' && <Text style={[tbl.cell, { width: 84 }]}>{r.checkout_time_12h ?? '—'}</Text>}
                <Text style={[tbl.cell, { width: 66 }]}>{attendanceBranch(r)}</Text>
                <Text style={[tbl.cell, { width: 62 }]}>{r.gender ?? '—'}</Text>
                <ClientNameCell
                  name={attendanceName(r)}
                  clientId={attendanceClientId(r)}
                  style={[tbl.cell, tbl.red, { width: 150 }]}
                />
                {tab === 'gender' && (
                  <Text style={[tbl.cell, { width: 110 }]} numberOfLines={1}>{r.verified_by ?? '—'}</Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      <AppHeader
        title="Footfall Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={s.screen}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.tabRow} contentContainerStyle={s.tabContent}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key}
              style={[s.tab, tab === t.key && s.tabActive]}
              onPress={() => switchTab(t.key)}>
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
          <View style={s.filterCard}>
            <View style={s.row}>
              <TouchableOpacity style={s.dateBtn} onPress={() => setPicker('start')}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.dateText}>{display(draft.startDate)}</Text>
              </TouchableOpacity>
              <Text style={s.sep}>→</Text>
              <TouchableOpacity style={s.dateBtn} onPress={() => setPicker('end')}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.dateText}>{display(draft.endDate)}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={s.chipRow} contentContainerStyle={s.chipContent}>
              {QUICK.map(q => (
                <TouchableOpacity key={q.label} style={s.chip}
                  onPress={() => patchDraft({ startDate: q.start(), endDate: q.end() })}>
                  <Text style={s.chipText}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.row}>
              <Dropdown label="Branch" value={draft.branchId} options={branches}
                onSelect={v => patchDraft({ branchId: v })} loading={loadingBranches} />
              <Dropdown label="Gender" value={draft.gender} options={GENDERS}
                onSelect={v => patchDraft({ gender: v })} />
            </View>

            {(tab === 'gender' || tab === 'branch') && (
              <View style={s.row}>
                <Dropdown label="Limit" value={draft.limit} options={LIMITS}
                  onSelect={v => patchDraft({ limit: v })} />
                <View style={{ flex: 1 }} />
              </View>
            )}

            {(tab === 'peak' || isCombined) && (
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>From</Text>
                  <TouchableOpacity style={s.field} onPress={() => setPicker('from')}>
                    <Text style={[s.fieldText, !draft.startTime && s.placeholder]}>
                      {draft.startTime ? timeLabel(draft.startTime) : '12:30 PM'}
                    </Text>
                    <Icon name="clock-outline" size={15} color="#888" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>To</Text>
                  <TouchableOpacity style={s.field} onPress={() => setPicker('to')}>
                    <Text style={[s.fieldText, !draft.endTime && s.placeholder]}>
                      {draft.endTime ? timeLabel(draft.endTime) : '12:30 PM'}
                    </Text>
                    <Icon name="clock-outline" size={15} color="#888" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity style={s.goBtn} onPress={runQuery} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.goText}>Go</Text>}
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

          {!loading && error && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>⚠️</Text>
              <Text style={s.emptyTitle}>Something went wrong</Text>
              <Text style={s.emptySubtitle}>{error}</Text>
            </View>
          )}

          {!loading && !error && rows.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🚶</Text>
              <Text style={s.emptyTitle}>No Records</Text>
              <Text style={s.emptySubtitle}>No footfall for the selected filters.</Text>
            </View>
          )}

          {!loading && !error && notice && (
            <View style={s.notice}>
              <Icon name="information-outline" size={15} color="#B45309" />
              <Text style={s.noticeText}>{notice}</Text>
            </View>
          )}

          {!loading && !error && rows.length > 0 && (
            <>
              {tab === 'gender' && (
                <>
                  <View style={s.statsGrid}>
                    <StatCard label="Total Entries" value={rows.length} color="#2563EB" />
                    <StatCard label="Male" value={male} color={MALE} />
                    <StatCard label="Female" value={female} color={FEMALE} />
                  </View>
                  <Card title="Male% / Female%">
                    <View style={s.donutRow}>
                      <SplitDonut male={male} female={female} size={140} />
                      <View style={{ gap: 10 }}>
                        <View style={s.legendItem}>
                          <View style={[s.dot, { backgroundColor: MALE }]} />
                          <Text style={s.legendText}>Male {male} ({Math.round((male / (male + female || 1)) * 100)}%)</Text>
                        </View>
                        <View style={s.legendItem}>
                          <View style={[s.dot, { backgroundColor: FEMALE }]} />
                          <Text style={s.legendText}>Female {female} ({Math.round((female / (male + female || 1)) * 100)}%)</Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                  <Card title="Male vs Female by Hour">
                    <StackedBars data={hourBars} width={CARD_W} height={170} />
                    <Legend />
                  </Card>
                </>
              )}

              {tab === 'branch' && (
                <>
                  <View style={s.statsGrid}>
                    {byBranch.slice(0, 2).map((b, i) => (
                      <View key={b.label} style={[s.statCard, { borderTopColor: i === 0 ? '#2563EB' : '#0891B2' }]}>
                        <Text style={s.topBranchLabel}>Top Branch #{i + 1}</Text>
                        <Text style={s.topBranchName}>{b.label}</Text>
                        <Text style={s.statLabel}>Entries: {b.value}</Text>
                      </View>
                    ))}
                  </View>
                  <Card title="Branch-wise entry trends">
                    {byDate.map(d => (
                      <View key={d.date} style={{ marginBottom: 10 }}>
                        <Text style={s.trendDate}>{d.date}</Text>
                        <HBars data={branchNames.map((b, i) => ({
                          label: b, value: d.branches[b] ?? 0, color: i === 0 ? MALE : '#0891B2',
                        }))} />
                      </View>
                    ))}
                  </Card>
                </>
              )}

              {tab === 'peak' && (
                <>
                  <View style={s.statsGrid}>
                    <StatCard label="Busiest Hour" value={busiest ? hourLabel(busiest.hour) : '—'} color="#D97706" />
                    <StatCard label="Average Utilization (entries/hour)" value={avgUtil.toFixed(1)} color="#7C3AED" />
                  </View>
                  <Card title="Entries by Hour">
                    <StackedBars data={hourBars} width={CARD_W} height={170} />
                    <Legend />
                  </Card>
                  {hourArea.length > 1 && (
                    <Card title="Hourly Usage (Area)">
                      <AreaChart data={hourArea} width={CARD_W} height={150} />
                    </Card>
                  )}
                </>
              )}

              {isCombined && (
                <>
                  <View style={s.statsGrid}>
                    <StatCard label="Total" value={rows.length} color="#2563EB" />
                    <StatCard label="Male" value={male} color={MALE} />
                    <StatCard label="Female" value={female} color={FEMALE} />
                    <StatCard label="Busiest Hour" value={busiest ? hourLabel(busiest.hour) : '—'} color="#D97706" />
                  </View>
                  <Card title="Gender Split">
                    <View style={s.donutRow}>
                      <SplitDonut male={male} female={female} size={140} />
                      <View style={{ gap: 10 }}>
                        <View style={s.legendItem}>
                          <View style={[s.dot, { backgroundColor: MALE }]} />
                          <Text style={s.legendText}>Male {male}</Text>
                        </View>
                        <View style={s.legendItem}>
                          <View style={[s.dot, { backgroundColor: FEMALE }]} />
                          <Text style={s.legendText}>Female {female}</Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                  <Card title="Branch Totals">
                    <HBars data={byBranch} />
                  </Card>
                </>
              )}

              {!isCombined && renderDetail()}

              {!isCombined && totalPages > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pg.bar}>
                  <TouchableOpacity style={[pg.textBtn, page === 1 && pg.btnDisabled]}
                    onPress={() => setPage(1)} disabled={page === 1}>
                    <Text style={[pg.textBtnLabel, page === 1 && pg.textDisabled]}>First Page</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]}
                    onPress={() => setPage(page - 1)} disabled={page === 1}>
                    <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
                  </TouchableOpacity>
                  {pageWindow.map(p => (
                    <TouchableOpacity key={p} style={[pg.btn, p === page && pg.btnActive]} onPress={() => setPage(p)}>
                      <Text style={[pg.num, p === page && pg.numActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]}
                    onPress={() => setPage(page + 1)} disabled={page === totalPages}>
                    <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[pg.textBtn, page === totalPages && pg.btnDisabled]}
                    onPress={() => setPage(totalPages)} disabled={page === totalPages}>
                    <Text style={[pg.textBtnLabel, page === totalPages && pg.textDisabled]}>Last Page</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              {!isCombined && (
                <Text style={s.footnote}>
                  Page {page} of {totalPages} · {totalRecord} entries in range
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </View>

      <DateTimePickerModal
        isVisible={picker !== null}
        mode={picker === 'from' || picker === 'to' ? 'time' : 'date'}
        date={picker === 'start' ? new Date(draft.startDate) : picker === 'end' ? new Date(draft.endDate) : new Date()}
        maximumDate={picker === 'start' ? new Date(draft.endDate) : picker === 'end' ? new Date() : undefined}
        minimumDate={picker === 'end' ? new Date(draft.startDate) : undefined}
        onConfirm={onPickDate}
        onCancel={() => setPicker(null)}
      />
    </>
  );
};

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  tabRow:       { flexGrow: 0, flexShrink: 0, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabContent:   { alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  tab:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#F0F0F0' },
  tabActive:    { backgroundColor: '#E63946' },
  tabText:      { fontSize: 12, color: '#555', fontWeight: '500' },
  tabTextActive:{ color: '#FFF', fontWeight: '700' },

  filterCard:   { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  row:          { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  dateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:          { fontSize: 14, color: '#999', marginBottom: 9 },
  chipRow:      { flexGrow: 0, flexShrink: 0, marginBottom: 8 },
  chipContent:  { paddingVertical: 2, alignItems: 'center', gap: 8 },
  chip:         { paddingVertical: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' },
  chipText:     { fontSize: 12, color: '#444', fontWeight: '500' },
  fieldLabel:   { fontSize: 11, color: '#888', marginBottom: 4 },
  field:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  fieldText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500', flex: 1 },
  placeholder:  { color: '#B0B0B0', fontWeight: '400' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },

  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 },
  sheet:        { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 8, maxHeight: '60%' },
  sheetTitle:   { fontSize: 13, fontWeight: '700', color: '#888', paddingHorizontal: 16, paddingVertical: 8 },
  sheetRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  sheetRowActive:{ backgroundColor: '#FFF5F5' },
  sheetText:    { fontSize: 14, color: '#1A1A1A' },
  sheetTextActive:{ color: '#E63946', fontWeight: '700' },

  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard:     { flexGrow: 1, minWidth: '46%', backgroundColor: '#FFF', borderRadius: 12, padding: 14, alignItems: 'center', borderTopWidth: 3, elevation: 1 },
  statValue:    { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel:    { fontSize: 11, color: '#999', textAlign: 'center' },
  topBranchLabel:{ fontSize: 11, color: '#999', marginBottom: 2 },
  topBranchName:{ fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },

  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  donutRow:     { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend:       { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 6 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  legendText:   { fontSize: 12, color: '#555' },
  trendDate:    { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6 },
  hbarHead:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  hbarLabel:    { fontSize: 12, color: '#555', fontWeight: '600' },
  hbarValue:    { fontSize: 12, color: '#1A1A1A', fontWeight: '700' },
  hbarTrack:    { height: 10, borderRadius: 5, backgroundColor: '#F0F0F0', overflow: 'hidden' },
  hbarFill:     { height: 10, borderRadius: 5 },

  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  footnote:     { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 4 },
  notice:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 12 },
  noticeText:   { flex: 1, fontSize: 11, color: '#92400E' },
});

const tbl = StyleSheet.create({
  header:     { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:        { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:     { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  red:        { color: '#C0392B', fontWeight: '600' },
});

const pg = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 2 },
  btn: { minWidth: 32, height: 32, paddingHorizontal: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  btnDisabled: { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  num: { fontSize: 13, color: '#555', fontWeight: '600' },
  numActive: { color: '#fff' },
  textBtn: { height: 32, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  textBtnLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
  textDisabled: { color: '#bbb' },
});

export default FootfallReportScreen;
