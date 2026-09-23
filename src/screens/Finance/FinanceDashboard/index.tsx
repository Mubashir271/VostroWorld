// Finance dashboard (legacy) — the app's mirror of the web's legacy Finance
// dashboard.
//
// Rebuilt 21 Sep 2026 against the five calls the web actually makes. The
// previous version called `/v1/finance/dashboard`, which 404s, so it always
// fell through to a hardcoded DEMO_SALES / DEMO_EXPENSES block — every figure
// on the screen was invented. Those fallbacks are gone: an empty response now
// renders as empty.
//
// Sections follow the web (Sales and Expense by category → Filter By →
// Bank / Office / Sales Counter balances → Monthly Profit & Loss → Payment
// Method Breakdown).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { RootState } from '../../../redux/store';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import {
    getBankBalance,
    getOfficeBalance,
    getSalesCounterBalance,
    getSalesAndExpenseByCategory,
    getSalesByPaymentMethod,
    foldSalesByCategory,
    foldExpensesByCategory,
    FinanceBalance,
    PaymentMethodRow,
} from '../../../api/financeLegacy';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const SALES_COLOR = '#0F766E';
const EXPENSE_COLOR = '#E63946';

const FILTERS = ['Today', 'Week', 'Month', 'Quarter'] as const;
type Filter = typeof FILTERS[number];

const iso = (d: Date) => {
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** The date range each Filter By tab covers. */
const rangeFor = (f: Filter) => {
    const end = new Date();
    const start = new Date();
    if (f === 'Today') { /* same day */ }
    else if (f === 'Week') { start.setDate(end.getDate() - 6); }
    else if (f === 'Month') { start.setDate(1); }
    else { start.setMonth(end.getMonth() - 2, 1); }
    return { start_date: iso(start), end_date: iso(end) };
};

const fmt = (n: number) => {
    const abs = Math.abs(n || 0);
    return `${n < 0 ? '-Rs ' : 'Rs '}${abs.toLocaleString()}/-`;
};

const BalanceCard = ({ label, b }: { label: string; b: FinanceBalance | null }) => (
    <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{label}</Text>
        <Text style={styles.balanceTotalLabel}>Total Balance</Text>
        <Text style={[
            styles.balanceTotal,
            (b?.total_balance ?? 0) < 0 ? styles.negative : styles.positive,
        ]}>
            {fmt(b?.total_balance ?? 0)}
        </Text>
        <View style={styles.balanceRow}>
            <View style={styles.balanceSub}>
                <Text style={styles.balanceSubLabel}>Last Debit</Text>
                <Text style={styles.balanceSubVal}>{fmt(b?.last_debit ?? 0)}</Text>
            </View>
            <View style={styles.balanceSub}>
                <Text style={styles.balanceSubLabel}>Last Credit</Text>
                <Text style={styles.balanceSubVal}>{fmt(b?.last_credit ?? 0)}</Text>
            </View>
        </View>
    </View>
);

const Bar = ({ label, value, max, color, display }: {
    label: string; value: number; max: number; color: string; display: string;
}) => (
    <View style={styles.barRow}>
        <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
        <View style={styles.barTrack}>
            <View style={[
                styles.barFill,
                { width: `${max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0}%`, backgroundColor: color },
            ]} />
        </View>
        <Text style={styles.barValue} numberOfLines={1}>{display}</Text>
    </View>
);

const Card = ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <View style={styles.card}>
        {!!title && <Text style={styles.cardTitle}>{title}</Text>}
        {children}
    </View>
);

const FinanceDashboard = () => {
    const navigation = useNavigation<any>();
    const { profile } = useSelector((state: RootState) => state.user);
    const branchId = profile?.branchId || '';

    const [filter, setFilter] = useState<Filter>('Month');
    const [bank, setBank] = useState<FinanceBalance | null>(null);
    const [office, setOffice] = useState<FinanceBalance | null>(null);
    const [counter, setCounter] = useState<FinanceBalance | null>(null);
    const [sales, setSales] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            const p = { branch_id: branchId, ...rangeFor(filter) };
            const [b, o, c, cat, pm] = await Promise.all([
                getBankBalance(p).catch(() => null),
                getOfficeBalance(p).catch(() => null),
                getSalesCounterBalance(p).catch(() => null),
                getSalesAndExpenseByCategory(p).catch(() => ({ sales: [], expenses: [] })),
                getSalesByPaymentMethod(p).catch(() => []),
            ]);
            setBank(b);
            setOffice(o);
            setCounter(c);
            setSales(foldSalesByCategory(cat.sales));
            setExpenses(foldExpensesByCategory(cat.expenses));
            setMethods(pm);
            if (!b && !o && !c) { setError('Could not load the finance figures.'); }
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load the finance figures.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, [branchId, filter]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    const totalSales = useMemo(() => sales.reduce((t, s) => t + s.amount, 0), [sales]);
    const totalExpenses = useMemo(() => expenses.reduce((t, e) => t + e.amount, 0), [expenses]);
    const netProfit = totalSales - totalExpenses;

    const maxSales = Math.max(...sales.map(s => s.amount), 1);
    const maxExpenses = Math.max(...expenses.map(e => e.amount), 1);

    const paidMethods = methods.filter(m => Number(m.total_payment) > 0);
    const methodTotal = paidMethods.reduce((t, m) => t + Number(m.total_payment), 0);
    const maxMethod = Math.max(...paidMethods.map(m => Number(m.total_payment)), 1);

    return (
        <View style={styles.container}>
            <AppHeader
                title="Finance Dashboard"
                leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
                rightIcon={<NotificationSVG width={24} height={24} />}
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => navigation.navigate('Notifications')}
                backgroundColor="#FFE5E5"
            />

            {loading ? (
                <View style={styles.centre}><ActivityIndicator size="large" color="#E10600" /></View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E10600" />
                    }
                >
                    {/* ── Filter By ────────────────────────────────────────── */}
                    <View style={styles.tabRow}>
                        {FILTERS.map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.tab, filter === t && styles.tabOn]}
                                onPress={() => setFilter(t)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabText, filter === t && styles.tabTextOn]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {!!error && (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* ── Balances ─────────────────────────────────────────── */}
                    <BalanceCard label="Bank" b={bank} />
                    <BalanceCard label="Office" b={office} />
                    <BalanceCard label="Sales Counter" b={counter} />

                    {/* ── Sales by category ────────────────────────────────── */}
                    <Card title="Sales">
                        {sales.length ? sales.map(s => (
                            <Bar
                                key={s.label}
                                label={s.label}
                                value={s.amount}
                                max={maxSales}
                                color={SALES_COLOR}
                                display={fmt(s.amount)}
                            />
                        )) : <Text style={styles.empty}>No sales in this period.</Text>}
                    </Card>

                    {/* ── Expenses by category ─────────────────────────────── */}
                    <Card title="Expense">
                        {expenses.length ? expenses.map(e => (
                            <Bar
                                key={e.label}
                                label={e.label}
                                value={e.amount}
                                max={maxExpenses}
                                color={EXPENSE_COLOR}
                                display={fmt(e.amount)}
                            />
                        )) : <Text style={styles.empty}>No expenses in this period.</Text>}
                    </Card>

                    {/* ── Profit & Loss ────────────────────────────────────── */}
                    <Card title={`${filter} Profit & Loss`}>
                        <View style={styles.plRow}>
                            <Text style={styles.plLabel}>Total Sales</Text>
                            <Text style={styles.plValue}>{fmt(totalSales)}</Text>
                        </View>
                        <View style={styles.plRow}>
                            <Text style={styles.plLabel}>Total Expenses</Text>
                            <Text style={styles.plValue}>{fmt(totalExpenses)}</Text>
                        </View>
                        <View style={[styles.plRow, styles.plRowNet]}>
                            <Text style={styles.plLabelNet}>Net Profit</Text>
                            <Text style={[
                                styles.plValueNet,
                                netProfit < 0 ? styles.negative : styles.positive,
                            ]}>
                                {fmt(netProfit)}
                            </Text>
                        </View>
                    </Card>

                    {/* ── Payment Method Breakdown ─────────────────────────── */}
                    <Card title="Payment Method Breakdown">
                        {paidMethods.length ? paidMethods.map(m => (
                            <Bar
                                key={m.payment_method}
                                label={m.payment_method}
                                value={Number(m.total_payment)}
                                max={maxMethod}
                                color="#2563EB"
                                display={`${Math.round((Number(m.total_payment) / (methodTotal || 1)) * 100)}%`}
                            />
                        )) : <Text style={styles.empty}>No payments in this period.</Text>}
                        {!!paidMethods.length && (
                            <Text style={styles.footNote}>Total {fmt(methodTotal)}</Text>
                        )}
                    </Card>

                    <View style={{ height: scale(40) }} />
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    content: { padding: scale(20) },
    centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },

    tabRow: {
        flexDirection: 'row',
        gap: scale(6),
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        padding: scale(3),
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: scale(8), borderRadius: 8 },
    tabOn: { backgroundColor: '#E10600' },
    tabText: { fontSize: scale(11.5), color: '#64748b', fontWeight: '600' },
    tabTextOn: { color: '#fff', fontWeight: '700' },

    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        padding: scale(12),
        marginTop: scale(10),
    },
    errorText: { flex: 1, fontSize: scale(12), color: '#B91C1C' },

    balanceCard: {
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
    balanceLabel: { fontSize: scale(13), fontWeight: '700', color: '#0F172A' },
    balanceTotalLabel: { fontSize: scale(10.5), color: '#64748b', marginTop: scale(6) },
    balanceTotal: { fontSize: scale(20), fontWeight: '700', marginTop: scale(2) },
    positive: { color: '#0F766E' },
    negative: { color: '#B91C1C' },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: scale(12),
        paddingTop: scale(10),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E2E8F0',
    },
    balanceSub: { flex: 1 },
    balanceSubLabel: { fontSize: scale(10), color: '#94A3B8' },
    balanceSubVal: { fontSize: scale(12), fontWeight: '700', color: '#334155', marginTop: scale(2) },

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
    cardTitle: { fontSize: scale(13), fontWeight: '700', color: '#0F172A', marginBottom: scale(8) },

    barRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingVertical: scale(6) },
    barLabel: { width: '28%', fontSize: scale(10.5), color: '#334155' },
    barTrack: { flex: 1, height: scale(8), borderRadius: scale(4), backgroundColor: '#F1F5F9', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: scale(4) },
    barValue: { width: scale(88), textAlign: 'right', fontSize: scale(10), fontWeight: '700', color: '#0F172A' },

    plRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
        borderRadius: 10,
        paddingHorizontal: scale(12),
        paddingVertical: scale(12),
        marginBottom: scale(8),
    },
    plRowNet: { marginBottom: 0 },
    plLabel: { fontSize: scale(12), color: '#334155', fontWeight: '600' },
    plValue: { fontSize: scale(12.5), color: '#0F172A', fontWeight: '700' },
    plLabelNet: { fontSize: scale(12.5), color: '#0F172A', fontWeight: '700' },
    plValueNet: { fontSize: scale(13.5), fontWeight: '700' },

    footNote: { fontSize: scale(10), color: '#94A3B8', marginTop: scale(8) },
    empty: { fontSize: scale(11.5), color: '#94A3B8', textAlign: 'center', paddingVertical: scale(20) },
});

export default FinanceDashboard;
