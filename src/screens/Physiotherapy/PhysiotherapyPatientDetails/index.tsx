import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getPhysioPatientDetails } from '../../../api/physio';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

interface Patient {
  id: number;
  uid?: string;
  name?: string;
  patient_name?: string;
  phone?: string;
  age?: string | number;
  gender?: string;
  region?: string;
  diagnosis?: string;
  [key: string]: unknown;
}

const FILTERS = ['All'];

const PAGE_SIZE = 25;

const PhysiotherapyPatientDetails = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [list, setList] = useState<Patient[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [filterDropOpen, setFilterDropOpen] = useState(false);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('All');

  const load = useCallback(async (targetPage: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getPhysioPatientDetails({
        branch_id: branchId,
        limit: PAGE_SIZE,
        page: targetPage,
        search: appliedSearch || undefined,
        filter: appliedFilter !== 'All' ? appliedFilter : undefined,
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
  }, [branchId, appliedSearch, appliedFilter]);

  useFocusEffect(useCallback(() => { load(1); }, [load]));

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedFilter(filter);
  };

  const handleClear = () => {
    setSearch(''); setFilter('All');
    setAppliedSearch(''); setAppliedFilter('All');
  };

  const patientName = (p: Patient) => p.name ?? p.patient_name ?? '—';

  return (
    <View style={styles.container}>
      <AppHeader
        title="Patient Details"
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
            placeholder="Name, UID, phone..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.field}>
          <TouchableOpacity style={styles.dropdown} onPress={() => setFilterDropOpen(v => !v)}>
            <Text style={styles.dropdownText}>{filter}</Text>
            <Icon name={filterDropOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#555" />
          </TouchableOpacity>
          {filterDropOpen && (
            <View style={styles.dropdownMenu}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.dropdownItem, filter === f && styles.dropdownItemActive]}
                  onPress={() => { setFilter(f); setFilterDropOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, filter === f && styles.dropdownItemTextActive]}>{f}</Text>
                  {filter === f && <Icon name="check" size={14} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.searchAction} onPress={handleSearch}>
            <Text style={styles.searchActionText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearAction} onPress={handleClear}>
            <Text style={styles.clearActionText}>Clear</Text>
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
                <Text style={[tbl.headerCell, { width: 80 }]}>UID</Text>
                <Text style={[tbl.headerCell, { width: 140 }]}>Name</Text>
                <Text style={[tbl.headerCell, { width: 110 }]}>Phone</Text>
                <Text style={[tbl.headerCell, { width: 60 }]}>Age</Text>
                <Text style={[tbl.headerCell, { width: 80 }]}>Gender</Text>
                <Text style={[tbl.headerCell, { width: 100 }]}>Region</Text>
                <Text style={[tbl.headerCell, { width: 130 }]}>Diagnosis</Text>
              </View>
              {list.length === 0 ? (
                <View style={styles.noRecord}><Text style={styles.noRecordText}>No patient rows found</Text></View>
              ) : (
                list.map((p, i) => (
                  <View key={p.id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 34 }]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                    <Text style={[tbl.cell, { width: 80 }]} numberOfLines={1}>{p.uid ?? '—'}</Text>
                    <Text style={[tbl.cell, tbl.cellRed, { width: 140 }]} numberOfLines={1}>{patientName(p)}</Text>
                    <Text style={[tbl.cell, { width: 110 }]} numberOfLines={1}>{p.phone ?? '—'}</Text>
                    <Text style={[tbl.cell, { width: 60 }]} numberOfLines={1}>{p.age ?? '—'}</Text>
                    <Text style={[tbl.cell, { width: 80 }]} numberOfLines={1}>{p.gender ?? '—'}</Text>
                    <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>{p.region ?? '—'}</Text>
                    <Text style={[tbl.cell, { width: 130 }]} numberOfLines={1}>{p.diagnosis ?? '—'}</Text>
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
  field: { position: 'relative', zIndex: 1 },

  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA' },
  dropdownText: { fontSize: 13, color: '#333' },
  dropdownMenu: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemActive: { backgroundColor: '#FFF5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },
  dropdownItemTextActive: { color: '#E63946', fontWeight: '700' },

  searchAction: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  searchActionText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  clearAction: { flex: 1, backgroundColor: '#EEE', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  clearActionText: { color: '#555', fontSize: 13, fontWeight: '700' },

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

export default PhysiotherapyPatientDetails;
