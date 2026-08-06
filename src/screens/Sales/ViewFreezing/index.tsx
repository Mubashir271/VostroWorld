import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert,
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

const PAGE_SIZE = 25;

const ViewFreezing = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [records, setRecords] = useState<FreezingRecord[]>([]);
  const [filtered, setFiltered] = useState<FreezingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [inactiveIds, setInactiveIds] = useState<number[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getFreezingList({ branch_id: branchId, limit: 100 });
      const data: FreezingRecord[] = res?.data?.data ?? res?.data ?? res ?? [];
      setRecords(Array.isArray(data) ? data : []);
      setFiltered(Array.isArray(data) ? data : []);
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

  useEffect(() => { setPage(1); }, [search]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const activeRecords = filtered.filter(r => !inactiveIds.includes(r.id));
  const inactiveRecords = filtered.filter(r => inactiveIds.includes(r.id));

  const totalPages = Math.max(1, Math.ceil(activeRecords.length / PAGE_SIZE));
  const pageData = activeRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDeactivate = (item: FreezingRecord) => {
    Alert.alert('Mark Inactive', `Mark freezing record for "${item.client_name}" as inactive?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Inactive', style: 'destructive', onPress: () => setInactiveIds(prev => [...prev, item.id]) },
    ]);
  };

  const handleDelete = (item: FreezingRecord) => {
    Alert.alert('Delete Record', `Delete freezing record for "${item.client_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setRecords(prev => prev.filter(r => r.id !== item.id));
          setInactiveIds(prev => prev.filter(id => id !== item.id));
        },
      },
    ]);
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
        <TouchableOpacity style={[styles.badge, styles.expiredBadge]} onPress={() => handleDeactivate(item)}>
          <Icon name="close-circle-outline" size={12} color="#C0392B" />
          <Text style={[styles.badgeText, styles.expiredText]}> Inactive</Text>
        </TouchableOpacity>
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

  const renderInactiveItem = ({ item }: { item: FreezingRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Icon name="snowflake-off" size={22} color="#999" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.clientName}>{item.client_name}</Text>
          <Text style={styles.subText}>{item.membership_id} · {item.package_name}</Text>
        </View>
        <TouchableOpacity style={[styles.badge, styles.deleteBadge]} onPress={() => handleDelete(item)}>
          <Icon name="trash-can-outline" size={12} color="#C0392B" />
          <Text style={[styles.badgeText, styles.expiredText]}> Delete</Text>
        </TouchableOpacity>
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
    </View>
  );

  const renderFooter = () => (
    <View>
      {activeRecords.length > PAGE_SIZE && (
        <View style={styles.pgBar}>
          <TouchableOpacity style={[styles.pgBtn, page === 1 && styles.pgBtnDisabled]} onPress={() => setPage(1)} disabled={page === 1}>
            <Icon name="chevron-double-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pgBtn, page === 1 && styles.pgBtnDisabled]} onPress={() => setPage(page - 1)} disabled={page === 1}>
            <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
          </TouchableOpacity>
          <Text style={styles.pgInfo}>Page <Text style={styles.pgInfoB}>{page}</Text> of <Text style={styles.pgInfoB}>{totalPages}</Text></Text>
          <TouchableOpacity style={[styles.pgBtn, page === totalPages && styles.pgBtnDisabled]} onPress={() => setPage(page + 1)} disabled={page === totalPages}>
            <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pgBtn, page === totalPages && styles.pgBtnDisabled]} onPress={() => setPage(totalPages)} disabled={page === totalPages}>
            <Icon name="chevron-double-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inactiveSection}>
        <Text style={styles.inactiveTitle}>Inactive Freezing</Text>
        {inactiveRecords.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No inactive records</Text>
          </View>
        ) : (
          <FlatList
            data={inactiveRecords}
            keyExtractor={(item, i) => `inactive-${item.id ?? i}`}
            renderItem={renderInactiveItem}
            scrollEnabled={false}
          />
        )}
      </View>
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
          data={pageData}
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
          ListFooterComponent={renderFooter}
        />
      )}
      <View style={styles.countBar}>
        <Text style={styles.countText}>{activeRecords.length} record{activeRecords.length !== 1 ? 's' : ''}</Text>
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
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  expiredBadge: { backgroundColor: '#FBEAEA' },
  deleteBadge: { backgroundColor: '#FBEAEA' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  expiredText: { color: '#C0392B' },
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
  pgBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 10 },
  pgBtn: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  pgBtnDisabled: { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  pgInfo: { fontSize: 13, color: '#555', paddingHorizontal: 8 },
  pgInfoB: { fontWeight: '700', color: '#1A1A1A' },
  inactiveSection: { marginTop: 4, paddingBottom: 80 },
  inactiveTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
});

export default ViewFreezing;
