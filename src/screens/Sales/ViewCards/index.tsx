import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

interface MemberCard {
  id: number;
  memberType: 'Client' | 'Staff' | 'Visitor';
  name: string;
  cardNumber: string;
  description: string;
  assigningDate: string;
  blocked: boolean;
}

const MOCK_MEMBER_CARDS: MemberCard[] = [
  { id: 1, memberType: 'Client', name: 'Muhammad Umer Farooq', cardNumber: '8505340', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 2, memberType: 'Client', name: 'Hammad Shabbir', cardNumber: '12530849', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 3, memberType: 'Client', name: 'Hassan Zulfiqar', cardNumber: '7576982', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 4, memberType: 'Client', name: 'Muddasser Mahmood 6158', cardNumber: '8388392', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 5, memberType: 'Client', name: 'Syed Ijlal Shah', cardNumber: '8510795', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 6, memberType: 'Client', name: 'Armaghan Zafar Abbasi 2988', cardNumber: '12517218', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 7, memberType: 'Client', name: 'Ayesha Shuja', cardNumber: '13182544', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 8, memberType: 'Client', name: 'Abdullah Shah 845', cardNumber: '8441976', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
];

interface StaffCard {
  id: number;
  name: string;
  cardNumber: string;
  description: string;
  assigningDate: string;
  blocked: boolean;
}

const MOCK_STAFF_CARDS: StaffCard[] = [
  { id: 1, name: 'Awais Khalil', cardNumber: '8458208', description: 'N/A', assigningDate: '12-07-2023', blocked: true },
  { id: 2, name: '—', cardNumber: '8484736', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 3, name: 'Shanza Israr', cardNumber: '8470707', description: 'N/A', assigningDate: '12-07-2023', blocked: true },
  { id: 4, name: 'Zeeshan Ahmed', cardNumber: '8125064', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 5, name: 'Awais Shahzad', cardNumber: '8453387', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 6, name: 'Junaid Akhtar', cardNumber: '12171852', description: 'N/A', assigningDate: '12-07-2023', blocked: true },
  { id: 7, name: 'Aale Muhammad Shabbir', cardNumber: '8701682', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 8, name: 'Maria Asif', cardNumber: '10944854', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
  { id: 9, name: 'Abdur Rehman', cardNumber: '12175704', description: 'N/A', assigningDate: '12-07-2023', blocked: false },
];

const MEMBER_TYPES = ['Client', 'Staff', 'Visitor'];
const PAGE_SIZE = 25;

const ViewCards = () => {
  const navigation = useNavigation<any>();

  const [memberCards, setMemberCards] = useState<MemberCard[]>(MOCK_MEMBER_CARDS);
  const [staffCards, setStaffCards] = useState<StaffCard[]>(MOCK_STAFF_CARDS);

  const [memberType, setMemberType] = useState('Client');
  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [memberPage, setMemberPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);

  const filteredMemberCards = memberCards.filter(c => {
    const matchType = c.memberType === memberType;
    if (!cardSearch.trim()) return matchType;
    return matchType && c.cardNumber.includes(cardSearch.trim());
  });

  const filteredStaffCards = staffCards.filter(c =>
    !staffSearch.trim() || c.cardNumber.includes(staffSearch.trim()),
  );

  const toggleMemberBlock = (id: number) => {
    setMemberCards(prev => prev.map(c => c.id === id ? { ...c, blocked: !c.blocked } : c));
  };

  const deleteMemberCard = (id: number, name: string) => {
    Alert.alert('Delete Card', `Remove the card assigned to "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setMemberCards(prev => prev.filter(c => c.id !== id)) },
    ]);
  };

  const toggleStaffBlock = (id: number) => {
    setStaffCards(prev => prev.map(c => c.id === id ? { ...c, blocked: !c.blocked } : c));
  };

  const deleteStaffCard = (id: number, name: string) => {
    Alert.alert('Delete Card', `Remove the card assigned to "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setStaffCards(prev => prev.filter(c => c.id !== id)) },
    ]);
  };

  const memberTotalPages = Math.max(1, Math.ceil(filteredMemberCards.length / PAGE_SIZE));
  const memberPageData = filteredMemberCards.slice((memberPage - 1) * PAGE_SIZE, memberPage * PAGE_SIZE);
  const memberStartIdx = (memberPage - 1) * PAGE_SIZE;

  const staffTotalPages = Math.max(1, Math.ceil(filteredStaffCards.length / PAGE_SIZE));
  const staffPageData = filteredStaffCards.slice((staffPage - 1) * PAGE_SIZE, staffPage * PAGE_SIZE);
  const staffStartIdx = (staffPage - 1) * PAGE_SIZE;

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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Manage Cards ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Manage Cards</Text>
            <Text style={styles.sectionCount}>{filteredMemberCards.length} record{filteredMemberCards.length !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.toolbar}>
            <View style={styles.searchBar}>
              <Icon name="magnify" size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by card number"
                placeholderTextColor="#aaa"
                value={cardSearch}
                onChangeText={setCardSearch}
                keyboardType="number-pad"
              />
              {cardSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCardSearch('')}>
                  <Icon name="close-circle" size={15} color="#bbb" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.typeBtn} onPress={() => setTypeDropOpen(v => !v)}>
              <Text style={styles.typeBtnText}>{memberType}</Text>
              <Icon name={typeDropOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#555" />
            </TouchableOpacity>
          </View>

          {typeDropOpen && (
            <View style={styles.typeMenu}>
              {MEMBER_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeMenuItem, memberType === t && styles.typeMenuItemActive]}
                  onPress={() => { setMemberType(t); setTypeDropOpen(false); setMemberPage(1); }}
                >
                  <Text style={[styles.typeMenuItemText, memberType === t && styles.typeMenuItemTextActive]}>{t}</Text>
                  {memberType === t && <Icon name="check" size={14} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 38 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Member Type</Text>
                <Text style={[tbl.headerCell, { width: 170 }]}>Name</Text>
                <Text style={[tbl.headerCell, { width: 100 }]}>Card Number</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Description</Text>
                <Text style={[tbl.headerCell, { width: 100 }]}>Assigning Date</Text>
                <Text style={[tbl.headerCell, { width: 140 }]}>Action</Text>
              </View>
              {memberPageData.length === 0
                ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                : memberPageData.map((c, i) => (
                  <View key={c.id} style={[tbl.dataRow, (memberStartIdx + i) % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{memberStartIdx + i + 1}</Text>
                    <View style={[tbl.cell, { width: 90, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Icon name="account-outline" size={14} color="#2A9348" />
                      <Text style={tbl.memberTypeText}>{c.memberType}</Text>
                    </View>
                    <Text style={[tbl.cell, { width: 170 }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>{c.cardNumber}</Text>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 90 }]} numberOfLines={1}>{c.description}</Text>
                    <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>{c.assigningDate}</Text>
                    <View style={[tbl.cell, { width: 140, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity
                        style={[btn.pill, c.blocked ? btn.unblock : btn.block]}
                        onPress={() => toggleMemberBlock(c.id)}
                      >
                        <Icon name={c.blocked ? 'check-circle-outline' : 'cancel'} size={12} color={c.blocked ? '#2A9348' : '#C0392B'} />
                        <Text style={[btn.pillText, { color: c.blocked ? '#2A9348' : '#C0392B' }]}>{c.blocked ? 'Unblock' : 'Block'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[btn.pill, btn.delete]} onPress={() => deleteMemberCard(c.id, c.name)}>
                        <Icon name="trash-can-outline" size={12} color="#C0392B" />
                        <Text style={[btn.pillText, { color: '#C0392B' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </ScrollView>

          {filteredMemberCards.length > PAGE_SIZE && (
            <Pagination page={memberPage} totalPages={memberTotalPages} setPage={setMemberPage} />
          )}
        </View>

        {/* ── Staff Cards ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Staff Cards</Text>
            <Text style={styles.sectionCount}>{filteredStaffCards.length} record{filteredStaffCards.length !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.toolbar}>
            <View style={styles.searchBar}>
              <Icon name="magnify" size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by card number"
                placeholderTextColor="#aaa"
                value={staffSearch}
                onChangeText={setStaffSearch}
                keyboardType="number-pad"
              />
              {staffSearch.length > 0 && (
                <TouchableOpacity onPress={() => setStaffSearch('')}>
                  <Icon name="close-circle" size={15} color="#bbb" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 38 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 170 }]}>Name</Text>
                <Text style={[tbl.headerCell, { width: 100 }]}>Card Number</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Description</Text>
                <Text style={[tbl.headerCell, { width: 100 }]}>Assigning Date</Text>
                <Text style={[tbl.headerCell, { width: 140 }]}>Action</Text>
              </View>
              {staffPageData.length === 0
                ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                : staffPageData.map((c, i) => (
                  <View key={c.id} style={[tbl.dataRow, (staffStartIdx + i) % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{staffStartIdx + i + 1}</Text>
                    <Text style={[tbl.cell, { width: 170 }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>{c.cardNumber}</Text>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 90 }]} numberOfLines={1}>{c.description}</Text>
                    <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>{c.assigningDate}</Text>
                    <View style={[tbl.cell, { width: 140, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity
                        style={[btn.pill, c.blocked ? btn.unblock : btn.block]}
                        onPress={() => toggleStaffBlock(c.id)}
                      >
                        <Icon name={c.blocked ? 'check-circle-outline' : 'cancel'} size={12} color={c.blocked ? '#2A9348' : '#C0392B'} />
                        <Text style={[btn.pillText, { color: c.blocked ? '#2A9348' : '#C0392B' }]}>{c.blocked ? 'Unblock' : 'Block'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[btn.pill, btn.delete]} onPress={() => deleteStaffCard(c.id, c.name)}>
                        <Icon name="trash-can-outline" size={12} color="#C0392B" />
                        <Text style={[btn.pillText, { color: '#C0392B' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </ScrollView>

          {filteredStaffCards.length > PAGE_SIZE && (
            <Pagination page={staffPage} totalPages={staffTotalPages} setPage={setStaffPage} />
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
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:    { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:  { color: '#888' },
  memberTypeText: { fontSize: 12, color: '#2A9348', fontWeight: '600' },
});

const btn = StyleSheet.create({
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  block:    { backgroundColor: '#FBEAEA' },
  unblock:  { backgroundColor: '#E6F7EC' },
  delete:   { backgroundColor: '#FBEAEA' },
  pillText: { fontSize: 11, fontWeight: '700' },
});

const pg = StyleSheet.create({
  bar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FAFAFA' },
  btn:        { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnDisabled:{ backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  info:       { fontSize: 13, color: '#555', paddingHorizontal: 8 },
  infoB:      { fontWeight: '700', color: '#1A1A1A' },
});

export default ViewCards;
