// Approvals — mirror of the web admin's Approvals page (Dashboard › Approvals
// on the super admin login; also on the Sales menu).
//
// Data: GET /v1/approval/get (HAR 2026-09-18). One response holds every
// matching row, and the web sends a single filter — `status` or `type` — per
// request, so picking both on the web silently ignores one of them. Here the
// server gets the status filter (or the type one when status is All) and the
// other is applied to the returned rows, so both filters always hold.
//
// Columns follow the web table. "Switch From / To" depends on the request
// type: payment method names, old → new dates, or the value texts; a delete
// request has none.
//
// Read-only: the web's approve/deny action was not captured in any HAR, and
// the old `/approvals/update` guess would be a blind write to production.
// Displayed 25 per page with page controls, like the other web-table screens.
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../redux/store';
import { getApprovalsList, ApprovalRow } from '../../../api/employeeDashboard';
import AppHeader from '../../../components/AppHeader';

const R = '#E63946';
const PAGE_SIZE = 25;

const STATUSES = ['All', 'Pending', 'Approved', 'Denied'];
const TYPES: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Date', value: 'Date' },
  { label: 'Payment Method', value: 'PaymentMethod' },
  { label: 'Delete Record', value: 'DeleteRecode' },
  { label: 'Package', value: 'Package' },
];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map(t => [t.value, t.label]));

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  PaymentMethod: { bg: '#E8F5E9', text: '#2E7D32' },
  DeleteRecode: { bg: '#FFF3E0', text: '#E65100' },
  Date: { bg: '#E3F2FD', text: '#1565C0' },
  Package: { bg: '#F3E5F5', text: '#6A1B9A' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Approved: { bg: '#E8F5E9', text: '#2E7D32' },
  Pending: { bg: '#FFF8E1', text: '#B45309' },
  Denied: { bg: '#FFEBEE', text: '#C62828' },
};

const na = (v: any) => {
  const s = String(v ?? '').trim();
  return s && s !== 'null' ? s : 'N/A';
};
const dmy = (v: any) => {
  const s = na(v);
  if (s === 'N/A') return s;
  const [y, m, d] = s.slice(0, 10).split('-');
  return d ? `${d}-${m}-${y}` : s;
};

const switchOf = (r: ApprovalRow): [string, string] => {
  switch (r.type) {
    case 'PaymentMethod': return [na(r.old_payment_method_name), na(r.new_payment_method_name)];
    case 'Date': return [dmy(r.old_date), dmy(r.new_date)];
    case 'DeleteRecode': return ['N/A', 'N/A'];
    default: return [na(r.old_value_text), na(r.new_value_text)];
  }
};

const Chips = ({ options, value, onChange }: {
  options: { label: string; value: string }[]; value: string; onChange: (v: string) => void;
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
    {options.map(o => {
      const on = o.value === value;
      return (
        <TouchableOpacity key={o.label} style={[styles.chip, on && styles.chipOn]} onPress={() => onChange(o.value)}>
          <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const ApprovalsScreen = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  // '' (all branches) only for the no-branch super admin login.
  const branchId = profile?.branchId || '';

  const [status, setStatus] = useState('Pending');
  const [type, setType] = useState('');
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const params = status !== 'All'
        ? { branch_id: branchId, status }
        : type ? { branch_id: branchId, type } : { branch_id: branchId };
      setRows(await getApprovalsList(params));
    } catch (e: any) {
      setRows([]);
      setError(e?.response?.data?.message || 'Could not load approvals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, status, type]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, type]);

  const filtered = useMemo(
    () => (type ? rows.filter(r => r.type === type) : rows),
    [rows, type],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderItem = ({ item, index }: { item: ApprovalRow; index: number }) => {
    const ts = TYPE_COLORS[item.type] || { bg: '#F5F5F5', text: '#555' };
    const ss = STATUS_COLORS[item.status] || { bg: '#F5F5F5', text: '#555' };
    const [from, to] = switchOf(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sr}>{(page - 1) * PAGE_SIZE + index + 1}</Text>
          <View style={[styles.badge, { backgroundColor: ts.bg }]}>
            <Text style={[styles.badgeText, { color: ts.text }]}>{TYPE_LABEL[item.type] ?? item.type}</Text>
          </View>
          <View style={styles.flex1} />
          <View style={[styles.badge, { backgroundColor: ss.bg }]}>
            <Text style={[styles.badgeText, { color: ss.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.clientName}>{na(item.client_name)}</Text>
        <Text style={styles.packageName} numberOfLines={1}>{na(item.package_name)}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{na(item.branches_name)}</Text>
          <Text style={styles.meta}>Order #{item.order_id}</Text>
        </View>
        {item.type !== 'DeleteRecode' && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{from}</Text>
            <Icon name="arrow-right" size={14} color="#aaa" />
            <Text style={styles.switchLabel}>{to}</Text>
          </View>
        )}
      </View>
    );
  };

  const Pager = totalPages > 1 ? (
    <View style={styles.pagination}>
      <TouchableOpacity disabled={page === 1} onPress={() => setPage(1)}>
        <Text style={[styles.pageEdge, page === 1 && styles.pageDisabled]}>First Page</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={page === 1} onPress={() => setPage(p => p - 1)}>
        <Text style={[styles.pageArrow, page === 1 && styles.pageDisabled]}>‹</Text>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNums}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
          <TouchableOpacity key={n} onPress={() => setPage(n)} style={[styles.pageNum, page === n && styles.pageNumOn]}>
            <Text style={[styles.pageNumText, page === n && styles.pageNumTextOn]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(p => p + 1)}>
        <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabled]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(totalPages)}>
        <Text style={[styles.pageEdge, page === totalPages && styles.pageDisabled]}>Last Page</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <AppHeader
        title="Approvals"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Filter By Status</Text>
        <Chips options={STATUSES.map(s => ({ label: s, value: s }))} value={status} onChange={setStatus} />
        <Text style={styles.filterLabel}>Filter By Type</Text>
        <Chips options={TYPES} value={type} onChange={setType} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={R} /></View>
      ) : (
        <FlatList
          data={pageRows}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[R]} />}
          ListHeaderComponent={
            filtered.length ? <Text style={styles.count}>{filtered.length} record{filtered.length === 1 ? '' : 's'}</Text> : null
          }
          ListFooterComponent={Pager}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name={error ? 'alert-circle-outline' : 'check-all'} size={48} color="#ddd" />
              <Text style={styles.emptyText}>{error || 'No Record Found'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  flex1: { flex: 1 },
  filters: { paddingHorizontal: 12, paddingTop: 10 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6 },
  chipRow: { gap: 8, paddingBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#eee' },
  chipOn: { backgroundColor: R },
  chipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextOn: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  count: { fontSize: 12, color: '#888', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sr: { fontSize: 12, color: '#aaa', fontWeight: '700', minWidth: 22 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  clientName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  packageName: { fontSize: 12, color: '#888', marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  meta: { fontSize: 12, color: '#666', fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 13, color: '#555', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  pageEdge: { fontSize: 12, fontWeight: '700', color: R },
  pageArrow: { fontSize: 16, fontWeight: '700', color: R, paddingHorizontal: 4 },
  pageDisabled: { color: '#BBB' },
  pageNums: { flexGrow: 0, maxWidth: 200 },
  pageNum: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  pageNumOn: { backgroundColor: R, borderColor: R },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextOn: { color: '#FFF' },
});

export default ApprovalsScreen;
