// Marketing Dashboard — the app's mirror of the web's "Social Media Dashboard"
// (Marketing › Marketing Dashboard).
//
// Structure and data follow the web page section for section (Today at a
// glance → Lead funnel → By contact medium / By offer → This month → Recent
// leads); the styling is the app's own card idiom, not the web's.
//
// Data: /v1/social-leads/stats twice (selected day, then month to date) plus
// /v1/social-leads for the recent list — the same three calls the web makes
// (HAR, 21 Sep 2026). branch_id is omitted for All Branches.
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
import BurgerSVG from '../../../assets/svg/BurgerSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
    getSocialLeadStats,
    getSocialLeads,
    SocialLeadStats,
    SocialLeadRow,
} from '../../../api/marketing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const LEADS = '#E63946';
const OK = '#0F766E';
const WARN = '#F59E0B';

const iso = (d: Date) => {
    // Local calendar date — toISOString() would shift back a day west of UTC.
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
};

const monthBounds = (d: Date) => ({
    from: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
    to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
});

// ── Small presentational pieces ──────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.sectionTitle}>{children}</Text>
);

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

/** One step of the lead funnel — the web's four boxes. */
const FunnelBox = ({ label, value }: { label: string; value: number }) => (
    <View style={styles.funnelBox}>
        <Text style={styles.funnelLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.funnelValue}>{value}</Text>
    </View>
);

/** Horizontal bar with the count at the end, as the web's breakdowns render. */
const BarRow = ({ label, value, max, color }: {
    label: string; value: number; max: number; color: string;
}) => (
    <View style={styles.barRow}>
        <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
        <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.barValue}>{value}</Text>
    </View>
);

const YesNo = ({ on }: { on: boolean }) => (
    <View style={[styles.yesNo, on ? styles.yesNoOn : styles.yesNoOff]}>
        <Text style={[styles.yesNoText, on ? styles.yesNoTextOn : styles.yesNoTextOff]}>
            {on ? 'Yes' : 'No'}
        </Text>
    </View>
);

// ── Screen ───────────────────────────────────────────────────────────────────

// The web's Recent leads panel asks for 12 and prints them all, so mirror that
// rather than paginating: this is a dashboard panel, not the Social Leads list.
const RECENT_LIMIT = 12;

const MarketingDashboard = () => {
    const navigation = useNavigation<any>();

    // branch_id is optional on every social-leads call and omitting it means
    // all branches, so super admin can start here with nothing chosen.
    const { options, loadingOptions } = useBranchSelector();

    const [branchId, setBranchId] = useState<number | null>(null);
    const [branchLabel, setBranchLabel] = useState('All Branches');
    const [branchOpen, setBranchOpen] = useState(false);

    const [date, setDate] = useState(new Date());
    const [dateOpen, setDateOpen] = useState(false);

    const [day, setDay] = useState<SocialLeadStats | null>(null);
    const [month, setMonth] = useState<SocialLeadStats | null>(null);
    const [leads, setLeads] = useState<SocialLeadRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            const d = iso(date);
            const { from, to } = monthBounds(date);
            const [dayStats, monthStats, recent] = await Promise.all([
                getSocialLeadStats({ branch_id: branchId, date: d }),
                getSocialLeadStats({ branch_id: branchId, from_date: from, to_date: to }),
                getSocialLeads({ branch_id: branchId, date: d, per_page: RECENT_LIMIT }).catch(() => []),
            ]);
            setDay(dayStats);
            setMonth(monthStats);
            setLeads(recent);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load the dashboard.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, [branchId, date]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    const onDateChange = (_e: DateTimePickerEvent, picked?: Date) => {
        setDateOpen(false);
        if (picked) { setDate(picked); }
    };

    const mediums = Object.entries(day?.by_contact_medium ?? {})
        .map(([label, value]) => ({ label, value: Number(value) || 0 }))
        .filter(m => m.value > 0)
        .sort((a, b) => b.value - a.value);
    const maxMedium = Math.max(...mediums.map(m => m.value), 1);

    const offers = (day?.by_offer ?? []).filter(o => o.total > 0);
    const maxOffer = Math.max(...offers.map(o => o.total), 1);

    return (
        <View style={styles.container}>
            <AppHeader
                title="Marketing Dashboard"
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
                <View style={styles.centre}>
                    <ActivityIndicator size="large" color="#E10600" />
                </View>
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

                        <TouchableOpacity style={styles.control} onPress={() => setDateOpen(true)} activeOpacity={0.7}>
                            <Icon name="calendar" size={scale(15)} color="#64748B" />
                            <Text style={styles.controlText}>{iso(date)}</Text>
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

                    {/* ── Your workspace ────────────────────────────────────── */}
                    <SectionTitle>Your workspace</SectionTitle>
                    <View style={styles.workspaceRow}>
                        <TouchableOpacity
                            style={styles.workspaceBtn}
                            onPress={() => navigation.navigate('SocialLeads')}
                            activeOpacity={0.8}
                        >
                            <Icon name="account-multiple-outline" size={scale(17)} color="#334155" />
                            <Text style={styles.workspaceText}>Social Leads</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.workspaceBtn}
                            // Opens Social Leads with its Add lead dialog already up.
                            onPress={() => navigation.navigate('SocialLeads', { openAdd: true })}
                            activeOpacity={0.8}
                        >
                            <Icon name="plus-circle-outline" size={scale(17)} color="#E63946" />
                            <Text style={styles.workspaceText}>Add Lead</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── Today at a glance ─────────────────────────────────── */}
                    <SectionTitle>Today at a glance · {branchLabel}</SectionTitle>
                    <View style={styles.glanceGrid}>
                        <GlanceCard
                            label="Leads Today" accent={LEADS} iconName="cloud-download-outline"
                            value={`${day?.total_leads ?? 0}`}
                            sub={`WhatsApp detail ${day?.whatsapp_detail ?? 0}`}
                        />
                        <GlanceCard
                            label="Interested" accent="#2563EB" iconName="thumb-up-outline"
                            value={`${day?.interested ?? 0}`}
                            sub={`Not interested ${day?.not_interested ?? 0}`}
                        />
                        <GlanceCard
                            label="Visits Scheduled" accent={WARN} iconName="calendar-check"
                            value={`${day?.visit_scheduled ?? 0}`}
                            sub={`Completed ${day?.visit_completed ?? 0}`}
                        />
                        <GlanceCard
                            label="Payments" accent="#DB2777" iconName="cash-multiple"
                            value={`${day?.payment_received ?? 0}`}
                            sub={`Conversion ${day?.conversion_rate ?? 0}%`}
                        />
                        <GlanceCard
                            label="Calls Answered" accent="#7C3AED" iconName="phone-in-talk"
                            value={`${day?.first_call_answered ?? 0}`}
                            sub="First call answered"
                        />
                        <GlanceCard
                            label="Month to Date" accent={OK} iconName="chart-bar"
                            value={`${month?.total_leads ?? 0}`}
                            sub={`${month?.payment_received ?? 0} paid · ${month?.conversion_rate ?? 0}%`}
                        />
                    </View>

                    {/* ── Lead funnel ───────────────────────────────────────── */}
                    <Card title="Lead funnel (selected day)">
                        <View style={styles.funnelGrid}>
                            <FunnelBox label="Leads" value={day?.total_leads ?? 0} />
                            <FunnelBox label="Interested" value={day?.interested ?? 0} />
                            <FunnelBox label="Visit done" value={day?.visit_completed ?? 0} />
                            <FunnelBox label="Paid" value={day?.payment_received ?? 0} />
                        </View>
                    </Card>

                    {/* ── Breakdowns ────────────────────────────────────────── */}
                    <Card title="By contact medium">
                        {mediums.length ? (
                            mediums.map(m => (
                                <BarRow key={m.label} label={m.label} value={m.value} max={maxMedium} color={OK} />
                            ))
                        ) : (
                            <Text style={styles.empty}>No leads on this date.</Text>
                        )}
                    </Card>

                    <Card title="By offer">
                        {offers.length ? (
                            offers.map(o => (
                                <BarRow key={o.offer} label={o.offer} value={o.total} max={maxOffer} color="#2563EB" />
                            ))
                        ) : (
                            <Text style={styles.empty}>No leads on this date.</Text>
                        )}
                    </Card>

                    {/* ── This month ────────────────────────────────────────── */}
                    <SectionTitle>This month</SectionTitle>
                    <Card>
                        <View style={styles.monthGrid}>
                            <FunnelBox label="Leads" value={month?.total_leads ?? 0} />
                            <FunnelBox label="Interested" value={month?.interested ?? 0} />
                            <FunnelBox label="Visits" value={month?.visit_completed ?? 0} />
                            <FunnelBox label="Payments" value={month?.payment_received ?? 0} />
                        </View>
                        <View style={styles.conversionRow}>
                            <Text style={styles.conversionLabel}>Conversion</Text>
                            <Text style={styles.conversionValue}>{month?.conversion_rate ?? 0}%</Text>
                        </View>
                    </Card>

                    {/* ── Recent leads ──────────────────────────────────────── */}
                    <SectionTitle>Recent leads (selected day)</SectionTitle>
                    {leads.length ? (
                        leads.map(l => (
                            <View key={l.id} style={styles.leadCard}>
                                <View style={styles.leadTop}>
                                    <Text style={styles.leadName} numberOfLines={1}>{l.customer_name || '—'}</Text>
                                    <Text style={styles.leadBranch}>{l.branch?.name ?? ''}</Text>
                                </View>
                                {/* The web's lead code opens the Social Leads page. */}
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('SocialLeads')}
                                    activeOpacity={0.6}
                                >
                                    <Text style={styles.leadCodeLink}>{l.lead_code}</Text>
                                </TouchableOpacity>
                                <View style={styles.leadMeta}>
                                    <View style={styles.leadPill}>
                                        <Text style={styles.leadPillText}>{l.contact_medium || '—'}</Text>
                                    </View>
                                    <Text style={styles.leadOffer} numberOfLines={1}>{l.offer || '—'}</Text>
                                </View>
                                <View style={styles.leadFlags}>
                                    <Text style={styles.leadFlagLabel}>Interested</Text>
                                    <YesNo on={l.interested} />
                                    <Text style={styles.leadFlagLabel}>Paid</Text>
                                    <YesNo on={l.payment_received} />
                                </View>
                            </View>
                        ))
                    ) : (
                        <Card><Text style={styles.empty}>No leads on this date.</Text></Card>
                    )}

                    <View style={{ height: scale(40) }} />
                </ScrollView>
            )}

            {/* Branch picker. "All Branches" is a real option here, because the
                social-leads endpoints treat a missing branch_id as all. */}
            <Modal visible={branchOpen} transparent animationType="fade" onRequestClose={() => setBranchOpen(false)}>
                <TouchableOpacity style={styles.modalBack} activeOpacity={1} onPress={() => setBranchOpen(false)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Select Branch</Text>
                        {loadingOptions ? (
                            <ActivityIndicator color="#E10600" style={styles.modalLoader} />
                        ) : (
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
                        )}
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

    workspaceRow: { flexDirection: 'row', gap: scale(10) },
    workspaceBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(7),
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: scale(14),
    },
    workspaceText: { fontSize: scale(12), color: '#334155', fontWeight: '700' },

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

    funnelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
    funnelBox: {
        flexGrow: 1,
        minWidth: '46%',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        paddingVertical: scale(12),
        alignItems: 'center',
    },
    funnelLabel: {
        fontSize: scale(9.5),
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    funnelValue: { fontSize: scale(17), fontWeight: '700', color: '#0F172A', marginTop: scale(4) },

    conversionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: scale(10),
        paddingTop: scale(10),
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    conversionLabel: { fontSize: scale(11.5), color: '#64748b' },
    conversionValue: { fontSize: scale(13), fontWeight: '700', color: '#0F172A' },

    barRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingVertical: scale(6) },
    barLabel: { width: '30%', fontSize: scale(11), color: '#334155' },
    barTrack: { flex: 1, height: scale(8), borderRadius: scale(4), backgroundColor: '#F1F5F9', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: scale(4) },
    barValue: { width: scale(30), textAlign: 'right', fontSize: scale(11.5), fontWeight: '700', color: '#0F172A' },

    empty: { fontSize: scale(11.5), color: '#94A3B8', textAlign: 'center', paddingVertical: scale(20) },

    leadCard: {
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
    leadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    leadName: { flex: 1, fontSize: scale(13), fontWeight: '700', color: '#0F172A' },
    leadBranch: { fontSize: scale(10.5), color: '#64748b', marginLeft: scale(8) },
    leadCode: { fontSize: scale(9.5), color: '#94A3B8', marginTop: scale(2) },
    leadCodeLink: {
        fontSize: scale(9.5),
        color: '#E63946',
        marginTop: scale(2),
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    leadMeta: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(8) },
    leadPill: {
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: scale(9),
        paddingVertical: scale(3),
    },
    leadPillText: { fontSize: scale(9.5), color: '#475569', fontWeight: '600' },
    leadOffer: { flex: 1, fontSize: scale(11), color: '#334155' },
    leadFlags: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        marginTop: scale(10),
        paddingTop: scale(8),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#F1F5F9',
    },
    leadFlagLabel: { fontSize: scale(10), color: '#64748b' },

    yesNo: { borderRadius: 20, paddingHorizontal: scale(8), paddingVertical: scale(2), marginRight: scale(6) },
    yesNoOn: { backgroundColor: '#ECFDF5' },
    yesNoOff: { backgroundColor: '#FEF2F2' },
    yesNoText: { fontSize: scale(9.5), fontWeight: '700' },
    yesNoTextOn: { color: '#047857' },
    yesNoTextOff: { color: '#B91C1C' },

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

export default MarketingDashboard;
