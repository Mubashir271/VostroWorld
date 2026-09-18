// Assign Cards — CRM / Clients › Access Control — Assign Cards.
// Mirrors the web page (HAR 2026-09-18): pick a user type, search the client,
// then open a result to see the cards already on that member (/cards/get by
// member_id).
//
// Name search works like the web's autocomplete: /clients/client-name (every
// client — ~6k rows) is loaded once and matched locally as you type, because
// /clients/search-clients?name= only matches the exact full name the web's
// datalist fills in; a partial name there returns nothing. Client ID and
// Membership No still go to search-clients.
// Only the Clients path was captured; Staff and Visitors are listed but not
// searchable yet. The web's assign request itself was not in the HAR, so the
// Assign button stays disabled rather than posting a guessed write.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { SelectionField } from '../../../components/SelectionField';
import { SelectionModal } from '../../../components/SelectionModal';
import { RootState } from '../../../redux/store';
import {
  searchClients, getClientNames, ClientSearchRow, ClientSearchMode, ClientNameRow,
} from '../../../api/employeeDashboard';
import { getMemberCards, MemberCardRow } from '../../../api/cafe';

const USER_TYPE_OPTIONS = [
  { id: '1', label: 'Clients' },
  { id: '2', label: 'Staff' },
  { id: '3', label: 'Visitors' },
];

const SEARCH_BY_OPTIONS: { id: string; label: string; mode: ClientSearchMode }[] = [
  { id: '1', label: 'Name', mode: 'name' },
  { id: '2', label: 'Client ID', mode: 'id' },
  { id: '3', label: 'Membership No', mode: 'membership_no' },
];

const dmy = (v?: string) => {
  if (!v) return 'N/A';
  const [y, m, d] = v.slice(0, 10).split('-');
  return d ? `${d}-${m}-${y}` : v;
};
const MAX_SUGGESTIONS = 8;
const MAX_NAME_RESULTS = 50;

const nameRowToResult = (r: ClientNameRow): ClientSearchRow => ({
  id: r.id, branch_id: 0, uid: r.uid, first_name: r.first_name, last_name: r.last_name, email: '', phone: r.phone,
});

const fullName = (r: ClientSearchRow) => [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || '—';

const AssignCards = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  // '' (all branches) only for the no-branch super admin login.
  const branchId = profile?.branchId || '';

  const [userType, setUserType] = useState('Clients');
  const [searchBy, setSearchBy] = useState('Name');
  const [searchValue, setSearchValue] = useState('');
  const [modalConfig, setModalConfig] = useState<{ visible: boolean; field: 'userType' | 'searchBy' | null }>({ visible: false, field: null });

  const [results, setResults] = useState<ClientSearchRow[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [cards, setCards] = useState<Record<number, MemberCardRow[]>>({});
  const [loadingCards, setLoadingCards] = useState<number | null>(null);

  const [names, setNames] = useState<ClientNameRow[]>([]);
  const [loadingNames, setLoadingNames] = useState(true);
  const [showSuggest, setShowSuggest] = useState(false);

  useEffect(() => {
    getClientNames({ branch_id: branchId })
      .then(res => setNames(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setNames([]))
      .finally(() => setLoadingNames(false));
  }, [branchId]);

  const nameMatches = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (searchBy !== 'Name' || q.length < 2) return [];
    return names.filter(n =>
      `${n.first_name ?? ''} ${n.last_name ?? ''}`.toLowerCase().includes(q)
      || (n.uid ?? '').toLowerCase().includes(q)
      || (n.phone ?? '').includes(q),
    );
  }, [names, searchValue, searchBy]);

  const handleSearch = async () => {
    if (userType !== 'Clients') {
      Alert.alert('Not available yet', `${userType} search has not been captured from the web yet.`);
      return;
    }
    if (!searchValue.trim()) {
      Alert.alert('Validation', `Please enter a ${searchBy.toLowerCase()} to search.`);
      return;
    }
    setOpenId(null);
    setShowSuggest(false);
    if (searchBy === 'Name') {
      // Local match over the full name list — see the note at the top.
      setResults(nameMatches.slice(0, MAX_NAME_RESULTS).map(nameRowToResult));
      return;
    }
    const mode = SEARCH_BY_OPTIONS.find(o => o.label === searchBy)?.mode ?? 'id';
    setSearching(true);
    try {
      const r = await searchClients({ mode, value: searchValue.trim(), branch_id: branchId, status: 1, limit: 10 });
      setResults(r.rows);
    } catch (e: any) {
      if (e?.response?.status === 404) setResults([]);
      else Alert.alert('Error', e?.response?.data?.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setUserType('Clients');
    setSearchBy('Name');
    setSearchValue('');
    setResults(null);
    setOpenId(null);
    setCards({});
  };

  const toggleCards = async (item: ClientSearchRow) => {
    if (openId === item.id) { setOpenId(null); return; }
    setOpenId(item.id);
    if (cards[item.id]) return;
    setLoadingCards(item.id);
    try {
      const list = await getMemberCards(item.id, 1);
      setCards(prev => ({ ...prev, [item.id]: list }));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not load cards.');
    } finally {
      setLoadingCards(null);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Assign Cards"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Search</Text>
          </View>
          <View style={styles.form}>
            <Text style={styles.requiredNote}>! The Fields With <Text style={styles.req}>*</Text> Must Be Required Or Filled.</Text>

            <SelectionField
              label="Select User Type *"
              value={userType}
              placeholder="Select User Type"
              onPress={() => setModalConfig({ visible: true, field: 'userType' })}
            />

            <SelectionField
              label="Search By *"
              value={searchBy}
              placeholder="Select Search Field"
              onPress={() => setModalConfig({ visible: true, field: 'searchBy' })}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{`${searchBy} *`}</Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter ${searchBy}`}
                placeholderTextColor="#9CA3AF"
                value={searchValue}
                onChangeText={v => { setSearchValue(v); setShowSuggest(true); }}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchBy === 'Name' && loadingNames && (
                <Text style={styles.hint}>Loading client names…</Text>
              )}
              {showSuggest && nameMatches.length > 0 && (
                <View style={styles.suggestBox}>
                  {nameMatches.slice(0, MAX_SUGGESTIONS).map(n => (
                    <TouchableOpacity
                      key={n.id}
                      style={styles.suggestRow}
                      onPress={() => {
                        setSearchValue(`${n.first_name ?? ''} ${n.last_name ?? ''}`.trim());
                        setShowSuggest(false);
                        setOpenId(null);
                        setResults([nameRowToResult(n)]);
                      }}
                    >
                      <Text style={styles.suggestName} numberOfLines={1}>{`${n.first_name ?? ''} ${n.last_name ?? ''}`.trim()}</Text>
                      <Text style={styles.suggestMeta}>{n.uid}{n.phone ? ` · ${n.phone}` : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <><Icon name="magnify" size={16} color="#FFF" /><Text style={styles.searchBtnText}>Search</Text></>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <Icon name="refresh" size={16} color="#374151" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {results !== null && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Search Results</Text>
              <Text style={styles.sectionCount}>{results.length} record{results.length !== 1 ? 's' : ''}</Text>
            </View>

            {results.length === 0 ? (
              <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
            ) : (
              results.map((item, i) => {
                const open = openId === item.id;
                const list = cards[item.id] ?? [];
                return (
                  <View key={item.id} style={styles.resultCard}>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>No</Text>
                      <Text style={styles.resultValue}>{i + 1}</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>ID</Text>
                      <Text style={styles.resultValue}>{item.id}</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Membership Number</Text>
                      <Text style={styles.resultValue}>{item.uid || 'N/A'}</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Name</Text>
                      <Text style={styles.resultValue}>{fullName(item)}</Text>
                    </View>
                    {!!item.phone && (
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Phone</Text>
                        <Text style={styles.resultValue}>{item.phone}</Text>
                      </View>
                    )}

                    <TouchableOpacity style={styles.addBtn} onPress={() => toggleCards(item)}>
                      <Text style={styles.addBtnText}>{open ? 'Hide Cards' : 'Cards / Assign'}</Text>
                    </TouchableOpacity>

                    {open && (
                      <View style={styles.cardsBox}>
                        {loadingCards === item.id ? (
                          <ActivityIndicator color="#E63946" style={styles.cardsSpinner} />
                        ) : list.length === 0 ? (
                          <Text style={styles.noRecordText}>No card assigned yet.</Text>
                        ) : (
                          list.map(c => {
                            const active = String(c.status) === '1';
                            return (
                              <View key={c.id} style={styles.cardRow}>
                                <View style={styles.flex1}>
                                  <Text style={styles.cardNo}>{Number(c.number) ? c.number : '—'}</Text>
                                  <Text style={styles.cardMeta}>
                                    {c.branch_info?.name ?? '—'} · {dmy(c.date)}{c.description ? ` · ${c.description}` : ''}
                                  </Text>
                                </View>
                                <Text style={[styles.cardStatus, active ? styles.cardOk : styles.cardBad]}>
                                  {active ? 'Active' : 'Blocked'}
                                </Text>
                              </View>
                            );
                          })
                        )}
                        {/* <Text style={styles.hint}>
                          Assigning a new card is not connected yet — the web's assign request still needs to be captured.
                        </Text> */}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <SelectionModal
        visible={modalConfig.visible}
        title={modalConfig.field === 'userType' ? 'Select User Type' : 'Search By'}
        options={modalConfig.field === 'userType' ? USER_TYPE_OPTIONS : SEARCH_BY_OPTIONS}
        selectedValue={modalConfig.field === 'userType' ? userType : searchBy}
        onSelect={(val: string) => {
          if (modalConfig.field === 'userType') setUserType(val);
          else setSearchBy(val);
          setModalConfig({ visible: false, field: null });
        }}
        onClose={() => setModalConfig({ visible: false, field: null })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F7F8FA' },
  scroll:           { padding: 12, paddingBottom: 30 },
  section:          { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  sectionCount:     { fontSize: 12, color: '#888' },
  form:             { padding: 14 },
  requiredNote:     { fontSize: 12, color: '#888', marginBottom: 12 },
  req:              { color: '#E63946' },
  fieldContainer:   { marginBottom: 16 },
  label:            { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input:            { backgroundColor: '#FAFAFA', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14, color: '#1F2937' },
  btnRow:           { flexDirection: 'row', gap: 10 },
  searchBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 14 },
  searchBtnText:    { color: '#FFF', fontWeight: '700', fontSize: 14 },
  resetBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F0F0F0', borderRadius: 8, paddingVertical: 14 },
  resetBtnText:     { color: '#374151', fontWeight: '700', fontSize: 14 },
  noRecord:         { paddingVertical: 24, alignItems: 'center' },
  noRecordText:     { fontSize: 13, color: '#999' },
  resultCard:       { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  resultRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultLabel:      { fontSize: 12, color: '#888' },
  resultValue:      { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  addBtn:           { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  addBtnText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
  flex1:            { flex: 1 },
  cardsBox:         { marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0' },
  cardsSpinner:     { marginVertical: 12 },
  cardRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cardNo:           { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardMeta:         { fontSize: 11, color: '#888', marginTop: 2 },
  cardStatus:       { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  cardOk:           { backgroundColor: '#E6F7EC', color: '#2A9348' },
  cardBad:          { backgroundColor: '#FBEAEA', color: '#C0392B' },
  suggestBox:       { marginTop: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#FFF', overflow: 'hidden' },
  suggestRow:       { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggestName:      { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  suggestMeta:      { fontSize: 11, color: '#888', marginTop: 2 },
  hint:             { fontSize: 11, color: '#999', marginTop: 10, fontStyle: 'italic' },
});

export default AssignCards;
