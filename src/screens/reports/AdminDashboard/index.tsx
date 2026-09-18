// Admin Dashboard — the app's mirror of the web admin's Admin Dashboard.
//
// Structure and data follow the web page section for section (Today at a
// glance → branch split → Sales performance → Operations → Snapshots); the
// styling is the app's own card idiom, not the web's.
//
// Data: /v1/admin-dashboard/summary backs everything except "Sales by
// service", which comes from the `breakup` block of /v1/MISReport/get — the
// same two calls the web page makes (HAR, 18 Sep 2026).
//
// Super Admin only (role '1'). The F-11 / G-13 branch admins are role '3' and
// `isAdmin` would let them in, so this screen checks `isSuperAdmin` — which is
// also what makes the "All Branches" default and the branch picker safe here:
// super admin is the one login with no branch of its own (branch_id 0).
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
import Svg, { Circle, G, Rect, Polyline, Line, Text as SvgText } from 'react-native-svg';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import AccessDenied from '../../AccessDenied';
import { isSuperAdmin } from '../../../config/permissions';
import { useCurrencyFormatter } from '../../../hooks/useCurrencyFormatter';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
    getAdminDashboardSummary,
    getMISDashboard,
    AdminDashboardSummary,
} from '../../../api/dashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

// Chart palette. Red is the app accent; the other two only ever appear beside
// it in a legend, so they are picked for contrast against it and each other.
const SALES = '#E63946';
const PROFIT = '#0F766E';
const EXPENSE = '#F59E0B';
const PRESENT = '#0F766E';
const ABSENT = '#E63946';
const LATE = '#F59E0B';

const iso = (d: Date) => {
    // Local calendar date — toISOString() would shift back a day west of UTC.
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
};

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

/** Big number tile — the six "Today at a glance" cards. */
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

/** Label/value row used throughout the Operations and Snapshots panels. */
const Row = ({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) => (
    <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
);

/**
 * Donut split across up to three slices.
 *
 * `centre` overrides the number in the middle, because the slices do not always
 * add up to the figure the panel is about: on 18 Sep the time-slot slices came
 * to 189 against a `totalCheckins` of 191 (check-ins outside 07:00–23:00 belong
 * to no slot), and the staff slices cover only the roster that has an
 * attendance row, not `totalStaff`. Printing the slice sum there would
 * contradict the row directly beside it.
 */
const Donut = ({ parts, size, centre }: {
    parts: { value: number; color: string }[]; size: number; centre?: number;
}) => {
    const total = parts.reduce((s, p) => s + p.value, 0);
    const r = size / 2 - 14;
    const c = 2 * Math.PI * r;
    let offset = 0;
    return (
        <Svg width={size} height={size}>
            <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
                {/* Track, so an all-zero day still draws a ring instead of nothing. */}
                <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={20} fill="none" />
                {total > 0 && parts.map((p, i) => {
                    const len = (p.value / total) * c;
                    const el = (
                        <Circle
                            key={i}
                            cx={size / 2} cy={size / 2} r={r}
                            stroke={p.color} strokeWidth={20} fill="none"
                            strokeDasharray={`${len} ${c - len}`}
                            strokeDashoffset={-offset}
                        />
                    );
                    offset += len;
                    return el;
                })}
            </G>
            <SvgText x={size / 2} y={size / 2 + 6} fontSize={scale(16)} fontWeight="700" fill="#0F172A" textAnchor="middle">
                {centre ?? total}
            </SvgText>
        </Svg>
    );
};

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

/** Sales vs Expenses vs Profit over the trend window. */
const TrendChart = ({ data, width, height }: {
    data: { label: string; sales: number; expenses: number; profit: number }[];
    width: number; height: number;
}) => {
    if (!data.length) { return null; }
    const padL = scale(6), padB = scale(16), padT = scale(8);
    const vals = data.flatMap(d => [d.sales, d.expenses, d.profit]);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const span = max - min || 1;
    const x = (i: number) => padL + (i * (width - padL * 2)) / Math.max(data.length - 1, 1);
    const y = (v: number) => padT + (1 - (v - min) / span) * (height - padT - padB);
    const line = (key: 'sales' | 'expenses' | 'profit') =>
        data.map((d, i) => `${x(i)},${y(d[key])}`).join(' ');

    return (
        <Svg width={width} height={height}>
            {/* Zero baseline — profit can go negative, as it did on 16 Sep. */}
            {min < 0 && (
                <Line x1={padL} y1={y(0)} x2={width - padL} y2={y(0)} stroke="#E2E8F0" strokeWidth={1} />
            )}
            <Polyline points={line('sales')} fill="none" stroke={SALES} strokeWidth={2} />
            <Polyline points={line('expenses')} fill="none" stroke={EXPENSE} strokeWidth={2} />
            <Polyline points={line('profit')} fill="none" stroke={PROFIT} strokeWidth={2} />
            {data.map((d, i) => (
                <SvgText key={d.label} x={x(i)} y={height - scale(3)} fontSize={scale(8)} fill="#94A3B8" textAnchor="middle">
                    {d.label}
                </SvgText>
            ))}
        </Svg>
    );
};

/** Sales by service — one bar per service that sold anything. */
const ServiceBars = ({ data, width, height }: {
    data: { label: string; value: number }[]; width: number; height: number;
}) => {
    if (!data.length) { return null; }
    const padB = scale(18), padT = scale(6);
    const max = Math.max(...data.map(d => d.value), 1);
    const slot = width / data.length;
    const bw = Math.min(slot * 0.55, scale(34));
    return (
        <Svg width={width} height={height}>
            {data.map((d, i) => {
                const h = (d.value / max) * (height - padT - padB);
                const cx = slot * i + slot / 2;
                return (
                    <G key={d.label}>
                        <Rect x={cx - bw / 2} y={height - padB - h} width={bw} height={h} rx={3} fill={SALES} />
                        <SvgText x={cx} y={height - scale(5)} fontSize={scale(8)} fill="#94A3B8" textAnchor="middle">
                            {d.label}
                        </SvgText>
                    </G>
                );
            })}
        </Svg>
    );
};

// ── Screen ───────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
    gym_new: 'Gym New',
    gym_renew: 'Gym Renew',
    pt_new: 'PT New',
    pt_renew: 'PT Renew',
    nutrition: 'Nutrition',
    cafe: 'Cafe',
    academy: 'Academy',
    physio: 'Physio',
};

// The web's Staff details table shows only the first slice of the roster, with
// a count line under it. Mirrored rather than paginated: this is a dashboard
// panel, and View Staff is the screen that lists staff properly.
const ROSTER_PREVIEW = 12;

const AdminDashboardScreen = () => {
    const navigation = useNavigation() as any;
    const { profile } = useSelector((state: RootState) => state.user);
    const formatCurrency = useCurrencyFormatter();

    const allowed = isSuperAdmin(profile?.role);
    const { options, loadingOptions } = useBranchSelector();

    const [branchId, setBranchId] = useState<number | 'all'>('all');
    const [branchLabel, setBranchLabel] = useState('All Branches');
    const [branchOpen, setBranchOpen] = useState(false);

    const [date, setDate] = useState(new Date());
    const [dateOpen, setDateOpen] = useState(false);

    const [data, setData] = useState<AdminDashboardSummary | null>(null);
    const [breakup, setBreakup] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        if (!allowed) { setLoading(false); return; }
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            const d = iso(date);
            // Both are fetched together, as the web page does. MISReport is
            // only needed for `breakup`, so a failure there leaves the rest of
            // the dashboard standing.
            const [summary, mis] = await Promise.all([
                getAdminDashboardSummary(branchId, d),
                getMISDashboard(branchId, d).catch(() => null),
            ]);
            setData(summary);
            setBreakup(mis?.breakup ?? null);
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

    const services = React.useMemo(() => {
        if (!breakup) { return []; }
        return Object.entries(breakup)
            .map(([key, v]: [string, any]) => ({
                label: SERVICE_LABELS[key] ?? key,
                value: Number(v?.net) || 0,
            }))
            .filter(s => s.value > 0);
    }, [breakup]);

    const chartWidth = SCREEN_WIDTH - scale(40) - scale(28);

    // After every hook above, so hook order stays constant across renders.
    if (!allowed) { return <AccessDenied />; }

    return (
        <>
            <AppHeader
                title="Admin Dashboard"
                leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
                rightIcon={<NotificationSVG width={24} height={24} />}
                onLeftPress={() => navigation.goBack()}
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
                        <TouchableOpacity style={styles.control} onPress={() => setBranchOpen(true)} activeOpacity={0.7}>
                            <Icon name="office-building" size={scale(15)} color="#64748B" />
                            <Text style={styles.controlText} numberOfLines={1}>{branchLabel}</Text>
                            <Icon name="chevron-down" size={scale(16)} color="#64748B" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.control} onPress={() => setDateOpen(true)} activeOpacity={0.7}>
                            <Icon name="calendar" size={scale(15)} color="#64748B" />
                            <Text style={styles.controlText}>{data?.display_date || iso(date)}</Text>
                        </TouchableOpacity>
                    </View>

                    {dateOpen && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            maximumDate={new Date()}
                            display="default"
                            onChange={onDateChange}
                        />
                    )}

                    {!!error && (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {data && (
                        <>
                            {/* ── Today at a glance ─────────────────────────── */}
                            <SectionTitle>Today at a glance · {data.branch_label}</SectionTitle>
                            <View style={styles.glanceGrid}>
                                <GlanceCard
                                    label="Today Sales" accent={SALES} iconName="cash-multiple"
                                    value={formatCurrency(data.total_sales_today)}
                                    sub={`Membership ${formatCurrency(data.salenet_today)} · Cafe ${formatCurrency(data.csalenet_today)}`}
                                />
                                <GlanceCard
                                    label="Month Sales" accent="#2563EB" iconName="trending-up"
                                    value={formatCurrency(data.total_sales_mtd)}
                                    sub={`Qty ${data.salem_qty} · Cafe ${formatCurrency(data.csalem_net)}`}
                                />
                                <GlanceCard
                                    label="Today Expenses" accent={EXPENSE} iconName="receipt"
                                    value={formatCurrency(data.today_expense)}
                                    sub={`MTD ${formatCurrency(data.t_expense_date)}`}
                                />
                                <GlanceCard
                                    label="Today Profit" accent={PROFIT} iconName="chart-line"
                                    value={formatCurrency(data.profit_today)}
                                    sub={`MTD ${formatCurrency(data.profit_mtd)}`}
                                />
                                <GlanceCard
                                    label="Staff Present" accent="#0EA5E9" iconName="account-check"
                                    value={`${data.presentStaff}`}
                                    sub={`of ${data.totalStaff} · Absent ${data.absentStaff} · Late ${data.lateStaff}`}
                                />
                                <GlanceCard
                                    label="Footfall" accent="#7C3AED" iconName="account-group"
                                    value={`${data.totalCheckins}`}
                                    sub={`Male ${data.totalMales} · Female ${data.totalFemales} · Absent paid ${data.absentPaidClients}`}
                                />
                            </View>

                            {/* ── Branch split ──────────────────────────────── */}
                            {data.is_all_branches && data.by_branch?.length > 0 && (
                                <View style={styles.branchGrid}>
                                    {data.by_branch.map(b => (
                                        <Card key={b.branch_id} title={b.branch_label} right={<Pill text="Branch split" />}>
                                            <Row label="Today sales" value={formatCurrency(b.total_sales_today)} />
                                            <Row label="Today profit" value={formatCurrency(b.profit_today)} />
                                            <Row label="Footfall" value={b.totalCheckins} />
                                            <Row label="Staff present" value={b.presentStaff} />
                                        </Card>
                                    ))}
                                </View>
                            )}

                            {/* ── Sales performance ─────────────────────────── */}
                            <SectionTitle>Sales performance</SectionTitle>
                            <Card
                                title={`Sales vs Expenses (${data.trend?.length || 0} days)`}
                                right={<Pill text="Incl. cafe" />}
                            >
                                <TrendChart data={data.trend || []} width={chartWidth} height={scale(150)} />
                                <Legend items={[
                                    { label: 'Sales', color: SALES },
                                    { label: 'Expenses', color: EXPENSE },
                                    { label: 'Profit', color: PROFIT },
                                ]} />
                            </Card>

                            <Card title="Sales by service">
                                {services.length ? (
                                    <ServiceBars data={services} width={chartWidth} height={scale(150)} />
                                ) : (
                                    <Text style={styles.empty}>No service sales on this date.</Text>
                                )}
                            </Card>

                            {/* ── Operations ────────────────────────────────── */}
                            <SectionTitle>Operations</SectionTitle>
                            <Card title="Footfall details" right={<Pill text="Client check-ins" />}>
                                <View style={styles.donutRow}>
                                    <View style={styles.donutBox}>
                                        <Donut
                                            size={scale(110)}
                                            centre={data.totalCheckins}
                                            parts={[
                                                { value: data.morning, color: SALES },
                                                { value: data.afternoon, color: PROFIT },
                                                { value: data.evening, color: EXPENSE },
                                            ]}
                                        />
                                        <Legend items={[
                                            { label: 'Morning', color: SALES },
                                            { label: 'Afternoon', color: PROFIT },
                                            { label: 'Evening', color: EXPENSE },
                                        ]} />
                                    </View>
                                    <View style={styles.donutSide}>
                                        <Row label="Morning 7–12" value={data.morning} />
                                        <Row label="Afternoon 12–5" value={data.afternoon} />
                                        <Row label="Evening 5–11" value={data.evening} />
                                        <Row label="Total check-ins" value={data.totalCheckins} strong />
                                        <Row label="Male / Female" value={`${data.totalMales} / ${data.totalFemales}`} />
                                    </View>
                                </View>
                                <View style={styles.divider} />
                                <Row label="Busiest" value={data.busiestTimeSlot} strong />
                                <Row label="Slowest" value={data.slowestTimeSlot} strong />
                                <Row label="Active paid members" value={data.activePaidClients} />
                                <Row label="Absent paid clients" value={data.absentPaidClients} />
                                <Row label="Visitors / walk-ins" value={data.visitorsWalkIns} />
                                <Row label="GX studio total" value={data.totalStudioAttendance} />
                                <Row
                                    label="GX sessions 1 / 2 / 3 / 4"
                                    value={`${data.studioAttendanceSession1} / ${data.studioAttendanceSession2} / ${data.studioAttendanceSession3} / ${data.studioAttendanceSession4}`}
                                />
                            </Card>

                            <Card
                                title="Staff details"
                                right={<Pill text={`PT ${data.ptStaffPresent} · Leave ${data.leaveCount}`} />}
                            >
                                <View style={styles.donutRow}>
                                    <View style={styles.donutBox}>
                                        <Donut
                                            size={scale(110)}
                                            centre={data.presentStaff}
                                            parts={[
                                                { value: data.presentStaff, color: PRESENT },
                                                { value: data.absentStaff, color: ABSENT },
                                                { value: data.lateStaff, color: LATE },
                                            ]}
                                        />
                                        <Legend items={[
                                            { label: 'Present', color: PRESENT },
                                            { label: 'Absent', color: ABSENT },
                                            { label: 'Late', color: LATE },
                                        ]} />
                                    </View>
                                    <View style={styles.donutSide}>
                                        <Row label="Total staff" value={data.totalStaff} strong />
                                        <Row
                                            label="Present / Absent / Late"
                                            value={`${data.presentStaff} / ${data.absentStaff} / ${data.lateStaff}`}
                                        />
                                        <Row label="Pending expense approvals" value={data.pending_expense_approvals} />
                                    </View>
                                </View>

                                {data.staffRoster?.length > 0 && (
                                    <>
                                        <View style={styles.divider} />
                                        <View style={styles.tableHead}>
                                            <Text style={[styles.th, styles.colBranch]}>BRANCH</Text>
                                            <Text style={[styles.th, styles.colName]}>NAME</Text>
                                            <Text style={[styles.th, styles.colDept]}>DEPT</Text>
                                        </View>
                                        {data.staffRoster.slice(0, ROSTER_PREVIEW).map(s => (
                                            <View key={s.id} style={styles.tr}>
                                                <Text style={[styles.td, styles.colBranch]}>{s.branch}</Text>
                                                <Text style={[styles.td, styles.colName]}>{s.name}</Text>
                                                <Text style={[styles.td, styles.colDept]}>{s.department}</Text>
                                            </View>
                                        ))}
                                        <Text style={styles.tableNote}>
                                            Showing first {Math.min(ROSTER_PREVIEW, data.staffRoster.length)} of {data.staffRoster.length} staff
                                        </Text>
                                    </>
                                )}
                            </Card>

                            {/* ── Snapshots ─────────────────────────────────── */}
                            <SectionTitle>Snapshots</SectionTitle>
                            <Card title="Cafe">
                                <Row label="Net sales" value={formatCurrency(data.csalenet_today)} strong />
                                <Row label="Quantity" value={data.csaleqty_today} />
                                <Row
                                    label="Meals / Drinks / Sides"
                                    value={`${data.cafe_meals} / ${data.cafe_drinks} / ${data.cafe_sides}`}
                                />
                                <Row label="Staff orders" value={data.cafe_staff_orders} />
                            </Card>

                            {breakup && (
                                <Card title="Membership">
                                    <Row
                                        label="Gym new / renew"
                                        value={`${formatCurrency(breakup.gym_new?.net || 0)} / ${formatCurrency(breakup.gym_renew?.net || 0)}`}
                                    />
                                    <Row
                                        label="PT new / renew"
                                        value={`${formatCurrency(breakup.pt_new?.net || 0)} / ${formatCurrency(breakup.pt_renew?.net || 0)}`}
                                    />
                                    <Row label="Nutrition" value={formatCurrency(breakup.nutrition?.net || 0)} />
                                    <Row label="Physio" value={formatCurrency(breakup.physio?.net || 0)} />
                                    <Row label="Academy" value={formatCurrency(breakup.academy?.net || 0)} />
                                </Card>
                            )}

                            <Card title="Quick links">
                                <View style={styles.links}>
                                    {[
                                        { label: 'Sales Report', icon: 'chart-bar', screen: 'DetailedSalesReport' },
                                        { label: 'HR', icon: 'account-group', screen: 'HRDashboard' },
                                        { label: 'Expenses', icon: 'receipt', screen: 'FinanceDashboard' },
                                        { label: 'Full MIS', icon: 'file-chart', screen: 'MISReport' },
                                    ].map(l => (
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
                            </Card>
                        </>
                    )}

                    <View style={{ height: scale(40) }} />
                </ScrollView>
            )}

            {/* Branch picker — super admin only. */}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    content: { padding: scale(20) },
    centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },

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
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
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

    branchGrid: { gap: scale(10), marginTop: scale(10) },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: scale(14),
        marginTop: scale(10),
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    cardHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(10),
    },
    cardTitle: { fontSize: scale(13), fontWeight: '700', color: '#0F172A' },

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

    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: scale(10) },

    donutRow: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
    donutBox: { alignItems: 'center' },
    donutSide: { flex: 1 },

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
    th: { fontSize: scale(9), color: '#94A3B8', fontWeight: '700', letterSpacing: 0.4 },
    tr: {
        flexDirection: 'row',
        paddingVertical: scale(7),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    td: { fontSize: scale(11), color: '#334155' },
    colBranch: { width: '22%' },
    colName: { flex: 1, paddingRight: scale(6) },
    colDept: { width: '26%' },
    tableNote: { fontSize: scale(10), color: '#94A3B8', marginTop: scale(8) },

    links: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
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

export default AdminDashboardScreen;
