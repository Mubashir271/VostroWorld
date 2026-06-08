// src/screens/Trainer/MyClientsScreen.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import AppHeader from '../../components/AppHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import { showSnackbar } from '../../redux/slices/snackbarSlice';
import { getTrainerClients, TrainerClient } from '../../api/trainer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const SESSION_STATUS_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
    Delivered:  { bg: '#E6F4EA', text: '#2E7D32', icon: 'check-circle' },
    'No Show':  { bg: '#FFEBEE', text: '#C62828', icon: 'close-circle' },
    Cancel:     { bg: '#FFF3E0', text: '#E65100', icon: 'cancel' },
    Pending:    { bg: '#F3E5F5', text: '#6A1B9A', icon: 'clock-outline' },
    default:    { bg: '#F5F5F5', text: '#666',    icon: 'help-circle-outline' },
};

const getStatusStyle = (status: string) =>
    SESSION_STATUS_STYLE[status] ?? SESSION_STATUS_STYLE.default;

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={styles.statPill}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const ClientCard = ({
    item,
    onPress,
}: {
    item: TrainerClient;
    onPress: () => void;
}) => {
    const statusStyle = getStatusStyle(item.today_session_status ?? '');
    const progress = item.total_sessions > 0
        ? item.sessions_delivered / item.total_sessions
        : 0;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            {/* ── Top row: name + today status badge ── */}
            <View style={styles.cardTop}>
                <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>
                        {(item.client_name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                </View>

                <View style={styles.cardInfo}>
                    <Text style={styles.clientName} numberOfLines={1}>
                        {item.client_name ?? 'Unknown'}
                    </Text>
                    <Text style={styles.packageName} numberOfLines={1}>
                        {item.package_name ?? '—'}
                    </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Icon name={statusStyle.icon} size={13} color={statusStyle.text} />
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {item.today_session_status ?? 'N/A'}
                    </Text>
                </View>
            </View>

            {/* ── Progress bar ── */}
            <View style={styles.progressWrap}>
                <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                    {item.sessions_delivered}/{item.total_sessions} sessions
                </Text>
            </View>

            {/* ── Stats row ── */}
            <View style={styles.statsRow}>
                <StatPill label="Remaining"  value={item.sessions_remaining ?? 0} color="#1565C0" />
                <StatPill label="Delivered"  value={item.sessions_delivered ?? 0} color="#2E7D32" />
                <StatPill label="No Shows"   value={item.no_show_count ?? 0}      color="#C62828" />
            </View>

            {/* ── Bottom row: time slot + present indicator ── */}
            <View style={styles.cardBottom}>
                <View style={styles.timeSlotRow}>
                    <Icon name="clock-outline" size={14} color="#999" />
                    <Text style={styles.timeSlotText}>
                        {item.today_time_slot ?? 'No slot today'}
                    </Text>
                </View>
                <View style={[
                    styles.presentDot,
                    { backgroundColor: item.is_client_present ? '#2E7D32' : '#CCC' }
                ]}>
                    <Text style={styles.presentText}>
                        {item.is_client_present ? 'Present' : 'Absent'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ─── Summary Bar ──────────────────────────────────────────────────────────────

const SummaryBar = ({
    total,
    isTrainerPresent,
    checkDate,
}: {
    total: number;
    isTrainerPresent: boolean;
    checkDate: string;
}) => (
    <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{total}</Text>
            <Text style={styles.summaryLabel}>Clients</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
            <View style={[styles.presenceDot, { backgroundColor: isTrainerPresent ? '#2E7D32' : '#E63946' }]} />
            <Text style={styles.summaryLabel}>
                {isTrainerPresent ? 'You\'re Present' : 'Not Marked'}
            </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
            <Icon name="calendar-today" size={16} color="#666" />
            <Text style={styles.summaryLabel}>{checkDate}</Text>
        </View>
    </View>
);

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

type FilterTab = 'All' | 'Present' | 'Delivered' | 'No Show';
const TABS: FilterTab[] = ['All', 'Present', 'Delivered', 'No Show'];

// ─── Main Screen ──────────────────────────────────────────────────────────────

const MyClientsScreen = () => {
    const { profile } = useSelector((state: RootState) => state.user);
    const dispatch = useDispatch();
    const navigation = useNavigation<any>();

    const branchId = profile?.branchId ?? 1;

    const [clients, setClients]               = useState<TrainerClient[]>([]);
    const [loading, setLoading]               = useState(true);
    const [refreshing, setRefreshing]         = useState(false);
    const [isTrainerPresent, setIsTrainerPresent] = useState(false);
    const [checkDate, setCheckDate]           = useState(today());
    const [total, setTotal]                   = useState(0);
    const [search, setSearch]                 = useState('');
    const [activeTab, setActiveTab]           = useState<FilterTab>('All');

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchClients = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);

            const data = await getTrainerClients({
                branch_id: branchId,
                check_date: today(),
            });

            const rows: TrainerClient[] = Array.isArray(data?.data)
                ? data.data.filter(Boolean)
                : [];

            setClients(rows);
            setTotal(data?.total ?? rows.length);
            setIsTrainerPresent(data?.is_trainer_present ?? false);
            setCheckDate(data?.check_date ?? today());
        } catch (e: any) {
            dispatch(showSnackbar({
                message: e?.response?.data?.message ?? 'Could not load clients.',
                type: 'error',
            }));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [branchId]);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    // ── Filter logic ──────────────────────────────────────────────────────────
    const filtered = clients.filter(c => {
        const matchSearch = search.trim() === '' ||
            (c.client_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (c.package_name ?? '').toLowerCase().includes(search.toLowerCase());

        const matchTab =
            activeTab === 'All'       ? true :
            activeTab === 'Present'   ? c.is_client_present === 1 :
            activeTab === 'Delivered' ? c.today_session_status === 'Delivered' :
            activeTab === 'No Show'   ? c.today_session_status === 'No Show' :
            true;

        return matchSearch && matchTab;
    });

    // ── Empty state ───────────────────────────────────────────────────────────
    const renderEmpty = () => (
        <View style={styles.emptyState}>
            <Icon name="account-group-outline" size={56} color="#DDD" />
            <Text style={styles.emptyTitle}>No clients found</Text>
            <Text style={styles.emptySub}>
                {search ? 'Try a different search term.' : 'Pull down to refresh.'}
            </Text>
        </View>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#E63946" />
                <Text style={styles.loadingText}>Loading clients…</Text>
            </View>
        );
    }

    return (
        <>
            <AppHeader
                title="My Clients"
                leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
                rightIcon={<NotificationSVG width={24} height={24} />}
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => navigation.navigate('Notifications')}
                backgroundColor="#FFE5E5"
            />

            <View style={styles.screen}>
                {/* ── Summary bar ── */}
                <SummaryBar
                    total={total}
                    isTrainerPresent={isTrainerPresent}
                    checkDate={checkDate}
                />

                {/* ── Search ── */}
                <View style={styles.searchWrap}>
                    <Icon name="magnify" size={18} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or package…"
                        placeholderTextColor="#BBB"
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Icon name="close-circle" size={18} color="#BBB" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Filter tabs ── */}
                <View style={styles.tabsRow}>
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Client list ── */}
                <FlatList
                    data={filtered}
                    keyExtractor={(item, i) => String(item?.order_id ?? item?.client_id ?? i)}
                    renderItem={({ item }) => (
                        <ClientCard
                            item={item}
                            onPress={() =>
                                navigation.navigate('MarkAttendance', {
                                    client: item,
                                })
                            }
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchClients(true)}
                            colors={['#E63946']}
                            tintColor="#E63946"
                        />
                    }
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                />
            </View>
        </>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PRIMARY   = '#E63946';
const BG        = '#F9F9FB';
const CARD_BG   = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID  = '#555';
const TEXT_LITE = '#999';
const BORDER    = '#EFEFEF';

const styles = StyleSheet.create({
    screen:      { flex: 1, backgroundColor: BG },
    centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
    loadingText: { marginTop: 12, fontSize: 14, color: TEXT_LITE },

    // ── Summary bar ──
    summaryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD_BG,
        marginHorizontal: 16,
        marginTop: 14,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    summaryItem:   { flex: 1, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
    summaryValue:  { fontSize: 18, fontWeight: '700', color: TEXT_DARK },
    summaryLabel:  { fontSize: 12, color: TEXT_MID },
    summaryDivider:{ width: 1, height: 28, backgroundColor: BORDER },
    presenceDot:   { width: 10, height: 10, borderRadius: 5 },

    // ── Search ──
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD_BG,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: BORDER,
    },
    searchIcon:  { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: TEXT_DARK, padding: 0 },

    // ── Tabs ──
    tabsRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER,
    },
    tabActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
    tabText:       { fontSize: 13, color: TEXT_MID, fontWeight: '500' },
    tabTextActive: { color: '#FFF', fontWeight: '700' },

    // ── List ──
    listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

    // ── Card ──
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    cardTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFE5E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText:  { fontSize: 18, fontWeight: '700', color: PRIMARY },
    cardInfo:    { flex: 1, marginRight: 8 },
    clientName:  { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
    packageName: { fontSize: 12, color: TEXT_LITE, marginTop: 2 },

    // Status badge
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    statusText: { fontSize: 11, fontWeight: '700' },

    // Progress
    progressWrap:  { marginBottom: 12 },
    progressBg:    { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
    progressFill:  { height: '100%', backgroundColor: PRIMARY, borderRadius: 3 },
    progressLabel: { fontSize: 11, color: TEXT_LITE, textAlign: 'right' },

    // Stats
    statsRow:  { flexDirection: 'row', gap: 8, marginBottom: 12 },
    statPill:  { flex: 1, backgroundColor: '#F9F9FB', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    statValue: { fontSize: 16, fontWeight: '700' },
    statLabel: { fontSize: 10, color: TEXT_LITE, marginTop: 2 },

    // Bottom
    cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timeSlotRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeSlotText: { fontSize: 12, color: TEXT_MID },
    presentDot:   { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    presentText:  { fontSize: 11, fontWeight: '700', color: '#FFF' },

    // Empty
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT_MID, marginTop: 16 },
    emptySub:   { fontSize: 13, color: TEXT_LITE, marginTop: 6 },
});

export default MyClientsScreen;