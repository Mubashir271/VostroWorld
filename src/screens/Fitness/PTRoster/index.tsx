import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, SectionList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../redux/store';
import { getPTRosterAdmin } from '../../../api/employeeDashboard';

interface PTClient {
  id: number;
  client_name: string;
  total_sessions: number;
  sale_date: string;
  renewal_date: string;
  status: string;
  package_name: string;
}

interface TrainerGroup {
  trainer_name: string;
  clients: PTClient[];
  total: number;
  active: number;
  expired: number;
}

const STATUS_TABS = ['All', 'Active', 'Expired'];

const PTRoster = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [groups, setGroups] = useState<TrainerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getPTRosterAdmin({
        branch_id: branchId,
        limit: 200,
      });
      // API returns { data: { data: [ { Trainer_name, appointments: [...] } ] } }
      const trainers: any[] = res?.data?.data ?? res?.data ?? res ?? [];

      const grouped: TrainerGroup[] = trainers.map((t: any) => {
        const tName = t.Trainer_name || t.trainer_name || 'Unknown';
        const clients: PTClient[] = (t.appointments ?? []).map((a: any) => ({
          id: a.id,
          client_name: a.client_name,
          total_sessions: a.total_sessions ?? a.quantity,
          sale_date: a.sale_date ?? a.start_date,
          renewal_date: a.renewal_date,
          status: a.status === '1' || a.status === 'Active' ? 'Active' : 'Expired',
          package_name: a.package_name ?? '',
        }));

        const active = clients.filter(c => c.status === 'Active').length;
        return { trainer_name: tName, clients, total: clients.length, active, expired: clients.length - active };
      });

      // filter by tab
      const filtered = activeTab === 'All' ? grouped : grouped.map(g => ({
        ...g,
        clients: g.clients.filter(c => c.status === activeTab),
      })).filter(g => g.clients.length > 0);

      setGroups(filtered);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, activeTab]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const sections = groups.map(g => ({ title: g.trainer_name, data: g.clients, meta: g }));

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={styles.trainerHeader}>
      <View style={styles.trainerAvatar}>
        <Text style={styles.trainerAvatarText}>{section.title.charAt(0)}</Text>
      </View>
      <View style={styles.trainerInfo}>
        <Text style={styles.trainerName}>{section.title}</Text>
        <Text style={styles.trainerStats}>
          Total: {section.meta.total} · Active: {section.meta.active} · Expired/Others: {section.meta.expired}
        </Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: PTClient }) => (
    <View style={styles.clientRow}>
      <View style={styles.clientLeft}>
        <Text style={styles.clientName}>{item.client_name}</Text>
        {item.package_name ? <Text style={styles.pkgName} numberOfLines={1}>{item.package_name}</Text> : null}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>Sale: {formatDate(item.sale_date)}</Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.dateText}>Renewal: {formatDate(item.renewal_date)}</Text>
        </View>
      </View>
      <View style={styles.clientRight}>
        <Text style={styles.sessions}>{item.total_sessions}</Text>
        <View style={[styles.statusBadge, item.status === 'Active' ? styles.activeBadge : styles.expiredBadge]}>
          <Text style={[styles.statusText, item.status === 'Active' ? styles.activeText : styles.expiredText]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PT Roster</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.tabRow}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Icon name="weight-lifter" size={48} color="#ddd" />
          <Text style={styles.emptyText}>No PT roster found</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8, marginHorizontal: 4, backgroundColor: '#F0F0F0' },
  activeTab: { backgroundColor: '#E63946' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  trainerHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginTop: 12, marginBottom: 0 },
  trainerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  trainerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  trainerInfo: { flex: 1 },
  trainerName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  trainerStats: { color: '#aaa', fontSize: 11, marginTop: 2 },
  clientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  clientLeft: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: '600', color: '#E63946', marginBottom: 2 },
  pkgName: { fontSize: 11, color: '#888', marginBottom: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#888' },
  separator: { color: '#ccc' },
  clientRight: { alignItems: 'flex-end', gap: 4 },
  sessions: { fontSize: 18, fontWeight: '800', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activeBadge: { backgroundColor: '#E8F5E9' },
  expiredBadge: { backgroundColor: '#F5F5F5' },
  statusText: { fontSize: 11, fontWeight: '700' },
  activeText: { color: '#2E7D32' },
  expiredText: { color: '#757575' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12 },
});

export default PTRoster;
