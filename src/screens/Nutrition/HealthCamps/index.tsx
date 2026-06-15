import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { RootState } from '../../../redux/store';
import { getHealthCamps } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const display = (s?: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const staffName = (p?: { first_name?: string; last_name?: string } | null) =>
  p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || '—' : '—';

const clientName = (item: any) =>
  item.client_name || (item.client ? `${item.client.first_name ?? ''} ${item.client.last_name ?? ''}`.trim() : '') || '—';

const HealthCamps = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getHealthCamps({
        branch_id: branchId,
        search: search.trim() || undefined,
        start_date: date || undefined,
        end_date: date || undefined,
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
  }, [branchId, search, date]);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.indexBox}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.clientName}>{clientName(item)}</Text>
          <Text style={styles.cardSub}>{display(item.camp_date ?? item.date)}</Text>
        </View>
        {item.conversion ? (
          <View style={styles.convBadge}>
            <Text style={styles.convBadgeText}>{item.conversion}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Age</Text>
          <Text style={styles.gridValue}>{item.age ?? '—'}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Consultation</Text>
          <Text style={styles.gridValue}>{item.consultation || '—'}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Lifestyle</Text>
          <Text style={styles.gridValue}>{item.lifestyle || '—'}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Trainer</Text>
          <Text style={styles.gridValue}>{staffName(item.trainer)}</Text>
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
        title="Health Camps"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        {/* Search + Date */}
        <View style={styles.filterRow}>
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
          <TouchableOpacity style={styles.dateBox} onPress={() => setPickerOpen(true)}>
            <Text style={styles.dateText}>{date ? display(date) : 'Date'}</Text>
            <Icon name="calendar" size={16} color="#888" />
          </TouchableOpacity>
          {date ? (
            <TouchableOpacity style={styles.clearDateBtn} onPress={() => setDate('')}>
              <Icon name="close" size={16} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 30 }} />
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="hospital-building" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or date.</Text>
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

      <DateTimePickerModal
        isVisible={pickerOpen}
        mode="date"
        date={date ? new Date(date) : new Date()}
        onConfirm={(d: Date) => { setDate(fmt(d)); setPickerOpen(false); }}
        onCancel={() => setPickerOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  filterRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  searchBox:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA' },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },
  dateBox:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 13, color: '#1A1A1A' },
  clearDateBtn: { padding: 6 },

  card:         { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  indexBox:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  indexText:    { fontSize: 12, fontWeight: '700', color: '#888' },
  clientName:   { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cardSub:      { fontSize: 12, color: '#999', marginTop: 2 },
  convBadge:    { backgroundColor: '#E8F1FC', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  convBadgeText: { fontSize: 11, fontWeight: '700', color: '#1E88E5' },

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

export default HealthCamps;
