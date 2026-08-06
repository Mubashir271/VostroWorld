import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getStaffList } from '../../../api/employeeDashboard';

// Confirmed live 2026-06-25: "All GX Trainer" is just the staff list
// filtered to `is_gx_trainer == 1` (3 of 90 staff on branch 15, exact match
// to the web admin's table incl. uid/name/order). No dedicated GX-trainers
// endpoint exists. The write side (toggling `is_gx_trainer` via staff
// update) is unconfirmed — `/v1/auth/update/{id}` is documented to accept
// cnic/email/phone/address/password/file/image_upload_from, not this field,
// so Add/Remove are gated off pending confirmation.
const ADD_ENABLED = false;

interface Staff { id: number; name: string; uid?: string; is_gx_trainer?: number; status?: string; }

const GXTrainers = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const branchName = profile?.branchName ?? 'Branch';

  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffModal, setStaffModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getStaffList({ branch_id: branchId, limit: 500 });
      const list: Staff[] = res?.data?.data ?? res?.data ?? [];
      setAllStaff(Array.isArray(list) ? list : []);
    } catch {
      setError('Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const gxTrainers = allStaff.filter(s => Number(s.is_gx_trainer) === 1);
  const nonGxStaff = allStaff.filter(s => Number(s.is_gx_trainer) !== 1);

  const handleAdd = () => {
    if (!ADD_ENABLED || !staffId) {
      Alert.alert('Not Yet Enabled', 'Toggling GX trainer status needs backend confirmation before going live.');
      return;
    }
  };

  const handleRemove = () => {
    Alert.alert('Not Yet Enabled', 'Toggling GX trainer status needs backend confirmation before going live.');
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="GX Trainers"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add GX Trainer</Text>
          <Text style={styles.hint}>! The Fields With *Must Required Or Fill.</Text>
          {!ADD_ENABLED && (
            <Text style={styles.disabledNote}>
              Adding/removing GX trainers is temporarily disabled while the API contract is confirmed.
            </Text>
          )}

          {!!error && <Text style={styles.errText}>{error}</Text>}

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Branch Name *</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Available Trainers *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setStaffModal(true)}>
                <Text style={staffName ? styles.pickerText : styles.placeholder}>
                  {staffName || 'Select Trainer'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.addBtn, !ADD_ENABLED && styles.addBtnDisabled]} onPress={handleAdd}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>All GX Trainer</Text>
          {loading
            ? <ActivityIndicator color="#C62828" style={{ marginVertical: 30 }} />
            : gxTrainers.length === 0
              ? <Text style={styles.emptyText}>No Record Found</Text>
              : (
                <View>
                  <View style={styles.thead}>
                    <Text style={[styles.th, { width: 40 }]}>#</Text>
                    <Text style={[styles.th, { flex: 1 }]}>Trainer id</Text>
                    <Text style={[styles.th, { flex: 1.4 }]}>Trainer Name</Text>
                    <Text style={[styles.th, { width: 80 }]}>Status</Text>
                    <Text style={[styles.th, { width: 80 }]}>Actions</Text>
                  </View>
                  {gxTrainers.map((s, i) => (
                    <View key={s.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                      <Text style={[styles.td, { width: 40 }]}>{i + 1}</Text>
                      <Text style={[styles.td, { flex: 1 }]}>{s.uid ?? '-'}</Text>
                      <Text style={[styles.td, { flex: 1.4, textAlign: 'left' }]}>{s.name}</Text>
                      <View style={[styles.td, { width: 80 }]}>
                        <View style={[styles.badge, String(s.status) === '1' ? styles.badgeActive : styles.badgeInactive]}>
                          <Text style={[styles.badgeText, String(s.status) !== '1' && { color: '#C62828' }]}>
                            {String(s.status) === '1' ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.td, { width: 80 }]}>
                        <TouchableOpacity onPress={handleRemove}>
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )
          }
        </View>
      </ScrollView>

      <Modal visible={staffModal} transparent animationType="fade" onRequestClose={() => setStaffModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStaffModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Trainer</Text>
            <ScrollView>
              {nonGxStaff.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.dropdownItem}
                  onPress={() => { setStaffId(String(s.id)); setStaffName(s.name); setStaffModal(false); }}
                >
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

export default GXTrainers;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  hint: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  disabledNote: {
    fontSize: 12, color: '#E65100', backgroundColor: '#FFF3E0',
    borderRadius: 6, padding: 10, marginBottom: 14, fontWeight: '500',
  },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  col2: { flex: 1 },
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

  addBtn: { backgroundColor: R, borderRadius: 6, alignItems: 'center', paddingVertical: 11 },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 12, paddingHorizontal: 6, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 6, textAlign: 'center', alignSelf: 'center' },

  badge: { borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'center' },
  badgeActive: { backgroundColor: '#E8F5E9' },
  badgeInactive: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  removeText: { color: '#C62828', fontWeight: '700', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
