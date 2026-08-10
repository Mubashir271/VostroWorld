import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  getSPTAttendancePackageNames,
  getSPTAttendancePackages,
  getSPTAppointmentTrainers,
} from '../../../api/employeeDashboard';

// Confirmed live 2026-07-01 via HAR. Main endpoint is /v1/packages/gx?category=4
// which returns packages with order_details (client rows) and time_slot arrays.
// All order_details were empty (no SPT bookings on this branch yet), so
// client row field names are inferred from column headers: client_name,
// time_slot, and a mark-attendance action. Mark-attendance POST is unconfirmed.

interface Trainer { id: number; name: string; }
interface PackageName { id: number; name: string; }
interface OrderDetail {
  id: number;
  client_name?: string;
  customer_name?: string;
  time_slot?: string;
  start_time?: string;
  attendance_status?: string;
}
interface SPTPackage {
  id: number;
  name: string;
  trainer_id: number;
  trainer_name?: string;
  branch_name?: string;
  start_time?: string;
  end_time?: string;
  session_count?: number;
  order_details: OrderDetail[];
  time_slot: any[];
}

const COLS = [
  { key: 'client', label: 'Client Name', width: 180 },
  { key: 'slot', label: 'Time Slot', width: 150 },
  { key: 'mark', label: 'Mark Attendance', width: 130 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const SPTAttendance = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const branchName = profile?.branchName ?? 'Branch';

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [packageNames, setPackageNames] = useState<PackageName[]>([]);

  const [trainerId, setTrainerId] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerModal, setTrainerModal] = useState(false);

  const [packageId, setPackageId] = useState('');
  const [packageNameSel, setPackageNameSel] = useState('');
  const [packageModal, setPackageModal] = useState(false);
  const [pkgNamesLoading, setPkgNamesLoading] = useState(false);

  const [limit, setLimit] = useState(25);
  const [limitModal, setLimitModal] = useState(false);

  const [packages, setPackages] = useState<SPTPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const loadTrainers = useCallback(async () => {
    try {
      const res = await getSPTAppointmentTrainers({ branch_id: branchId });
      const list = res?.data ?? [];
      setTrainers((Array.isArray(list) ? list : []).map((t: any) => ({
        id: t.id,
        name: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim(),
      })));
    } catch {}
  }, [branchId]);

  const loadPackageNames = useCallback(async (uid?: string) => {
    setPkgNamesLoading(true);
    try {
      const res = await getSPTAttendancePackageNames({ branch_id: branchId, user_id: uid || '' });
      const list = res?.data ?? [];
      setPackageNames(Array.isArray(list) ? list.map((p: any) => ({ id: p.id, name: p.name })) : []);
    } catch {}
    finally { setPkgNamesLoading(false); }
  }, [branchId]);

  useFocusEffect(useCallback(() => {
    loadTrainers();
    loadPackageNames();
  }, [loadTrainers, loadPackageNames]));

  const onTrainerSelect = async (id: string, name: string) => {
    setTrainerId(id);
    setTrainerName(name);
    setPackageId('');
    setPackageNameSel('');
    await loadPackageNames(id);
  };

  const search = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSPTAttendancePackages({
        branch_id: branchId,
        trainer_id: trainerId || '',
        package_id: packageId || '',
        page: 1,
        limit,
      });
      const data: SPTPackage[] = res?.data ?? [];
      setPackages(Array.isArray(data) ? data : []);
      setFetched(true);
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 404 || s === 422) { setPackages([]); setFetched(true); }
      else setError(e?.response?.data?.message ?? 'Failed to load SPT attendance.');
    } finally {
      setLoading(false);
    }
  }, [branchId, trainerId, packageId, limit]);

  const handleMarkAttendance = (pkg: SPTPackage, client: OrderDetail) => {
    Alert.alert(
      'Mark Attendance',
      `Mark attendance for ${client.client_name ?? client.customer_name ?? 'client'}?\n\nNote: POST endpoint not yet confirmed.`,
      [{ text: 'OK' }],
    );
  };

  const timeSlotLabel = (pkg: SPTPackage, client: OrderDetail) => {
    if (client.time_slot) return client.time_slot;
    if (client.start_time) return client.start_time;
    if (pkg.start_time && pkg.end_time) return `${pkg.start_time} TO ${pkg.end_time}`;
    return '-';
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="SPT Attendance"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SPT Attendance</Text>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Branch Name</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Trainer</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTrainerModal(true)}>
                <Text style={trainerId ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                  {trainerName || 'Select Trainer'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.row2, { marginBottom: 0 }]}>
            <View style={styles.col2}>
              <Text style={styles.label}>Package</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setPackageModal(true)}>
                {pkgNamesLoading
                  ? <ActivityIndicator size="small" color={R} style={{ flex: 1 }} />
                  : <Text style={packageId ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                      {packageNameSel || 'Select Package'}
                    </Text>
                }
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={[styles.col2, { justifyContent: 'flex-end' }]}>
              <View style={styles.toolbarRight}>
                <TouchableOpacity style={styles.searchBtn} onPress={search}>
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.searchBtnText}>Search</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={styles.limitBtn} onPress={() => setLimitModal(true)}>
                  <Text style={styles.limitText}>{limit}</Text>
                  <Icon name="chevron-down" size={14} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.pdfBtn}>
                  <Icon name="file-pdf-box" size={13} color="#fff" />
                  <Text style={styles.pdfBtnText}>PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {!!error && <Text style={[styles.errText, { marginTop: 10 }]}>{error}</Text>}
        </View>

        {/* Package sections */}
        {fetched && !loading && packages.length === 0 && (
          <Text style={styles.emptyText}>No records found.</Text>
        )}

        {loading && <ActivityIndicator color={R} style={{ marginVertical: 30 }} />}

        {!loading && packages.map(pkg => (
          <View key={pkg.id} style={styles.card}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockHeaderLeft}>Trainer Name: {pkg.trainer_name ?? '-'}</Text>
              <Text style={styles.blockHeaderRight}>Slot Name: {pkg.name}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ width: TABLE_W }}>
                <View style={styles.thead}>
                  {COLS.map(c => (
                    <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                  ))}
                </View>

                {pkg.order_details.length === 0
                  ? (
                    <View style={styles.noClientRow}>
                      <Text style={styles.noClientText}>No Client Found</Text>
                    </View>
                  )
                  : pkg.order_details.map((client, i) => (
                    <View key={client.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                      <Text style={[styles.td, { width: COLS[0].width, textAlign: 'left' }]} numberOfLines={1}>
                        {client.client_name ?? client.customer_name ?? '-'}
                      </Text>
                      <Text style={[styles.td, { width: COLS[1].width }]} numberOfLines={1}>
                        {timeSlotLabel(pkg, client)}
                      </Text>
                      <TouchableOpacity
                        style={[styles.td, { width: COLS[2].width }, styles.markCell]}
                        onPress={() => handleMarkAttendance(pkg, client)}
                      >
                        <Text style={styles.markBtn}>Mark</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                }
              </View>
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Trainer modal */}
      <Modal visible={trainerModal} transparent animationType="fade" onRequestClose={() => setTrainerModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setTrainerModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Trainer</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { onTrainerSelect('', ''); setTrainerModal(false); }}>
                <Text style={styles.dropdownItemText}>All Trainers</Text>
              </TouchableOpacity>
              {trainers.map(t => (
                <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { onTrainerSelect(String(t.id), t.name); setTrainerModal(false); }}>
                  <Text style={styles.dropdownItemText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Package modal */}
      <Modal visible={packageModal} transparent animationType="fade" onRequestClose={() => setPackageModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPackageModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Package</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setPackageId(''); setPackageNameSel(''); setPackageModal(false); }}>
                <Text style={styles.dropdownItemText}>All Packages</Text>
              </TouchableOpacity>
              {packageNames.map(p => (
                <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => { setPackageId(String(p.id)); setPackageNameSel(p.name); setPackageModal(false); }}>
                  <Text style={styles.dropdownItemText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Limit modal */}
      <Modal visible={limitModal} transparent animationType="fade" onRequestClose={() => setLimitModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setLimitModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Per Page</Text>
            {[25, 50, 100, 500].map(l => (
              <TouchableOpacity key={l} style={styles.dropdownItem} onPress={() => { setLimit(l); setLimitModal(false); }}>
                <Text style={[styles.dropdownItemText, limit === l && { color: R, fontWeight: '700' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default SPTAttendance;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  errText: { color: R, fontSize: 13, fontWeight: '500' },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  col2: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
    minHeight: 42, justifyContent: 'center',
  },
  staticText: { fontSize: 13, color: '#444' },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    minHeight: 42,
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },

  toolbarRight: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 20 },
  searchBtn: {
    backgroundColor: '#1A1A1A', borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  limitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#FAFAFA',
  },
  limitText: { fontSize: 12, color: '#333' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: R, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 10,
  },
  pdfBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 30, fontSize: 13 },

  blockHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#1A1A1A', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 6, marginBottom: 10,
  },
  blockHeaderLeft: { color: '#fff', fontWeight: '700', fontSize: 12 },
  blockHeaderRight: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'right', flex: 1, marginLeft: 8 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 9 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 8, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 13, color: '#333', paddingHorizontal: 8, textAlign: 'center' },
  markCell: { alignItems: 'center', justifyContent: 'center' },
  markBtn: { color: '#1565C0', fontWeight: '700', fontSize: 13 },

  noClientRow: { paddingVertical: 20, alignItems: 'center' },
  noClientText: { color: '#999', fontSize: 13 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
