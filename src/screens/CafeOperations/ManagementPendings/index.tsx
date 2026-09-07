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
import { getCafeManagementPendings } from '../../../api/cafe';

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
// Every money field on this endpoint arrives as a string.
const num = (val: any) => parseFloat(val ?? 0) || 0;
const fmtRs = (val: any) => `Rs ${num(val).toLocaleString()}/-`;
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

const QUICK = [
  { label: 'Today',    start: today,             end: today },
  { label: 'Month',    start: () => { const d = new Date(); d.setDate(1); return fmt(d); }, end: today },
  { label: 'Last 30',  start: () => daysAgo(30), end: today },
  { label: 'Last 365', start: () => daysAgo(365), end: today },
];

const COL_W = [36, 90, 130, 96, 90, 80, 110];
const COL_L = ['Sr#', 'Branch', 'Staff', 'Amount', 'Discount', 'GST', 'Receivable'];

const ManagementPendings = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(() => daysAgo(30));
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCafeManagementPendings({
        branch_id: branchId,
        start_date: startDate,
        end_date: endDate,
      });
      setRows(res.data?.status ? res.data.data ?? [] : []);
    } catch {
      setRows([]);
    } finally {
      setFetched(true);
      setLoading(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'start') { setStartDate(iso); if (iso > endDate) setEndDate(iso); }
    else setEndDate(iso);
    setPickerFor(null);
  };

  // Receivable is already price - discount + tax, but sum the server's own
  // net_price rather than recomputing it.
  const totalReceivable = rows.reduce((s, r) => s + num(r.net_price), 0);

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.dataRow, index % 2 === 1 && styles.dataRowAlt]}>
      <Text style={[styles.cell, styles.cellMuted, { width: COL_W[0] }]}>{index + 1}</Text>
      <Text style={[styles.cell, { width: COL_W[1] }]} numberOfLines={1}>{item.branch_name ?? '—'}</Text>
      <Text style={[styles.cell, styles.cellRed, { width: COL_W[2] }]} numberOfLines={1}>
        {item.staff_name ?? '—'}
      </Text>
      <Text style={[styles.cell, { width: COL_W[3] }]}>{fmtRs(item.price)}</Text>
      <Text style={[styles.cell, { width: COL_W[4] }]}>{fmtRs(item.discount)}</Text>
      <Text style={[styles.cell, { width: COL_W[5] }]}>{fmtRs(item.tax)}</Text>
      <Text style={[styles.cell, styles.cellGreen, { width: COL_W[6] }]}>{fmtRs(item.net_price)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Management Pendings"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        {/* Quick chips */}
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

        <TouchableOpacity style={styles.goBtn} onPress={load} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.goText}>Go</Text>}
        </TouchableOpacity>

        {!loading && rows.length > 0 && (
          <View style={styles.banner}>
            <Icon name="alert-circle-outline" size={18} color="#C0392B" />
            <Text style={styles.bannerText}>
              {rows.length} staff account{rows.length !== 1 ? 's' : ''} · Receivable: {fmtRs(totalReceivable)}
            </Text>
          </View>
        )}

        {!loading && !fetched && (
          <View style={styles.empty}>
            <Icon name="account-cash-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>Management Pendings</Text>
            <Text style={styles.emptyText}>Select a date range and tap Go.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 40 }} />}

        {!loading && fetched && rows.length === 0 && (
          <View style={styles.empty}>
            <Icon name="check-circle-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>All Clear</Text>
            <Text style={styles.emptyText}>No management pendings for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && rows.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={styles.headerRow}>
                {COL_L.map((lbl, i) => (
                  <Text key={lbl} style={[styles.headerCell, { width: COL_W[i] }]}>{lbl}</Text>
                ))}
              </View>
              <FlatList
                data={rows}
                keyExtractor={(item, i) => String(item.user_id ?? i)}
                renderItem={renderRow}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Total Receivable:</Text>
                    <Text style={styles.totalsVal}>{fmtRs(totalReceivable)}</Text>
                  </View>
                }
              />
            </View>
          </ScrollView>
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
  container:      { flex: 1, backgroundColor: '#F7F8FA' },
  body:           { flex: 1, padding: 14 },
  sectionLabel:   { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow:        { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip:           { flex: 1, height: 30, backgroundColor: '#F5F5F5', borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8E8E8' },
  chipActive:     { backgroundColor: '#E63946', borderColor: '#E63946' },
  chipText:       { fontSize: 12, color: '#555', fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  dateBar:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dateBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:       { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:            { fontSize: 14, color: '#999' },
  goBtn:          { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  goText:         { color: '#FFF', fontWeight: '700', fontSize: 15 },
  banner:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF3F3', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 10 },
  bannerText:     { fontSize: 13, color: '#C0392B', fontWeight: '600', flex: 1 },
  headerRow:      { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell:     { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  dataRow:        { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dataRowAlt:     { backgroundColor: '#FBF8F8' },
  cell:           { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted:      { color: '#888' },
  cellRed:        { color: '#C0392B', fontWeight: '600' },
  cellGreen:      { color: '#10b981', fontWeight: '600' },
  totalsRow:      { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#FFF3F3', borderTopWidth: 2, borderTopColor: '#C0392B' },
  totalsLabel:    { fontSize: 13, color: '#555', fontWeight: '600' },
  totalsVal:      { fontSize: 14, color: '#C0392B', fontWeight: '700' },
  empty:          { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:     { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:      { fontSize: 13, color: '#999' },
});

export default ManagementPendings;
