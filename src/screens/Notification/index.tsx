import React, { useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppHeader from '../../components/AppHeader';
import { BackSVG } from '../../assets/svg';

type NotificationItem = {
    id: string;
    title: string;
    description: string;
    type: 'approval' | 'payment' | 'alert' | 'success' | 'report' | 'membership';
    timestamp: string;
    actionLabel?: string;
    borderColor: string;
    iconBg: string;
    icon: string;
    read?: boolean;
};

const tabs = ['All', 'Unread', 'Approvals', 'Alerts', 'Message'];

const sampleNotifications: NotificationItem[] = [
    {
        id: '1',
        title: 'Membership Approval Required',
        description: 'Haroon Agha (HID-4021) has applied for a membership. Please review the application.',
        type: 'approval',
        timestamp: '2 mins ago',
        actionLabel: 'Approve',
        borderColor: '#FF9500',
        iconBg: '#FF9500',
        icon: '✓',
        read: false,
    },
    {
        id: '2',
        title: 'Payment Overdue',
        description: "Yasir Qureshi's membership payment is 7 days overdue.",
        type: 'payment',
        timestamp: '15 mins ago',
        actionLabel: 'Pay Now',
        borderColor: '#E63946',
        iconBg: '#E63946',
        icon: '!',
        read: false,
    },
    {
        id: '3',
        title: 'Server Maintenance Alert',
        description: 'Scheduled maintenance will occur on Friday at 2:00 AM. The system may be temporarily unavailable.',
        type: 'alert',
        timestamp: '15 mins ago',
        actionLabel: 'View',
        borderColor: '#E63946',
        iconBg: '#E63946',
        icon: '⚠',
        read: false,
    },
    {
        id: '4',
        title: 'Payment Received',
        description: 'You have received a payment of PKR 20,000 from Sara Khan.',
        type: 'success',
        timestamp: 'Yesterday',
        actionLabel: 'View',
        borderColor: '#06A77D',
        iconBg: '#06A77D',
        icon: '✓',
        read: true,
    },
    {
        id: '5',
        title: 'Monthly Attendance Report',
        description: 'Your monthly attendance report is now available to view.',
        type: 'report',
        timestamp: 'Yesterday',
        actionLabel: 'Contact',
        borderColor: '#E63946',
        iconBg: '#E63946',
        icon: '📋',
        read: true,
    },
    {
        id: '6',
        title: 'Membership Expiring Soon',
        description: "Yasir Qureshi's membership is set to expire in 3 days. Please notify.",
        type: 'membership',
        timestamp: '12 April 2025',
        actionLabel: 'Contact',
        borderColor: '#E63946',
        iconBg: '#E63946',
        icon: '⚠',
        read: true,
    },
];

const NotificationScreen: React.FC = () => {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState<string>(tabs[0]);
    const [notifications] = useState<NotificationItem[]>(sampleNotifications);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const filtered = useMemo(() => {
        if (activeTab === 'All') return notifications;
        if (activeTab === 'Unread') return notifications.filter(n => !n.read);
        // Add more filters as needed
        return notifications;
    }, [activeTab, notifications]);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(n => n.id)));
        }
    };

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <View style={styles.notificationCard}>
            <TouchableOpacity style={styles.checkbox} onPress={() => toggleSelect(item.id)}>
                <View style={selectedIds.has(item.id) ? styles.checkboxChecked : styles.checkboxEmpty}>
                    {selectedIds.has(item.id) && <Text style={styles.checkmark}>✓</Text>}
                </View>
            </TouchableOpacity>

            <View style={[styles.borderLeft, { borderLeftColor: item.borderColor }]} />

            <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
                <Text style={styles.iconText}>{item.icon}</Text>
            </View>

            <View style={styles.notificationContent}>
                <View style={styles.titleRow}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>

                <Text style={styles.notificationDescription}>{item.description}</Text>

                {item.actionLabel && (
                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <Text style={styles.actionButtonText}>{item.actionLabel}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
    const renderTab = (tab: string) => {
        const selected = tab === activeTab;
        return (
            <TouchableOpacity
                key={tab}
                style={[styles.tabItem, selected && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
            >
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>
                    {tab}
                </Text>
            </TouchableOpacity>
        );
    };
    return (
        <>
            <AppHeader
                title="Notifications"
                leftIcon={<BackSVG width={24} height={24} />}
                rightIcon={<Icon name="magnify" size={24} color="#1A1A1A" />}   // Search
                dotIcon={<Icon name="cog" size={24} color="#1A1A1A" />}         // Settings
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => console.log('Search pressed')}
                onDotPress={() => console.log('Settings pressed')}
                backgroundColor="#FFE5E5"
            />
{/* <View style={styles}></View> */}
            <View style={styles.safe}>
                <View style={styles.tabsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContent}
                    >
                        {tabs.map((tab) => {
                            const selected = tab === activeTab;
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.tabItem, selected && styles.tabItemActive]}
                                    onPress={() => setActiveTab(tab)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.tabText, selected && styles.tabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.checkboxContainer} onPress={selectAll}>
                        <View style={selectedIds.size === filtered.length && filtered.length > 0
                            ? styles.checkboxChecked
                            : styles.checkboxEmpty}>
                            {selectedIds.size === filtered.length && filtered.length > 0 &&
                                <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.selectAllText}>Select All</Text>
                    </TouchableOpacity>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.markAsReadBtn}>
                            <Text style={styles.markAsReadText}>Mark as Read</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn}>
                            <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Notification List */}
                <FlatList
                    data={filtered}
                    keyExtractor={(i) => i.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </>
    );
};

export default NotificationScreen;

const styles = StyleSheet.create({
    safe: { flexGrow: 1, backgroundColor: '#fff' },
    container: { flex: 1 },
    tabsContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingVertical: 8,        // Fixed height area
    },
    /* FIXED TABS */
    tabs: {
        backgroundColor: '#fff',
        maxHeight: '100%',           // Increased height
    },
    tabsContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,     // Better vertical padding
        alignItems: 'center',
    },

    tabItem: {
        paddingVertical: 10,     // Increased vertical padding
        paddingHorizontal: 18,   // Increased horizontal padding
        borderRadius: 20,
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: '#F8F8F8',
        minWidth: 70,            // Prevents text from cutting
    },
    tabItemActive: {
        backgroundColor: '#E63946',
    },
    tabText: { color: '#666', fontSize: 14, fontWeight: '500', lineHeight: 25 },
    tabTextActive: { color: '#fff', fontWeight: '600' },

    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },

    checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
    checkboxEmpty: {
        width: 20,
        height: 20,
        borderWidth: 1.5,
        borderColor: '#CCC',
        borderRadius: 4,
    },
    checkboxChecked: {
        width: 20,
        height: 20,
        backgroundColor: '#E63946',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    selectAllText: { marginLeft: 8, color: '#333', fontSize: 13.5 },

    actionButtons: { flexDirection: 'row', gap: 16 },
    markAsReadText: { color: '#E63946', fontWeight: '600', fontSize: 13.5 },
    deleteText: { color: '#E63946', fontWeight: '600', fontSize: 13.5 },

    listContent: { padding: 12, paddingBottom: '80%' },

    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },

    checkbox: { paddingRight: 12, paddingTop: 4 },
    borderLeft: { width: 5, borderRadius: 4, marginRight: 12 },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    iconText: { color: '#fff', fontSize: 18, fontWeight: '600' },

    notificationContent: { flex: 1 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    notificationTitle: { fontSize: 15, fontWeight: '600', color: '#111', flex: 1 },
    timestamp: { fontSize: 12, color: '#999' },

    notificationDescription: {
        fontSize: 13.5,
        color: '#555',
        lineHeight: 19,
        marginBottom: 10,
    },

    actionButton: {
        alignSelf: 'flex-start',
        backgroundColor: '#E63946',
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});