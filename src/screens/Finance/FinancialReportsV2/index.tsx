// Financial Reports (V2) — the app's mirror of the web's "Finance V2 — Reports".
//
// Three tabs over the same date range: P&L, Trial balance, Balance sheet. Each
// is its own endpoint returning the same account-line shape, so one row
// component renders all three.
//
// Read-only. The web page also carries Export CSV / Export PDF and links out
// to General ledger and Mappings & vendors; those are left out until the
// screens behind them exist.
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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import { useCurrencyFormatter } from '../../../hooks/useCurrencyFormatter';
import {
    getProfitAndLoss,
    getTrialBalance,
    getBalanceSheet,
    ProfitAndLoss,
    TrialBalance,
    BalanceSheet,
    ReportLine,
} from '../../../api/financeV2';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const iso = (d: Date) => {
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

type Tab = 'pl' | 'tb' | 'bs';
const TABS: { key: Tab; label: string }[] = [
    { key: 'pl', label: 'P&L' },
    { key: 'tb', label: 'Trial balance' },
    { key: 'bs', label: 'Balance sheet' },
];

const Card = ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <View style={styles.card}>
        {!!title && <Text style={styles.cardTitle}>{title}</Text>}
        {children}
    </View>
);

/** One account row: code, name, amount — as all three reports return. */
const LineRow = ({ line, amount }: { line: ReportLine; amount: string }) => (
    <View style={styles.line}>
        <Text style={styles.lineCode}>{line.code}</Text>
        <Text style={styles.lineName} numberOfLines={2}>{line.name}</Text>
        <Text style={styles.lineAmount}>{amount}</Text>
    </View>
);

const TotalRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <View style={[styles.total, strong && styles.totalStrong]}>
        <Text style={[styles.totalLabel, strong && styles.totalLabelStrong]}>{label}</Text>
        <Text style={[styles.totalValue, strong && styles.totalValueStrong]}>{value}</Text>
    </View>
);

const FinancialReportsV2 = () => {
    const navigation = useNavigation<any>();
    const formatCurrency = useCurrencyFormatter();
    const { options } = useBranchSelector();

    const [branchId, setBranchId] = useState<number | null>(null);
    const [branchLabel, setBranchLabel] = useState('All Branches');
    const [branchOpen, setBranchOpen] = useState(false);

    const monthStart = new Date();
    monthStart.setDate(1);
    const [from, setFrom] = useState(monthStart);
    const [to, setTo] = useState(new Date());
    const [picker, setPicker] = useState<null | 'from' | 'to'>(null);

    const [tab, setTab] = useState<Tab>('pl');
    const [pl, setPl] = useState<ProfitAndLoss | null>(null);
    const [tb, setTb] = useState<TrialBalance | null>(null);
    const [bs, setBs] = useState<BalanceSheet | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            const f = iso(from), t = iso(to);
            // All three together, so switching tabs is instant — the web
            // refetches per tab, but these are small responses.
            const [p, tr, b] = await Promise.all([
                getProfitAndLoss(f, t, branchId).catch(() => null),
                getTrialBalance(f, t, branchId).catch(() => null),
                getBalanceSheet(f, t, branchId).catch(() => null),
            ]);
            setPl(p);
            setTb(tr);
            setBs(b);
            if (!p && !tr && !b) { setError('Could not load the reports.'); }
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load the reports.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, [from, to, branchId]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    const onPickDate = (_e: DateTimePickerEvent, picked?: Date) => {
        const which = picker;
        setPicker(null);
        if (!picked || !which) { return; }
        if (which === 'from') { setFrom(picked); } else { setTo(picked); }
    };

    const preset = (days: 'mtd' | 'ytd' | 30) => {
        const now = new Date();
        if (days === 'mtd') { setFrom(new Date(now.getFullYear(), now.getMonth(), 1)); }
        else if (days === 'ytd') { setFrom(new Date(now.getFullYear(), 0, 1)); }
        else {
            const d = new Date(now);
            d.setDate(d.getDate() - 30);
            setFrom(d);
        }
        setTo(now);
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Financial Reports"
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
                    {/* ── Controls ─────────────────────────────────────────── */}
                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.control} onPress={() => setBranchOpen(true)} activeOpacity={0.7}>
                            <Icon name="office-building" size={scale(15)} color="#64748B" />
                            <Text style={styles.controlText} numberOfLines={1}>{branchLabel}</Text>
                            <Icon name="chevron-down" size={scale(16)} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.control} onPress={() => setPicker('from')} activeOpacity={0.7}>
                            <Icon name="calendar" size={scale(15)} color="#64748B" />
                            <Text style={styles.controlText}>{iso(from)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.control} onPress={() => setPicker('to')} activeOpacity={0.7}>
                            <Icon name="calendar" size={scale(15)} color="#64748B" />
                            <Text style={styles.controlText}>{iso(to)}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.presetRow}>
                        <TouchableOpacity style={styles.preset} onPress={() => preset('mtd')} activeOpacity={0.7}>
                            <Text style={styles.presetText}>MTD</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.preset} onPress={() => preset('ytd')} activeOpacity={0.7}>
                            <Text style={styles.presetText}>YTD</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.preset} onPress={() => preset(30)} activeOpacity={0.7}>
                            <Text style={styles.presetText}>Last 30 days</Text>
                        </TouchableOpacity>
                    </View>

                    {picker && (
                        <DateTimePicker
                            value={picker === 'from' ? from : to}
                            mode="date"
                            display="default"
                            onChange={onPickDate}
                        />
                    )}

                    {/* ── Tabs ─────────────────────────────────────────────── */}
                    <View style={styles.tabs}>
                        {TABS.map(t => (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.tab, tab === t.key && styles.tabOn]}
                                onPress={() => setTab(t.key)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {!!error && (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* ── P&L ──────────────────────────────────────────────── */}
                    {tab === 'pl' && (pl ? (
                        <>
                            <Card title="Income">
                                {pl.income_lines.map(l => (
                                    <LineRow key={l.account_id} line={l} amount={formatCurrency(l.balance)} />
                                ))}
                                <TotalRow label="Total income" value={formatCurrency(pl.total_income)} />
                            </Card>
                            <Card title="Expenses">
                                {pl.expense_lines.map(l => (
                                    <LineRow key={l.account_id} line={l} amount={formatCurrency(l.balance)} />
                                ))}
                                <TotalRow label="Total expenses" value={formatCurrency(pl.total_expense)} />
                            </Card>
                            <Card>
                                <TotalRow label="Net income" value={formatCurrency(pl.net_income)} strong />
                            </Card>
                        </>
                    ) : <Card><Text style={styles.empty}>No profit and loss for this range.</Text></Card>)}

                    {/* ── Trial balance ────────────────────────────────────── */}
                    {tab === 'tb' && (tb ? (
                        <Card title="Trial balance">
                            <View style={styles.tbHead}>
                                <Text style={[styles.th, styles.colCode]}>CODE</Text>
                                <Text style={[styles.th, styles.colName]}>ACCOUNT</Text>
                                <Text style={[styles.th, styles.colAmt]}>DEBIT</Text>
                                <Text style={[styles.th, styles.colAmt]}>CREDIT</Text>
                            </View>
                            {tb.lines.map(l => (
                                <View key={l.account_id} style={styles.line}>
                                    <Text style={[styles.lineCode, styles.colCode]}>{l.code}</Text>
                                    <Text style={[styles.lineName, styles.colName]} numberOfLines={2}>{l.name}</Text>
                                    <Text style={[styles.lineAmount, styles.colAmt]}>{formatCurrency(l.debit)}</Text>
                                    <Text style={[styles.lineAmount, styles.colAmt]}>{formatCurrency(l.credit)}</Text>
                                </View>
                            ))}
                            <TotalRow label="Total debit" value={formatCurrency(tb.totals.debit)} />
                            <TotalRow label="Total credit" value={formatCurrency(tb.totals.credit)} />
                            <View style={[styles.balanceChip, tb.totals.balanced ? styles.chipOk : styles.chipBad]}>
                                <Icon
                                    name={tb.totals.balanced ? 'check-circle-outline' : 'alert-circle-outline'}
                                    size={scale(14)}
                                    color={tb.totals.balanced ? '#047857' : '#B91C1C'}
                                />
                                <Text style={[styles.chipText, { color: tb.totals.balanced ? '#047857' : '#B91C1C' }]}>
                                    {tb.totals.balanced
                                        ? 'Balanced'
                                        : `Out by ${formatCurrency(tb.totals.difference)}`}
                                </Text>
                            </View>
                        </Card>
                    ) : <Card><Text style={styles.empty}>No trial balance for this range.</Text></Card>)}

                    {/* ── Balance sheet ────────────────────────────────────── */}
                    {tab === 'bs' && (bs ? (
                        <>
                            <Card title="Assets">
                                {bs.assets.map(l => (
                                    <LineRow key={l.account_id} line={l} amount={formatCurrency(l.balance)} />
                                ))}
                                <TotalRow label="Total assets" value={formatCurrency(bs.total_assets)} />
                            </Card>
                            <Card title="Liabilities">
                                {bs.liabilities.map(l => (
                                    <LineRow key={l.account_id} line={l} amount={formatCurrency(l.balance)} />
                                ))}
                                <TotalRow label="Total liabilities" value={formatCurrency(bs.total_liabilities)} />
                            </Card>
                            <Card title="Equity">
                                {bs.equity.map(l => (
                                    <LineRow key={l.account_id} line={l} amount={formatCurrency(l.balance)} />
                                ))}
                                <TotalRow label="Total equity" value={formatCurrency(bs.total_equity)} />
                            </Card>
                            <Card>
                                <TotalRow
                                    label="Liabilities and equity"
                                    value={formatCurrency(bs.liabilities_and_equity)}
                                    strong
                                />
                                <View style={[styles.balanceChip, bs.is_balanced ? styles.chipOk : styles.chipBad]}>
                                    <Icon
                                        name={bs.is_balanced ? 'check-circle-outline' : 'alert-circle-outline'}
                                        size={scale(14)}
                                        color={bs.is_balanced ? '#047857' : '#B91C1C'}
                                    />
                                    <Text style={[styles.chipText, { color: bs.is_balanced ? '#047857' : '#B91C1C' }]}>
                                        {bs.is_balanced ? 'Balanced' : 'Not balanced'}
                                    </Text>
                                </View>
                            </Card>
                        </>
                    ) : <Card><Text style={styles.empty}>No balance sheet for this range.</Text></Card>)}

                    <View style={{ height: scale(40) }} />
                </ScrollView>
            )}

            <Modal visible={branchOpen} transparent animationType="fade" onRequestClose={() => setBranchOpen(false)}>
                <TouchableOpacity style={styles.modalBack} activeOpacity={1} onPress={() => setBranchOpen(false)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Select Branch</Text>
                        <ScrollView>
                            {[{ id: null, name: 'All Branches' }, ...options].map(o => (
                                <TouchableOpacity
                                    key={String(o.id)}
                                    style={styles.modalRow}
                                    onPress={() => {
                                        setBranchId(o.id as number | null);
                                        setBranchLabel(o.name);
                                        setBranchOpen(false);
                                    }}
                                >
                                    <Text style={styles.modalRowText}>{o.name}</Text>
                                    {branchId === o.id && <Icon name="check" size={18} color="#E63946" />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    content: { padding: scale(20) },
    centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },

    controls: { flexDirection: 'row', gap: scale(10), marginBottom: scale(8) },
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

    presetRow: { flexDirection: 'row', gap: scale(8) },
    preset: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: scale(8),
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    presetText: { fontSize: scale(11), color: '#334155', fontWeight: '600' },

    tabs: {
        flexDirection: 'row',
        gap: scale(6),
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        padding: scale(3),
        marginTop: scale(12),
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: scale(8), borderRadius: 8 },
    tabOn: { backgroundColor: '#fff' },
    tabText: { fontSize: scale(11.5), color: '#64748b', fontWeight: '600' },
    tabTextOn: { color: '#0F172A', fontWeight: '700' },

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

    line: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(7),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    lineCode: { width: scale(42), fontSize: scale(10.5), color: '#94A3B8', fontWeight: '600' },
    lineName: { flex: 1, fontSize: scale(11.5), color: '#334155', paddingRight: scale(6) },
    lineAmount: { fontSize: scale(11.5), color: '#0F172A', fontWeight: '600', textAlign: 'right' },

    tbHead: {
        flexDirection: 'row',
        paddingBottom: scale(6),
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    th: { fontSize: scale(9), color: '#94A3B8', fontWeight: '700', letterSpacing: 0.4 },
    colCode: { width: scale(42) },
    colName: { flex: 1, paddingRight: scale(6) },
    colAmt: { width: scale(80), textAlign: 'right' },

    total: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: scale(10),
        marginTop: scale(4),
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    totalStrong: { borderTopWidth: 0, paddingTop: 0 },
    totalLabel: { fontSize: scale(12), color: '#334155', fontWeight: '700' },
    totalLabelStrong: { fontSize: scale(13), color: '#0F172A' },
    totalValue: { fontSize: scale(12), color: '#0F172A', fontWeight: '700' },
    totalValueStrong: { fontSize: scale(14), color: '#0F766E' },

    balanceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        alignSelf: 'flex-start',
        borderRadius: 20,
        paddingHorizontal: scale(10),
        paddingVertical: scale(5),
        marginTop: scale(10),
    },
    chipOk: { backgroundColor: '#ECFDF5' },
    chipBad: { backgroundColor: '#FEF2F2' },
    chipText: { fontSize: scale(10.5), fontWeight: '700' },

    empty: { fontSize: scale(11.5), color: '#94A3B8', textAlign: 'center', paddingVertical: scale(20) },

    modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: scale(30) },
    modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: scale(16), maxHeight: '60%' },
    modalTitle: { fontSize: scale(14), fontWeight: '700', color: '#0F172A', marginBottom: scale(10) },
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

export default FinancialReportsV2;
