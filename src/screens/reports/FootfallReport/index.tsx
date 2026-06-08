import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getFootfallReport } from '../../../api/reports';

const fmt = (d: Date) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const startOfMonth = () => { const d = new Date(); d.setDate(1); return fmt(d); };

const QUICK = [
  { label: 'Today',     start: today,           end: today },
  { label: 'Yesterday', start: () => daysAgo(1), end: () => daysAgo(1) },
  { label: 'This Month', start: startOfMonth,   end: today },
  { label: 'Last 30',   start: () => daysAgo(30), end: today },
  { label: 'Last 90',   start: () => daysAgo(90), end: today },
];

const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: any; color: string }) => (
  <View style={[s.statCard, { borderTopColor: color }]}>
    <Icon name={icon} size={24} color={color} style={{ marginBottom: 6 }} />
    <Text style={[s.statValue, { color }]}>{value ?? '—'}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const FootfallReportScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getFootfallReport({ branch_id: branchId, start_date: startDate, end_date: endDate });
      setData(res.data?.data ?? res.data ?? null);
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

  // Normalise footfall summary
  const total   = data?.total ?? data?.total_count ?? data?.count ?? (Array.isArray(data) ? data.length : null);
  const male    = data?.male   ?? data?.male_count ?? data?.males;
  const female  = data?.female ?? data?.female_count ?? data?.females;
  const peak    = data?.peak   ?? data?.peak_hour ?? data?.peak_time;
  const avg     = data?.avg    ?? data?.average   ?? data?.daily_avg;

  // If data is an array of date rows
  const rows: any[] = Array.isArray(data) ? data : data?.rows ?? data?.data ?? [];

  return (
    <>
      <AppHeader
        title="Footfall Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
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

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

        {!loading && !fetched && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🚶</Text>
            <Text style={s.emptyTitle}>Footfall Report</Text>
            <Text style={s.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {!loading && fetched && !data && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🚶</Text>
            <Text style={s.emptyTitle}>No Data</Text>
            <Text style={s.emptySubtitle}>No footfall data for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && data && (
          <>
            {/* Summary stat cards */}
            <View style={s.statsGrid}>
              <StatCard icon="account-group" label="Total Footfall" value={total} color="#2563EB" />
              <StatCard icon="gender-male" label="Male" value={male} color="#0891B2" />
              <StatCard icon="gender-female" label="Female" value={female} color="#DB2777" />
              {avg != null && <StatCard icon="chart-line" label="Daily Avg" value={typeof avg === 'number' ? avg.toFixed(1) : avg} color="#7C3AED" />}
              {peak != null && <StatCard icon="clock-fast" label="Peak Time" value={peak} color="#D97706" />}
            </View>

            {/* Date breakdown if data is array of rows */}
            {rows.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Daily Breakdown</Text>
                {rows.map((row, i) => (
                  <View key={i} style={s.dayCard}>
                    <View style={s.dayHeader}>
                      <Text style={s.dayDate}>{row.date ?? row.day ?? `Day ${i + 1}`}</Text>
                      <Text style={s.dayTotal}>{row.total ?? row.count ?? row.footfall ?? '—'} visitors</Text>
                    </View>
                    <View style={s.dayStats}>
                      {row.male   != null && <Text style={s.dayStat}>♂ Male: {row.male}</Text>}
                      {row.female != null && <Text style={s.dayStat}>♀ Female: {row.female}</Text>}
                      {row.peak   != null && <Text style={s.dayStat}>⏰ Peak: {row.peak}</Text>}
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Raw JSON display for unknown shapes */}
            {rows.length === 0 && total == null && (
              <View style={s.rawCard}>
                <Text style={s.rawTitle}>Report Data</Text>
                {Object.entries(data).map(([k, v]) => (
                  <View key={k} style={s.rawRow}>
                    <Text style={s.rawKey}>{k.replace(/_/g, ' ')}</Text>
                    <Text style={s.rawVal}>{String(v)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

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
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  emptyState:   { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard:     { width: '47%', backgroundColor: '#FFF', borderRadius: 12, padding: 14, alignItems: 'center', borderTopWidth: 3, elevation: 1 },
  statValue:    { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel:    { fontSize: 11, color: '#999', textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  dayCard:      { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1 },
  dayHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dayDate:      { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  dayTotal:     { fontSize: 14, fontWeight: '800', color: '#2563EB' },
  dayStats:     { flexDirection: 'row', gap: 16 },
  dayStat:      { fontSize: 12, color: '#666' },
  rawCard:      { backgroundColor: '#FFF', borderRadius: 10, padding: 14, elevation: 1 },
  rawTitle:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  rawRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rawKey:       { fontSize: 13, color: '#666', textTransform: 'capitalize' },
  rawVal:       { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
});

export default FootfallReportScreen;
