import React, { useState, useMemo } from 'react';
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
import { getClientsList } from '../../../api/employeeDashboard';

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const display = (iso?: string) => {
  if (!iso || iso === '0000-00-00') return 'N/A';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
};
const todayDate = () => new Date();
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
const endOfQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
const endOfYear = (d: Date) => new Date(d.getFullYear(), 11, 31);

const GENDER_OPTIONS = ['All Gender', 'Male', 'Female', 'Others'];
const STATUS_OPTIONS = ['All Client', 'Active', 'Inactive'];
const VIEW_OPTIONS: Array<'Summary' | 'Detail'> = ['Summary', 'Detail'];

const LAST_QUICK = [
  { label: 'Year', range: () => { const t = todayDate(); const prev = new Date(t.getFullYear() - 1, 0, 1); return [startOfYear(prev), endOfYear(prev)] as const; } },
  { label: 'Quarter', range: () => { const t = todayDate(); const prevQEnd = addDays(startOfQuarter(t), -1); return [startOfQuarter(prevQEnd), endOfQuarter(prevQEnd)] as const; } },
  { label: 'Month', range: () => { const t = todayDate(); const prevMEnd = addDays(startOfMonth(t), -1); return [startOfMonth(prevMEnd), endOfMonth(prevMEnd)] as const; } },
  { label: 'Yesterday', range: () => { const y = addDays(todayDate(), -1); return [y, y] as const; } },
];

const TODATE_QUICK = [
  { label: 'Year', range: () => [startOfYear(todayDate()), todayDate()] as const },
  { label: 'Quarter', range: () => [startOfQuarter(todayDate()), todayDate()] as const },
  { label: 'Month', range: () => [startOfMonth(todayDate()), todayDate()] as const },
  { label: 'Today', range: () => [todayDate(), todayDate()] as const },
];

const PREVIOUS_QUICK = [
  { label: '365 Days', days: 365 },
  { label: '90 Days', days: 90 },
  { label: '30 Days', days: 30 },
  { label: '9 Days', days: 9 },
];

const Dropdown = ({
  label, value, options, open, onToggle, onSelect,
}: {
  label: string; value: string; options: string[]; open: boolean; onToggle: () => void; onSelect: (v: string) => void;
}) => (
  <View style={{ flex: 1 }}>
    <Text style={s.fieldLabel}>{label}</Text>
    <TouchableOpacity style={s.dropdown} onPress={onToggle}>
      <Text style={s.dropdownText} numberOfLines={1}>{value}</Text>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#555" />
    </TouchableOpacity>
    {open && (
      <View style={s.dropdownMenu}>
        {options.map(opt => (
          <TouchableOpacity key={opt} style={s.dropdownItem} onPress={() => onSelect(opt)}>
            <Text style={[s.dropdownItemText, value === opt && s.dropdownItemTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

const ClientsReportScreen = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [startDate, setStartDate] = useState(fmt(todayDate()));
  const [endDate, setEndDate] = useState(fmt(todayDate()));
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [genderFilter, setGenderFilter] = useState('All Gender');
  const [statusFilter, setStatusFilter] = useState('All Client');
  const [membershipFilter, setMembershipFilter] = useState('Select Membership Type');
  const [view, setView] = useState<'Summary' | 'Detail'>('Detail');

  const [genderOpen, setGenderOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const closeDropdowns = () => { setGenderOpen(false); setStatusOpen(false); setMembershipOpen(false); };

  const handleDateConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'start') { setStartDate(iso); if (iso > endDate) setEndDate(iso); }
    else setEndDate(iso);
    setPickerFor(null);
  };

  const applyQuickRange = (start: Date, end: Date) => {
    setStartDate(fmt(start));
    setEndDate(fmt(end));
  };

  const load = async () => {
    closeDropdowns();
    setLoading(true);
    try {
      const base: any = { branch_id: branchId, start_date: startDate, end_date: endDate, limit: 500, page: 1 };
      if (genderFilter === 'Male' || genderFilter === 'Female') base.gender = genderFilter;

      let data: any[] = [];
      if (statusFilter === 'All Client') {
        const [activeRes, inactiveRes] = await Promise.all([
          getClientsList({ ...base, status: '1' }),
          getClientsList({ ...base, status: '0' }),
        ]);
        data = [...(activeRes?.data?.data ?? []), ...(inactiveRes?.data?.data ?? [])];
      } else {
        const res = await getClientsList({ ...base, status: statusFilter === 'Active' ? '1' : '0' });
        data = res?.data?.data ?? [];
      }

      if (genderFilter === 'Others') {
        data = data.filter(c => !['male', 'female'].includes((c.gender ?? '').toLowerCase()));
      }

      setRows(data);
      setFetched(true);
      setMembershipFilter('Select Membership Type');
    } catch {
      setRows([]);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const membershipName = (item: any) => item.membership_type?.[0]?.get_package_name?.name ?? 'N/A';

  const membershipOptions = useMemo(() => {
    const names = new Set<string>();
    rows.forEach(r => names.add(membershipName(r)));
    return ['Select Membership Type', ...Array.from(names)];
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (membershipFilter === 'Select Membership Type') return rows;
    return rows.filter(r => membershipName(r) === membershipFilter);
  }, [rows, membershipFilter]);

  const summary = useMemo(() => {
    const total = filteredRows.length;
    const active = filteredRows.filter(r => r.status === '1' || r.status === 1).length;
    const inactive = total - active;
    const male = filteredRows.filter(r => (r.gender ?? '').toLowerCase() === 'male').length;
    const female = filteredRows.filter(r => (r.gender ?? '').toLowerCase() === 'female').length;
    const others = total - male - female;
    return { total, active, inactive, male, female, others };
  }, [filteredRows]);

  const renderRow = ({ item, index }: { item: any; index: number }) => {
    const isActive = item.status === '1' || item.status === 1;
    const name = `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || '—';
    return (
      <View style={[tbl.row, index % 2 === 1 && tbl.rowAlt]}>
        <Text style={[tbl.cell, tbl.muted, { width: 36 }]}>{index + 1}</Text>
        <Text style={[tbl.cell, { width: 110 }]} numberOfLines={1}>{item.uid ?? '—'}</Text>
        <Text style={[tbl.cell, tbl.red, { width: 140 }]} numberOfLines={1}>{name}</Text>
        <Text style={[tbl.cell, { width: 170 }]} numberOfLines={1}>{item.email ?? '—'}</Text>
        <Text style={[tbl.cell, { width: 120 }]} numberOfLines={1}>{item.phone ?? '—'}</Text>
        <Text style={[tbl.cell, { width: 70 }]} numberOfLines={1}>{item.gender ?? '—'}</Text>
        <Text style={[tbl.cell, { width: 150 }]} numberOfLines={1}>{item.address || '—'}</Text>
        <Text style={[tbl.cell, { width: 110 }]} numberOfLines={1}>{item.city || '—'}</Text>
        <Text style={[tbl.cell, { width: 90 }]} numberOfLines={1}>{display(item.birthday)}</Text>
        <Text style={[tbl.cell, { width: 100 }]} numberOfLines={1}>{display(item.date)}</Text>
        <View style={[tbl.cell, { width: 80 }]}>
          <View style={[tbl.badge, { backgroundColor: isActive ? '#dcfce7' : '#fee2e2' }]}>
            <Text style={[tbl.badgeText, { color: isActive ? '#166534' : '#991b1b' }]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <Text style={[tbl.cell, { width: 180 }]} numberOfLines={1}>{membershipName(item)}</Text>
      </View>
    );
  };

  return (
    <View style={s.screen}>
      <AppHeader
        title="Clients Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={s.filterCard}>
          {/* Dates */}
          <Text style={s.sectionTitle}>Dates</Text>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Start Date</Text>
              <TouchableOpacity style={s.dateBtn} onPress={() => { closeDropdowns(); setPickerFor('start'); }}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.dateText}>{display(startDate)}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>End Date</Text>
              <TouchableOpacity style={s.dateBtn} onPress={() => { closeDropdowns(); setPickerFor('end'); }}>
                <Icon name="calendar" size={14} color="#E63946" />
                <Text style={s.dateText}>{display(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filters */}
          <View style={[s.row, { marginTop: 12 }]}>
            <Dropdown
              label="Filter By Gender"
              value={genderFilter}
              options={GENDER_OPTIONS}
              open={genderOpen}
              onToggle={() => { setStatusOpen(false); setMembershipOpen(false); setGenderOpen(v => !v); }}
              onSelect={(v) => { setGenderFilter(v); setGenderOpen(false); }}
            />
            <Dropdown
              label="Filter By Client Status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              open={statusOpen}
              onToggle={() => { setGenderOpen(false); setMembershipOpen(false); setStatusOpen(v => !v); }}
              onSelect={(v) => { setStatusFilter(v); setStatusOpen(false); }}
            />
          </View>

          <View style={[s.row, { marginTop: 12 }]}>
            <Dropdown
              label="Filter By Membership Type"
              value={membershipFilter}
              options={membershipOptions}
              open={membershipOpen}
              onToggle={() => { setGenderOpen(false); setStatusOpen(false); setMembershipOpen(v => !v); }}
              onSelect={(v) => { setMembershipFilter(v); setMembershipOpen(false); }}
            />
          </View>

          {/* Quick Dates */}
          <Text style={[s.sectionTitle, { marginTop: 14 }]}>Quick Dates</Text>
          <Text style={s.quickGroupLabel}>Last</Text>
          <View style={s.chipRow}>
            {LAST_QUICK.map(q => (
              <TouchableOpacity key={q.label} style={s.chip} onPress={() => { const [a, b] = q.range(); applyQuickRange(a, b); }}>
                <Text style={s.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.quickGroupLabel}>To-Date</Text>
          <View style={s.chipRow}>
            {TODATE_QUICK.map(q => (
              <TouchableOpacity key={q.label} style={s.chip} onPress={() => { const [a, b] = q.range(); applyQuickRange(a, b); }}>
                <Text style={s.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.quickGroupLabel}>Previous</Text>
          <View style={s.chipRow}>
            {PREVIOUS_QUICK.map(q => (
              <TouchableOpacity key={q.label} style={s.chip} onPress={() => applyQuickRange(addDays(todayDate(), -q.days), todayDate())}>
                <Text style={s.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Options */}
          <Text style={[s.sectionTitle, { marginTop: 14 }]}>Options</Text>
          <View style={s.radioRow}>
            {VIEW_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={s.radioItem} onPress={() => setView(opt)}>
                <Icon name={view === opt ? 'radiobox-marked' : 'radiobox-blank'} size={18} color={view === opt ? '#E63946' : '#999'} />
                <Text style={s.radioLabel}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.goBtn} onPress={load} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.goText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {!loading && !fetched && (
          <View style={s.empty}>
            <Icon name="account-group-outline" size={40} color="#ddd" />
            <Text style={s.emptyTitle}>Clients Report</Text>
            <Text style={s.emptySubtitle}>Select your filters and tap Go.</Text>
          </View>
        )}
        {loading && <ActivityIndicator size="large" style={{ marginTop: 32 }} color="#E63946" />}
        {!loading && fetched && filteredRows.length === 0 && (
          <View style={s.empty}>
            <Icon name="account-group-outline" size={40} color="#ddd" />
            <Text style={s.emptyTitle}>No Clients Found</Text>
            <Text style={s.emptySubtitle}>No clients match the selected filters.</Text>
          </View>
        )}

        {!loading && fetched && filteredRows.length > 0 && view === 'Summary' && (
          <View style={s.summaryGrid}>
            <View style={[s.summaryCard, { backgroundColor: '#F0F7FF' }]}>
              <Text style={s.summaryValue}>{summary.total}</Text>
              <Text style={s.summaryLabel}>Total</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={s.summaryValue}>{summary.active}</Text>
              <Text style={s.summaryLabel}>Active</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: '#FFEBEE' }]}>
              <Text style={s.summaryValue}>{summary.inactive}</Text>
              <Text style={s.summaryLabel}>Inactive</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: '#F3E5F5' }]}>
              <Text style={s.summaryValue}>{summary.male}</Text>
              <Text style={s.summaryLabel}>Male</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={s.summaryValue}>{summary.female}</Text>
              <Text style={s.summaryLabel}>Female</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: '#ECEFF1' }]}>
              <Text style={s.summaryValue}>{summary.others}</Text>
              <Text style={s.summaryLabel}>Others</Text>
            </View>
          </View>
        )}

        {!loading && fetched && filteredRows.length > 0 && view === 'Detail' && (
          <>
            <View style={s.countBar}>
              <Text style={s.countText}>{filteredRows.length} client{filteredRows.length !== 1 ? 's' : ''}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={tbl.header}>
                  {[
                    { l: 'Sr#', w: 36 }, { l: 'Membership No.', w: 110 }, { l: 'Client Name', w: 140 },
                    { l: 'Email', w: 170 }, { l: 'Phone', w: 120 }, { l: 'Gender', w: 70 },
                    { l: 'Address', w: 150 }, { l: 'City', w: 110 }, { l: 'Birthday', w: 90 },
                    { l: 'Reg. Date', w: 100 }, { l: 'Status', w: 80 }, { l: 'Membership Type', w: 180 },
                  ].map(h => (
                    <Text key={h.l} style={[tbl.headerCell, { width: h.w }]}>{h.l}</Text>
                  ))}
                </View>
                <FlatList
                  data={filteredRows}
                  keyExtractor={(item, i) => String(item.id ?? i)}
                  renderItem={renderRow}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </View>
            </ScrollView>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <DateTimePickerModal
        isVisible={pickerFor !== null}
        mode="date"
        date={new Date(pickerFor === 'start' ? startDate : endDate)}
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerFor(null)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F5F7FA' },
  filterCard:    { backgroundColor: '#FFF', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionTitle:  { fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 },
  row:           { flexDirection: 'row', gap: 10 },
  fieldLabel:    { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6 },

  dateBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:      { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },

  dropdown:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA' },
  dropdownText:  { fontSize: 13, color: '#1A1A1A', flex: 1 },
  dropdownMenu:  { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 4, backgroundColor: '#FFF', maxHeight: 180 },
  dropdownItem:  { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },
  dropdownItemTextActive: { color: '#E63946', fontWeight: '700' },

  quickGroupLabel: { fontSize: 11, fontWeight: '700', color: '#999', marginTop: 8, marginBottom: 6 },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:          { height: 30, backgroundColor: '#F5F5F5', borderRadius: 6, paddingHorizontal: 14, justifyContent: 'center' },
  chipText:      { fontSize: 12, color: '#555', fontWeight: '600' },

  radioRow:      { flexDirection: 'row', gap: 20, marginBottom: 14 },
  radioItem:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioLabel:    { fontSize: 13, color: '#333', fontWeight: '600' },

  goBtn:         { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  goText:        { color: '#FFF', fontWeight: '700', fontSize: 15 },

  empty:         { alignItems: 'center', paddingTop: 40, paddingBottom: 20, gap: 6 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  emptySubtitle: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 32 },

  countBar:      { backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  countText:     { fontSize: 12, color: '#666', fontWeight: '600' },

  summaryGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  summaryCard:   { flexBasis: '31%', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  summaryValue:  { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  summaryLabel:  { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '600' },
});

const tbl = StyleSheet.create({
  header:    { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell:{ fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:       { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:    { backgroundColor: '#FBF8F8' },
  cell:      { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  muted:     { color: '#888' },
  red:       { color: '#C0392B', fontWeight: '600' },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
});

export default ClientsReportScreen;
