import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { SelectionField } from '../../../components/SelectionField';
import { SelectionModal } from '../../../components/SelectionModal';

interface GymPackageItem {
  id: number;
  branch: string;
  name: string;
  membershipType: string;
  duration: string;
  price: string;
  active: boolean;
}

const BRANCH_OPTIONS = [
  { id: '1', label: 'F 11' },
  { id: '2', label: 'G 13' },
  { id: '3', label: 'DHA' },
];

const MEMBERSHIP_TYPE_OPTIONS = [
  { id: '1', label: 'New - Membership' },
  { id: '2', label: 'Reactivation - Membership' },
  { id: '3', label: 'Vitality Studio - Membership' },
  { id: '4', label: 'Student - Membership' },
  { id: '5', label: 'Senior Citizen - Membership - (100% Off)' },
  { id: '6', label: '100% Off - Membership' },
  { id: '7', label: 'Off-Peak - Membership - (100% Off)' },
  { id: '8', label: 'Ladies only - Membership' },
  { id: '9', label: 'Ladies Only - Membership - (100% Off)' },
  { id: '10', label: 'Student - Membership - (100% Off)' },
  { id: '11', label: 'FBR TEST PACKAGE' },
  { id: '12', label: 'New - Membership - 1st Installment' },
  { id: '13', label: 'Eid Offer - 50% Off' },
  { id: '14', label: 'Golootlo Offer' },
  { id: '15', label: 'Hilong Group Corporate membership fee' },
];

const MOCK_PACKAGES: GymPackageItem[] = [
  { id: 1, branch: 'F 11', name: 'Hilong Group Annual Fee', membershipType: 'Hilong Group Corporate membership fee', duration: '365', price: '162,000', active: true },
  { id: 2, branch: 'F 11', name: 'Eid Offer 2026', membershipType: 'New - Membership', duration: '7', price: '1', active: true },
  { id: 3, branch: 'F 11', name: 'FBR TEST PACKAGE', membershipType: 'FBR TEST PACKAGE', duration: '1', price: '5', active: true },
  { id: 4, branch: 'F 11', name: 'Senior Citizen - 6 Months - New', membershipType: 'Senior Citizen - Membership - (100% Off)', duration: '180', price: '72,000', active: true },
  { id: 5, branch: 'F 11', name: 'Ladies only - Azadi Annual - 12 Months - Renew', membershipType: 'Ladies only - Membership', duration: '420', price: '120,000', active: true },
  { id: 6, branch: 'F 11', name: 'Off Peak - Azadi Annual - Renew', membershipType: 'Off-Peak - Membership - (100% Off)', duration: '420', price: '140,000', active: true },
  { id: 7, branch: 'F 11', name: 'Senior Citizen -Azadi Annual - Renew', membershipType: 'Senior Citizen - Membership - (100% Off)', duration: '420', price: '120,000', active: true },
  { id: 8, branch: 'F 11', name: 'Azadi Annual - 12 Months - Renew', membershipType: 'New - Membership', duration: '420', price: '165,000', active: true },
  { id: 9, branch: 'F 11', name: 'Senior Citizen - 6 Months - Renew', membershipType: 'New - Membership', duration: '180', price: '72,000', active: true },
  { id: 10, branch: 'F 11', name: 'Senior Citizen- 3 Months- New', membershipType: 'Senior Citizen - Membership - (100% Off)', duration: '90', price: '33,000', active: true },
];

const PAGE_SIZE = 25;

const GymPackages = () => {
  const navigation = useNavigation<any>();

  const [packages, setPackages] = useState<GymPackageItem[]>(MOCK_PACKAGES);

  const [branch, setBranch] = useState('F 11');
  const [name, setName] = useState('');
  const [membershipType, setMembershipType] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalConfig, setModalConfig] = useState<{ visible: boolean; field: 'branch' | 'membership' | null }>({ visible: false, field: null });

  const [searchActive, setSearchActive] = useState('');
  const [searchInactive, setSearchInactive] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a package name.');
      return;
    }
    if (!membershipType) {
      Alert.alert('Validation', 'Please select a membership.');
      return;
    }
    if (!duration.trim()) {
      Alert.alert('Validation', 'Please enter a duration.');
      return;
    }
    if (!price.trim()) {
      Alert.alert('Validation', 'Please enter a price.');
      return;
    }
    if (editingId) {
      setPackages(prev => prev.map(p => p.id === editingId
        ? { ...p, branch, name: name.trim(), membershipType, duration: duration.trim(), price: price.trim() }
        : p));
      setEditingId(null);
    } else {
      setPackages(prev => [...prev, {
        id: Date.now(), branch, name: name.trim(), membershipType, duration: duration.trim(), price: price.trim(), active: true,
      }]);
    }
    setName('');
    setMembershipType('');
    setDuration('');
    setPrice('');
  };

  const handleUpdate = (item: GymPackageItem) => {
    setEditingId(item.id);
    setBranch(item.branch);
    setName(item.name);
    setMembershipType(item.membershipType);
    setDuration(item.duration);
    setPrice(item.price);
  };

  const handleSetActive = (item: GymPackageItem, active: boolean) => {
    Alert.alert(
      active ? 'Activate Package' : 'Deactivate Package',
      `${active ? 'Activate' : 'Deactivate'} "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: active ? 'Activate' : 'Deactivate', style: active ? 'default' : 'destructive', onPress: () => setPackages(prev => prev.map(p => p.id === item.id ? { ...p, active } : p)) },
      ],
    );
  };

  const handleDelete = (item: GymPackageItem) => {
    Alert.alert('Delete Package', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setPackages(prev => prev.filter(p => p.id !== item.id));
          if (editingId === item.id) {
            setEditingId(null);
            setName('');
            setMembershipType('');
            setDuration('');
            setPrice('');
          }
        },
      },
    ]);
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
        title="Gym Packages"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Add / Update Gym Package ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{editingId ? 'Update Gym Package' : 'Add Gym Package'}</Text>
          </View>
          <View style={styles.form}>
            <Text style={styles.requiredNote}>! The Fields With <Text style={styles.req}>*</Text> Must Be Required Or Filled.</Text>

            <SelectionField
              label="Branch Name *"
              value={branch}
              placeholder="Select Branch"
              onPress={() => setModalConfig({ visible: true, field: 'branch' })}
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

            <SelectionField
              label="Select Membership *"
              value={membershipType}
              placeholder="Select Membership"
              onPress={() => setModalConfig({ visible: true, field: 'membership' })}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Enter Duration *<Text style={styles.hint}> (Please enter the duration in form of days)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Duration"
                placeholderTextColor="#9CA3AF"
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
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

            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>{editingId ? 'Update' : 'Add'}</Text>
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingId(null); setName(''); setMembershipType(''); setDuration(''); setPrice(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Active Gym Package ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Gym Package</Text>
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
                <Text style={[tbl.headerCell, { width: 220 }]}>Membership type</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Duration</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Price</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Actions</Text>
              </View>
              {activePageData.length === 0
                ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                : activePageData.map((p, i) => (
                  <View key={p.id} style={[tbl.dataRow, (activeStartIdx + i) % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{activeStartIdx + i + 1}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{p.branch}</Text>
                    <Text style={[tbl.cell, { width: 220 }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[tbl.cell, { width: 220 }]} numberOfLines={1}>{p.membershipType}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{`${p.duration} Days`}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{`Rs ${p.price}/-`}</Text>
                    <View style={[tbl.cell, { width: 90, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity style={[btn.pill, btn.update]} onPress={() => handleUpdate(p)}>
                        <Icon name="autorenew" size={12} color="#2A9348" />
                        <Text style={[btn.pillText, { color: '#2A9348' }]}>Update</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </ScrollView>

          {activePackages.length > PAGE_SIZE && renderPagination(activePage, activeTotalPages, setActivePage)}
        </View>

        {/* ── Inactive Gym Package ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Inactive Gym Package</Text>
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
                <Text style={[tbl.headerCell, { width: 220 }]}>Membership type</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Duration</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Price</Text>
                <Text style={[tbl.headerCell, { width: 150 }]}>Actions</Text>
              </View>
              {inactivePageData.length === 0
                ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                : inactivePageData.map((p, i) => (
                  <View key={p.id} style={[tbl.dataRow, (inactiveStartIdx + i) % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{inactiveStartIdx + i + 1}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{p.branch}</Text>
                    <Text style={[tbl.cell, { width: 220 }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[tbl.cell, { width: 220 }]} numberOfLines={1}>{p.membershipType}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{`${p.duration} Days`}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{`Rs ${p.price}/-`}</Text>
                    <View style={[tbl.cell, { width: 150, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity style={[btn.pill, btn.update]} onPress={() => handleSetActive(p, true)}>
                        <Icon name="check-circle-outline" size={12} color="#2A9348" />
                        <Text style={[btn.pillText, { color: '#2A9348' }]}>Active</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[btn.pill, btn.delete]} onPress={() => handleDelete(p)}>
                        <Icon name="trash-can-outline" size={12} color="#C0392B" />
                        <Text style={[btn.pillText, { color: '#C0392B' }]}>Delete</Text>
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
        visible={modalConfig.visible}
        title={modalConfig.field === 'branch' ? 'Select Branch' : 'Select Membership'}
        options={modalConfig.field === 'branch' ? BRANCH_OPTIONS : MEMBERSHIP_TYPE_OPTIONS}
        selectedValue={modalConfig.field === 'branch' ? branch : membershipType}
        onSelect={(val: string) => {
          if (modalConfig.field === 'branch') setBranch(val);
          else setMembershipType(val);
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
  hint:             { fontSize: 11, fontWeight: '400', color: '#9CA3AF' },
  input:            { backgroundColor: '#FAFAFA', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14, color: '#1F2937' },
  addBtn:           { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  addBtnText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
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

export default GymPackages;
