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
import { getSalesByBootcamp } from '../../../api/reports';

const fmt = (d: Date) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfMonth = () => { const d = new Date(); d.setDate(1); return fmt(d); };
const fmtRs = (v: any) => `Rs ${parseFloat(v ?? 0).toLocaleString()}`;

const QUICK = [
  { label: 'Today',     start: today,           end: today },
  { label: 'This Month', start: startOfMonth,   end: today },
  { label: 'Last 30',   start: () => daysAgo(30), end: today },
  { label: 'Last 90',   start: () => daysAgo(90), end: today },
];

const SalesByBootcampScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSalesByBootcamp({ branch_id: branchId, start_date: startDate, end_date: endDate });
      const raw = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
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

  const totalNet      = rows.reduce((s, r) => s + (parseFloat(r.net_price ?? r.total_net_price ?? r.price ?? 0) || 0), 0);
  const totalDiscount = rows.reduce((s, r) => s + (parseFloat(r.discount ?? r.total_discount ?? 0) || 0), 0);

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[tbl.row, index % 2 === 1 && tbl.rowAlt]}>
      <Text style={[tbl.cell, tbl.muted, { width: 36 }]}>{index + 1}</Text>
      <Text style={[tbl.cell, tbl.red, { width: 130 }]} numberOfLines={1}>
        {item.client_name ?? item.member_name ?? item.name ?? '—'}
      </Text>
      <Text style={[tbl.cell, { width: 110 }]} numberOfLines={1}>
        {item.package_name ?? item.session_name ?? item.product ?? '—'}
      </Text>
      <Text style={[tbl.cell, { width: 80 }]}>
        {item.sale_date ?? item.session_date ?? item.date ?? item.created_at?.slice(0, 10) ?? '—'}
      </Text>
      <Text style={[tbl.cell, tbl.green, { width: 90 }]}>
        {fmtRs(item.net_price ?? item.total_net_price ?? item.price)}
      </Text>
      <Text style={[tbl.cell, { width: 80 }]}>
        {fmtRs(item.discount ?? item.total_discount)}
      </Text>
      <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>
        {item.trainer_name ?? item.trainer ?? item.sold_by ?? '—'}
      </Text>
    </View>
  );

  return (
    <>
      <AppHeader
        title="Sales By Bootcamp"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={s.container}>
        <View style={s.filterBar}>
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
        </ScrollView>

        <TouchableOpacity style={s.goBtn} onPress={load} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.goText}>Go</Text>}
        </TouchableOpacity>

        {!loading && !fetched && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🏃</Text>
            <Text style={s.emptyTitle}>Sales By Bootcamp</Text>
            <Text style={s.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

        {!loading && fetched && rows.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🏃</Text>
            <Text style={s.emptyTitle}>No Bootcamp Sales</Text>
            <Text style={s.emptySubtitle}>No bootcamp sales found for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && rows.length > 0 && (
          <>
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statVal}>{rows.length}</Text>
                <Text style={s.statLabel}>Sessions</Text>
              </View>
              <View style={[s.statCard, { borderColor: '#16A34A' }]}>
                <Text style={[s.statVal, { color: '#16A34A' }]}>{fmtRs(totalNet)}</Text>
                <Text style={s.statLabel}>Net Sales</Text>
              </View>
              <View style={[s.statCard, { borderColor: '#E63946' }]}>
                <Text style={[s.statVal, { color: '#E63946' }]}>{fmtRs(totalDiscount)}</Text>
                <Text style={s.statLabel}>Discount</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
                <View style={tbl.header}>
                  {[{ l: '#', w: 36 }, { l: 'Client', w: 130 }, { l: 'Package', w: 110 }, { l: 'Date', w: 80 }, { l: 'Net Price', w: 90 }, { l: 'Discount', w: 80 }, { l: 'Trainer', w: 90 }].map(h => (
                    <Text key={h.l} style={[tbl.headerCell, { width: h.w }]}>{h.l}</Text>
                  ))}
                </View>
                <FlatList
                  data={rows}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={renderRow}
                  showsVerticalScrollIndicator={false}
                />
                <View style={tbl.totals}>
                  <Text style={tbl.totalsText}>Total Net: <Text style={tbl.totalsVal}>{fmtRs(totalNet)}</Text></Text>
                  <Text style={tbl.totalsText}>  Discount: <Text style={tbl.totalsVal}>{fmtRs(totalDiscount)}</Text></Text>
                </View>
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
  container:    { flex: 1, backgroundColor: '#F5F7FA', padding: 12 },
  filterBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:          { fontSize: 14, color: '#999' },
  chipRow:      { height: 32, marginBottom: 8 },
  chipContent:  { alignItems: 'center', gap: 8 },
  chip:         { height: 28, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' },
  chipText:     { fontSize: 12, color: '#444', fontWeight: '500' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard:     { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', elevation: 1 },
  statVal:      { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  statLabel:    { fontSize: 10, color: '#999', marginTop: 2 },
  emptyState:   { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
});

const tbl = StyleSheet.create({
  header:     { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:        { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:     { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  muted:      { color: '#888' },
  red:        { color: '#C0392B', fontWeight: '600' },
  green:      { color: '#10b981', fontWeight: '600' },
  totals:     { flexDirection: 'row', padding: 12, backgroundColor: '#FFF3F3', borderTopWidth: 2, borderTopColor: '#C0392B' },
  totalsText: { fontSize: 12, color: '#555', fontWeight: '600' },
  totalsVal:  { color: '#C0392B', fontWeight: '700' },
});

export default SalesByBootcampScreen;
