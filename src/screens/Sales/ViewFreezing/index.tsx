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
import { getFreezingList } from '../../../api/employeeDashboard';

interface FreezingRecord {
  id: number;
  client_name: string;
  membership_id: string;
  package_name: string;
  freeze_from: string;
  freeze_to: string;
  freeze_days: number;
  reason: string;
  status: string;
  branch_name: string;
}

const ViewFreezing = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [records, setRecords] = useState<FreezingRecord[]>([]);
  const [filtered, setFiltered] = useState<FreezingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getFreezingList({ branch_id: branchId, limit: 100 });
      const data: FreezingRecord[] = res?.data ?? res ?? [];
      setRecords(data);
      setFiltered(data);
    } catch {
      setRecords([]);
      setFiltered([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(records); return; }
    const q = search.toLowerCase();
    setFiltered(records.filter(r =>
      r.client_name?.toLowerCase().includes(q) ||
      r.membership_id?.toLowerCase().includes(q) ||
      r.package_name?.toLowerCase().includes(q),
    ));
  }, [search, records]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: FreezingRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Icon name="snowflake" size={22} color="#1E88E5" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.clientName}>{item.client_name}</Text>
          <Text style={styles.subText}>{item.membership_id} · {item.package_name}</Text>
        </View>
        <View style={[styles.badge, item.status === 'Active' ? styles.activeBadge : styles.expiredBadge]}>
          <Text style={[styles.badgeText, item.status === 'Active' ? styles.activeText : styles.expiredText]}>
            {item.status || 'Active'}
          </Text>
        </View>
      </View>
      <View style={styles.dateRow}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>From</Text>
          <Text style={styles.dateVal}>{formatDate(item.freeze_from)}</Text>
        </View>
        <Icon name="arrow-right" size={16} color="#ccc" />
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>To</Text>
          <Text style={styles.dateVal}>{formatDate(item.freeze_to)}</Text>
        </View>
        <View style={styles.daysBox}>
          <Text style={styles.daysNum}>{item.freeze_days || 0}</Text>
          <Text style={styles.daysLabel}>days</Text>
        </View>
      </View>
      {item.reason ? (
        <Text style={styles.reason} numberOfLines={1}>
          <Icon name="information" size={12} color="#aaa" /> {item.reason}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Freezing</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchRow}>
        <Icon name="magnify" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by client, ID, package..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#aaa"
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={18} color="#aaa" /></TouchableOpacity> : null}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="snowflake-off" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No freezing records found</Text>
            </View>
          }
        />
      )}
      <View style={styles.countBar}>
        <Text style={styles.countText}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</Text>
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
  list: { paddingHorizontal: 12, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  subText: { fontSize: 12, color: '#888', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#E3F2FD' },
  expiredBadge: { backgroundColor: '#F5F5F5' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  activeText: { color: '#1565C0' },
  expiredText: { color: '#757575' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FA', borderRadius: 8, padding: 10 },
  dateItem: { alignItems: 'center' },
  dateLabel: { fontSize: 11, color: '#aaa', marginBottom: 2 },
  dateVal: { fontSize: 13, fontWeight: '600', color: '#333' },
  daysBox: { alignItems: 'center', backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  daysNum: { fontSize: 16, fontWeight: '800', color: '#1565C0' },
  daysLabel: { fontSize: 10, color: '#1565C0' },
  reason: { fontSize: 12, color: '#aaa', marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12 },
  countBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  countText: { fontSize: 13, color: '#888', fontWeight: '600' },
});

export default ViewFreezing;
