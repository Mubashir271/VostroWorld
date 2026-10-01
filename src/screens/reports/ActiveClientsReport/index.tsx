// src/screens/reports/ActiveClientsReport/index.tsx
//
// The web admin's Reports › Client Reports › Active Clients Report — see
// getActiveClientsReport in api/reports.ts for the capture notes.
//
// Like the web, the filter form is edited freely and only applied on Search
// (branch and page apply at once). One request per apply feeds every tab:
// List / Detailed / Expiring Soon are the same page of clients drawn three
// ways, By Category groups that page, and Management reads the response's
// `management` block. "Full detail" loads the client's own endpoint.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
  getActiveClientsReport, getActiveClientDetail, getActiveReportPackages,
  ActiveClient, ActiveClientsSummary, ActiveClientsManagement, ActiveClientDetail,
  ActiveRisk,
} from '../../../api/reports';

type Option = { value: string; label: string };
type Tab = 'list' | 'detailed' | 'management' | 'by_category' | 'expiring';
type DetailTab = 'overview' | 'packages' | 'history' | 'gym' | 'sessions' | 'payments' | 'freezing' | 'cards';
type DateField = 'startFrom' | 'startTo' | 'expiryFrom' | 'expiryTo';

// ── Web option lists (from the web bundle) ───────────────────────────────────
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'list', label: 'List', icon: 'format-list-bulleted' },
  { key: 'detailed', label: 'Detailed', icon: 'table' },
  { key: 'management', label: 'Management', icon: 'chart-bar' },
  { key: 'by_category', label: 'By Category', icon: 'view-grid-outline' },
  { key: 'expiring', label: 'Expiring Soon', icon: 'alert-outline' },
];

const DETAIL_TABS: { key: DetailTab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'card-account-details-outline' },
  { key: 'packages', label: 'Active packages', icon: 'package-variant-closed' },
  { key: 'history', label: 'Package history', icon: 'history' },
  { key: 'gym', label: 'Gym check-ins', icon: 'door-open' },
  { key: 'sessions', label: 'PT sessions', icon: 'calendar-check' },
  { key: 'payments', label: 'Payments', icon: 'credit-card-outline' },
  { key: 'freezing', label: 'Freezing', icon: 'snowflake' },
  { key: 'cards', label: 'Access cards', icon: 'card-bulleted-outline' },
];

const EXPIRY_WINDOWS: Option[] = [
  { value: 'all', label: 'All expiry windows' },
  { value: '30', label: 'Expiring within 1 month' },
  { value: '60', label: 'Expiring within 2 months' },
  { value: '90', label: 'Expiring within 3 months' },
  { value: 'beyond_90', label: 'More than 3 months left' },
  { value: 'expired', label: 'Past expiry (still active)' },
];

const QUICK_EXPIRY = [
  { key: 'today', label: 'Expires today' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'month', label: 'This month' },
  { key: '30', label: 'Next 30 days' },
  { key: '60', label: 'Next 60 days' },
  { key: '90', label: 'Next 90 days' },
  { key: 'clear', label: 'Clear dates' },
];

const CATEGORIES: Option[] = [
  { value: '', label: 'All categories' },
  { value: '1', label: 'Gym' },
  { value: '2', label: 'Personal Trainer' },
  { value: '3', label: 'Guest Pass' },
  { value: '4', label: 'Small Group PT' },
  { value: '5', label: 'Nutrition' },
  { value: '7', label: 'Boot Camp' },
  { value: '9', label: 'General' },
  { value: '11', label: 'Vostro Fitness Academy' },
  { value: '14', label: 'Physiotherapy' },
];

const GENDERS: Option[] = [{ value: '', label: 'All' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }];
const CLIENT_TYPES: Option[] = [{ value: '', label: 'All' }, { value: 'Member', label: 'Member' }, { value: 'Guest', label: 'Guest' }];
const SALE_TYPES: Option[] = [{ value: '', label: 'All' }, { value: 'New', label: 'New' }, { value: 'Renew', label: 'Renew' }];
const RISK_LEVELS: Option[] = [
  { value: '', label: 'All' },
  { value: 'critical', label: '≤ 1 month' },
  { value: 'warning', label: '≤ 2 months' },
  { value: 'ok', label: 'Healthy' },
  { value: 'expired', label: 'Expired' },
];
const FREEZE: Option[] = [{ value: '', label: 'All' }, { value: 'Active', label: 'Active' }, { value: 'Frozen', label: 'Frozen' }];
const SORT_BY: Option[] = [
  { value: 'nearest_expiry', label: 'Expiry' },
  { value: 'name', label: 'Name' },
  { value: 'packages', label: 'Packages' },
  { value: 'branch', label: 'Branch' },
];
const SORT_DIR: Option[] = [{ value: 'asc', label: 'Asc' }, { value: 'desc', label: 'Desc' }];
const PER_PAGE: Option[] = ['10', '25', '50', '100', '200'].map(v => ({ value: v, label: v }));

type Form = {
  search: string; category: string; packageId: string; expiryWindow: string;
  expiryFrom: string; expiryTo: string; startFrom: string; startTo: string;
  gender: string; clientType: string; saleType: string; riskLevel: string;
  trainerName: string; freezeStatus: string; sortBy: string; sortDir: string; limit: number;
};

const DEFAULT_FORM: Form = {
  search: '', category: '', packageId: '', expiryWindow: 'all',
  expiryFrom: '', expiryTo: '', startFrom: '', startTo: '',
  gender: '', clientType: '', saleType: '', riskLevel: '',
  trainerName: '', freezeStatus: '', sortBy: 'nearest_expiry', sortDir: 'asc', limit: 25,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
// The web's DD MMM YYYY, with "—" for blanks and MySQL's zero date.
const fmtDate = (v?: string | null) => {
  if (!v || v.startsWith('0000')) return '—';
  const [y, m, d] = v.slice(0, 10).split('-');
  return m ? `${d} ${MONTHS[Number(m) - 1]} ${y}` : v;
};
const pickerLabel = (v: string) => { if (!v) return 'mm/dd/yyyy'; const [y, m, d] = v.split('-'); return `${m}/${d}/${y}`; };
const labelOf = (opts: Option[], v: string) => opts.find(o => o.value === v)?.label ?? opts[0].label;

const RISK: Record<ActiveRisk, { text: string; fg: string; bg: string }> = {
  critical: { text: '≤ 1 month', fg: '#C0392B', bg: '#FDECEC' },
  warning: { text: '≤ 2 months', fg: '#B45309', bg: '#FEF3C7' },
  ok: { text: 'OK', fg: '#15803D', bg: '#DCFCE7' },
  expired: { text: 'Expired', fg: '#555', bg: '#EEEEEE' },
};
const RiskBadge = ({ risk }: { risk: ActiveRisk }) => {
  const r = RISK[risk] ?? RISK.ok;
  return (
    <View style={[b.badge, { backgroundColor: r.bg }]}>
      <Text style={[b.badgeText, { color: r.fg }]}>{r.text}</Text>
    </View>
  );
};

type Sheet = { title: string; options: Option[]; value: string; onSelect: (v: string) => void; searchable?: boolean };

const ActiveClientsReportScreen = () => {
  const navigation = useNavigation() as any;
  const { needsPicker, options: branchOptions, listBranchId } = useBranchSelector();

  // Super admin starts on "All branches" (''); branch-scoped admins are pinned.
  const [branch, setBranch] = useState<number | ''>('');
  const branchId: number | '' = needsPicker ? branch : listBranchId;
  const branchName = needsPicker
    ? (branch === '' ? 'All branches' : branchOptions.find(o => o.id === branch)?.name ?? 'Branch')
    : undefined;

  const [tab, setTab] = useState<Tab>('list');
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [applied, setApplied] = useState<Form>(DEFAULT_FORM);
  const [page, setPage] = useState(1);
  const [moreFilters, setMoreFilters] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));

  const [clients, setClients] = useState<ActiveClient[]>([]);
  const [summary, setSummary] = useState<ActiveClientsSummary | null>(null);
  const [management, setManagement] = useState<ActiveClientsManagement | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<number | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sheetSearch, setSheetSearch] = useState('');
  const [datePicker, setDatePicker] = useState<DateField | null>(null);

  const [packages, setPackages] = useState<{ id: number; category: string; name: string }[] | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ActiveClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpanded(null);
    getActiveClientsReport({
      branch_id: branchId,
      search: applied.search.trim(),
      category: applied.category,
      package_id: applied.packageId,
      expiry_window: applied.expiryWindow,
      expiry_from: applied.expiryFrom,
      expiry_to: applied.expiryTo,
      start_from: applied.startFrom,
      start_to: applied.startTo,
      gender: applied.gender,
      client_type: applied.clientType,
      sale_type: applied.saleType,
      risk_level: applied.riskLevel,
      trainer_name: applied.trainerName.trim(),
      freeze_status: applied.freezeStatus,
      sort_by: applied.sortBy,
      sort_dir: applied.sortDir,
      page,
      limit: applied.limit,
    })
      .then(res => {
        if (cancelled) return;
        setClients(res.clients);
        setSummary(res.summary);
        setManagement(res.management);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.totalPages));
      })
      .catch((err: any) => {
        if (cancelled) return;
        setClients([]); setTotal(0); setTotalPages(1);
        const status = err?.response?.status;
        setError(err?.response?.data?.message || (status ? `Request failed (${status}).` : 'Could not load the report.'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, applied, page]);

  // The package list is scoped to the branch; drop it when the branch changes.
  useEffect(() => { setPackages(null); }, [branchId]);

  const apply = (next: Form = form) => { setPage(1); setApplied(next); };
  const reset = () => { setForm(DEFAULT_FORM); apply(DEFAULT_FORM); };

  const openTab = (t: Tab) => {
    setTab(t);
    // The web pre-fills a 1-month window, nearest first, for Expiring Soon —
    // into the form only, applied on the next Search.
    if (t === 'expiring' && !form.riskLevel && form.expiryWindow === 'all') {
      setForm(f => ({ ...f, expiryWindow: '30', sortBy: 'nearest_expiry', sortDir: 'asc' }));
    }
  };

  const quickExpiry = (key: string) => {
    const now = new Date();
    const plus = (days: number) => { const d = new Date(now); d.setDate(d.getDate() + days); return iso(d); };
    const endOfMonth = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const dates = (from: string, to: string, win: string) =>
      setForm(f => ({ ...f, expiryFrom: from, expiryTo: to, expiryWindow: win }));
    switch (key) {
      case 'today': dates(iso(now), iso(now), 'all'); break;
      case 'week': dates(iso(now), plus(6), 'all'); break;
      case 'month': dates(iso(now), endOfMonth, 'all'); break;
      case 'clear': dates('', '', 'all'); break;
      default: dates('', '', key);
    }
  };

  const onPickDate = (d: Date) => {
    if (datePicker) {
      const field = datePicker;
      setForm(f => ({
        ...f,
        [field]: iso(d),
        // Typing an expiry date clears the window, as on the web.
        ...(field === 'expiryFrom' || field === 'expiryTo' ? { expiryWindow: 'all' } : {}),
      }));
    }
    setDatePicker(null);
  };

  const openSheet = (s: Sheet) => { setSheetSearch(''); setSheet(s); };

  const openPackages = () => {
    const show = (list: { id: number; category: string; name: string }[]) =>
      openSheet({
        title: 'Package',
        searchable: true,
        value: form.packageId,
        options: [
          { value: '', label: 'All packages' },
          ...list
            .filter(p => !form.category || p.category === form.category)
            .map(p => ({ value: String(p.id), label: p.name })),
        ],
        onSelect: v => set('packageId', v),
      });
    if (packages) { show(packages); return; }
    setPackagesLoading(true);
    getActiveReportPackages(branchId)
      .then(list => { setPackages(list); show(list); })
      .catch(() => setPackages(null))
      .finally(() => setPackagesLoading(false));
  };

  const packageLabel = form.packageId
    ? packages?.find(p => String(p.id) === form.packageId)?.name ?? 'Selected package'
    : 'All packages';

  const openDetail = (clientId: number) => {
    setDetailId(clientId);
    setDetailTab('overview');
    setDetail(null);
    setDetailLoading(true);
    getActiveClientDetail(clientId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  // Expiring Soon re-sorts the page by days left, nulls last.
  const rows = useMemo(
    () => (tab === 'expiring'
      ? [...clients].sort((a, c) => (a.days_until_expiry ?? 999) - (c.days_until_expiry ?? 999))
      : clients),
    [clients, tab],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, ActiveClient[]>();
    clients.forEach(c => (c.categories?.length ? c.categories : ['Other']).forEach(cat => {
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }));
    return [...map.entries()].sort((x, y) => y[1].length - x[1].length);
  }, [clients]);

  const pageWindow = useMemo(() => {
    const RANGE = 5;
    let start = Math.max(1, page - Math.floor(RANGE / 2));
    const end = Math.min(totalPages, start + RANGE - 1);
    start = Math.max(1, Math.min(start, end - RANGE + 1));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const sheetOptions = useMemo(() => {
    if (!sheet) return [];
    const q = sheetSearch.trim().toLowerCase();
    const list = q ? sheet.options.filter(o => o.label.toLowerCase().includes(q)) : sheet.options;
    return list.slice(0, 200);
  }, [sheet, sheetSearch]);

  // ── Pieces ─────────────────────────────────────────────────────────────────
  const SelectField = ({ label, value, onPress, loadingIcon }: { label: string; value: string; onPress: () => void; loadingIcon?: boolean }) => (
    <View style={s.half}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.field} onPress={onPress}>
        <Text style={s.fieldText} numberOfLines={1}>{value}</Text>
        {loadingIcon ? <ActivityIndicator size="small" color="#888" /> : <Icon name="chevron-down" size={16} color="#888" />}
      </TouchableOpacity>
    </View>
  );

  const optionField = (label: string, key: keyof Form, opts: Option[]) => (
    <SelectField
      label={label}
      value={labelOf(opts, String(form[key]))}
      onPress={() => openSheet({
        title: label, options: opts, value: String(form[key]),
        onSelect: v => set(key, (key === 'limit' ? Number(v) : v) as any),
      })}
    />
  );

  const DateField = ({ label, field }: { label: string; field: DateField }) => (
    <View style={s.half}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.field} onPress={() => setDatePicker(field)}>
        <Text style={[s.fieldText, !form[field] && s.placeholder]}>{pickerLabel(form[field])}</Text>
        {form[field]
          ? <Icon name="close" size={15} color="#888" onPress={() => set(field, '')} />
          : <Icon name="calendar" size={15} color="#888" />}
      </TouchableOpacity>
    </View>
  );

  const SummaryTile = ({ value, label, color, active }: { value: number; label: string; color?: string; active?: boolean }) => (
    <View style={[s.tile, active && s.tileActive]}>
      <Text style={[s.tileNum, color ? { color } : null]}>{value.toLocaleString()}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );

  const detailed = tab === 'detailed';

  const clientRow = (c: ActiveClient, index: number) => {
    const open = expanded === c.client_id;
    return (
      <View key={c.client_id}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[tbl.row, index % 2 === 1 && tbl.rowAlt]}
          onPress={() => setExpanded(open ? null : c.client_id)}
        >
          <View style={tbl.wChevron}>
            <Icon name={open ? 'chevron-down' : 'chevron-right'} size={16} color="#888" />
          </View>
          <Text style={[tbl.cell, tbl.wUid]}>{c.uid}</Text>
          <View style={[tbl.cellBox, tbl.wClient]}>
            <Text style={[tbl.cell, tbl.bold]} numberOfLines={2}>{c.full_name}</Text>
            {c.frozen_packages > 0 && <Text style={tbl.frozen}>Frozen</Text>}
            {detailed && <Text style={tbl.sub}>{c.gender} · {c.client_type || 'Member'}</Text>}
          </View>
          <Text style={[tbl.cell, tbl.wDate]}>{fmtDate(c.joining_date)}</Text>
          <View style={[tbl.cellBox, tbl.wContact]}>
            <Text style={tbl.cell}>{c.phone}</Text>
            {!!c.email && <Text style={tbl.sub} numberOfLines={1}>{c.email}</Text>}
          </View>
          <Text style={[tbl.cell, tbl.wBranch]}>{c.branch_name || '—'}</Text>
          <View style={tbl.wPkgs}>
            <View style={tbl.pkgBadge}><Text style={tbl.pkgBadgeText}>{c.active_package_count}</Text></View>
          </View>
          {detailed && <Text style={[tbl.cell, tbl.wPkgNames]}>{c.package_names}</Text>}
          <Text style={[tbl.cell, tbl.wCats]}>{(c.categories || []).join(', ')}</Text>
          <Text style={[tbl.cell, tbl.wDate]}>{fmtDate(c.nearest_expiry)}</Text>
          <Text style={[tbl.cell, tbl.wDays]}>{c.days_until_expiry ?? '—'}</Text>
          <View style={tbl.wRisk}><RiskBadge risk={c.expiry_risk} /></View>
          <View style={tbl.wAction}>
            <TouchableOpacity style={tbl.detailBtn} onPress={() => openDetail(c.client_id)}>
              <Text style={tbl.detailBtnText}>Full detail</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {open && (
          <View style={tbl.expand}>
            <View style={tbl.miniHeader}>
              {['Package', 'Category', 'Sale', 'Start', 'End', 'Trainer', 'Sessions', 'Type', 'Freeze', 'Risk'].map((h, i) => (
                <Text key={h} style={[tbl.miniHeadCell, { width: MINI_W[i] }]}>{h}</Text>
              ))}
            </View>
            {(c.active_packages || []).map(p => (
              <View key={p.order_detail_id} style={tbl.miniRow}>
                <Text style={[tbl.miniCell, { width: MINI_W[0] }]}>{p.package_name}</Text>
                <Text style={[tbl.miniCell, { width: MINI_W[1] }]}>{p.category}</Text>
                <Text style={[tbl.miniCell, { width: MINI_W[2] }]}>{fmtDate(p.sale_date)}</Text>
                <Text style={[tbl.miniCell, { width: MINI_W[3] }]}>{fmtDate(p.start_date)}</Text>
                <Text style={[tbl.miniCell, { width: MINI_W[4] }]}>{fmtDate(p.end_date)}</Text>
                <Text style={[tbl.miniCell, { width: MINI_W[5] }]}>{p.trainer_name || '—'}</Text>
                <Text style={[tbl.miniCell, { width: MINI_W[6] }]}>
                  {p.sessions_total != null ? `${p.sessions_remaining}/${p.sessions_total}` : '—'}
                </Text>
                <Text style={[tbl.miniCell, { width: MINI_W[7] }]}>{p.sale_type || '—'}</Text>
                <Text style={[tbl.miniCell, { width: MINI_W[8] }]}>{p.freeze_status || '—'}</Text>
                <View style={{ width: MINI_W[9] }}><RiskBadge risk={p.expiry_risk} /></View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const clientTable = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={tbl.header}>
          <View style={tbl.wChevron} />
          <Text style={[tbl.headerCell, tbl.wUid]}>UID</Text>
          <Text style={[tbl.headerCell, tbl.wClient]}>Client</Text>
          <Text style={[tbl.headerCell, tbl.wDate]}>Joining date</Text>
          <Text style={[tbl.headerCell, tbl.wContact]}>Contact</Text>
          <Text style={[tbl.headerCell, tbl.wBranch]}>Branch</Text>
          <Text style={[tbl.headerCell, tbl.wPkgs]}>Pkgs</Text>
          {detailed && <Text style={[tbl.headerCell, tbl.wPkgNames]}>Package names</Text>}
          <Text style={[tbl.headerCell, tbl.wCats]}>Categories</Text>
          <Text style={[tbl.headerCell, tbl.wDate]}>Nearest expiry</Text>
          <Text style={[tbl.headerCell, tbl.wDays]}>Days</Text>
          <Text style={[tbl.headerCell, tbl.wRisk]}>Risk</Text>
          <View style={tbl.wAction} />
        </View>
        {rows.map(clientRow)}
      </View>
    </ScrollView>
  );

  const managementView = (
    <>
      <View style={s.card}>
        <Text style={s.cardTitle}>Clients by branch</Text>
        <View style={tbl.header}>
          <Text style={[tbl.headerCell, s.flex2]}>Branch</Text>
          <Text style={[tbl.headerCell, s.flex1]}>Clients</Text>
          <Text style={[tbl.headerCell, s.flex1]}>Packages</Text>
        </View>
        {(management?.by_branch ?? []).map((r, i) => (
          <View key={r.branch_id ?? i} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
            <Text style={[tbl.cell, s.flex2]}>{r.branch_name || '—'}</Text>
            <Text style={[tbl.cell, s.flex1]}>{r.client_count}</Text>
            <Text style={[tbl.cell, s.flex1]}>{r.package_count}</Text>
          </View>
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Clients by category</Text>
        <View style={tbl.header}>
          <Text style={[tbl.headerCell, s.flex2]}>Category</Text>
          <Text style={[tbl.headerCell, s.flex1]}>Clients</Text>
          <Text style={[tbl.headerCell, s.flex1]}>Packages</Text>
        </View>
        {(management?.by_category ?? []).map((r, i) => (
          <View key={r.category_id} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
            <Text style={[tbl.cell, s.flex2]}>{r.category}</Text>
            <Text style={[tbl.cell, s.flex1]}>{r.client_count}</Text>
            <Text style={[tbl.cell, s.flex1]}>{r.package_count}</Text>
          </View>
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Expiry risk overview</Text>
        <View style={s.tileRow}>
          {(management?.by_risk ?? []).map(r => {
            const active = applied.riskLevel === r.risk;
            return (
              <TouchableOpacity
                key={r.risk}
                style={[s.tile, s.riskTile, active && s.tileActive]}
                onPress={() => {
                  // Tapping a risk filters the list by it (tap again to clear).
                  const next = { ...form, riskLevel: active ? '' : r.risk };
                  setForm(next);
                  apply(next);
                  setTab('list');
                }}
              >
                <Text style={[s.tileNum, r.risk === 'critical' && { color: '#E10600' }]}>{r.client_count}</Text>
                <Text style={s.tileLabel}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );

  const categoryView = byCategory.map(([cat, list]) => {
    const collapsed = collapsedCats.has(cat);
    return (
      <View key={cat} style={s.card}>
        <TouchableOpacity
          style={s.catHeader}
          onPress={() => {
            const next = new Set(collapsedCats);
            collapsed ? next.delete(cat) : next.add(cat);
            setCollapsedCats(next);
          }}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-down'} size={18} color="#555" />
          <Text style={s.catTitle}>{cat}</Text>
          <View style={s.catCount}><Text style={s.catCountText}>{list.length} clients</Text></View>
        </TouchableOpacity>
        {!collapsed && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={tbl.header}>
                <Text style={[tbl.headerCell, tbl.wClient]}>Client</Text>
                <Text style={[tbl.headerCell, tbl.wDate]}>Joining date</Text>
                <Text style={[tbl.headerCell, tbl.wUid]}>UID</Text>
                <Text style={[tbl.headerCell, tbl.wBranch]}>Branch</Text>
                <Text style={[tbl.headerCell, tbl.wDate]}>Expiry</Text>
                <Text style={[tbl.headerCell, tbl.wRisk]}>Days</Text>
                <View style={tbl.wLink} />
              </View>
              {list.map((c, i) => (
                <View key={`${cat}-${c.client_id}`} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
                  <Text style={[tbl.cell, tbl.wClient]} numberOfLines={2}>{c.full_name}</Text>
                  <Text style={[tbl.cell, tbl.wDate]}>{fmtDate(c.joining_date)}</Text>
                  <Text style={[tbl.cell, tbl.wUid]}>{c.uid}</Text>
                  <Text style={[tbl.cell, tbl.wBranch]}>{c.branch_name}</Text>
                  <Text style={[tbl.cell, tbl.wDate]}>{fmtDate(c.nearest_expiry)}</Text>
                  <View style={tbl.wRisk}><RiskBadge risk={c.expiry_risk} /></View>
                  <TouchableOpacity style={tbl.wLink} onPress={() => openDetail(c.client_id)}>
                    <Text style={tbl.link}>Detail</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  });

  // ── Detail modal ───────────────────────────────────────────────────────────
  const detailTable = (cols: string[], widths: number[], data: (string | number)[][], empty: string) => (
    data.length === 0 ? <Text style={s.detailEmpty}>{empty}</Text> : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={tbl.header}>
            {cols.map((c, i) => <Text key={c} style={[tbl.headerCell, { width: widths[i] }]}>{c}</Text>)}
          </View>
          {data.map((r, ri) => (
            <View key={ri} style={[tbl.row, ri % 2 === 1 && tbl.rowAlt]}>
              {r.map((v, i) => <Text key={i} style={[tbl.cell, { width: widths[i] }]}>{v}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>
    )
  );

  const detailBody = () => {
    if (detailLoading) return <ActivityIndicator size="large" color="#E63946" style={s.spinner} />;
    if (!detail) return <Text style={s.detailEmpty}>Could not load client details.</Text>;
    const p = detail.profile;
    switch (detailTab) {
      case 'overview': {
        const kv = (k: string, v: string | number) => (
          <View style={s.kvRow} key={k}>
            <Text style={s.kvKey}>{k}</Text>
            <Text style={s.kvVal}>{v}</Text>
          </View>
        );
        return (
          <>
            <View style={s.card}>
              <Text style={s.detailCardTitle}>Contact</Text>
              {kv('UID', p.uid)}
              {kv('Joining date', fmtDate(p.joining_date || p.registration_date))}
              {kv('Phone', p.phone || '—')}
              {kv('Email', p.email || '—')}
              {kv('Gender', p.gender || '—')}
              {kv('Branch', p.branch_name || '—')}
            </View>
            <View style={s.card}>
              <Text style={s.detailCardTitle}>Registration</Text>
              {kv('Package', p.registration_package || '—')}
              {kv('Date', fmtDate(p.registration_date))}
            </View>
            <View style={s.card}>
              <Text style={s.detailCardTitle}>Counts</Text>
              {kv('Active packages', detail.counts?.active_packages ?? 0)}
              {kv('Gym check-ins', detail.counts?.gym_checkins ?? 0)}
              {kv('Payments', detail.counts?.payments ?? 0)}
            </View>
          </>
        );
      }
      case 'packages':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={tbl.header}>
                {['Package', 'Category', 'Start', 'End', 'Trainer', 'Sessions', 'Risk'].map((h, i) => (
                  <Text key={h} style={[tbl.headerCell, { width: PKG_W[i] }]}>{h}</Text>
                ))}
              </View>
              {detail.active_packages.map((a, i) => (
                <View key={a.order_detail_id} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
                  <Text style={[tbl.cell, { width: PKG_W[0] }]}>{a.package_name}</Text>
                  <Text style={[tbl.cell, { width: PKG_W[1] }]}>{a.category}</Text>
                  <Text style={[tbl.cell, { width: PKG_W[2] }]}>{fmtDate(a.start_date)}</Text>
                  <Text style={[tbl.cell, { width: PKG_W[3] }]}>{fmtDate(a.end_date)}</Text>
                  <Text style={[tbl.cell, { width: PKG_W[4] }]}>{a.trainer_name || '—'}</Text>
                  <Text style={[tbl.cell, { width: PKG_W[5] }]}>
                    {a.sessions_total != null ? `${a.sessions_delivered}/${a.sessions_total}` : '—'}
                  </Text>
                  <View style={{ width: PKG_W[6] }}><RiskBadge risk={a.expiry_risk} /></View>
                </View>
              ))}
            </View>
          </ScrollView>
        );
      case 'history':
        return detailTable(['Package', 'Category', 'Status', 'Sale', 'End'], [220, 120, 70, 92, 92],
          (detail.package_history || []).map(h => [h.package_name, h.category, h.is_active ? 'Active' : 'Inactive', fmtDate(h.sale_date), fmtDate(h.end_date)]),
          'No package history.');
      case 'gym':
        return detailTable(['Date', 'Check in', 'Check out'], [100, 100, 100],
          (detail.gym_attendance || []).map(g => [fmtDate(g.date), g.checkin_time_12h || '—', g.checkout_time_12h || '—']),
          'No gym check-ins.');
      case 'sessions':
        return detailTable(['Date', 'Package', 'Trainer', 'Valid'], [92, 220, 120, 50],
          (detail.session_attendance || []).map(x => [fmtDate(x.date), x.package_name, x.trainer_name || '—', x.validate_status === '1' ? 'Yes' : 'No']),
          'No PT sessions.');
      case 'payments':
        return detailTable(['Date', 'Order', 'Amount', 'Method'], [92, 70, 90, 110],
          (detail.payments || []).map(x => [fmtDate(x.date), x.order_id, Number(x.received ?? 0).toLocaleString(), x.payment_method || '—']),
          'No payments.');
      case 'freezing':
        return detailTable(['Start', 'End', 'Reason'], [92, 92, 180],
          (detail.freezing || []).map(f => [fmtDate(f.start_date), fmtDate(f.end_date), f.reason || '—']),
          'No freezing records.');
      case 'cards':
        return detailTable(['Card #', 'Status'], [120, 80],
          (detail.cards || []).map(c => [c.number, c.status]),
          'No access cards.');
    }
  };

  return (
    <>
      <AppHeader
        title="Active Clients Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.intro}>Service packages only — excludes registration, cafe & freezing add-ons.</Text>
        <View style={s.branchChip}>
          <Icon name="office-building-outline" size={13} color="#555" />
          <Text style={s.branchChipText}>{summary?.branch_name ?? branchName ?? 'All branches'}</Text>
        </View>

        {summary && (
          <View style={s.tileGrid}>
            <SummaryTile value={summary.total_active_clients} label="Active clients" active />
            <SummaryTile value={summary.expiring_within_30_days} label="≤ 1 month" color="#E10600" />
            <SummaryTile value={summary.expiring_within_60_days} label="≤ 2 months" color="#D97706" />
            <SummaryTile value={summary.expiring_within_90_days} label="≤ 3 months" />
            <SummaryTile value={summary.total_active_packages} label="Package lines" />
            <SummaryTile value={summary.frozen_package_lines} label="Frozen" />
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabActive]} onPress={() => openTab(t.key)}>
              <Icon name={t.icon} size={14} color={tab === t.key ? '#FFF' : '#555'} />
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.card}>
          {needsPicker && (
            <View style={s.row}>
              <SelectField
                label="Branch *"
                value={branchName ?? 'All branches'}
                onPress={() => openSheet({
                  title: 'Branch',
                  value: String(branch),
                  options: [{ value: '', label: 'All branches' }, ...branchOptions.map(o => ({ value: String(o.id), label: o.name }))],
                  onSelect: v => { setPage(1); setBranch(v === '' ? '' : Number(v)); },
                })}
              />
            </View>
          )}

          <Text style={s.label}>Client</Text>
          <View style={[s.field, s.mb8]}>
            <Icon name="magnify" size={15} color="#888" />
            <TextInput
              style={s.input}
              placeholder="Type name, phone or UID…"
              placeholderTextColor="#B0B0B0"
              value={form.search}
              onChangeText={v => set('search', v)}
              onSubmitEditing={() => apply()}
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>

          <View style={s.row}>
            {optionField('Gender', 'gender', GENDERS)}
            <SelectField
              label="Category"
              value={labelOf(CATEGORIES, form.category)}
              onPress={() => openSheet({
                title: 'Category', options: CATEGORIES, value: form.category,
                // A package belongs to one category, so changing it clears the package.
                onSelect: v => setForm(f => ({ ...f, category: v, packageId: '' })),
              })}
            />
          </View>
          <View style={s.row}>
            <SelectField label="Package" value={packageLabel} onPress={openPackages} loadingIcon={packagesLoading} />
          </View>

          <Text style={s.section}>Quick expiry</Text>
          <View style={s.quickRow}>
            {QUICK_EXPIRY.map(q => (
              <TouchableOpacity key={q.key} style={s.chip} onPress={() => quickExpiry(q.key)}>
                <Text style={s.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.row}>
            <DateField label="Start from" field="startFrom" />
            <DateField label="Start to" field="startTo" />
          </View>
          <View style={s.row}>
            <DateField label="Expiry from" field="expiryFrom" />
            <DateField label="Expiry to" field="expiryTo" />
          </View>
          <View style={s.row}>
            {optionField('Expiry window', 'expiryWindow', EXPIRY_WINDOWS)}
            {optionField('Per page', 'limit', PER_PAGE)}
          </View>

          {moreFilters && (
            <>
              <View style={s.row}>
                {optionField('Client type', 'clientType', CLIENT_TYPES)}
                {optionField('Sale type', 'saleType', SALE_TYPES)}
              </View>
              <View style={s.row}>
                {optionField('Risk level', 'riskLevel', RISK_LEVELS)}
                {optionField('Freeze', 'freezeStatus', FREEZE)}
              </View>
              <Text style={s.label}>Trainer name</Text>
              <View style={[s.field, s.mb8]}>
                <TextInput
                  style={s.input}
                  placeholder="Trainer name"
                  placeholderTextColor="#B0B0B0"
                  value={form.trainerName}
                  onChangeText={v => set('trainerName', v)}
                  autoCorrect={false}
                />
              </View>
              <View style={s.row}>
                {optionField('Sort by', 'sortBy', SORT_BY)}
                {optionField('Direction', 'sortDir', SORT_DIR)}
              </View>
            </>
          )}

          <TouchableOpacity onPress={() => setMoreFilters(m => !m)} style={s.moreBtn}>
            <Text style={s.moreText}>{moreFilters ? 'Less filters' : 'More filters'}</Text>
          </TouchableOpacity>

          <View style={s.row}>
            <TouchableOpacity style={[s.goBtn, s.flex1]} onPress={() => apply()} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#FFF" /> : (
                <View style={s.goInner}>
                  <Icon name="magnify" size={16} color="#FFF" />
                  <Text style={s.goText}>Search</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.resetBtn} onPress={reset} disabled={loading}>
              <Text style={s.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && <ActivityIndicator size="large" style={s.spinner} color="#E63946" />}

        {!loading && error && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>⚠️</Text>
            <Text style={s.emptyTitle}>Something went wrong</Text>
            <Text style={s.emptySubtitle}>{error}</Text>
          </View>
        )}

        {!loading && !error && tab === 'management' && managementView}

        {!loading && !error && tab !== 'management' && (
          clients.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>👤</Text>
              <Text style={s.emptyTitle}>No Records</Text>
              <Text style={s.emptySubtitle}>No active clients match your filters.</Text>
            </View>
          ) : (
            <>
              <Text style={s.matchLine}>{total.toLocaleString()} clients match filters</Text>
              {tab === 'by_category' ? categoryView : <View style={s.tableCard}>{clientTable}</View>}

              {totalPages > 1 && (
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
              <Text style={s.footnote}>Page {page} of {totalPages} · {total.toLocaleString()} entries</Text>
            </>
          )
        )}
      </ScrollView>

      {/* Option picker */}
      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setSheet(null)}>
          <TouchableOpacity style={sheet?.searchable ? s.tallSheet : s.sheet} activeOpacity={1}>
            <Text style={s.sheetTitle}>{sheet?.title}</Text>
            {sheet?.searchable && (
              <TextInput
                style={s.search}
                placeholder="Search…"
                placeholderTextColor="#B0B0B0"
                value={sheetSearch}
                onChangeText={setSheetSearch}
                autoCorrect={false}
              />
            )}
            <FlatList
              data={sheetOptions}
              keyExtractor={o => o.value || 'all'}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={s.sheetRow} onPress={() => { sheet?.onSelect(item.value); setSheet(null); }}>
                  <Text style={[s.sheetText, item.value === sheet?.value && s.sheetTextActive]} numberOfLines={2}>{item.label}</Text>
                  {item.value === sheet?.value && <Icon name="check" size={16} color="#E63946" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.sheetEmpty}>No matches.</Text>}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Full detail */}
      <Modal visible={detailId !== null} animationType="slide" onRequestClose={() => setDetailId(null)}>
        {/* A full-screen Modal is a separate native root outside the app's
            safe-area provider, so it needs its own for the insets to apply. */}
        <SafeAreaProvider>
        {/* Bottom only: AppHeader pads the top inset itself. */}
        <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader
          title={detail?.profile?.full_name || 'Client detail'}
          leftIcon={<Icon name="close" size={24} color="#1A1A1A" />}
          onLeftPress={() => setDetailId(null)}
          backgroundColor="#FFE5E5"
        />
        <View style={s.screen}>
          {!!detail?.profile?.uid && <Text style={s.detailUid}>#{detail.profile.uid}</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs} style={s.detailTabs}>
            {DETAIL_TABS.map(t => (
              <TouchableOpacity key={t.key} style={[s.tab, detailTab === t.key && s.tabActive]} onPress={() => setDetailTab(t.key)}>
                <Icon name={t.icon} size={14} color={detailTab === t.key ? '#FFF' : '#555'} />
                <Text style={[s.tabText, detailTab === t.key && s.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={s.content}>
            {detailTab === 'overview' || detailLoading || !detail
              ? detailBody()
              : <View style={s.tableCard}>{detailBody()}</View>}
          </ScrollView>
        </View>
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      <DateTimePickerModal
        isVisible={datePicker !== null}
        mode="date"
        date={datePicker && form[datePicker] ? new Date(form[datePicker]) : new Date()}
        onConfirm={onPickDate}
        onCancel={() => setDatePicker(null)}
      />
    </>
  );
};

const MINI_W = [220, 120, 92, 92, 92, 110, 70, 60, 64, 90];
const PKG_W = [220, 120, 92, 92, 110, 70, 90];

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  safe:         { flex: 1, backgroundColor: '#FFE5E5' },
  content:      { padding: 12, paddingBottom: 32 },
  intro:        { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  branchChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#EFEFEF', marginBottom: 10 },
  branchChipText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  tileGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tileRow:      { flexDirection: 'row', gap: 8 },
  tile:         { width: '31.5%', backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: '#EFEFEF', elevation: 1 },
  riskTile:     { flex: 1, width: undefined },
  tileActive:   { borderColor: '#E10600', borderWidth: 1.5 },
  tileNum:      { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  tileLabel:    { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  tabs:         { gap: 8, paddingVertical: 2, paddingBottom: 10, alignItems: 'center' },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E5E5' },
  tabActive:    { backgroundColor: '#E10600', borderColor: '#E10600' },
  tabText:      { fontSize: 12, fontWeight: '600', color: '#555' },
  tabTextActive:{ color: '#FFF' },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  tableCard:    { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', marginBottom: 8, elevation: 1 },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  section:      { fontSize: 12, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, marginTop: 4 },
  row:          { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  half:         { flex: 1 },
  flex1:        { flex: 1 },
  flex2:        { flex: 2 },
  mb8:          { marginBottom: 8 },
  label:        { fontSize: 11, color: '#888', marginBottom: 4 },
  field:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  fieldText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500', flex: 1 },
  input:        { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },
  placeholder:  { color: '#B0B0B0', fontWeight: '400' },
  quickRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip:         { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#F0F0F0', borderRadius: 14 },
  chipText:     { fontSize: 12, color: '#444', fontWeight: '500' },
  moreBtn:      { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 6 },
  moreText:     { fontSize: 13, color: '#E63946', fontWeight: '600' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  goInner:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  resetBtn:     { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, backgroundColor: '#FFF' },
  resetText:    { color: '#555', fontWeight: '600', fontSize: 14 },
  spinner:      { marginTop: 40 },
  matchLine:    { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  catHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  catTitle:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  catCount:     { backgroundColor: '#6B7280', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  catCountText: { fontSize: 11, color: '#FFF', fontWeight: '600' },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 },
  sheet:        { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 8, maxHeight: '60%' },
  tallSheet:    { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 8, height: '70%' },
  sheetTitle:   { fontSize: 13, fontWeight: '700', color: '#888', paddingHorizontal: 16, paddingVertical: 8 },
  sheetRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  sheetText:    { fontSize: 14, color: '#1A1A1A', flex: 1 },
  sheetTextActive: { color: '#E63946', fontWeight: '700' },
  sheetEmpty:   { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 24 },
  search:       { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  footnote:     { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 4 },
  detailUid:    { fontSize: 12, color: '#6B7280', paddingHorizontal: 12, paddingTop: 10 },
  // flexShrink 0: the flex:1 body ScrollView below was squeezing this row and clipping the chips.
  detailTabs:   { flexGrow: 0, flexShrink: 0, paddingHorizontal: 12, paddingTop: 8 },
  detailCardTitle: { fontSize: 13, fontWeight: '700', color: '#E63946', marginBottom: 8 },
  detailEmpty:  { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 32 },
  kvRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  kvKey:        { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  kvVal:        { fontSize: 13, color: '#1A1A1A', flexShrink: 1, textAlign: 'right' },
});

const b = StyleSheet.create({
  badge:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

const tbl = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:     { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4 },
  cellBox:    { justifyContent: 'center' },
  sub:        { fontSize: 11, color: '#888', paddingHorizontal: 4, marginTop: 2 },
  bold:       { fontWeight: '700' },
  frozen:     { alignSelf: 'flex-start', marginLeft: 4, marginTop: 2, fontSize: 10, color: '#FFF', backgroundColor: '#0EA5E9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  pkgBadge:   { alignSelf: 'flex-start', marginLeft: 4, minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#1A1A1A', alignItems: 'center' },
  pkgBadgeText: { fontSize: 11, color: '#FFF', fontWeight: '700' },
  detailBtn:  { borderWidth: 1, borderColor: '#E63946', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 8, alignSelf: 'flex-start' },
  detailBtnText: { fontSize: 11, color: '#E63946', fontWeight: '700' },
  link:       { fontSize: 12, color: '#E63946', fontWeight: '700', paddingHorizontal: 4 },
  expand:     { backgroundColor: '#FAFAFA', paddingVertical: 8, paddingHorizontal: 32, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  miniHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  miniHeadCell: { fontSize: 11, fontWeight: '700', color: '#555', paddingHorizontal: 4 },
  miniRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  miniCell:   { fontSize: 11, color: '#1A1A1A', paddingHorizontal: 4 },
  wChevron:   { width: 28, alignItems: 'center' },
  wUid:       { width: 100 },
  wClient:    { width: 170 },
  wDate:      { width: 96 },
  wContact:   { width: 180 },
  wBranch:    { width: 60 },
  wPkgs:      { width: 44 },
  wPkgNames:  { width: 260 },
  wCats:      { width: 150 },
  wDays:      { width: 44 },
  wRisk:      { width: 90 },
  wAction:    { width: 96 },
  wLink:      { width: 60 },
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

export default ActiveClientsReportScreen;
