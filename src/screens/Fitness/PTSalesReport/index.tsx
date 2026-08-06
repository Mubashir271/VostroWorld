import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getDetailedSalesReport } from '../../../api/reports';

interface SaleRow {
  order_detail_id: number;
  branch_name?: string;
  trainer_name?: string;
  client_name?: string;
  package_name?: string;
  session_count?: number;
  sale_type?: string;
  trainer_reservation?: string;
  sale_date?: string;
  package_duration?: number;
}

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso?: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};
const toDate = (iso: string) => new Date(iso + 'T00:00:00');
const today = () => fmt(new Date());
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const startOfYear = () => `${new Date().getFullYear()}-01-01`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return fmt(d); };
const addMonths = (iso: string, months: number) => {
  const d = toDate(iso);
  d.setMonth(d.getMonth() + months);
  return fmt(d);
};

const SALE_TYPES = ['All', 'New', 'Renew'];

const COLS = [
  { key: 'sr', label: 'Sr#', width: 42 },
  { key: 'branch', label: 'Branch', width: 70 },
  { key: 'trainer', label: 'Trainer', width: 130 },
  { key: 'client', label: 'Client', width: 140 },
  { key: 'package', label: 'Package', width: 200 },
  { key: 'sessions', label: 'PT Package', width: 90 },
  { key: 'sale_type', label: 'Sale Type', width: 90 },
  { key: 'reservation', label: 'Trainer Reservation', width: 130 },
  { key: 'start', label: 'Start Date', width: 95 },
  { key: 'end', label: 'End Date', width: 95 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const PTSalesReport = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [startDate, setStartDate] = useState(() => startOfMonth());
  const [endDate, setEndDate] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [trainerFilter, setTrainerFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [saleType, setSaleType] = useState('All');
  const [saleTypeModal, setSaleTypeModal] = useState(false);

  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDetailedSalesReport({ branch_id: branchId, start_date: startDate, end_date: endDate });
      const data: SaleRow[] = res?.data?.data ?? [];
      setRows(data.filter(r => (r.trainer_name ?? '').trim().length > 0));
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setRows([]); setFetched(true);
      } else {
        setError(e?.response?.data?.message || 'Failed to load report.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setQuick = (s: string, e: string) => { setStartDate(s); setEndDate(e); };

  const visibleRows = rows.filter(r => {
    if (saleType !== 'All' && r.sale_type !== saleType) return false;
    if (trainerFilter.trim() && !(r.trainer_name ?? '').toLowerCase().includes(trainerFilter.trim().toLowerCase())) return false;
    if (clientFilter.trim() && !(r.client_name ?? '').toLowerCase().includes(clientFilter.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <View style={styles.root}>
      <AppHeader
        title="PT Sales Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dates</Text>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Start date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>End date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.quickBtns}>
            {[
              { l: 'This Year', s: startOfYear(), e: today() },
              { l: 'This Month', s: startOfMonth(), e: today() },
              { l: '30 Days', s: daysAgo(30), e: today() },
              { l: '9 Days', s: daysAgo(9), e: today() },
            ].map(q => (
              <TouchableOpacity key={q.l} style={styles.quickBtn} onPress={() => setQuick(q.s, q.e)}>
                <Text style={styles.quickBtnText}>{q.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Trainer Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Filter by trainer"
                placeholderTextColor="#aaa"
                value={trainerFilter}
                onChangeText={setTrainerFilter}
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Client Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Filter by client"
                placeholderTextColor="#aaa"
                value={clientFilter}
                onChangeText={setClientFilter}
              />
            </View>
          </View>

          <Text style={styles.label}>Sale Type</Text>
          <TouchableOpacity style={[styles.datePicker, { marginBottom: 12 }]} onPress={() => setSaleTypeModal(true)}>
            <Text style={styles.dateText}>{saleType}</Text>
            <Icon name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {fetched && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Filtered Result</Text>
            {loading
              ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
              : visibleRows.length === 0
                ? <Text style={styles.emptyText}>No records found.</Text>
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ width: TABLE_W }}>
                      <View style={styles.thead}>
                        {COLS.map(c => (
                          <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                        ))}
                      </View>
                      {visibleRows.map((r, i) => (
                        <View key={r.order_detail_id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: COLS[0].width }]}>{i + 1}</Text>
                          <Text style={[styles.td, { width: COLS[1].width }]}>{r.branch_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]}>{r.trainer_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[3].width, textAlign: 'left' }]}>{r.client_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[4].width, textAlign: 'left' }]}>{r.package_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[5].width }]}>{r.session_count ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[6].width }]}>{r.sale_type ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[7].width }]}>{r.trainer_reservation ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[8].width }]}>{display(r.sale_date)}</Text>
                          <Text style={[styles.td, { width: COLS[9].width }]}>
                            {r.sale_date ? display(addMonths(r.sale_date, r.package_duration ?? 1)) : '-'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
            }
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={!!pickerFor}
        mode="date"
        date={toDate(pickerFor === 'start' ? startDate : endDate)}
        onConfirm={d => { if (pickerFor === 'start') setStartDate(fmt(d)); else setEndDate(fmt(d)); setPickerFor(null); }}
        onCancel={() => setPickerFor(null)}
      />

      <Modal visible={saleTypeModal} transparent animationType="fade" onRequestClose={() => setSaleTypeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSaleTypeModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Sale Type</Text>
            {SALE_TYPES.map(t => (
              <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setSaleType(t); setSaleTypeModal(false); }}>
                <Text style={[styles.dropdownItemText, saleType === t && styles.dropdownItemActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default PTSalesReport;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  errText: { color: R, fontSize: 13, marginHorizontal: 4, marginBottom: 8, fontWeight: '500' },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  col2: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 9, fontSize: 13,
    color: '#222', backgroundColor: '#FAFAFA',
  },
  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },

  quickBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  quickBtn: {
    borderWidth: 1, borderColor: '#CCC', borderRadius: 5,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FAFAFA',
  },
  quickBtnText: { fontSize: 12, color: '#333' },

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 11 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '70%' },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemActive: { color: R, fontWeight: '700' },
});
