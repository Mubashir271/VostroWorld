// Setup wizard — the app's mirror of the web's "Finance V2 — First-time setup".
//
// Shows where setup has got to (the seven steps, with the current one marked),
// the company and books settings already saved, and what the later mapping
// steps have to work with (payment methods, legacy expense categories, package
// categories).
//
// Read-only. The web's "Save & continue" writes the company settings and
// advances the books start date for the whole organisation, so the form is
// shown as saved values rather than editable fields until that write is
// something we want the app to make.
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
    getFinanceV2Dashboard,
    getWizardOptions,
    FinanceV2Dashboard,
    WizardOptions,
} from '../../../api/financeV2';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

/** The web's step captions, in order. */
const STEP_LABELS: Record<string, string> = {
    company_settings: 'Company & books start date',
    chart_of_accounts: 'Chart of accounts',
    opening_balances: 'Opening balances',
    payment_method_mapping: 'Payment methods',
    revenue_mapping: 'Revenue mapping',
    expense_mapping: 'Expense categories',
    complete: 'Finish',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const dayOf = (s?: string | null) => (s ? String(s).slice(0, 10) : '—');

const Card = ({ eyebrow, title, children }: {
    eyebrow?: string; title?: string; children: React.ReactNode;
}) => (
    <View style={styles.card}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        {!!title && <Text style={styles.cardTitle}>{title}</Text>}
        {children}
    </View>
);

const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
    </View>
);

const SetupWizardV2 = () => {
    const navigation = useNavigation<any>();

    const [dash, setDash] = useState<FinanceV2Dashboard | null>(null);
    const [opts, setOpts] = useState<WizardOptions | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            const [d, o] = await Promise.all([
                getFinanceV2Dashboard().catch(() => null),
                getWizardOptions().catch(() => null),
            ]);
            setDash(d);
            setOpts(o);
            if (!d && !o) { setError('Could not load the setup state.'); }
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load the setup state.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    const setup = dash?.setup;
    const company = dash?.hub?.company;
    // `setup.settings` is the raw row; `hub.company` is the resolved view the
    // web's header uses, and the two disagree while setup is mid-flight — the
    // resolved one is what the page shows.
    const settings = setup?.settings;
    const step = company?.setup_step ?? setup?.setup_step ?? 0;
    const done = company?.setup_completed ?? setup?.setup_completed ?? false;

    const stepEntries = Object.entries(setup?.steps ?? {})
        .sort((a, b) => Number(a[0]) - Number(b[0]));

    return (
        <View style={styles.container}>
            <AppHeader
                title="Setup Wizard"
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
                        <Text style={styles.heroTitle}>Finance V2 — First-time setup</Text>
                        <Text style={styles.heroText}>
                            Double-entry books. After launch, enter all new finance activity in
                            Finance V2 — legacy screens are for history only.
                        </Text>
                        <View style={[styles.heroChip, done ? styles.chipOk : styles.chipWarn]}>
                            <Icon
                                name={done ? 'check-circle-outline' : 'progress-clock'}
                                size={scale(14)}
                                color={done ? '#047857' : '#B45309'}
                            />
                            <Text style={[styles.heroChipText, { color: done ? '#047857' : '#B45309' }]}>
                                {done ? 'Setup complete' : `Step ${step || 1} of ${stepEntries.length || 7}`}
                            </Text>
                        </View>
                    </View>

                    {!!error && (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* ── Steps ────────────────────────────────────────────── */}
                    <Card eyebrow="STEPS" title="Setup progress">
                        {stepEntries.map(([n, key]) => {
                            const num = Number(n);
                            const passed = done || num < step;
                            const current = !done && num === step;
                            return (
                                <View key={n} style={styles.step}>
                                    <View style={[
                                        styles.stepDot,
                                        passed && styles.stepDotDone,
                                        current && styles.stepDotNow,
                                    ]}>
                                        {passed
                                            ? <Icon name="check" size={scale(12)} color="#fff" />
                                            : <Text style={[styles.stepNum, current && styles.stepNumNow]}>{n}</Text>}
                                    </View>
                                    <Text style={[styles.stepLabel, current && styles.stepLabelNow]}>
                                        {STEP_LABELS[key] ?? key}
                                    </Text>
                                </View>
                            );
                        })}
                    </Card>

                    {/* ── Company & books ──────────────────────────────────── */}
                    <Card eyebrow="STEP 1" title="Company & books start date">
                        <Row label="Company name" value={company?.name || settings?.company_name || '—'} />
                        <Row label="Currency" value={company?.currency || settings?.currency || '—'} />
                        <Row
                            label="Fiscal year starts"
                            value={settings?.fiscal_year_start_month
                                ? MONTHS[settings.fiscal_year_start_month - 1]
                                : '—'}
                        />
                        <Row
                            label="Books start date"
                            value={dayOf(company?.books_start_date || settings?.books_start_date)}
                        />
                    </Card>

                    {/* ── What the mapping steps have ──────────────────────── */}
                    <Card eyebrow="STEPS 4–6" title="Available for mapping">
                        <Row label="Payment methods" value={`${opts?.payment_methods?.length ?? 0}`} />
                        <Row label="Package categories" value={`${opts?.package_categories?.length ?? 0}`} />
                        <Row
                            label="Legacy expense categories"
                            value={`${opts?.legacy_expense_categories?.length ?? 0}`}
                        />
                    </Card>

                    {!!opts?.payment_methods?.length && (
                        <Card title="Payment methods">
                            {opts.payment_methods.map(m => (
                                <View key={m.id} style={styles.chipRow}>
                                    <Text style={styles.chipRowText}>{m.name}</Text>
                                    <Text style={styles.chipRowId}>#{m.id}</Text>
                                </View>
                            ))}
                        </Card>
                    )}

                    {!!opts?.package_categories?.length && (
                        <Card title="Package categories">
                            {opts.package_categories.map(c => (
                                <View key={c.id} style={styles.chipRow}>
                                    <Text style={styles.chipRowText}>{c.name}</Text>
                                    <Text style={styles.chipRowId}>#{c.id}</Text>
                                </View>
                            ))}
                        </Card>
                    )}

                    <View style={styles.note}>
                        <Icon name="information-outline" size={scale(15)} color="#64748B" />
                        <Text style={styles.noteText}>
                            Running the wizard writes the organisation's books settings, so it stays
                            on the web for now. This screen shows where setup has got to.
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
    heroChip: {
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
    chipWarn: { backgroundColor: '#FEF3C7' },
    heroChipText: { fontSize: scale(10.5), fontWeight: '700' },

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
    eyebrow: { fontSize: scale(9), fontWeight: '700', color: '#0F766E', letterSpacing: 0.6 },
    cardTitle: { fontSize: scale(13.5), fontWeight: '700', color: '#0F172A', marginTop: scale(2), marginBottom: scale(10) },

    step: { flexDirection: 'row', alignItems: 'center', gap: scale(10), paddingVertical: scale(6) },
    stepDot: {
        width: scale(22),
        height: scale(22),
        borderRadius: scale(11),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    stepDotDone: { backgroundColor: '#0F766E' },
    stepDotNow: { backgroundColor: '#FEF3C7' },
    stepNum: { fontSize: scale(10), fontWeight: '700', color: '#94A3B8' },
    stepNumNow: { color: '#B45309' },
    stepLabel: { flex: 1, fontSize: scale(11.5), color: '#334155' },
    stepLabelNow: { fontWeight: '700', color: '#0F172A' },

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

    chipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scale(6),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    chipRowText: { flex: 1, fontSize: scale(11.5), color: '#334155' },
    chipRowId: { fontSize: scale(10), color: '#94A3B8' },

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

export default SetupWizardV2;
