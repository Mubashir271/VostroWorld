import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCafeManagementPendings } from '../../../api/cafe';

const fmtRs = (val: any) => `Rs ${parseFloat(val ?? 0).toLocaleString()}/-`;

const ManagementPendings = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getCafeManagementPendings({ branch_id: branchId, limit: 100 });
      setRows(res.data?.data ?? res.data ?? []);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const totalPending = rows.reduce((s, r) => s + (parseFloat(r.pending_amount ?? r.amount ?? 0) || 0), 0);

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.card, index % 2 === 1 && { backgroundColor: '#FBF8F8' }]}>
      <View style={styles.cardLeft}>
        <Text style={styles.clientName}>
          {item.client_name ?? `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() ?? 'Unknown'}
        </Text>
        <Text style={styles.orderId}>Order #{item.order_id ?? item.id ?? '—'}</Text>
        <Text style={styles.cardMeta}>{item.date ?? item.created_at ?? '—'}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.pendingLabel}>Pending</Text>
        <Text style={styles.pendingAmount}>{fmtRs(item.pending_amount ?? item.amount)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Management Pendings"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {/* Summary banner */}
      {!loading && rows.length > 0 && (
        <View style={styles.banner}>
          <Icon name="alert-circle-outline" size={18} color="#C0392B" />
          <Text style={styles.bannerText}>
            {rows.length} pending order{rows.length !== 1 ? 's' : ''} · Total: {fmtRs(totalPending)}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E63946" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderRow}
          contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="check-circle-outline" size={48} color="#ddd" />
              <Text style={styles.emptyTitle}>All Clear</Text>
              <Text style={styles.emptyText}>No management pendings found.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F7F8FA' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  banner:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF3F3', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FFD0D0' },
  bannerText:    { fontSize: 13, color: '#C0392B', fontWeight: '600', flex: 1 },
  card:          { backgroundColor: '#FFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#E63946', elevation: 1 },
  cardLeft:      { flex: 1, gap: 2 },
  clientName:    { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  orderId:       { fontSize: 12, color: '#E63946', fontWeight: '600' },
  cardMeta:      { fontSize: 12, color: '#888' },
  cardRight:     { alignItems: 'flex-end', gap: 4 },
  pendingLabel:  { fontSize: 11, color: '#888', fontWeight: '500' },
  pendingAmount: { fontSize: 15, fontWeight: '700', color: '#C0392B' },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#333' },
  emptyText:     { fontSize: 13, color: '#999' },
});

export default ManagementPendings;
