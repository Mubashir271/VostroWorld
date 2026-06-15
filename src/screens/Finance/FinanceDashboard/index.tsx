import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../redux/store';
import { getFinanceDashboard } from '../../../api/employeeDashboard';

interface BalanceCard {
  label: string;
  total_balance: number;
  last_debit: number;
  last_credit: number;
}

interface FinanceData {
  bank: BalanceCard;
  office: BalanceCard;
  sales_counter: BalanceCard;
  sales_by_category: { category: string; amount: number }[];
  expenses_by_category: { category: string; amount: number }[];
}

const FILTER_TABS = ['Today', 'Week', 'Month', 'Quarter'];

const fmt = (n: number) => {
  const abs = Math.abs(n || 0);
  const prefix = n < 0 ? '-Rs ' : 'Rs ';
  return `${prefix}${abs.toLocaleString()}/-`;
};

const BalanceWidget = ({ label, total, lastDebit, lastCredit }: { label: string; total: number; lastDebit: number; lastCredit: number }) => (
  <View style={styles.balanceCard}>
    <Text style={styles.balanceLabel}>{label}</Text>
    <Text style={styles.balanceTotalLabel}>Total Balance</Text>
    <Text style={[styles.balanceTotal, total < 0 ? styles.negative : styles.positive]}>{fmt(total)}</Text>
    <View style={styles.balanceRow}>
      <View style={styles.balanceSub}>
        <Text style={styles.balanceSubLabel}>Last Debit</Text>
        <Text style={[styles.balanceSubVal, { color: '#E63946' }]}>{fmt(lastDebit)}</Text>
      </View>
      <View style={styles.balanceSub}>
        <Text style={styles.balanceSubLabel}>Last Credit</Text>
        <Text style={[styles.balanceSubVal, { color: '#43A047' }]}>{fmt(lastCredit)}</Text>
      </View>
    </View>
  </View>
);

const FinanceDashboard = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Month');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getFinanceDashboard({
        branch_id: branchId,
        filter: activeFilter.toLowerCase() as any,
      });
      setData(res?.data ?? res ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, activeFilter]);

  useEffect(() => { load(); }, [load]);

  const DEMO_SALES = [
    { category: 'Gym', amount: 4200000 },
    { category: 'PT', amount: 1800000 },
    { category: 'Guest Pass', amount: 450000 },
    { category: 'Registration', amount: 380000 },
    { category: 'Freezing', amount: 120000 },
    { category: 'Cafe', amount: 95000 },
  ];

  const DEMO_EXPENSES = [
    { category: 'Staff Salaries', amount: 1200000 },
    { category: 'Maintenance', amount: 350000 },
    { category: 'Cafe Expense', amount: 280000 },
    { category: 'Utility Bills', amount: 220000 },
    { category: 'Rents', amount: 180000 },
    { category: 'General', amount: 95000 },
  ];

  const salesData = data?.sales_by_category ?? DEMO_SALES;
  const expensesData = data?.expenses_by_category ?? DEMO_EXPENSES;
  const maxSales = Math.max(...salesData.map(s => s.amount), 1);
  const maxExpenses = Math.max(...expensesData.map(e => e.amount), 1);

  const BAR_COLORS = ['#E63946', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finance Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
          <Icon name="plus-circle" size={24} color="#E63946" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeFilter === tab && styles.activeTab]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.tabText, activeFilter === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          {/* Balance Cards */}
          <Text style={styles.sectionTitle}>Account Balances</Text>
          <BalanceWidget
            label="Bank"
            total={data?.bank?.total_balance ?? -9253629}
            lastDebit={data?.bank?.last_debit ?? 170000}
            lastCredit={data?.bank?.last_credit ?? 0}
          />
          <BalanceWidget
            label="Office"
            total={data?.office?.total_balance ?? -1997928}
            lastDebit={data?.office?.last_debit ?? 1000}
            lastCredit={data?.office?.last_credit ?? 170000}
          />
          <BalanceWidget
            label="Sales Counter"
            total={data?.sales_counter?.total_balance ?? 6211951}
            lastDebit={data?.sales_counter?.last_debit ?? 300}
            lastCredit={data?.sales_counter?.last_credit ?? 6300}
          />

          {/* Sales Chart */}
          <Text style={styles.sectionTitle}>Sales Breakdown</Text>
          <View style={styles.chartCard}>
            {salesData.map((item, i) => (
              <View key={item.category} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{item.category}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(item.amount / maxSales) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
                </View>
                <Text style={styles.barValue}>Rs {(item.amount / 1000).toFixed(0)}K</Text>
              </View>
            ))}
          </View>

          {/* Expense Chart */}
          <Text style={styles.sectionTitle}>Expense Breakdown</Text>
          <View style={styles.chartCard}>
            {expensesData.map((item, i) => (
              <View key={item.category} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{item.category}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(item.amount / maxExpenses) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
                </View>
                <Text style={styles.barValue}>Rs {(item.amount / 1000).toFixed(0)}K</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Finance Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'plus-circle', label: 'Add Expense', screen: 'Expenses' },
              { icon: 'cash', label: 'Cash In Hand', screen: 'ViewCashInHand' },
              { icon: 'bank', label: 'Bank Ledger', screen: 'FinanceDashboard' },
              { icon: 'scale-balance', label: 'Balance Sheet', screen: 'FinanceDashboard' },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.actionCard}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={styles.actionIcon}>
                  <Icon name={item.icon} size={22} color="#E63946" />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8, marginHorizontal: 3, backgroundColor: '#F0F0F0' },
  activeTab: { backgroundColor: '#E63946' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#fff' },
  scroll: { padding: 16, paddingBottom: 30 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 10, marginTop: 6 },
  balanceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  balanceLabel: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  balanceTotalLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  balanceTotal: { fontSize: 22, fontWeight: '900', marginBottom: 10 },
  positive: { color: '#43A047' },
  negative: { color: '#E63946' },
  balanceRow: { flexDirection: 'row', gap: 16 },
  balanceSub: { flex: 1, backgroundColor: '#F8F9FA', borderRadius: 8, padding: 8 },
  balanceSubLabel: { fontSize: 11, color: '#aaa', marginBottom: 2 },
  balanceSubVal: { fontSize: 14, fontWeight: '700' },
  chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 90, fontSize: 12, color: '#555', fontWeight: '600' },
  barTrack: { flex: 1, height: 12, backgroundColor: '#F0F0F0', borderRadius: 6, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  barValue: { width: 60, fontSize: 11, color: '#888', textAlign: 'right' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionCard: { width: '22%', backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  actionIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 10, color: '#555', textAlign: 'center', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default FinanceDashboard;
