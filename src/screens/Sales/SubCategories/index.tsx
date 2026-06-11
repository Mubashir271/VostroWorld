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

interface SubCategory {
  id: number;
  name: string;
  type: string;
  categoryName: string;
}

const BRANCH_OPTIONS = [
  { id: '1', label: 'F 11' },
  { id: '2', label: 'G 13' },
  { id: '3', label: 'DHA' },
];

const TYPE_OPTIONS = [
  { id: '1', label: 'Asset' },
  { id: '2', label: 'Cafe' },
  { id: '3', label: 'Exercise' },
  { id: '4', label: 'Expense' },
  { id: '5', label: 'Liability' },
  { id: '6', label: 'Meal' },
];

// Categories grouped by type — used to populate the "Category Name" dropdown
const CATEGORIES_BY_TYPE: Record<string, { id: string; label: string }[]> = {
  Asset: [{ id: '1', label: 'Massage Chair' }, { id: '2', label: 'Treadmill' }],
  Cafe: [{ id: '3', label: 'Air Fryer' }, { id: '4', label: 'Coffee Machine' }],
  Exercise: [{ id: '5', label: 'Cardio' }, { id: '6', label: 'Strength Training' }],
  Expense: [{ id: '7', label: 'B-17' }, { id: '8', label: 'Bank' }, { id: '9', label: 'Office Rent' }],
  Liability: [{ id: '10', label: 'Loan & Advances' }],
  Meal: [{ id: '11', label: 'Protein Shake' }, { id: '12', label: 'Diet Plan' }],
};

const MOCK_SUBCATEGORIES: SubCategory[] = [
  { id: 1, name: 'Service Charges', type: 'Expense', categoryName: 'Bank Charges' },
  { id: 2, name: 'Zero Massage Chair', type: 'Asset', categoryName: 'Massage Chair' },
  { id: 3, name: 'Advances', type: 'Liability', categoryName: 'Loan & Advances' },
  { id: 4, name: 'Treadmill - Cardio Zone', type: 'Asset', categoryName: 'Treadmill' },
  { id: 5, name: 'Espresso Beans', type: 'Cafe', categoryName: 'Coffee Machine' },
  { id: 6, name: 'Cardio Circuit', type: 'Exercise', categoryName: 'Cardio' },
  { id: 7, name: 'High Protein Shake', type: 'Meal', categoryName: 'Protein Shake' },
];

const PAGE_SIZE = 25;

const SubCategories = () => {
  const navigation = useNavigation<any>();

  const [subCategories, setSubCategories] = useState<SubCategory[]>(MOCK_SUBCATEGORIES);

  // Add Sub Category form state
  const [branch, setBranch] = useState('F 11');
  const [type, setType] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalConfig, setModalConfig] = useState<{ visible: boolean; field: 'branch' | 'type' | 'category' | null }>({ visible: false, field: null });

  // View Sub Categories filters
  const [searchName, setSearchName] = useState('');
  const [searchType, setSearchType] = useState('');
  const [typeFilterModal, setTypeFilterModal] = useState(false);
  const [page, setPage] = useState(1);

  const categoryOptions = type ? (CATEGORIES_BY_TYPE[type] ?? []) : [];

  const handleTypeSelect = (val: string) => {
    setType(val);
    setCategoryName('');
    setModalConfig({ visible: false, field: null });
  };

  const handleAdd = () => {
    if (!type) {
      Alert.alert('Validation', 'Please select a type.');
      return;
    }
    if (!categoryName) {
      Alert.alert('Validation', 'Please select a category.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a name.');
      return;
    }
    if (editingId) {
      setSubCategories(prev => prev.map(s => s.id === editingId ? { ...s, name: name.trim(), type, categoryName } : s));
      setEditingId(null);
    } else {
      setSubCategories(prev => [...prev, { id: Date.now(), name: name.trim(), type, categoryName }]);
    }
    setName('');
  };

  const handleUpdate = (sub: SubCategory) => {
    setEditingId(sub.id);
    setType(sub.type);
    setCategoryName(sub.categoryName);
    setName(sub.name);
  };

  const handleDelete = (sub: SubCategory) => {
    Alert.alert('Delete Sub Category', `Delete "${sub.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setSubCategories(prev => prev.filter(s => s.id !== sub.id));
          if (editingId === sub.id) { setEditingId(null); setName(''); }
        },
      },
    ]);
  };

  const filtered = subCategories.filter(s => {
    const matchName = !searchName.trim() || s.name.toLowerCase().includes(searchName.trim().toLowerCase());
    const matchType = !searchType || s.type === searchType;
    return matchName && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Sub-Categories"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Add / Update Sub Categories ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{editingId ? 'Update Sub Category' : 'Add Sub Category'}</Text>
          </View>
          <View style={styles.form}>
            <Text style={styles.requiredNote}>! The Fields With <Text style={styles.req}>*</Text> Must Be Required Or Filled.</Text>

            <SelectionField
              label="Branch Name *"
              value={branch}
              placeholder="Select Branch"
              onPress={() => setModalConfig({ visible: true, field: 'branch' })}
            />

            <SelectionField
              label="Select Type *"
              value={type}
              placeholder="Select Type"
              onPress={() => setModalConfig({ visible: true, field: 'type' })}
            />

            <SelectionField
              label="Category Name *"
              value={categoryName}
              placeholder={type ? 'Select Category' : 'Select a type first'}
              onPress={() => type && setModalConfig({ visible: true, field: 'category' })}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>{editingId ? 'Update' : 'Add'}</Text>
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingId(null); setName(''); setType(''); setCategoryName(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── View Sub Categories ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>View Sub Categories</Text>
            <Text style={styles.sectionCount}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.toolbar}>
            <View style={styles.searchBar}>
              <Icon name="magnify" size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name"
                placeholderTextColor="#aaa"
                value={searchName}
                onChangeText={(v) => { setSearchName(v); setPage(1); }}
              />
              {searchName.length > 0 && (
                <TouchableOpacity onPress={() => setSearchName('')}>
                  <Icon name="close-circle" size={15} color="#bbb" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.typeBtn} onPress={() => setTypeFilterModal(v => !v)}>
              <Text style={styles.typeBtnText}>{searchType || 'Select Type'}</Text>
              <Icon name={typeFilterModal ? 'chevron-up' : 'chevron-down'} size={16} color="#555" />
            </TouchableOpacity>
          </View>

          {typeFilterModal && (
            <View style={styles.typeMenu}>
              <TouchableOpacity
                style={[styles.typeMenuItem, !searchType && styles.typeMenuItemActive]}
                onPress={() => { setSearchType(''); setTypeFilterModal(false); setPage(1); }}
              >
                <Text style={[styles.typeMenuItemText, !searchType && styles.typeMenuItemTextActive]}>All</Text>
                {!searchType && <Icon name="check" size={14} color="#E63946" />}
              </TouchableOpacity>
              {TYPE_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeMenuItem, searchType === t.label && styles.typeMenuItemActive]}
                  onPress={() => { setSearchType(t.label); setTypeFilterModal(false); setPage(1); }}
                >
                  <Text style={[styles.typeMenuItemText, searchType === t.label && styles.typeMenuItemTextActive]}>{t.label}</Text>
                  {searchType === t.label && <Icon name="check" size={14} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 38 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 160 }]}>Name</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Type</Text>
                <Text style={[tbl.headerCell, { width: 140 }]}>Category Name</Text>
                <Text style={[tbl.headerCell, { width: 140 }]}>Actions</Text>
              </View>
              {pageData.length === 0
                ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                : pageData.map((s, i) => (
                  <View key={s.id} style={[tbl.dataRow, (startIdx + i) % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{startIdx + i + 1}</Text>
                    <Text style={[tbl.cell, { width: 160 }]} numberOfLines={1}>{s.name}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{s.type}</Text>
                    <Text style={[tbl.cell, { width: 140 }]} numberOfLines={1}>{s.categoryName}</Text>
                    <View style={[tbl.cell, { width: 140, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity style={[btn.pill, btn.update]} onPress={() => handleUpdate(s)}>
                        <Icon name="autorenew" size={12} color="#2A9348" />
                        <Text style={[btn.pillText, { color: '#2A9348' }]}>Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[btn.pill, btn.delete]} onPress={() => handleDelete(s)}>
                        <Icon name="trash-can-outline" size={12} color="#C0392B" />
                        <Text style={[btn.pillText, { color: '#C0392B' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </ScrollView>

          {filtered.length > PAGE_SIZE && (
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
          )}
        </View>
      </ScrollView>

      <SelectionModal
        visible={modalConfig.visible}
        title={modalConfig.field === 'branch' ? 'Select Branch' : modalConfig.field === 'type' ? 'Select Type' : 'Select Category'}
        options={modalConfig.field === 'branch' ? BRANCH_OPTIONS : modalConfig.field === 'type' ? TYPE_OPTIONS : categoryOptions}
        selectedValue={modalConfig.field === 'branch' ? branch : modalConfig.field === 'type' ? type : categoryName}
        onSelect={(val: string) => {
          if (modalConfig.field === 'branch') setBranch(val);
          else if (modalConfig.field === 'type') handleTypeSelect(val);
          else { setCategoryName(val); setModalConfig({ visible: false, field: null }); }
        }}
        onClose={() => setModalConfig({ visible: false, field: null })}
      />
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
  form:                { padding: 14 },
  requiredNote:        { fontSize: 12, color: '#888', marginBottom: 12 },
  req:                 { color: '#E63946' },
  fieldContainer:      { marginBottom: 16 },
  label:               { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input:               { backgroundColor: '#FAFAFA', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14, color: '#1F2937' },
  addBtn:              { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  addBtnText:          { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cancelBtn:           { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:       { color: '#E63946', fontWeight: '600', fontSize: 13 },
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

export default SubCategories;
