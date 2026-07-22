import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootState } from '../../../redux/store';
import { getPhysioClientResponses } from '../../../api/physio';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

interface ClientResponse {
  id: number;
  name?: string;
  age?: string | number;
  most_helpful_part?: string;
  suggestions?: string;
  physio_name?: string;
  timestamp?: string;
  [key: string]: unknown;
}

const PAGE_SIZE = 25;

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtDDMMYY = (dateStr?: string) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y.slice(2)}`;
};

const PhysiotherapyClientResponses = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [list, setList] = useState<ClientResponse[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<Date | null>(null);
  const [appliedTo, setAppliedTo] = useState<Date | null>(null);

  const load = useCallback(async (targetPage: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getPhysioClientResponses({
        branch_id: branchId,
        limit: PAGE_SIZE,
        page: targetPage,
        search: appliedSearch || undefined,
        start_date: appliedFrom ? fmtDate(appliedFrom) : undefined,
        end_date: appliedTo ? fmtDate(appliedTo) : undefined,
      });
      setList(res?.data?.data ?? []);
      setTotalPages(res?.data?.pagination?.total_pages ?? 1);
      setPage(targetPage);
    } catch {
      setList([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, appliedSearch, appliedFrom, appliedTo]);

  useFocusEffect(useCallback(() => { load(1); }, [load]));

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const handleClear = () => {
    setSearch(''); setFromDate(null); setToDate(null);
    setAppliedSearch(''); setAppliedFrom(null); setAppliedTo(null);
  };

  const handleAddResponse = () => {
    navigation.navigate('AddPhysioClientResponse');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Client Responses"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {/* Filters */}
      <View style={styles.toolbar}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Name / helpful part / suggestions"
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.selectBtn, { flex: 1 }]} onPress={() => setShowFromPicker(true)}>
            <Icon name="calendar" size={14} color="#555" />
            <Text style={styles.selectBtnText}>{fromDate ? fmtDate(fromDate) : 'From'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectBtn, { flex: 1 }]} onPress={() => setShowToPicker(true)}>
            <Icon name="calendar" size={14} color="#555" />
            <Text style={styles.selectBtnText}>{toDate ? fmtDate(toDate) : 'To'}</Text>
          </TouchableOpacity>
        </View>

        {showFromPicker && (
          <DateTimePicker
            value={fromDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowFromPicker(false); if (d) setFromDate(d); }}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={toDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowToPicker(false); if (d) setToDate(d); }}
          />
        )}

        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.searchAction} onPress={handleSearch}>
            <Text style={styles.searchActionText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearAction} onPress={handleClear}>
            <Text style={styles.clearActionText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addAction} onPress={handleAddResponse}>
            <Icon name="plus" size={14} color="#FFF" />
            <Text style={styles.addActionText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(page, true)} colors={['#E63946']} />}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 34 }]}>S#</Text>
                <Text style={[tbl.headerCell, { width: 70 }]}>Date</Text>
                <Text style={[tbl.headerCell, { width: 130 }]}>Name</Text>
                <Text style={[tbl.headerCell, { width: 50 }]}>Age</Text>
                <Text style={[tbl.headerCell, { width: 150 }]}>Most Helpful Part</Text>
                <Text style={[tbl.headerCell, { width: 150 }]}>Suggestions</Text>
                <Text style={[tbl.headerCell, { width: 120 }]}>Physio</Text>
              </View>
              {list.length === 0 ? (
                <View style={styles.noRecord}><Text style={styles.noRecordText}>No responses found</Text></View>
              ) : (
                list.map((r, i) => (
                  <View key={r.id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 34 }]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                    <Text style={[tbl.cell, { width: 70 }]}>{fmtDDMMYY(r.timestamp)}</Text>
                    <Text style={[tbl.cell, tbl.cellRed, { width: 130 }]} numberOfLines={1}>{r.name ?? '—'}</Text>
                    <Text style={[tbl.cell, { width: 50 }]} numberOfLines={1}>{r.age ?? '—'}</Text>
                    <Text style={[tbl.cell, { width: 150 }]} numberOfLines={1}>{r.most_helpful_part ?? '—'}</Text>
                    <Text style={[tbl.cell, { width: 150 }]} numberOfLines={1}>{r.suggestions ?? '—'}</Text>
                    <Text style={[tbl.cell, { width: 120 }]} numberOfLines={1}>{r.physio_name ?? '—'}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <View style={pg.bar}>
              <TouchableOpacity
                style={[pg.btn, page === 1 && pg.btnDisabled]}
                onPress={() => load(1)}
                disabled={page === 1}
              >
                <Icon name="chevron-double-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[pg.btn, page === 1 && pg.btnDisabled]}
                onPress={() => load(page - 1)}
                disabled={page === 1}
              >
                <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
              </TouchableOpacity>

              <Text style={pg.info}>Page <Text style={pg.infoB}>{page}</Text> of <Text style={pg.infoB}>{totalPages}</Text></Text>

              <TouchableOpacity
                style={[pg.btn, page === totalPages && pg.btnDisabled]}
                onPress={() => load(page + 1)}
                disabled={page === totalPages}
              >
                <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[pg.btn, page === totalPages && pg.btnDisabled]}
                onPress={() => load(totalPages)}
                disabled={page === totalPages}
              >
                <Icon name="chevron-double-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 12, paddingBottom: 30 },

  toolbar: { padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', gap: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },
  filterRow: { flexDirection: 'row', gap: 8 },

  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA' },
  selectBtnText: { fontSize: 12, color: '#333' },

  searchAction: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  searchActionText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  clearAction: { flex: 1, backgroundColor: '#EEE', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  clearActionText: { color: '#555', fontSize: 13, fontWeight: '700' },
  addAction: { flex: 1, flexDirection: 'row', gap: 4, backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  addActionText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  noRecord: { paddingVertical: 24, alignItems: 'center' },
  noRecordText: { fontSize: 13, color: '#999' },
});

const tbl = StyleSheet.create({
  headerRow: { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell: { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted: { color: '#888' },
  cellRed: { color: '#C0392B', fontWeight: '600' },
});

const pg = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FAFAFA' },
  btn: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnDisabled: { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  info: { fontSize: 13, color: '#555', paddingHorizontal: 8 },
  infoB: { fontWeight: '700', color: '#1A1A1A' },
});

export default PhysiotherapyClientResponses;
