import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import { getMealPlans } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

interface MealPlan {
  uuid: string;
  client_id: number;
  start_date: string;
  end_date: string;
  client_detail?: { client_name: string };
  branch_detail?: { name: string };
}

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const display = (s: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${m}/${d}/${y}`;
};

const today = fmt(new Date());

const ViewMealsPlan = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate]   = useState(today);
  const [endDate, setEndDate]       = useState(today);
  const [pickerFor, setPickerFor]   = useState<'start' | 'end' | null>(null);

  const [records, setRecords]     = useState<MealPlan[]>([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched]   = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getMealPlans({
        branch_id: listBranchId,
        client_name: clientName.trim() || undefined,
        limit: 100,
      });
      const data = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSearched(true);
    }
  }, [listBranchId, clientName, startDate, endDate]);

  const handleSearch = () => load();

  const handlePickerConfirm = (date: Date) => {
    if (pickerFor === 'start') setStartDate(fmt(date));
    else setEndDate(fmt(date));
    setPickerFor(null);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="View Meals Plan"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
      >
        {/* Filter card */}
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            {/* Add Meals Plan button */}
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddMealsPlan')}>
              <Icon name="plus" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>Add Meals Plan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterGrid}>
            {/* Branch */}
            <View style={styles.filterField}>
              <BranchField
                label={<>Branch Name <Text style={styles.req}>*</Text></>}
                needsPicker={needsPicker}
                branchName={branchName}
                options={branchOptions}
                loadingOptions={loadingBranches}
                onSelect={selectBranch}
                staticChevron
                labelStyle={styles.fieldLabel}
                staticStyle={styles.readonlyBox}
                staticTextStyle={styles.readonlyText}
                pickerStyle={styles.readonlyBox}
                pickerTextStyle={styles.readonlyText}
              />
            </View>

            {/* Client Name */}
            <View style={styles.filterField}>
              <Text style={styles.fieldLabel}>Client Name <Text style={styles.req}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Client Name"
                placeholderTextColor="#aaa"
                value={clientName}
                onChangeText={setClientName}
              />
            </View>

            {/* Start Date */}
            <View style={styles.filterField}>
              <Text style={styles.fieldLabel}>Start Date</Text>
              <TouchableOpacity style={styles.dateBox} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={16} color="#888" />
              </TouchableOpacity>
            </View>

            {/* End Date */}
            <View style={styles.filterField}>
              <Text style={styles.fieldLabel}>End Date</Text>
              <TouchableOpacity style={styles.dateBox} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={16} color="#888" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color="#FFF" />
              : <><Icon name="magnify" size={18} color="#FFF" /><Text style={styles.searchBtnText}>Search</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* Results table */}
        {(searched || records.length > 0) && (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableTitle}>View Meals Plans</Text>
              <Text style={styles.tableCount}>{records.length} record{records.length !== 1 ? 's' : ''}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                {/* Header row */}
                <View style={tbl.headerRow}>
                  <Text style={[tbl.headerCell, { width: 48 }]}>Sr#</Text>
                  <Text style={[tbl.headerCell, { width: 120 }]}>Branch Name</Text>
                  <Text style={[tbl.headerCell, { width: 160 }]}>Client Name</Text>
                  <Text style={[tbl.headerCell, { width: 120 }]}>Start Date</Text>
                  <Text style={[tbl.headerCell, { width: 120 }]}>End Date</Text>
                  <Text style={[tbl.headerCell, { width: 80 }]}>Actions</Text>
                </View>

                {records.length === 0 ? (
                  <View style={styles.noRecord}>
                    <Text style={styles.noRecordText}>No Record Found</Text>
                  </View>
                ) : (
                  records.map((item, i) => (
                    <View key={item.uuid ?? i} style={[tbl.dataRow, i % 2 === 1 && tbl.dataRowAlt]}>
                      <Text style={[tbl.cell, { width: 48 }]}>{i + 1}</Text>
                      <Text style={[tbl.cell, { width: 120 }]} numberOfLines={1}>{item.branch_detail?.name ?? branchName}</Text>
                      <Text style={[tbl.cell, tbl.cellRed, { width: 160 }]} numberOfLines={1}>{item.client_detail?.client_name ?? '—'}</Text>
                      <Text style={[tbl.cell, { width: 120 }]}>{display(item.start_date)}</Text>
                      <Text style={[tbl.cell, { width: 120 }]}>{display(item.end_date)}</Text>
                      <View style={[tbl.cell, { width: 80, flexDirection: 'row', gap: 8 }]}>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('MealPlanDetail', {
                            uuid: item.uuid,
                            clientName: item.client_detail?.client_name,
                          })}
                        >
                          <Icon name="eye-outline" size={18} color="#E63946" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('MealPlanDetail', {
                            uuid: item.uuid,
                            clientName: item.client_detail?.client_name,
                          })}
                        >
                          <Icon name="pencil-outline" size={18} color="#555" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Date pickers */}
      <DateTimePickerModal
        isVisible={pickerFor !== null}
        mode="date"
        date={new Date(pickerFor === 'start' ? startDate : endDate)}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerFor(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F7F8FA' },
  scroll:         { padding: 12, paddingBottom: 30 },
  filterCard:     { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  filterRow:      { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  addBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText:     { color: '#FFF', fontSize: 13, fontWeight: '700' },
  filterGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  filterField:    { flex: 1, minWidth: '45%' },
  fieldLabel:     { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  req:            { color: '#E63946' },
  readonlyBox:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F5F5F5' },
  readonlyText:   { fontSize: 14, color: '#555' },
  input:          { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  dateBox:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dateText:       { fontSize: 14, color: '#1A1A1A' },
  searchBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 12 },
  searchBtnText:  { color: '#FFF', fontSize: 15, fontWeight: '700' },
  tableCard:      { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  tableHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tableTitle:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  tableCount:     { fontSize: 12, color: '#888' },
  noRecord:       { paddingVertical: 28, alignItems: 'center', minWidth: 648 },
  noRecordText:   { fontSize: 14, color: '#999' },
});

const tbl = StyleSheet.create({
  headerRow:  { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { fontSize: 12, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:    { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 13, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellRed:    { color: '#C0392B', fontWeight: '600' },
});

export default ViewMealsPlan;
