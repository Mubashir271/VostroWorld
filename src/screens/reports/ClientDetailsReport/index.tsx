// src/screens/reports/ClientDetailsReport/index.tsx
//
// The web admin's Reports › Client Reports › Client Details Report
// (/client-details-report), HAR + screenshots captured 2026-09-30.
//
// Pick a branch, search that branch's clients (/v1/clients/client-name, the
// same flat list the web filters locally by name, phone or UID), then Load
// Report calls /v1/reports/active-clients/{id} with the optional filters.
// Nothing loads until Load Report, as on the web. The filters narrow only the
// package tabs and the package totals — see getActiveClientDetail.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
  getClientNames, getActiveClientDetail, ClientNameOption,
  ActiveClientDetail, ActiveClientDetailPackage, ActiveRisk, ClientDetailFilters,
} from '../../../api/reports';

type Option = { value: string; label: string };
type Tab = 'overview' | 'packages' | 'active' | 'history' | 'payments' | 'gym' | 'sessions' | 'freezing' | 'cards';
type DateField = 'startDate' | 'endDate';

// ── Web option lists (from the web bundle) ───────────────────────────────────
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'card-account-details-outline' },
  { key: 'packages', label: 'All Packages', icon: 'package-variant-closed' },
  { key: 'active', label: 'Active Packages', icon: 'check-circle-outline' },
  { key: 'history', label: 'Package History', icon: 'history' },
  { key: 'payments', label: 'Payments', icon: 'credit-card-outline' },
  { key: 'gym', label: 'Gym Check-ins', icon: 'door-open' },
  { key: 'sessions', label: 'PT Sessions', icon: 'calendar-check' },
  { key: 'freezing', label: 'Freezing', icon: 'snowflake' },
  { key: 'cards', label: 'Access Cards', icon: 'card-bulleted-outline' },
];

// Unlike Active Clients, this report's list keeps the non-service categories.
const CATEGORIES: Option[] = [
  { value: '', label: 'All categories' },
  { value: '1', label: 'Gym' },
  { value: '2', label: 'Personal Trainer' },
  { value: '3', label: 'Guest Pass' },
  { value: '4', label: 'Small Group PT' },
  { value: '5', label: 'Nutrition' },
  { value: '6', label: 'Registration' },
  { value: '7', label: 'Boot Camp' },
  { value: '9', label: 'General' },
  { value: '10', label: 'Cafe Sales' },
  { value: '11', label: 'Vostro Fitness Academy' },
  { value: '12', label: 'Massage Chair' },
  { value: '13', label: 'Cafe Deposit' },
  { value: '14', label: 'Physiotherapy' },
  { value: '15', label: 'GX' },
  { value: '16', label: 'Befit' },
];
const PACKAGE_STATUS: Option[] = [
  { value: '', label: 'All packages' },
  { value: 'active', label: 'Active only' },
  { value: 'history', label: 'History only' },
];
const SALE_TYPES: Option[] = [{ value: '', label: 'All' }, { value: 'New', label: 'New' }, { value: 'Renew', label: 'Renew' }];

const PER_PAGE = 25;
const MAX_MATCHES = 50;

type Form = { startDate: string; endDate: string; category: string; packageStatus: string; saleType: string };
const DEFAULT_FORM: Form = { startDate: '', endDate: '', category: '', packageStatus: '', saleType: '' };

type Client = { id: number; uid: string; name: string; phone: string };

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
// The API fills empty profile fields with placeholders ("N/A", all-zero CNIC).
const text = (v?: string | number | null) => {
  const s = v == null ? '' : String(v).trim();
  return !s || s === 'N/A' || /^0+$/.test(s) ? '—' : s;
};
const money = (v?: number | null) => `Rs ${Number(v ?? 0).toLocaleString()}`;
const num = (v?: number | null) => (v == null ? '—' : Number(v).toLocaleString());

const RISK: Record<ActiveRisk, { text: string; fg: string; bg: string }> = {
  critical: { text: '≤ 1 month', fg: '#C0392B', bg: '#FDECEC' },
  warning: { text: '≤ 2 months', fg: '#B45309', bg: '#FEF3C7' },
  ok: { text: 'OK', fg: '#15803D', bg: '#DCFCE7' },
  expired: { text: 'Expired', fg: '#555', bg: '#EEEEEE' },
};
const Badge = ({ label, fg, bg }: { label: string; fg: string; bg: string }) => (
  <View style={[b.badge, { backgroundColor: bg }]}>
    <Text style={[b.badgeText, { color: fg }]}>{label}</Text>
  </View>
);
const RiskBadge = ({ risk }: { risk: ActiveRisk }) => {
  const r = RISK[risk] ?? RISK.ok;
  return <Badge label={r.text} fg={r.fg} bg={r.bg} />;
};
// Card status as ViewCards labels it: '1' is active, anything else blocked.
const CardBadge = ({ status }: { status: string }) => (String(status) === '1'
  ? <Badge label="Active" fg="#15803D" bg="#DCFCE7" />
  : <Badge label="Blocked" fg="#C0392B" bg="#FDECEC" />);

type Sheet = { title: string; options: Option[]; value: string; onSelect: (v: string) => void };
type Cell = string | number | React.ReactElement;

const ClientDetailsReportScreen = () => {
  const navigation = useNavigation() as any;
  const { needsPicker, options: branchOptions, listBranchId } = useBranchSelector();

  // Super admin must pick a branch; branch-scoped admins are pinned to theirs.
  const [branch, setBranch] = useState<number | ''>('');
  const branchId: number | '' = needsPicker ? branch : (listBranchId ?? '');
  const branchName = needsPicker
    ? (branch === '' ? 'Select branch' : branchOptions.find(o => o.id === branch)?.name ?? 'Branch')
    : undefined;

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [showMatches, setShowMatches] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);

  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));

  const [detail, setDetail] = useState<ActiveClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [page, setPage] = useState(1);

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [datePicker, setDatePicker] = useState<DateField | null>(null);

  // A branch change reloads its client list and clears the pick and report.
  useEffect(() => {
    setQuery(''); setSelected(null); setDetail(null); setError(null); setClients([]);
    if (branchId === '') return;
    let cancelled = false;
    setClientsLoading(true);
    getClientNames(branchId)
      .then(list => {
        if (cancelled) return;
        setClients(list.map((c: ClientNameOption) => ({
          id: c.id,
          uid: c.uid ?? '',
          name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
          phone: c.phone ?? '',
        })));
      })
      .finally(() => { if (!cancelled) setClientsLoading(false); });
    return () => { cancelled = true; };
  }, [branchId]);

  // Same match as the web: name (case-insensitive), phone, or UID.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? clients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.uid.toLowerCase().includes(q))
      : clients;
    return list;
  }, [clients, query]);

  const pickClient = (c: Client) => { setSelected(c); setQuery(c.name); setShowMatches(false); };
  const clearClient = () => { setSelected(null); setQuery(''); setShowMatches(false); };

  const load = () => {
    if (branchId === '') { setError('Please select a branch first.'); return; }
    if (!selected) { setError('Please select a client.'); return; }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setError('End date must be on or after start date.');
      return;
    }
    setShowMatches(false);
    setLoading(true);
    setError(null);
    setDetail(null);
    setTab('overview');
    setPage(1);
    getActiveClientDetail(selected.id, {
      start_date: form.startDate,
      end_date: form.endDate,
      category: form.category,
      package_status: form.packageStatus as ClientDetailFilters['package_status'],
      sale_type: form.saleType,
    })
      .then(d => { if (d) setDetail(d); else setError('Could not load client details.'); })
      .catch((err: any) => setError(err?.response?.data?.message || 'Could not load client details.'))
      .finally(() => setLoading(false));
  };

  const openTab = (t: Tab) => { setTab(t); setPage(1); };

  const onPickDate = (d: Date) => {
    if (datePicker) set(datePicker, iso(d));
    setDatePicker(null);
  };

  // ── Pieces ─────────────────────────────────────────────────────────────────
  const SelectField = ({ label, value, onPress }: { label: string; value: string; onPress: () => void }) => (
    <View style={s.half}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.field} onPress={onPress}>
        <Text style={s.fieldText} numberOfLines={1}>{value}</Text>
        <Icon name="chevron-down" size={16} color="#888" />
      </TouchableOpacity>
    </View>
  );

  const optionField = (label: string, key: keyof Form, opts: Option[]) => (
    <SelectField
      label={label}
      value={labelOf(opts, form[key])}
      onPress={() => setSheet({ title: label, options: opts, value: form[key], onSelect: v => set(key, v) })}
    />
  );

  const DateInput = ({ label, field }: { label: string; field: DateField }) => (
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

  const Tile = ({ value, label }: { value: string; label: string }) => (
    <View style={s.tile}>
      <Text style={s.tileNum} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );

  const Pager = ({ total }: { total: number }) => {
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (totalPages <= 1) return null;
    const RANGE = 5;
    let start = Math.max(1, page - Math.floor(RANGE / 2));
    const end = Math.min(totalPages, start + RANGE - 1);
    start = Math.max(1, Math.min(start, end - RANGE + 1));
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    return (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pg.bar}>
          <TouchableOpacity style={[pg.textBtn, page === 1 && pg.btnDisabled]} onPress={() => setPage(1)} disabled={page === 1}>
            <Text style={[pg.textBtnLabel, page === 1 && pg.textDisabled]}>First Page</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]} onPress={() => setPage(page - 1)} disabled={page === 1}>
            <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
          </TouchableOpacity>
          {pages.map(p => (
            <TouchableOpacity key={p} style={[pg.btn, p === page && pg.btnActive]} onPress={() => setPage(p)}>
              <Text style={[pg.num, p === page && pg.numActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]} onPress={() => setPage(page + 1)} disabled={page === totalPages}>
            <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
          </TouchableOpacity>
          <TouchableOpacity style={[pg.textBtn, page === totalPages && pg.btnDisabled]} onPress={() => setPage(totalPages)} disabled={page === totalPages}>
            <Text style={[pg.textBtnLabel, page === totalPages && pg.textDisabled]}>Last Page</Text>
          </TouchableOpacity>
        </ScrollView>
        <Text style={s.footnote}>Page {page} of {totalPages} · {total.toLocaleString()} entries</Text>
      </>
    );
  };

  // A paged table: 25 rows a page, horizontal scroll for wide column sets.
  const table = (cols: string[], widths: number[], rows: Cell[][], empty: string, paged = true) => {
    if (rows.length === 0) return <View style={s.tableCard}><Text style={s.detailEmpty}>{empty}</Text></View>;
    const shown = paged ? rows.slice((page - 1) * PER_PAGE, page * PER_PAGE) : rows;
    return (
      <>
        <View style={s.tableCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={tbl.header}>
                {cols.map((c, i) => <Text key={c} style={[tbl.headerCell, { width: widths[i] }]}>{c}</Text>)}
              </View>
              {shown.map((r, ri) => (
                <View key={ri} style={[tbl.row, ri % 2 === 1 && tbl.rowAlt]}>
                  {r.map((v, i) => (typeof v === 'object'
                    ? <View key={i} style={[tbl.cellBox, { width: widths[i] }]}>{v}</View>
                    : <Text key={i} style={[tbl.cell, { width: widths[i] }]}>{v}</Text>))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
        {paged && <Pager total={rows.length} />}
      </>
    );
  };

  const PKG_COLS = ['Package', 'Category', 'Sale Type', 'Sale Date', 'Start', 'End', 'Price', 'Discount', 'Net', 'Trainer', 'Sessions', 'Status', 'Risk'];
  const PKG_W = [210, 110, 76, 96, 96, 96, 80, 72, 80, 110, 70, 70, 84];
  const packageTable = (list: ActiveClientDetailPackage[] | undefined, empty: string, paged = true) =>
    table(PKG_COLS, PKG_W, (list ?? []).map(p => [
      p.package_name,
      p.category,
      p.sale_type || '—',
      fmtDate(p.sale_date),
      fmtDate(p.start_date),
      fmtDate(p.end_date),
      num(p.price),
      num(p.discount),
      num(p.net_price),
      p.trainer_name || '—',
      p.sessions_total != null ? `${p.sessions_delivered ?? 0}/${p.sessions_total}` : '—',
      p.is_active ? 'Active' : 'Inactive',
      <RiskBadge risk={p.expiry_risk} />,
    ]), empty, paged);

  const kv = (k: string, v: string | number) => (
    <View style={s.kvRow} key={k}>
      <Text style={s.kvKey}>{k}</Text>
      <Text style={s.kvVal}>{v}</Text>
    </View>
  );

  const body = () => {
    if (!detail) return null;
    const p = detail.profile;
    const c = detail.counts;
    switch (tab) {
      case 'overview':
        return (
          <>
            <View style={s.card}>
              <Text style={s.detailCardTitle}>Contact</Text>
              {kv('UID', text(p.uid))}
              {kv('Phone', text(p.phone))}
              {kv('Email', text(p.email))}
              {kv('Gender', text(p.gender))}
              {kv('Branch', text(p.branch_name) === '—' ? branchName ?? '—' : p.branch_name)}
              {kv('Client type', text(p.type))}
            </View>
            <View style={s.card}>
              <Text style={s.detailCardTitle}>Membership</Text>
              {kv('Joining date', fmtDate(p.joining_date || p.registration_date))}
              {kv('Registration package', text(p.registration_package))}
              {kv('Registration date', fmtDate(p.registration_date))}
              {kv('CNIC', text(p.cnic))}
              {kv('Address', text(p.address))}
            </View>
            <View style={s.card}>
              <Text style={s.detailCardTitle}>Summary</Text>
              {kv('Total packages', c?.total_packages ?? 0)}
              {kv('Active packages', c?.active_packages ?? 0)}
              {kv('History packages', c?.history_packages ?? 0)}
              {kv('Total price', money(c?.total_price))}
              {kv('Total discount', money(c?.total_discount))}
              {kv('Total net', money(c?.total_net_price))}
            </View>
            {packageTable(detail.all_packages, 'No packages found for selected filters.')}
          </>
        );
      case 'packages':
        return packageTable(detail.all_packages, 'No packages found.');
      case 'active':
        return packageTable(detail.active_packages, 'No active packages found.');
      case 'history':
        return packageTable(detail.package_history, 'No package history found.');
      case 'payments':
        return table(['Date', 'Order', 'Amount', 'Method', 'Status', 'Note'], [96, 70, 90, 110, 96, 200],
          (detail.payments || []).map(x => [
            fmtDate(x.date), x.order_id, num(x.received), x.payment_method || '—', x.payment_status || '—', text(x.note),
          ]),
          'No payments found.');
      case 'gym':
        return table(['Date', 'Check In', 'Check Out', 'Status'], [100, 100, 100, 80],
          (detail.gym_attendance || []).map(g => [
            fmtDate(g.date), g.checkin_time_12h || '—', g.checkout_time_12h || '—', g.attendance_status || '—',
          ]),
          'No gym check-ins found.');
      case 'sessions':
        return table(['Date', 'Package', 'Trainer', 'Valid'], [96, 210, 120, 56],
          (detail.session_attendance || []).map(x => [
            fmtDate(x.date), x.package_name, x.trainer_name || '—', x.validate_status === '1' ? 'Yes' : 'No',
          ]),
          'No PT sessions found.');
      case 'freezing':
        return table(['Start', 'End', 'Reason'], [96, 96, 220],
          (detail.freezing || []).map(f => [fmtDate(f.start_date), fmtDate(f.end_date), text(f.reason)]),
          'No freezing records found.');
      case 'cards':
        return table(['Card #', 'Status', 'Created'], [120, 90, 100],
          (detail.cards || []).map(x => [x.number, <CardBadge status={x.status} />, fmtDate(x.created_at)]),
          'No access cards found.');
    }
  };

  const c = detail?.counts;

  return (
    <>
      <AppHeader
        title="Client Details Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.intro}>Select branch, search client, then view complete package and activity history.</Text>
        {!needsPicker && (
          <View style={s.branchChip}>
            <Icon name="office-building-outline" size={13} color="#555" />
            <Text style={s.branchChipText}>{detail?.profile?.branch_name || 'Your branch'}</Text>
          </View>
        )}

        <View style={s.card}>
          {needsPicker && (
            <View style={s.row}>
              <SelectField
                label="Branch *"
                value={branchName ?? 'Select branch'}
                onPress={() => setSheet({
                  title: 'Branch',
                  value: String(branch),
                  options: branchOptions.map(o => ({ value: String(o.id), label: o.name })),
                  onSelect: v => setBranch(Number(v)),
                })}
              />
            </View>
          )}

          <Text style={s.label}>Client *</Text>
          <View style={[s.field, branchId === '' && s.fieldDisabled]}>
            <Icon name="magnify" size={15} color="#888" />
            <TextInput
              style={s.input}
              placeholder={branchId === '' ? 'Select a branch first' : 'Type name, phone or UID…'}
              placeholderTextColor="#B0B0B0"
              value={query}
              editable={branchId !== ''}
              onFocus={() => setShowMatches(true)}
              onChangeText={v => {
                setQuery(v);
                setShowMatches(true);
                // Editing the text drops the pick until another is chosen.
                if (selected && v !== selected.name) setSelected(null);
              }}
              autoCorrect={false}
            />
            {clientsLoading
              ? <ActivityIndicator size="small" color="#888" />
              : !!query && (
                <TouchableOpacity onPress={clearClient}>
                  <Text style={s.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
          </View>

          {showMatches && branchId !== '' && !clientsLoading && (
            <View style={s.matches}>
              {matches.length === 0 ? (
                <Text style={s.matchEmpty}>No clients match</Text>
              ) : (
                <>
                  <Text style={s.matchMeta}>
                    {matches.length.toLocaleString()} of {clients.length.toLocaleString()} clients
                    {matches.length > MAX_MATCHES ? ` · showing first ${MAX_MATCHES}` : ''}
                  </Text>
                  <ScrollView style={s.matchList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {matches.slice(0, MAX_MATCHES).map(m => (
                      <TouchableOpacity
                        key={m.id}
                        style={[s.matchRow, selected?.id === m.id && s.matchRowActive]}
                        onPress={() => pickClient(m)}
                      >
                        <Text style={s.matchName}>{m.name}</Text>
                        <Text style={s.matchSub}>{[m.uid ? `UID: ${m.uid}` : null, m.phone].filter(Boolean).join(' · ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          )}
          {selected ? <Text style={s.selectedText}>Selected: {selected.name}</Text> : <View style={s.mb8} />}

          <View style={s.row}>
            <DateInput label="Start date" field="startDate" />
            <DateInput label="End date" field="endDate" />
          </View>
          <View style={s.row}>
            {optionField('Category', 'category', CATEGORIES)}
            {optionField('Package status', 'packageStatus', PACKAGE_STATUS)}
          </View>
          <View style={s.row}>
            {optionField('Sale type', 'saleType', SALE_TYPES)}
            <View style={s.half} />
          </View>

          <TouchableOpacity style={s.goBtn} onPress={load} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : (
              <View style={s.goInner}>
                <Icon name="file-document-outline" size={16} color="#FFF" />
                <Text style={s.goText}>Load Report</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {!!error && !loading && (
          <View style={s.errorBox}>
            <Icon name="alert-circle-outline" size={16} color="#C0392B" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" style={s.spinner} color="#E63946" />}

        {!loading && !detail && !error && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👤</Text>
            <Text style={s.emptyTitle}>No client loaded</Text>
            <Text style={s.emptySubtitle}>Select branch and client, then tap Load Report.</Text>
          </View>
        )}

        {!loading && detail && (
          <>
            <Text style={s.clientName}>{detail.profile.full_name}</Text>
            {!!detail.profile.uid && <Text style={s.clientUid}>#{detail.profile.uid}</Text>}

            <View style={s.tileGrid}>
              <Tile value={num(c?.total_packages ?? 0)} label="Packages" />
              <Tile value={num(c?.active_packages ?? 0)} label="Active" />
              <Tile value={num(c?.payments ?? 0)} label="Payments" />
              <Tile value={num(c?.gym_checkins ?? 0)} label="Gym Check-ins" />
              <Tile value={num(c?.sessions_delivered ?? 0)} label="PT Sessions" />
              <Tile value={money(c?.total_price)} label="Total Price" />
              <Tile value={money(c?.total_discount)} label="Total Discount" />
              <Tile value={money(c?.total_net_price)} label="Total Net" />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
              {TABS.map(t => (
                <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabActive]} onPress={() => openTab(t.key)}>
                  <Icon name={t.icon} size={14} color={tab === t.key ? '#FFF' : '#555'} />
                  <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {body()}
          </>
        )}
      </ScrollView>

      {/* Option picker */}
      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setSheet(null)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1}>
            <Text style={s.sheetTitle}>{sheet?.title}</Text>
            <FlatList
              data={sheet?.options ?? []}
              keyExtractor={o => o.value || 'all'}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.sheetRow} onPress={() => { sheet?.onSelect(item.value); setSheet(null); }}>
                  <Text style={[s.sheetText, item.value === sheet?.value && s.sheetTextActive]} numberOfLines={2}>{item.label}</Text>
                  {item.value === sheet?.value && <Icon name="check" size={16} color="#E63946" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.sheetEmpty}>No options.</Text>}
            />
          </TouchableOpacity>
        </TouchableOpacity>
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

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  content:      { padding: 12, paddingBottom: 32 },
  intro:        { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  branchChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#EFEFEF', marginBottom: 10 },
  branchChipText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  tileGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tile:         { width: '31.5%', backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: '#EFEFEF', elevation: 1 },
  tileNum:      { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  tileLabel:    { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  tabs:         { gap: 8, paddingVertical: 2, paddingBottom: 10, alignItems: 'center' },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E5E5' },
  tabActive:    { backgroundColor: '#E10600', borderColor: '#E10600' },
  tabText:      { fontSize: 12, fontWeight: '600', color: '#555' },
  tabTextActive:{ color: '#FFF' },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  tableCard:    { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', marginBottom: 8, elevation: 1 },
  row:          { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  half:         { flex: 1 },
  mb8:          { marginBottom: 8 },
  label:        { fontSize: 11, color: '#888', marginBottom: 4 },
  field:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  fieldDisabled:{ opacity: 0.6 },
  fieldText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500', flex: 1 },
  input:        { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },
  placeholder:  { color: '#B0B0B0', fontWeight: '400' },
  clearText:    { fontSize: 12, color: '#E63946', fontWeight: '600' },
  matches:      { borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, marginTop: 4, backgroundColor: '#FFF', overflow: 'hidden' },
  matchMeta:    { fontSize: 11, color: '#888', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FAFAFA' },
  matchList:    { maxHeight: 240 },
  matchRow:     { paddingHorizontal: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  matchRowActive: { backgroundColor: '#FFF1F1' },
  matchName:    { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  matchSub:     { fontSize: 11, color: '#888', marginTop: 2 },
  matchEmpty:   { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 14 },
  selectedText: { fontSize: 12, color: '#6B7280', marginTop: 6, marginBottom: 10 },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  goInner:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FDECEC', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText:    { fontSize: 13, color: '#C0392B', flex: 1 },
  spinner:      { marginTop: 40 },
  clientName:   { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  clientUid:    { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 },
  sheet:        { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 8, maxHeight: '60%' },
  sheetTitle:   { fontSize: 13, fontWeight: '700', color: '#888', paddingHorizontal: 16, paddingVertical: 8 },
  sheetRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  sheetText:    { fontSize: 14, color: '#1A1A1A', flex: 1 },
  sheetTextActive: { color: '#E63946', fontWeight: '700' },
  sheetEmpty:   { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 24 },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  footnote:     { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 4, marginBottom: 8 },
  detailCardTitle: { fontSize: 13, fontWeight: '700', color: '#E63946', marginBottom: 8 },
  detailEmpty:  { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 32 },
  kvRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  kvKey:        { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  kvVal:        { fontSize: 13, color: '#1A1A1A', flexShrink: 1, textAlign: 'right' },
});

const b = StyleSheet.create({
  badge:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

const tbl = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:     { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4 },
  cellBox:    { justifyContent: 'center' },
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

export default ClientDetailsReportScreen;
