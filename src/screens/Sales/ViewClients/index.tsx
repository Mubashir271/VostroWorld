import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../redux/store';
import { getClientsList } from '../../../api/employeeDashboard';

interface Client {
  id: number;
  uid: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  status: string;
  branches_name: string;
  membership_type: Array<{ get_package_name?: { name: string } }>;
}

const FILTER_TABS = ['Active', 'Inactive', 'Dormant'];

const ViewClients = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Active');

  const clientStatus = (c: Client) => {
    if (c.status === '1' || c.status === 'Active' || c.status === 'active') return 'Active';
    if (c.status === 'Dormant' || c.status === 'dormant') return 'Dormant';
    return 'Inactive';
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getClientsList({ branch_id: branchId, limit: 200, page: 1 });
      const data: Client[] = res?.data?.data ?? [];
      setClients(data);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let list = clients.filter(c => clientStatus(c) === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        c.uid?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q),
      );
    }
    setFiltered(list);
  }, [search, clients, activeTab]);

  const renderItem = ({ item }: { item: Client }) => {
    const fullName = `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || 'Unknown';
    const pkgName = item.membership_type?.[0]?.get_package_name?.name ?? 'No Membership';
    const status = clientStatus(item);
    const badgeStyle = status === 'Active' ? styles.activeBadge : styles.inactiveBadge;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.clientName}>{fullName}</Text>
            <Text style={styles.membershipId}>ID: {item.uid || item.id}</Text>
          </View>
          <View style={[styles.statusBadge, badgeStyle]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Icon name="phone" size={14} color="#888" />
            <Text style={styles.detailText}>{item.phone || 'N/A'}</Text>
          </View>
          {item.email ? (
            <View style={styles.detailRow}>
              <Icon name="email" size={14} color="#888" />
              <Text style={styles.detailText} numberOfLines={1}>{item.email}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Icon name="tag" size={14} color="#888" />
            <Text style={styles.detailText}>{pkgName}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Clients</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewMemberRegistration')}>
          <Icon name="account-plus" size={24} color="#E63946" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Icon name="magnify" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, phone..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#aaa"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={18} color="#aaa" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {FILTER_TABS.map(tab => (
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E63946" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="account-off" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No clients found</Text>
            </View>
          }
        />
      )}

      <View style={styles.countBar}>
        <Text style={styles.countText}>{filtered.length} client{filtered.length !== 1 ? 's' : ''}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, marginHorizontal: 3, backgroundColor: '#eee' },
  activeTab: { backgroundColor: '#E63946' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  membershipId: { fontSize: 12, color: '#888', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#E8F5E9' },
  inactiveBadge: { backgroundColor: '#FFF3E0' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  cardDetails: { gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#555', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12 },
  countBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  countText: { fontSize: 13, color: '#888', fontWeight: '600' },
});

export default ViewClients;
