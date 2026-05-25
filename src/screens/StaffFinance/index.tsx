import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TextInput, TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import { getStaffFinanceList } from '../../api/employeeDashboard';

interface FinanceRecord {
  id: number;
  user_id: number;
  user_fname: string;
  user_lname: string;
  branch_id: number;
  branch_name: string;
  amount: number;
  transaction_type: string;
  payment_method: string | null;
  reason: string;
  category: string;
  occurrence_date: string;
  status: string;
  created_at: string;
}

const fmt = (n: number) => `PKR ${Number(n || 0).toLocaleString()}`;

const CATEGORIES = ['All', 'Fine', 'Advance', 'Reward'];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  Fine:    { bg: '#FFEBEE', text: '#C62828', icon: 'alert-circle' },
  Advance: { bg: '#FFF3E0', text: '#E65100', icon: 'cash-fast' },
  Reward:  { bg: '#E6F4EA', text: '#2E7D32', icon: 'star-circle' },
  default: { bg: '#F3F4F6', text: '#374151', icon: 'cash' },
};

const StaffFinance = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [filtered, setFiltered] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getStaffFinanceList({ branch_id: branchId, limit: 100 });
      const data: FinanceRecord[] = res?.data?.data ?? [];
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
    let list = records;
    if (activeCategory !== 'All') list = list.filter(r => r.category === activeCategory);
    if (q) list = list.filter(r =>
      `${r.user_fname} ${r.user_lname}`.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
    setFiltered(list);
  }, [search, activeCategory, records]);

  const renderItem = ({ item }: { item: FinanceRecord }) => {
    const color = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.default;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, { backgroundColor: color.bg }]}>
            <Icon name={color.icon} size={22} color={color.text} />
          </View>
          <View style={styles.info}>
            <Text style={styles.staffName}>{item.user_fname} {item.user_lname}</Text>
            <Text style={styles.meta}>{item.transaction_type}{item.payment_method ? ` · ${item.payment_method}` : ''}</Text>
            <Text style={styles.date}>{item.occurrence_date}</Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={[styles.categoryTag, { color: color.text, backgroundColor: color.bg }]}>{item.category}</Text>
            <Text style={[styles.amount, { color: item.category === 'Fine' ? '#C62828' : item.category === 'Reward' ? '#2E7D32' : '#E65100' }]}>
              {item.category === 'Fine' ? '-' : '+'}{fmt(item.amount)}
            </Text>
          </View>
        </View>
        {item.reason && item.reason !== 'N/A' && (
          <Text style={styles.reason}>{item.reason}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Fines & Advances"
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
            placeholder="Search by name or reason..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
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
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Icon name="cash-remove" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No records found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F8F9FA' },
  center:             { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText:          { color: '#999', marginTop: 12, fontSize: 14 },
  searchBox:          { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#EEE', height: 44 },
  searchInput:        { flex: 1, fontSize: 14, color: '#333' },
  filterRow:          { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  filterChip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F0' },
  filterChipActive:   { backgroundColor: '#E63946' },
  filterChipText:     { fontSize: 13, color: '#666', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  card:               { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, padding: 14, elevation: 1 },
  cardTop:            { flexDirection: 'row', alignItems: 'center' },
  iconBox:            { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info:               { flex: 1 },
  staffName:          { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  meta:               { fontSize: 12, color: '#666', marginTop: 2 },
  date:               { fontSize: 11, color: '#999', marginTop: 2 },
  amountBox:          { alignItems: 'flex-end' },
  categoryTag:        { fontSize: 10, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', marginBottom: 4 },
  amount:             { fontSize: 14, fontWeight: '700' },
  reason:             { fontSize: 12, color: '#666', marginTop: 10, fontStyle: 'italic', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
});

export default StaffFinance;
