// DashboardScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ImageSourcePropType,
    Image,
    ActivityIndicator,
    RefreshControl,
    Dimensions
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { Attendance, Edit_fill, Features, Finance, Fitness, ManageStaff, NewRegistration, Package, Payments, ViewReports } from '../../assets/icons';
import AppHeader from '../../components/AppHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import ProfileHeader from '../../components/ProfileHeader';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { getClientsCount, getTodaySummary } from '../../api/dashboard';
import { getEmployeeDashboardStats } from '../../api/employeeDashboard';
import { isAdmin, isSales, isEmployee, isTrainer, isGeneralTrainer, ROLE_LABELS, headerTitleOf } from '../../config/permissions';
import EmployeeDashboardScreen from '../HR/EmployeeDashboard';
import PTDashboardScreen from '../Fitness/PTDashboard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { fetchMembers } from '../../redux/slices/membersSlice';
import RenewalsPanel from './RenewalsPanel';

// ──────────────────────────────────────────────
// Reusable Components
// ──────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Baseline of 375 (standard small-phone width) keeps text/icons proportionate across devices
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

type StatCardProps = {
    label: string;
    value: string | number;
    iconName: string;
};

const StatCard = ({ label, value, iconName }: StatCardProps) => (
    <View style={styles.statCard}>
        <View style={styles.statCardLeft}>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
        </View>
        <View style={styles.statIconCircle}>
            <Icon name={iconName} size={scale(20)} color="#fff" />
        </View>
    </View>
);


// Same footprint as StatCard but tappable and value-less — mirrors the web
// dashboard's "Sell Package" tile, which sits inline in the stats grid rather
// than in the quick-actions row.
const ActionCard = ({ label, iconName, onPress }: { label: string; iconName: string; onPress?: () => void }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.statCardLeft}>
            <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
        </View>
        <View style={styles.statIconCircle}>
            <Icon name={iconName} size={scale(20)} color="#fff" />
        </View>
    </TouchableOpacity>
);


type QuickActionProps = {
    icon: ImageSourcePropType;
    label: string;
    onPress?: () => void;
};

const QuickAction = ({ icon, label, onPress }: QuickActionProps) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
        <View style={styles.quickIconContainer}>
            <Image source={icon} style={styles.icon} />

        </View>
        <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
);


// ──────────────────────────────────────────────
// Main Dashboard Screen
// ──────────────────────────────────────────────

export default function DashboardScreen() {
    const navigation = useNavigation() as any;
    const route = useRoute();

    const dispatch = useDispatch<AppDispatch>();
    const { profile, appImage } = useSelector(
        (state: RootState) => state.user
    );
    const membersCache = useSelector((state: RootState) => state.members);
    const formatCurrency = useCurrencyFormatter();
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

    const firstName = profile?.firstName || 'User';
    const lastName = profile?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    const branchId = profile?.branchId || null;

    const branchName =
        profile?.branchName ||
        (branchId ? `Branch ${branchId}` : 'Main Branch');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const userIsAdmin = isAdmin(profile?.role || profile?.type);
    // A staff record with no role gets the Employee Dashboard as its whole
    // app, matching the web — so Home is that dashboard, not this one.
    const userIsEmployee = isEmployee(profile?.role);
    // Role 9 gets the PT Dashboard as its Home tab (see the early return below).
    const userIsTrainer = isTrainer(profile?.role);
    // Role 17's whole app is the Employee Dashboard (plus a GT Dashboard not
    // built yet), so Home is that dashboard — same as a blank-role employee.
    const userIsGeneralTrainer = isGeneralTrainer(profile?.role);
    const userIsSales = isSales(profile?.role);
    // Sales sees the same client-stats dashboard as admin (confirmed against
    // the web Sales login), not the employee/trainer self-service one.
    const showStatsDashboard = userIsAdmin || userIsSales;

    // Preload the Members list in the background so the Members tab opens
    // instantly instead of showing its own loading spinner on first tap.
    useEffect(() => {
        if (!showStatsDashboard || !branchId) return;
        if (membersCache.loaded && membersCache.branchId === branchId) return;
        if (membersCache.loading) return;
        dispatch(fetchMembers({ branchId }));
    }, [showStatsDashboard, branchId, membersCache.loaded, membersCache.branchId, membersCache.loading, dispatch]);

    // ── Admin stats ───────────────────────────────────────────────────────────
    const [clientsAll, setClientsAll] = useState({ all: 0, active: 0, inactive: 0, dormant: 0 });
    const [clientsF11, setClientsF11] = useState(0);
    const [clientsG13, setClientsG13] = useState(0);
    const [todaySales, setTodaySales] = useState(0);

    // ── Trainer (employee) stats ──────────────────────────────────────────────
    const [empStats, setEmpStats] = useState({
        currentSalary: 0, pendingRequests: 0, dutySlotsCount: 0,
        leaveBalance: 0, approvedDocs: 0, todayAttendance: null as any,
    });

    const fetchClientStats = useCallback(async () => {
        const [all, f11, g13] = await Promise.all([
            getClientsCount(),
            getClientsCount(15),   // F-11
            getClientsCount(1),    // G-13
        ]);
        setClientsAll({ all: all?.all_clients || 0, active: all?.active_clients || 0, inactive: all?.inactive_clients || 0, dormant: all?.dormant_clients || 0 });
        setClientsF11(f11?.all_clients || 0);
        setClientsG13(g13?.all_clients || 0);
    }, []);

    const sumTodaySales = (res: any) => {
        const row = res?.immediate?.[0];
        return row ? (row.pending || 0) + (row.Credit_Card || 0) + (row.Online || 0) + (row.Cash || 0) : 0;
    };

    const fetchTodaySales = useCallback(async () => {
        // Super Admin has no single branch_id (profile.branchId is 0/null — "all
        // branches"), and /v1/summary requires one, so sum F-11 + G-13 instead of
        // skipping the fetch entirely, mirroring the clientsF11/clientsG13 pattern above.
        if (!branchId) {
            const [f11, g13] = await Promise.all([getTodaySummary(15), getTodaySummary(1)]);
            setTodaySales(sumTodaySales(f11) + sumTodaySales(g13));
            return;
        }
        const res = await getTodaySummary(branchId);
        setTodaySales(sumTodaySales(res));
    }, [branchId]);

    const fetchDashboard = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            if (showStatsDashboard) {
                await Promise.all([fetchClientStats(), fetchTodaySales()]);
            } else if (branchId && profile?.id) {
                const stats = await getEmployeeDashboardStats({
                    branch_id: branchId,
                    user_id: profile.id,
                });
                setEmpStats(stats);
            }
        } catch (error: any) {
            console.log('DASHBOARD ERROR =>', error?.response?.data || error.message);
        } finally {
            if (!isRefresh) setLoading(false);
        }
    }, [showStatsDashboard, branchId, profile?.id, fetchClientStats, fetchTodaySales]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchDashboard(true).then(() => setRefreshing(false));
    }, [fetchDashboard]);

    const avatarSource = avatarLoadFailed
        ? require('../../assets/img/userIcon.png')
        : appImage
            ? { uri: appImage }
            : profile?.image
                ? { uri: profile.image }
                : require('../../assets/img/userIcon.png');

    // Was hardcoded to three cases, so trainer / HR / nutritionist / fitness
    // manager all read "Vostro Employee". Now resolved per role.
    const headerTitle = headerTitleOf(profile?.role, profile?.type);

    // Placed after every hook above so hook order stays constant.
    // `openEdit` is set by the drawer's edit icon and carries a timestamp, so
    // tapping it repeatedly re-opens the Change Information modal.
    if (userIsEmployee || userIsGeneralTrainer) {
        return <EmployeeDashboardScreen focusContact={(route as any)?.params?.openEdit} />;
    }

    // A personal trainer lands on the PT Dashboard, not the employee one —
    // the web makes /pt-dashboard role 9's working screen and files Employee
    // Dashboard under the sidebar's Dashboard group, which the drawer now
    // mirrors. The employee dashboard is still reachable from there.
    if (userIsTrainer) return <PTDashboardScreen />;

    return (
        <>
            <AppHeader
                title={headerTitle}
                leftIcon={<BurgerSVG width={24} height={24} />}
                rightIcon={<NotificationSVG width={24} height={24} />}
                onLeftPress={() => navigation.openDrawer()}
                onRightPress={() => navigation.navigate('Notifications')}
                backgroundColor="#FFE5E5"
            />

            {loading ? (
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <ActivityIndicator size="large" color="#E10600" />
                </View>
            ) : (
                <View style={styles.container}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#E10600"
                            />
                        }
                    >
                        {showStatsDashboard ? (
                            /* ── ADMIN / SALES DASHBOARD ─────────────────────── */
                            <>
                                <Text style={styles.welcomeText}>Welcome, {firstName || 'User'}</Text>
                                <ProfileHeader
                                    name={fullName}
                                    role={firstName || 'Admin'}
                                    branch={branchName || 'Main Branch'}
                                    editIcon={Edit_fill}
                                    avatar={avatarSource}
                                    onEditPress={() => console.log('Edit Pressed')}
                                />

                                {/* Stats Grid — Sales mirrors the web dashboard, which
                                    puts a "Sell Package" action tile 4th in the grid. */}
                                <View style={styles.statsGrid}>
                                    <StatCard label="Total Clients"    value={clientsAll.all}     iconName="account-group" />
                                    <StatCard label="F-11 Clients"     value={clientsF11}          iconName="account" />
                                    <StatCard label="G-13 Clients"     value={clientsG13}          iconName="account" />
                                    {userIsSales && (
                                        <ActionCard
                                            label="Sell Package"
                                            iconName="cart-plus"
                                            onPress={() => navigation.navigate('SellPackage')}
                                        />
                                    )}
                                    <StatCard label="Active Clients"   value={clientsAll.active}   iconName="account-check" />
                                    <StatCard label="Inactive Clients" value={clientsAll.inactive} iconName="account-off" />
                                    <StatCard label="Dormant Clients"  value={clientsAll.dormant}  iconName="account-clock" />
                                </View>
                                <View style={[styles.statCard, styles.todaySalesCard]}>
                                    <View style={styles.statCardLeft}>
                                        <Text style={styles.statLabel}>Today Sales</Text>
                                        <Text style={styles.statValue}>{formatCurrency(todaySales)}</Text>
                                    </View>
                                    <View style={styles.statIconCircle}>
                                        <Icon name="trending-up" size={22} color="#fff" />
                                    </View>
                                </View>

                                {/* Quick Actions — not shown for Sales: the web's Sales
                                    dashboard goes straight from the stat cards into the
                                    renewals tabs, and Sell Package / View Clients are
                                    already reachable from the grid tile and the drawer. */}
                                {!userIsSales && (
                                    <View style={styles.quickActionsGrid}>
                                        <QuickAction icon={NewRegistration} label="New Registration"   onPress={() => navigation.navigate('NewMemberRegistration')} />
                                        <QuickAction icon={Package}         label="Sell Package"        onPress={() => navigation.navigate('SellPackage')} />
                                        <QuickAction icon={Attendance}      label="View Attendance"     onPress={() => navigation.navigate('AttendanceScreen')} />
                                        <QuickAction icon={ViewReports}     label="View Reports"        onPress={() => navigation.navigate('Reports')} />
                                        <QuickAction icon={ManageStaff}     label="Manage Staff"        onPress={() => navigation.navigate('ViewStaff')} />
                                        <QuickAction icon={Finance}         label="Finance Dashboard"   onPress={() => navigation.navigate('FinanceDashboard')} />
                                        <QuickAction icon={Fitness}         label="PT Roster"           onPress={() => navigation.navigate('PTRoster')} />
                                        <QuickAction icon={Payments}        label="Approvals"           onPress={() => navigation.navigate('ApprovalsScreen')} />
                                        <QuickAction icon={Features}        label="All Features"        onPress={() => navigation.openDrawer()} />
                                    </View>
                                )}

                                {/* Renewals — Sales only, matching the web dashboard.
                                    Needs a concrete branch; Super Admin's "all
                                    branches" (branchId 0/null) has no equivalent here. */}
                                {userIsSales && branchId ? (
                                    <RenewalsPanel branchId={branchId} />
                                ) : null}
                            </>
                        ) : (
                            /* ── TRAINER / EMPLOYEE DASHBOARD ───────────────── */
                            <>
                                {/* Employee profile card */}
                                <View style={styles.empCard}>
                                    <View style={styles.empCardMain}>
                                        <Text style={styles.empCardBadge}>EMPLOYEE DASHBOARD</Text>
                                        <View style={styles.empCardRow}>
                                            <FastImage
                                                source={avatarSource}
                                                style={styles.empAvatar}
                                                onError={() => setAvatarLoadFailed(true)}
                                            />
                                            <View style={styles.empCardInfo}>
                                                <Text style={styles.empName}>{fullName}</Text>
                                                <Text style={styles.empDesc}>Profile, leave requests, salary & HR approvals</Text>
                                                <View style={styles.empTags}>
                                                    {[(profile as any)?.designation ?? ROLE_LABELS[profile?.role ?? ''], (profile as any)?.department, branchName].filter(Boolean).map((tag: string) => (
                                                        <View key={tag} style={styles.empTag}>
                                                            <Text style={styles.empTagText}>{tag}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Attendance & ID panel */}
                                    <View style={styles.empAttendPanel}>
                                        <View style={styles.empAttendBox}>
                                            <Text style={styles.empAttendLine}>Today: {new Date().toLocaleDateString()}</Text>
                                            <Text style={styles.empAttendLine}>Check In:  {empStats.todayAttendance?.checkin_time_12h  || 'N/A'}</Text>
                                            <Text style={styles.empAttendLine}>Check Out: {empStats.todayAttendance?.checkout_time_12h || 'N/A'}</Text>
                                            <Text style={[styles.empAttendLine, { color: empStats.todayAttendance ? '#22c55e' : '#ef4444', fontWeight: '600' }]}>
                                                Status: {empStats.todayAttendance ? 'Present' : 'N/A'}
                                            </Text>
                                        </View>
                                        <View style={styles.empAttendBox}>
                                            <Text style={styles.empAttendLine}>Employee ID: {profile?.uid || '—'}</Text>
                                            <Text style={styles.empAttendLine}>Joining: {profile?.joining || '—'}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Stat cards — horizontal scroll */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.empStatsScroll}>
                                    {[
                                        { label: 'Current Salary',     value: `Rs ${(empStats.currentSalary || profile?.salary || 0).toLocaleString()}`, sub: 'Latest payroll snapshot',      icon: 'cash' },
                                        { label: 'Pending Requests',   value: empStats.pendingRequests,                        sub: 'Duty-hour requests awaiting',   icon: 'clock-alert' },
                                        { label: 'Duty Slots',         value: empStats.dutySlotsCount,                         sub: 'Active work days',              icon: 'calendar-clock' },
                                        { label: 'Leave Balance',      value: empStats.leaveBalance,                           sub: 'Remaining leave days',          icon: 'calendar-minus' },
                                        { label: 'Approved Documents', value: empStats.approvedDocs,                           sub: 'Verified staff documents',      icon: 'file-check' },
                                    ].map(item => (
                                        <View key={item.label} style={styles.empStatCard}>
                                            <Text style={styles.empStatLabel}>{item.label}</Text>
                                            <Text style={styles.empStatValue}>{item.value}</Text>
                                            <Text style={styles.empStatSub}>{item.sub}</Text>
                                        </View>
                                    ))}
                                </ScrollView>

                                {/* Tab quick actions */}
                                <View style={styles.empTabsGrid}>
                                    {[
                                        { label: 'Profile',                   icon: 'account',          screen: 'Account' },
                                        { label: 'Attendance',                icon: 'calendar-check',   screen: 'AttendanceScreen' },
                                        { label: 'Duty Hours',                icon: 'clock-outline',    screen: 'TrainerDutyHoursScreen' },
                                        { label: 'Salary',                    icon: 'cash',             screen: 'MySalarySlip' },
                                        { label: 'Leave',                     icon: 'calendar-minus',   screen: 'LeaveApplications' },
                                        { label: 'Qualifications',            icon: 'school',           screen: 'Qualifications' },
                                        { label: 'Documents',                 icon: 'file-document',    screen: 'TrainerDocuments' },
                                    ].map(tab => (
                                        <TouchableOpacity
                                            key={tab.label}
                                            style={styles.empTabBtn}
                                            onPress={() => navigation.navigate(tab.screen as any)}
                                        >
                                            <Icon name={tab.icon} size={20} color="#E63946" />
                                            <Text style={styles.empTabLabel}>{tab.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 10,
    },
    roleContainer: {
        // flexDirection: 'row',
        // alignItems: 'center',
        marginTop: 4,
    },
    roleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0284c7',
    },
    branchText: {
        fontSize: 14,
        color: '#64748b',
    },
    profileCard: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    icon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    avatarContainer: {
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#0284c7',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#0284c7',
    },
    // ── Stats grid (3-column, matches website) ────────────────────────────────
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 16,
    },
    todaySalesRow: {
        marginTop: 10,
        marginBottom: 16,
    },
    todaySalesCard: {
        width: '100%',
        marginTop: 10,
        marginBottom: 16,
    },
    statCard: {
        width: '30%',             // 3 per row, leaves room for the 10dp gaps
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: scale(10),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    statCardLeft: {
        flex: 1,
        marginRight: scale(4),
    },
    statLabel: {
        fontSize: scale(10.5),
        color: '#64748b',
        marginBottom: scale(4),
    },
    statValue: {
        fontSize: scale(17),
        fontWeight: '700',
        color: '#E63946',
    },
    statIconCircle: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
        backgroundColor: '#E63946',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ── Trainer employee dashboard ────────────────────────────────────────────
    empCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginTop: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    empCardMain: { marginBottom: 12 },
    empCardBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: '#E63946',
        letterSpacing: 1,
        marginBottom: 10,
    },
    empCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    empAvatar: { width: 60, height: 60, borderRadius: 30 },
    empCardInfo: { flex: 1 },
    empName: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
    empDesc: { fontSize: 12, color: '#64748b', marginBottom: 8 },
    empTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    empTag: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    empTagText: { fontSize: 11, color: '#334155' },
    empAttendPanel: { gap: 8 },
    empAttendBox: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 10,
    },
    empAttendLine: { fontSize: 12, color: '#475569', lineHeight: 20 },
    empStatsScroll: { marginTop: 16, marginBottom: 4, paddingBottom: 6 },
    empStatCard: {
        width: 148,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginRight: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    empStatLabel: { fontSize: 11, color: '#64748b', marginBottom: 6 },
    empStatValue: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
    empStatSub: { fontSize: 10, color: '#94a3b8' },
    empTabsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 16,
    },
    empTabBtn: {
        width: '30%',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    empTabLabel: { fontSize: 11, color: '#334155', fontWeight: '500', textAlign: 'center' },

    newRegValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#0f766e',
    },
    newRegLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginTop: 4,
    },
    newRegSub: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingVertical: 8,
        gap: 12,
    },
    quickAction: {
        width: '30%',
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    quickIconContainer: {
        marginBottom: 8,
    },
    quickLabel: {
        fontSize: 12,
        textAlign: 'center',
        color: '#334155',
        fontWeight: '500',
    },
    recentSection: {
        marginTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    viewAll: {
        color: '#6B7280',
        fontWeight: '600',
    },
    activityItem: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between', // push text left, time right
        alignItems: 'center',
    },

    activityText: {
        fontSize: 13,
        color: '#1e293b',
        fontWeight: '500',
        flexShrink: 1, // allows long text to wrap/truncate if needed
    },

    activityTime: {
        fontSize: 12,
        color: '#64748b',
        marginLeft: 8,
    },

});