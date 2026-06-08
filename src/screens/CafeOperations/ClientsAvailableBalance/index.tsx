import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCafeClientsBalance } from '../../../api/cafe';

const fmtRs = (val: any) => `Rs ${parseFloat(val ?? 0).toLocaleString()}/-`;

const ClientsAvailableBalance = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [rows, setRows]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getCafeClientsBalance({ branch_id: branchId, limit: 100 });
      setRows(res.data?.data ?? res.data ?? []);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? rows.filter(r =>
        (r.client_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.first_name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : rows;

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.dataRow, index % 2 === 1 && styles.dataRowAlt]}>
      <Text style={[styles.cell, styles.cellMuted, { width: 40 }]}>{index + 1}</Text>
      <Text style={[styles.cell, { flex: 1.2 }]} numberOfLines={1}>{item.branch_name ?? 'F 11'}</Text>
      <Text style={[styles.cell, styles.cellRed, { flex: 2 }]} numberOfLines={1}>
        {item.client_name ?? `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim()}
      </Text>
      <Text style={[styles.cell, styles.cellGreen, { flex: 1.2, textAlign: 'right' }]}>
        {fmtRs(item.available_balance ?? item.balance ?? 0)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Clients Available Balance"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Icon name="magnify" size={18} color="#999" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={16} color="#bbb" />
            </TouchableOpacity>
          )}
        </View>

        {/* Table header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, { width: 40 }]}>Sr#</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Branch</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Client Name</Text>
          <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'right' }]}>Balance</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderRow}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Icon name="account-balance-wallet-outline" size={48} color="#ddd" />
                <Text style={styles.emptyText}>No balance records found</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F7F8FA' },
  body:        { flex: 1, padding: 14 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },
  headerRow:   { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  headerCell:  { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 2 },
  dataRow:     { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dataRowAlt:  { backgroundColor: '#FBF8F8' },
  cell:        { fontSize: 13, color: '#1A1A1A', paddingHorizontal: 2, alignSelf: 'center' },
  cellMuted:   { color: '#888' },
  cellRed:     { color: '#C0392B', fontWeight: '600' },
  cellGreen:   { color: '#10b981', fontWeight: '600' },
  empty:       { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:   { fontSize: 14, color: '#999' },
});

export default ClientsAvailableBalance;
