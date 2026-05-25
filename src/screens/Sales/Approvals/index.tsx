import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../redux/store';
import { getApprovalsList, updateApproval } from '../../../api/employeeDashboard';

interface Approval {
  id: number;
  branch_name: string;
  request_type: string;
  client_name: string;
  order_id: number;
  package_name: string;
  switch_from: string;
  switch_to: string;
  status: string;
  created_at: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'Payment Method': { bg: '#E8F5E9', text: '#2E7D32' },
  'Delete Recode': { bg: '#FFF3E0', text: '#E65100' },
  'Date': { bg: '#E3F2FD', text: '#1565C0' },
};

const ApprovalsScreen = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [records, setRecords] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Pending');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getApprovalsList({ branch_id: branchId, status: activeFilter, limit: 100 });
      setRecords(res?.data ?? res ?? []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, activeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = (item: Approval, action: 'Approved' | 'Rejected') => {
    Alert.alert(
      `${action === 'Approved' ? 'Approve' : 'Reject'} Request`,
      `Are you sure you want to ${action.toLowerCase()} this request for ${item.client_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'Approved' ? 'Approve' : 'Reject',
          style: action === 'Rejected' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateApproval(item.id, { status: action });
              load();
            } catch {
              Alert.alert('Error', 'Failed to update approval');
            }
          },
        },
      ],
    );
  };

  const typeStyle = (type: string) => TYPE_COLORS[type] || { bg: '#F5F5F5', text: '#555' };

  const renderItem = ({ item }: { item: Approval }) => {
    const ts = typeStyle(item.request_type);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: ts.bg }]}>
            <Text style={[styles.typeText, { color: ts.text }]}>{item.request_type}</Text>
          </View>
          <Text style={styles.orderId}>#{item.order_id}</Text>
        </View>
        <Text style={styles.clientName}>{item.client_name}</Text>
        <Text style={styles.packageName} numberOfLines={1}>{item.package_name}</Text>
        {(item.switch_from || item.switch_to) ? (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{item.switch_from || '—'}</Text>
            <Icon name="arrow-right" size={14} color="#aaa" />
            <Text style={styles.switchLabel}>{item.switch_to || '—'}</Text>
          </View>
        ) : null}
        {activeFilter === 'Pending' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => handleAction(item, 'Approved')}>
              <Icon name="check" size={16} color="#fff" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(item, 'Rejected')}>
              <Icon name="close" size={16} color="#E63946" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approvals</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.tabRow}>
        {['Pending', 'Approved', 'Rejected'].map(tab => (
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
        <FlatList
          data={records}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="check-all" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No {activeFilter.toLowerCase()} approvals</Text>
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
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, marginHorizontal: 3, backgroundColor: '#eee' },
  activeTab: { backgroundColor: '#E63946' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typeText: { fontSize: 11, fontWeight: '700' },
  orderId: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  clientName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  packageName: { fontSize: 12, color: '#888', marginBottom: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  switchLabel: { fontSize: 13, color: '#555', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2E7D32', borderRadius: 8, paddingVertical: 8, gap: 4 },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E63946', borderRadius: 8, paddingVertical: 8, gap: 4 },
  rejectBtnText: { color: '#E63946', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12 },
});

export default ApprovalsScreen;
