import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getClientsList } from '../../../api/employeeDashboard';
import { addClientCafeDeposit } from '../../../api/cafe';

const SEARCH_OPTIONS = [
  { label: 'By Name',              value: 'name' },
  { label: 'By Phone',             value: 'phone' },
  { label: 'By Membership Number', value: 'uid' },
];

const AddClientsDeposit = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  // all clients loaded once on mount
  const [allClients, setAllClients]   = useState<any[]>([]);
  const [loadingAll, setLoadingAll]   = useState(true);

  // search UI
  const [searchBy, setSearchBy]         = useState(SEARCH_OPTIONS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [results, setResults]           = useState<any[]>([]);
  const [searched, setSearched]         = useState(false);

  // add deposit form
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [depName, setDepName]   = useState('');
  const [depPrice, setDepPrice] = useState('');
  const [nameErr, setNameErr]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  // load all clients by paginating — same pattern as members screen
  useEffect(() => {
    (async () => {
      try {
        let page = 1;
        let all: any[] = [];
        while (true) {
          const res = await getClientsList({ branch_id: branchId, limit: 100, page });
          const batch: any[] = res?.data?.data ?? [];
          all = [...all, ...batch];
          const totalPages: number = res?.totalPages ?? 1;
          if (page >= totalPages || batch.length === 0) break;
          page++;
        }
        setAllClients(all);
      } catch {
        setAllClients([]);
      } finally {
        setLoadingAll(false);
      }
    })();
  }, [branchId]);

  const handleSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const filtered = allClients.filter(c => {
      if (searchBy.value === 'phone') {
        return (c.phone ?? '').includes(searchQuery.trim());
      }
      if (searchBy.value === 'uid') {
        return (c.uid ?? '').toLowerCase().includes(q);
      }
      // By Name (default)
      const full = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim().toLowerCase();
      return full.includes(q);
    });

    setResults(filtered);
    setSearched(true);
    setSelectedClient(null);
  };

  const handleReset = () => {
    setSearchQuery('');
    setResults([]);
    setSearched(false);
    setSelectedClient(null);
    setDepName('');
    setDepPrice('');
    setNameErr('');
  };

  const handleAdd = async () => {
    setNameErr('');
    if (!depName.trim()) { setNameErr('Package Name is required'); return; }
    const p = parseFloat(depPrice);
    if (!p || p <= 0) { Alert.alert('Error', 'Please enter a valid price.'); return; }
    setSubmitting(true);
    try {
      await addClientCafeDeposit({
        branch_id: branchId,
        client_id: selectedClient.id,
        name: depName.trim(),
        price: p,
      });
      Alert.alert('Success', 'Deposit added successfully.', [
        { text: 'OK', onPress: handleReset },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to add deposit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Clients Deposit"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loadingAll ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E63946" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Search card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Search Clients For Deposit Cafe Balance</Text>

            <Text style={styles.sectionLabel}>Search</Text>
            <View style={styles.searchRow}>
              <TouchableOpacity style={styles.dropdown} onPress={() => setDropdownOpen(true)}>
                <Text style={styles.dropdownText}>{searchBy.label}</Text>
                <Icon name="chevron-down" size={18} color="#555" />
              </TouchableOpacity>
              <TextInput
                style={styles.queryInput}
                placeholder={`Enter ${searchBy.label.replace('By ', '')}...`}
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                <Text style={styles.searchBtnText}>Search</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Results table */}
            {searched && (
              results.length === 0 ? (
                <Text style={styles.noResult}>No clients found for "{searchQuery}".</Text>
              ) : (
                <View style={styles.tableWrap}>
                  <View style={tbl.headerRow}>
                    <Text style={[tbl.headerCell, { width: 34 }]}>No</Text>
                    <Text style={[tbl.headerCell, { width: 60 }]}>Client ID</Text>
                    <Text style={[tbl.headerCell, { flex: 1.2 }]}>Membership No.</Text>
                    <Text style={[tbl.headerCell, { flex: 1.4 }]}>Name</Text>
                    <Text style={[tbl.headerCell, { flex: 1.2 }]}>Phone</Text>
                    <Text style={[tbl.headerCell, { width: 44 }]}>Action</Text>
                  </View>
                  {results.map((c, i) => {
                    const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—';
                    return (
                      <View key={c.id} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                        <Text style={[tbl.cell, tbl.cellMuted, { width: 34 }]}>{i + 1}</Text>
                        <Text style={[tbl.cell, { width: 60 }]}>{c.id}</Text>
                        <Text style={[tbl.cell, { flex: 1.2 }]} numberOfLines={1}>{c.uid ?? '—'}</Text>
                        <Text style={[tbl.cell, tbl.cellRed, { flex: 1.4 }]} numberOfLines={1}>{name}</Text>
                        <Text style={[tbl.cell, { flex: 1.2 }]} numberOfLines={1}>{c.phone ?? '—'}</Text>
                        <TouchableOpacity
                          style={tbl.goBtn}
                          onPress={() => {
                            setSelectedClient(c);
                            setDepName('');
                            setDepPrice('');
                            setNameErr('');
                          }}
                        >
                          <Text style={tbl.goText}>Go</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )
            )}
          </View>

          {/* ── Add Deposit form ── */}
          {selectedClient && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Cafe Deposit</Text>
              <Text style={styles.hint}>! The Fields With * Must Required Or Fill.</Text>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Branch Name <Text style={styles.req}>*</Text></Text>
                  <View style={styles.branchPill}>
                    <Text style={styles.branchText}>{profile?.branchName ?? 'F 11'}</Text>
                    <Icon name="chevron-down" size={16} color="#555" />
                  </View>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Name <Text style={styles.req}>*</Text></Text>
                  <TextInput
                    style={[styles.fieldInput, nameErr ? styles.inputError : null]}
                    placeholder="Enter Name"
                    placeholderTextColor="#aaa"
                    value={depName}
                    onChangeText={t => { setDepName(t); setNameErr(''); }}
                  />
                  {nameErr ? <Text style={styles.errText}>{nameErr}</Text> : null}
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>Price <Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter Price"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={depPrice}
                  onChangeText={setDepPrice}
                />
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Search-by dropdown modal */}
      <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownOpen(false)}>
          <View style={styles.modalMenu}>
            {SEARCH_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.menuItem, searchBy.value === opt.value && styles.menuItemActive]}
                onPress={() => { setSearchBy(opt); setDropdownOpen(false); }}
              >
                <Text style={[styles.menuItemText, searchBy.value === opt.value && styles.menuItemTextActive]}>
                  {opt.label}
                </Text>
                {searchBy.value === opt.value && <Icon name="check" size={16} color="#E63946" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F7F8FA' },
  center:             { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:        { fontSize: 13, color: '#888' },
  scroll:             { padding: 14, paddingBottom: 40 },
  card:               { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  cardTitle:          { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionLabel:       { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  searchRow:          { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dropdown:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA', minWidth: 130 },
  dropdownText:       { fontSize: 13, color: '#333', flex: 1 },
  queryInput:         { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  btnRow:             { flexDirection: 'row', gap: 10 },
  searchBtn:          { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', minWidth: 90 },
  searchBtnText:      { color: '#FFF', fontWeight: '700', fontSize: 14 },
  resetBtn:           { backgroundColor: '#888', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  resetBtnText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
  noResult:           { textAlign: 'center', color: '#999', paddingVertical: 16, fontSize: 13 },
  tableWrap:          { marginTop: 14, overflow: 'hidden', borderRadius: 6 },
  hint:               { fontSize: 12, color: '#E63946', marginBottom: 12 },
  formRow:            { flexDirection: 'row', gap: 12, marginBottom: 12 },
  formField:          { flex: 1 },
  fieldLabel:         { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 5 },
  req:                { color: '#E63946' },
  branchPill:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F5F5F5' },
  branchText:         { fontSize: 13, color: '#333' },
  fieldInput:         { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  inputError:         { borderColor: '#E63946' },
  errText:            { fontSize: 11, color: '#E63946', marginTop: 3 },
  addBtn:             { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 28, alignSelf: 'flex-start' },
  addBtnText:         { color: '#FFF', fontWeight: '700', fontSize: 14 },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalMenu:          { backgroundColor: '#FFF', borderRadius: 10, width: 240, overflow: 'hidden', elevation: 8 },
  menuItem:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemActive:     { backgroundColor: '#FFF5F5' },
  menuItemText:       { fontSize: 14, color: '#333' },
  menuItemTextActive: { color: '#E63946', fontWeight: '600' },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 2 },
  dataRow:    { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 2 },
  cellMuted:  { color: '#888' },
  cellRed:    { color: '#C0392B', fontWeight: '600' },
  goBtn:      { width: 44, backgroundColor: '#1A1A1A', borderRadius: 5, paddingVertical: 5, alignItems: 'center' },
  goText:     { color: '#FFF', fontSize: 12, fontWeight: '700' },
});

export default AddClientsDeposit;
