// DashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ImageSourcePropType,
    Image,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { Attendance, Cafe, Edit_fill, Features, Finance, Fitness, ManageStaff, NewRegistration, Package, Payments, ViewReports } from '../../assets/icons';
import AppHeader from '../../components/AppHeader';
import { useNavigation } from '@react-navigation/native';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import ProfileHeader from '../../components/ProfileHeader';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { getClientsCount, getTodaySummary } from '../../api/dashboard';
import { getEmployeeDashboardStats } from '../../api/employeeDashboard';
import { isAdmin } from '../../config/permissions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ──────────────────────────────────────────────
// Reusable Components
// ──────────────────────────────────────────────

type StatCardProps = {
    label: string;
    value: string | number;
    iconName: string;
};

const StatCard = ({ label, value, iconName }: StatCardProps) => (
    <View style={styles.statCard}>
        <View style={styles.statCardLeft}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
        </View>
        <View style={styles.statIconCircle}>
            <Icon name={iconName} size={22} color="#fff" />
        </View>
    </View>
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

    const { profile, appImage } = useSelector(
        (state: RootState) => state.user
    );

    const firstName = profile?.firstName || 'User';
    const lastName = profile?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    const role =
        profile?.type ||
        profile?.role ||
        'Staff';

    const branchId = profile?.branchId || null;

    const branchName =
        profile?.branchName ||
        (branchId ? `Branch ${branchId}` : 'Main Branch');

    const username =
        profile?.username ||
        fullName;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const userIsAdmin = isAdmin(profile?.role || profile?.type);

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

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            if (userIsAdmin) {
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
            setLoading(false);
        }
    };

    const fetchClientStats = async () => {
        const [all, f11, g13] = await Promise.all([
            getClientsCount(),
            getClientsCount(15),   // F-11
            getClientsCount(1),    // G-13
        ]);
        setClientsAll({ all: all?.all_clients || 0, active: all?.active_clients || 0, inactive: all?.inactive_clients || 0, dormant: all?.dormant_clients || 0 });
        setClientsF11(f11?.all_clients || 0);
        setClientsG13(g13?.all_clients || 0);
    };

    const fetchTodaySales = async () => {
        if (!branchId) return;
        const res = await getTodaySummary(branchId);
        const row = res?.immediate?.[0];
        if (row) setTodaySales((row.pending || 0) + (row.Credit_Card || 0) + (row.Online || 0) + (row.Cash || 0));
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchDashboard().then(() => setRefreshing(false));
    }, [branchId, userIsAdmin]);

    const avatarSource = appImage
        ? { uri: appImage }
        : profile?.image
            ? { uri: profile.image }
            : require('../../assets/img/userIcon.png');

    const headerTitle = isAdmin(role) ? 'Vostro Admin' : 'Vostro Employee';

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
                        {userIsAdmin ? (
                            /* ── ADMIN DASHBOARD ─────────────────────────────── */
                            <>
                                <Text style={styles.welcomeText}>Welcome, {firstName || 'User'}</Text>
                                <ProfileHeader
                                    name={fullName}
                                    role={role || 'Admin'}
                                    branch={branchName || 'Main Branch'}
                                    editIcon={Edit_fill}
                                    avatar={avatarSource}
                                    onEditPress={() => console.log('Edit Pressed')}
                                />

                                {/* Stats Grid */}
                                <View style={styles.statsGrid}>
                                    <StatCard label="Total Clients"    value={clientsAll.all}     iconName="account-group" />
                                    <StatCard label="F-11 Clients"     value={clientsF11}          iconName="account" />
                                    <StatCard label="G-13 Clients"     value={clientsG13}          iconName="account" />
                                    <StatCard label="Active Clients"   value={clientsAll.active}   iconName="account-check" />
                                    <StatCard label="Inactive Clients" value={clientsAll.inactive} iconName="account-off" />
                                    <StatCard label="Dormant Clients"  value={clientsAll.dormant}  iconName="account-clock" />
                                </View>
                                <View style={[styles.statCard, styles.todaySalesCard]}>
                                    <View style={styles.statCardLeft}>
                                        <Text style={styles.statLabel}>Today Sales</Text>
                                        <Text style={styles.statValue}>PKR {todaySales.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.statIconCircle}>
                                        <Icon name="trending-up" size={22} color="#fff" />
                                    </View>
                                </View>

                                {/* Quick Actions */}
                                <View style={styles.quickActionsGrid}>
                                    <QuickAction icon={NewRegistration} label="New Registration"   onPress={() => navigation.navigate('NewMemberRegistration')} />
                                    <QuickAction icon={Package}         label="Sell Package"        onPress={() => navigation.navigate('NewPackage')} />
                                    <QuickAction icon={Attendance}      label="View Attendance"     onPress={() => navigation.navigate('AttendanceScreen')} />
                                    <QuickAction icon={ViewReports}     label="View Reports"        onPress={() => navigation.navigate('Reports')} />
                                    <QuickAction icon={ManageStaff}     label="Manage Staff"        onPress={() => navigation.navigate('ViewStaff')} />
                                    <QuickAction icon={Finance}         label="Finance Dashboard"   onPress={() => navigation.navigate('FinanceDashboard')} />
                                    <QuickAction icon={Fitness}         label="PT Roster"           onPress={() => navigation.navigate('PTRoster')} />
                                    <QuickAction icon={Payments}        label="Approvals"           onPress={() => navigation.navigate('ApprovalsScreen')} />
                                    <QuickAction icon={Features}        label="All Features"        onPress={() => navigation.openDrawer()} />
                                </View>
                            </>
                        ) : (
                            /* ── TRAINER / EMPLOYEE DASHBOARD ───────────────── */
                            <>
                                {/* Employee profile card */}
                                <View style={styles.empCard}>
                                    <View style={styles.empCardMain}>
                                        <Text style={styles.empCardBadge}>EMPLOYEE DASHBOARD</Text>
                                        <View style={styles.empCardRow}>
                                            <Image source={avatarSource} style={styles.empAvatar} />
                                            <View style={styles.empCardInfo}>
                                                <Text style={styles.empName}>{fullName}</Text>
                                                <Text style={styles.empDesc}>Profile, leave requests, salary & HR approvals</Text>
                                                <View style={styles.empTags}>
                                                    {[profile?.designation, profile?.department, branchName].filter(Boolean).map((tag: string) => (
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
                                            <Text style={styles.empAttendLine}>Check In:  {empStats.todayAttendance?.checkin_time_12h  || '—'}</Text>
                                            <Text style={styles.empAttendLine}>Check Out: {empStats.todayAttendance?.checkout_time_12h || '—'}</Text>
                                            <Text style={[styles.empAttendLine, { color: empStats.todayAttendance ? '#22c55e' : '#ef4444', fontWeight: '600' }]}>
                                                Status: {empStats.todayAttendance ? 'Present' : 'Absent'}
                                            </Text>
                                        </View>
                                        <View style={styles.empAttendBox}>
                                            <Text style={styles.empAttendLine}>Employee ID: {profile?.uid || '—'}</Text>
                                            <Text style={styles.empAttendLine}>Joining: {profile?.joining || profile?.joiningDate || '—'}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Stat cards — horizontal scroll */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.empStatsScroll}>
                                    {[
                                        { label: 'Current Salary',     value: `Rs ${empStats.currentSalary.toLocaleString()}`, sub: 'Latest payroll snapshot',      icon: 'cash' },
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
        width: '31.5%',           // 3 per row with gap
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
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
    },
    statLabel: {
        fontSize: 11,
        color: '#64748b',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#E63946',
    },
    statIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E63946',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
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