// DashboardScreen.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    ImageSourcePropType,
    Image
} from 'react-native';
import { Attendance, Cafe, Edit_fill, Features, Finance, Fitness, Freezing, ManageStaff, Members, NewRegistration, Notification, Package, Payments, Pending, ViewReports, Wallet } from '../../assets/icons';
import AppHeader from '../../components/AppHeader';
import { useNavigation } from '@react-navigation/native';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import ProfileHeader from '../../components/ProfileHeader';

// ──────────────────────────────────────────────
// Reusable Components
// ──────────────────────────────────────────────

type StatCardProps = {
    icon: ImageSourcePropType;
    value: string | number;
    label: string;
    trend?: string;
    trendColor?: string;
    backgroundColor?: string;
};

const StatCard = ({
    icon,
    value,
    label,
    trend,
    trendColor = '#4CAF50',
}: StatCardProps) => (
    <View style={[styles.statCard]}>
        <View style={styles.statTop}>
            <View style={styles.statIconContainer}>
                <Image source={icon} style={styles.icon} />
                <Text style={styles.statValue}>{value}</Text>
            </View>
            {label && <Text style={styles.statLabel}>{label}</Text>}
        </View>
        {trend && (
            <Text style={[styles.statTrend, { color: trendColor }]}>
                {trend}
            </Text>
        )}
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
    const navigation = useNavigation();
    return (
        <>
            <AppHeader
                title="Vostro Admin"
                leftIcon={<BurgerSVG width={24} height={24} />}
                rightIcon={<NotificationSVG width={24} height={24} />}
                onLeftPress={() => navigation.openDrawer()}
                onRightPress={() => navigation.navigate('Notifications')}
                backgroundColor="#FFE5E5"
            />
            <SafeAreaView style={styles.container}>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header / Welcome */}
                    <Text style={styles.welcomeText}>Welcome, Ahmed</Text>

                    <ProfileHeader
                        name="Ahmed"
                        role="Super Admin"
                        branch="Dha Phase 6 Branch"
                        editIcon={Edit_fill}
                        avatar={require('../../assets/img/userIcon.png')} 
                        onEditPress={() => console.log('Edit Pressed')}
                    />


                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <StatCard
                            icon={Members}
                            value="245"
                            label="Total members active"
                            trend="+12 this month"
                        />
                        <StatCard
                            icon={Wallet}
                            value="PKR 85,500"
                            trend="vs Yesterday"
                        // trendColor="#10b981"

                        />
                    </View>

                    {/* Secondary Stats */}
                    <View style={styles.secondaryStats}>
                        <StatCard
                            icon={Pending}
                            value="Pending Approvals"
                            trend="View All >"
                            backgroundColor="#fefce8"
                        />
                        <StatCard
                            icon={Attendance}
                            value="92% Attendance"
                            trend="156/240 Members"
                            backgroundColor="#ecfdf5"
                        />
                    </View>

                    <View style={styles.secondaryStats}>
                        <StatCard
                            icon={Pending}
                            value="62%"
                            trend="Current members: 156 / 240"
                            label="Gym Capacity Today"
                            backgroundColor="#fefce8"
                        />
                        <StatCard
                            icon={NewRegistration}
                            value="12"
                            label="New Registrations"
                            backgroundColor="#ecfdf5"
                            trend='This Week >'
                        />
                    </View>


                    {/* Quick Actions Grid */}
                    <View style={styles.quickActionsGrid}>
                        <QuickAction icon={NewRegistration} label="New Member Registrations" />
                        <QuickAction icon={Package} label="Create Package" />
                        <QuickAction icon={Attendance} label="View Attendance" />
                        <QuickAction icon={ViewReports} label="View Reports" />
                        <QuickAction icon={ManageStaff} label="Manage Staff" />
                        <QuickAction icon={Finance} label="View Finance" />
                        <QuickAction icon={Cafe} label="Cafe Operations" />
                        <QuickAction icon={Fitness} label="Create Fitness Plan" />
                        <QuickAction icon={Payments} label="Process Payments" />
                        <QuickAction icon={Features} label="All Features" />
                    </View>

                    {/* Recent Activities */}
                    <View style={styles.recentSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Activities</Text>
                            <TouchableOpacity>
                                <Text style={styles.viewAll}>View all activities {'>'}</Text>
                            </TouchableOpacity>
                        </View>

<View style={styles.activityItem}>
    <View style={styles.activityIcon}>
        <Image source={NewRegistration} style={styles.icon} />
    </View>
    <View style={styles.activityContent}>
        <Text style={styles.activityText}>John Doe registered as member</Text>
        <Text style={styles.activityTime}>2 mins ago</Text>
    </View>
</View>

                        <View style={styles.activityItem}>
                            <View style={styles.activityIcon}>
                                <Image source={Payments} style={styles.icon} />
                            </View>
                            <View style={styles.activityContent}>
                                <Text style={styles.activityText}>Payment received from Maria</Text>
                                <Text style={styles.activityTime}>1 hour ago</Text>
                            </View>
                        </View>
                        <View style={styles.activityItem}>
                            <View style={styles.activityIcon}>
                                <Image source={Freezing} style={styles.icon} />

                            </View>
                            <View style={styles.activityContent}>
                                <Text style={styles.activityText}>Freezing request approved</Text>
                                <Text style={styles.activityTime}>3 hours ago</Text>
                            </View>
                        </View>

                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f1ff1',
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
    statsRow: {
        flexDirection: 'row',
        // paddingHorizontal: 16,
        gap: 8,
        marginVertical: 8,
    },

    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        backgroundColor: "#FFFFFF",

        // Flex layout to push trend to bottom
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 120, // optional: ensure enough height for space-between to work
    },

    statTop: {
        // This wraps the icon + value + label
    },

    statTrend: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 10,
        borderTopColor: '#D9D9D9',
        borderTopWidth: 1,
        paddingTop: 6,
        textAlign: 'left',
    },

    // statCard: {
    //     flex: 1,
    //     padding: 16,
    //     borderRadius: 16,
    //     elevation: 2,
    //     shadowColor: '#000',
    //     shadowOffset: { width: 0, height: 2 },
    //     shadowOpacity: 0.1,
    //     shadowRadius: 4,
    //     backgroundColor: "#FFFFFF",
    // },
    statIconContainer: {
        marginBottom: 12,
        gap: 4,
        flexDirection: 'row'
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: '#475569',
    },
    // statTrend: {
    //     fontSize: 13,
    //     fontWeight: '600',
    //     marginTop: 10,
    //     borderTopColor: '#D9D9D9',
    //     borderTopWidth: 1
    // },
    secondaryStats: {
        flexDirection: 'row',
        // paddingHorizontal: 16,
        gap: 12,
        marginVertical: 12,
    },
    capacityRow: {
        flexDirection: 'row',
        // paddingHorizontal: 16,
        gap: 12,
        marginVertical: 8,
    },
    capacityCard: {
        flex: 1,
        backgroundColor: '#eff6ff',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    capacityValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#1d4ed8',
    },
    capacityLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginTop: 4,
    },
    capacitySub: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
    },
    newRegCard: {
        flex: 1,
        backgroundColor: '#f0fdfa',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
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