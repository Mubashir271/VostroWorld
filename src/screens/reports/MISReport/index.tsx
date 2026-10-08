import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Pressable, Alert, Dimensions,
} from 'react-native';
import Svg, { Circle, G, Rect, Polyline, Line, Text as SvgText } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getMISDashboard } from '../../../api/dashboard';
import { getBranchesNameList } from '../../../api/employeeDashboard';
import { downloadMISReportPdf } from '../../../utils/misReportPdf';

interface BranchOption { id: string; label: string; branch_id: number | 'all'; }

// The web's MIS Report opens on "All Branches" (bId=all) — HAR-confirmed
// 2026-10-08, the endpoint now aggregates every branch and adds a
// by_branch comparison.
const ALL_BRANCHES: BranchOption = { id: 'all', label: 'All Branches', branch_id: 'all' };

const fmtRs = (v: any) => {
  const n = Number(v);
  return v == null || isNaN(n) ? '—' : `Rs ${n.toLocaleString()}`;
};
const fmtNum = (v: any) => {
  const n = Number(v);
  return v == null || isNaN(n) ? '—' : n.toLocaleString();
};

// Local calendar date — toISOString() would shift back a day west of UTC.
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const SectionHeader = ({ title }: { title: string }) => (
  <View style={s.sectionHeader}>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const TableRow = ({
  label, qty, price, discount, gst, net, highlight,
}: {
  label: string; qty?: any; price?: any; discount?: any; gst?: any; net?: any; highlight?: boolean;
}) => (
  <View style={[s.tableRow, highlight && s.tableRowHL]}>
    <Text style={[s.tableCell, s.tableCellLabel]} numberOfLines={2}>{label}</Text>
    <Text style={[s.tableCell, s.tableCellNum]}>{fmtNum(qty ?? 0)}</Text>
    <Text style={[s.tableCell, s.tableCellNum]}>{fmtRs(price ?? 0)}</Text>
    <Text style={[s.tableCell, s.tableCellNum]}>{fmtRs(discount ?? 0)}</Text>
    <Text style={[s.tableCell, s.tableCellNum]}>{fmtRs(gst ?? 0)}</Text>
    <Text style={[s.tableCell, s.tableCellNum, s.netCell]}>{fmtRs(net ?? 0)}</Text>
  </View>
);

const TableHeader = () => (
  <View style={s.tableHeader}>
    {['Particulars', 'Qty', 'Price', 'Discount', 'GST', 'Net Price'].map((h, i) => (
      <Text key={h} style={[s.tableCell, s.tableHeaderCell, i === 0 && s.tableCellLabel]}>{h}</Text>
    ))}
  </View>
);

const KVRow = ({ label, value, redValue }: { label: string; value: any; redValue?: boolean }) => (
  <View style={s.kvRow}>
    <Text style={s.kvLabel}>{label}</Text>
    <Text style={[s.kvValue, redValue && { color: '#E63946' }]}>{value ?? '—'}</Text>
  </View>
);

// Same rows and order as the web's "Daily sales breakup by department".
const BREAKUP_CATEGORIES = [
  { label: 'Gym New', key: 'gym_new' },
  { label: 'Gym Existing / Renew', key: 'gym_renew' },
  { label: 'Personal Training New', key: 'pt_new' },
  { label: 'Personal Training Renew', key: 'pt_renew' },
  { label: 'GX Studio', key: 'gx' },
  { label: 'Nutrition', key: 'nutrition' },
  { label: 'Physio', key: 'physio' },
  { label: 'Academy', key: 'academy' },
  { label: 'Café', key: 'cafe' },
  { label: 'Other', key: 'other' },
];

// Short axis labels, as on the web's breakup chart.
const CHART_LABELS: Record<string, string> = {
  gym_new: 'Gym New', gym_renew: 'Gym Renew', pt_new: 'PT New', pt_renew: 'PT Renew',
  gx: 'GX', nutrition: 'Nutrition', physio: 'Physio', academy: 'Academy', cafe: 'Café', other: 'Other',
};

// ── Charts (the web's on-screen "Charts" and fiscal-year graph) ─────────────
// Drawn with react-native-svg like AdminDashboard's, in the app's colours.
const SALES = '#E63946';
const EXPENSE = '#F59E0B';
const CHART_W = Dimensions.get('window').width - 24 - 28; // card margin + padding
const AXIS_W = 40;

/** 18000000 → "18M", 450000 → "450K". */
const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${+(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
};

const YAxis = ({ max, top, bottom }: { max: number; top: number; bottom: number }) => (
  <>
    {[0, 0.25, 0.5, 0.75, 1].map(f => {
      const y = bottom - f * (bottom - top);
      return (
        <G key={f}>
          <Line x1={AXIS_W} y1={y} x2={CHART_W} y2={y} stroke="#F0F0F0" strokeWidth={1} />
          <SvgText x={AXIS_W - 4} y={y + 3} fontSize={8} fill="#94A3B8" textAnchor="end">{compact(max * f)}</SvgText>
        </G>
      );
    })}
  </>
);

const ChartLegend = ({ items }: { items: { label: string; color: string }[] }) => (
  <View style={s.legend}>
    {items.map(i => (
      <View key={i.label} style={s.legendItem}>
        <View style={[s.legendDot, { backgroundColor: i.color }]} />
        <Text style={s.legendText}>{i.label}</Text>
      </View>
    ))}
  </View>
);

/** Fiscal year: sales net vs expenses per month, side-by-side bars. */
const MonthBars = ({ data }: { data: { label: string; sales: number; expenses: number }[] }) => {
  if (!data.length) return null;
  const H = 180, top = 8, bottom = H - 20;
  const max = Math.max(...data.flatMap(d => [d.sales, d.expenses]), 1);
  const slot = (CHART_W - AXIS_W) / data.length;
  const bw = Math.min(slot * 0.32, 26);
  const h = (v: number) => (Math.max(v, 0) / max) * (bottom - top);
  return (
    <Svg width={CHART_W} height={H}>
      <YAxis max={max} top={top} bottom={bottom} />
      {data.map((d, i) => {
        const cx = AXIS_W + slot * i + slot / 2;
        return (
          <G key={d.label}>
            <Rect x={cx - bw - 1} y={bottom - h(d.sales)} width={bw} height={h(d.sales)} rx={2} fill={SALES} />
            <Rect x={cx + 1} y={bottom - h(d.expenses)} width={bw} height={h(d.expenses)} rx={2} fill={EXPENSE} />
            <SvgText x={cx} y={H - 5} fontSize={8} fill="#94A3B8" textAnchor="middle">{d.label}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

/** Sales vs expenses over the last 7 days. */
const TrendLines = ({ data }: { data: { label: string; sales: number; expenses: number }[] }) => {
  if (!data.length) return null;
  const H = 170, top = 8, bottom = H - 20;
  const max = Math.max(...data.flatMap(d => [d.sales, d.expenses]), 1);
  const x = (i: number) => AXIS_W + 6 + (i * (CHART_W - AXIS_W - 12)) / Math.max(data.length - 1, 1);
  const y = (v: number) => bottom - (Math.max(v, 0) / max) * (bottom - top);
  const line = (k: 'sales' | 'expenses') => data.map((d, i) => `${x(i)},${y(d[k])}`).join(' ');
  return (
    <Svg width={CHART_W} height={H}>
      <YAxis max={max} top={top} bottom={bottom} />
      <Polyline points={line('expenses')} fill="none" stroke={EXPENSE} strokeWidth={2} />
      <Polyline points={line('sales')} fill="none" stroke={SALES} strokeWidth={2} />
      {data.map((d, i) => (
        <G key={d.label}>
          <Circle cx={x(i)} cy={y(d.sales)} r={2.5} fill={SALES} />
          <Circle cx={x(i)} cy={y(d.expenses)} r={2.5} fill={EXPENSE} />
          <SvgText x={x(i)} y={H - 5} fontSize={8} fill="#94A3B8" textAnchor="middle">{d.label}</SvgText>
        </G>
      ))}
    </Svg>
  );
};

/** Footfall split by time slot. */
const FootfallDonut = ({ parts, total }: { parts: { value: number; color: string }[]; total: number }) => {
  const size = 150, r = size / 2 - 14, c = 2 * Math.PI * r;
  const sum = parts.reduce((a, p) => a + p.value, 0);
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={22} fill="none" />
        {sum > 0 && parts.map((p, i) => {
          const len = (p.value / sum) * c;
          const el = (
            <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={p.color} strokeWidth={22} fill="none"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </G>
      <SvgText x={size / 2} y={size / 2 + 6} fontSize={18} fontWeight="700" fill="#0F172A" textAnchor="middle">{total}</SvgText>
    </Svg>
  );
};

/** Today's sales breakup (net) — one bar per category that sold anything. */
const BreakupBars = ({ data }: { data: { label: string; value: number }[] }) => {
  if (!data.length) return <Text style={s.noneText}>No sales today</Text>;
  const H = 190, top = 8, bottom = H - 32;
  const max = Math.max(...data.map(d => d.value), 1);
  const slot = (CHART_W - AXIS_W) / data.length;
  const bw = Math.min(slot * 0.6, 40);
  return (
    <Svg width={CHART_W} height={H}>
      <YAxis max={max} top={top} bottom={bottom} />
      {data.map((d, i) => {
        const cx = AXIS_W + slot * i + slot / 2;
        const h = (d.value / max) * (bottom - top);
        return (
          <G key={d.label}>
            <Rect x={cx - bw / 2} y={bottom - h} width={bw} height={h} rx={3} fill={SALES} />
            <SvgText x={cx} y={bottom + 12} fontSize={8} fill="#64748b" textAnchor="middle">{d.label}</SvgText>
            <SvgText x={cx} y={bottom + 24} fontSize={8} fill="#1A1A1A" fontWeight="700" textAnchor="middle">{compact(d.value)}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

const MISReportScreen = () => {
  const navigation = useNavigation();
  // Admin Dashboard's "Open MIS" passes its branch + date so this opens on
  // the same report, already loaded.
  const params = (useRoute().params ?? {}) as { branchId?: number | 'all'; branchLabel?: string; date?: string };
  const { profile } = useSelector((state: RootState) => state.user);
  // Users tied to a branch only ever see their own; Super Admin (branchId 0)
  // picks All Branches or one branch, like the web.
  const hasFixedBranch = !!profile?.branchId;

  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([ALL_BRANCHES]);
  const [selectedBranch, setSelectedBranch] = useState<BranchOption>(() =>
    params.branchId != null && params.branchId !== 'all'
      ? { id: String(params.branchId), label: params.branchLabel ?? `Branch ${params.branchId}`, branch_id: params.branchId }
      : ALL_BRANCHES);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [date, setDate] = useState(() => {
    const m = params.date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
  });
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (hasFixedBranch) return;
    getBranchesNameList()
      .then(res => {
        const branches = res?.data ?? [];
        setBranchOptions([
          ALL_BRANCHES,
          ...branches.map((b: any) => ({ id: String(b.id), label: b.name, branch_id: b.id })),
        ]);
      })
      .catch(() => {});
  }, [hasFixedBranch]);

  const effectiveBranchId = hasFixedBranch ? profile?.branchId : selectedBranch.branch_id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // A loaded report belongs to one branch + date — drop it when either changes
  // so the PDF can never print a different selection than the one shown.
  useEffect(() => { setData(null); }, [effectiveBranchId, date]);

  const load = async () => {
    if (effectiveBranchId == null) return;
    setLoading(true);
    try {
      // Response is { status, data: { meta, executive, sales, … } }.
      const res = await getMISDashboard(effectiveBranchId, ymd(date));
      setData(res?.data ?? null);
    } catch (e: any) {
      Alert.alert('MIS Report', e?.message || 'Could not load the report.');
    } finally {
      setLoading(false);
    }
  };

  // Opened from Admin Dashboard: load straight away.
  useEffect(() => {
    if (params.branchId != null || params.date) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The web's "Download PDF" — same sections, same file name.
  const downloadPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await downloadMISReportPdf(data, navigation);
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Could not generate the PDF.');
    } finally {
      setExporting(false);
    }
  };

  const branchName = data?.meta?.branch_label
    ?? (hasFixedBranch ? (profile?.branchName ?? `Branch ${profile?.branchId}`) : selectedBranch.label);
  const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const ex = data?.executive ?? {};
  const sales = data?.sales ?? {};
  const bu = sales.breakup_today ?? {};
  const ff = data?.footfall ?? {};
  const hr = data?.hr ?? {};
  const cafe = data?.cafe ?? {};
  const dep = data?.departments ?? {};
  const fy = data?.fiscal_year ?? {};
  const byBranch: any[] = data?.by_branch ?? [];
  const topMtd: any[] = data?.trainers?.top_mtd ?? [];
  const topToday: any[] = data?.trainers?.top_today ?? [];
  const trend: any[] = data?.trend ?? [];
  const oldest: any[] = data?.membership?.oldest_active_packages ?? [];
  const lateStaff: any[] = hr.late_staff ?? [];
  const absentStaff: any[] = hr.absent_staff ?? [];
  const leaveStaff: any[] = hr.leave_staff ?? [];
  const lateMonth: any[] = hr.top_late_month ?? [];
  const leads = dep.social_leads ?? {};
  const physio = dep.physio_detail ?? {};
  const nutri = dep.nutrition_detail ?? {};
  const asOf = data?.meta?.date
    ? new Date(`${data.meta.date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  // Same rows, order and notes as the web's on-screen "All departments — overview".
  const sumNet = (keys: string[]) => keys.reduce((a, k) => a + (Number(bu[k]?.net) || 0), 0);
  const sumQty = (keys: string[]) => keys.reduce((a, k) => a + (Number(bu[k]?.qty) || 0), 0);
  const overview = [
    { name: 'Gym membership', qty: sumQty(['gym_new', 'gym_renew']), net: fmtRs(sumNet(['gym_new', 'gym_renew'])), note: `${fmtNum(ex.active_gym_members ?? 0)} gym members active as of ${asOf}` },
    { name: 'Personal training', qty: sumQty(['pt_new', 'pt_renew']), net: fmtRs(sumNet(['pt_new', 'pt_renew'])), note: `${fmtNum(hr.pt_staff_present ?? 0)} trainers present` },
    { name: 'GX Studio', qty: sumQty(['gx']), net: fmtRs(sumNet(['gx'])), note: `${fmtNum(ff.gx_active_members ?? 0)} active · ${fmtNum(ff.gx_present ?? 0)} present / ${fmtNum(ff.gx_absent ?? 0)} absent` },
    { name: 'Academy', qty: sumQty(['academy']), net: fmtRs(sumNet(['academy'])), note: `${fmtNum(ff.academy_active_members ?? 0)} active members` },
    { name: 'Nutrition', qty: sumQty(['nutrition']), net: fmtRs(sumNet(['nutrition'])), note: `${fmtNum(nutri.consultations_today ?? 0)} consults · ${fmtNum(nutri.meal_plans_issued_mtd ?? 0)} meal plans MTD` },
    { name: 'Physiotherapy', qty: sumQty(['physio']), net: fmtRs(sumNet(['physio'])), note: `${fmtNum(physio.consultations_conducted_today ?? 0)} conducted · ${fmtNum(physio.appointments_mtd ?? 0)} appts MTD` },
    { name: 'Café', qty: sumQty(['cafe']), net: fmtRs(sumNet(['cafe'])), note: `MTD ${fmtRs(ex.cafe_mtd_net ?? 0)}` },
    { name: 'Other', qty: sumQty(['other']), net: fmtRs(sumNet(['other'])), note: '—' },
    { name: 'Social / leads', qty: leads.leads_today ?? 0, net: '—', note: `${fmtNum(leads.payments ?? 0)} paid · ${fmtNum(leads.visit_completed ?? 0)} visits` },
  ];

  return (
    <>
      <AppHeader
        title="MIS Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Report header */}
        <View style={s.reportHeader}>
          <Text style={s.reportTitle}>VOSTRO WORLD ({String(branchName).toUpperCase()}) DAILY MIS REPORT</Text>
          <Text style={s.reportDate}>Date: {dateLabel}</Text>
        </View>

        {/* Branch selector — only for users with no fixed branch (Super Admin) */}
        {!hasFixedBranch && (
          <View style={s.branchField}>
            <Text style={s.branchLabel}>Branch</Text>
            <TouchableOpacity style={s.branchSelect} onPress={() => setBranchModalVisible(true)}>
              <Text style={s.branchSelectText}>{selectedBranch.label}</Text>
              <Icon name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={s.branchField}>
          <Text style={s.branchLabel}>Report date</Text>
          <TouchableOpacity style={s.branchSelect} onPress={() => setPickerVisible(true)}>
            <Text style={s.branchSelectText}>{dateLabel}</Text>
            <Icon name="calendar" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Load button */}
        <TouchableOpacity style={s.loadBtn} onPress={load} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={s.loadBtnText}>Load Report</Text>}
        </TouchableOpacity>

        {data && !loading && (
          <TouchableOpacity style={s.pdfBtn} onPress={downloadPdf} disabled={exporting} activeOpacity={0.8}>
            {exporting
              ? <ActivityIndicator size="small" color="#E63946" />
              : (
                <>
                  <Icon name="file-pdf-box" size={18} color="#E63946" />
                  <Text style={s.pdfBtnText}>Download PDF</Text>
                </>
              )}
          </TouchableOpacity>
        )}

        {!data && !loading && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={s.emptyTitle}>MIS Report</Text>
            <Text style={s.emptySubtitle}>Tap "Load Report" to fetch the MIS data for the selected date.</Text>
          </View>
        )}

        {!loading && data && (
          <>
            {/* ── EXECUTIVE SUMMARY ── */}
            <SectionHeader title="EXECUTIVE SUMMARY" />
            <View style={s.card}>
              <KVRow label="Today Sales (net)" value={fmtRs(ex.sales_today_net)} />
              <Text style={s.kvSub}>Services {fmtRs(ex.services_today_net)} · Café {fmtRs(ex.cafe_today_net)}</Text>
              <KVRow label="Month Sales (net)" value={fmtRs(ex.sales_mtd_net)} />
              <KVRow label={`Active Clients (as of ${asOf})`} value={fmtNum(ex.active_clients)} />
              <Text style={s.kvSub}>Active gym {fmtNum(ex.active_gym_members)} · Package lines {fmtNum(ex.active_packages)}</Text>
              <KVRow label="Footfall" value={fmtNum(ff.total_checkins)} />
              <Text style={s.kvSub}>M {fmtNum(ff.total_males)} · F {fmtNum(ff.total_females)} · Absent paid {fmtNum(ff.absent_paid_gym)}</Text>
              <KVRow label="Staff Present" value={`${fmtNum(hr.present)} of ${fmtNum(hr.total_staff)}`} />
              <Text style={s.kvSub}>PT {fmtNum(hr.pt_staff_present)}</Text>
              <KVRow label="Today Profit" value={fmtRs(ex.profit_today)} />
              <Text style={s.kvSub}>Expenses {fmtRs(ex.expenses_today)} · MTD exp {fmtRs(ex.expenses_mtd)}</Text>
            </View>

            {/* ── ALL DEPARTMENTS — OVERVIEW ── */}
            <SectionHeader title="ALL DEPARTMENTS — OVERVIEW" />
            <View style={s.card}>
              {overview.map(r => (
                <View key={r.name} style={s.deptRow}>
                  <View style={s.deptTop}>
                    <Text style={s.deptName}>{r.name}</Text>
                    <Text style={s.kvValue}>{r.qty} · {r.net}</Text>
                  </View>
                  <Text style={s.deptNote}>{r.note}</Text>
                </View>
              ))}
            </View>

            {/* ── BRANCH COMPARISON (all branches only) ── */}
            {data.meta?.is_all_branches && byBranch.length > 0 && (
              <>
                <SectionHeader title="BRANCH COMPARISON" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={s.tableHeader}>
                      {['Branch', 'Today Sales', 'Footfall', 'Staff Present', 'Physio', 'Nutrition'].map((h, i) => (
                        <Text key={h} style={[s.tableCell, s.tableHeaderCell, i === 0 && s.tableCellLabel]}>{h}</Text>
                      ))}
                    </View>
                    {byBranch.map(b => (
                      <View key={b.branch_id} style={s.tableRow}>
                        <Text style={[s.tableCell, s.tableCellLabel]}>{b.branch_label}</Text>
                        <Text style={[s.tableCell, s.tableCellNum]}>{fmtRs(b.total_sales_today)}</Text>
                        <Text style={[s.tableCell, s.tableCellNum]}>{fmtNum(b.totalCheckins)}</Text>
                        <Text style={[s.tableCell, s.tableCellNum]}>{fmtNum(b.presentStaff)}</Text>
                        <Text style={[s.tableCell, s.tableCellNum]}>{fmtRs(b.physio_sales)}</Text>
                        <Text style={[s.tableCell, s.tableCellNum]}>{fmtRs(b.nutrition_sales)}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* ── FINANCE ── */}
            <SectionHeader title="FINANCE" />
            <View style={s.card}>
              <KVRow label="MTD Sales (net)" value={fmtRs(ex.sales_mtd_net)} />
              <KVRow label="MTD Expenses" value={fmtRs(ex.expenses_mtd)} />
              <KVRow label="Today Profit" value={fmtRs(ex.profit_today)} />
              <KVRow label="Pending Expense Approvals" value={fmtNum(ex.pending_expense_approvals)} redValue />
            </View>

            {/* ── FISCAL YEAR PERFORMANCE ── */}
            {!!fy.monthly?.length && (
              <>
                <SectionHeader title="FISCAL YEAR PERFORMANCE" />
                <View style={s.card}>
                  <Text style={s.kvSub}>{fy.label} · {fy.period_label}</Text>
                  <KVRow label="Sales (net)" value={fmtRs(fy.totals?.sales_net)} />
                  <KVRow label="Expenses" value={fmtRs(fy.totals?.expenses)} />
                  <KVRow label="Profit" value={fmtRs(fy.totals?.profit)} redValue={Number(fy.totals?.profit) < 0} />
                </View>
                <SectionHeader title="MONTH-WISE SALES & EXPENSES" />
                <View style={[s.card, s.chartCard]}>
                  <MonthBars data={fy.monthly.map((m: any) => ({ label: m.label, sales: Number(m.sales_net) || 0, expenses: Number(m.expenses) || 0 }))} />
                  <ChartLegend items={[{ label: 'Sales net', color: SALES }, { label: 'Expenses', color: EXPENSE }]} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  <View>
                    <View style={s.tableHeader}>
                      {['Month', 'Qty', 'Sales Net', 'Expenses', 'Profit'].map((h, i) => (
                        <Text key={h} style={[s.tableCell, s.tableHeaderCell, i === 0 && s.tableCellLabel]}>{h}</Text>
                      ))}
                    </View>
                    {[...fy.monthly, { key: 'total', label: 'Total', ...fy.totals }].map((m: any) => (
                      <View key={m.key} style={[s.tableRow, m.key === 'total' && s.tableRowHL]}>
                        <Text style={[s.tableCell, s.tableCellLabel]}>{m.label}</Text>
                        <Text style={[s.tableCell, s.tableCellNum]}>{fmtNum(m.sales_qty)}</Text>
                        <Text style={[s.tableCell, s.tableCellNum]}>{fmtRs(m.sales_net)}</Text>
                        <Text style={[s.tableCell, s.tableCellNum]}>{fmtRs(m.expenses)}</Text>
                        <Text style={[s.tableCell, s.tableCellNum, Number(m.profit) < 0 && { color: '#E63946' }]}>{fmtRs(m.profit)}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
                <SectionHeader title="TOP GYM & SERVICES (FISCAL PERIOD)" />
                <View style={s.card}>
                  {(fy.top_service_packages ?? fy.top_packages ?? []).map((p: any, i: number) => (
                    <KVRow key={`svc-${i}`} label={p.package_name} value={fmtNum(p.qty)} />
                  ))}
                </View>
                <SectionHeader title="TOP CAFÉ PRODUCTS (FISCAL PERIOD)" />
                <View style={s.card}>
                  {(fy.top_cafe_products ?? []).map((p: any, i: number) => (
                    <KVRow key={`cafe-${i}`} label={p.package_name} value={fmtNum(p.qty)} />
                  ))}
                </View>
              </>
            )}

            {/* ── SALES SUMMARY ── */}
            <SectionHeader title="SALES SUMMARY" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <TableHeader />
                <TableRow
                  label={`Sales till date\n(month start → report date)`}
                  qty={sales.mtd?.qty} price={sales.mtd?.price} discount={sales.mtd?.discount}
                  gst={sales.mtd?.tax} net={sales.mtd?.net}
                />
                <TableRow
                  label="Today's Total Sale"
                  qty={sales.today?.qty} price={sales.today?.price} discount={sales.today?.discount}
                  gst={sales.today?.tax} net={sales.today?.net}
                  highlight
                />
              </View>
            </ScrollView>

            {/* ── DAILY SALES BREAKUP ── */}
            <SectionHeader title="DAILY SALES BREAKUP" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <TableHeader />
                {BREAKUP_CATEGORIES.map(({ label, key }) => (
                  <TableRow
                    key={key}
                    label={label}
                    qty={bu[key]?.qty} price={bu[key]?.price} discount={bu[key]?.discount}
                    gst={bu[key]?.tax} net={bu[key]?.net}
                  />
                ))}
                <TableRow
                  label="Total"
                  qty={sales.today?.qty} price={sales.today?.price} discount={sales.today?.discount}
                  gst={sales.today?.tax} net={sales.today?.net}
                  highlight
                />
              </View>
            </ScrollView>

            {/* ── CHARTS ── */}
            <SectionHeader title="SALES VS EXPENSES (7 DAYS)" />
            <View style={[s.card, s.chartCard]}>
              <TrendLines data={trend.map(t => ({ label: t.label, sales: Number(t.sales) || 0, expenses: Number(t.expenses) || 0 }))} />
              <ChartLegend items={[{ label: 'Sales', color: SALES }, { label: 'Expenses', color: EXPENSE }]} />
            </View>

            <SectionHeader title="FOOTFALL BY TIME" />
            <View style={[s.card, s.chartCard, { alignItems: 'center' }]}>
              <FootfallDonut
                total={Number(ff.total_checkins) || 0}
                parts={[
                  { value: Number(ff.morning) || 0, color: SALES },
                  { value: Number(ff.afternoon) || 0, color: '#0F766E' },
                  { value: Number(ff.evening) || 0, color: EXPENSE },
                ]}
              />
              <ChartLegend items={[
                { label: `Morning ${fmtNum(ff.morning ?? 0)}`, color: SALES },
                { label: `Afternoon ${fmtNum(ff.afternoon ?? 0)}`, color: '#0F766E' },
                { label: `Evening ${fmtNum(ff.evening ?? 0)}`, color: EXPENSE },
              ]} />
              <Text style={s.chartNote}>Busiest: {ff.busiest_slot || '—'} · Slowest: {ff.slowest_slot || '—'}</Text>
            </View>

            <SectionHeader title="TODAY SALES BREAKUP (NET)" />
            <View style={[s.card, s.chartCard]}>
              <BreakupBars data={BREAKUP_CATEGORIES
                .map(c => ({ label: CHART_LABELS[c.key] ?? c.label, value: Number(bu[c.key]?.net) || 0 }))
                .filter(d => d.value > 0)} />
            </View>

            {/* ── PHYSIO & NUTRITION (DETAIL) ── */}
            <SectionHeader title="PHYSIOTHERAPY" />
            <View style={s.card}>
              <KVRow label="Appointments Today / MTD" value={`${fmtNum(physio.appointments_today ?? 0)} / ${fmtNum(physio.appointments_mtd ?? 0)}`} />
              <KVRow label="Consultations Conducted Today / MTD" value={`${fmtNum(physio.consultations_conducted_today ?? 0)} / ${fmtNum(physio.consultations_conducted_mtd ?? 0)}`} />
              <KVRow label="Prescriptions MTD · Referrals MTD" value={`${fmtNum(physio.prescriptions_mtd ?? 0)} · ${fmtNum(physio.referrals_mtd ?? 0)}`} />
            </View>
            <SectionHeader title="NUTRITION" />
            <View style={s.card}>
              <KVRow label="Appointments Today / MTD" value={`${fmtNum(nutri.appointments_today ?? 0)} / ${fmtNum(nutri.appointments_mtd ?? 0)}`} />
              <KVRow label="Consultations Logged Today / MTD" value={`${fmtNum(nutri.consultations_today ?? 0)} / ${fmtNum(nutri.consultations_mtd ?? 0)}`} />
              <KVRow label="Meal Plans Issued Today / MTD · Conversions MTD" value={`${fmtNum(nutri.meal_plans_issued_today ?? 0)} / ${fmtNum(nutri.meal_plans_issued_mtd ?? 0)} · ${fmtNum(nutri.conversions_mtd ?? 0)}`} />
              <KVRow label="Health Camps MTD · Total Meal Plans" value={`${fmtNum(nutri.health_camps_mtd ?? 0)} · ${fmtNum(nutri.meal_plans_total ?? 0)}`} />
            </View>

            {/* ── FOOTFALL, CAFÉ & DEPARTMENTS ── */}
            <SectionHeader title="FOOTFALL" />
            <View style={s.card}>
              <KVRow label="Morning / Afternoon / Evening" value={`${fmtNum(ff.morning)} / ${fmtNum(ff.afternoon)} / ${fmtNum(ff.evening)}`} />
              <KVRow label="Check-ins · M / F" value={`${fmtNum(ff.total_checkins)} · ${fmtNum(ff.total_males)}/${fmtNum(ff.total_females)}`} />
              <KVRow label={`Active Gym · Absent Paid (${asOf})`} value={`${fmtNum(ff.active_gym_members ?? 0)} · ${fmtNum(ff.absent_paid_gym ?? 0)}`} />
              <KVRow label="GX / Vitality (active · present · absent)" value={`${fmtNum(ff.gx_active_members ?? 0)} · ${fmtNum(ff.gx_present ?? 0)} · ${fmtNum(ff.gx_absent ?? 0)}`} />
              <KVRow label="Academy Active · Studio Check-ins · Walk-ins" value={`${fmtNum(ff.academy_active_members ?? 0)} · ${fmtNum(ff.studio_total ?? 0)} · ${fmtNum(ff.visitors_walkins ?? 0)}`} />
              <KVRow label="Busiest / Slowest" value={`${ff.busiest_slot || '—'} / ${ff.slowest_slot || '—'}`} />
            </View>
            <SectionHeader title="CAFÉ" />
            <View style={s.card}>
              <KVRow label="Net Sales" value={fmtRs(cafe.net_today)} />
              <KVRow label="Meals / Drinks / Sides" value={`${fmtNum(cafe.meals)} / ${fmtNum(cafe.drinks)} / ${fmtNum(cafe.sides)}`} />
              <KVRow label="Staff Orders" value={fmtNum(cafe.staff_orders ?? 0)} />
            </View>
            <SectionHeader title="DEPARTMENTS" />
            <View style={s.card}>
              <KVRow label="Physio (today / MTD)" value={`${fmtRs(dep.physio?.sales_net ?? 0)} / ${fmtRs(dep.physio?.mtd_net ?? 0)}`} />
              <KVRow label="Nutrition (today / MTD)" value={`${fmtRs(dep.nutrition?.sales_net ?? 0)} / ${fmtRs(dep.nutrition?.mtd_net ?? 0)}`} />
              <KVRow label="Appts Physio / Nutrition" value={`${fmtNum(dep.physio?.appointments_today ?? 0)} / ${fmtNum(dep.nutrition?.appointments_today ?? 0)}`} />
              <KVRow label="Social Leads / Paid" value={`${fmtNum(leads.leads_today ?? 0)} / ${fmtNum(leads.payments ?? 0)}`} />
            </View>

            {/* ── HR, PT & TRAINERS ── */}
            <SectionHeader title="HR" />
            <View style={s.card}>
              <KVRow label="Present / Total" value={`${fmtNum(hr.present)} / ${fmtNum(hr.total_staff)}`} />
              <KVRow label="Absent / Late / Leave" value={`${fmtNum(hr.absent)} / ${fmtNum(hr.late)} / ${fmtNum(hr.leave_count)}`} />
            </View>
            <SectionHeader title="PERSONAL TRAINING" />
            <View style={s.card}>
              <KVRow label="PT Staff Present" value={fmtNum(hr.pt_staff_present)} />
              <KVRow label="PT New / Renew (qty)" value={`${fmtNum(bu.pt_new?.qty ?? 0)} / ${fmtNum(bu.pt_renew?.qty ?? 0)}`} />
              <KVRow label="Physio / Nutrition qty" value={`${fmtNum(bu.physio?.qty ?? 0)} / ${fmtNum(bu.nutrition?.qty ?? 0)}`} />
            </View>
            <SectionHeader title="TOP PT — TODAY" />
            <View style={s.card}>
              {topToday.length
                ? topToday.map(t => <KVRow key={t.trainer_id} label={t.trainer_name} value={fmtRs(t.net)} />)
                : <Text style={s.noneText}>None</Text>}
            </View>
            <SectionHeader title="TOP PT — MONTH" />
            <View style={s.card}>
              {topMtd.length
                ? topMtd.slice(0, 5).map(t => <KVRow key={t.trainer_id} label={t.trainer_name} value={fmtRs(t.net)} />)
                : <Text style={s.noneText}>None</Text>}
            </View>

            {/* ── LONGEST-RUNNING ACTIVE PACKAGES ── */}
            <SectionHeader title="LONGEST-RUNNING ACTIVE PACKAGES" />
            <View style={s.card}>
              {oldest.length
                ? oldest.map((p, i) => (
                  <KVRow key={p.order_detail_id ?? i} label={`${p.client_name ?? '—'}\n${p.package_name ?? ''}`} value={p.start_date ?? '—'} />
                ))
                : <Text style={s.noneText}>None</Text>}
            </View>

            {/* ── STAFF ATTENDANCE ── */}
            <SectionHeader title="STAFF ATTENDANCE — LATE, ABSENT & LEAVE" />
            <View style={s.card}>
              <Text style={s.subHead}>Late ({lateStaff.length})</Text>
              {lateStaff.length
                ? lateStaff.map((x, i) => <KVRow key={`l${i}`} label={x.name} value={x.late_by ?? x.status ?? '—'} />)
                : <Text style={s.noneText}>None</Text>}
              <Text style={s.subHead}>Absent ({absentStaff.length})</Text>
              {absentStaff.length
                ? absentStaff.map((x, i) => <KVRow key={`a${i}`} label={x.name} value={x.department ?? '—'} />)
                : <Text style={s.noneText}>None</Text>}
              <Text style={s.subHead}>On Leave ({leaveStaff.length})</Text>
              {leaveStaff.length
                ? leaveStaff.map((x, i) => <KVRow key={`v${i}`} label={x.name} value={x.leave_type ?? x.type ?? x.status ?? '—'} />)
                : <Text style={s.noneText}>None</Text>}
              <Text style={s.subHead}>Most Late This Month</Text>
              {lateMonth.length
                ? lateMonth.map((x, i) => (
                  <KVRow key={`m${i}`} label={`${x.name ?? '—'}${x.department ? ` · ${x.department}` : ''}`} value={fmtNum(x.late_days ?? x.count ?? 0)} />
                ))
                : <Text style={s.noneText}>No late marks this month</Text>}
            </View>
          </>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="date"
        date={date}
        maximumDate={new Date()}
        onConfirm={d => { setPickerVisible(false); setDate(d); }}
        onCancel={() => setPickerVisible(false)}
      />

      {/* Branch selection modal */}
      <Modal visible={branchModalVisible} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setBranchModalVisible(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select Branch</Text>
            {branchOptions.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[s.modalOption, selectedBranch.id === opt.id && s.modalOptionSelected]}
                onPress={() => { setSelectedBranch(opt); setBranchModalVisible(false); }}
              >
                <Icon
                  name={selectedBranch.id === opt.id ? 'check-circle' : 'circle-outline'}
                  size={20}
                  color={selectedBranch.id === opt.id ? '#E63946' : '#ccc'}
                  style={{ marginRight: 10 }}
                />
                <Text style={[s.modalOptionText, selectedBranch.id === opt.id && { color: '#E63946', fontWeight: '700' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F5F7FA' },
  reportHeader:    { backgroundColor: '#C0392B', padding: 16, margin: 12, borderRadius: 10 },
  reportTitle:     { color: '#FFF', fontWeight: '800', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  reportDate:      { color: '#FFCDD2', fontSize: 12, textAlign: 'center', marginTop: 4 },
  loadBtn:         { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, marginHorizontal: 12, alignItems: 'center', marginBottom: 8 },
  loadBtnText:     { color: '#FFF', fontWeight: '700', fontSize: 15 },
  pdfBtn:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E63946', backgroundColor: '#FFF', borderRadius: 8, paddingVertical: 11, marginHorizontal: 12, marginBottom: 8 },
  pdfBtnText:      { color: '#E63946', fontWeight: '700', fontSize: 15 },
  branchField:     { marginHorizontal: 12, marginBottom: 10 },
  branchLabel:     { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6 },
  branchSelect:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E63946', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF' },
  branchSelectText: { fontSize: 14, color: '#1A1A1A' },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28 },
  modalTitle:      { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  modalOption:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalOptionSelected: { backgroundColor: '#FFF5F5', borderRadius: 8 },
  modalOptionText: { fontSize: 14, color: '#333' },
  emptyState:      { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:       { fontSize: 48, marginBottom: 12 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:   { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  sectionHeader:   { backgroundColor: '#E63946', marginHorizontal: 12, marginTop: 14, marginBottom: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  sectionTitle:    { color: '#FFF', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:            { backgroundColor: '#FFF', marginHorizontal: 12, marginBottom: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingVertical: 4, elevation: 1 },
  tableHeader:     { flexDirection: 'row', backgroundColor: '#2C3E50', paddingVertical: 8, paddingHorizontal: 4 },
  tableHeaderCell: { color: '#FFF', fontWeight: '700', fontSize: 11 },
  tableRow:        { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tableRowHL:      { backgroundColor: '#FFF8E1' },
  tableCell:       { fontSize: 11, color: '#1A1A1A', paddingHorizontal: 4, width: 90, alignSelf: 'center' },
  tableCellLabel:  { width: 140 },
  tableCellNum:    { textAlign: 'right' },
  netCell:         { color: '#10b981', fontWeight: '700' },
  kvRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  kvLabel:         { fontSize: 13, color: '#555', flex: 1 },
  kvValue:         { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  kvSub:           { fontSize: 11, color: '#888', paddingHorizontal: 14, paddingTop: 2, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  deptRow:         { paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  deptTop:         { flexDirection: 'row', justifyContent: 'space-between' },
  deptName:        { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  deptNote:        { fontSize: 11, color: '#888', marginTop: 3 },
  subHead:         { fontSize: 12, fontWeight: '800', color: '#1A1A1A', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 },
  chartCard:       { paddingHorizontal: 14, paddingVertical: 12 },
  chartNote:       { fontSize: 11, color: '#64748b', marginTop: 6, textAlign: 'center' },
  legend:          { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8 },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:       { width: 8, height: 8, borderRadius: 4 },
  legendText:      { fontSize: 11, color: '#64748b' },
  noneText:        { fontSize: 12, color: '#999', paddingHorizontal: 14, paddingVertical: 8 },
});

export default MISReportScreen;
