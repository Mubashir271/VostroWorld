import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { RootState } from '../../../redux/store';
import { getNutritionAppointments, getAppointmentConversionOptions } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const display = (s: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const staffName = (p?: { first_name?: string; last_name?: string }) =>
  p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || '—' : '—';

const today = fmt(new Date());

const NutritionAppointments = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [search, setSearch]       = useState('');
  const [conversion, setConversion] = useState('All');
  const [conversionOptions, setConversionOptions] = useState<string[]>([]);
  const [convDropOpen, setConvDropOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [records, setRecords]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched]   = useState(false);

  useEffect(() => {
    getAppointmentConversionOptions({ branch_id: branchId })
      .then(res => setConversionOptions(res.data?.data ?? []))
      .catch(() => setConversionOptions([]));
  }, [branchId]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getNutritionAppointments({
        branch_id: branchId,
        search: search.trim() || undefined,
        conversion: conversion === 'All' ? undefined : conversion,
        start_date: startDate,
        end_date: endDate,
        limit: 50,
      });
      const data = res.data?.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSearched(true);
    }
  }, [branchId, search, conversion, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const handlePickerConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'start') { setStartDate(iso); if (iso > endDate) setEndDate(iso); }
    else setEndDate(iso);
    setPickerFor(null);
  };

  const handleClear = () => {
    setSearch('');
    setConversion('All');
    setStartDate(today);
    setEndDate(today);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.clientName}>{item.client_name ?? '—'}</Text>
          <Text style={styles.cardSub}>{item.contact ?? '—'}</Text>
        </View>
        <View style={[styles.statusBadge, item.status === '1' ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusText}>{item.status === '1' ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Appointment Date</Text>
          <Text style={styles.gridValue}>{display(item.appointment_date)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Time</Text>
          <Text style={styles.gridValue}>{item.appointment_time ?? '—'}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Nutritionist</Text>
          <Text style={styles.gridValue}>{staffName(item.nutritionist)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Trainer</Text>
          <Text style={styles.gridValue}>{staffName(item.trainer)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Consultation</Text>
          <Text style={styles.gridValue}>{item.consultation || '—'}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Conversion</Text>
          <Text style={styles.gridValue}>{item.conversion || '—'}</Text>
        </View>
      </View>

      {item.client_remarks ? (
        <View style={styles.textRow}>
          <Text style={styles.gridLabel}>Remarks</Text>
          <Text style={styles.textValue}>{item.client_remarks}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Nutrition Appointments"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        {/* Filter card */}
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddNutritionAppointment')}>
              <Icon name="plus" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>Add Appointment</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <Text style={styles.fieldLabel}>Search</Text>
          <View style={styles.searchBox}>
            <Icon name="magnify" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or contact"
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Conversion dropdown */}
          <Text style={styles.fieldLabel}>Conversion</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setConvDropOpen(v => !v)}>
            <Text style={styles.dropdownText}>{conversion}</Text>
            <Icon name={convDropOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
          </TouchableOpacity>
          {convDropOpen && (
            <View style={styles.dropdownMenu}>
              {['All', ...conversionOptions].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.dropdownItem, conversion === opt && styles.dropdownItemActive]}
                  onPress={() => { setConversion(opt); setConvDropOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, conversion === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                  {conversion === opt && <Icon name="check" size={14} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Date range */}
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Start Date</Text>
              <TouchableOpacity style={styles.dateBox} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={16} color="#888" />
              </TouchableOpacity>
            </View>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>End Date</Text>
              <TouchableOpacity style={styles.dateBox} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={16} color="#888" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchBtn} onPress={() => load()} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <><Icon name="magnify" size={16} color="#FFF" /><Text style={styles.searchBtnText}>Search</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 30 }} />
        ) : searched && records.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="calendar-blank-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Appointments Found</Text>
            <Text style={styles.emptyText}>Try adjusting the filters above.</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          />
        )}
      </View>

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
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },
  filterCard:   { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  filterRow:    { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText:   { color: '#FFF', fontSize: 13, fontWeight: '700' },
  fieldLabel:   { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, marginTop: 4 },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA', marginBottom: 4 },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },
  dropdown:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dropdownText: { fontSize: 13, color: '#1A1A1A' },
  dropdownMenu: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 4, maxHeight: 220, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemActive: { backgroundColor: '#FFF5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },
  dropdownItemTextActive: { color: '#E63946', fontWeight: '700' },
  dateRow:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  dateField:    { flex: 1 },
  dateBox:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 13, color: '#1A1A1A' },
  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 12 },
  clearBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 11, backgroundColor: '#F0F0F0' },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: '#555' },
  searchBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 11 },
  searchBtnText:{ color: '#FFF', fontSize: 14, fontWeight: '700' },
  card:         { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  clientName:   { fontSize: 15, fontWeight: '700', color: '#C0392B' },
  cardSub:      { fontSize: 12, color: '#999', marginTop: 2 },
  statusBadge:  { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusActive: { backgroundColor: '#E8F5E9' },
  statusInactive: { backgroundColor: '#FBEAEA' },
  statusText:   { fontSize: 11, fontWeight: '700', color: '#333' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem:     { width: '50%', paddingVertical: 5, paddingRight: 6 },
  gridLabel:    { fontSize: 11, color: '#999', marginBottom: 2 },
  gridValue:    { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  textRow:      { marginTop: 6 },
  textValue:    { fontSize: 13, color: '#1A1A1A' },
  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:    { fontSize: 13, color: '#999' },
});

export default NutritionAppointments;
