import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getDetailedSalesReport } from '../../../api/reports';

// Confirmed live 2026-06-25: GX category (15) rows from
// `detailed-sales-report`, the same endpoint behind PTSalesReport — the
// previous "Best API" guess (`/v1/gx/bookings/get`) is a confirmed 404 with
// no replacement found until now. GX packages use a day-based
// `package_duration` (e.g. 28 = 28 days), unlike PT's month-based one, so
// End Date is computed differently here.
interface BookingRow {
  order_detail_id: number;
  branch_name?: string;
  client_id?: number;
  client_name?: string;
  trainer_name?: string;
  package_name?: string;
  session_count?: number;
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
const today = () => fmt(new Date());
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return fmt(d);
};

const GXBookings = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? 'Branch';

  const [clientFilter, setClientFilter] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('');
  const [slotFilter, setSlotFilter] = useState('');

  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDetailedSalesReport({ branch_id: branchId, start_date: startOfMonth(), end_date: today() });
      const data: BookingRow[] = res?.data?.data ?? [];
      setRows(data.filter((r: any) => r.category === '15'));
      setFetched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 422) {
        setRows([]); setFetched(true);
      } else {
        setError(e?.response?.data?.message || 'Failed to load GX bookings.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibleRows = rows.filter(r => {
    if (clientFilter.trim() && !(r.client_name ?? '').toLowerCase().includes(clientFilter.trim().toLowerCase())) return false;
    if (trainerFilter.trim() && !(r.trainer_name ?? '').toLowerCase().includes(trainerFilter.trim().toLowerCase())) return false;
    if (slotFilter.trim() && !(r.package_name ?? '').toLowerCase().includes(slotFilter.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <View style={styles.root}>
      <AppHeader
        title="New GX Bookings"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>New GX Bookings</Text>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Branch Name</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Client Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Client Name"
                placeholderTextColor="#aaa"
                value={clientFilter}
                onChangeText={setClientFilter}
              />
            </View>
          </View>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Available Trainers</Text>
              <TextInput
                style={styles.input}
                placeholder="Filter by trainer"
                placeholderTextColor="#aaa"
                value={trainerFilter}
                onChangeText={setTrainerFilter}
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Slots</Text>
              <TextInput
                style={styles.input}
                placeholder="Filter by slot/package"
                placeholderTextColor="#aaa"
                value={slotFilter}
                onChangeText={setSlotFilter}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.goBtn} onPress={load}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goBtnText}>Search</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {fetched && (
          <View style={styles.card}>
            {loading
              ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
              : visibleRows.length === 0
                ? <Text style={styles.emptyText}>No records found.</Text>
                : (
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: 950 }}>
                      <View style={styles.thead}>
                        <Text style={[styles.th, { width: 40 }]}>#</Text>
                        <Text style={[styles.th, { width: 70 }]}>Branch</Text>
                        <Text style={[styles.th, { width: 140 }]}>Client</Text>
                        <Text style={[styles.th, { width: 120 }]}>Trainer</Text>
                        <Text style={[styles.th, { width: 200 }]}>Slot Name</Text>
                        <Text style={[styles.th, { width: 100 }]}>Total Sessions</Text>
                        <Text style={[styles.th, { width: 95 }]}>Start Date</Text>
                        <Text style={[styles.th, { width: 95 }]}>End Date</Text>
                        <Text style={[styles.th, { width: 130 }]}>Action</Text>
                      </View>
                      {visibleRows.map((r, i) => (
                        <View key={r.order_detail_id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: 40 }]}>{i + 1}</Text>
                          <Text style={[styles.td, { width: 70 }]}>{r.branch_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: 140, textAlign: 'left' }]}>{r.client_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: 120, textAlign: 'left' }]}>{r.trainer_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: 200, textAlign: 'left' }]}>{r.package_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: 100 }]}>{r.session_count ?? '-'}</Text>
                          <Text style={[styles.td, { width: 95 }]}>{display(r.sale_date)}</Text>
                          <Text style={[styles.td, { width: 95 }]}>
                            {r.sale_date ? display(addDays(r.sale_date, r.package_duration ?? 0)) : '-'}
                          </Text>
                          <View style={[styles.td, { width: 130 }]}>
                            <TouchableOpacity onPress={() => Alert.alert('Add Assessments', 'Use the Nutrition section to add an assessment for this client.')}>
                              <Text style={styles.actionLink}>+ Add Assessments</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
            }
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default GXBookings;

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
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },

  goBtn: { backgroundColor: '#222', borderRadius: 6, alignItems: 'center', paddingVertical: 11 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },
  actionLink: { color: '#2E7D32', fontWeight: '700', fontSize: 12 },
});
