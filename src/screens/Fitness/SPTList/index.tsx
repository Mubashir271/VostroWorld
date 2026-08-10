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
import { getSPTPackages, deleteSPTPackage } from '../../../api/employeeDashboard';

interface SPTPackage {
  id: number;
  branches_name?: string;
  package_name?: string;
  user_first_name?: string;
  user_last_name?: string;
  session_count?: number;
  start_time?: string;
  end_time?: string;
  time_slot?: any[];
  classes?: any[];
}

const LIMITS = [25, 50, 100];

const COLS = [
  { key: 'sr', label: 'Sr#', width: 40 },
  { key: 'branch', label: 'Branch Name', width: 80 },
  { key: 'package', label: 'Package Name', width: 200 },
  { key: 'trainer', label: 'Trainer', width: 130 },
  { key: 'sessions', label: 'Total Sessions', width: 90 },
  { key: 'slot', label: 'Time Slot', width: 140 },
  { key: 'days', label: 'Days', width: 80 },
  { key: 'actions', label: 'Actions', width: 70 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);
const PAGE_SIZE = 25;

const SPTList = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [rows, setRows] = useState<SPTPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [limitModal, setLimitModal] = useState(false);

  // per-row action menu
  const [actionRow, setActionRow] = useState<SPTPackage | null>(null);
  const [actionModal, setActionModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSPTPackages({ branch_id: branchId, limit: 500 });
      const data: SPTPackage[] = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 404 || s === 422) { setRows([]); }
      else setError(e?.response?.data?.message ?? 'Failed to load SPT classes.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const hasSlot = (row: SPTPackage) =>
    Array.isArray(row.time_slot) ? row.time_slot.length > 0 : !!row.time_slot;
  const hasDays = (row: SPTPackage) =>
    Array.isArray(row.classes) ? row.classes.length > 0 : !!row.classes;

  const timeSlotLabel = (row: SPTPackage) => {
    if (!hasSlot(row)) return null;
    if (row.start_time && row.end_time) return `${row.start_time} To ${row.end_time}`;
    const slots: any[] = Array.isArray(row.time_slot) ? row.time_slot : [];
    if (slots.length > 0) {
      const s = slots[0];
      return s.start_time && s.end_time ? `${s.start_time} To ${s.end_time}` : 'Assigned';
    }
    return 'Assigned';
  };

  const daysLabel = (row: SPTPackage) => {
    if (!hasDays(row)) return null;
    const cls: any[] = Array.isArray(row.classes) ? row.classes : [];
    if (cls.length > 0) return cls.map((c: any) => c.day ?? c.name ?? '').filter(Boolean).join(', ');
    return 'Assigned';
  };

  const handleDelete = (row: SPTPackage) => {
    Alert.alert('Delete Package', `Delete "${row.package_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteSPTPackage(row.id);
            load();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message ?? 'Delete failed. Endpoint may not be confirmed.');
          }
        },
      },
    ]);
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const pagedRows = rows.slice((page - 1) * limit, page * limit);

  const slotAssigned = actionRow ? hasSlot(actionRow) : false;

  return (
    <View style={styles.root}>
      <AppHeader
        title="SPT List"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All SPT Classes</Text>

          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.limitBtn} onPress={() => setLimitModal(true)}>
              <Text style={styles.limitText}>{limit}</Text>
              <Icon name="chevron-down" size={14} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.pdfBtn}>
              <Icon name="file-pdf-box" size={14} color="#fff" />
              <Text style={styles.pdfBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>

          {!!error && <Text style={styles.errText}>{error}</Text>}

          {loading
            ? <ActivityIndicator color={R} style={{ marginVertical: 40 }} />
            : rows.length === 0
              ? <Text style={styles.emptyText}>No Record Found</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ width: TABLE_W }}>
                    <View style={styles.thead}>
                      {COLS.map(c => (
                        <Text key={c.key} style={[styles.th, { width: c.width }]}>{c.label}</Text>
                      ))}
                    </View>
                    {pagedRows.map((row, i) => {
                      const slot = timeSlotLabel(row);
                      const days = daysLabel(row);
                      return (
                        <View key={row.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                          <Text style={[styles.td, { width: COLS[0].width }]}>{(page - 1) * limit + i + 1}</Text>
                          <Text style={[styles.td, { width: COLS[1].width }]} numberOfLines={1}>{row.branches_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]} numberOfLines={2}>{row.package_name ?? '-'}</Text>
                          <Text style={[styles.td, { width: COLS[3].width, textAlign: 'left' }]} numberOfLines={1}>
                            {[row.user_first_name, row.user_last_name].filter(Boolean).join(' ') || '-'}
                          </Text>
                          <Text style={[styles.td, { width: COLS[4].width }]}>{row.session_count ?? '-'}</Text>
                          {slot
                            ? <Text style={[styles.td, { width: COLS[5].width }]} numberOfLines={1}>{slot}</Text>
                            : <Text style={[styles.td, { width: COLS[5].width, color: R, fontWeight: '700' }]}>Pending</Text>
                          }
                          {days
                            ? <Text style={[styles.td, { width: COLS[6].width }]} numberOfLines={1}>{days}</Text>
                            : <Text style={[styles.td, { width: COLS[6].width, color: R, fontWeight: '700' }]}>Pending</Text>
                          }
                          <TouchableOpacity
                            style={[styles.td, { width: COLS[7].width }, styles.actionCell]}
                            onPress={() => { setActionRow(row); setActionModal(true); }}
                          >
                            <Icon name="dots-vertical" size={18} color="#555" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )
          }

          {!loading && rows.length > limit && (
            <View style={styles.pagination}>
              <TouchableOpacity disabled={page === 1} onPress={() => setPage(1)}>
                <Text style={[styles.pageEdge, page === 1 && styles.pageDisabled]}>First</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={page === 1} onPress={() => setPage(p => Math.max(1, p - 1))}>
                <Text style={[styles.pageArrow, page === 1 && styles.pageDisabled]}>‹</Text>
              </TouchableOpacity>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumScroll}>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
                  <TouchableOpacity key={n} onPress={() => setPage(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
                    <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(p => Math.min(totalPages, p + 1))}>
                <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabled]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(totalPages)}>
                <Text style={[styles.pageEdge, page === totalPages && styles.pageDisabled]}>Last</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Limit picker */}
      <Modal visible={limitModal} transparent animationType="fade" onRequestClose={() => setLimitModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setLimitModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Per Page</Text>
            {LIMITS.map(l => (
              <TouchableOpacity key={l} style={styles.dropdownItem} onPress={() => { setLimit(l); setPage(1); setLimitModal(false); }}>
                <Text style={[styles.dropdownItemText, limit === l && { color: R, fontWeight: '700' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Row action menu */}
      <Modal visible={actionModal} transparent animationType="fade" onRequestClose={() => setActionModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setActionModal(false)}>
          <View style={styles.actionBox}>
            <Text style={styles.actionTitle} numberOfLines={2}>{actionRow?.package_name}</Text>
            {!slotAssigned && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  setActionModal(false);
                  Alert.alert('Assign Slot', 'Assign Slot endpoint not yet confirmed.');
                }}
              >
                <Icon name="clock-outline" size={18} color="#1565C0" />
                <Text style={[styles.actionItemText, { color: '#1565C0' }]}>Assign Slot</Text>
              </TouchableOpacity>
            )}
            {slotAssigned && (
              <>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    setActionModal(false);
                    Alert.alert('Assign Days', 'Assign Days endpoint not yet confirmed.');
                  }}
                >
                  <Icon name="calendar-check" size={18} color="#1565C0" />
                  <Text style={[styles.actionItemText, { color: '#1565C0' }]}>Assign Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    setActionModal(false);
                    Alert.alert('Free Time', 'Free Time endpoint not yet confirmed.');
                  }}
                >
                  <Icon name="clock-remove-outline" size={18} color="#F57C00" />
                  <Text style={[styles.actionItemText, { color: '#F57C00' }]}>Free Time</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[styles.actionItem, { borderBottomWidth: 0 }]}
              onPress={() => { setActionModal(false); if (actionRow) handleDelete(actionRow); }}
            >
              <Icon name="delete-outline" size={18} color={R} />
              <Text style={[styles.actionItemText, { color: R }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default SPTList;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },

  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  limitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FAFAFA', minWidth: 70,
  },
  limitText: { fontSize: 13, color: '#333' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: R, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7,
  },
  pdfBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 30, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 9 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center' },
  actionCell: { alignItems: 'center', justifyContent: 'center' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  pageEdge: { fontSize: 12, fontWeight: '700', color: R },
  pageArrow: { fontSize: 16, fontWeight: '700', color: R, paddingHorizontal: 4 },
  pageDisabled: { color: '#BBB' },
  pageNumScroll: { flexGrow: 0, maxWidth: 220 },
  pageNum: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  pageNumActive: { backgroundColor: R, borderColor: R },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '60%' },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },

  actionBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '75%' },
  actionTitle: { fontWeight: '700', fontSize: 14, marginBottom: 12, color: '#222' },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  actionItemText: { fontSize: 14, fontWeight: '600' },
});
