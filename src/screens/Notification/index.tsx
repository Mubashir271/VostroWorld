import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    StyleSheet, Text, View,
    TouchableOpacity, FlatList, ScrollView, ActivityIndicator,
} from 'react-native'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import AppHeader from '../../components/AppHeader'
import { BackSVG } from '../../assets/svg'
import api from '../../api/service'

type RootStackParamList = {
    Settings: undefined
}

type NotificationItem = {
    id: string
    title: string
    description: string
    type: 'approval' | 'payment' | 'alert' | 'success' | 'report' | 'membership' | 'announcement'
    timestamp: string
    actionLabel?: string
    borderColor: string
    iconBg: string
    icon: string
    read: boolean
}

const TABS = ['All', 'Unread', 'Approvals', 'Alerts', 'Message'] as const
type Tab = typeof TABS[number]

// ── Map API announcement → NotificationItem ────────────────────────────────
const mapAnnouncement = (a: {
    id: number
    title: string
    description: string
    created_at: string
}): NotificationItem => ({
    id: String(a.id),
    title: a.title,
    description: a.description,
    type: 'announcement',
    timestamp: new Date(a.created_at).toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }),
    actionLabel: 'View',
    borderColor: '#378ADD',
    iconBg: '#378ADD',
    icon: '📢',
    read: false,
})

const NotificationScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>()

    // ── Local state ────────────────────────────────────────────────────────
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<Tab>('All')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // ── Fetch announcements ────────────────────────────────────────────────
    const fetchAnnouncements = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await api.get('/v1/announcements/index')
            console.log("NOTIFICATIONS: ", res)
            // "No record found" → empty list, not an error
            if (!res.data.status) {
                if (res.data.message === 'No record found') {
                    setNotifications([])
                } else {
                    setError(
                        typeof res.data.message === 'string'
                            ? res.data.message
                            : 'Something went wrong'
                    )
                }
                return
            }
            setNotifications(res.data.data.map(mapAnnouncement))
        } catch (err: any) {
            setError(err?.message ?? 'Network error')
            console.log(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAnnouncements()
    }, [fetchAnnouncements])

    // ── Filtered list ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        switch (activeTab) {
            case 'Unread': return notifications.filter((n) => !n.read)
            case 'Approvals': return notifications.filter((n) => n.type === 'approval')
            case 'Alerts': return notifications.filter((n) => n.type === 'alert' || n.type === 'payment')
            case 'Message': return notifications.filter((n) => n.type === 'announcement')
            default: return notifications
        }
    }, [activeTab, notifications])

    // ── Selection handlers ─────────────────────────────────────────────────
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }, [])

    const selectAll = useCallback(() => {
        setSelectedIds(
            selectedIds.size === filtered.length
                ? new Set()
                : new Set(filtered.map((n) => n.id))
        )
    }, [selectedIds, filtered])

    // ── Bulk actions (local state only) ────────────────────────────────────
    const handleMarkAsRead = useCallback(() => {
        if (selectedIds.size === 0) return
        setNotifications((prev) =>
            prev.map((n) => selectedIds.has(n.id) ? { ...n, read: true } : n)
        )
        setSelectedIds(new Set())
    }, [selectedIds])

    const handleDelete = useCallback(() => {
        if (selectedIds.size === 0) return
        setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)))
        setSelectedIds(new Set())
    }, [selectedIds])

    // ── Render item ────────────────────────────────────────────────────────
    const renderItem = useCallback(({ item }: { item: NotificationItem }) => (
        <View style={[
            styles.notificationCard,
            !item.read && styles.notificationCardUnread,
        ]}>
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
                    <Text style={styles.notificationTitle} numberOfLines={2}>{item.title}</Text>
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
    ), [selectedIds, toggleSelect])

    const allSelected = selectedIds.size === filtered.length && filtered.length > 0

    return (
        <>
            <AppHeader
                title="Notifications"
                leftIcon={<BackSVG width={24} height={24} />}
                rightIcon={<Icon name="magnify" size={24} color="#1A1A1A" />}
                dotIcon={<Icon name="cog" size={24} color="#1A1A1A" />}
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => console.log('Search pressed')}
                onDotPress={() => navigation.navigate('Settings')}
                backgroundColor="#FFE5E5"
            />

            <View style={styles.safe}>
                {/* ── Tabs ──────────────────────────────────────────────── */}
                <View style={styles.tabsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContent}
                    >
                        {TABS.map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabItem, tab === activeTab && styles.tabItemActive]}
                                onPress={() => setActiveTab(tab)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabText, tab === activeTab && styles.tabTextActive]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* ── Action bar ─────────────────────────────────────────── */}
                <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.checkboxContainer} onPress={selectAll}>
                        <View style={allSelected ? styles.checkboxChecked : styles.checkboxEmpty}>
                            {allSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.selectAllText}>Select All</Text>
                    </TouchableOpacity>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            onPress={handleMarkAsRead}
                            disabled={selectedIds.size === 0}
                        >
                            <Text style={[
                                styles.markAsReadText,
                                selectedIds.size === 0 && styles.disabledText,
                            ]}>
                                Mark as Read
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleDelete}
                            disabled={selectedIds.size === 0}
                        >
                            <Text style={[
                                styles.deleteText,
                                selectedIds.size === 0 && styles.disabledText,
                            ]}>
                                Delete
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Body ──────────────────────────────────────────────── */}
                {loading ? (
                    <ActivityIndicator size="large" color="#E63946" style={styles.loader} />
                ) : error ? (
                    <View style={styles.errorWrap}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={fetchAnnouncements}>
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(i) => i.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No notifications here.</Text>
                        }
                    />
                )}
            </View>
        </>
    )
}

export default NotificationScreen

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8F8F8' },

    tabsContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    tabsContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabItem: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: '#F8F8F8',
        minWidth: 70,
    },
    tabItemActive: { backgroundColor: '#E63946' },
    tabText: { color: '#666', fontSize: 14, fontWeight: '500' },
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
    disabledText: { opacity: 0.35 },

    listContent: { padding: 12, paddingBottom: 40 },

    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    notificationCardUnread: {
        borderColor: '#FFE5E5',
        backgroundColor: '#FFFAFA',
    },

    checkbox: { paddingRight: 12, paddingTop: 4 },
    borderLeft: { width: 5, borderRadius: 4, marginRight: 12, borderLeftWidth: 5 },
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
    notificationTitle: { fontSize: 14, fontWeight: '600', color: '#111', flex: 1, marginRight: 8 },
    timestamp: { fontSize: 12, color: '#999' },
    notificationDescription: { fontSize: 13.5, color: '#555', lineHeight: 19, marginBottom: 10 },

    actionButton: {
        alignSelf: 'flex-start',
        backgroundColor: '#E63946',
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

    loader: { marginTop: 60 },
    errorWrap: { alignItems: 'center', marginTop: 60, gap: 12 },
    errorText: { color: '#E63946', fontSize: 14 },
    retryText: { color: '#378ADD', fontSize: 14, fontWeight: '600' },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 60, fontSize: 14 },
})