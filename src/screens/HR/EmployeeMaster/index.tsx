// Employee Master — the app's mirror of the web's HR › Employee Master page.
//
// Structure follows the web (three count tiles → filters → Active Staff →
// Inactive Staff); the styling is the app's own card and table idiom, the same
// horizontally scrolling table View Staff uses.
//
// Data (HAR, 21 Sep 2026), all `/v1/auth/get` with different arguments:
//   status=1 & account_type=staff   → Active Staff, and the Total Active Staff tile
//   status=0 & account_type=staff   → Inactive Staff (server-paged, 25 a page)
//   status=1 & account_type=login   → the Total Logins tile
// "Total Others" is not a call at all: the web counts the loaded active rows
// whose designation_id is 117.
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import AppHeader from '../../../components/AppHeader';
import StaffNameCell from '../../../components/StaffNameCell';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import {
    getStaffList,
    getBranchesNameList,
    getDepartmentNames,
    getDesignationNames,
} from '../../../api/employeeDashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

/** The web's "Total Others" tile counts active staff on this designation. */
const OTHERS_DESIGNATION_ID = 117;

const PAGE_SIZE = 25;
/** The web pulls the whole active roster in one go (limit=100) so its tiles
 *  can count across it; the app pages that list locally instead. */
const ACTIVE_FETCH_LIMIT = 100;

const GENDER_OPTIONS = ['Male', 'Female'];

interface Option { id: number; name: string; }

const COLS = [
    { key: 'sr', label: 'Sr#', width: 38 },
    { key: 'name', label: 'Name', width: 140 },
    { key: 'father', label: 'Father Name', width: 130 },
    { key: 'branch', label: 'Branch Name', width: 90 },
    { key: 'designation', label: 'Designation', width: 140 },
    { key: 'department', label: 'Department', width: 130 },
    { key: 'email', label: 'Personal / Official Email', width: 210 },
    { key: 'phone', label: 'Phone', width: 120 },
    { key: 'gender', label: 'Gender', width: 70 },
    { key: 'dob', label: 'DOB', width: 90 },
    { key: 'address', label: 'Address', width: 200 },
    { key: 'city', label: 'City', width: 100 },
    { key: 'joining', label: 'Joining Date', width: 100 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const cellOf = (row: any, key: string, sr: number) => {
    switch (key) {
        case 'sr': return String(sr);
        case 'name': return row.name || '—';
        case 'father': return row.father_name || '—';
        case 'branch': return row.branch_name || row.branch || '—';
        case 'designation': return row.designation || '—';
        case 'department': return row.department || '—';
        // The web prints personal and official side by side, N/A when missing.
        case 'email': return `${row.email || 'N/A'} / ${row.official_email || 'N/A'}`;
        case 'phone': return row.phone || '—';
        case 'gender': return row.gender || '—';
        case 'dob': return row.dob || '—';
        case 'address': return row.address || '—';
        case 'city': return row.city || '—';
        case 'joining': return row.joining || row.join_date || '—';
        default: return '—';
    }
};

const StatTile = ({ value, label, bg, fg }: {
    value: number; label: string; bg: string; fg: string;
}) => (
    <View style={[styles.statTile, { backgroundColor: bg }]}>
        <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
    </View>
);

const Pager = ({ page, pages, onPage }: {
    page: number; pages: number; onPage: (p: number) => void;
}) => {
    if (pages <= 1) { return null; }
    return (
        <View style={styles.pager}>
            <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnOff]}
                disabled={page <= 1}
                onPress={() => onPage(page - 1)}
                activeOpacity={0.7}
            >
                <Icon name="chevron-left" size={scale(18)} color={page <= 1 ? '#CBD5E1' : '#334155'} />
            </TouchableOpacity>
            <Text style={styles.pageText}>Page {page} of {pages}</Text>
            <TouchableOpacity
                style={[styles.pageBtn, page >= pages && styles.pageBtnOff]}
                disabled={page >= pages}
                onPress={() => onPage(page + 1)}
                activeOpacity={0.7}
            >
                <Icon name="chevron-right" size={scale(18)} color={page >= pages ? '#CBD5E1' : '#334155'} />
            </TouchableOpacity>
        </View>
    );
};

const StaffTable = ({ rows, offset }: { rows: any[]; offset: number }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: TABLE_W }}>
            <View style={styles.tHead}>
                {COLS.map(c => (
                    <Text key={c.key} style={[styles.th, { width: c.width }]} numberOfLines={1}>
                        {c.label}
                    </Text>
                ))}
            </View>
            {rows.map((r, i) => (
                <View key={r.id ?? i} style={styles.tr}>
                    {COLS.map(c => (
                        // The name opens that person's Staff Profile, the same
                        // link the web's table carries.
                        c.key === 'name' ? (
                            <StaffNameCell
                                key={c.key}
                                name={r.name}
                                staffId={r.id}
                                style={[styles.td, styles.tdLink, { width: c.width }]}
                                numberOfLines={2}
                            />
                        ) : (
                            <Text key={c.key} style={[styles.td, { width: c.width }]} numberOfLines={2}>
                                {cellOf(r, c.key, offset + i + 1)}
                            </Text>
                        )
                    ))}
                </View>
            ))}
        </View>
    </ScrollView>
);

const EmployeeMaster = () => {
    const navigation = useNavigation<any>();

    // Filter options
    const [branches, setBranches] = useState<Option[]>([]);
    const [departments, setDepartments] = useState<Option[]>([]);
    const [designations, setDesignations] = useState<Option[]>([]);

    // Filters
    const [branch, setBranch] = useState<Option | null>(null);
    const [search, setSearch] = useState('');
    const [gender, setGender] = useState('');
    const [department, setDepartment] = useState<Option | null>(null);
    const [designation, setDesignation] = useState<Option | null>(null);
    const [openList, setOpenList] = useState<null | 'branch' | 'gender' | 'department' | 'designation'>(null);

    // Data
    const [active, setActive] = useState<any[]>([]);
    const [activeTotal, setActiveTotal] = useState(0);
    const [loginTotal, setLoginTotal] = useState(0);
    const [inactive, setInactive] = useState<any[]>([]);
    const [inactivePage, setInactivePage] = useState(1);
    const [inactivePages, setInactivePages] = useState(1);
    const [inactiveTotal, setInactiveTotal] = useState(0);

    const [activePage, setActivePage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filterParams = useCallback(() => ({
        branch_id: branch?.id ?? undefined,
        department_id: department?.id ?? undefined,
        gender: gender || undefined,
        search: search || undefined,
    }), [branch, department, gender, search]);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) { setLoading(true); }
            setError(null);
            const base = filterParams();
            const [act, logins, inact] = await Promise.all([
                getStaffList({ ...base, status: 1, account_type: 'staff', limit: ACTIVE_FETCH_LIMIT, page: 1 }),
                getStaffList({ ...base, status: 1, account_type: 'login', limit: 50, page: 1 }),
                getStaffList({ branch_id: base.branch_id, status: 0, account_type: 'staff', limit: PAGE_SIZE, page: inactivePage }),
            ]);

            setActive(act?.data?.data ?? []);
            setActiveTotal(Number(act?.totalRecord ?? 0));
            setLoginTotal(Number(logins?.totalRecord ?? 0));
            setInactive(inact?.data?.data ?? []);
            setInactiveTotal(Number(inact?.totalRecord ?? 0));
            setInactivePages(Number(inact?.totalPages ?? 1));
            setActivePage(1);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Could not load staff.');
        } finally {
            if (!isRefresh) { setLoading(false); }
        }
    }, [filterParams, inactivePage]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        getBranchesNameList().then(r => setBranches(r?.data ?? [])).catch(() => setBranches([]));
        getDepartmentNames().then(r => setDepartments(r?.data ?? [])).catch(() => setDepartments([]));
        getDesignationNames().then(r => setDesignations(r?.data ?? [])).catch(() => setDesignations([]));
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load(true).finally(() => setRefreshing(false));
    }, [load]);

    // Designation has no query param on the web either — it filters the rows
    // already fetched, so the app does the same.
    const activeFiltered = useMemo(() => (
        designation
            ? active.filter(r => String(r.designation) === String(designation.name))
            : active
    ), [active, designation]);

    const othersTotal = useMemo(() => (
        active.filter(r => Number(r.designation_id) === OTHERS_DESIGNATION_ID).length
    ), [active]);

    const activePages = Math.max(1, Math.ceil(activeFiltered.length / PAGE_SIZE));
    const activeSlice = activeFiltered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

    const listConfig = (() => {
        switch (openList) {
            case 'branch':
                return {
                    title: 'Branch',
                    items: ['All Branches', ...branches.map(b => b.name)],
                    onPick: (_n: string, i: number) => setBranch(i === 0 ? null : branches[i - 1]),
                };
            case 'gender':
                return {
                    title: 'Staff Type',
                    items: ['Select Staff Type', ...GENDER_OPTIONS],
                    onPick: (name: string, i: number) => setGender(i === 0 ? '' : name),
                };
            case 'department':
                return {
                    title: 'Department',
                    items: ['Select Department', ...departments.map(d => d.name)],
                    onPick: (_n: string, i: number) => setDepartment(i === 0 ? null : departments[i - 1]),
                };
            case 'designation':
                return {
                    title: 'Designation',
                    items: ['Select Designation', ...designations.map(d => d.name)],
                    onPick: (_n: string, i: number) => setDesignation(i === 0 ? null : designations[i - 1]),
                };
            default:
                return null;
        }
    })();

    return (
        <View style={styles.container}>
            <AppHeader
                title="Employee Master"
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
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E10600" />
                    }
                >
                    {/* ── Count tiles ───────────────────────────────────────── */}
                    <View style={styles.statRow}>
                        <StatTile value={activeTotal} label="Total Active Staff" bg="#1F2937" fg="#fff" />
                        <StatTile value={loginTotal} label="Total Logins" bg="#0EA5E9" fg="#fff" />
                        <StatTile value={othersTotal} label="Total Others" bg="#F59E0B" fg="#fff" />
                    </View>

                    {/* ── Filters ───────────────────────────────────────────── */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Active Staff</Text>

                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Branch</Text>
                            <TouchableOpacity style={styles.select} onPress={() => setOpenList('branch')} activeOpacity={0.7}>
                                <Text style={styles.selectText} numberOfLines={1}>{branch?.name ?? 'All Branches'}</Text>
                                <Icon name="chevron-down" size={scale(16)} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Search By Name</Text>
                            <TextInput
                                style={styles.input}
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Enter Name"
                                placeholderTextColor="#94A3B8"
                                returnKeyType="search"
                                onSubmitEditing={() => load()}
                            />
                        </View>

                        <View style={styles.fieldRow}>
                            <View style={styles.fieldHalf}>
                                <Text style={styles.fieldLabel}>Select Type</Text>
                                <TouchableOpacity style={styles.select} onPress={() => setOpenList('gender')} activeOpacity={0.7}>
                                    <Text style={styles.selectText} numberOfLines={1}>{gender || 'Select Staff Type'}</Text>
                                    <Icon name="chevron-down" size={scale(15)} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.fieldHalf}>
                                <Text style={styles.fieldLabel}>Department</Text>
                                <TouchableOpacity style={styles.select} onPress={() => setOpenList('department')} activeOpacity={0.7}>
                                    <Text style={styles.selectText} numberOfLines={1}>{department?.name ?? 'Select Department'}</Text>
                                    <Icon name="chevron-down" size={scale(15)} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Select Designation</Text>
                            <TouchableOpacity style={styles.select} onPress={() => setOpenList('designation')} activeOpacity={0.7}>
                                <Text style={styles.selectText} numberOfLines={1}>{designation?.name ?? 'Select Designation'}</Text>
                                <Icon name="chevron-down" size={scale(16)} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.applyBtn} onPress={() => load()} activeOpacity={0.8}>
                            <Text style={styles.applyText}>Apply</Text>
                        </TouchableOpacity>

                        {!!error && (
                            <View style={styles.errorBox}>
                                <Icon name="alert-circle-outline" size={scale(16)} color="#B91C1C" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <Text style={styles.countNote}>
                            {activeFiltered.length} active {activeFiltered.length === 1 ? 'record' : 'records'}
                        </Text>

                        {activeSlice.length ? (
                            <>
                                <StaffTable rows={activeSlice} offset={(activePage - 1) * PAGE_SIZE} />
                                <Pager page={activePage} pages={activePages} onPage={setActivePage} />
                            </>
                        ) : (
                            <Text style={styles.empty}>No active staff for these filters.</Text>
                        )}
                    </View>

                    {/* ── Inactive Staff ────────────────────────────────────── */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Inactive Staff</Text>
                        <Text style={styles.countNote}>
                            {inactiveTotal} inactive {inactiveTotal === 1 ? 'record' : 'records'}
                        </Text>

                        {inactive.length ? (
                            <>
                                <StaffTable rows={inactive} offset={(inactivePage - 1) * PAGE_SIZE} />
                                <Pager page={inactivePage} pages={inactivePages} onPage={setInactivePage} />
                            </>
                        ) : (
                            <Text style={styles.empty}>No inactive staff.</Text>
                        )}
                    </View>

                    <View style={{ height: scale(40) }} />
                </ScrollView>
            )}

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
    centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },

    statRow: { flexDirection: 'row', gap: scale(8) },
    statTile: { flex: 1, borderRadius: 12, paddingVertical: scale(14), alignItems: 'center' },
    statValue: { fontSize: scale(22), fontWeight: '700' },
    statLabel: { fontSize: scale(9.5), marginTop: scale(4), textAlign: 'center', paddingHorizontal: scale(4) },

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
    cardTitle: { fontSize: scale(14), fontWeight: '700', color: '#0F172A', marginBottom: scale(10) },

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

    applyBtn: { backgroundColor: '#0F172A', borderRadius: 10, paddingVertical: scale(11), alignItems: 'center' },
    applyText: { color: '#fff', fontSize: scale(12.5), fontWeight: '700' },

    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        padding: scale(10),
        marginTop: scale(10),
    },
    errorText: { flex: 1, fontSize: scale(11.5), color: '#B91C1C' },

    countNote: { fontSize: scale(10.5), color: '#94A3B8', marginTop: scale(10), marginBottom: scale(6) },

    tHead: {
        flexDirection: 'row',
        backgroundColor: '#E63946',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        paddingVertical: scale(8),
        paddingHorizontal: scale(4),
    },
    th: { fontSize: scale(9.5), fontWeight: '700', color: '#fff', paddingHorizontal: scale(4) },
    tr: {
        flexDirection: 'row',
        paddingVertical: scale(8),
        paddingHorizontal: scale(4),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E2E8F0',
    },
    td: { fontSize: scale(10.5), color: '#334155', paddingHorizontal: scale(4) },
    tdLink: { color: '#E63946', fontWeight: '600' },

    pager: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(14),
        marginTop: scale(12),
    },
    pageBtn: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    pageBtnOff: { opacity: 0.5 },
    pageText: { fontSize: scale(11.5), color: '#334155', fontWeight: '600' },

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

export default EmployeeMaster;
