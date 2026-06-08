import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCafeDepositsHistory } from '../../../api/cafe';

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const fmtRs = (val: any) => `Rs ${parseFloat(val ?? 0).toLocaleString()}/-`;
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

const QUICK = [
  { label: 'Today',    start: today,             end: today },
  { label: 'Yesterday',start: () => daysAgo(1),  end: () => daysAgo(1) },
  { label: 'Month',    start: () => { const d = new Date(); d.setDate(1); return fmt(d); }, end: today },
  { label: 'Last 30',  start: () => daysAgo(30), end: today },
];

const DepositsHistory = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCafeDepositsHistory({ branch_id: branchId, start_date: startDate, end_date: endDate, limit: 200 });
      setRows(res.data?.data ?? res.data ?? []);
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

  const total = rows.reduce((s, r) => s + (parseFloat(r.amount ?? 0) || 0), 0);

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.dataRow, index % 2 === 1 && styles.dataRowAlt]}>
      <Text style={[styles.cell, styles.cellMuted, { width: 36 }]}>{index + 1}</Text>
      <Text style={[styles.cell, styles.cellRed, { flex: 2 }]} numberOfLines={1}>
        {item.client_name ?? `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() ?? '—'}
      </Text>
      <Text style={[styles.cell, { flex: 1.2 }]} numberOfLines={1}>{item.date ?? item.created_at ?? '—'}</Text>
      <Text style={[styles.cell, styles.cellGreen, { flex: 1, textAlign: 'right' }]}>
        {fmtRs(item.amount)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Deposits History"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        {/* Quick chips — above date inputs */}
        <Text style={styles.sectionLabel}>Quick Dates</Text>
        <View style={styles.chipRow}>
          {QUICK.map(q => (
            <TouchableOpacity
              key={q.label}
              style={[styles.chip, startDate === q.start() && endDate === q.end() && styles.chipActive]}
              onPress={() => { setStartDate(q.start()); setEndDate(q.end()); }}
            >
              <Text style={[styles.chipText, startDate === q.start() && endDate === q.end() && styles.chipTextActive]}>
                {q.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date inputs */}
        <Text style={styles.sectionLabel}>Date Range</Text>
        <View style={styles.dateBar}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerFor('start')}>
            <Icon name="calendar" size={14} color="#E63946" />
            <Text style={styles.dateText}>{display(startDate)}</Text>
          </TouchableOpacity>
          <Text style={styles.sep}>→</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerFor('end')}>
            <Icon name="calendar" size={14} color="#E63946" />
            <Text style={styles.dateText}>{display(endDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Go */}
        <TouchableOpacity style={styles.goBtn} onPress={load} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.goText}>Go</Text>}
        </TouchableOpacity>

        {!loading && !fetched && (
          <View style={styles.empty}>
            <Icon name="history" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>Deposits History</Text>
            <Text style={styles.emptyText}>Select a date range and tap Go.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 40 }} />}

        {!loading && fetched && rows.length === 0 && (
          <View style={styles.empty}>
            <Icon name="history" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Records</Text>
            <Text style={styles.emptyText}>No deposits found for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && rows.length > 0 && (
          <>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: 36 }]}>Sr#</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Client</Text>
              <Text style={[styles.headerCell, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            </View>
            <FlatList
              data={rows}
              keyExtractor={(_, i) => i.toString()}
              renderItem={renderRow}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Total Deposits:</Text>
                  <Text style={styles.totalsVal}>{fmtRs(total)}</Text>
                </View>
              }
            />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F7F8FA' },
  body:        { flex: 1, padding: 14 },
  dateBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dateBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:         { fontSize: 14, color: '#999' },
  sectionLabel:   { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow:        { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip:           { flex: 1, height: 30, backgroundColor: '#F5F5F5', borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8E8E8' },
  chipActive:     { backgroundColor: '#E63946', borderColor: '#E63946' },
  chipText:       { fontSize: 12, color: '#555', fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  goBtn:       { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  goText:      { color: '#FFF', fontWeight: '700', fontSize: 15 },
  headerRow:   { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  headerCell:  { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 2 },
  dataRow:     { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dataRowAlt:  { backgroundColor: '#FBF8F8' },
  cell:        { fontSize: 13, color: '#1A1A1A', paddingHorizontal: 2, alignSelf: 'center' },
  cellMuted:   { color: '#888' },
  cellRed:     { color: '#C0392B', fontWeight: '600' },
  cellGreen:   { color: '#10b981', fontWeight: '600' },
  totalsRow:   { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#FFF3F3', borderTopWidth: 2, borderTopColor: '#C0392B' },
  totalsLabel: { fontSize: 13, color: '#555', fontWeight: '600' },
  totalsVal:   { fontSize: 14, color: '#C0392B', fontWeight: '700' },
  empty:       { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:   { fontSize: 13, color: '#999' },
});

export default DepositsHistory;
