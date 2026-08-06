import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCafeDashboard } from '../../../api/cafe';

const fmtRs = (val: any) => `Rs ${parseFloat(val ?? 0).toLocaleString()}/-`;

interface StatCardProps { icon: string; label: string; value: string; color: string; onPress?: () => void; }

const StatCard = ({ icon, label, value, color, onPress }: StatCardProps) => (
  <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Icon name={icon} size={22} color={color} />
    </View>
    <View style={styles.statInfo}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  </TouchableOpacity>
);

const CafeDashboard = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getCafeDashboard({ branch_id: branchId });
      setData(res.data?.data ?? res.data ?? {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const quickLinks = [
    { label: 'Orders',      icon: 'clipboard-list',         screen: 'Orders' },
    { label: 'Categories',  icon: 'tag-multiple',           screen: 'CafeCategories' },
    { label: 'Products',    icon: 'food',                   screen: 'CafeProducts' },
    { label: 'Deposits',    icon: 'bank-transfer-in',       screen: 'CafeDeposits' },
    { label: 'Balances',    icon: 'wallet-outline',         screen: 'ClientsAvailableBalance' },
    { label: 'Pendings',    icon: 'alert-circle-outline',   screen: 'ManagementPendings' },
    { label: 'Report',      icon: 'chart-bar',              screen: 'CafeSalesReport' },
    { label: 'History',     icon: 'history',                screen: 'DepositsHistory' },
  ];

  return (
    <View style={styles.container}>
      <AppHeader
        title="Cafe Dashboard"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E63946" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          {/* Stats */}
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="receipt" label="Today's Orders" value={String(data?.today_orders ?? '—')} color="#E63946" />
            <StatCard icon="cash" label="Today's Sales" value={fmtRs(data?.today_sales ?? 0)} color="#10b981" />
            <StatCard icon="account-group" label="Total Clients" value={String(data?.total_clients ?? '—')} color="#3B82F6" />
            <StatCard icon="bank-transfer-in" label="Total Deposits" value={fmtRs(data?.total_deposits ?? 0)} color="#8B5CF6" />
            <StatCard icon="alert-circle-outline" label="Pending Amount" value={fmtRs(data?.pending_amount ?? 0)} color="#F59E0B" />
            <StatCard icon="food" label="Active Products" value={String(data?.active_products ?? '—')} color="#06B6D4" />
          </View>

          {/* Quick links */}
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.linksGrid}>
            {quickLinks.map(l => (
              <TouchableOpacity
                key={l.screen}
                style={styles.linkCard}
                onPress={() => navigation.navigate(l.screen)}
              >
                <View style={[styles.linkIcon, { backgroundColor: '#FFF3F3' }]}>
                  <Icon name={l.icon} size={22} color="#E63946" />
                </View>
                <Text style={styles.linkLabel}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 14, paddingBottom: 30 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, marginTop: 6 },
  statsGrid:    { gap: 10, marginBottom: 20 },
  statCard:     { backgroundColor: '#FFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  statIcon:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statInfo:     { flex: 1 },
  statLabel:    { fontSize: 12, color: '#888' },
  statValue:    { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  linksGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  linkCard:     { width: '22%', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: 12, padding: 12, elevation: 1, minWidth: 72 },
  linkIcon:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  linkLabel:    { fontSize: 11, color: '#555', fontWeight: '500', textAlign: 'center' },
});

export default CafeDashboard;
