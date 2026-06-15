import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getNutritionAssessments } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const display = (s: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

const FIELDS: { label: string; key: string }[] = [
  { label: 'Daily Water Intake', key: 'daily_water_intake' },
  { label: 'Activity Level', key: 'activity_level' },
  { label: 'Stress Level', key: 'take_stress' },
  { label: 'Diabetes', key: 'diabetes' },
  { label: 'Hypertension / CVD', key: 'hypertension_cvd' },
  { label: 'PCOS', key: 'polycystic_ovarian_syndrome' },
  { label: 'Anemia', key: 'anemia' },
  { label: 'IBS', key: 'ibs' },
  { label: 'H. Pylori', key: 'h_pylori' },
  { label: 'Muscle Pain', key: 'muscle_pain' },
];

const TEXT_FIELDS: { label: string; key: string }[] = [
  { label: 'Favorite Foods', key: 'favorite_foods' },
  { label: 'Disliked Foods', key: 'disliked_foods' },
  { label: 'Allergic Foods', key: 'allergic_foods' },
  { label: 'Any Other Issue', key: 'any_other_issue' },
  { label: 'Comments', key: 'comments' },
];

const ViewNutritionAssessments = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [search, setSearch]       = useState('');
  const [records, setRecords]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getNutritionAssessments({ branch_id: branchId, limit: 50 });
      const data = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r =>
    !search.trim() || (r.client_detail?.client_name ?? '').toLowerCase().includes(search.trim().toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.clientName}>{item.client_detail?.client_name ?? '—'}</Text>
          <Text style={styles.cardDate}>{display(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, item.status === '1' ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusText}>{item.status === '1' ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {FIELDS.map(f => (
          <View key={f.key} style={styles.gridItem}>
            <Text style={styles.gridLabel}>{f.label}</Text>
            <Text style={styles.gridValue}>{item[f.key] || '—'}</Text>
          </View>
        ))}
      </View>

      {TEXT_FIELDS.map(f => (
        item[f.key] ? (
          <View key={f.key} style={styles.textRow}>
            <Text style={styles.gridLabel}>{f.label}</Text>
            <Text style={styles.textValue}>{item[f.key]}</Text>
          </View>
        ) : null
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Nutrition Assessments"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.searchBox}>
            <Icon name="magnify" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by client name"
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddNutritionAssessments')}>
            <Icon name="plus" size={16} color="#FFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="clipboard-text-off-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Record Found</Text>
            <Text style={styles.emptyText}>No nutrition assessments available.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
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
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  searchBox:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA' },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText:   { color: '#FFF', fontSize: 13, fontWeight: '700' },
  card:         { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  clientName:   { fontSize: 15, fontWeight: '700', color: '#C0392B' },
  cardDate:     { fontSize: 12, color: '#999', marginTop: 2 },
  statusBadge:  { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusActive: { backgroundColor: '#E8F5E9' },
  statusInactive: { backgroundColor: '#FBEAEA' },
  statusText:   { fontSize: 11, fontWeight: '700', color: '#333' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem:     { width: '50%', paddingVertical: 5, paddingRight: 6 },
  gridLabel:    { fontSize: 11, color: '#999', marginBottom: 2 },
  gridValue:    { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  textRow:      { marginTop: 6 },
  textValue:    { fontSize: 13, color: '#1A1A1A' },
  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:    { fontSize: 13, color: '#999' },
});

export default ViewNutritionAssessments;
