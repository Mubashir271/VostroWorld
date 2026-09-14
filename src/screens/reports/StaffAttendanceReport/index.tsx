// src/screens/reports/StaffAttendanceReport/index.tsx
//
// The web admin's HR › Manage Staff › Staff Attendance ("Staff Attendance
// Report") — see getStaffAttendanceReport in api/reports.ts for the capture
// notes. Same layout and request pattern as Reports › Clients Attendance:
// `attendance/get` for the paged Detail table and `attendance/showSummery`
// for the per-date Summary, both fired on every Go.
//
// Branch follows the login: HR / super admin (branch_id 0) query every branch,
// branch-scoped logins only their own.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import QuickDates from '../../../components/QuickDates';
import StaffNameCell from '../../../components/StaffNameCell';
import { RootState } from '../../../redux/store';
import {
  getStaffAttendanceReport, getStaffAttendanceSummary, getStaffNames,
  attendanceName, AttendanceRecord, AttendanceSummaryRow, StaffNameOption,
} from '../../../api/reports';

const PAGE_SIZE = 25;

const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const displayRowDate = (iso: string) => { const [y, m, d] = (iso ?? '').split('-'); return d ? `${d}-${m}-${y}` : '—'; };
const todayIso = () => fmt(new Date());

const GENDERS = [
  { value: '', label: 'Select Gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const timeLabel = (t: string) => {
  if (!t) return '';
  const [hh, mm, ss] = t.split(':');
  const h = Number(hh);
  return `${((h + 11) % 12) + 1}:${mm}:${ss ?? '00'} ${h < 12 ? 'AM' : 'PM'}`;
};

const staffLabel = (s: StaffNameOption) =>
  [s.first_name, s.last_name].filter(Boolean).join(' ').trim() || `#${s.id}`;

const StaffAttendanceReportScreen = () => {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [mode, setMode] = useState<'summary' | 'detail'>('detail');
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [gender, setGender] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [staff, setStaff] = useState<StaffNameOption | null>(null);
  const [picker, setPicker] = useState<null | 'start' | 'end' | 'from' | 'to'>(null);
  const [genderOpen, setGenderOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameSearch, setNameSearch] = useState('');

  const [query, setQuery] = useState(() => ({
    start_date: todayIso(), end_date: todayIso(), gender: '',
    start_time: '', end_time: '', member_id: '' as number | string,
  }));
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummaryRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecord, setTotalRecord] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [staffList, setStaffList] = useState<StaffNameOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    getStaffNames(branchId).then(list => { if (!cancelled) setStaffList(list); });
    return () => { cancelled = true; };
  }, [branchId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = { branch_id: branchId, ...query };
    Promise.all([
      getStaffAttendanceReport({ ...params, limit: PAGE_SIZE, page }),
      getStaffAttendanceSummary(params),
    ])
      .then(([detail, sum]) => {
        if (cancelled) return;
        setRows(detail.rows);
        setTotalPages(Math.max(1, detail.totalPages));
        setTotalRecord(detail.total);
        setSummary(sum);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setRows([]); setSummary([]); setTotalPages(1); setTotalRecord(0);
        const status = err?.response?.status;
        setError(
          err?.code === 'ECONNABORTED'
            ? 'The request timed out. Try a shorter date range.'
            : err?.response?.data?.message || (status ? `Request failed (${status}).` : 'Could not load the attendance report.'),
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, query, page]);

  const runQuery = () => {
    setPage(1);
    setQuery({
      start_date: startDate, end_date: endDate, gender,
      start_time: startTime, end_time: endTime,
      member_id: staff?.id ?? '',
    });
  };

  const onPick = (date: Date) => {
    if (picker === 'start') {
      const v = fmt(date);
      setStartDate(v);
      if (v > endDate) setEndDate(v);
    } else if (picker === 'end') {
      setEndDate(fmt(date));
    } else {
      const p = (n: number) => String(n).padStart(2, '0');
      const t = `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
      if (picker === 'from') setStartTime(t); else setEndTime(t);
    }
    setPicker(null);
  };

  const onQuickRange = useCallback((a: string, b: string) => { setStartDate(a); setEndDate(b); }, []);

  const filteredStaff = useMemo(() => {
    const q = nameSearch.trim().toLowerCase();
    const base = q
      ? staffList.filter(x => staffLabel(x).toLowerCase().includes(q) || (x.designation ?? '').toLowerCase().includes(q))
      : staffList;
    return base.slice(0, 100);
  }, [staffList, nameSearch]);

  const summaryTotal = useMemo(
    () => summary.reduce((n, r) => n + Number(r.count ?? 0), 0),
    [summary],
  );

  const pageWindow = useMemo(() => {
    const RANGE = 8;
    let start = Math.max(1, page - Math.floor(RANGE / 2));
    const end = Math.min(totalPages, start + RANGE - 1);
    start = Math.max(1, Math.min(start, end - RANGE + 1));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const renderRow = useCallback(({ item, index }: { item: AttendanceRecord; index: number }) => (
    <View style={[tbl.row, index % 2 === 1 && tbl.rowAlt]}>
      <Text style={[tbl.cell, tbl.muted, tbl.wSr]}>{(page - 1) * PAGE_SIZE + index + 1}</Text>
      <StaffNameCell
        name={attendanceName(item)}
        staffId={item.attendee?.id ?? item.attendee_id}
        style={[tbl.cell, tbl.red, tbl.wName]}
      />
      <Text style={[tbl.cell, tbl.wDate]}>{displayRowDate(item.date)}</Text>
      <Text style={[tbl.cell, tbl.wTime]}>{item.checkin_time_12h ?? '—'}</Text>
      <Text style={[tbl.cell, tbl.wTime]}>{item.checkout_time_12h ?? '—'}</Text>
      <Text style={[tbl.cell, tbl.wCard]}>{item.card_number ?? '—'}</Text>
      <Text style={[tbl.cell, tbl.wVerified]} numberOfLines={1}>{item.verified_by ?? '—'}</Text>
    </View>
  ), [page]);

  return (
    <>
      <AppHeader
        title="Staff Attendance Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.screen} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.section}>Dates</Text>
          <View style={s.row}>
            <TouchableOpacity style={s.dateBtn} onPress={() => setPicker('start')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={s.fieldText}>{display(startDate)}</Text>
            </TouchableOpacity>
            <Text style={s.sep}>→</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => setPicker('end')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={s.fieldText}>{display(endDate)}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.section}>Quick Dates</Text>
          <QuickDates onRange={onQuickRange} disabled={loading} />

          <Text style={s.section}>Options</Text>
          <View style={s.radioRow}>
            {(['summary', 'detail'] as const).map(m => (
              <TouchableOpacity key={m} style={s.radio} onPress={() => setMode(m)}>
                <Icon
                  name={mode === m ? 'radiobox-marked' : 'radiobox-blank'}
                  size={18}
                  color={mode === m ? '#E63946' : '#999'}
                />
                <Text style={[s.radioText, mode === m && s.radioTextActive]}>
                  {m === 'summary' ? 'Summary' : 'Detail'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.label}>Staff Name</Text>
              <TouchableOpacity style={s.field} onPress={() => { setNameSearch(''); setNameOpen(true); }}>
                <Text style={[s.fieldText, !staff && s.placeholder]} numberOfLines={1}>
                  {staff ? staffLabel(staff) : 'All staff'}
                </Text>
                {staff
                  ? <Icon name="close" size={15} color="#888" onPress={() => setStaff(null)} />
                  : <Icon name="magnify" size={15} color="#888" />}
              </TouchableOpacity>
            </View>
            <View style={s.half}>
              <Text style={s.label}>Select Gender</Text>
              <TouchableOpacity style={s.field} onPress={() => setGenderOpen(true)}>
                <Text style={[s.fieldText, !gender && s.placeholder]} numberOfLines={1}>
                  {GENDERS.find(g => g.value === gender)?.label}
                </Text>
                <Icon name="chevron-down" size={16} color="#888" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.label}>From</Text>
              <TouchableOpacity style={s.field} onPress={() => setPicker('from')}>
                <Text style={[s.fieldText, !startTime && s.placeholder]}>
                  {startTime ? timeLabel(startTime) : '12:30:00 PM'}
                </Text>
                {startTime
                  ? <Icon name="close" size={15} color="#888" onPress={() => setStartTime('')} />
                  : <Icon name="clock-outline" size={15} color="#888" />}
              </TouchableOpacity>
            </View>
            <View style={s.half}>
              <Text style={s.label}>To</Text>
              <TouchableOpacity style={s.field} onPress={() => setPicker('to')}>
                <Text style={[s.fieldText, !endTime && s.placeholder]}>
                  {endTime ? timeLabel(endTime) : '12:30:00 PM'}
                </Text>
                {endTime
                  ? <Icon name="close" size={15} color="#888" onPress={() => setEndTime('')} />
                  : <Icon name="clock-outline" size={15} color="#888" />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={s.goBtn} onPress={runQuery} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.goText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="large" style={s.spinner} color="#E63946" />}

        {!loading && error && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>⚠️</Text>
            <Text style={s.emptyTitle}>Something went wrong</Text>
            <Text style={s.emptySubtitle}>{error}</Text>
          </View>
        )}

        {!loading && !error && mode === 'summary' && (
          summary.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🗓️</Text>
              <Text style={s.emptyTitle}>No Records</Text>
              <Text style={s.emptySubtitle}>No staff attendance for the selected filters.</Text>
            </View>
          ) : (
            <View style={s.card}>
              <View style={s.summaryHead}>
                <Text style={s.cardTitle}>Summary</Text>
                <Text style={s.summaryTotal}>{summaryTotal} total</Text>
              </View>
              <View style={tbl.header}>
                <Text style={[tbl.headerCell, tbl.wSummaryDate]}>Date</Text>
                <Text style={[tbl.headerCell, tbl.wSummaryCount]}>Count</Text>
              </View>
              {summary.map((r, i) => (
                <View key={r.date} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
                  <Text style={[tbl.cell, tbl.wSummaryDate]}>{displayRowDate(r.date)}</Text>
                  <Text style={[tbl.cell, tbl.bold, tbl.wSummaryCount]}>{r.count}</Text>
                </View>
              ))}
            </View>
          )
        )}

        {!loading && !error && mode === 'detail' && (
          rows.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🗓️</Text>
              <Text style={s.emptyTitle}>No Records</Text>
              <Text style={s.emptySubtitle}>No staff attendance for the selected filters.</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={tbl.header}>
                    <Text style={[tbl.headerCell, tbl.wSr]}>Sr#</Text>
                    <Text style={[tbl.headerCell, tbl.wName]}>Name</Text>
                    <Text style={[tbl.headerCell, tbl.wDate]}>Check Date</Text>
                    <Text style={[tbl.headerCell, tbl.wTime]}>Check In</Text>
                    <Text style={[tbl.headerCell, tbl.wTime]}>Check Out</Text>
                    <Text style={[tbl.headerCell, tbl.wCard]}>Card Number</Text>
                    <Text style={[tbl.headerCell, tbl.wVerified]}>Verified By</Text>
                  </View>
                  <FlatList
                    data={rows}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderRow}
                    scrollEnabled={false}
                  />
                </View>
              </ScrollView>

              {totalPages > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pg.bar}>
                  <TouchableOpacity style={[pg.textBtn, page === 1 && pg.btnDisabled]}
                    onPress={() => setPage(1)} disabled={page === 1}>
                    <Text style={[pg.textBtnLabel, page === 1 && pg.textDisabled]}>First Page</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]}
                    onPress={() => setPage(page - 1)} disabled={page === 1}>
                    <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
                  </TouchableOpacity>
                  {pageWindow.map(p => (
                    <TouchableOpacity key={p} style={[pg.btn, p === page && pg.btnActive]} onPress={() => setPage(p)}>
                      <Text style={[pg.num, p === page && pg.numActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]}
                    onPress={() => setPage(page + 1)} disabled={page === totalPages}>
                    <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[pg.textBtn, page === totalPages && pg.btnDisabled]}
                    onPress={() => setPage(totalPages)} disabled={page === totalPages}>
                    <Text style={[pg.textBtnLabel, page === totalPages && pg.textDisabled]}>Last Page</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              <Text style={s.footnote}>Page {page} of {totalPages} · {totalRecord} entries</Text>
            </>
          )
        )}
      </ScrollView>

      <Modal visible={genderOpen} transparent animationType="fade" onRequestClose={() => setGenderOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setGenderOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select Gender</Text>
            {GENDERS.map(g => (
              <TouchableOpacity key={g.value} style={s.sheetRow}
                onPress={() => { setGender(g.value); setGenderOpen(false); }}>
                <Text style={[s.sheetText, g.value === gender && s.sheetTextActive]}>{g.label}</Text>
                {g.value === gender && <Icon name="check" size={16} color="#E63946" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={nameOpen} transparent animationType="fade" onRequestClose={() => setNameOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setNameOpen(false)}>
          <TouchableOpacity style={s.nameSheet} activeOpacity={1}>
            <Text style={s.sheetTitle}>Staff Name</Text>
            <TextInput
              style={s.search}
              placeholder="Search name or designation…"
              placeholderTextColor="#B0B0B0"
              value={nameSearch}
              onChangeText={setNameSearch}
              autoCorrect={false}
            />
            <TouchableOpacity style={s.sheetRow}
              onPress={() => { setStaff(null); setNameOpen(false); }}>
              <Text style={s.sheetText}>All staff</Text>
            </TouchableOpacity>
            <FlatList
              data={filteredStaff}
              keyExtractor={x => String(x.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={s.sheetRow}
                  onPress={() => { setStaff(item); setNameOpen(false); }}>
                  <View style={s.flex1}>
                    <Text style={s.sheetText} numberOfLines={1}>{staffLabel(item)}</Text>
                    {!!item.designation && <Text style={s.sheetSub}>{item.designation}</Text>}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.sheetEmpty}>No matching staff.</Text>}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <DateTimePickerModal
        isVisible={picker !== null}
        mode={picker === 'from' || picker === 'to' ? 'time' : 'date'}
        date={picker === 'start' ? new Date(startDate) : picker === 'end' ? new Date(endDate) : new Date()}
        maximumDate={picker === 'start' ? new Date(endDate) : picker === 'end' ? new Date() : undefined}
        minimumDate={picker === 'end' ? new Date(startDate) : undefined}
        onConfirm={onPick}
        onCancel={() => setPicker(null)}
      />
    </>
  );
};

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  content:      { padding: 12, paddingBottom: 32 },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  section:      { fontSize: 12, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, marginTop: 4 },
  row:          { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  half:         { flex: 1 },
  flex1:        { flex: 1 },
  label:        { fontSize: 11, color: '#888', marginBottom: 4 },
  dateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  field:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  fieldText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500', flex: 1 },
  placeholder:  { color: '#B0B0B0', fontWeight: '400' },
  sep:          { fontSize: 14, color: '#999', marginBottom: 9 },
  radioRow:     { flexDirection: 'row', gap: 24, marginBottom: 12 },
  radio:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioText:    { fontSize: 13, color: '#555' },
  radioTextActive: { color: '#E63946', fontWeight: '700' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  spinner:      { marginTop: 40 },
  summaryHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryTotal: { fontSize: 13, fontWeight: '800', color: '#2563EB' },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 },
  sheet:        { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 8, maxHeight: '60%' },
  nameSheet:    { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 8, height: '70%' },
  sheetTitle:   { fontSize: 13, fontWeight: '700', color: '#888', paddingHorizontal: 16, paddingVertical: 8 },
  sheetRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  sheetText:    { fontSize: 14, color: '#1A1A1A' },
  sheetSub:     { fontSize: 11, color: '#999', marginTop: 2 },
  sheetTextActive: { color: '#E63946', fontWeight: '700' },
  sheetEmpty:   { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 24 },
  search:       { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  footnote:     { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 4 },
});

const tbl = StyleSheet.create({
  header:     { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:        { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:     { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  muted:      { color: '#888' },
  bold:       { fontWeight: '700' },
  red:        { color: '#C0392B', fontWeight: '600' },
  wSr:        { width: 36 },
  wName:      { width: 160 },
  wDate:      { width: 86 },
  wTime:      { width: 86 },
  wCard:      { width: 96 },
  wVerified:  { width: 130 },
  wSummaryDate:  { width: 140 },
  wSummaryCount: { width: 80 },
});

const pg = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 2 },
  btn: { minWidth: 32, height: 32, paddingHorizontal: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  btnDisabled: { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  num: { fontSize: 13, color: '#555', fontWeight: '600' },
  numActive: { color: '#fff' },
  textBtn: { height: 32, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  textBtnLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
  textDisabled: { color: '#bbb' },
});

export default StaffAttendanceReportScreen;
