import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCashInHand } from '../../../api/employeeDashboard';

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const fmtRs = (val: any) => `Rs ${(parseFloat(val ?? 0) || 0).toLocaleString()}/-`;
const today = () => fmt(new Date());

const FIELDS: { label: string; keys: string[] }[] = [
  { label: 'Opening Cash Balance', keys: ['opening_balance'] },
  { label: 'Sale Counter Amount', keys: ['sale_counter'] },
  { label: 'Cafe Amount', keys: ['cafe'] },
  { label: 'Bank Amount', keys: ['bank'] },
  { label: 'Other Amount', keys: ['other'] },
  { label: 'Expense Amount', keys: ['expense'] },
  { label: 'Charity Amount', keys: ['charity'] },
  { label: 'GST Amount', keys: ['gst'] },
  { label: 'Total Amount', keys: ['total_cash'] },
  { label: 'Cash In Hand', keys: ['cash_in_hand'] },
  { label: 'Cash In Bank', keys: ['cash_in_bank'] },
  { label: 'Charity Balance', keys: ['charity_balance'] },
];

const getField = (item: any, keys: string[]) => {
  for (const k of keys) {
    if (item?.[k] !== undefined && item?.[k] !== null) return item[k];
  }
  return 0;
};

const ViewCashInHand = () => {
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
      const res = await getCashInHand({ branch_id: branchId, from_date: startDate, to_date: endDate });
      setRows(res?.data ?? []);
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

  const totals = FIELDS.reduce((acc, f) => {
    acc[f.label] = rows.reduce((s, r) => s + (parseFloat(getField(r, f.keys)) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIndex}>#{index + 1}</Text>
        <Text style={styles.cardDate}>{(item.date ?? item.created_at ?? '—').toString().split('T')[0]}</Text>
      </View>
      <View style={styles.grid}>
        {FIELDS.map(f => (
          <View key={f.label} style={styles.gridItem}>
            <Text style={styles.gridLabel}>{f.label}</Text>
            <Text style={styles.gridValue}>{fmtRs(getField(item, f.keys))}</Text>
          </View>
        ))}
      </View>
      {item.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Cash In Hand"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
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
            <Icon name="cash-multiple" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>Cash In Hand Records</Text>
            <Text style={styles.emptyText}>Select a date range and tap Go.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 40 }} />}

        {!loading && fetched && rows.length === 0 && (
          <View style={styles.empty}>
            <Icon name="cash-remove" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Record Found</Text>
            <Text style={styles.emptyText}>No cash in hand records for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && rows.length > 0 && (
          <FlatList
            data={rows}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderRow}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <View style={styles.totalsCard}>
                <Text style={styles.totalsTitle}>Total</Text>
                <View style={styles.grid}>
                  {FIELDS.map(f => (
                    <View key={f.label} style={styles.gridItem}>
                      <Text style={styles.gridLabel}>{f.label}</Text>
                      <Text style={styles.totalsValue}>{fmtRs(totals[f.label])}</Text>
                    </View>
                  ))}
                </View>
              </View>
            }
          />
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
  sectionLabel:{ fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dateBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:         { fontSize: 14, color: '#999' },
  goBtn:       { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  goText:      { color: '#FFF', fontWeight: '700', fontSize: 15 },
  card:        { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  cardIndex:   { fontSize: 12, color: '#999', fontWeight: '600' },
  cardDate:    { fontSize: 14, color: '#C0392B', fontWeight: '700' },
  cardDesc:    { fontSize: 12, color: '#888', marginTop: 8, fontStyle: 'italic' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem:    { width: '50%', paddingVertical: 5, paddingRight: 6 },
  gridLabel:   { fontSize: 11, color: '#999', marginBottom: 2 },
  gridValue:   { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  totalsCard:  { backgroundColor: '#FFF3F3', borderRadius: 10, padding: 12, marginTop: 4, borderWidth: 1, borderColor: '#F5D5D5' },
  totalsTitle: { fontSize: 14, fontWeight: '700', color: '#C0392B', marginBottom: 6 },
  totalsValue: { fontSize: 13, color: '#C0392B', fontWeight: '700' },
  empty:       { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:   { fontSize: 13, color: '#999' },
});

export default ViewCashInHand;
