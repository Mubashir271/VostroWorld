// Fitness Dashboard — the app's mirror of the web's Fitness Dashboard (under
// the super admin's Dashboard group).
//
// Structure and data follow the web page section for section (Today at a
// glance → Sessions & floor → Trainer-wise PT sales → Present trainers /
// Recent sessions → Quick access); the styling is the app's own card idiom,
// shared with the Admin Dashboard, not the web's.
//
// Data: /v1/fitness-manager-dashboard/summary backs the whole page — the one
// call the web page makes (HAR, 18 Sep 2026). Branch and date only change its
// `bId` / `date` params.
//
// Super Admin gets "All Branches" and a branch picker. The Fitness Manager
// (whose Home tab this is) is pinned to their own branch, as on the web —
// the 2026-10-15 HAR shows that login calling bId=<own branch> only.
import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Modal,
} from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import BurgerSVG from '../../../assets/svg/BurgerSVG';
import { RootState } from '../../../redux/store';
import AccessDenied from '../../AccessDenied';
import { isSuperAdmin, isFitnessManager, FITNESS_MANAGER_ALLOWED_SCREENS } from '../../../config/permissions';
import { useCurrencyFormatter } from '../../../hooks/useCurrencyFormatter';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import { getFitnessDashboardSummary, FitnessDashboardSummary } from '../../../api/dashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const PT = '#2563EB';
const GX = '#7C3AED';
const DELIVERED = '#0F766E';

const iso = (d: Date) => {
    // Local calendar date — toISOString() would shift back a day west of UTC.
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
};

// "Wednesday, 14 Oct 2026" from the response's YYYY-MM-DD, read as a local
// calendar date like iso() above.
const longDate = (ymd: string) => {
    const [yy, mm, dd] = ymd.split('-').map(Number);
    const d = new Date(yy, mm - 1, dd);
    return `${d.toLocaleDateString('en-GB', { weekday: 'long' })}, ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

// The web's Quick access grid, mapped to this app's screens. The web's
// "Announcements" button is left out: the app has no Announcements screen.
const QUICK_LINKS = [
    { label: 'PT Bookings', icon: 'calendar-check', screen: 'NewPTBookings' },
    { label: 'New PT Clients', icon: 'account-plus', screen: 'NewPTClients' },
    { label: 'PT Appointments', icon: 'clock-outline', screen: 'TrainerAppointments' },
    { label: 'PT Sales', icon: 'cash-register', screen: 'PTSalesReport' },
    { label: 'GX Bookings', icon: 'playlist-music', screen: 'GXBookings' },
    { label: 'GX Attendance', icon: 'clipboard-check-outline', screen: 'GXAttendance' },
    { label: 'Befit', icon: 'heart-pulse', screen: 'BefitList' },
    { label: 'SPT', icon: 'account-multiple', screen: 'SPTList' },
    { label: 'Fitness Plans', icon: 'file-document-outline', screen: 'ViewFitnessPlans' },
    { label: 'Session Portal', icon: 'view-grid-outline', screen: 'SessionPortalHR' },
    { label: 'Time Slots', icon: 'timetable', screen: 'TimeSlots' },
];

// ── Small presentational pieces ──────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.sectionTitle}>{children}</Text>
);

const Card = ({ title, right, children }: { title?: string; right?: React.ReactNode; children: React.ReactNode }) => (
    <View style={styles.card}>
        {(title || right) && (
            <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{title}</Text>
                {right}
            </View>
        )}
        {children}
    </View>
);

const Pill = ({ text }: { text: string }) => (
    <View style={styles.pill}><Text style={styles.pillText}>{text}</Text></View>
);

const GlanceCard = ({ label, value, sub, iconName, accent }: {
    label: string; value: string; sub?: string; iconName: string; accent: string;
}) => (
    <View style={[styles.glanceCard, { borderLeftColor: accent }]}>
        <View style={styles.glanceTop}>
            <Text style={styles.glanceLabel} numberOfLines={1}>{label}</Text>
            <View style={[styles.glanceIcon, { backgroundColor: `${accent}1A` }]}>
                <Icon name={iconName} size={scale(15)} color={accent} />
            </View>
        </View>
        <Text style={styles.glanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {value}
        </Text>
        {!!sub && <Text style={styles.glanceSub} numberOfLines={2}>{sub}</Text>}
    </View>
);

const Row = ({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) => (
    <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
);

const Legend = ({ items }: { items: { label: string; color: string }[] }) => (
    <View style={styles.legend}>
        {items.map(i => (
            <View key={i.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: i.color }]} />
                <Text style={styles.legendText}>{i.label}</Text>
            </View>
        ))}
    </View>
);

/** PT vs GX sessions over the trend window (7 days on the web). */
const SessionsChart = ({ data, width, height }: {
    data: { label: string; pt: number; gx: number }[]; width: number; height: number;
}) => {
    if (!data.length) { return null; }
    const padL = scale(24), padR = scale(14), padB = scale(16), padT = scale(8);
    // Round the top up to a multiple of 4 so the four gridlines land on whole
    // numbers, as on the web's y-axis.
    const max = Math.ceil(Math.max(...data.flatMap(d => [d.pt, d.gx]), 4) / 4) * 4;
    const ticks = [0, 1, 2, 3, 4].map(n => (max / 4) * n);
    const x = (i: number) => padL + (i * (width - padL - padR)) / Math.max(data.length - 1, 1);
    const y = (v: number) => padT + (1 - v / max) * (height - padT - padB);
    const line = (key: 'pt' | 'gx') => data.map((d, i) => `${x(i)},${y(d[key])}`).join(' ');
    return (
        <Svg width={width} height={height}>
            {ticks.map(t => (
                <React.Fragment key={t}>
                    <Line x1={padL} y1={y(t)} x2={width - padR} y2={y(t)} stroke={t ? '#F1F5F9' : '#E2E8F0'} strokeWidth={1} />
                    <SvgText x={padL - scale(5)} y={y(t) + scale(3)} fontSize={scale(8)} fill="#94A3B8" textAnchor="end">
                        {t}
                    </SvgText>
                </React.Fragment>
            ))}
            <Polyline points={line('gx')} fill="none" stroke={GX} strokeWidth={2} />
            <Polyline points={line('pt')} fill="none" stroke={PT} strokeWidth={2} />
            {data.map((d, i) => (
                <SvgText key={d.label} x={x(i)} y={height - scale(3)} fontSize={scale(8)} fill="#94A3B8" textAnchor="middle">
                    {d.label}
                </SvgText>
            ))}
        </Svg>
    );
};

type Col<T> = { title: string; width: number; render: (r: T, i: number) => string | number; strong?: boolean };

// Each panel shows this many rows and scrolls vertically for the rest. Rows
// are a fixed height (cells are single-line) so the window is exactly N rows.
const VISIBLE_ROWS = 5;
const ROW_H = scale(32);

/**
 * Horizontally scrolling table; the body scrolls after VISIBLE_ROWS rows.
 * `footer` is an optional totals row, one cell per column, kept outside the
 * scrolling body so it stays visible.
 */
function Table<T>({ cols, rows, empty, footer }: {
    cols: Col<T>[]; rows: T[]; empty: string; footer?: (string | number)[];
}) {
    if (!rows.length) { return <Text style={styles.empty}>{empty}</Text>; }
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
                <View style={styles.tableHead}>
                    {cols.map(c => <Text key={c.title} style={[styles.th, { width: c.width }]}>{c.title}</Text>)}
                </View>
                <ScrollView
                    style={{ maxHeight: ROW_H * VISIBLE_ROWS }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={rows.length > VISIBLE_ROWS}
                >
                    {rows.map((r, i) => (
                        <View key={i} style={[styles.tr, { height: ROW_H }]}>
                            {cols.map(c => (
                                <Text
                                    key={c.title}
                                    numberOfLines={1}
                                    style={[styles.td, { width: c.width }, c.strong && styles.tdStrong]}
                                >
                                    {c.render(r, i)}
                                </Text>
                            ))}
                        </View>
                    ))}
                </ScrollView>
                {footer && (
                    <View style={[styles.tr, styles.tfoot, { height: ROW_H }]}>
                        {cols.map((c, i) => (
                            <Text key={c.title} numberOfLines={1} style={[styles.td, styles.tdStrong, { width: c.width }]}>
                                {footer[i] ?? ''}
                            </Text>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

// ── Screen ───────────────────────────────────────────────────────────────────

// `asHome` is set when this is the Fitness Manager's Home tab, where the left
// action opens the drawer (same reason as the GT Dashboard's).
const FitnessDashboardScreen = ({ asHome = false }: { asHome?: boolean }) => {
    const navigation = useNavigation() as any;
    const { profile } = useSelector((state: RootState) => state.user);
    const formatCurrency = useCurrencyFormatter();

    // The Fitness Manager gets this dashboard too (web /fitness-dashboard),
    // pinned to their own branch — the web preselects it (e.g. G-13).
    const allowed = isSuperAdmin(profile?.role) || isFitnessManager(profile?.role);
    const { options, loadingOptions, needsPicker, branchId: ownBranchId, branchName: ownBranchName } = useBranchSelector();

    const [branchId, setBranchId] = useState<number | 'all'>(needsPicker ? 'all' : (ownBranchId as number));
    const [branchLabel, setBranchLabel] = useState(needsPicker ? 'All Branches' : ownBranchName);
    const [branchOpen, setBranchOpen] = useState(false);

    const [date, setDate] = useState(new Date());
    const [dateOpen, setDateOpen] = useState(false);

    const [data, setData] = useState<FitnessDashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        if (!allowed) { setLoading(false); return; }
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            setData(await getFitnessDashboardSummary(branchId, iso(date)));
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load the dashboard.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, [allowed, branchId, date]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    const onDateChange = (_e: DateTimePickerEvent, picked?: Date) => {
        setDateOpen(false);
        if (picked) { setDate(picked); }
    };

    const chartWidth = SCREEN_WIDTH - scale(40) - scale(28);

    // After every hook above, so hook order stays constant across renders.
    if (!allowed) { return <AccessDenied />; }

    const s = data?.sales;
    const sumSales = (key: 'net_price' | 'sales' | 'clients') =>
        data?.trainer_wise_sales.reduce((sum, t) => sum + (Number(t[key]) || 0), 0) ?? 0;
    const netSalesTotal = sumSales('net_price');
    const salesQty = sumSales('sales');
    const salesClients = sumSales('clients');
    const gt = data?.gt_referrals;
    const roleLabel = isFitnessManager(profile?.role) ? 'FITNESS MANAGER' : 'ALL BRANCHES';
    const quickLinks = QUICK_LINKS.filter(l =>
        !isFitnessManager(profile?.role) || FITNESS_MANAGER_ALLOWED_SCREENS.includes(l.screen));

    return (
        <>
            <AppHeader
                title="Fitness Dashboard"
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
                <View style={styles.centre}>
                    <ActivityIndicator size="large" color="#E10600" />
                </View>
            ) : (
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E10600" />
                    }
                >
                    {/* ── Controls ─────────────────────────────────────────── */}
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={styles.control}
                            onPress={() => setBranchOpen(true)}
                            disabled={!needsPicker}
                            activeOpacity={0.7}
                        >
                            <Icon name="office-building" size={scale(15)} color="#64748B" />
                            <Text style={styles.controlText} numberOfLines={1}>{branchLabel}</Text>
                            {needsPicker && <Icon name="chevron-down" size={scale(16)} color="#64748B" />}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.control} onPress={() => setDateOpen(true)} activeOpacity={0.7}>
                            <Icon name="calendar" size={scale(15)} color="#64748B" />
                            <Text style={styles.controlText}>{data?.display_date || iso(date)}</Text>
                        </TouchableOpacity>
                    </View>

                    {dateOpen && (
                        <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
                    )}

                    {!!error && (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {data && s && (
                        <>
                            <View style={styles.heading}>
                                <Text style={styles.eyebrow}>{roleLabel}</Text>
                                <Text style={styles.headingDate}>{longDate(data.date)} · {data.branch_label}</Text>
                            </View>

                            {/* ── Today at a glance ─────────────────────────── */}
                            <SectionTitle>Today at a glance</SectionTitle>
                            <View style={styles.glanceGrid}>
                                <GlanceCard
                                    label="Floor Footfall" accent={DELIVERED} iconName="account-group"
                                    value={`${data.footfall.total}`}
                                    sub={`Male ${data.footfall.males} · Female ${data.footfall.females}`}
                                />
                                <GlanceCard
                                    label="PT Trainers Present" accent={PT} iconName="card-account-details"
                                    value={`${data.trainers.present}`}
                                    sub={`of ${data.trainers.total} · Absent ${data.trainers.absent} · Late ${data.trainers.late}`}
                                />
                                <GlanceCard
                                    label="PT Sessions" accent={GX} iconName="lightning-bolt"
                                    value={`${data.sessions.pt_total}`}
                                    sub={`Delivered ${data.sessions.pt_delivered}`}
                                />
                                <GlanceCard
                                    label="GX Sessions" accent="#F59E0B" iconName="music-note"
                                    value={`${data.sessions.gx_total}`}
                                    sub={`Delivered ${data.sessions.gx_delivered} · Befit ${data.sessions.befit_total} · SPT ${data.sessions.spt_total}`}
                                />
                                <GlanceCard
                                    label="PT Sales Today" accent="#E63946" iconName="cash-multiple"
                                    value={formatCurrency(s.pt_today.net)}
                                    sub={`Qty ${s.pt_today.qty} · New ${s.pt_new_today.qty} · Renew ${s.pt_renew_today.qty}`}
                                />
                                <GlanceCard
                                    label="Active PT Clients" accent={DELIVERED} iconName="account-check"
                                    value={`${data.active_pt_clients}`}
                                    sub={`GX sales today ${formatCurrency(s.gx_today.net)} · PT MTD ${formatCurrency(s.pt_mtd.net)}`}
                                />
                            </View>

                            {/* ── General Trainers · BeFit this month ───────── */}
                            {gt && (
                                <>
                                    <SectionTitle>General Trainers · BeFit this month</SectionTitle>
                                    <Card
                                        title="Referrals by General Trainer"
                                        right={<Pill text={`${gt.totals.total} referrals · ${gt.totals.converted} converted · ${gt.totals.pending} pending · ${gt.totals.not_converted} not converted`} />}
                                    >
                                        <Table
                                            empty="No BeFit referrals this month."
                                            rows={gt.rows}
                                            cols={[
                                                { title: 'GENERAL TRAINER', width: scale(140), render: r => r.name },
                                                { title: 'BEFIT GIVEN', width: scale(70), render: r => r.total },
                                                { title: 'CONVERTED TO PT', width: scale(100), render: r => r.converted },
                                                { title: 'PENDING', width: scale(60), render: r => r.pending },
                                                { title: 'NOT CONVERTED', width: scale(90), render: r => r.not_converted },
                                            ]}
                                        />
                                    </Card>
                                </>
                            )}

                            {/* ── Sessions & floor ──────────────────────────── */}
                            <SectionTitle>Sessions & floor</SectionTitle>
                            <Card
                                title={`PT vs GX sessions (${data.trend?.length || 0} days)`}
                                right={<Pill text="Real attendance" />}
                            >
                                <SessionsChart data={data.trend || []} width={chartWidth} height={scale(150)} />
                                <Legend items={[{ label: 'GX', color: GX }, { label: 'PT', color: PT }]} />
                            </Card>

                            <Card title="Sales snapshot">
                                <Row label="PT today (net)" value={formatCurrency(s.pt_today.net)} strong />
                                <Row label="PT new / renew qty" value={`${s.pt_new_today.qty} / ${s.pt_renew_today.qty}`} />
                                <Row label="PT month-to-date" value={formatCurrency(s.pt_mtd.net)} strong />
                                <Row label="GX today (net)" value={formatCurrency(s.gx_today.net)} strong />
                                <Row label="GX month-to-date" value={formatCurrency(s.gx_mtd.net)} strong />
                                <Row label="Active PT packages" value={data.active_pt_clients} />
                            </Card>

                            {/* ── Trainer-wise PT sales ─────────────────────── */}
                            <Card
                                title={`Trainer-wise PT sales (${data.month_label})`}
                                right={<Pill text={`${data.trainer_wise_sales.length} trainers · Net ${formatCurrency(netSalesTotal)}`} />}
                            >
                                <Table
                                    empty="No PT sales this month."
                                    rows={data.trainer_wise_sales}
                                    cols={[
                                        { title: '#', width: scale(24), render: (_r, i) => i + 1 },
                                        { title: 'TRAINER', width: scale(150), render: r => r.trainer },
                                        { title: 'SALES', width: scale(50), render: r => r.sales },
                                        { title: 'CLIENTS', width: scale(56), render: r => r.clients },
                                        { title: 'TOTAL PRICE', width: scale(90), render: r => formatCurrency(r.total_price) },
                                        { title: 'DISCOUNT', width: scale(72), render: r => formatCurrency(r.discount) },
                                        { title: 'TAX', width: scale(72), render: r => formatCurrency(r.tax) },
                                        { title: 'NET PRICE', width: scale(90), render: r => formatCurrency(r.net_price), strong: true },
                                    ]}
                                    footer={['', 'Total', salesQty, salesClients, '', '', '', formatCurrency(netSalesTotal)]}
                                />
                                <TouchableOpacity
                                    style={styles.outlineBtn}
                                    onPress={() => navigation.navigate('PTSalesReport')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.outlineBtnText}>Open PT Sales Report</Text>
                                </TouchableOpacity>
                            </Card>

                            {/* ── Present trainers / Recent sessions ────────── */}
                            <Card title="Present trainers" right={<Pill text={`${data.present_trainers.length} listed`} />}>
                                <Table
                                    empty="No trainers checked in."
                                    rows={data.present_trainers}
                                    cols={[
                                        // Branch only matters when several branches are mixed in.
                                        ...(data.is_all_branches
                                            ? [{ title: 'BRANCH', width: scale(52), render: (r: typeof data.present_trainers[number]) => r.branch }]
                                            : []),
                                        { title: 'NAME', width: scale(150), render: r => r.name },
                                        { title: 'DEPT', width: scale(70), render: r => r.department },
                                        { title: 'IN', width: scale(80), render: r => r.checkin },
                                    ]}
                                />
                            </Card>

                            <Card
                                title="Recent sessions today"
                                right={<Pill text={`Latest ${data.recent_sessions.length}`} />}
                            >
                                <Table
                                    empty="No sessions yet today."
                                    rows={data.recent_sessions}
                                    cols={[
                                        { title: 'TYPE', width: scale(40), render: r => r.type },
                                        { title: 'CLIENT', width: scale(120), render: r => r.client },
                                        { title: 'TRAINER', width: scale(110), render: r => r.trainer },
                                        { title: 'SLOT', width: scale(80), render: r => r.time_slot },
                                        { title: 'STATUS', width: scale(70), render: r => r.status, strong: true },
                                    ]}
                                />
                            </Card>

                            {/* ── Quick access ──────────────────────────────── */}
                            <SectionTitle>Quick access</SectionTitle>
                            <View style={[styles.card, styles.links]}>
                                {quickLinks.map(l => (
                                    <TouchableOpacity
                                        key={l.label}
                                        style={styles.linkBtn}
                                        onPress={() => navigation.navigate(l.screen)}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name={l.icon} size={scale(16)} color="#E63946" />
                                        <Text style={styles.linkText}>{l.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    <View style={styles.bottomGap} />
                </ScrollView>
            )}

            <Modal visible={branchOpen} transparent animationType="fade" onRequestClose={() => setBranchOpen(false)}>
                <TouchableOpacity style={styles.modalBack} activeOpacity={1} onPress={() => setBranchOpen(false)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Select Branch</Text>
                        {loadingOptions ? (
                            <ActivityIndicator color="#E10600" style={styles.modalLoader} />
                        ) : (
                            <ScrollView>
                                {[{ id: 'all' as const, name: 'All Branches' }, ...options].map(o => (
                                    <TouchableOpacity
                                        key={String(o.id)}
                                        style={styles.modalRow}
                                        onPress={() => {
                                            setBranchId(o.id as number | 'all');
                                            setBranchLabel(o.name);
                                            setBranchOpen(false);
                                        }}
                                    >
                                        <Text style={styles.modalRowText}>{o.name}</Text>
                                        {branchId === o.id && <Icon name="check" size={18} color="#E63946" />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const cardShadow = {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    content: { padding: scale(20) },
    centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    bottomGap: { height: scale(40) },

    controls: { flexDirection: 'row', gap: scale(10), marginBottom: scale(4) },
    control: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: scale(12),
        paddingVertical: scale(10),
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    controlText: { flex: 1, fontSize: scale(12), color: '#0F172A', fontWeight: '500' },

    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        padding: scale(12),
        marginTop: scale(12),
    },
    errorText: { flex: 1, fontSize: scale(12), color: '#B91C1C' },

    sectionTitle: {
        fontSize: scale(15),
        fontWeight: '700',
        color: '#0f172a',
        marginTop: scale(18),
        marginBottom: scale(10),
    },

    glanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
    glanceCard: {
        width: '47.8%',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderLeftWidth: 3,
        padding: scale(12),
        ...cardShadow,
    },
    glanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    glanceLabel: {
        flex: 1,
        fontSize: scale(10),
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    glanceIcon: {
        width: scale(26), height: scale(26), borderRadius: scale(13),
        justifyContent: 'center', alignItems: 'center',
    },
    glanceValue: { fontSize: scale(18), fontWeight: '700', color: '#0F172A', marginTop: scale(6) },
    glanceSub: { fontSize: scale(9.5), color: '#94A3B8', marginTop: scale(4), lineHeight: scale(13) },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: scale(14),
        marginTop: scale(10),
        ...cardShadow,
    },
    cardHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(8),
        marginBottom: scale(10),
    },
    cardTitle: { flexShrink: 1, fontSize: scale(13), fontWeight: '700', color: '#0F172A' },

    pill: {
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: scale(9),
        paddingVertical: scale(3),
    },
    pillText: { fontSize: scale(9.5), color: '#475569', fontWeight: '600' },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scale(6),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    rowLabel: { flex: 1, fontSize: scale(11.5), color: '#64748b' },
    rowValue: { fontSize: scale(11.5), color: '#334155', fontWeight: '600', marginLeft: scale(8) },
    rowValueStrong: { color: '#0F172A', fontWeight: '700' },

    legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: scale(10), marginTop: scale(8) },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
    legendDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
    legendText: { fontSize: scale(9.5), color: '#64748b' },

    empty: { fontSize: scale(11.5), color: '#94A3B8', textAlign: 'center', paddingVertical: scale(20) },

    tableHead: {
        flexDirection: 'row',
        paddingBottom: scale(6),
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    th: { fontSize: scale(9), color: '#94A3B8', fontWeight: '700', letterSpacing: 0.4, paddingRight: scale(6) },
    tr: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    td: { fontSize: scale(11), color: '#334155', paddingRight: scale(6) },
    tdStrong: { color: '#0F172A', fontWeight: '700' },
    tfoot: { borderTopWidth: 1, borderTopColor: '#E2E8F0', borderBottomWidth: 0 },

    heading: { marginBottom: scale(12) },
    eyebrow: { fontSize: scale(10), fontWeight: '700', color: '#E63946', letterSpacing: 1 },
    headingDate: { fontSize: scale(12), color: '#64748b', marginTop: scale(3) },

    outlineBtn: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#E63946',
        borderRadius: 8,
        paddingHorizontal: scale(10),
        paddingVertical: scale(6),
        marginTop: scale(12),
    },
    outlineBtnText: { fontSize: scale(11.5), color: '#E63946', fontWeight: '600' },

    links: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginTop: 0 },
    linkBtn: {
        width: '47%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        backgroundColor: '#FFF5F5',
        borderRadius: 10,
        paddingVertical: scale(11),
    },
    linkText: { fontSize: scale(11.5), color: '#334155', fontWeight: '600' },

    modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: scale(30) },
    modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: scale(16), maxHeight: '60%' },
    modalTitle: { fontSize: scale(14), fontWeight: '700', color: '#0F172A', marginBottom: scale(10) },
    modalLoader: { marginVertical: scale(16) },
    modalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scale(11),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    modalRowText: { fontSize: scale(12.5), color: '#334155' },
});

export default FitnessDashboardScreen;
