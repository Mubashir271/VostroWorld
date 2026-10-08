import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getAssessmentForms } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const display = (s?: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const clientName = (item: any) => {
  const c = item?.client;
  if (c) return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—';
  return item?.client_name || '—';
};

// The web lists 25 per page with page controls (GET …?limit=25&page=N).
const PAGE_SIZE = 25;

const ViewAssessmentQuestionnaire = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const load = useCallback(async (targetPage = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getAssessmentForms({
        branch_id: branchId,
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        page: targetPage,
      });
      const data = res.data?.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
      setTotalPages(res.data?.pagination?.total_pages ?? 1);
      setTotalRecords(res.data?.pagination?.total_record ?? 0);
      setPage(targetPage);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, search]);

  // Re-run from page 1 whenever the search changes.
  useEffect(() => { load(1); }, [load]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const entries = item.body_entries?.length ?? 0;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AddAssessmentQuestionnaire', { form: item })}
        activeOpacity={0.8}
      >
        <View style={styles.indexBox}>
          <Text style={styles.indexText}>{(page - 1) * PAGE_SIZE + index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.clientName}>{clientName(item)}</Text>
          <View style={styles.metaRow}>
            <Icon name="clipboard-list-outline" size={13} color="#888" />
            <Text style={styles.metaText}>{entries} assessment{entries === 1 ? '' : 's'}</Text>
            <Icon name="clock-outline" size={13} color="#888" style={{ marginLeft: 10 }} />
            <Text style={styles.metaText}>{display(item.updated_at)}</Text>
          </View>
        </View>
        <Icon name="chevron-right" size={20} color="#bbb" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Assessment Questionnaire"
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
              placeholder="Search client..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => load(1)}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddAssessmentQuestionnaire')}>
            <Icon name="plus" size={16} color="#FFF" />
            <Text style={styles.addBtnText}>New Questionnaire</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 30 }} />
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="clipboard-text-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Questionnaires Found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or add a new one.</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(page, true)} colors={['#E63946']} />}
            ListHeaderComponent={
              <Text style={styles.countText}>{totalRecords} questionnaire{totalRecords === 1 ? '' : 's'}</Text>
            }
            ListFooterComponent={totalPages > 1 ? (
              <View style={pg.bar}>
                <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]} onPress={() => load(1)} disabled={page === 1}>
                  <Icon name="chevron-double-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
                </TouchableOpacity>
                <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]} onPress={() => load(page - 1)} disabled={page === 1}>
                  <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
                </TouchableOpacity>
                <Text style={pg.info}>Page <Text style={pg.infoB}>{page}</Text> of <Text style={pg.infoB}>{totalPages}</Text></Text>
                <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]} onPress={() => load(page + 1)} disabled={page === totalPages}>
                  <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
                </TouchableOpacity>
                <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]} onPress={() => load(totalPages)} disabled={page === totalPages}>
                  <Icon name="chevron-double-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
                </TouchableOpacity>
              </View>
            ) : null}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  topRow:       { flexDirection: 'column', gap: 10, marginBottom: 12 },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA' },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },
  addBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 11 },
  addBtnText:   { color: '#FFF', fontSize: 13, fontWeight: '700' },

  card:         { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  indexBox:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  indexText:    { fontSize: 12, fontWeight: '700', color: '#888' },
  clientName:   { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  metaRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText:     { fontSize: 12, color: '#999', marginLeft: 4 },

  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:    { fontSize: 13, color: '#999' },
  countText:    { fontSize: 12, color: '#888', marginBottom: 8, fontWeight: '600' },
});

const pg = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  btn: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnDisabled: { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  info: { fontSize: 13, color: '#555', paddingHorizontal: 8 },
  infoB: { fontWeight: '700', color: '#1A1A1A' },
});

export default ViewAssessmentQuestionnaire;
