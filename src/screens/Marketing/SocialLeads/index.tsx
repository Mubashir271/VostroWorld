// Social Leads — the app's mirror of the web's "Social Media Leads" page
// (Marketing › Social Leads).
//
// Structure and data follow the web page (filters → stat tiles → Offer-wise →
// lead rows → Edit/Add dialog); the styling is the app's own card idiom.
//
// Data: /v1/social-leads and /v1/social-leads/stats share one query object,
// /v1/social-leads/options fills the dropdowns, and the dialog POSTs or PUTs
// the exact body the web sends (HAR + bundle, 21 Sep 2026).
//
// The web's table is not paginated — it asks for per_page=100 and renders the
// lot — so this list mirrors that rather than paging.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Modal,
    Alert,
    Switch,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
    getSocialLeadsPage,
    getSocialLeadOptions,
    createSocialLead,
    updateSocialLead,
    deleteSocialLead,
    leadProgress,
    leadStatus,
    SocialLeadRow,
    SocialLeadStats,
    SocialLeadOptions,
    SocialLeadPayload,
} from '../../../api/marketing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const iso = (d: Date) => {
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
};

const STATUS_TINT: Record<string, { bg: string; fg: string }> = {
    Paid: { bg: '#ECFDF5', fg: '#047857' },
    Visited: { bg: '#EFF6FF', fg: '#1D4ED8' },
    Interested: { bg: '#FEF3C7', fg: '#B45309' },
    'Not interested': { bg: '#FEF2F2', fg: '#B91C1C' },
    Open: { bg: '#F1F5F9', fg: '#475569' },
};

const EMPTY_FORM = (branchId: number | string): SocialLeadPayload => ({
    branch_id: branchId,
    lead_date: iso(new Date()),
    customer_name: '',
    contact_number: '',
    member_responsible: '',
    member_responsible_id: null,
    contact_medium: '',
    offer: '',
    whatsapp_detail: false,
    comment: '',
    first_call_answered: false,
    interested: false,
    not_interested: false,
    follow_up_calls: false,
    visit_scheduled: false,
    visit_completed: false,
    second_follow_up: false,
    payment_received: false,
    closed_by: '',
    follow_up_comment: '',
});

// ── Small pieces ─────────────────────────────────────────────────────────────

const Card = ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <View style={styles.card}>
        {!!title && <Text style={styles.cardTitle}>{title}</Text>}
        {children}
    </View>
);

const StatTile = ({ label, value }: { label: string; value: string | number }) => (
    <View style={styles.statTile}>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
);

const FieldError = ({ text }: { text?: string }) =>
    text ? (
        <View style={styles.fieldErrorRow}>
            <Icon name="alert-circle-outline" size={scale(12)} color="#B91C1C" />
            <Text style={styles.fieldErrorText}>{text}</Text>
        </View>
    ) : null;

/** Tap-to-open list picker, used for branch, offer, medium and staff. */
const SelectRow = ({ label, value, placeholder, onPress, error }: {
    label: string; value?: string; placeholder: string; onPress: () => void; error?: string;
}) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TouchableOpacity
            style={[styles.select, !!error && styles.inputBad]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>
                {value || placeholder}
            </Text>
            <Icon name="chevron-down" size={scale(16)} color="#64748B" />
        </TouchableOpacity>
        <FieldError text={error} />
    </View>
);

const CheckRow = ({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) => (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.7}>
        <Icon
            name={on ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={scale(19)}
            color={on ? '#E63946' : '#94A3B8'}
        />
        <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
);

// ── Screen ───────────────────────────────────────────────────────────────────

const SocialLeads = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const dispatch = useDispatch();
    const { options: branchOptions, loadingOptions } = useBranchSelector();

    // Filters
    const [branchId, setBranchId] = useState<number | null>(null);
    const [branchLabel, setBranchLabel] = useState('All branches');
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [offer, setOffer] = useState('');
    const [search, setSearch] = useState('');
    const [allDates, setAllDates] = useState(false);

    const [picker, setPicker] = useState<null | 'from' | 'to'>(null);
    const [openList, setOpenList] = useState<null | 'branch' | 'offer' | 'f_branch' | 'f_medium' | 'f_offer' | 'f_member' | 'f_closed'>(null);

    // Data
    const [rows, setRows] = useState<SocialLeadRow[]>([]);
    const [stats, setStats] = useState<SocialLeadStats | null>(null);
    const [opts, setOpts] = useState<SocialLeadOptions | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit / Add dialog
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<SocialLeadPayload>(EMPTY_FORM(''));
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Shown inside the sheet: a Modal renders in its own native hierarchy
    // above the app, so the global snackbar would be hidden behind it.
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            const { rows: list, stats: s } = await getSocialLeadsPage({
                branch_id: branchId,
                offer,
                search,
                from_date: iso(fromDate),
                to_date: iso(toDate),
                allDates,
            });
            setRows(list);
            setStats(s);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load leads.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
        // `search` and `offer` are applied on demand via Apply, not on keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchId, fromDate, toDate, allDates]);

    useEffect(() => { load(); }, [load]);

    // Options follow the branch, as the web refetches them per branch.
    useEffect(() => {
        getSocialLeadOptions(branchId).then(setOpts).catch(() => setOpts(null));
    }, [branchId]);

    // Arriving from the dashboard's "Add Lead" button opens the dialog straight
    // away. The param is cleared so a back-and-forward does not reopen it.
    useEffect(() => {
        if (route.params?.openAdd) {
            openAdd();
            navigation.setParams({ openAdd: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params?.openAdd]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    const onPickDate = (_e: DateTimePickerEvent, picked?: Date) => {
        const which = picker;
        setPicker(null);
        if (!picked || !which) { return; }
        if (which === 'from') { setFromDate(picked); } else { setToDate(picked); }
        setAllDates(false);
    };

    const openAdd = () => {
        setEditingId(null);
        setErrors({});
        setFormError(null);
        setForm(EMPTY_FORM(branchId ?? ''));
        setFormOpen(true);
    };

    const openEdit = (l: SocialLeadRow) => {
        setEditingId(l.id);
        setErrors({});
        setFormError(null);
        setForm({
            branch_id: l.branch_id,
            lead_date: l.lead_date,
            customer_name: l.customer_name ?? '',
            contact_number: l.contact_number ?? '',
            member_responsible: l.member_responsible ?? '',
            member_responsible_id: (l as any).member_responsible_id ?? null,
            contact_medium: l.contact_medium ?? '',
            offer: l.offer ?? '',
            whatsapp_detail: !!l.whatsapp_detail,
            comment: l.comment ?? '',
            first_call_answered: !!l.first_call_answered,
            interested: !!l.interested,
            not_interested: !!l.not_interested,
            follow_up_calls: !!(l as any).follow_up_calls,
            visit_scheduled: !!l.visit_scheduled,
            visit_completed: !!l.visit_completed,
            second_follow_up: !!(l as any).second_follow_up,
            payment_received: !!l.payment_received,
            closed_by: (l as any).closed_by ?? '',
            follow_up_comment: (l as any).follow_up_comment ?? '',
        });
        setFormOpen(true);
    };

    /**
     * Every intake field must be filled before a new lead is saved.
     *
     * The web only stars Branch, Date and Customer name, but a lead with no
     * number, medium or offer is not worth following up, so Add requires the
     * lot. Edit keeps the web's three: existing rows were created under the
     * looser rule and many have a blank member_responsible, and blocking a
     * follow-up edit on a field the lead never had would be worse than the
     * gap it is closing.
     */
    const validate = (): Record<string, string> => {
        const e: Record<string, string> = {};
        if (!form.branch_id) { e.branch_id = 'Pick a branch.'; }
        if (!form.lead_date) { e.lead_date = 'Pick a date.'; }
        if (!form.customer_name.trim()) { e.customer_name = 'Enter the customer name.'; }
        if (editingId) { return e; }
        if (!form.contact_number.trim()) { e.contact_number = 'Enter a contact number.'; }
        if (!form.member_responsible) { e.member_responsible = 'Choose who is responsible.'; }
        if (!form.contact_medium) { e.contact_medium = 'Choose how they got in touch.'; }
        if (!form.offer) { e.offer = 'Choose an offer.'; }
        if (!form.comment.trim()) { e.comment = 'Add a comment.'; }
        return e;
    };

    const save = async () => {
        const found = validate();
        setErrors(found);
        const missing = Object.keys(found).length;
        if (missing) {
            setFormError(missing === 1
                ? Object.values(found)[0]
                : `Please complete ${missing} fields before saving.`);
            return;
        }
        setFormError(null);
        try {
            setSaving(true);
            const res = editingId
                ? await updateSocialLead(editingId, form)
                : await createSocialLead(form);
            setFormOpen(false);
            dispatch(showSnackbar({
                // The API returns its own message on some of these; prefer it.
                message: res?.message
                    || (editingId ? 'Lead updated successfully' : 'Lead added successfully'),
                type: 'success',
            }));
            load(true);
        } catch (e: any) {
            // The sheet stays open on failure, so this belongs in the sheet.
            setFormError(e?.response?.data?.message || e?.message || 'Could not save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (l: SocialLeadRow) => {
        Alert.alert(
            'Delete lead',
            `Delete ${l.customer_name || 'this lead'} (${l.lead_code})? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await deleteSocialLead(l.id);
                            dispatch(showSnackbar({
                                message: res?.message || 'Lead deleted successfully',
                                type: 'success',
                            }));
                            load(true);
                        } catch (e: any) {
                            const message = e?.response?.data?.message || e?.message || 'Please try again.';
                            dispatch(showSnackbar({ message, type: 'error' }));
                        }
                    },
                },
            ],
        );
    };

    /** Update form fields and clear the errors for whatever was just filled. */
    const patch = (p: Partial<SocialLeadPayload>) => {
        setForm(f => ({ ...f, ...p }));
        setErrors(e => {
            const next = { ...e };
            Object.keys(p).forEach(k => delete next[k]);
            return next;
        });
        setFormError(null);
    };

    const formProgress = useMemo(() => leadProgress(form as any), [form]);

    // What the open list modal should show, and what picking an item does.
    const listConfig = useMemo(() => {
        switch (openList) {
            case 'branch':
                return {
                    title: 'Branch',
                    items: ['All branches', ...branchOptions.map(b => b.name)],
                    onPick: (name: string, i: number) => {
                        setBranchId(i === 0 ? null : branchOptions[i - 1].id);
                        setBranchLabel(name);
                    },
                };
            case 'offer':
                return {
                    title: 'Offer',
                    items: ['All offers', ...(opts?.offer ?? [])],
                    onPick: (name: string, i: number) => setOffer(i === 0 ? '' : name),
                };
            case 'f_branch':
                return {
                    title: 'Branch',
                    items: branchOptions.map(b => b.name),
                    onPick: (_n: string, i: number) => patch({ branch_id: branchOptions[i].id }),
                };
            case 'f_medium':
                return {
                    title: 'Contact medium',
                    items: opts?.contact_medium ?? [],
                    onPick: (name: string) => patch({ contact_medium: name }),
                };
            case 'f_offer':
                return {
                    title: 'Offer',
                    items: opts?.offer ?? [],
                    onPick: (name: string) => patch({ offer: name }),
                };
            case 'f_member':
                return {
                    title: 'Member responsible',
                    items: (opts?.member_responsible_staff ?? []).map(s => s.name),
                    onPick: (name: string, i: number) => patch({
                        member_responsible: name,
                        member_responsible_id: opts?.member_responsible_staff?.[i]?.id ?? null,
                    }),
                };
            case 'f_closed':
                return {
                    title: 'Closed by',
                    items: opts?.closed_by ?? [],
                    onPick: (name: string) => patch({ closed_by: name }),
                };
            default:
                return null;
        }
    }, [openList, branchOptions, opts]);

    const branchNameOf = (id: number | string) =>
        branchOptions.find(b => b.id === Number(id))?.name ?? '';

    /**
     * The list picker, rendered twice — once nested inside the Add/Edit sheet
     * and once beside it for the filter selects.
     *
     * On iOS a Modal cannot present while a sibling Modal is already up, so a
     * single picker next to the sheet simply never appeared once the sheet was
     * open. Nesting it inside the sheet's Modal is what makes the form's
     * dropdowns open at all; only one copy is mounted at a time, because a
     * Modal does not mount its children while hidden.
     */
    const renderPicker = () => (
        <Modal visible={!!listConfig} transparent animationType="fade" onRequestClose={() => setOpenList(null)}>
            <TouchableOpacity style={styles.modalBack} activeOpacity={1} onPress={() => setOpenList(null)}>
                <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>{listConfig?.title}</Text>
                    {loadingOptions && (openList === 'branch' || openList === 'f_branch') ? (
                        <ActivityIndicator color="#E10600" style={styles.modalLoader} />
                    ) : (
                        <ScrollView>
                            {(listConfig?.items ?? []).map((name, i) => (
                                <TouchableOpacity
                                    key={`${name}-${i}`}
                                    style={styles.modalRow}
                                    onPress={() => { listConfig?.onPick(name, i); setOpenList(null); }}
                                >
                                    <Text style={styles.modalRowText}>{name}</Text>
                                </TouchableOpacity>
                            ))}
                            {!(listConfig?.items ?? []).length && (
                                <Text style={styles.empty}>Nothing to choose from.</Text>
                            )}
                        </ScrollView>
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <AppHeader
                title="Social Leads"
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
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E10600" />
                    }
                >
                    {/* ── Page head ─────────────────────────────────────────── */}
                    <View style={styles.pageHead}>
                        <Text style={styles.pageSub}>Full access: intake and sales follow-up fields.</Text>
                        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
                            <Icon name="plus" size={scale(15)} color="#fff" />
                            <Text style={styles.addText}>Add lead</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── Filters ───────────────────────────────────────────── */}
                    <Card>
                        <SelectRow
                            label="Branch"
                            value={branchLabel}
                            placeholder="All branches"
                            onPress={() => setOpenList('branch')}
                        />
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldHalf}>
                                <Text style={styles.fieldLabel}>From date</Text>
                                <TouchableOpacity style={styles.select} onPress={() => setPicker('from')} activeOpacity={0.7}>
                                    <Text style={styles.selectText}>{allDates ? 'Any' : iso(fromDate)}</Text>
                                    <Icon name="calendar" size={scale(15)} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.fieldHalf}>
                                <Text style={styles.fieldLabel}>To date</Text>
                                <TouchableOpacity style={styles.select} onPress={() => setPicker('to')} activeOpacity={0.7}>
                                    <Text style={styles.selectText}>{allDates ? 'Any' : iso(toDate)}</Text>
                                    <Icon name="calendar" size={scale(15)} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <SelectRow
                            label="Offer"
                            value={offer || 'All offers'}
                            placeholder="All offers"
                            onPress={() => setOpenList('offer')}
                        />

                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Search</Text>
                            <TextInput
                                style={styles.input}
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Name / phone"
                                placeholderTextColor="#94A3B8"
                                returnKeyType="search"
                                onSubmitEditing={() => load()}
                            />
                        </View>

                        <View style={styles.filterButtons}>
                            <TouchableOpacity
                                style={styles.applyBtn}
                                onPress={() => { setAllDates(false); load(); }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.applyText}>Apply</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.allBtn}
                                onPress={() => setAllDates(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.allText}>All</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.rangeNote}>
                            {allDates ? 'All dates.' : `Date range: ${iso(fromDate)} → ${iso(toDate)}.`}
                        </Text>
                    </Card>

                    {picker && (
                        <DateTimePicker
                            value={picker === 'from' ? fromDate : toDate}
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

                    {/* ── Stat tiles ────────────────────────────────────────── */}
                    <View style={styles.statGrid}>
                        <StatTile label="Total leads" value={stats?.total_leads ?? 0} />
                        <StatTile label="Answered" value={stats?.first_call_answered ?? 0} />
                        <StatTile label="Interested" value={stats?.interested ?? 0} />
                        <StatTile label="Not interested" value={stats?.not_interested ?? 0} />
                        <StatTile label="Visits done" value={stats?.visit_completed ?? 0} />
                        <StatTile label="Converted (Paid)" value={stats?.converted ?? stats?.payment_received ?? 0} />
                        <StatTile label="Conversion %" value={`${stats?.conversion_rate ?? 0}%`} />
                    </View>

                    {/* ── Offer-wise ────────────────────────────────────────── */}
                    <Card title="Offer-wise (leads → converted)">
                        <View style={styles.tableHead}>
                            <Text style={[styles.th, styles.colOffer]}>OFFER</Text>
                            <Text style={[styles.th, styles.colNum]}>LEADS</Text>
                            <Text style={[styles.th, styles.colNum]}>CONVERTED</Text>
                        </View>
                        {(stats?.by_offer ?? []).length ? (
                            (stats?.by_offer ?? []).map(o => (
                                <View key={o.offer} style={styles.tr}>
                                    <Text style={[styles.td, styles.colOffer]} numberOfLines={1}>{o.offer}</Text>
                                    <Text style={[styles.td, styles.colNum]}>{o.total}</Text>
                                    <Text style={[styles.td, styles.colNum]}>{o.converted}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.empty}>No leads for these filters.</Text>
                        )}
                    </Card>

                    {/* ── Leads ─────────────────────────────────────────────── */}
                    <View style={styles.listHead}>
                        <Text style={styles.listTitle}>Leads ({rows.length})</Text>
                    </View>

                    {rows.length ? rows.map(l => {
                        const status = leadStatus(l);
                        const tint = STATUS_TINT[status] ?? STATUS_TINT.Open;
                        const pct = leadProgress(l);
                        return (
                            <View key={l.id} style={styles.leadCard}>
                                <View style={styles.leadTop}>
                                    <View style={styles.leadNameBox}>
                                        <Text style={styles.leadName} numberOfLines={1}>{l.customer_name || '—'}</Text>
                                        <Text style={styles.leadCode}>{l.lead_code}</Text>
                                    </View>
                                    <View style={[styles.statusPill, { backgroundColor: tint.bg }]}>
                                        <Text style={[styles.statusText, { color: tint.fg }]}>{status}</Text>
                                    </View>
                                </View>

                                <View style={styles.leadMeta}>
                                    <Text style={styles.metaItem}>{l.lead_date}</Text>
                                    <Text style={styles.metaDot}>·</Text>
                                    <Text style={styles.metaItem}>{l.branch?.name ?? branchNameOf(l.branch_id)}</Text>
                                    <Text style={styles.metaDot}>·</Text>
                                    <Text style={styles.metaItem}>{l.contact_medium || '—'}</Text>
                                </View>

                                <View style={styles.leadMeta}>
                                    <Icon name="phone-outline" size={scale(12)} color="#64748B" />
                                    <Text style={styles.metaItem}>{l.contact_number || '—'}</Text>
                                    <Text style={styles.metaDot}>·</Text>
                                    <Text style={styles.metaItem} numberOfLines={1}>{l.offer || '—'}</Text>
                                </View>

                                {!!l.member_responsible && (
                                    <Text style={styles.responsible}>Responsible: {l.member_responsible}</Text>
                                )}

                                {!!l.comment && (
                                    <View style={styles.commentBlock}>
                                        <Text style={styles.commentTag}>INTAKE</Text>
                                        <Text style={styles.commentText}>{l.comment}</Text>
                                    </View>
                                )}
                                {!!(l as any).follow_up_comment && (
                                    <View style={styles.commentBlock}>
                                        <Text style={styles.commentTag}>SALES</Text>
                                        <Text style={styles.commentText}>{(l as any).follow_up_comment}</Text>
                                    </View>
                                )}

                                <View style={styles.progressRow}>
                                    <View style={styles.progressTrack}>
                                        <View style={[styles.progressFill, { width: `${pct}%` }]} />
                                    </View>
                                    <Text style={styles.progressPct}>{pct}%</Text>
                                </View>

                                <View style={styles.leadActions}>
                                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(l)} activeOpacity={0.8}>
                                        <Icon name="pencil-outline" size={scale(14)} color="#E63946" />
                                        <Text style={styles.editText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete(l)} activeOpacity={0.8}>
                                        <Icon name="trash-can-outline" size={scale(14)} color="#B91C1C" />
                                        <Text style={styles.delText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }) : (
                        <Card><Text style={styles.empty}>No leads for these filters.</Text></Card>
                    )}

                    <View style={{ height: scale(40) }} />
                </ScrollView>
            )}

            {/* ── Edit / Add dialog ─────────────────────────────────────────── */}
            <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
                <View style={styles.sheetBack}>
                    <View style={styles.sheet}>
                        <View style={styles.sheetHead}>
                            <Text style={styles.sheetTitle}>{editingId ? 'Edit lead' : 'Add lead'}</Text>
                            <TouchableOpacity onPress={() => setFormOpen(false)}>
                                <Icon name="close" size={scale(20)} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {!!formError && (
                                <View style={styles.sheetBanner}>
                                    <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                                    <Text style={styles.sheetBannerText}>{formError}</Text>
                                </View>
                            )}

                            <Text style={styles.formSection}>LEAD INTAKE (SOCIAL MEDIA)</Text>

                            <SelectRow
                                label="Branch *"
                                value={branchNameOf(form.branch_id)}
                                placeholder="Select branch"
                                onPress={() => setOpenList('f_branch')}
                                error={errors.branch_id}
                            />

                            <View style={styles.field}>
                                <Text style={styles.fieldLabel}>Date *</Text>
                                <View style={[styles.select, !!errors.lead_date && styles.inputBad]}>
                                    <Text style={styles.selectText}>{form.lead_date}</Text>
                                </View>
                                <FieldError text={errors.lead_date} />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.fieldLabel}>Customer name *</Text>
                                <TextInput
                                    style={[styles.input, !!errors.customer_name && styles.inputBad]}
                                    value={form.customer_name}
                                    onChangeText={t => patch({ customer_name: t })}
                                    placeholder="Customer name"
                                    placeholderTextColor="#94A3B8"
                                />
                                <FieldError text={errors.customer_name} />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.fieldLabel}>Contact number</Text>
                                <TextInput
                                    style={[styles.input, !!errors.contact_number && styles.inputBad]}
                                    value={form.contact_number}
                                    onChangeText={t => patch({ contact_number: t })}
                                    placeholder="Contact number"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="phone-pad"
                                />
                                <FieldError text={errors.contact_number} />
                            </View>

                            <SelectRow
                                label="Member responsible"
                                value={form.member_responsible}
                                placeholder="Select…"
                                onPress={() => setOpenList('f_member')}
                                error={errors.member_responsible}
                            />
                            <SelectRow
                                label="Contact medium"
                                value={form.contact_medium}
                                placeholder="Select…"
                                onPress={() => setOpenList('f_medium')}
                                error={errors.contact_medium}
                            />
                            <SelectRow
                                label="Offer"
                                value={form.offer}
                                placeholder="Select…"
                                onPress={() => setOpenList('f_offer')}
                                error={errors.offer}
                            />

                            <View style={styles.field}>
                                <Text style={styles.fieldLabel}>Comment</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, !!errors.comment && styles.inputBad]}
                                    value={form.comment}
                                    onChangeText={t => patch({ comment: t })}
                                    placeholder="Comment"
                                    placeholderTextColor="#94A3B8"
                                    multiline
                                />
                                <FieldError text={errors.comment} />
                            </View>

                            <View style={styles.switchRow}>
                                <Text style={styles.checkLabel}>WhatsApp detail</Text>
                                <Switch
                                    value={form.whatsapp_detail}
                                    onValueChange={v => setForm(f => ({ ...f, whatsapp_detail: v }))}
                                    trackColor={{ true: '#FCA5A5', false: '#E2E8F0' }}
                                    thumbColor={form.whatsapp_detail ? '#E63946' : '#f4f3f4'}
                                />
                            </View>

                            {/* Shown on Add as well as Edit, matching the web.
                                The create endpoint drops these, so
                                createSocialLead follows the POST with a PUT
                                when any of them are set — see api/marketing.ts. */}
                            <Text style={styles.formSection}>SALES FOLLOW-UP</Text>
                            <CheckRow label="First call answered?" on={form.first_call_answered} onToggle={() => setForm(f => ({ ...f, first_call_answered: !f.first_call_answered }))} />
                            <CheckRow label="Interested?" on={form.interested} onToggle={() => setForm(f => ({ ...f, interested: !f.interested }))} />
                            <CheckRow label="Not interested?" on={form.not_interested} onToggle={() => setForm(f => ({ ...f, not_interested: !f.not_interested }))} />
                            <CheckRow label="Follow up calls?" on={form.follow_up_calls} onToggle={() => setForm(f => ({ ...f, follow_up_calls: !f.follow_up_calls }))} />
                            <CheckRow label="Visit scheduled?" on={form.visit_scheduled} onToggle={() => setForm(f => ({ ...f, visit_scheduled: !f.visit_scheduled }))} />
                            <CheckRow label="Visit completed?" on={form.visit_completed} onToggle={() => setForm(f => ({ ...f, visit_completed: !f.visit_completed }))} />
                            <CheckRow label="2nd follow up (visitor)" on={form.second_follow_up} onToggle={() => setForm(f => ({ ...f, second_follow_up: !f.second_follow_up }))} />
                            <CheckRow label="Payment received & orientation" on={form.payment_received} onToggle={() => setForm(f => ({ ...f, payment_received: !f.payment_received }))} />

                            <SelectRow
                                label="Closed by"
                                value={form.closed_by}
                                placeholder="Select…"
                                onPress={() => setOpenList('f_closed')}
                            />

                            <View style={styles.field}>
                                <Text style={styles.fieldLabel}>Follow up comment</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={form.follow_up_comment}
                                    onChangeText={t => setForm(f => ({ ...f, follow_up_comment: t }))}
                                    placeholder="Follow up comment"
                                    placeholderTextColor="#94A3B8"
                                    multiline
                                />
                            </View>

                            <View style={styles.field}>
                                <View style={styles.implRow}>
                                    <Text style={styles.fieldLabel}>Implementation</Text>
                                    <Text style={styles.implPct}>{formProgress}%</Text>
                                </View>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${formProgress}%` }]} />
                                </View>
                            </View>

                            <View style={{ height: scale(20) }} />
                        </ScrollView>

                        <View style={styles.sheetActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setFormOpen(false)} activeOpacity={0.8}>
                                <Text style={styles.cancelText}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, saving && styles.saveBtnOff]}
                                onPress={save}
                                disabled={saving}
                                activeOpacity={0.8}
                            >
                                {saving
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.saveText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Nested, so the form's dropdowns can open over the sheet. */}
                    {renderPicker()}
                </View>
            </Modal>

            {/* The same picker for the filter selects, when no sheet is up. */}
            {!formOpen && renderPicker()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    content: { padding: scale(20) },
    centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },

    pageHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(10),
    },
    pageSub: { flex: 1, fontSize: scale(10.5), color: '#64748b' },

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
    cardTitle: { fontSize: scale(13), fontWeight: '700', color: '#0F172A', marginBottom: scale(10) },

    field: { marginBottom: scale(10) },
    fieldRow: { flexDirection: 'row', gap: scale(10) },
    fieldHalf: { flex: 1, marginBottom: scale(10) },
    fieldLabel: { fontSize: scale(10.5), color: '#64748b', marginBottom: scale(4), fontWeight: '600' },
    select: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: scale(12),
        paddingVertical: scale(10),
    },
    selectText: { flex: 1, fontSize: scale(12), color: '#0F172A' },
    selectPlaceholder: { color: '#94A3B8' },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: scale(12),
        paddingVertical: scale(9),
        fontSize: scale(12),
        color: '#0F172A',
    },
    textArea: { height: scale(70), textAlignVertical: 'top' },

    inputBad: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
    fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(4) },
    fieldErrorText: { fontSize: scale(10), color: '#B91C1C' },

    sheetBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        padding: scale(10),
        marginBottom: scale(4),
    },
    sheetBannerText: { flex: 1, fontSize: scale(11.5), color: '#B91C1C', fontWeight: '600' },

    filterButtons: { flexDirection: 'row', gap: scale(10), marginTop: scale(2) },
    applyBtn: { flex: 1, backgroundColor: '#0F172A', borderRadius: 10, paddingVertical: scale(11), alignItems: 'center' },
    applyText: { color: '#fff', fontSize: scale(12.5), fontWeight: '700' },
    allBtn: {
        width: scale(70),
        borderRadius: 10,
        paddingVertical: scale(11),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#fff',
    },
    allText: { color: '#334155', fontSize: scale(12.5), fontWeight: '700' },
    rangeNote: { fontSize: scale(10.5), color: '#94A3B8', marginTop: scale(8) },

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

    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginTop: scale(12) },
    statTile: {
        width: '31.5%',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: scale(10),
        paddingHorizontal: scale(8),
    },
    statLabel: {
        fontSize: scale(9),
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statValue: { fontSize: scale(16), fontWeight: '700', color: '#0F172A', marginTop: scale(4) },

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
    colOffer: { flex: 1, paddingRight: scale(6) },
    colNum: { width: '24%', textAlign: 'right' },

    listHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: scale(18),
        marginBottom: scale(4),
    },
    listTitle: { fontSize: scale(15), fontWeight: '700', color: '#0f172a' },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        backgroundColor: '#E10600',
        borderRadius: 20,
        paddingHorizontal: scale(12),
        paddingVertical: scale(7),
    },
    addText: { color: '#fff', fontSize: scale(11.5), fontWeight: '700' },

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
    leadTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    leadNameBox: { flex: 1, paddingRight: scale(8) },
    leadName: { fontSize: scale(13.5), fontWeight: '700', color: '#0F172A' },
    leadCode: { fontSize: scale(9.5), color: '#94A3B8', marginTop: scale(2) },
    statusPill: { borderRadius: 20, paddingHorizontal: scale(9), paddingVertical: scale(3) },
    statusText: { fontSize: scale(9.5), fontWeight: '700' },

    leadMeta: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(6) },
    metaItem: { fontSize: scale(10.5), color: '#64748b' },
    metaDot: { fontSize: scale(10.5), color: '#CBD5E1' },
    responsible: { fontSize: scale(10.5), color: '#64748b', marginTop: scale(6) },

    commentBlock: { marginTop: scale(8) },
    commentTag: { fontSize: scale(8.5), fontWeight: '700', color: '#2563EB', letterSpacing: 0.4 },
    commentText: { fontSize: scale(11), color: '#334155', marginTop: scale(2) },

    progressRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(10) },
    progressTrack: { flex: 1, height: scale(6), borderRadius: scale(3), backgroundColor: '#F1F5F9', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: scale(3), backgroundColor: '#0F766E' },
    progressPct: { width: scale(34), textAlign: 'right', fontSize: scale(10.5), fontWeight: '700', color: '#0F172A' },

    leadActions: {
        flexDirection: 'row',
        gap: scale(8),
        marginTop: scale(10),
        paddingTop: scale(8),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#F1F5F9',
    },
    editBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(5),
        backgroundColor: '#FFF5F5',
        borderRadius: 8,
        paddingVertical: scale(8),
    },
    editText: { fontSize: scale(11.5), color: '#E63946', fontWeight: '700' },
    delBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(5),
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        paddingVertical: scale(8),
    },
    delText: { fontSize: scale(11.5), color: '#B91C1C', fontWeight: '700' },

    empty: { fontSize: scale(11.5), color: '#94A3B8', textAlign: 'center', paddingVertical: scale(20) },

    sheetBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: scale(16),
        maxHeight: '92%',
    },
    sheetHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(10),
    },
    sheetTitle: { fontSize: scale(15), fontWeight: '700', color: '#0F172A' },
    formSection: {
        fontSize: scale(10),
        fontWeight: '700',
        color: '#64748b',
        letterSpacing: 0.6,
        marginTop: scale(8),
        marginBottom: scale(8),
    },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingVertical: scale(7) },
    checkLabel: { fontSize: scale(12), color: '#334155' },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scale(4),
    },
    implRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    implPct: { fontSize: scale(11.5), fontWeight: '700', color: '#0F172A' },

    sheetActions: {
        flexDirection: 'row',
        gap: scale(10),
        paddingTop: scale(12),
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    cancelBtn: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: scale(12),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cancelText: { fontSize: scale(12.5), color: '#334155', fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: '#E10600', borderRadius: 10, paddingVertical: scale(12), alignItems: 'center' },
    saveBtnOff: { opacity: 0.6 },
    saveText: { fontSize: scale(12.5), color: '#fff', fontWeight: '700' },

    modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: scale(30) },
    modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: scale(16), maxHeight: '60%' },
    modalTitle: { fontSize: scale(14), fontWeight: '700', color: '#0F172A', marginBottom: scale(10) },
    modalLoader: { marginVertical: scale(16) },
    modalRow: {
        paddingVertical: scale(11),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    modalRowText: { fontSize: scale(12.5), color: '#334155' },
});

export default SocialLeads;
