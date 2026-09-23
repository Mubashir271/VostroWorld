// Announcements — the app's mirror of the web's "Announcement Manager"
// (Dashboard › Announcements).
//
// The web lays this out as Editor beside Preview with the Library underneath;
// on a phone the three stack, and the Preview only appears once a saved
// announcement is selected. Styling is the app's own card idiom.
//
// Data: /v1/announcements/index, /store, /update/{id} and /actions/{id}/{n} —
// routes and payloads from the web bundle, list call confirmed live
// (HAR, 21 Sep 2026).
import React, { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../../redux/store';
import { showSnackbar } from '../../redux/slices/snackbarSlice';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    announcementAction,
    PRIORITIES,
    STATUS_FILTERS,
    Announcement,
    AnnouncementPayload,
} from '../../api/announcements';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const PRIORITY_TINT: Record<string, { bg: string; fg: string }> = {
    High: { bg: '#FEF2F2', fg: '#B91C1C' },
    Medium: { bg: '#FEF3C7', fg: '#B45309' },
    Low: { bg: '#ECFDF5', fg: '#047857' },
};

/** "YYYY-MM-DDTHH:mm" — the datetime-local shape the web sends. */
const toLocalStamp = (d: Date) => {
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const fromStamp = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date() : d;
};

/** Readable form of whatever the API hands back for a timestamp. */
const prettyStamp = (s?: string | null) => {
    if (!s) { return '—'; }
    const d = new Date(String(s).replace(' ', 'T'));
    if (isNaN(d.getTime())) { return String(s); }
    const p = (n: number) => `${n}`.padStart(2, '0');
    const h = d.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${h12}:${p(d.getMinutes())} ${ap}`;
};

const EMPTY_FORM = (): AnnouncementPayload => {
    const now = new Date();
    return {
        title: '',
        description: '',
        priority: 'Medium',
        announced_by: '',
        visible_from: toLocalStamp(now),
        visible_until: '',
    };
};

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

const FieldError = ({ text }: { text?: string }) =>
    text ? (
        <View style={styles.fieldErrorRow}>
            <Icon name="alert-circle-outline" size={scale(12)} color="#B91C1C" />
            <Text style={styles.fieldErrorText}>{text}</Text>
        </View>
    ) : null;

const AnnouncementsScreen = () => {
    const navigation = useNavigation<any>();
    const dispatch = useDispatch();
    const { profile } = useSelector((state: RootState) => state.user);

    // Super admin has no branch of its own, and the web calls that Global
    // Announcement Mode — the same chip it shows in the hero.
    const branchId = profile?.branchId || null;
    const mode = branchId ? 'Branch Announcement Mode' : 'Global Announcement Mode';

    const [items, setItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Library filters
    const [search, setSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('2');
    const [openList, setOpenList] = useState<null | 'priority' | 'status' | 'formPriority'>(null);

    // Editor
    const [form, setForm] = useState<AnnouncementPayload>(EMPTY_FORM());
    const [editingId, setEditingId] = useState<number | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [picker, setPicker] = useState<null | 'from' | 'until'>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            setItems(await getAnnouncements({
                branch_id: branchId,
                search,
                priority: priorityFilter,
                status: statusFilter,
            }));
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load announcements.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, [branchId, search, priorityFilter, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    const patch = (p: Partial<AnnouncementPayload>) => {
        setForm(f => ({ ...f, ...p }));
        setErrors(e => {
            const next = { ...e };
            Object.keys(p).forEach(k => delete next[k]);
            return next;
        });
    };

    const onPickDate = (_e: DateTimePickerEvent, picked?: Date) => {
        const which = picker;
        setPicker(null);
        if (!picked || !which) { return; }
        patch(which === 'from'
            ? { visible_from: toLocalStamp(picked) }
            : { visible_until: toLocalStamp(picked) });
    };

    /** The web requires exactly these four. */
    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.title.trim()) { e.title = 'Enter a title.'; }
        if (!form.announced_by.trim()) { e.announced_by = 'Enter who is announcing this.'; }
        if (!form.visible_until) { e.visible_until = 'Pick when it stops showing.'; }
        if (!form.description.trim()) { e.description = 'Enter a description.'; }
        return e;
    };

    const resetEditor = () => {
        setForm(EMPTY_FORM());
        setEditingId(null);
        setErrors({});
    };

    const save = async () => {
        const found = validate();
        setErrors(found);
        const missing = Object.keys(found).length;
        if (missing) {
            dispatch(showSnackbar({
                message: missing === 1
                    ? Object.values(found)[0]
                    : `Please complete ${missing} fields before saving.`,
                type: 'error',
            }));
            return;
        }
        try {
            setSaving(true);
            if (editingId) {
                await updateAnnouncement(editingId, form);
                dispatch(showSnackbar({ message: 'Announcement updated successfully.', type: 'success' }));
            } else {
                await createAnnouncement({ ...form, branch_id: branchId });
                dispatch(showSnackbar({ message: 'Announcement created successfully.', type: 'success' }));
            }
            resetEditor();
            load(true);
        } catch (e: any) {
            dispatch(showSnackbar({
                message: e?.response?.data?.message || e?.message || 'Unable to save announcement.',
                type: 'error',
            }));
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (a: Announcement) => {
        setEditingId(a.id);
        setSelectedId(a.id);
        setErrors({});
        setForm({
            title: a.title || '',
            description: a.description || '',
            priority: a.priority || 'Medium',
            announced_by: a.announced_by || '',
            visible_from: a.visible_from ? String(a.visible_from).replace(' ', 'T').slice(0, 16) : '',
            visible_until: a.visible_until ? String(a.visible_until).replace(' ', 'T').slice(0, 16) : '',
        });
    };

    const runAction = async (a: Announcement, action: '0' | '1' | '2', message: string) => {
        try {
            await announcementAction(a.id, action);
            if (action === '2' && selectedId === a.id) { setSelectedId(null); }
            if (action === '2' && editingId === a.id) { resetEditor(); }
            dispatch(showSnackbar({ message, type: 'success' }));
            load(true);
        } catch (e: any) {
            dispatch(showSnackbar({
                message: e?.response?.data?.message || e?.message || 'Unable to update announcement status.',
                type: 'error',
            }));
        }
    };

    const confirmDelete = (a: Announcement) => {
        Alert.alert(
            'Delete announcement',
            `Delete "${a.title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => runAction(a, '2', 'Announcement deleted now.'),
                },
            ],
        );
    };

    const selected = items.find(a => a.id === selectedId) ?? null;

    const listConfig = (() => {
        switch (openList) {
            case 'priority':
                return {
                    title: 'Priority',
                    items: ['All Priorities', ...PRIORITIES],
                    onPick: (name: string, i: number) => setPriorityFilter(i === 0 ? '' : name),
                };
            case 'status':
                return {
                    title: 'Status',
                    items: STATUS_FILTERS.map(s => s.label),
                    onPick: (_n: string, i: number) => setStatusFilter(STATUS_FILTERS[i].value),
                };
            case 'formPriority':
                return {
                    title: 'Priority',
                    items: PRIORITIES.map(p => `${p} Priority`),
                    onPick: (_n: string, i: number) => patch({ priority: PRIORITIES[i] }),
                };
            default:
                return null;
        }
    })();

    const statusLabel = STATUS_FILTERS.find(s => s.value === statusFilter)?.label ?? '';

    return (
        <View style={styles.container}>
            <AppHeader
                title="Announcements"
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

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E10600" />
                }
            >
                {/* ── Hero ──────────────────────────────────────────────────── */}
                <View style={styles.hero}>
                    <Text style={styles.heroEyebrow}>ANNOUNCEMENTS</Text>
                    <Text style={styles.heroTitle}>Announcement Manager</Text>
                    <Text style={styles.heroText}>
                        Publish branch or global announcements for all employees and keep important
                        notices visible until their deadline.
                    </Text>
                    <View style={styles.heroChip}><Text style={styles.heroChipText}>{mode}</Text></View>
                </View>

                {/* ── Editor ────────────────────────────────────────────────── */}
                <Card eyebrow="EDITOR" title={editingId ? 'Update Announcement' : 'Create Announcement'}>
                    <View style={styles.field}>
                        <TextInput
                            style={[styles.input, !!errors.title && styles.inputBad]}
                            value={form.title}
                            onChangeText={t => patch({ title: t })}
                            placeholder="Announcement Title"
                            placeholderTextColor="#94A3B8"
                        />
                        <FieldError text={errors.title} />
                    </View>

                    <View style={styles.field}>
                        <TextInput
                            style={[styles.input, !!errors.announced_by && styles.inputBad]}
                            value={form.announced_by}
                            onChangeText={t => patch({ announced_by: t })}
                            placeholder="Announced By"
                            placeholderTextColor="#94A3B8"
                        />
                        <FieldError text={errors.announced_by} />
                    </View>

                    <View style={styles.field}>
                        <TouchableOpacity
                            style={styles.select}
                            onPress={() => setOpenList('formPriority')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.selectText}>{form.priority} Priority</Text>
                            <Icon name="chevron-down" size={scale(16)} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Visible from</Text>
                        <TouchableOpacity style={styles.select} onPress={() => setPicker('from')} activeOpacity={0.7}>
                            <Text style={[styles.selectText, !form.visible_from && styles.selectPlaceholder]}>
                                {form.visible_from ? prettyStamp(form.visible_from) : 'Pick a date and time'}
                            </Text>
                            <Icon name="calendar-clock" size={scale(16)} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Visible until</Text>
                        <TouchableOpacity
                            style={[styles.select, !!errors.visible_until && styles.inputBad]}
                            onPress={() => setPicker('until')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.selectText, !form.visible_until && styles.selectPlaceholder]}>
                                {form.visible_until ? prettyStamp(form.visible_until) : 'Pick a date and time'}
                            </Text>
                            <Icon name="calendar-clock" size={scale(16)} color="#64748B" />
                        </TouchableOpacity>
                        <FieldError text={errors.visible_until} />
                    </View>

                    <View style={styles.field}>
                        <TextInput
                            style={[styles.input, styles.textArea, !!errors.description && styles.inputBad]}
                            value={form.description}
                            onChangeText={t => patch({ description: t })}
                            placeholder="Announcement description"
                            placeholderTextColor="#94A3B8"
                            multiline
                        />
                        <FieldError text={errors.description} />
                    </View>

                    <View style={styles.editorActions}>
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && styles.saveBtnOff]}
                            onPress={save}
                            disabled={saving}
                            activeOpacity={0.8}
                        >
                            {saving
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={styles.saveText}>
                                    {editingId ? 'Update Announcement' : 'Save Announcement'}
                                </Text>}
                        </TouchableOpacity>
                        {!!editingId && (
                            <TouchableOpacity style={styles.cancelBtn} onPress={resetEditor} activeOpacity={0.8}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Card>

                {picker && (
                    <DateTimePicker
                        value={fromStamp(picker === 'from' ? form.visible_from : form.visible_until)}
                        mode="datetime"
                        display="default"
                        onChange={onPickDate}
                    />
                )}

                {/* ── Preview ───────────────────────────────────────────────── */}
                <Card eyebrow="PREVIEW" title="Announcement Preview">
                    {selected ? (
                        <>
                            <View style={styles.previewTop}>
                                <Text style={styles.previewTitle}>{selected.title}</Text>
                                <View style={[
                                    styles.priorityPill,
                                    { backgroundColor: (PRIORITY_TINT[selected.priority] ?? PRIORITY_TINT.Medium).bg },
                                ]}>
                                    <Text style={[
                                        styles.priorityText,
                                        { color: (PRIORITY_TINT[selected.priority] ?? PRIORITY_TINT.Medium).fg },
                                    ]}>
                                        {selected.priority}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.previewMeta}>
                                {selected.announced_by || 'N/A'} · Until {prettyStamp(selected.visible_until)}
                            </Text>
                            <Text style={styles.previewBody}>{selected.description}</Text>
                        </>
                    ) : (
                        <Text style={styles.empty}>Create or select an announcement to preview it.</Text>
                    )}
                </Card>

                {/* ── Library ───────────────────────────────────────────────── */}
                <Card eyebrow="LIBRARY" title="Saved Announcements">
                    <View style={styles.field}>
                        <TextInput
                            style={styles.input}
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search announcements"
                            placeholderTextColor="#94A3B8"
                            returnKeyType="search"
                        />
                    </View>
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={[styles.select, styles.filterHalf]}
                            onPress={() => setOpenList('priority')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.selectText} numberOfLines={1}>
                                {priorityFilter || 'All Priorities'}
                            </Text>
                            <Icon name="chevron-down" size={scale(15)} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.select, styles.filterHalf]}
                            onPress={() => setOpenList('status')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.selectText} numberOfLines={1}>{statusLabel}</Text>
                            <Icon name="chevron-down" size={scale(15)} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {!!error && (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {loading ? (
                        <ActivityIndicator color="#E10600" style={styles.listLoader} />
                    ) : items.length ? (
                        items.map(a => {
                            const tint = PRIORITY_TINT[a.priority] ?? PRIORITY_TINT.Medium;
                            const active = String(a.status) === '1';
                            return (
                                <TouchableOpacity
                                    key={a.id}
                                    style={[styles.item, selectedId === a.id && styles.itemOn]}
                                    onPress={() => setSelectedId(a.id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.itemTop}>
                                        <Text style={styles.itemTitle} numberOfLines={1}>{a.title}</Text>
                                        <View style={[styles.priorityPill, { backgroundColor: tint.bg }]}>
                                            <Text style={[styles.priorityText, { color: tint.fg }]}>{a.priority}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.itemMeta}>
                                        {a.announced_by || 'N/A'} · Until {prettyStamp(a.visible_until)}
                                    </Text>
                                    <Text style={styles.itemBody} numberOfLines={3}>{a.description}</Text>

                                    <View style={styles.itemActions}>
                                        <TouchableOpacity
                                            style={styles.actEdit}
                                            onPress={() => startEdit(a)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.actEditText}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={active ? styles.actWarn : styles.actOk}
                                            onPress={() => runAction(
                                                a,
                                                active ? '0' : '1',
                                                active ? 'Announcement inactive now.' : 'Announcement activated now.',
                                            )}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={active ? styles.actWarnText : styles.actOkText}>
                                                {active ? 'Inactivate' : 'Activate'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actDel}
                                            onPress={() => confirmDelete(a)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.actDelText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <Text style={styles.empty}>No announcements found for this branch yet.</Text>
                    )}
                </Card>

                <View style={{ height: scale(40) }} />
            </ScrollView>

            <Modal visible={!!listConfig} transparent animationType="fade" onRequestClose={() => setOpenList(null)}>
                <TouchableOpacity style={styles.modalBack} activeOpacity={1} onPress={() => setOpenList(null)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{listConfig?.title}</Text>
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

    hero: {
        backgroundColor: '#FFF7ED',
        borderRadius: 12,
        padding: scale(14),
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    heroEyebrow: { fontSize: scale(9.5), fontWeight: '700', color: '#0F766E', letterSpacing: 0.6 },
    heroTitle: { fontSize: scale(17), fontWeight: '700', color: '#0F172A', marginTop: scale(4) },
    heroText: { fontSize: scale(11), color: '#64748b', marginTop: scale(6), lineHeight: scale(16) },
    heroChip: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: scale(12),
        paddingVertical: scale(5),
        marginTop: scale(10),
    },
    heroChipText: { fontSize: scale(10.5), fontWeight: '700', color: '#334155' },

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
    cardTitle: { fontSize: scale(14), fontWeight: '700', color: '#0F172A', marginTop: scale(2) },

    field: { marginBottom: scale(10) },
    fieldLabel: { fontSize: scale(10.5), color: '#64748b', marginBottom: scale(4), fontWeight: '600' },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: scale(12),
        paddingVertical: scale(10),
        fontSize: scale(12),
        color: '#0F172A',
    },
    textArea: { height: scale(110), textAlignVertical: 'top' },
    inputBad: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
    fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(4) },
    fieldErrorText: { fontSize: scale(10), color: '#B91C1C' },

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

    editorActions: { flexDirection: 'row', gap: scale(10) },
    saveBtn: { flex: 1, backgroundColor: '#0F172A', borderRadius: 10, paddingVertical: scale(12), alignItems: 'center' },
    saveBtnOff: { opacity: 0.6 },
    saveText: { fontSize: scale(12.5), color: '#fff', fontWeight: '700' },
    cancelBtn: {
        width: scale(90),
        borderRadius: 10,
        paddingVertical: scale(12),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cancelText: { fontSize: scale(12.5), color: '#334155', fontWeight: '700' },

    previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scale(8) },
    previewTitle: { flex: 1, fontSize: scale(14), fontWeight: '700', color: '#0F172A' },
    previewMeta: { fontSize: scale(10.5), color: '#64748b', marginTop: scale(6) },
    previewBody: { fontSize: scale(12), color: '#334155', marginTop: scale(8), lineHeight: scale(18) },

    priorityPill: { borderRadius: 20, paddingHorizontal: scale(9), paddingVertical: scale(3) },
    priorityText: { fontSize: scale(9.5), fontWeight: '700' },

    filterRow: { flexDirection: 'row', gap: scale(10), marginBottom: scale(6) },
    filterHalf: { flex: 1 },

    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        padding: scale(10),
        marginTop: scale(8),
    },
    errorText: { flex: 1, fontSize: scale(11.5), color: '#B91C1C' },
    listLoader: { marginVertical: scale(20) },

    item: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: scale(11),
        marginTop: scale(10),
    },
    itemOn: { borderColor: '#E63946', backgroundColor: '#FFF5F5' },
    itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scale(8) },
    itemTitle: { flex: 1, fontSize: scale(12.5), fontWeight: '700', color: '#0F172A' },
    itemMeta: { fontSize: scale(10), color: '#64748b', marginTop: scale(4) },
    itemBody: { fontSize: scale(11), color: '#334155', marginTop: scale(6), lineHeight: scale(16) },

    itemActions: { flexDirection: 'row', gap: scale(7), marginTop: scale(10) },
    actEdit: { flex: 1, alignItems: 'center', paddingVertical: scale(7), borderRadius: 8, backgroundColor: '#EFF6FF' },
    actEditText: { fontSize: scale(11), fontWeight: '700', color: '#1D4ED8' },
    actOk: { flex: 1, alignItems: 'center', paddingVertical: scale(7), borderRadius: 8, backgroundColor: '#ECFDF5' },
    actOkText: { fontSize: scale(11), fontWeight: '700', color: '#047857' },
    actWarn: { flex: 1, alignItems: 'center', paddingVertical: scale(7), borderRadius: 8, backgroundColor: '#FEF3C7' },
    actWarnText: { fontSize: scale(11), fontWeight: '700', color: '#B45309' },
    actDel: { flex: 1, alignItems: 'center', paddingVertical: scale(7), borderRadius: 8, backgroundColor: '#FEF2F2' },
    actDelText: { fontSize: scale(11), fontWeight: '700', color: '#B91C1C' },

    empty: { fontSize: scale(11.5), color: '#94A3B8', textAlign: 'center', paddingVertical: scale(20) },

    modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: scale(30) },
    modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: scale(16), maxHeight: '60%' },
    modalTitle: { fontSize: scale(14), fontWeight: '700', color: '#0F172A', marginBottom: scale(10) },
    modalRow: {
        paddingVertical: scale(11),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F1F5F9',
    },
    modalRowText: { fontSize: scale(12.5), color: '#334155' },
});

export default AnnouncementsScreen;
