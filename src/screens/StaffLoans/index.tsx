import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import { getStaffLoansList } from '../../api/employeeDashboard';

interface LoanRecord {
  id: number;
  staff_id: number;
  staff_name: string;
  branch_id: number;
  name: string; // branch name
  amount: number;
  term: number;
  received: number;
  installment: number;
  payment_method: string;
  transaction_type: string;
  reason: string;
  return_start_date: string;
  date: string;
  status: string;
}

const fmt = (n: number) => `PKR ${Number(n || 0).toLocaleString()}`;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '1': { bg: '#E6F4EA', text: '#2E7D32' },
  '0': { bg: '#FFEBEE', text: '#C62828' },
};

const StaffLoans = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [filtered, setFiltered] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getStaffLoansList({ branch_id: branchId, limit: 100 });
      const data: LoanRecord[] = res?.data?.data ?? [];
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
        r.staff_name?.toLowerCase().includes(q) ||
        r.payment_method?.toLowerCase().includes(q)
      ) : records
    );
  }, [search, records]);

  const renderItem = ({ item }: { item: LoanRecord }) => {
    const remaining = (item.amount || 0) - (item.received || 0);
    const statusColor = STATUS_COLORS[item.status] ?? { bg: '#F5F5F5', text: '#666' };
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.staff_name?.[0] ?? '?'}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.staffName}>{item.staff_name}</Text>
            <Text style={styles.meta}>{item.transaction_type} · {item.payment_method}</Text>
            <Text style={styles.date}>Since {item.return_start_date}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>
              {item.status === '1' ? 'Active' : 'Closed'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Loan Amount</Text>
            <Text style={styles.colValue}>{fmt(item.amount)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Received</Text>
            <Text style={[styles.colValue, { color: '#2E7D32' }]}>{fmt(item.received)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Remaining</Text>
            <Text style={[styles.colValue, { color: remaining > 0 ? '#C62828' : '#2E7D32' }]}>{fmt(remaining)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Installment</Text>
            <Text style={styles.colValue}>{fmt(item.installment)}/mo</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Term</Text>
            <Text style={styles.colValue}>{item.term} months</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Date</Text>
            <Text style={styles.colValue}>{item.date}</Text>
          </View>
        </View>

        {item.reason && item.reason !== 'N/A' && (
          <Text style={styles.reason}>Reason: {item.reason}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Staff Loans"
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
            placeholder="Search by staff name..."
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
                <Icon name="cash-remove" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No loan records found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8F9FA' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText:  { color: '#999', marginTop: 12, fontSize: 14 },
  searchBox:  { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#EEE', height: 44 },
  searchInput:{ flex: 1, fontSize: 14, color: '#333' },
  card:       { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 16, elevation: 2 },
  cardTop:    { flexDirection: 'row', alignItems: 'center' },
  avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  info:       { flex: 1 },
  staffName:  { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  meta:       { fontSize: 12, color: '#666', marginTop: 2 },
  date:       { fontSize: 11, color: '#999', marginTop: 2 },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:  { fontSize: 12, fontWeight: '600' },
  divider:    { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  row:        { flexDirection: 'row', marginTop: 6 },
  col:        { flex: 1 },
  colLabel:   { fontSize: 11, color: '#888' },
  colValue:   { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 2 },
  reason:     { fontSize: 12, color: '#666', marginTop: 10, fontStyle: 'italic' },
});

export default StaffLoans;
