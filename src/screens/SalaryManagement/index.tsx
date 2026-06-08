import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import { getSalaryList } from '../../api/employeeDashboard';

interface SalaryRecord {
  id: number;
  name: string;
  uid: string;
  branch: string;
  department: string;
  designation: string;
  salary: number;
  medical: number;
  fine: number;
  advance: number;
  reward: number;
  loan: number;
  detections: number;
  components_addition: number;
  components_deduction: number;
  commission: {
    commission_per: number;
    commission: number;
    total_delivered_sessions: number;
  };
}

const fmt = (n: number) => `PKR ${Number(n || 0).toLocaleString()}`;

const netPayable = (r: SalaryRecord) =>
  (r.salary || 0) +
  (r.medical || 0) +
  (r.reward || 0) +
  (r.components_addition || 0) +
  (r.commission?.commission || 0) -
  (r.fine || 0) -
  (r.advance || 0) -
  (r.loan || 0) -
  (r.detections || 0) -
  (r.components_deduction || 0);

const SalaryManagement = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [filtered, setFiltered] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getSalaryList({ branch_id: branchId, limit: 100 });
      const data: SalaryRecord[] = res?.data ?? [];
      setRecords(data);
      setFiltered(data);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? records.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.uid?.toLowerCase().includes(q) ||
        r.designation?.toLowerCase().includes(q)
      ) : records
    );
  }, [search, records]);

  const renderItem = ({ item }: { item: SalaryRecord }) => {
    const net = netPayable(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name?.[0] ?? '?'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.designation} · {item.department}</Text>
            <Text style={styles.uid}>{item.uid}</Text>
          </View>
          <View style={styles.netBox}>
            <Text style={styles.netLabel}>Net Pay</Text>
            <Text style={styles.netValue}>{fmt(net)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Base Salary</Text>
            <Text style={styles.colValue}>{fmt(item.salary)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Commission ({item.commission?.commission_per}%)</Text>
            <Text style={[styles.colValue, { color: '#2E7D32' }]}>{fmt(item.commission?.commission)}</Text>
          </View>
        </View>

        {(item.fine > 0 || item.advance > 0 || item.loan > 0 || item.detections > 0) && (
          <View style={styles.row}>
            {item.fine > 0 && (
              <View style={styles.col}>
                <Text style={styles.colLabel}>Fine</Text>
                <Text style={[styles.colValue, { color: '#C62828' }]}>-{fmt(item.fine)}</Text>
              </View>
            )}
            {item.detections > 0 && (
              <View style={styles.col}>
                <Text style={styles.colLabel}>Deductions</Text>
                <Text style={[styles.colValue, { color: '#C62828' }]}>-{fmt(item.detections)}</Text>
              </View>
            )}
            {item.loan > 0 && (
              <View style={styles.col}>
                <Text style={styles.colLabel}>Loan</Text>
                <Text style={[styles.colValue, { color: '#C62828' }]}>-{fmt(item.loan)}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Salary Management"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, UID or designation..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#E63946" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Icon name="account-cash-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No salary records found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8F9FA' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText:    { color: '#999', marginTop: 12, fontSize: 14 },
  searchBox:    { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#EEE', height: 44 },
  searchInput:  { flex: 1, fontSize: 14, color: '#333' },
  card:         { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 16, elevation: 2 },
  cardTop:      { flexDirection: 'row', alignItems: 'center' },
  avatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:   { color: '#fff', fontWeight: '700', fontSize: 18 },
  cardInfo:     { flex: 1 },
  name:         { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  meta:         { fontSize: 12, color: '#666', marginTop: 2 },
  uid:          { fontSize: 11, color: '#999', marginTop: 2 },
  netBox:       { alignItems: 'flex-end' },
  netLabel:     { fontSize: 11, color: '#666' },
  netValue:     { fontSize: 13, fontWeight: '700', color: '#E63946', marginTop: 2 },
  divider:      { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  row:          { flexDirection: 'row', marginTop: 4 },
  col:          { flex: 1 },
  colLabel:     { fontSize: 11, color: '#888' },
  colValue:     { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 2 },
});

export default SalaryManagement;
