// View Cards — CRM / Clients › Access Control — View Cards (web: Manage
// Cards). Data: GET /v1/cards/show (HAR 2026-09-18) — member cards by type
// (Client 1 / Visitor 3) and staff cards (type 2), both server paginated.
// Read-only for now: the web's Block / Unblock / Delete and its card-number
// search were not captured in a HAR, so the search here only filters the page
// on screen and each card shows its Active / Blocked status instead of the
// action buttons.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getAccessCards, AccessCardRow } from '../../../api/cafe';

const MEMBER_TYPES: { label: string; type: 1 | 3 }[] = [
  { label: 'Client', type: 1 },
  { label: 'Visitor', type: 3 },
];
const PAGE_SIZE = 25;

const dmy = (v?: string) => {
  if (!v) return 'N/A';
  const [y, m, d] = v.slice(0, 10).split('-');
  return d ? `${d}-${m}-${y}` : v;
};
const memberName = (c: AccessCardRow) =>
  [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || '—';
const cardNo = (c: AccessCardRow) => (Number(c.number) ? String(c.number) : '—');

type Paged = { rows: AccessCardRow[]; total: number; totalPages: number; page: number };
const EMPTY: Paged = { rows: [], total: 0, totalPages: 1, page: 1 };

const StatusBadge = ({ status }: { status: string }) => {
  const active = String(status) === '1';
  return (
    <View style={[btn.pill, active ? btn.unblock : btn.block]}>
      <Icon name={active ? 'check-circle-outline' : 'cancel'} size={12} color={active ? '#2A9348' : '#C0392B'} />
      <Text style={[btn.pillText, active ? btn.okText : btn.badText]}>{active ? 'Active' : 'Blocked'}</Text>
    </View>
  );
};

const Pagination = ({
  page, totalPages, setPage,
}: { page: number; totalPages: number; setPage: (p: number) => void }) => (
  <View style={pg.bar}>
    <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]} onPress={() => setPage(1)} disabled={page === 1}>
      <Icon name="chevron-double-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
    </TouchableOpacity>
    <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]} onPress={() => setPage(page - 1)} disabled={page === 1}>
      <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
    </TouchableOpacity>
    <Text style={pg.info}>Page <Text style={pg.infoB}>{page}</Text> of <Text style={pg.infoB}>{totalPages}</Text></Text>
    <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]} onPress={() => setPage(page + 1)} disabled={page === totalPages}>
      <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
    </TouchableOpacity>
    <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]} onPress={() => setPage(totalPages)} disabled={page === totalPages}>
      <Icon name="chevron-double-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
    </TouchableOpacity>
  </View>
);

const SearchBox = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <View style={styles.searchBar}>
    <Icon name="magnify" size={16} color="#999" />
    <TextInput
      style={styles.searchInput}
      placeholder="Card number (this page)"
      placeholderTextColor="#aaa"
      value={value}
      onChangeText={onChange}
      keyboardType="number-pad"
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={() => onChange('')}>
        <Icon name="close-circle" size={15} color="#bbb" />
      </TouchableOpacity>
    )}
  </View>
);

const ViewCards = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  // '' (all branches) only for the no-branch super admin login.
  const branchId = profile?.branchId || '';

  const [memberType, setMemberType] = useState(MEMBER_TYPES[0]);
  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [members, setMembers] = useState<Paged>(EMPTY);
  const [staff, setStaff] = useState<Paged>(EMPTY);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadMembers = useCallback(async (page: number) => {
    setLoadingMembers(true);
    try {
      const r = await getAccessCards({ branch_id: branchId, type: memberType.type, page, limit: PAGE_SIZE });
      setMembers({ ...r, page });
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load cards.');
    } finally {
      setLoadingMembers(false);
    }
  }, [branchId, memberType]);

  const loadStaff = useCallback(async (page: number) => {
    setLoadingStaff(true);
    try {
      const r = await getAccessCards({ branch_id: branchId, type: 2, page, limit: PAGE_SIZE });
      setStaff({ ...r, page });
    } catch {
      setStaff(EMPTY);
    } finally {
      setLoadingStaff(false);
    }
  }, [branchId]);

  useEffect(() => { loadMembers(1); }, [loadMembers]);
  useEffect(() => { loadStaff(1); }, [loadStaff]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMembers(members.page), loadStaff(staff.page)]);
    setRefreshing(false);
  };

  const byCard = (rows: AccessCardRow[], q: string) =>
    q.trim() ? rows.filter(c => String(c.number).includes(q.trim())) : rows;
  const memberRows = byCard(members.rows, cardSearch);
  const staffRows = byCard(staff.rows, staffSearch);
  const memberStartIdx = (members.page - 1) * PAGE_SIZE;
  const staffStartIdx = (staff.page - 1) * PAGE_SIZE;

  return (
    <View style={styles.container}>
      <AppHeader
        title="View Cards"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E63946']} />}
      >
        {/* ── Manage Cards ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Manage Cards</Text>
            <Text style={styles.sectionCount}>{members.total} record{members.total !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.toolbar}>
            <SearchBox value={cardSearch} onChange={setCardSearch} />
            <TouchableOpacity style={styles.typeBtn} onPress={() => setTypeDropOpen(v => !v)}>
              <Text style={styles.typeBtnText}>{memberType.label}</Text>
              <Icon name={typeDropOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#555" />
            </TouchableOpacity>
          </View>

          {typeDropOpen && (
            <View style={styles.typeMenu}>
              {MEMBER_TYPES.map(t => (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.typeMenuItem, memberType.type === t.type && styles.typeMenuItemActive]}
                  onPress={() => { setMemberType(t); setTypeDropOpen(false); setCardSearch(''); }}
                >
                  <Text style={[styles.typeMenuItemText, memberType.type === t.type && styles.typeMenuItemTextActive]}>{t.label}</Text>
                  {memberType.type === t.type && <Icon name="check" size={14} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, tbl.wSr]}>Sr#</Text>
                <Text style={[tbl.headerCell, tbl.wType]}>Member Type</Text>
                <Text style={[tbl.headerCell, tbl.wName]}>Name</Text>
                <Text style={[tbl.headerCell, tbl.wBranch]}>Branch</Text>
                <Text style={[tbl.headerCell, tbl.wCard]}>Card Number</Text>
                <Text style={[tbl.headerCell, tbl.wDesc]}>Description</Text>
                <Text style={[tbl.headerCell, tbl.wDate]}>Assigning Date</Text>
                <Text style={[tbl.headerCell, tbl.wStatus]}>Status</Text>
              </View>
              {loadingMembers
                ? <View style={styles.noRecord}><ActivityIndicator color="#E63946" /></View>
                : memberRows.length === 0
                  ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                  : memberRows.map((c, i) => (
                    <View key={c.id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                      <Text style={[tbl.cell, tbl.cellMuted, tbl.wSr]}>{memberStartIdx + i + 1}</Text>
                      <View style={[tbl.cell, tbl.wType, tbl.typeCell]}>
                        <Icon name="account-outline" size={14} color="#2A9348" />
                        <Text style={tbl.memberTypeText}>{memberType.label}</Text>
                      </View>
                      <Text style={[tbl.cell, tbl.wName]} numberOfLines={1}>{memberName(c)}</Text>
                      <Text style={[tbl.cell, tbl.wBranch]} numberOfLines={1}>{c.name || '—'}</Text>
                      <Text style={[tbl.cell, tbl.wCard]} numberOfLines={1}>{cardNo(c)}</Text>
                      <Text style={[tbl.cell, tbl.cellMuted, tbl.wDesc]} numberOfLines={1}>{c.membership_category || 'N/A'}</Text>
                      <Text style={[tbl.cell, tbl.wDate]} numberOfLines={1}>{dmy(c.date)}</Text>
                      <View style={[tbl.cell, tbl.wStatus]}><StatusBadge status={c.status} /></View>
                    </View>
                  ))}
            </View>
          </ScrollView>

          {members.totalPages > 1 && (
            <Pagination page={members.page} totalPages={members.totalPages} setPage={loadMembers} />
          )}
        </View>

        {/* ── Staff Cards ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Staff Cards</Text>
            <Text style={styles.sectionCount}>{staff.total} record{staff.total !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.toolbar}>
            <SearchBox value={staffSearch} onChange={setStaffSearch} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, tbl.wSr]}>Sr#</Text>
                <Text style={[tbl.headerCell, tbl.wName]}>Name</Text>
                <Text style={[tbl.headerCell, tbl.wBranch]}>Branch</Text>
                <Text style={[tbl.headerCell, tbl.wCard]}>Card Number</Text>
                <Text style={[tbl.headerCell, tbl.wDesc]}>Description</Text>
                <Text style={[tbl.headerCell, tbl.wDate]}>Assigning Date</Text>
                <Text style={[tbl.headerCell, tbl.wStatus]}>Status</Text>
              </View>
              {loadingStaff
                ? <View style={styles.noRecord}><ActivityIndicator color="#E63946" /></View>
                : staffRows.length === 0
                  ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                  : staffRows.map((c, i) => (
                    <View key={c.id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                      <Text style={[tbl.cell, tbl.cellMuted, tbl.wSr]}>{staffStartIdx + i + 1}</Text>
                      <Text style={[tbl.cell, tbl.wName]} numberOfLines={1}>{memberName(c)}</Text>
                      <Text style={[tbl.cell, tbl.wBranch]} numberOfLines={1}>{c.name || '—'}</Text>
                      <Text style={[tbl.cell, tbl.wCard]} numberOfLines={1}>{cardNo(c)}</Text>
                      <Text style={[tbl.cell, tbl.cellMuted, tbl.wDesc]} numberOfLines={1}>{c.membership_category || 'N/A'}</Text>
                      <Text style={[tbl.cell, tbl.wDate]} numberOfLines={1}>{dmy(c.date)}</Text>
                      <View style={[tbl.cell, tbl.wStatus]}><StatusBadge status={c.status} /></View>
                    </View>
                  ))}
            </View>
          </ScrollView>

          {staff.totalPages > 1 && (
            <Pagination page={staff.page} totalPages={staff.totalPages} setPage={loadStaff} />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#F7F8FA' },
  scroll:              { padding: 12, paddingBottom: 30 },
  section:             { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  sectionHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionTitle:        { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  sectionCount:        { fontSize: 12, color: '#888' },
  toolbar:             { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, flexWrap: 'wrap' },
  searchBar:           { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA', minWidth: 140 },
  searchInput:         { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },
  typeBtn:             { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  typeBtnText:         { fontSize: 13, color: '#333' },
  typeMenu:            { marginHorizontal: 14, marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 8, overflow: 'hidden' },
  typeMenuItem:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  typeMenuItemActive:  { backgroundColor: '#FFF5F5' },
  typeMenuItemText:    { fontSize: 14, color: '#333' },
  typeMenuItemTextActive: { color: '#E63946', fontWeight: '600' },
  noRecord:            { paddingVertical: 24, alignItems: 'center' },
  noRecordText:        { fontSize: 13, color: '#999' },
  errorText:           { fontSize: 12, color: '#C0392B', paddingHorizontal: 14, paddingBottom: 8 },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:    { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:  { color: '#888' },
  memberTypeText: { fontSize: 12, color: '#2A9348', fontWeight: '600' },
  typeCell:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wSr:        { width: 38 },
  wType:      { width: 90 },
  wName:      { width: 160 },
  wBranch:    { width: 90 },
  wCard:      { width: 100 },
  wDesc:      { width: 90 },
  wDate:      { width: 100 },
  wStatus:    { width: 90 },
});

const btn = StyleSheet.create({
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  block:    { backgroundColor: '#FBEAEA' },
  unblock:  { backgroundColor: '#E6F7EC' },
  pillText: { fontSize: 11, fontWeight: '700' },
  okText:   { color: '#2A9348' },
  badText:  { color: '#C0392B' },
});

const pg = StyleSheet.create({
  bar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FAFAFA' },
  btn:        { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnDisabled:{ backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  info:       { fontSize: 13, color: '#555', paddingHorizontal: 8 },
  infoB:      { fontWeight: '700', color: '#1A1A1A' },
});

export default ViewCards;
