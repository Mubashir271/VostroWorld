import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, ScrollView, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCafeDeposits, addCafeDeposit, updateCafeDeposit, toggleCafeDepositStatus } from '../../../api/cafe';

const fmtRs = (val: any) => `Rs ${parseFloat(val ?? 0).toLocaleString()}/-`;

interface Deposit { id: number; branch_name: string; name: string; price: number; status: string; }

const CafeDeposits = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [active, setActive]       = useState<Deposit[]>([]);
  const [inactive, setInactive]   = useState<Deposit[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');

  // Add form
  const [name, setName]           = useState('');
  const [price, setPrice]         = useState('');
  const [nameErr, setNameErr]     = useState('');
  const [adding, setAdding]       = useState(false);

  // Edit modal
  const [editItem, setEditItem]   = useState<Deposit | null>(null);
  const [editName, setEditName]   = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getCafeDeposits({ branch_id: branchId, limit: 200 });
      const all: Deposit[] = res.data?.data ?? res.data ?? [];
      setActive(all.filter(d => d.status !== 'inactive' && d.status !== '0'));
      setInactive(all.filter(d => d.status === 'inactive' || d.status === '0'));
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    setNameErr('');
    if (!name.trim()) { setNameErr('Package Name is required'); return; }
    const p = parseFloat(price);
    if (!p || p <= 0) { Alert.alert('Error', 'Please enter a valid price.'); return; }
    setAdding(true);
    try {
      await addCafeDeposit({ branch_id: branchId, name: name.trim(), price: p });
      setName(''); setPrice('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to add deposit.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = (item: Deposit) => {
    const next = item.status === 'inactive' || item.status === '0' ? 'active' : 'inactive';
    const label = next === 'inactive' ? 'mark as Inactive' : 'mark as Active';
    Alert.alert('Confirm', `Are you sure you want to ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes', onPress: async () => {
          try {
            await toggleCafeDepositStatus(item.id, { branch_id: branchId, status: next });
            load();
          } catch {
            Alert.alert('Error', 'Failed to update status.');
          }
        },
      },
    ]);
  };

  const openEdit = (item: Deposit) => {
    setEditItem(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editName.trim()) return;
    setSaving(true);
    try {
      await updateCafeDeposit(editItem.id, { branch_id: branchId, name: editName.trim(), price: parseFloat(editPrice) || editItem.price });
      setEditItem(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const filteredActive   = search.trim() ? active.filter(d   => d.name.toLowerCase().includes(search.toLowerCase())) : active;
  const filteredInactive = search.trim() ? inactive.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) : inactive;

  const renderRow = (item: Deposit, index: number, isActive: boolean) => (
    <View key={item.id} style={[tbl.dataRow, index % 2 === 1 && tbl.dataRowAlt]}>
      <Text style={[tbl.cell, tbl.cellMuted, { width: 36 }]}>{index + 1}</Text>
      <Text style={[tbl.cell, { flex: 1.2 }]} numberOfLines={1}>{item.branch_name ?? 'F 11'}</Text>
      <Text style={[tbl.cell, { flex: 2 }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[tbl.cell, tbl.cellGreen, { flex: 1.2 }]}>{fmtRs(item.price)}</Text>
      <View style={tbl.actions}>
        <TouchableOpacity style={tbl.updateBtn} onPress={() => openEdit(item)}>
          <Icon name="refresh" size={12} color="#10b981" />
          <Text style={tbl.updateText}>Update</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[tbl.statusBtn, { backgroundColor: isActive ? '#FFEBEE' : '#E8F5E9' }]}
          onPress={() => handleToggle(item)}
        >
          <Icon name={isActive ? 'close-circle-outline' : 'check-circle-outline'} size={12} color={isActive ? '#C62828' : '#2E7D32'} />
          <Text style={[tbl.statusText, { color: isActive ? '#C62828' : '#2E7D32' }]}>
            {isActive ? 'Inactive' : 'Active'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Cafe Deposits"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          {/* ── Add form ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Cafe Deposit</Text>
            <Text style={styles.hint}>! The Fields With * Must Required Or Fill.</Text>

            <View style={styles.formRow}>
              {/* Branch Name */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Branch Name <Text style={styles.req}>*</Text></Text>
                <View style={styles.branchPill}>
                  <Text style={styles.branchText}>{profile?.branchName ?? 'F 11'}</Text>
                  <Icon name="chevron-down" size={16} color="#555" />
                </View>
              </View>
              {/* Name */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Name <Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={[styles.input, nameErr ? styles.inputError : null]}
                  placeholder="Enter Name"
                  placeholderTextColor="#aaa"
                  value={name}
                  onChangeText={t => { setName(t); setNameErr(''); }}
                />
                {nameErr ? <Text style={styles.errText}>{nameErr}</Text> : null}
              </View>
            </View>

            <View style={styles.priceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Price <Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Price"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={adding}>
              {adding ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.addBtnText}>Add</Text>}
            </TouchableOpacity>
          </View>

          {/* ── Search by name ── */}
          <View style={styles.searchBar}>
            <Text style={styles.searchLabel}>Search By Name</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter Name"
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* ── Active Deposits ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Cafe Deposits</Text>
            <View style={tbl.headerRow}>
              <Text style={[tbl.headerCell, { width: 36 }]}>Sr#</Text>
              <Text style={[tbl.headerCell, { flex: 1.2 }]}>Branch Name</Text>
              <Text style={[tbl.headerCell, { flex: 2 }]}>Name</Text>
              <Text style={[tbl.headerCell, { flex: 1.2 }]}>Price</Text>
              <Text style={[tbl.headerCell, { width: 120 }]}>Actions</Text>
            </View>
            {filteredActive.length === 0
              ? <Text style={styles.noRecord}>No Record Found</Text>
              : filteredActive.map((item, i) => renderRow(item, i, true))}
          </View>

          {/* ── Inactive Deposits ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inactive Cafe Deposits</Text>
            <View style={tbl.headerRow}>
              <Text style={[tbl.headerCell, { width: 36 }]}>Sr#</Text>
              <Text style={[tbl.headerCell, { flex: 1.2 }]}>Branch Name</Text>
              <Text style={[tbl.headerCell, { flex: 2 }]}>Name</Text>
              <Text style={[tbl.headerCell, { flex: 1.2 }]}>Price</Text>
              <Text style={[tbl.headerCell, { width: 120 }]}>Actions</Text>
            </View>
            {filteredInactive.length === 0
              ? <Text style={styles.noRecord}>No Record Found</Text>
              : filteredInactive.map((item, i) => renderRow(item, i, false))}
          </View>
        </ScrollView>
      )}

      {/* ── Edit Modal ── */}
      <Modal visible={!!editItem} transparent animationType="slide" onRequestClose={() => setEditItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Deposit</Text>
              <TouchableOpacity onPress={() => setEditItem(null)}>
                <Icon name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholderTextColor="#aaa" />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Price</Text>
            <TextInput style={styles.input} value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" placeholderTextColor="#aaa" />
            <TouchableOpacity style={styles.addBtn} onPress={handleSaveEdit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.addBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 14, paddingBottom: 30 },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  hint:         { fontSize: 12, color: '#E63946', marginBottom: 12 },
  formRow:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  formField:    { flex: 1 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 5 },
  req:          { color: '#E63946' },
  branchPill:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F5F5F5' },
  branchText:   { fontSize: 13, color: '#333' },
  input:        { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  inputError:   { borderColor: '#E63946' },
  errText:      { fontSize: 11, color: '#E63946', marginTop: 3 },
  priceRow:     { marginBottom: 16 },
  addBtn:       { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 28, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  addBtnText:   { color: '#FFF', fontWeight: '700', fontSize: 14 },
  searchBar:    { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 14, elevation: 1 },
  searchLabel:  { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  searchInput:  { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  section:      { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 16, elevation: 1, overflow: 'hidden' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  noRecord:     { textAlign: 'center', color: '#999', paddingVertical: 20, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 6, marginBottom: 2 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 2 },
  dataRow:    { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 2 },
  cellMuted:  { color: '#888' },
  cellGreen:  { color: '#10b981', fontWeight: '600' },
  actions:    { width: 120, flexDirection: 'row', gap: 6, alignItems: 'center' },
  updateBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E8F5E9', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  updateText: { fontSize: 11, color: '#10b981', fontWeight: '600' },
  statusBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
});

export default CafeDeposits;
