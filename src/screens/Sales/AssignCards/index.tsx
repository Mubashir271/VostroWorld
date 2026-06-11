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

interface SearchResult {
  id: number;
  clientId: string;
  membershipNo: string;
  name: string;
  branch: string;
  cardNumber: string;
}

const USER_TYPE_OPTIONS = [
  { id: '1', label: 'Clients' },
  { id: '2', label: 'Staff' },
  { id: '3', label: 'Visitors' },
];

const SEARCH_BY_OPTIONS = [
  { id: '1', label: 'Client ID' },
  { id: '2', label: 'Membership No' },
  { id: '3', label: 'Name' },
];

const MOCK_RESULTS: SearchResult[] = [
  { id: 1, clientId: 'C-1024', membershipNo: 'M-8505340', name: 'Muhammad Umer Farooq', branch: 'F 11', cardNumber: '' },
  { id: 2, clientId: 'C-1031', membershipNo: 'M-12530849', name: 'Hammad Shabbir', branch: 'G 13', cardNumber: '8505340' },
  { id: 3, clientId: 'C-1042', membershipNo: 'M-7576982', name: 'Hassan Zulfiqar', branch: 'F 11', cardNumber: '' },
];

const AssignCards = () => {
  const navigation = useNavigation<any>();

  const [userType, setUserType] = useState('');
  const [searchBy, setSearchBy] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [modalConfig, setModalConfig] = useState<{ visible: boolean; field: 'userType' | 'searchBy' | null }>({ visible: false, field: null });

  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [cardInputs, setCardInputs] = useState<Record<number, string>>({});

  const handleSearch = () => {
    if (!userType) {
      Alert.alert('Validation', 'Please select a user type.');
      return;
    }
    if (!searchBy) {
      Alert.alert('Validation', 'Please select a search field.');
      return;
    }
    if (!searchValue.trim()) {
      Alert.alert('Validation', 'Please enter a value to search.');
      return;
    }
    // Mock search — filter the mock dataset by the entered value
    const term = searchValue.trim().toLowerCase();
    const matches = MOCK_RESULTS.filter(r =>
      r.clientId.toLowerCase().includes(term) ||
      r.membershipNo.toLowerCase().includes(term) ||
      r.name.toLowerCase().includes(term),
    );
    setResults(matches);
    const inputs: Record<number, string> = {};
    matches.forEach(m => { inputs[m.id] = m.cardNumber; });
    setCardInputs(inputs);
  };

  const handleReset = () => {
    setUserType('');
    setSearchBy('');
    setSearchValue('');
    setResults(null);
    setCardInputs({});
  };

  const handleAssign = (item: SearchResult) => {
    const cardNumber = (cardInputs[item.id] || '').trim();
    if (!cardNumber) {
      Alert.alert('Validation', 'Please enter a card number.');
      return;
    }
    Alert.alert('Card Assigned', `Card ${cardNumber} assigned to ${item.name}.`);
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.label}>
                {searchBy ? `${searchBy} *` : 'Value *'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={searchBy ? `Enter ${searchBy}` : 'Select a search field first'}
                placeholderTextColor="#9CA3AF"
                value={searchValue}
                onChangeText={setSearchValue}
              />
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                <Icon name="magnify" size={16} color="#FFF" />
                <Text style={styles.searchBtnText}>Search</Text>
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
              results.map(item => (
                <View key={item.id} style={styles.resultCard}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Name</Text>
                    <Text style={styles.resultValue}>{item.name}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Client ID</Text>
                    <Text style={styles.resultValue}>{item.clientId}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Membership No</Text>
                    <Text style={styles.resultValue}>{item.membershipNo}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Branch</Text>
                    <Text style={styles.resultValue}>{item.branch}</Text>
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Card Number *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter Card Number"
                      placeholderTextColor="#9CA3AF"
                      value={cardInputs[item.id] ?? ''}
                      onChangeText={(v) => setCardInputs(prev => ({ ...prev, [item.id]: v }))}
                      keyboardType="number-pad"
                    />
                  </View>

                  <TouchableOpacity style={styles.addBtn} onPress={() => handleAssign(item)}>
                    <Text style={styles.addBtnText}>Assign Card</Text>
                  </TouchableOpacity>
                </View>
              ))
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
});

export default AssignCards;
