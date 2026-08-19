import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import { RootState } from '../../../redux/store';
import api from '../../../api/service';
import { getClientsCount, getTodaySummary } from '../../../api/dashboard';

interface RenewalRecord {
  id: number;
  client_name: string;
  package_name: string;
  package_price: number;
  renewal_date: string;
  status: string;
}

interface ClientStats {
  total: number;
  f11: number;
  g13: number;
  active: number;
  inactive: number;
  dormant: number;
  todaySales: number;
}

const TABS = ['GYM Packages', 'Trainer Packages', 'Classes'] as const;
type Tab = typeof TABS[number];

const CATEGORY_MAP: Record<Tab, number> = {
  'GYM Packages': 1,
  'Trainer Packages': 2,
  'Classes': 7,
};

const FILTER_OPTIONS = ['All', 'This Month', 'Next Month', 'Expired'];

const fmtPrice = (n: number) =>
  n ? `Rs ${n.toLocaleString()}/-` : '—';

const fmtDate = (s: string) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
};

const SessionPortalHR = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [stats, setStats] = useState<ClientStats>({ total: 0, f11: 0, g13: 0, active: 0, inactive: 0, dormant: 0, todaySales: 0 });
  const [activeTab, setActiveTab] = useState<Tab>('GYM Packages');
  const [filter, setFilter] = useState('All');
  const [showFilterDD, setShowFilterDD] = useState(false);
  const [records, setRecords] = useState<RenewalRecord[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [all, f11, g13, sales] = await Promise.all([
        getClientsCount(),
        getClientsCount(1),   // F-11
        getClientsCount(15),  // G-13
        getTodaySummary(branchId),
      ]);

      const row = sales?.immediate?.[0];
      const todaySales = row
        ? (row.pending || 0) + (row.Credit_Card || 0) + (row.Online || 0) + (row.Cash || 0)
        : 0;

      setStats({
        total:    all?.all_clients      ?? 0,
        f11:      f11?.all_clients      ?? 0,
        g13:      g13?.all_clients      ?? 0,
        active:   all?.active_clients   ?? 0,
        inactive: all?.inactive_clients ?? 0,
        dormant:  all?.dormant_clients  ?? 0,
        todaySales,
      });
    } catch {
      // leave defaults
    } finally {
      setLoadingStats(false);
    }
  }, [branchId]);

  const loadRenewals = useCallback(async (isRefresh = false, pageNum = 1) => {
    if (isRefresh) { setRefreshing(true); setPage(1); }
    else if (pageNum === 1) setLoadingList(true);
    else setLoadingMore(true);

    try {
      const today = new Date();
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0];
      const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().split('T')[0];

      const params: any = {
        branch_id: branchId,
        category: CATEGORY_MAP[activeTab],
        limit: 25,
        page: pageNum,
      };
      if (filter === 'This Month') { params.start_date = thisMonthStart; params.end_date = thisMonthEnd; }
      if (filter === 'Next Month') { params.start_date = nextMonthStart; params.end_date = nextMonthEnd; }
      if (filter === 'Expired') { params.package_status = 'Expired'; }

      const res = await api.get('/v1/orders-detail/get', { params });
      const raw = res.data?.data ?? res.data ?? {};
      const list: RenewalRecord[] = (Array.isArray(raw) ? raw : raw.data ?? []).map((r: any) => ({
        id: r.id,
        client_name: r.client_name ?? r.client?.name ?? `Client #${r.client_id}`,
        package_name: r.package_name ?? r.package?.name ?? '—',
        package_price: r.package_price ?? r.price ?? 0,
        renewal_date: r.end_date ?? r.renewal_date ?? r.updated_at ?? '',
        status: r.package_status ?? r.status ?? 'Active',
      }));

      setLastPage(raw.last_page ?? 1);
      setPage(pageNum);
      setRecords(pageNum === 1 ? list : prev => [...prev, ...list]);
    } catch {
      if (pageNum === 1) setRecords([]);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [branchId, activeTab, filter]);

  useEffect(() => { loadStats(); }, [branchId]);
  useEffect(() => { loadRenewals(false, 1); }, [activeTab, filter, branchId]);

  const onRefresh = () => {
    loadStats();
    loadRenewals(true, 1);
  };

  const statCards = [
    { label: 'Total Clients', value: stats.total, icon: 'account-group', color: '#E63946' },
    { label: 'F-11 Clients', value: stats.f11, icon: 'account-multiple', color: '#1E88E5' },
    { label: 'G-13 Clients', value: stats.g13, icon: 'account-multiple', color: '#1E88E5' },
    { label: 'Active Clients', value: stats.active, icon: 'account-check', color: '#43A047' },
    { label: 'Inactive Clients', value: stats.inactive, icon: 'account-off', color: '#FB8C00' },
    { label: 'Dormant Clients', value: stats.dormant, icon: 'account-clock', color: '#9E9E9E' },
    { label: 'Today Sales', value: `Rs ${stats.todaySales.toLocaleString()}`, icon: 'cash-multiple', color: '#E63946', wide: true },
  ];

  const tabLabel = activeTab === 'GYM Packages'
    ? 'RENEWALS GYM PACKAGES'
    : activeTab === 'Trainer Packages'
    ? 'RENEWALS TRAINER PACKAGES'
    : 'RENEWALS BOOTCAMP CLASSES';

  return (
    <View style={styles.container}>
      <AppHeader
        title="Session Portal (HR)"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E63946']} />}
      >
        {/* Stat Cards */}
        {loadingStats ? (
          <View style={styles.statsGrid}>
            {[...Array(7)].map((_, i) => (
              <View key={i} style={[styles.statCard, i === 6 && styles.statCardWide, styles.statCardSkeleton]} />
            ))}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((card, i) => (
              <View key={i} style={[styles.statCard, card.wide && styles.statCardWide]}>
                <View style={styles.statTop}>
                  <Text style={styles.statLabel}>{card.label}</Text>
                  <View style={[styles.statIconCircle, { backgroundColor: card.color }]}>
                    <Icon name={card.icon} size={18} color="#fff" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: card.color }]}>
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{tabLabel}</Text>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterDD(v => !v)}>
            <Text style={styles.filterText}>{filter === 'All' ? 'Filter Renewals' : filter}</Text>
            <Icon name="chevron-down" size={16} color="#555" />
          </TouchableOpacity>
        </View>
        {showFilterDD && (
          <View style={styles.filterDropdown}>
            {FILTER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={styles.filterItem}
                onPress={() => { setFilter(opt); setShowFilterDD(false); }}
              >
                <Text style={[styles.filterItemText, filter === opt && styles.filterItemActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Table */}
        {loadingList ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
        ) : records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No Record Found</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.cSr]}>Sr#</Text>
                  <Text style={[styles.th, styles.cClient]}>Client</Text>
                  <Text style={[styles.th, styles.cPkg]}>Package Name</Text>
                  <Text style={[styles.th, styles.cPrice]}>Package Price</Text>
                  <Text style={[styles.th, styles.cDate]}>Renewal Date</Text>
                  <Text style={[styles.th, styles.cAction]}>Action</Text>
                </View>
                {records.map((r, idx) => {
                  const isActive = r.status?.toLowerCase() === 'active';
                  return (
                    <View key={r.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                      <Text style={[styles.td, styles.cSr]}>{(page - 1) * 25 + idx + 1}</Text>
                      <Text style={[styles.td, styles.cClient, styles.clientName]}>{r.client_name}</Text>
                      <Text style={[styles.td, styles.cPkg]}>{r.package_name}</Text>
                      <Text style={[styles.td, styles.cPrice]}>{fmtPrice(r.package_price)}</Text>
                      <Text style={[styles.td, styles.cDate]}>{fmtDate(r.renewal_date)}</Text>
                      <View style={styles.cAction}>
                        <TouchableOpacity style={[styles.actionBtn, isActive ? styles.actionActive : styles.actionRenew]}>
                          <Icon name={isActive ? 'check-circle' : 'refresh'} size={12} color="#fff" />
                          <Text style={styles.actionText}>{isActive ? 'Active' : 'Renew'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {page < lastPage && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => loadRenewals(false, page + 1)}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.loadMoreText}>Load More</Text>}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll: { padding: 16, paddingBottom: 40 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 10, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  statCardWide: { width: '100%' },
  statCardSkeleton: { height: 80, backgroundColor: '#eee' },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statLabel: { fontSize: 12, color: '#666', fontWeight: '600', flex: 1 },
  statIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },

  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 4, marginBottom: 12, elevation: 1 },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#E63946' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#888' },
  tabTextActive: { color: '#fff' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1a1a1a' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff' },
  filterText: { fontSize: 12, color: '#555' },
  filterDropdown: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, marginBottom: 8 },
  filterItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  filterItemText: { fontSize: 13, color: '#333' },
  filterItemActive: { color: '#E63946', fontWeight: '700' },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 10, padding: 24, alignItems: 'center', elevation: 1 },
  emptyText: { fontSize: 14, color: '#888' },

  tableHeader: { flexDirection: 'row', backgroundColor: '#E63946', paddingVertical: 12, paddingHorizontal: 4, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  th: { fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' },
  td: { fontSize: 12, color: '#333', textAlign: 'center' },
  clientName: { color: '#1E88E5', fontWeight: '600' },

  cSr: { width: 36 },
  cClient: { width: 130 },
  cPkg: { width: 180 },
  cPrice: { width: 100 },
  cDate: { width: 100 },
  cAction: { width: 80, alignItems: 'center' },

  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  actionActive: { backgroundColor: '#43A047' },
  actionRenew: { backgroundColor: '#E63946' },
  actionText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  loadMoreBtn: { marginTop: 12, backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  loadMoreText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default SessionPortalHR;
