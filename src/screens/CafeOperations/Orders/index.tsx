import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCafeOrders } from '../../../api/employeeDashboard';

interface OrderData {
  id: number;
  branch_name: string;
  client_first_name: string;
  client_last_name: string;
  price: number;
  discount: number;
  net_price: number;
  total_received: string;
  payment_method: string;
  status: string;
  sale_type: string;
  date: string;
  note: string;
}

const fmt = (n: number) => `PKR ${Number(n || 0).toLocaleString()}`;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '1': { bg: '#E6F4EA', text: '#2E7D32' },
  '0': { bg: '#FFEBEE', text: '#C62828' },
};

const Orders = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getCafeOrders({ branch_id: branchId, limit: 50 });
      setOrders(res?.data?.data ?? []);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const renderOrderCard = ({ item }: { item: OrderData }) => {
    const statusColor = STATUS_COLORS[item.status] ?? { bg: '#F5F5F5', text: '#666' };
    const pending = (item.net_price || 0) - Number(item.total_received || 0);
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { orderData: item })}
      >
        <View style={styles.cardLeft}>
          <View style={styles.cardContent}>
            <Text style={styles.orderNumber}>Order #{item.id}</Text>
            <Text style={styles.clientName}>{item.client_first_name} {item.client_last_name}</Text>
            <Text style={styles.orderMeta}>{item.payment_method} · {item.date}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>
              {item.status === '1' ? 'Completed' : 'Pending'}
            </Text>
          </View>
          <Text style={styles.netPrice}>{fmt(item.net_price)}</Text>
          {pending > 0 && (
            <Text style={styles.pendingText}>Due: {fmt(pending)}</Text>
          )}
        </View>
        <Icon name="chevron-right" size={20} color="#ccc" style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Cafe Orders"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#E63946" />
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={item => String(item.id)}
            renderItem={renderOrderCard}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Icon name="coffee-off" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No orders found</Text>
              </View>
            }
          />
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.createOrderButton}
            onPress={() => navigation.navigate('NewOrder')}
          >
            <Icon name="plus" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.createOrderButtonText}>Create New Order</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: '#F8F9FA' },
  center:                { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText:             { color: '#999', marginTop: 12, fontSize: 14 },
  orderCard:             { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#E63946', elevation: 2 },
  cardLeft:              { flex: 1 },
  cardContent:           { gap: 3 },
  orderNumber:           { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  clientName:            { fontSize: 13, color: '#333', fontWeight: '500' },
  orderMeta:             { fontSize: 12, color: '#888' },
  cardRight:             { alignItems: 'flex-end', marginRight: 4 },
  badge:                 { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  badgeText:             { fontSize: 11, fontWeight: '600' },
  netPrice:              { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  pendingText:           { fontSize: 11, color: '#C62828', marginTop: 2 },
  buttonContainer:       { position: 'absolute', bottom: 16, left: 16, right: 16 },
  createOrderButton:     { backgroundColor: '#E63946', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  createOrderButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default Orders;
