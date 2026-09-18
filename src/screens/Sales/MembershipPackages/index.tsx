// Membership Packages — CRM / Clients › Memberships (and Sales › Packages).
// Mirrors the web page: Add form, then Active and Inactive tables.
// Data: /packages/get?key=category&value=6, status 1 / 0 (HAR 2026-09-18).
// Both lists are fetched whole and searched / paged 25 at a time here.
// Add, Update and Active/Inactive use the package routes confirmed for cafe
// packages (see cafe.ts). The web's Delete was never captured, so it is left
// out rather than guessed.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { SelectionField } from '../../../components/SelectionField';
import { SelectionModal } from '../../../components/SelectionModal';
import { RootState } from '../../../redux/store';
import { getBranchesNameList } from '../../../api/employeeDashboard';
import {
  getMembershipPackages, addMembershipPackage, updateMembershipPackage,
  setMembershipPackageStatus, MembershipPackageRow,
} from '../../../api/cafe';

interface PackageItem {
  id: number;
  branchId: number;
  branch: string;
  name: string;
  price: string;
  active: boolean;
}

const toItem = (r: MembershipPackageRow, active: boolean): PackageItem => ({
  id: r.id,
  branchId: r.branch_id,
  branch: r.branches_name ?? '',
  name: r.package_name ?? '',
  price: String(r.price ?? 0),
  active,
});

const errText = (e: any, fallback: string) => {
  const msg = e?.response?.data?.message;
  return typeof msg === 'string' ? msg : msg ? Object.values(msg).flat().join(' ') : fallback;
};

const PAGE_SIZE = 25;

const MembershipPackages = () => {
  const navigation = useNavigation<any>();

  const { profile } = useSelector((state: RootState) => state.user);
  // '' (all branches) only for the no-branch super admin login.
  const viewerBranch = profile?.branchId || '';

  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<{ id: string; label: string }[]>([]);

  const [branch, setBranch] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [branchModal, setBranchModal] = useState(false);

  const [searchActive, setSearchActive] = useState('');
  const [searchInactive, setSearchInactive] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);

  const load = useCallback(async () => {
    try {
      const [active, inactive] = await Promise.all([
        getMembershipPackages(viewerBranch, 1),
        getMembershipPackages(viewerBranch, 0),
      ]);
      setPackages([...active.map(r => toItem(r, true)), ...inactive.map(r => toItem(r, false))]);
    } catch (e: any) {
      Alert.alert('Error', errText(e, 'Could not load membership packages.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewerBranch]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getBranchesNameList()
      .then(res => {
        const list = (res?.data ?? []).map((b: any) => ({ id: String(b.id), label: b.name }));
        setBranches(list);
        // Branch-bound logins default to their own branch.
        const own = list.find((b: any) => b.id === String(viewerBranch));
        if (own) setBranch(own.label);
      })
      .catch(() => {});
  }, [viewerBranch]);

  const resetForm = () => { setEditingId(null); setName(''); setPrice(''); };

  const handleAdd = async () => {
    const branchId = branches.find(b => b.label === branch)?.id;
    if (!branchId) {
      Alert.alert('Validation', 'Please select a branch.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a package name.');
      return;
    }
    if (!price.trim()) {
      Alert.alert('Validation', 'Please enter a price.');
      return;
    }
    const payload = { branch_id: Number(branchId), package_name: name.trim(), price: Number(price) || 0 };
    setSaving(true);
    try {
      if (editingId) await updateMembershipPackage(editingId, payload);
      else await addMembershipPackage(payload);
      resetForm();
      load();
    } catch (e: any) {
      Alert.alert('Error', errText(e, `Could not ${editingId ? 'update' : 'add'} the package.`));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = (item: PackageItem) => {
    setEditingId(item.id);
    setBranch(item.branch);
    setName(item.name);
    setPrice(item.price);
  };

  const handleSetActive = (item: PackageItem, active: boolean) => {
    Alert.alert(
      active ? 'Activate Package' : 'Deactivate Package',
      `${active ? 'Activate' : 'Deactivate'} "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: active ? 'Activate' : 'Deactivate',
          style: active ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await setMembershipPackageStatus(item.id, active ? 'active' : 'inactive');
              load();
            } catch (e: any) {
              Alert.alert('Error', errText(e, 'Could not change the package status.'));
            }
          },
        },
      ],
    );
  };

  const activePackages = packages.filter(p => p.active && (!searchActive.trim() || p.name.toLowerCase().includes(searchActive.trim().toLowerCase())));
  const inactivePackages = packages.filter(p => !p.active && (!searchInactive.trim() || p.name.toLowerCase().includes(searchInactive.trim().toLowerCase())));

  const activeTotalPages = Math.max(1, Math.ceil(activePackages.length / PAGE_SIZE));
  const activePageData = activePackages.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const activeStartIdx = (activePage - 1) * PAGE_SIZE;

  const inactiveTotalPages = Math.max(1, Math.ceil(inactivePackages.length / PAGE_SIZE));
  const inactivePageData = inactivePackages.slice((inactivePage - 1) * PAGE_SIZE, inactivePage * PAGE_SIZE);
  const inactiveStartIdx = (inactivePage - 1) * PAGE_SIZE;

  const renderPagination = (page: number, totalPages: number, setPage: (p: number) => void) => (
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
        title="Membership Packages"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={['#E63946']} />}
      >
        {/* ── Add / Update Membership Package ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{editingId ? 'Update Membership Package' : 'Add Membership Package'}</Text>
          </View>
          <View style={styles.form}>
            <Text style={styles.requiredNote}>! The Fields With <Text style={styles.req}>*</Text> Must Be Required Or Filled.</Text>

            <SelectionField
              label="Branch Name *"
              value={branch}
              placeholder="Select Branch"
              onPress={() => setBranchModal(true)}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Package Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Price"
                placeholderTextColor="#9CA3AF"
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
              />
            </View>

            <TouchableOpacity style={[styles.addBtn, saving && styles.addBtnBusy]} onPress={handleAdd} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.addBtnText}>{editingId ? 'Update' : 'Add'}</Text>}
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Active Membership Package ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Membership Package</Text>
            <Text style={styles.sectionCount}>{activePackages.length} record{activePackages.length !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.toolbar}>
            <View style={styles.searchBar}>
              <Icon name="magnify" size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name"
                placeholderTextColor="#aaa"
                value={searchActive}
                onChangeText={(v) => { setSearchActive(v); setActivePage(1); }}
              />
              {searchActive.length > 0 && (
                <TouchableOpacity onPress={() => setSearchActive('')}>
                  <Icon name="close-circle" size={15} color="#bbb" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 38 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Branch Name</Text>
                <Text style={[tbl.headerCell, { width: 220 }]}>Package Name</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Price</Text>
                <Text style={[tbl.headerCell, { width: 150 }]}>Actions</Text>
              </View>
              {loading
                ? <View style={styles.noRecord}><ActivityIndicator color="#E63946" /></View>
                : activePageData.length === 0
                ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                : activePageData.map((p, i) => (
                  <View key={p.id} style={[tbl.dataRow, (activeStartIdx + i) % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{activeStartIdx + i + 1}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{p.branch}</Text>
                    <Text style={[tbl.cell, { width: 220 }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{`Rs ${p.price}/-`}</Text>
                    <View style={[tbl.cell, { width: 150, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity style={[btn.pill, btn.update]} onPress={() => handleUpdate(p)}>
                        <Icon name="autorenew" size={12} color="#2A9348" />
                        <Text style={[btn.pillText, { color: '#2A9348' }]}>Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[btn.pill, btn.delete]} onPress={() => handleSetActive(p, false)}>
                        <Icon name="close-circle-outline" size={12} color="#C0392B" />
                        <Text style={[btn.pillText, { color: '#C0392B' }]}>Inactive</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </ScrollView>

          {activePackages.length > PAGE_SIZE && renderPagination(activePage, activeTotalPages, setActivePage)}
        </View>

        {/* ── Inactive Membership Package ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Inactive Membership Package</Text>
            <Text style={styles.sectionCount}>{inactivePackages.length} record{inactivePackages.length !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.toolbar}>
            <View style={styles.searchBar}>
              <Icon name="magnify" size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name"
                placeholderTextColor="#aaa"
                value={searchInactive}
                onChangeText={(v) => { setSearchInactive(v); setInactivePage(1); }}
              />
              {searchInactive.length > 0 && (
                <TouchableOpacity onPress={() => setSearchInactive('')}>
                  <Icon name="close-circle" size={15} color="#bbb" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 38 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Branch Name</Text>
                <Text style={[tbl.headerCell, { width: 220 }]}>Package Name</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Price</Text>
                <Text style={[tbl.headerCell, { width: 150 }]}>Actions</Text>
              </View>
              {loading
                ? <View style={styles.noRecord}><ActivityIndicator color="#E63946" /></View>
                : inactivePageData.length === 0
                ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                : inactivePageData.map((p, i) => (
                  <View key={p.id} style={[tbl.dataRow, (inactiveStartIdx + i) % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{inactiveStartIdx + i + 1}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{p.branch}</Text>
                    <Text style={[tbl.cell, { width: 220 }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{`Rs ${p.price}/-`}</Text>
                    <View style={[tbl.cell, { width: 150, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity style={[btn.pill, btn.update]} onPress={() => handleSetActive(p, true)}>
                        <Icon name="check-circle-outline" size={12} color="#2A9348" />
                        <Text style={[btn.pillText, { color: '#2A9348' }]}>Active</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </ScrollView>

          {inactivePackages.length > PAGE_SIZE && renderPagination(inactivePage, inactiveTotalPages, setInactivePage)}
        </View>
      </ScrollView>

      <SelectionModal
        visible={branchModal}
        title="Select Branch"
        options={branches}
        selectedValue={branch}
        onSelect={(val: string) => { setBranch(val); setBranchModal(false); }}
        onClose={() => setBranchModal(false)}
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
  addBtn:           { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  addBtnText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
  addBtnBusy:       { opacity: 0.6 },
  cancelBtn:        { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:    { color: '#E63946', fontWeight: '600', fontSize: 13 },
  toolbar:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, flexWrap: 'wrap' },
  searchBar:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA', minWidth: 140 },
  searchInput:      { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },
  noRecord:         { paddingVertical: 24, alignItems: 'center' },
  noRecordText:     { fontSize: 13, color: '#999' },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:    { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:  { color: '#888' },
});

const btn = StyleSheet.create({
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  update:   { backgroundColor: '#E6F7EC' },
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

export default MembershipPackages;
