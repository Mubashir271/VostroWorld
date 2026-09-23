// Finance Dashboard (V2) — the app's mirror of the web's "Finance overview".
//
// Structure follows the web section for section (tiles → Income vs expenses →
// Journal entries by source → Receivables aging → Historical sales import →
// Top accounts → Quick links); the styling is the app's own card idiom.
//
// Data: /v1/finance-v2/reports/dashboard backs everything except Top accounts,
// which comes from the month-to-date profit-and-loss — the same two calls the
// web page makes, plus health-check for the sync-issue count (HAR, 21 Sep 2026).
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import BurgerSVG from '../../../assets/svg/BurgerSVG';
import { useCurrencyFormatter } from '../../../hooks/useCurrencyFormatter';
import {
    getFinanceV2Dashboard,
    getProfitAndLoss,
    FinanceV2Dashboard,
    ProfitAndLoss,
} from '../../../api/financeV2';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const INCOME = '#0F766E';
const EXPENSE = '#E97451';
const NEUTRAL = '#2563EB';

const iso = (d: Date) => {
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Source keys come back snake_cased; the web prints them in words. */
const SOURCE_LABELS: Record<string, string> = {
    sales_order: 'Sales / checkout',
    expense_legacy: 'Imported expenses',
    bank_ledger: 'Bank ledger',
    opening_balance: 'Opening balances',
    charity: 'Charity',
    payroll: 'Payroll / HR',
};

const AGEING_LABELS: [string, string][] = [
    ['current', '0–30 days'],
    ['days_31_60', '31–60'],
    ['days_61_90', '61–90'],
    ['days_91_120', '91–120'],
    ['over_120', '120+'],
];

const Card = ({ title, right, children }: {
    title?: string; right?: React.ReactNode; children: React.ReactNode;
}) => (
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

const Tile = ({ label, value, sub, accent, onPress, actionLabel }: {
    label: string; value: string; sub?: string; accent: string;
    onPress?: () => void; actionLabel?: string;
}) => (
    <View style={[styles.tile, { borderLeftColor: accent }]}>
        <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
        <Text style={[styles.tileValue, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {value}
        </Text>
        {!!sub && <Text style={styles.tileSub}>{sub}</Text>}
        {!!onPress && (
            <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
                <Text style={styles.tileLink}>{actionLabel} →</Text>
            </TouchableOpacity>
        )}
    </View>
);

/** Horizontal bar with its figure at the end. */
const Bar = ({ label, value, max, color, display }: {
    label: string; value: number; max: number; color: string; display: string;
}) => (
    <View style={styles.barRow}>
        <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
        <View style={styles.barTrack}>
            <View style={[
                styles.barFill,
                { width: `${max > 0 ? Math.max((Math.abs(value) / max) * 100, value === 0 ? 0 : 2) : 0}%`, backgroundColor: color },
            ]} />
        </View>
        <Text style={styles.barValue} numberOfLines={1}>{display}</Text>
    </View>
);

const FinanceDashboardV2 = () => {
    const navigation = useNavigation<any>();
    const formatCurrency = useCurrencyFormatter();

    const [dash, setDash] = useState<FinanceV2Dashboard | null>(null);
    const [pl, setPl] = useState<ProfitAndLoss | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            const now = new Date();
            const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
            const [d, p] = await Promise.all([
                getFinanceV2Dashboard().catch(() => null),
                getProfitAndLoss(monthStart, iso(now)).catch(() => null),
            ]);
            setDash(d);
            setPl(p);
            if (!d) { setError('Could not load the finance overview.'); }
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load the finance overview.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    const hub = dash?.hub;
    const s = dash?.summary as any;
    const setupRequired = !!dash?.setup?.requires_setup;
    const syncIssues = hub?.sync?.failed_total ?? 0;

    const revenue = Number(s?.mtd_income ?? 0);
    const expenses = Number(s?.mtd_expense ?? 0);
    const netIncome = Number(s?.mtd_net_income ?? 0);
    const ivMax = Math.max(Math.abs(revenue), Math.abs(expenses), Math.abs(netIncome), 1);

    const sources = Object.entries(hub?.journals_by_source ?? {})
        .map(([k, v]) => ({ key: k, label: SOURCE_LABELS[k] ?? k, value: Number(v) || 0 }))
        .filter(x => x.value > 0)
        .sort((a, b) => b.value - a.value);
    const sourceTotal = sources.reduce((t, x) => t + x.value, 0);
    const sourceMax = Math.max(...sources.map(x => x.value), 1);

    const buckets = hub?.receivables?.buckets;
    const bucketMax = Math.max(...AGEING_LABELS.map(([k]) => Number((buckets as any)?.[k] ?? 0)), 1);

    const backfill = hub?.sync?.sales_backfill;
    const backfillMax = Math.max(
        backfill?.synced_success ?? 0,
        backfill?.remaining ?? 0,
        backfill?.sync_failed ?? 0,
        1,
    );

    // Only links with a screen behind them — the web also offers Chart of
    // accounts, Enter transactions, General ledger, Bank reconciliation,
    // Receivables and Guides, none of which exist in the app yet.
    const QUICK_LINKS = [
        { label: 'Setup wizard', icon: 'cog-outline', screen: 'SetupWizardV2' },
        { label: 'Journal entries', icon: 'book-open-outline', screen: 'JournalsV2' },
        { label: 'Financial reports', icon: 'chart-bar', screen: 'FinancialReportsV2' },
        { label: 'Import & sync', icon: 'cloud-download-outline', screen: 'ImportSyncV2' },
    ];

    return (
        <View style={styles.container}>
            <AppHeader
                title="Finance Dashboard"
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
                <View style={styles.centre}><ActivityIndicator size="large" color="#E10600" /></View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E10600" />
                    }
                >
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>Finance overview</Text>
                        <Text style={styles.heroText}>
                            {hub?.company?.name ?? 'Finance V2'} · {hub?.company?.currency ?? 'PKR'} · Month to date
                        </Text>
                        <View style={styles.heroActions}>
                            {setupRequired && (
                                <TouchableOpacity
                                    style={styles.warnBtn}
                                    onPress={() => navigation.navigate('SetupWizardV2')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.warnBtnText}>Complete setup</Text>
                                </TouchableOpacity>
                            )}
                            {syncIssues > 0 && (
                                <TouchableOpacity
                                    style={styles.dangerBtn}
                                    onPress={() => navigation.navigate('ImportSyncV2')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.dangerBtnText}>Fix sync issues</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {!!error && (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* ── Tiles ────────────────────────────────────────────── */}
                    <View style={styles.tileGrid}>
                        <Tile
                            label="Net income (MTD)"
                            value={formatCurrency(netIncome)}
                            accent={netIncome < 0 ? '#B91C1C' : INCOME}
                        />
                        <Tile label="Revenue (MTD)" value={formatCurrency(revenue)} accent={INCOME} />
                        <Tile label="Expenses (MTD)" value={formatCurrency(expenses)} accent={EXPENSE} />
                        <Tile
                            label="Outstanding A/R"
                            value={formatCurrency(hub?.receivables?.total_ar ?? 0)}
                            accent={NEUTRAL}
                        />
                        <Tile
                            label="Sales synced today"
                            value={`${s?.sales_synced_today ?? 0}`}
                            accent={INCOME}
                        />
                        <Tile
                            label="Posted journals"
                            value={`${hub?.counts?.posted_journals_total ?? 0}`}
                            accent="#0F172A"
                        />
                        <Tile
                            label="Journals this month"
                            value={`${hub?.counts?.posted_journals_mtd ?? 0}`}
                            accent="#0F172A"
                        />
                        <Tile
                            label="Sync issues"
                            value={`${syncIssues}`}
                            accent={syncIssues > 0 ? '#B91C1C' : INCOME}
                            onPress={syncIssues > 0 ? () => navigation.navigate('ImportSyncV2') : undefined}
                            actionLabel="Resolve"
                        />
                    </View>

                    {/* ── Income vs expenses ───────────────────────────────── */}
                    <Card title="Income vs expenses (this month)">
                        <Bar label="Revenue" value={revenue} max={ivMax} color={INCOME} display={formatCurrency(revenue)} />
                        <Bar label="Expenses" value={expenses} max={ivMax} color={EXPENSE} display={formatCurrency(expenses)} />
                        <Bar
                            label="Net income"
                            value={netIncome}
                            max={ivMax}
                            color={netIncome < 0 ? '#B91C1C' : INCOME}
                            display={formatCurrency(netIncome)}
                        />
                    </Card>

                    {/* ── Journal entries by source ────────────────────────── */}
                    <Card title="Journal entries by source">
                        {sources.length ? sources.map(x => (
                            <Bar
                                key={x.key}
                                label={x.label}
                                value={x.value}
                                max={sourceMax}
                                color={NEUTRAL}
                                display={`${Math.round((x.value / (sourceTotal || 1)) * 100)}%`}
                            />
                        )) : <Text style={styles.empty}>No journals yet.</Text>}
                    </Card>

                    {/* ── Receivables aging ────────────────────────────────── */}
                    <Card title="Receivables aging">
                        {AGEING_LABELS.map(([key, label]) => (
                            <Bar
                                key={key}
                                label={label}
                                value={Number((buckets as any)?.[key] ?? 0)}
                                max={bucketMax}
                                color={key === 'over_120' ? '#B91C1C' : NEUTRAL}
                                display={formatCurrency(Number((buckets as any)?.[key] ?? 0))}
                            />
                        ))}
                        <Text style={styles.footNote}>
                            GL A/R balance: {formatCurrency(hub?.receivables?.gl_ar_balance ?? 0)}
                        </Text>
                    </Card>

                    {/* ── Historical sales import ──────────────────────────── */}
                    {!!backfill && (
                        <Card
                            title="Historical sales import"
                            right={
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('ImportSyncV2')}
                                    activeOpacity={0.6}
                                >
                                    <Text style={styles.cardLink}>Open →</Text>
                                </TouchableOpacity>
                            }
                        >
                            <Bar label="Synced" value={backfill.synced_success} max={backfillMax} color={INCOME} display={`${backfill.synced_success}`} />
                            <Bar label="Remaining" value={backfill.remaining} max={backfillMax} color={EXPENSE} display={`${backfill.remaining}`} />
                            <Bar label="Failed" value={backfill.sync_failed} max={backfillMax} color="#B91C1C" display={`${backfill.sync_failed}`} />
                            <Text style={styles.footNote}>Eligible: {backfill.total_eligible}</Text>
                        </Card>
                    )}

                    {/* ── Top accounts ─────────────────────────────────────── */}
                    {!!pl && (
                        <Card title="Top accounts this month">
                            <Text style={styles.subHead}>Income</Text>
                            {pl.income_lines.slice(0, 5).map(l => (
                                <View key={l.account_id} style={styles.acctRow}>
                                    <Text style={styles.acctCode}>{l.code}</Text>
                                    <Text style={styles.acctName} numberOfLines={1}>{l.name}</Text>
                                    <Text style={styles.acctAmt}>{formatCurrency(l.balance)}</Text>
                                </View>
                            ))}
                            <Text style={[styles.subHead, styles.subHeadExpense]}>Expenses</Text>
                            {pl.expense_lines.slice(0, 5).map(l => (
                                <View key={l.account_id} style={styles.acctRow}>
                                    <Text style={styles.acctCode}>{l.code}</Text>
                                    <Text style={styles.acctName} numberOfLines={1}>{l.name}</Text>
                                    <Text style={styles.acctAmt}>{formatCurrency(l.balance)}</Text>
                                </View>
                            ))}
                        </Card>
                    )}

                    {/* ── Quick links ──────────────────────────────────────── */}
                    <Card title="Quick links">
                        <View style={styles.links}>
                            {QUICK_LINKS.map(l => (
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

    hero: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: scale(14),
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    heroTitle: { fontSize: scale(16), fontWeight: '700', color: '#0F172A' },
    heroText: { fontSize: scale(11), color: '#64748b', marginTop: scale(4) },
    heroActions: { flexDirection: 'row', gap: scale(8), marginTop: scale(10) },
    warnBtn: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: scale(12), paddingVertical: scale(7) },
    warnBtnText: { fontSize: scale(11), fontWeight: '700', color: '#B45309' },
    dangerBtn: {
        borderRadius: 8,
        paddingHorizontal: scale(12),
        paddingVertical: scale(7),
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    dangerBtnText: { fontSize: scale(11), fontWeight: '700', color: '#B91C1C' },

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

    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginTop: scale(10) },
    tile: {
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
    tileLabel: {
        fontSize: scale(9.5),
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    tileValue: { fontSize: scale(16), fontWeight: '700', marginTop: scale(6) },
    tileSub: { fontSize: scale(9.5), color: '#94A3B8', marginTop: scale(3) },
    tileLink: { fontSize: scale(10), color: '#E63946', fontWeight: '700', marginTop: scale(5) },

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
    cardLink: { fontSize: scale(10.5), color: '#E63946', fontWeight: '700' },

    barRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingVertical: scale(6) },
    barLabel: { width: '28%', fontSize: scale(10.5), color: '#334155' },
    barTrack: { flex: 1, height: scale(8), borderRadius: scale(4), backgroundColor: '#F1F5F9', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: scale(4) },
    barValue: { width: scale(78), textAlign: 'right', fontSize: scale(10), fontWeight: '700', color: '#0F172A' },

    footNote: { fontSize: scale(10), color: '#94A3B8', marginTop: scale(8) },

    subHead: { fontSize: scale(11), fontWeight: '700', color: INCOME, marginTop: scale(4), marginBottom: scale(4) },
    subHeadExpense: { color: '#B91C1C', marginTop: scale(12) },
    acctRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(5),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    acctCode: { width: scale(40), fontSize: scale(10), color: '#94A3B8', fontWeight: '600' },
    acctName: { flex: 1, fontSize: scale(11), color: '#334155', paddingRight: scale(6) },
    acctAmt: { fontSize: scale(11), color: '#0F172A', fontWeight: '600' },

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
    linkText: { fontSize: scale(11), color: '#334155', fontWeight: '600' },

    empty: { fontSize: scale(11.5), color: '#94A3B8', textAlign: 'center', paddingVertical: scale(16) },
});

export default FinanceDashboardV2;
