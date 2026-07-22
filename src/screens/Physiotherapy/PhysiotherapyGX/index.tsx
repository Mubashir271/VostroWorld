import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getPhysioGX } from '../../../api/physio';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

interface GXClient {
  client_id: number;
  name: string;
  record_date: string;
  diagnosis: string;
  region: string;
  session_recommended: string;
}

const PhysiotherapyGX = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [list, setList] = useState<GXClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  // Applied filter — the web admin only re-queries when "Search" is pressed.
  const [appliedSearch, setAppliedSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getPhysioGX({
        branch_id: branchId,
        search: appliedSearch || undefined,
      });
      setList(res?.data?.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, appliedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => setAppliedSearch(search);
  const handleClear = () => { setSearch(''); setAppliedSearch(''); };

  return (
    <View style={styles.container}>
      <AppHeader
        title="GX Clients"
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
            placeholder="Name, diagnosis, region..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 40 }]}>S.No</Text>
                <Text style={[tbl.headerCell, { width: 70 }]}>Date</Text>
                <Text style={[tbl.headerCell, { width: 150 }]}>Name</Text>
                <Text style={[tbl.headerCell, { width: 110 }]}>Diagnosis</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Region</Text>
                <Text style={[tbl.headerCell, { width: 100 }]}>Session</Text>
              </View>
              {list.length === 0 ? (
                <View style={styles.noRecord}><Text style={styles.noRecordText}>No clients found</Text></View>
              ) : (
                list.map((c, i) => (
                  <View key={c.client_id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 40 }]}>{i + 1}</Text>
                    <Text style={[tbl.cell, { width: 70 }]}>{c.record_date || '—'}</Text>
                    <Text style={[tbl.cell, tbl.cellRed, { width: 150 }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={[tbl.cell, { width: 110 }]} numberOfLines={1}>{c.diagnosis || '—'}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{c.region || '—'}</Text>
                    <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>{c.session_recommended || '—'}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
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

export default PhysiotherapyGX;
