import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../redux/store';
import { getExpensesList } from '../../../api/employeeDashboard';

interface Expense {
  id: number;
  category_name: string;
  sub_category_name: string;
  transaction_type: string;
  payment_type: string;
  description: string;
  amount: number;
  occurrence_date: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Cafe Expense': '#FB8C00', 'Staff Salaries': '#E63946', 'Maintenance': '#1E88E5',
  'Utility Bills': '#43A047', 'Rents': '#8E24AA', 'General': '#607D8B',
};

const Expenses = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getExpensesList({ branch_id: branchId, limit: 100 });
      setExpenses(res?.data?.data ?? []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const catColor = (cat: string) => CATEGORY_COLORS[cat] || '#607D8B';

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={styles.card}>
      <View style={[styles.catDot, { backgroundColor: catColor(item.category_name) }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.category}>{item.category_name || 'Uncategorized'}</Text>
          <Text style={styles.amount}>Rs {Number(item.amount || 0).toLocaleString()}/-</Text>
        </View>
        {item.sub_category_name ? <Text style={styles.subCat}>{item.sub_category_name}</Text> : null}
        {item.description ? <Text style={styles.desc} numberOfLines={1}>{item.description}</Text> : null}
        <View style={styles.cardBottom}>
          <Text style={styles.dateText}>{formatDate(item.occurrence_date)}</Text>
          <Text style={styles.addedBy}>{[item.transaction_type, item.payment_type].filter(Boolean).join(' · ')}</Text>
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
        <Text style={styles.headerTitle}>Expenses</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddExpense')}>
          <Icon name="plus-circle" size={26} color="#E63946" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="receipt" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No expenses found</Text>
              <TouchableOpacity style={styles.addEmptyBtn} onPress={() => navigation.navigate('AddExpense')}>
                <Text style={styles.addEmptyText}>Add First Expense</Text>
              </TouchableOpacity>
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
  list: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, alignItems: 'stretch' },
  catDot: { width: 6, borderRadius: 3, marginRight: 12, alignSelf: 'stretch' },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  category: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  amount: { fontSize: 15, fontWeight: '800', color: '#E63946' },
  subCat: { fontSize: 12, color: '#666', marginBottom: 2 },
  desc: { fontSize: 12, color: '#888', marginBottom: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  dateText: { fontSize: 12, color: '#aaa' },
  addedBy: { fontSize: 11, color: '#bbb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12, marginBottom: 16 },
  addEmptyBtn: { backgroundColor: '#E63946', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  addEmptyText: { color: '#fff', fontWeight: '700' },
});

export default Expenses;
