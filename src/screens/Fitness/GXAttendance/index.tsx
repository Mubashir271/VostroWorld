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
import BurgerSVG from '../../../assets/svg/BurgerSVG';
import { RootState } from '../../../redux/store';
import {
  getGXAttendancePackages,
  getSPTBookingTrainers,
  getSPTSlots,
} from '../../../api/employeeDashboard';

// Confirmed live 2026-07-01 via HAR:
//   Trainers: GET /v1/auth/get-name?designation_id=1&branch_id=&is_gx_trainer=1
//   Slots:    GET /v1/packages/names-list?category=15&status=1
//   Data:     GET /v1/packages/gx?branch_id=&trainer_id=&package_id=&limit=25
// Mark Attendance POST endpoint not captured in HAR — submit is gated.

const R = '#C62828';
const PAGE_SIZE = 25;

interface Trainer { id: number; name: string; }
interface Slot { id: number; name: string; }

const GXAttendance = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? 'Branch';

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const [trainerModal, setTrainerModal] = useState(false);
  const [slotModal, setSlotModal] = useState(false);

  const [packages, setPackages] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const loadDropdowns = useCallback(async () => {
    try {
      const [trRes, slRes] = await Promise.all([
        getSPTBookingTrainers({ branch_id: branchId }),
        getSPTSlots({ branch_id: branchId }),
      ]);
      const trList = trRes?.data ?? [];
      setTrainers((Array.isArray(trList) ? trList : []).map((t: any) => ({
        id: t.id,
        name: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim(),
      })));
      const slList = slRes?.data ?? [];
      setSlots(Array.isArray(slList) ? slList : []);
    } catch {}
  }, [branchId]);

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await getGXAttendancePackages({
        branch_id: branchId,
        trainer_id: trainer?.id ?? '',
        package_id: slot?.id ?? '',
        page: targetPage,
        limit: PAGE_SIZE,
      });
      const pkgs = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
      setPackages(pkgs);
      setTotalPages(Math.max(1, res?.total_pages ?? 1));
      setPage(targetPage);
      setFetched(true);
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 404 || s === 422) { setPackages([]); setTotalPages(1); setFetched(true); }
      else setError(e?.response?.data?.message ?? 'Failed to load GX attendance.');
    } finally {
      setLoading(false);
    }
  }, [branchId, trainer, slot]);

  useFocusEffect(useCallback(() => {
    loadDropdowns();
    load(1);
  }, [loadDropdowns, load]));

  const handleMarkAttendance = (clientName: string) => {
    Alert.alert(
      'Mark Attendance',
      `Mark attendance for ${clientName}?\n\nNote: The attendance POST endpoint was not captured in HAR and is not yet confirmed.`,
    );
  };

  const timeSlotLabel = (pkg: any) => {
    const ts = pkg.time_slot;
    if (!ts || !ts.length) return '—';
    return `${ts[0].start_time} To ${ts[0].end_time}`;
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="GX Attendance"
        leftIcon={
          navigation.canGoBack()
            ? <Icon name="arrow-left" size={24} color="#1A1A1A" />
            : <BurgerSVG width={24} height={24} />
        }
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.openDrawer())}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <Text style={styles.label}>Branch Name</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.filterCol}>
              <Text style={styles.label}>Trainer</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTrainerModal(true)}>
                <Text style={trainer ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                  {trainer?.name ?? 'Select Trainer'}
                </Text>
                <Icon name="chevron-down" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <Text style={styles.label}>Slots</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setSlotModal(true)}>
                <Text style={slot ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                  {slot?.name ?? 'Select Slot'}
                </Text>
                <Icon name="chevron-down" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={[styles.filterCol, { justifyContent: 'flex-end' }]}>
              <TouchableOpacity style={styles.searchBtn} onPress={() => load(1)}>
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.searchBtnText}>Search</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {loading && <ActivityIndicator color={R} style={{ marginVertical: 30 }} />}

        {fetched && !loading && packages.length === 0 && (
          <Text style={styles.emptyText}>No records found.</Text>
        )}

        {fetched && !loading && packages.map((pkg, pi) => {
          const clients = pkg.order_details ?? [];
          return (
            <View key={pkg.id ?? pi} style={styles.blockCard}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockHeaderLeft}>Trainer Name: {pkg.trainer_name ?? '—'}</Text>
                <Text style={styles.blockHeaderRight}>Slot Name: {pkg.name ?? '—'}</Text>
              </View>

              <View style={styles.thead}>
                <Text style={[styles.th, styles.colClient]}>Client Name</Text>
                <Text style={[styles.th, styles.colTime]}>Time Slot</Text>
                <Text style={[styles.th, styles.colMark]}>Mark Attendance</Text>
              </View>

              {clients.length === 0 ? (
                <Text style={styles.noClientText}>No Client Found</Text>
              ) : (
                clients.map((c: any, ci: number) => (
                  <View key={c.id ?? ci} style={[styles.tr, ci % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.td, styles.colClient]}>{c.client_name ?? '—'}</Text>
                    <Text style={[styles.td, styles.colTime]}>{timeSlotLabel(pkg)}</Text>
                    <View style={[styles.td, styles.colMark, styles.markRow]}>
                      <TouchableOpacity
                        style={[styles.markBtn, styles.markBtnP]}
                        onPress={() => handleMarkAttendance(c.client_name ?? '')}
                      >
                        <Text style={styles.markBtnText}>P</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.markBtn, styles.markBtnA]}
                        onPress={() => handleMarkAttendance(c.client_name ?? '')}
                      >
                        <Text style={styles.markBtnText}>A</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}

        {!loading && fetched && totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={page === 1} onPress={() => load(1)}>
              <Text style={[styles.pageEdge, page === 1 && styles.pageDisabled]}>First</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={page === 1} onPress={() => load(page - 1)}>
              <Text style={[styles.pageArrow, page === 1 && styles.pageDisabled]}>‹</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumScroll}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <TouchableOpacity key={n} onPress={() => load(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
                  <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity disabled={page === totalPages} onPress={() => load(page + 1)}>
              <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabled]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={page === totalPages} onPress={() => load(totalPages)}>
              <Text style={[styles.pageEdge, page === totalPages && styles.pageDisabled]}>Last</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={trainerModal} transparent animationType="fade" onRequestClose={() => setTrainerModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setTrainerModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Trainer</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setTrainer(null); setTrainerModal(false); }}>
                <Text style={styles.dropdownItemText}>Select Trainer</Text>
              </TouchableOpacity>
              {trainers.map(t => (
                <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { setTrainer(t); setTrainerModal(false); }}>
                  <Text style={styles.dropdownItemText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={slotModal} transparent animationType="fade" onRequestClose={() => setSlotModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSlotModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Slot</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSlot(null); setSlotModal(false); }}>
                <Text style={styles.dropdownItemText}>Select Slot</Text>
              </TouchableOpacity>
              {slots.map(s => (
                <TouchableOpacity key={s.id} style={styles.dropdownItem} onPress={() => { setSlot(s); setSlotModal(false); }}>
                  <Text style={styles.dropdownItemText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default GXAttendance;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  filterCard: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  filterCol: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },
  searchBtn: {
    backgroundColor: R, borderRadius: 6, alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 18, marginTop: 18,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  blockCard: {
    backgroundColor: '#fff', borderRadius: 8, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  blockHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1A1A1A', paddingVertical: 10, paddingHorizontal: 12,
  },
  blockHeaderLeft: { color: '#fff', fontWeight: '700', fontSize: 12, flex: 1 },
  blockHeaderRight: { color: '#fff', fontWeight: '700', fontSize: 12, flex: 1, textAlign: 'right' },
  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 10, textAlign: 'center' },
  colClient: { flex: 2 },
  colTime: { flex: 2 },
  colMark: { flex: 1.5 },
  tr: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 10, textAlign: 'center', alignSelf: 'center' },
  markRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center' },
  markBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  markBtnP: { borderColor: '#2E7D32', backgroundColor: '#fff' },
  markBtnA: { borderColor: R, backgroundColor: '#fff' },
  markBtnText: { fontSize: 13, fontWeight: '700', color: '#333' },
  noClientText: {
    textAlign: 'center', color: '#999', paddingVertical: 14,
    fontSize: 13, fontStyle: 'italic',
  },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  pageEdge: { fontSize: 12, fontWeight: '700', color: R },
  pageArrow: { fontSize: 18, fontWeight: '700', color: R, paddingHorizontal: 4 },
  pageDisabled: { color: '#BBB' },
  pageNumScroll: { flexGrow: 0, maxWidth: 200 },
  pageNum: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  pageNumActive: { backgroundColor: R, borderColor: R },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
