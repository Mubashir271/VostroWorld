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
import { getStaffAttendanceReport } from '../../../api/reports';

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
];

const StaffAttendanceReportScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getStaffAttendanceReport({ branch_id: branchId, start_date: startDate, end_date: endDate });
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

  const present = rows.filter(r => r.status === 'present' || r.status === 1 || r.attendance_status === 'present').length;
  const absent  = rows.filter(r => r.status === 'absent'  || r.status === 0 || r.attendance_status === 'absent').length;
  const late    = rows.filter(r => r.status === 'late' || r.attendance_status === 'late').length;

  const renderRow = ({ item, index }: { item: any; index: number }) => {
    const isPresent = item.status === 'present' || item.status === 1 || item.attendance_status === 'present';
    const isLate    = item.status === 'late' || item.attendance_status === 'late';
    return (
      <View style={[tbl.row, index % 2 === 1 && tbl.rowAlt]}>
        <Text style={[tbl.cell, tbl.muted, { width: 36 }]}>{index + 1}</Text>
        <Text style={[tbl.cell, tbl.red, { width: 140 }]} numberOfLines={1}>
          {item.staff_name ?? item.employee_name ?? item.name ?? item.full_name ?? '—'}
        </Text>
        <Text style={[tbl.cell, { width: 80 }]}>
          {item.date ?? item.attendance_date ?? item.check_in_date ?? '—'}
        </Text>
        <Text style={[tbl.cell, { width: 80 }]}>
          {item.check_in ?? item.time_in ?? item.start_time ?? '—'}
        </Text>
        <Text style={[tbl.cell, { width: 80 }]}>
          {item.check_out ?? item.time_out ?? item.end_time ?? '—'}
        </Text>
        <View style={[tbl.cell, { width: 70 }]}>
          <View style={[tbl.badge, { backgroundColor: isPresent ? '#dcfce7' : isLate ? '#fef9c3' : '#fee2e2' }]}>
            <Text style={[tbl.badgeText, { color: isPresent ? '#166534' : isLate ? '#854d0e' : '#991b1b' }]}>
              {isPresent ? 'Present' : isLate ? 'Late' : 'Absent'}
            </Text>
          </View>
        </View>
        <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>
          {item.department ?? item.dept ?? '—'}
        </Text>
      </View>
    );
  };

  return (
    <>
      <AppHeader
        title="Staff Attendance Report"
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
            <Text style={s.emptyIcon}>🗓️</Text>
            <Text style={s.emptyTitle}>Staff Attendance Report</Text>
            <Text style={s.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

        {!loading && fetched && rows.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🗓️</Text>
            <Text style={s.emptyTitle}>No Records</Text>
            <Text style={s.emptySubtitle}>No attendance records for the selected period.</Text>
          </View>
        )}

        {!loading && fetched && rows.length > 0 && (
          <>
            <View style={s.statsRow}>
              <View style={[s.statCard, { borderColor: '#16A34A' }]}>
                <Text style={[s.statVal, { color: '#16A34A' }]}>{present}</Text>
                <Text style={s.statLabel}>Present</Text>
              </View>
              <View style={[s.statCard, { borderColor: '#E63946' }]}>
                <Text style={[s.statVal, { color: '#E63946' }]}>{absent}</Text>
                <Text style={s.statLabel}>Absent</Text>
              </View>
              <View style={[s.statCard, { borderColor: '#D97706' }]}>
                <Text style={[s.statVal, { color: '#D97706' }]}>{late}</Text>
                <Text style={s.statLabel}>Late</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statVal}>{rows.length}</Text>
                <Text style={s.statLabel}>Total</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
                <View style={tbl.header}>
                  {[{ l: '#', w: 36 }, { l: 'Staff Name', w: 140 }, { l: 'Date', w: 80 }, { l: 'In', w: 80 }, { l: 'Out', w: 80 }, { l: 'Status', w: 70 }, { l: 'Dept', w: 90 }].map(h => (
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
  statsRow:     { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statCard:     { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', elevation: 1 },
  statVal:      { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
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
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText:  { fontSize: 10, fontWeight: '700' },
});

export default StaffAttendanceReportScreen;
