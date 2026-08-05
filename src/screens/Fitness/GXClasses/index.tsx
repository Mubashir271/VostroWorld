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
import { getGXClasses } from '../../../api/employeeDashboard';
import BurgerSVG from '../../../assets/svg/BurgerSVG';

interface GXClass {
  id: number;
  branch: string;
  trainer_name: string;
  class_name: string;
  booking_space: number;
  duration: string;
  total_sessions: number;
  time_slot: string;
  status: string;
}

// /v1/fitness/gx-class/index returns { id, package_id, name, day, status,
// package: { id, slot_name, description, branch_id, branch_name } } — no
// trainer/capacity/duration/session-count/time-slot fields, so those show as
// a dash below until the backend exposes them.
const mapGXClass = (raw: any): GXClass => ({
  id: raw.id,
  branch: raw.package?.branch_name ?? '',
  trainer_name: '',
  class_name: raw.name ?? raw.package?.slot_name ?? '—',
  booking_space: 0,
  duration: '',
  total_sessions: 0,
  time_slot: raw.day ?? '',
  status: raw.status === '1' || raw.status === 1 ? 'Active' : 'Inactive',
});

const GXClasses = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [classes, setClasses] = useState<GXClass[]>([]);
  const [filtered, setFiltered] = useState<GXClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getGXClasses({ branch_id: branchId, limit: 100 });
      const raw: any[] = res?.data?.data ?? [];
      const data: GXClass[] = raw.map(mapGXClass);
      setClasses(data);
      setFiltered(data);
    } catch {
      setClasses([]);
      setFiltered([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(classes); return; }
    const q = search.toLowerCase();
    setFiltered(classes.filter(c =>
      c.class_name?.toLowerCase().includes(q) ||
      c.trainer_name?.toLowerCase().includes(q) ||
      c.time_slot?.toLowerCase().includes(q),
    ));
  }, [search, classes]);

  const statusColor = (status: string) => {
    if (!status || status === 'Active') return { bg: '#E8F5E9', text: '#2E7D32' };
    if (status === 'Pending') return { bg: '#FFF8E1', text: '#F57F17' };
    return { bg: '#F5F5F5', text: '#757575' };
  };

  const renderItem = ({ item, index }: { item: GXClass; index: number }) => {
    const sc = statusColor(item.status);
    const isExpanded = expanded === index;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpanded(isExpanded ? null : index)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.srCircle}>
            <Text style={styles.srText}>{index + 1}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.className}>{item.class_name}</Text>
            {item.trainer_name ? <Text style={styles.trainerName}>{item.trainer_name}</Text> : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{item.status || 'Active'}</Text>
          </View>
          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#aaa" style={{ marginLeft: 6 }} />
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Icon name="account-group" size={16} color="#888" />
                <Text style={styles.infoLabel}>Booking Space</Text>
                <Text style={styles.infoValue}>{item.booking_space}</Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="calendar-range" size={16} color="#888" />
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{item.duration}</Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="repeat" size={16} color="#888" />
                <Text style={styles.infoLabel}>Sessions</Text>
                <Text style={styles.infoValue}>{item.total_sessions}</Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="clock-outline" size={16} color="#888" />
                <Text style={styles.infoLabel}>Day</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{item.time_slot || '—'}</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.openDrawer())}
          style={styles.backBtn}
        >
          {navigation.canGoBack()
            ? <Icon name="arrow-left" size={24} color="#333" />
            : <BurgerSVG width={24} height={24} />}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GX Slots</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchRow}>
        <Icon name="magnify" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by class, trainer, time..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#aaa"
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={18} color="#aaa" /></TouchableOpacity> : null}
      </View>

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{filtered.length} GX slots</Text>
        <Text style={styles.summaryText}>
          Active: {filtered.filter(c => !c.status || c.status === 'Active').length} ·
          Pending: {filtered.filter(c => c.status === 'Pending').length}
        </Text>
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
              <Icon name="yoga" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No GX classes found</Text>
            </View>
          }
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
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  summaryText: { fontSize: 12, color: '#888', fontWeight: '600' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  srCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  srText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardInfo: { flex: 1 },
  className: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  trainerName: { fontSize: 12, color: '#888', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  expandedContent: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoItem: { width: '47%', backgroundColor: '#F8F9FA', borderRadius: 8, padding: 10, alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#aaa', marginTop: 4, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#333' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12 },
});

export default GXClasses;
