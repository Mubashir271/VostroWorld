import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getClientsList } from '../../../api/employeeDashboard';

interface Client {
  id: number;
  uid: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  status: string;
  branches_name: string;
  address: string;
  city: string;
  membership_type: Array<{ get_package_name?: { name: string } }>;
}

const CLIENT_TYPES = ['All', 'Male', 'Female', 'Others'];

const PAGE_SIZE = 25;

const ViewClients = () => {
  const navigation   = useNavigation<any>();
  const { profile }  = useSelector((state: RootState) => state.user);
  const branchId     = profile?.branchId ?? 1;

  const [activeClients, setActiveClients]     = useState<Client[]>([]);
  const [inactiveClients, setInactiveClients] = useState<Client[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [clientType, setClientType] = useState('All');
  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [activePage, setActivePage]     = useState(1);
  const [inactivePage, setInactivePage] = useState(1);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        getClientsList({ branch_id: branchId, status: '1', limit: 500, page: 1 }),
        getClientsList({ branch_id: branchId, status: '0', limit: 500, page: 1 }),
      ]);
      setActiveClients(activeRes?.data?.data ?? []);
      setInactiveClients(inactiveRes?.data?.data ?? []);
    } catch {
      setActiveClients([]);
      setInactiveClients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  // Reset pages when filter/search changes
  useEffect(() => { setActivePage(1); setInactivePage(1); }, [search, clientType]);

  const applyFilter = (data: Client[]) => data.filter(c => {
    const matchType = clientType === 'All' || (c.gender ?? '').toLowerCase() === clientType.toLowerCase()
      || (clientType === 'Others' && !['male', 'female'].includes((c.gender ?? '').toLowerCase()));
    if (!search.trim()) return matchType;
    const q = search.toLowerCase();
    const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.toLowerCase();
    return matchType && (
      name.includes(q) ||
      (c.uid ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(search) ||
      (c.email ?? '').toLowerCase().includes(q)
    );
  });

  const activeList   = applyFilter(activeClients);
  const inactiveList = applyFilter(inactiveClients);

  const renderRow = (item: Client, globalIndex: number, pageIndex: number) => {
    const name = `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || '—';
    const membership = item.membership_type?.[0]?.get_package_name?.name ?? 'N/A';
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => navigation.navigate('NewMemberRegistration', { clientId: item.id })}
      >
        <View style={[tbl.dataRow, pageIndex % 2 === 1 && tbl.dataRowAlt]}>
          <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{globalIndex + 1}</Text>
          <Text style={[tbl.cell, { width: 70 }]} numberOfLines={1}>{item.branches_name ?? 'F 11'}</Text>
          <Text style={[tbl.cell, tbl.cellRed, { width: 140 }]} numberOfLines={1}>{name}</Text>
          <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>{item.uid ?? '—'}</Text>
          <Text style={[tbl.cell, { width: 160 }]} numberOfLines={1}>{item.email ?? '—'}</Text>
          <Text style={[tbl.cell, { width: 120 }]} numberOfLines={1}>{item.phone ?? '—'}</Text>
          <Text style={[tbl.cell, { width: 70 }]} numberOfLines={1}>{item.gender ?? '—'}</Text>
          <Text style={[tbl.cell, { width: 160 }]} numberOfLines={1}>{membership}</Text>
          <Text style={[tbl.cell, { width: 160 }]} numberOfLines={1}>{item.address || '—'}</Text>
          <Text style={[tbl.cell, { width: 110 }]} numberOfLines={1}>{item.city || '—'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const TableSection = ({
    title, data, page, setPage,
  }: { title: string; data: Client[]; page: number; setPage: (p: number) => void }) => {
    const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
    const pageData   = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const startIdx   = (page - 1) * PAGE_SIZE;

    return (
      <View style={styles.section}>
        {/* Section header with count */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{data.length} record{data.length !== 1 ? 's' : ''}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={tbl.headerRow}>
              <Text style={[tbl.headerCell, { width: 38 }]}>Sr#</Text>
              <Text style={[tbl.headerCell, { width: 70 }]}>Branch</Text>
              <Text style={[tbl.headerCell, { width: 140 }]}>Name</Text>
              <Text style={[tbl.headerCell, { width: 100 }]}>Membership ID</Text>
              <Text style={[tbl.headerCell, { width: 160 }]}>Email</Text>
              <Text style={[tbl.headerCell, { width: 120 }]}>Phone</Text>
              <Text style={[tbl.headerCell, { width: 70 }]}>Gender</Text>
              <Text style={[tbl.headerCell, { width: 160 }]}>Membership</Text>
              <Text style={[tbl.headerCell, { width: 160 }]}>Address</Text>
              <Text style={[tbl.headerCell, { width: 110 }]}>City</Text>
            </View>
            {data.length === 0
              ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
              : pageData.map((c, i) => renderRow(c, startIdx + i, i))}
          </View>
        </ScrollView>

        {/* Pagination bar */}
        {data.length > PAGE_SIZE && (
          <View style={pg.bar}>
            <TouchableOpacity
              style={[pg.btn, page === 1 && pg.btnDisabled]}
              onPress={() => setPage(1)}
              disabled={page === 1}
            >
              <Icon name="chevron-double-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[pg.btn, page === 1 && pg.btnDisabled]}
              onPress={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
            </TouchableOpacity>

            <Text style={pg.info}>Page <Text style={pg.infoB}>{page}</Text> of <Text style={pg.infoB}>{totalPages}</Text></Text>

            <TouchableOpacity
              style={[pg.btn, page === totalPages && pg.btnDisabled]}
              onPress={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[pg.btn, page === totalPages && pg.btnDisabled]}
              onPress={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <Icon name="chevron-double-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="View Clients"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.toolbar}>
        {/* Client type filter */}
        <TouchableOpacity style={styles.typeBtn} onPress={() => setTypeDropOpen(v => !v)}>
          <Text style={styles.typeBtnText}>{clientType === 'All' ? 'Select Client Type' : clientType}</Text>
          <Icon name={typeDropOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#555" />
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchBar}>
          <Icon name="magnify" size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, ID, phone..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={15} color="#bbb" />
            </TouchableOpacity>
          )}
        </View>

        {/* Add New Client */}
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewMemberRegistration')}>
          <Icon name="plus" size={16} color="#FFF" />
          <Text style={styles.addBtnText}>Add New Client</Text>
        </TouchableOpacity>
      </View>

      {/* Type dropdown */}
      {typeDropOpen && (
        <View style={styles.typeMenu}>
          {CLIENT_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeMenuItem, clientType === t && styles.typeMenuItemActive]}
              onPress={() => { setClientType(t); setTypeDropOpen(false); }}
            >
              <Text style={[styles.typeMenuItemText, clientType === t && styles.typeMenuItemTextActive]}>{t}</Text>
              {clientType === t && <Icon name="check" size={14} color="#E63946" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E63946" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          <TableSection
            title="Active Clients"
            data={activeList}
            page={activePage}
            setPage={setActivePage}
          />

          <TableSection
            title="Inactive Clients"
            data={inactiveList}
            page={inactivePage}
            setPage={setInactivePage}
          />

          <Text style={styles.countNote}>
            {activeList.length + inactiveList.length} client{activeList.length + inactiveList.length !== 1 ? 's' : ''} shown
          </Text>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#F7F8FA' },
  toolbar:             { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', flexWrap: 'wrap' },
  typeBtn:             { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  typeBtnText:         { fontSize: 13, color: '#333' },
  searchBar:           { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA', minWidth: 120 },
  searchInput:         { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },
  addBtn:              { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E63946', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  addBtnText:          { fontSize: 13, color: '#FFF', fontWeight: '700' },
  typeMenu:            { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', elevation: 4 },
  typeMenuItem:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  typeMenuItemActive:  { backgroundColor: '#FFF5F5' },
  typeMenuItemText:    { fontSize: 14, color: '#333' },
  typeMenuItemTextActive: { color: '#E63946', fontWeight: '600' },
  center:              { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:              { padding: 12, paddingBottom: 30 },
  section:             { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  sectionHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionTitle:        { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  sectionCount:        { fontSize: 12, color: '#888' },
  noRecord:            { paddingVertical: 24, alignItems: 'center' },
  noRecordText:        { fontSize: 13, color: '#999' },
  countNote:           { textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 4 },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:    { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:  { color: '#888' },
  cellRed:    { color: '#C0392B', fontWeight: '600' },
 });

const pg = StyleSheet.create({
  bar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FAFAFA' },
  btn:        { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnDisabled:{ backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  info:       { fontSize: 13, color: '#555', paddingHorizontal: 8 },
  infoB:      { fontWeight: '700', color: '#1A1A1A' },
});

export default ViewClients;
