import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getDietPlans } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const display = (s?: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const staffName = (p?: { first_name?: string; last_name?: string } | null) =>
  p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || '—' : '—';

const clientName = (c?: { first_name?: string; last_name?: string } | null) =>
  c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—' : '—';

const DietPlanIssued = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getDietPlans({
        branch_id: branchId,
        search: search.trim() || undefined,
        limit: 50,
      });
      const data = res.data?.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, search]);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.indexBox}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.clientName}>{clientName(item.client)}</Text>
          <Text style={styles.cardSub}>{display(item.date)}</Text>
        </View>
        <View style={[styles.statusBadge, item.diet_plan_issued ? styles.statusActive : styles.statusInactive]}>
          <Icon name={item.diet_plan_issued ? 'check' : 'close'} size={12} color={item.diet_plan_issued ? '#43A047' : '#999'} />
          <Text style={[styles.statusText, { color: item.diet_plan_issued ? '#43A047' : '#999' }]}>
            {item.diet_plan_issued ? 'Issued' : 'Not Issued'}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Goal</Text>
          <View style={styles.goalBadge}>
            <Text style={styles.goalBadgeText}>{item.goal || '—'}</Text>
          </View>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Trainer</Text>
          <Text style={styles.gridValue}>{staffName(item.trainer)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Nutritionist</Text>
          <Text style={styles.gridValue}>{staffName(item.nutritionist)}</Text>
        </View>
      </View>

      {item.remarks ? (
        <View style={styles.textRow}>
          <Text style={styles.gridLabel}>Remarks</Text>
          <Text style={styles.textValue}>{item.remarks}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Diet Plan Issued"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        {/* Add Record */}
        <View style={styles.addRow}>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddDietPlanIssued')}>
            <Icon name="plus" size={16} color="#FFF" />
            <Text style={styles.addBtnText}>Add Record</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Icon name="magnify" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search client..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load()}
            returnKeyType="search"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 30 }} />
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="clipboard-text-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Diet Plans Found</Text>
            <Text style={styles.emptyText}>Try adjusting your search.</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },
  addRow:       { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText:   { color: '#FFF', fontSize: 13, fontWeight: '700' },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA', marginBottom: 12 },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },

  card:         { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  indexBox:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  indexText:    { fontSize: 12, fontWeight: '700', color: '#888' },
  clientName:   { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cardSub:      { fontSize: 12, color: '#999', marginTop: 2 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusActive: { backgroundColor: '#E8F5E9' },
  statusInactive: { backgroundColor: '#F0F0F0' },
  statusText:   { fontSize: 11, fontWeight: '700' },

  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem:     { width: '33%', paddingVertical: 5, paddingRight: 6 },
  gridLabel:    { fontSize: 11, color: '#999', marginBottom: 4 },
  gridValue:    { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  goalBadge:    { alignSelf: 'flex-start', backgroundColor: '#E8F1FC', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  goalBadgeText: { fontSize: 11, fontWeight: '700', color: '#1E88E5' },

  textRow:      { marginTop: 6 },
  textValue:    { fontSize: 13, color: '#1A1A1A' },

  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:    { fontSize: 13, color: '#999' },
});

export default DietPlanIssued;
