// Journals — the app's mirror of the web's "Finance V2 › Journal entries".
//
// Each entry expands to show its debit/credit lines, which is the web's "+"
// toggle on the row.
//
// Read-only for now. The web row carries a Void button and the page a "New
// manual entry" button; both write into the live books (47k posted journals),
// so they are deliberately not wired up here yet.
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
import { getJournals, JournalEntry } from '../../../api/financeV2';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const iso = (d: Date) => {
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** The API returns full ISO timestamps; the day is all this list needs. */
const dayOf = (s?: string | null) => (s ? String(s).slice(0, 10) : '—');

const STATUS_TINT: Record<string, { bg: string; fg: string }> = {
    posted: { bg: '#ECFDF5', fg: '#047857' },
    voided: { bg: '#FEF2F2', fg: '#B91C1C' },
    draft: { bg: '#F1F5F9', fg: '#475569' },
};

const JournalsV2 = () => {
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

    const [source, setSource] = useState('');
    const [sourceOpen, setSourceOpen] = useState(false);

    const [rows, setRows] = useState<JournalEntry[]>([]);
    const [open, setOpen] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            setRows(await getJournals({
                from: iso(from),
                to: iso(to),
                branch_id: branchId,
                source,
                per_page: 100,
            }));
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load journal entries.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, [from, to, branchId, source]);

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

    const toggle = (id: number) => setOpen(prev => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); } else { next.add(id); }
        return next;
    });

    // The Source filter offers whatever the loaded page actually contains,
    // rather than a hardcoded list the backend might not match.
    const sources = Array.from(new Set(rows.map(r => r.source_type).filter(Boolean)));

    return (
        <View style={styles.container}>
            <AppHeader
                title="Journals"
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

                    <TouchableOpacity style={styles.control} onPress={() => setSourceOpen(true)} activeOpacity={0.7}>
                        <Icon name="filter-variant" size={scale(15)} color="#64748B" />
                        <Text style={styles.controlText}>{source || 'All sources'}</Text>
                        <Icon name="chevron-down" size={scale(16)} color="#64748B" />
                    </TouchableOpacity>

                    {picker && (
                        <DateTimePicker
                            value={picker === 'from' ? from : to}
                            mode="date"
                            display="default"
                            onChange={onPickDate}
                        />
                    )}

                    {!!error && (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <Text style={styles.countNote}>
                        {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                    </Text>

                    {rows.length ? rows.map(j => {
                        const tint = STATUS_TINT[j.status] ?? STATUS_TINT.draft;
                        const isOpen = open.has(j.id);
                        return (
                            <View key={j.id} style={styles.entry}>
                                <TouchableOpacity
                                    style={styles.entryHead}
                                    onPress={() => toggle(j.id)}
                                    activeOpacity={0.7}
                                >
                                    <Icon
                                        name={isOpen ? 'chevron-down' : 'chevron-right'}
                                        size={scale(18)}
                                        color="#94A3B8"
                                    />
                                    <View style={styles.entryHeadText}>
                                        <Text style={styles.entryRef}>{j.reference}</Text>
                                        <Text style={styles.entryDate}>{dayOf(j.entry_date)}</Text>
                                    </View>
                                    <View style={[styles.statusPill, { backgroundColor: tint.bg }]}>
                                        <Text style={[styles.statusText, { color: tint.fg }]}>{j.status}</Text>
                                    </View>
                                </TouchableOpacity>

                                <Text style={styles.entryDesc} numberOfLines={isOpen ? undefined : 2}>
                                    {j.description}
                                </Text>

                                <View style={styles.entryMeta}>
                                    <View style={styles.sourcePill}>
                                        <Text style={styles.sourceText}>{j.source_type}</Text>
                                    </View>
                                    <Text style={styles.entryAmount}>
                                        Dr {formatCurrency(Number(j.total_debit))} · Cr {formatCurrency(Number(j.total_credit))}
                                    </Text>
                                </View>

                                {isOpen && !!j.lines?.length && (
                                    <View style={styles.lines}>
                                        {j.lines.map(l => (
                                            <View key={l.id} style={styles.lineRow}>
                                                <Text style={styles.lineCode}>{l.account?.code ?? '—'}</Text>
                                                <View style={styles.lineMid}>
                                                    <Text style={styles.lineName} numberOfLines={1}>
                                                        {l.account?.name ?? `Account ${l.account_id}`}
                                                    </Text>
                                                    {!!l.memo && (
                                                        <Text style={styles.lineMemo} numberOfLines={1}>{l.memo}</Text>
                                                    )}
                                                </View>
                                                <Text style={styles.lineAmt}>
                                                    {Number(l.debit) > 0
                                                        ? `Dr ${formatCurrency(Number(l.debit))}`
                                                        : `Cr ${formatCurrency(Number(l.credit))}`}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {!!j.void_reason && (
                                    <Text style={styles.voidNote}>Voided — {j.void_reason}</Text>
                                )}
                            </View>
                        );
                    }) : (
                        <View style={styles.card}>
                            <Text style={styles.empty}>No journal entries for this range.</Text>
                        </View>
                    )}

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

            <Modal visible={sourceOpen} transparent animationType="fade" onRequestClose={() => setSourceOpen(false)}>
                <TouchableOpacity style={styles.modalBack} activeOpacity={1} onPress={() => setSourceOpen(false)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Source</Text>
                        <ScrollView>
                            {['All sources', ...sources].map((s, i) => (
                                <TouchableOpacity
                                    key={s}
                                    style={styles.modalRow}
                                    onPress={() => { setSource(i === 0 ? '' : s); setSourceOpen(false); }}
                                >
                                    <Text style={styles.modalRowText}>{s}</Text>
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

    countNote: { fontSize: scale(10.5), color: '#94A3B8', marginTop: scale(12) },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: scale(14),
        marginTop: scale(10),
    },

    entry: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: scale(12),
        marginTop: scale(10),
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    entryHead: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
    entryHeadText: { flex: 1 },
    entryRef: { fontSize: scale(12.5), fontWeight: '700', color: '#0F172A' },
    entryDate: { fontSize: scale(10), color: '#94A3B8', marginTop: scale(1) },
    statusPill: { borderRadius: 20, paddingHorizontal: scale(9), paddingVertical: scale(3) },
    statusText: { fontSize: scale(9.5), fontWeight: '700', textTransform: 'capitalize' },

    entryDesc: { fontSize: scale(11), color: '#334155', marginTop: scale(6) },

    entryMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(8),
        marginTop: scale(8),
    },
    sourcePill: {
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: scale(9),
        paddingVertical: scale(3),
    },
    sourceText: { fontSize: scale(9.5), color: '#475569', fontWeight: '600' },
    entryAmount: { fontSize: scale(10.5), color: '#0F172A', fontWeight: '600' },

    lines: {
        marginTop: scale(10),
        paddingTop: scale(8),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E2E8F0',
    },
    lineRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingVertical: scale(5) },
    lineCode: { width: scale(40), fontSize: scale(10), color: '#94A3B8', fontWeight: '600' },
    lineMid: { flex: 1 },
    lineName: { fontSize: scale(11), color: '#334155' },
    lineMemo: { fontSize: scale(9.5), color: '#94A3B8' },
    lineAmt: { fontSize: scale(10.5), color: '#0F172A', fontWeight: '600' },

    voidNote: { fontSize: scale(10.5), color: '#B91C1C', marginTop: scale(8) },

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

export default JournalsV2;
