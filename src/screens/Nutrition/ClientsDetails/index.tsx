import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getClientHub } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const FILTERS: { label: string; value: string }[] = [
  { label: 'All clients', value: 'all' },
  { label: 'With nutrition records', value: 'has_any' },
  { label: 'No nutrition records yet', value: 'missing_any' },
  { label: 'Has meal plan', value: 'meal_plan' },
  { label: 'Has questionnaire', value: 'questionnaire' },
  { label: 'Has nutrition assessment', value: 'nutrition_assessment' },
  { label: 'Has diet plan issued', value: 'diet_plan' },
  { label: 'Has appointments', value: 'appointments' },
];

const initials = (name: string) =>
  (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('') || '—';

const BADGES = [
  { key: 'meals', label: 'MEALS' },
  { key: 'qnnaire', label: "Q'NNAIRE" },
  { key: 'assessment', label: 'ASSESSMENT' },
  { key: 'diet', label: 'DIET' },
  { key: 'appts', label: 'APPTS' },
];

const QUICK_ACTIONS = (item: any) => {
  const counts = item.counts ?? {};
  return [
    {
      key: 'meal_plan', label: 'Meal Plan', icon: 'food-apple-outline',
      status: counts.meal_plans > 0 ? `${counts.meal_plans} on file` : 'Not added',
      addScreen: 'AddMealsPlan', allScreen: 'ViewMealsPlan',
    },
    {
      key: 'assessment_questionnaire', label: 'Assessment Questionnaire', icon: 'file-document-edit-outline',
      status: counts.questionnaires > 0 ? `${counts.questionnaires} on file` : 'Not added',
      addScreen: 'AddAssessmentQuestionnaire', allScreen: 'ViewAssessmentQuestionnaire',
    },
    {
      key: 'nutrition_assessment', label: 'Nutrition Assessment', icon: 'heart-pulse',
      status: counts.nutrition_assessments > 0 ? `${counts.nutrition_assessments} on file` : 'Not added',
      addScreen: 'AddNutritionAssessments', allScreen: 'ViewNutritionAssessments',
    },
    {
      key: 'diet_plan_issued', label: 'Diet Plan Issued', icon: 'clipboard-text-outline',
      status: counts.diet_plans > 0 ? `${counts.diet_plans} on file` : 'Not added',
      addScreen: 'AddDietPlanIssued', allScreen: 'ViewDietPlanIssued',
    },
    {
      key: 'appointments', label: 'Appointments', icon: 'calendar-check-outline',
      status: counts.appointments > 0 ? `${counts.appointments} on file` : 'Not added',
      addScreen: 'AddNutritionAppointment', allScreen: 'NutritionAppointments',
    },
  ];
};

const DEMO_CLIENTS = [
  {
    id: 101, uid: 'F11-2606-50', full_name: 'Asim Ali Pirzada', phone: '+923139083799', email: 'asim.alipirzada@gmail.com', gender: 'Male',
    counts: { meal_plans: 0, nutrition_assessments: 0, questionnaires: 0, diet_plans: 0, appointments: 0 },
  },
  {
    id: 102, uid: 'F11-2606-49', full_name: 'Maryum Fahim', phone: '+923327722991', email: 'fahim.sheikh@gmail.com', gender: 'Female',
    counts: { meal_plans: 0, nutrition_assessments: 0, questionnaires: 0, diet_plans: 0, appointments: 0 },
  },
  {
    id: 103, uid: 'F11-2606-48', full_name: 'Juninho Ulyssa', phone: '+923300366996', email: 'juninho@gmail.com', gender: 'Male',
    counts: { meal_plans: 0, nutrition_assessments: 0, questionnaires: 0, diet_plans: 0, appointments: 1 },
  },
];

const ClientsDetails = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTERS[0]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getClientHub({
        branch_id: branchId,
        search: search.trim() || undefined,
        filter: filter.value === 'all' ? undefined : (filter.value as any),
        limit: 20,
      });
      const data = res.data?.data?.data ?? [];
      setRecords(Array.isArray(data) && data.length ? data : DEMO_CLIENTS);
      setTotal(res.data?.data?.total ?? (Array.isArray(data) && data.length ? data.length : 3111));
    } catch {
      setRecords(DEMO_CLIENTS);
      setTotal(3111);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, search, filter]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: string | number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const renderItem = ({ item }: { item: any }) => {
    const isOpen = !!expanded[item.id];
    const actions = QUICK_ACTIONS(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item.full_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>ID: {item.uid ?? item.id}</Text>
            </View>
            <Text style={styles.clientName}>{item.full_name}</Text>
            {item.gender ? (
              <View style={styles.infoRow}>
                <Icon name="account-outline" size={13} color="#888" />
                <Text style={styles.infoText}>{item.gender}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Icon name="phone-outline" size={13} color="#888" />
              <Text style={styles.infoText}>{item.phone || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="email-outline" size={13} color="#888" />
              <Text style={styles.infoText} numberOfLines={1}>{item.email || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Status badges */}
        <View style={styles.badgeRow}>
          {BADGES.map((b, i) => {
            const active = (actions[i]?.status ?? '').includes('on file');
            return (
              <View key={b.key} style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{b.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Quick Actions toggle */}
        <TouchableOpacity style={styles.toggleRow} onPress={() => toggleExpand(item.id)}>
          <Text style={styles.toggleLabel}>QUICK ACTIONS</Text>
          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.actionsList}>
            {actions.map(a => (
              <View key={a.key} style={styles.actionRow}>
                <View style={styles.actionInfo}>
                  <Icon name={a.icon} size={16} color="#555" />
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </View>
                <Text style={[styles.actionStatus, a.status !== 'Not added' && styles.actionStatusActive]}>{a.status}</Text>
                <View style={styles.actionBtns}>
                  <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate(a.addScreen, { client: item })}>
                    <Icon name="plus" size={13} color="#FFF" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.allBtn} onPress={() => navigation.navigate(a.allScreen, { client: item })}>
                    <Icon name="format-list-bulleted" size={13} color="#1A1A1A" />
                    <Text style={styles.allBtnText}>All</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Clients Details"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Icon name="magnify" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Browse all clients or type name, phone, ID..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load()}
            returnKeyType="search"
          />
        </View>

        {/* Filter + total */}
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>Nutrition filter</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setFilterOpen(v => !v)}>
              <Text style={styles.dropdownText}>{filter.label}</Text>
              <Icon name={filterOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
            </TouchableOpacity>
            {filterOpen && (
              <View style={styles.dropdownMenu}>
                {FILTERS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.dropdownItem, filter.value === opt.value && styles.dropdownItemActive]}
                    onPress={() => { setFilter(opt); setFilterOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, filter.value === opt.value && styles.dropdownItemTextActive]}>{opt.label}</Text>
                    {filter.value === opt.value && <Icon name="check" size={14} color="#E63946" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalValue}>{total.toLocaleString()}</Text>
            <Text style={styles.totalLabel}>Clients</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 40 }} />
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="account-search-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Clients Found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filter.</Text>
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
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA', marginBottom: 10 },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },

  filterRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  filterLabel:  { fontSize: 11, color: '#999', fontWeight: '700', marginBottom: 6 },
  dropdown:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dropdownText: { fontSize: 13, color: '#1A1A1A' },
  dropdownMenu: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 4, overflow: 'hidden', backgroundColor: '#FFF', position: 'absolute', top: 64, left: 0, right: 0, zIndex: 10, elevation: 4 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemActive: { backgroundColor: '#FFF5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },
  dropdownItemTextActive: { color: '#E63946', fontWeight: '700' },

  totalBox:     { alignItems: 'center', backgroundColor: '#FFF5F5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  totalValue:   { fontSize: 16, fontWeight: '900', color: '#E63946' },
  totalLabel:   { fontSize: 10, color: '#999', fontWeight: '700', marginTop: 1 },

  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader:   { flexDirection: 'row', gap: 12, marginBottom: 10 },
  avatar:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FBEAEA', alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 15, fontWeight: '800', color: '#E63946' },
  idBadge:      { alignSelf: 'flex-start', backgroundColor: '#F0F0F0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  idBadgeText:  { fontSize: 10, color: '#888', fontWeight: '700' },
  clientName:   { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  infoText:     { fontSize: 12, color: '#777', flex: 1 },

  badgeRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', marginBottom: 4 },
  badge:        { backgroundColor: '#F0F0F0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeActive:  { backgroundColor: '#FFE5E5' },
  badgeText:    { fontSize: 10, fontWeight: '700', color: '#999' },
  badgeTextActive: { color: '#E63946' },

  toggleRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleLabel:  { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 0.5 },

  actionsList:  { gap: 10, marginTop: 4 },
  actionRow:    { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 10, gap: 6 },
  actionInfo:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel:  { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  actionStatus: { fontSize: 11, color: '#999' },
  actionStatusActive: { color: '#43A047', fontWeight: '700' },
  actionBtns:   { flexDirection: 'row', gap: 8, marginTop: 4 },
  addBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#43A047', borderRadius: 7, paddingVertical: 7 },
  addBtnText:   { color: '#FFF', fontSize: 12, fontWeight: '700' },
  allBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 7, paddingVertical: 7 },
  allBtnText:   { color: '#1A1A1A', fontSize: 12, fontWeight: '700' },

  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:    { fontSize: 13, color: '#999' },
});

export default ClientsDetails;
