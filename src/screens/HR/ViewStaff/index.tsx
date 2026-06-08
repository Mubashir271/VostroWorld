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
import { getStaffList } from '../../../api/employeeDashboard';

interface StaffMember {
  id: number;
  name: string;
  uid: string;
  department: string;
  designation: string;
  branch: string;
  salary: number;
  phone?: string;
  email?: string;
  status: string;
  join_date?: string;
}

const DEPT_COLORS: Record<string, string> = {
  Fitness: '#E63946',
  Housekeeping: '#1E88E5',
  Sales: '#43A047',
  Finance: '#FB8C00',
  Management: '#8E24AA',
  IT: '#00ACC1',
};

const ViewStaff = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filtered, setFiltered] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getStaffList({ branch_id: branchId, limit: 100 });
      const data: StaffMember[] = res?.data ?? res ?? [];
      setStaff(data);
      setFiltered(data);
    } catch {
      setStaff([]);
      setFiltered([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(staff); return; }
    const q = search.toLowerCase();
    setFiltered(staff.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q) ||
      s.designation?.toLowerCase().includes(q) ||
      s.uid?.toLowerCase().includes(q),
    ));
  }, [search, staff]);

  const deptColor = (dept: string) => DEPT_COLORS[dept] || '#607D8B';

  const renderItem = ({ item, index }: { item: StaffMember; index: number }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: deptColor(item.department) }]}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.staffName}>{item.name}</Text>
          <Text style={styles.srNo}>#{index + 1}</Text>
        </View>
        <Text style={styles.designation}>{item.designation}</Text>
        <View style={styles.detailsRow}>
          <View style={[styles.deptChip, { backgroundColor: deptColor(item.department) + '20' }]}>
            <Text style={[styles.deptChipText, { color: deptColor(item.department) }]}>{item.department}</Text>
          </View>
          <Text style={styles.salary}>PKR {Number(item.salary || 0).toLocaleString()}</Text>
        </View>
        {item.phone ? (
          <View style={styles.contactRow}>
            <Icon name="phone" size={12} color="#aaa" />
            <Text style={styles.contactText}>{item.phone}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Members</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchRow}>
        <Icon name="magnify" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, dept, designation..."
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
              <Icon name="account-off" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No staff found</Text>
            </View>
          }
        />
      )}
      <View style={styles.countBar}>
        <Text style={styles.countText}>{filtered.length} staff member{filtered.length !== 1 ? 's' : ''}</Text>
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
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  cardLeft: { marginRight: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardContent: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  staffName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  srNo: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  designation: { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 6 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  deptChipText: { fontSize: 11, fontWeight: '700' },
  salary: { fontSize: 13, color: '#555', fontWeight: '600' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  contactText: { fontSize: 12, color: '#aaa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12 },
  countBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  countText: { fontSize: 13, color: '#888', fontWeight: '600' },
});

export default ViewStaff;
