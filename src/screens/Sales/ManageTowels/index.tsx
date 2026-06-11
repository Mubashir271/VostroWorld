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
import { DatePickerInput } from '../../../components/DatePickerInput';

interface TowelEntry {
  id: number;
  branch: string;
  name: string;
  quantity: string;
  size: string;
  date: string;
}

const BRANCH_OPTIONS = [
  { id: '1', label: 'F 11' },
  { id: '2', label: 'G 13' },
  { id: '3', label: 'DHA' },
];

const SIZE_OPTIONS = [
  { id: '1', label: 'N/A' },
  { id: '2', label: 'Small' },
  { id: '3', label: 'Medium' },
  { id: '4', label: 'Large' },
];

const formatDate = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const MOCK_TOWELS: TowelEntry[] = [
  { id: 1, branch: 'F 11', name: 'White Hand Towel', quantity: '50', size: 'Medium', date: '06/05/2026' },
  { id: 2, branch: 'F 11', name: 'Bath Towel', quantity: '20', size: 'Large', date: '06/08/2026' },
  { id: 3, branch: 'G 13', name: 'Gym Towel', quantity: '35', size: 'N/A', date: '06/10/2026' },
];

const PAGE_SIZE = 25;

const ManageTowels = () => {
  const navigation = useNavigation<any>();

  const [towels, setTowels] = useState<TowelEntry[]>(MOCK_TOWELS);

  const [branch, setBranch] = useState('F 11');
  const [name, setName] = useState('');
  const [size, setSize] = useState('N/A');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalConfig, setModalConfig] = useState<{ visible: boolean; field: 'branch' | 'size' | null }>({ visible: false, field: null });

  const [page, setPage] = useState(1);

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a name.');
      return;
    }
    if (!quantity.trim()) {
      Alert.alert('Validation', 'Please enter a quantity.');
      return;
    }
    if (editingId) {
      setTowels(prev => prev.map(t => t.id === editingId
        ? { ...t, branch, name: name.trim(), size, quantity: quantity.trim(), date: formatDate(date) }
        : t));
      setEditingId(null);
    } else {
      setTowels(prev => [...prev, {
        id: Date.now(), branch, name: name.trim(), size, quantity: quantity.trim(), date: formatDate(date),
      }]);
    }
    setName('');
    setQuantity('');
  };

  const handleUpdate = (entry: TowelEntry) => {
    setEditingId(entry.id);
    setBranch(entry.branch);
    setName(entry.name);
    setSize(entry.size);
    setQuantity(entry.quantity);
    const [mm, dd, yyyy] = entry.date.split('/').map(Number);
    setDate(new Date(yyyy, mm - 1, dd));
  };

  const handleDelete = (entry: TowelEntry) => {
    Alert.alert('Delete Entry', `Delete towel record "${entry.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setTowels(prev => prev.filter(t => t.id !== entry.id));
          if (editingId === entry.id) {
            setEditingId(null);
            setName('');
            setQuantity('');
          }
        },
      },
    ]);
  };

  const totalPages = Math.max(1, Math.ceil(towels.length / PAGE_SIZE));
  const pageData = towels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Manage Towels"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Manage Daily Towels ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{editingId ? 'Update Daily Towels' : 'Manage Daily Towels'}</Text>
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
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <SelectionField
              label="Size"
              value={size}
              placeholder="Select Size"
              onPress={() => setModalConfig({ visible: true, field: 'size' })}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={styles.input}
                placeholder="Quantity"
                placeholderTextColor="#9CA3AF"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
              />
            </View>

            <DatePickerInput
              label="Date"
              value={date}
              onChange={setDate}
            />

            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>{editingId ? 'Update' : 'Add'}</Text>
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingId(null); setName(''); setQuantity(''); setSize('N/A'); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Towels Receiving Receipt ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Towels Receiving Receipt</Text>
            <Text style={styles.sectionCount}>{towels.length} record{towels.length !== 1 ? 's' : ''}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tbl.headerRow}>
                <Text style={[tbl.headerCell, { width: 38 }]}>Sr#</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Branch Name</Text>
                <Text style={[tbl.headerCell, { width: 140 }]}>Name</Text>
                <Text style={[tbl.headerCell, { width: 80 }]}>Quantity</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Size</Text>
                <Text style={[tbl.headerCell, { width: 90 }]}>Date</Text>
                <Text style={[tbl.headerCell, { width: 140 }]}>Actions</Text>
              </View>
              {pageData.length === 0
                ? <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
                : pageData.map((t, i) => (
                  <View key={t.id} style={[tbl.dataRow, (startIdx + i) % 2 === 1 && tbl.dataRowAlt]}>
                    <Text style={[tbl.cell, tbl.cellMuted, { width: 38 }]}>{startIdx + i + 1}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{t.branch}</Text>
                    <Text style={[tbl.cell, { width: 140 }]} numberOfLines={1}>{t.name}</Text>
                    <Text style={[tbl.cell, { width: 80 }]} numberOfLines={1}>{t.quantity}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{t.size}</Text>
                    <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{t.date}</Text>
                    <View style={[tbl.cell, { width: 140, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity style={[btn.pill, btn.update]} onPress={() => handleUpdate(t)}>
                        <Icon name="autorenew" size={12} color="#2A9348" />
                        <Text style={[btn.pillText, { color: '#2A9348' }]}>Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[btn.pill, btn.delete]} onPress={() => handleDelete(t)}>
                        <Icon name="trash-can-outline" size={12} color="#C0392B" />
                        <Text style={[btn.pillText, { color: '#C0392B' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </ScrollView>

          {towels.length > PAGE_SIZE && (
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
        title={modalConfig.field === 'branch' ? 'Select Branch' : 'Select Size'}
        options={modalConfig.field === 'branch' ? BRANCH_OPTIONS : SIZE_OPTIONS}
        selectedValue={modalConfig.field === 'branch' ? branch : size}
        onSelect={(val: string) => {
          if (modalConfig.field === 'branch') setBranch(val);
          else setSize(val);
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
  addBtn:           { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addBtnText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cancelBtn:        { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:    { color: '#E63946', fontWeight: '600', fontSize: 13 },
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

export default ManageTowels;
