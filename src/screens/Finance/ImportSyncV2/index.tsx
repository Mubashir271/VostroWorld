// Import & sync — the app's mirror of the web's Finance V2 "Import & sync".
//
// Shows the system check (each requirement pass/fail with its detail), the
// books counts, and what the sync log has managed so far broken down by module.
//
// Read-only. Every button on the web page — Fix all failed, Seed all mappings,
// Repair payroll sync log, Process all remaining, Retry failed, Import all,
// Import everything — bulk-writes into the live books, so none of them are
// wired here.
import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import {
    getHealthCheck,
    getFinanceV2Dashboard,
    HealthCheck,
    FinanceV2Dashboard,
} from '../../../api/financeV2';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const stamp = (s?: string | null) => (s ? String(s).replace('T', ' ').slice(0, 16) : '—');

const Card = ({ eyebrow, title, right, children }: {
    eyebrow?: string; title?: string; right?: React.ReactNode; children: React.ReactNode;
}) => (
    <View style={styles.card}>
        {(eyebrow || title || right) && (
            <View style={styles.cardHead}>
                <View style={styles.cardHeadText}>
                    {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
                    {!!title && <Text style={styles.cardTitle}>{title}</Text>}
                </View>
                {right}
            </View>
        )}
        {children}
    </View>
);

const Row = ({ label, value }: { label: string; value: string | number }) => (
    <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
    </View>
);

const ImportSyncV2 = () => {
    const navigation = useNavigation<any>();

    const [health, setHealth] = useState<HealthCheck | null>(null);
    const [dash, setDash] = useState<FinanceV2Dashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            const [h, d] = await Promise.all([
                getHealthCheck().catch(() => null),
                getFinanceV2Dashboard().catch(() => null),
            ]);
            setHealth(h);
            setDash(d);
            if (!h && !d) { setError('Could not load the sync state.'); }
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load the sync state.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    const sync = dash?.hub?.sync;
    const counts = dash?.hub?.counts;

    // The log lists a success and a failed row per module/type; fold them into
    // one line each so a module's failures sit next to its successes.
    const modules = React.useMemo(() => {
        const map: Record<string, { module: string; type: string; ok: number; failed: number }> = {};
        (sync?.by_module ?? []).forEach(m => {
            const key = `${m.module}/${m.type}`;
            if (!map[key]) { map[key] = { module: m.module, type: m.type, ok: 0, failed: 0 }; }
            if (m.status === 'failed') { map[key].failed += m.count; } else { map[key].ok += m.count; }
        });
        return Object.values(map).sort((a, b) => b.failed - a.failed || b.ok - a.ok);
    }, [sync]);

    return (
        <View style={styles.container}>
            <AppHeader
                title="Import & Sync"
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
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>Import & sync</Text>
                        <Text style={styles.heroText}>
                            Historical sales, expenses, payroll and charity brought into the
                            Finance V2 books.
                        </Text>
                    </View>

                    {!!error && (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* ── System check ─────────────────────────────────────── */}
                    {health && (
                        <Card
                            eyebrow="SYSTEM CHECK"
                            title={health.healthy ? 'All checks passing' : 'Needs attention'}
                            right={
                                <View style={[styles.countChip, health.healthy ? styles.chipOk : styles.chipBad]}>
                                    <Text style={[
                                        styles.countChipText,
                                        { color: health.healthy ? '#047857' : '#B91C1C' },
                                    ]}>
                                        {health.failed_count} failed
                                    </Text>
                                </View>
                            }
                        >
                            {health.checks.map(c => {
                                const ok = c.status === 'pass';
                                return (
                                    <View key={c.code} style={[styles.check, ok ? styles.checkOk : styles.checkBad]}>
                                        <Icon
                                            name={ok ? 'check-circle-outline' : 'alert-circle-outline'}
                                            size={scale(15)}
                                            color={ok ? '#047857' : '#B91C1C'}
                                        />
                                        <View style={styles.checkText}>
                                            <Text style={styles.checkLabel}>{c.label}</Text>
                                            <Text style={styles.checkDetail}>{c.detail}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                            <Text style={styles.checkedAt}>Checked {stamp(health.checked_at)}</Text>
                        </Card>
                    )}

                    {/* ── Books ────────────────────────────────────────────── */}
                    {counts && (
                        <Card eyebrow="BOOKS" title="Current totals">
                            <Row label="Active accounts" value={counts.active_accounts} />
                            <Row label="Posted journals" value={counts.posted_journals_total} />
                            <Row label="Posted this month" value={counts.posted_journals_mtd} />
                            <Row label="Posted today" value={counts.posted_journals_today} />
                        </Card>
                    )}

                    {/* ── Sales / orders backfill ──────────────────────────── */}
                    {!!sync?.sales_backfill && (
                        <Card eyebrow="SALES / ORDERS" title="Historical import">
                            <Row label="Eligible" value={sync.sales_backfill.total_eligible} />
                            <Row label="Synced" value={sync.sales_backfill.synced_success} />
                            <Row label="Remaining" value={sync.sales_backfill.remaining} />
                            <Row label="Failed" value={sync.sales_backfill.sync_failed} />
                            <View style={styles.progressTrack}>
                                <View style={[
                                    styles.progressFill,
                                    {
                                        width: `${sync.sales_backfill.total_eligible > 0
                                            ? (sync.sales_backfill.synced_success / sync.sales_backfill.total_eligible) * 100
                                            : 0}%`,
                                    },
                                ]} />
                            </View>
                            <Text style={styles.progressNote}>
                                {sync.sales_backfill.total_eligible > 0
                                    ? `${Math.round((sync.sales_backfill.synced_success / sync.sales_backfill.total_eligible) * 100)}% imported`
                                    : 'Nothing to import'}
                            </Text>
                        </Card>
                    )}

                    {/* ── Sync log ─────────────────────────────────────────── */}
                    {sync && (
                        <Card eyebrow="SYNC LOG" title="Imported so far">
                            <View style={styles.totalsRow}>
                                <View style={[styles.totalTile, styles.tileOk]}>
                                    <Text style={styles.tileValue}>{sync.success_total}</Text>
                                    <Text style={styles.tileLabel}>Succeeded</Text>
                                </View>
                                <View style={[styles.totalTile, styles.tileBad]}>
                                    <Text style={[styles.tileValue, styles.tileValueBad]}>{sync.failed_total}</Text>
                                    <Text style={styles.tileLabel}>Failed</Text>
                                </View>
                            </View>

                            <View style={styles.tHead}>
                                <Text style={[styles.th, styles.colMod]}>MODULE</Text>
                                <Text style={[styles.th, styles.colNum]}>OK</Text>
                                <Text style={[styles.th, styles.colNum]}>FAILED</Text>
                            </View>
                            {modules.map(m => (
                                <View key={`${m.module}/${m.type}`} style={styles.tr}>
                                    <View style={styles.colMod}>
                                        <Text style={styles.modType}>{m.type}</Text>
                                        <Text style={styles.modName}>{m.module}</Text>
                                    </View>
                                    <Text style={[styles.td, styles.colNum]}>{m.ok}</Text>
                                    <Text style={[
                                        styles.td,
                                        styles.colNum,
                                        m.failed > 0 && styles.tdBad,
                                    ]}>
                                        {m.failed}
                                    </Text>
                                </View>
                            ))}
                        </Card>
                    )}

                    <View style={styles.note}>
                        <Icon name="information-outline" size={scale(15)} color="#64748B" />
                        <Text style={styles.noteText}>
                            Importing and repairing run from the web. Those actions post in bulk to
                            the live books, so the app shows the state rather than triggering them.
                        </Text>
                    </View>

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
    heroTitle: { fontSize: scale(15), fontWeight: '700', color: '#0F172A' },
    heroText: { fontSize: scale(11), color: '#64748b', marginTop: scale(6), lineHeight: scale(16) },

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
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: scale(10) },
    cardHeadText: { flex: 1 },
    eyebrow: { fontSize: scale(9), fontWeight: '700', color: '#0F766E', letterSpacing: 0.6 },
    cardTitle: { fontSize: scale(13.5), fontWeight: '700', color: '#0F172A', marginTop: scale(2) },

    countChip: { borderRadius: 20, paddingHorizontal: scale(10), paddingVertical: scale(4) },
    chipOk: { backgroundColor: '#ECFDF5' },
    chipBad: { backgroundColor: '#FEF2F2' },
    countChipText: { fontSize: scale(10), fontWeight: '700' },

    check: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(8),
        borderRadius: 10,
        padding: scale(10),
        marginBottom: scale(7),
    },
    checkOk: { backgroundColor: '#ECFDF5' },
    checkBad: { backgroundColor: '#FEF2F2' },
    checkText: { flex: 1 },
    checkLabel: { fontSize: scale(11.5), fontWeight: '700', color: '#0F172A' },
    checkDetail: { fontSize: scale(10.5), color: '#475569', marginTop: scale(2) },
    checkedAt: { fontSize: scale(10), color: '#94A3B8', marginTop: scale(4) },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scale(7),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    rowLabel: { flex: 1, fontSize: scale(11.5), color: '#64748b' },
    rowValue: { fontSize: scale(11.5), color: '#0F172A', fontWeight: '600', marginLeft: scale(8) },

    progressTrack: {
        height: scale(8),
        borderRadius: scale(4),
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
        marginTop: scale(10),
    },
    progressFill: { height: '100%', borderRadius: scale(4), backgroundColor: '#0F766E' },
    progressNote: { fontSize: scale(10), color: '#94A3B8', marginTop: scale(6) },

    totalsRow: { flexDirection: 'row', gap: scale(10), marginBottom: scale(12) },
    totalTile: { flex: 1, borderRadius: 10, paddingVertical: scale(12), alignItems: 'center' },
    tileOk: { backgroundColor: '#ECFDF5' },
    tileBad: { backgroundColor: '#FEF2F2' },
    tileValue: { fontSize: scale(18), fontWeight: '700', color: '#047857' },
    tileValueBad: { color: '#B91C1C' },
    tileLabel: { fontSize: scale(10), color: '#64748b', marginTop: scale(2) },

    tHead: {
        flexDirection: 'row',
        paddingBottom: scale(6),
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    th: { fontSize: scale(9), color: '#94A3B8', fontWeight: '700', letterSpacing: 0.4 },
    tr: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(7),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    td: { fontSize: scale(11.5), color: '#334155' },
    tdBad: { color: '#B91C1C', fontWeight: '700' },
    colMod: { flex: 1, paddingRight: scale(6) },
    colNum: { width: scale(64), textAlign: 'right' },
    modType: { fontSize: scale(11.5), color: '#0F172A', fontWeight: '600' },
    modName: { fontSize: scale(9.5), color: '#94A3B8' },

    note: {
        flexDirection: 'row',
        gap: scale(8),
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: scale(12),
        marginTop: scale(12),
    },
    noteText: { flex: 1, fontSize: scale(10.5), color: '#64748b', lineHeight: scale(15) },
});

export default ImportSyncV2;
