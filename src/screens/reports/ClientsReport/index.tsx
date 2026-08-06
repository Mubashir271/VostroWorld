import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getClientsReport } from '../../../api/reports';

const fmt = (d: Date) => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; };
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfMonth = () => { const d = new Date(); d.setDate(1); return fmt(d); };

const QUICK = [
  { label: 'Today',      start: today,             end: today },
  { label: 'This Month', start: startOfMonth,       end: today },
  { label: 'Last 30',    start: () => daysAgo(30),  end: today },
  { label: 'Last 90',    start: () => daysAgo(90),  end: today },
];
const STATUS_OPTS = ['All', 'Active', 'Inactive', 'Expired'];

const ClientsReportScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [status, setStatus]       = useState('All');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { branch_id: branchId, start_date: startDate, end_date: endDate };
      if (status !== 'All') params.status = status.toLowerCase();
      const res = await getClientsReport(params);
      const raw = res.data?.data ?? res.data?.clients ?? (Array.isArray(res.data) ? res.data : []);
      setRows(raw);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'start') { setStartDate(iso); if (iso > endDate) setEndDate(iso); }
    else setEndDate(iso);
    setPickerFor(null);
  };

  const renderRow = ({ item, index }: { item: any; index: number }) => {
    const isActive = item.status === 'active' || item.status === 1;
    return (
      <View style={[tbl.row, index % 2 === 1 && tbl.rowAlt]}>
        <Text style={[tbl.cell, tbl.muted, { width: 36 }]}>{index + 1}</Text>
        <Text style={[tbl.cell, tbl.red, { width: 140 }]} numberOfLines={1}>
          {item.client_name ?? item.full_name ?? item.name ?? '—'}
        </Text>
        <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>
          {item.phone ?? item.phone_number ?? item.mobile ?? '—'}
        </Text>
        <Text style={[tbl.cell, { width: 80 }]}>
          {item.reg_date ?? item.registration_date ?? item.created_at?.slice(0, 10) ?? '—'}
        </Text>
        <View style={[tbl.cell, { width: 70 }]}>
          <View style={[tbl.badge, { backgroundColor: isActive ? '#dcfce7' : '#fee2e2' }]}>
            <Text style={[tbl.badgeText, { color: isActive ? '#166534' : '#991b1b' }]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>
          {item.membership_type ?? item.package_name ?? item.type ?? '—'}
        </Text>
      </View>
    );
  };

  return (
    <>
      <AppHeader
        title="Clients Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={s.screen}>
        {/* Fixed filter */}
        <View style={s.filterCard}>
          <View style={s.dateRow}>
            <TouchableOpacity style={s.dateBtn} onPress={() => setPickerFor('start')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={s.dateText}>{display(startDate)}</Text>
            </TouchableOpacity>
            <Text style={s.sep}>→</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => setPickerFor('end')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={s.dateText}>{display(endDate)}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={s.chipContent}>
            {QUICK.map(q => (
              <TouchableOpacity key={q.label} style={s.chip} onPress={() => { setStartDate(q.start()); setEndDate(q.end()); }}>
                <Text style={s.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
            {STATUS_OPTS.map(sf => (
              <TouchableOpacity key={sf} style={[s.chip, status === sf && s.chipActive]} onPress={() => setStatus(sf)}>
                <Text style={[s.chipText, status === sf && s.chipTextActive]}>{sf}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.goBtn} onPress={load} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.goText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {!loading && !fetched && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyTitle}>Clients Report</Text>
            <Text style={s.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}
        {loading && <ActivityIndicator size="large" style={{ marginTop: 32 }} color="#E63946" />}
        {!loading && fetched && rows.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyTitle}>No Clients Found</Text>
            <Text style={s.emptySubtitle}>No clients match the selected filters.</Text>
          </View>
        )}

        {!loading && fetched && rows.length > 0 && (
          <>
            <View style={s.countBar}>
              <Text style={s.countText}>{rows.length} client{rows.length !== 1 ? 's' : ''}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
                <View style={tbl.header}>
                  {[{ l: '#', w: 36 }, { l: 'Client Name', w: 140 }, { l: 'Phone', w: 100 }, { l: 'Reg Date', w: 80 }, { l: 'Status', w: 70 }, { l: 'Package', w: 90 }].map(h => (
                    <Text key={h.l} style={[tbl.headerCell, { width: h.w }]}>{h.l}</Text>
                  ))}
                </View>
                <FlatList
                  data={rows}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={renderRow}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </ScrollView>
          </>
        )}
      </View>

      <DateTimePickerModal
        isVisible={pickerFor !== null}
        mode="date"
        date={new Date(pickerFor === 'start' ? startDate : endDate)}
        maximumDate={pickerFor === 'start' ? new Date(endDate) : new Date()}
        minimumDate={pickerFor === 'end' ? new Date(startDate) : undefined}
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerFor(null)}
      />
    </>
  );
};

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F5F7FA' },
  filterCard:    { backgroundColor: '#FFF', padding: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dateRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:      { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:           { fontSize: 14, color: '#999' },
  chipRow:       { height: 30, marginBottom: 8 },
  chipContent:   { alignItems: 'center', gap: 6 },
  chip:          { height: 26, backgroundColor: '#F5F5F5', borderRadius: 13, paddingHorizontal: 12, justifyContent: 'center' },
  chipActive:    { backgroundColor: '#E63946' },
  chipText:      { fontSize: 12, color: '#555', fontWeight: '500' },
  chipTextActive:{ color: '#FFF' },
  goBtn:         { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  goText:        { color: '#FFF', fontWeight: '700', fontSize: 15 },
  countBar:      { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  countText:     { fontSize: 12, color: '#666', fontWeight: '600' },
  empty:         { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyIcon:     { fontSize: 40, marginBottom: 10 },
  emptyTitle:    { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
});

const tbl = StyleSheet.create({
  header:    { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell:{ fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:       { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:    { backgroundColor: '#FBF8F8' },
  cell:      { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  muted:     { color: '#888' },
  red:       { color: '#C0392B', fontWeight: '600' },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});

export default ClientsReportScreen;
