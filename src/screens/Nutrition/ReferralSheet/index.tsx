import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal, ScrollView, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { RootState } from '../../../redux/store';
import {
  getReferrals, addReferral, updateReferral, deleteReferral, getReferralTrainers,
} from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const display = (s?: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const longDisplay = (s?: string) => {
  if (!s) return '—';
  const date = new Date(s.split('T')[0]);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const staffName = (p?: { first_name?: string; last_name?: string } | null) =>
  p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || '—' : '—';

const today = fmt(new Date());

const ReferralSheet = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [weekStart, setWeekStart] = useState(today);
  const [weekEnd, setWeekEnd] = useState(today);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [trainers, setTrainers] = useState<{ id: number; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [trainerDropOpen, setTrainerDropOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getReferrals({ branch_id: branchId, week_start: weekStart, week_end: weekEnd });
      const data = res.data?.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, weekStart, weekEnd]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getReferralTrainers({ branch_id: branchId })
      .then(res => setTrainers(res.data?.data ?? []))
      .catch(() => setTrainers([]));
  }, [branchId]);

  const handlePickerConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'start') { setWeekStart(iso); if (iso > weekEnd) setWeekEnd(iso); }
    else setWeekEnd(iso);
    setPickerFor(null);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      trainer_id: null, trainer_name: '',
      active_clients: '', referrals: '', transformations: '',
      asked_for_google_review: false, asked_for_video_shoot: false, remarks: '',
    });
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      trainer_id: item.trainer_id, trainer_name: staffName(item.trainer),
      active_clients: String(item.active_clients ?? ''),
      referrals: String(item.referrals ?? ''),
      transformations: String(item.transformations ?? ''),
      asked_for_google_review: !!item.asked_for_google_review,
      asked_for_video_shoot: !!item.asked_for_video_shoot,
      remarks: item.remarks ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        active_clients: form.active_clients === '' ? undefined : Number(form.active_clients),
        referrals: form.referrals === '' ? undefined : Number(form.referrals),
        transformations: form.transformations === '' ? undefined : Number(form.transformations),
        asked_for_google_review: !!form.asked_for_google_review,
        asked_for_video_shoot: !!form.asked_for_video_shoot,
        remarks: form.remarks || undefined,
      };
      if (editing) {
        await updateReferral(editing.id, payload);
      } else {
        if (!form.trainer_id) { Alert.alert('Select Trainer', 'Please select a trainer.'); setSaving(false); return; }
        await addReferral({ branch_id: branchId, week_start: weekStart, week_end: weekEnd, trainer_id: form.trainer_id, ...payload });
      }
      setModalOpen(false);
      load();
    } catch {
      Alert.alert('Error', 'Could not save the record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: any) => {
    Alert.alert('Delete Record', `Remove referral record for ${staffName(item.trainer)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteReferral(item.id); load(); } catch { Alert.alert('Error', 'Could not delete the record.'); }
      } },
    ]);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.indexBox}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
        <Text style={styles.trainerName}>{staffName(item.trainer)}</Text>
        <View style={styles.actionBtns}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
            <Icon name="pencil-outline" size={16} color="#1E88E5" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => remove(item)}>
            <Icon name="trash-can-outline" size={16} color="#E63946" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Active Clients</Text>
          <Text style={styles.gridValue}>{item.active_clients ?? 0}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Referrals</Text>
          <Text style={[styles.gridValue, styles.referralValue]}>{item.referrals ?? 0}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Transformations</Text>
          <Text style={styles.gridValue}>{item.transformations ?? 0}</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.checkBadge, item.asked_for_google_review && styles.checkBadgeActive]}>
          <Icon name={item.asked_for_google_review ? 'check-circle' : 'circle-outline'} size={14} color={item.asked_for_google_review ? '#43A047' : '#bbb'} />
          <Text style={styles.checkLabel}>Google Review</Text>
        </View>
        <View style={[styles.checkBadge, item.asked_for_video_shoot && styles.checkBadgeActive]}>
          <Icon name={item.asked_for_video_shoot ? 'check-circle' : 'circle-outline'} size={14} color={item.asked_for_video_shoot ? '#43A047' : '#bbb'} />
          <Text style={styles.checkLabel}>Video Shoot</Text>
        </View>
      </View>

      {item.remarks ? (
        <View style={styles.textRow}>
          <Text style={styles.gridLabel}>Remarks</Text>
          <Text style={styles.textValue}>{item.remarks}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Referral Sheet"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        {/* Week range */}
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Week Start</Text>
            <TouchableOpacity style={styles.dateBox} onPress={() => setPickerFor('start')}>
              <Text style={styles.dateText}>{display(weekStart)}</Text>
              <Icon name="calendar" size={16} color="#888" />
            </TouchableOpacity>
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Week End</Text>
            <TouchableOpacity style={styles.dateBox} onPress={() => setPickerFor('end')}>
              <Text style={styles.dateText}>{display(weekEnd)}</Text>
              <Icon name="calendar" size={16} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <Icon name="calendar-range" size={16} color="#FFF" />
            <Text style={styles.bannerText}>{longDisplay(weekStart)} – {longDisplay(weekEnd)}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Icon name="plus" size={14} color="#1A1A1A" />
            <Text style={styles.addBtnText}>Add to this week</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 30 }} />
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="account-multiple-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptyText}>Try a different week or add a record.</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          />
        )}
      </View>

      <DateTimePickerModal
        isVisible={pickerFor !== null}
        mode="date"
        date={new Date(pickerFor === 'start' ? weekStart : weekEnd)}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerFor(null)}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Referral Record' : 'Add Referral Record'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Icon name="close" size={22} color="#999" />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {!editing && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.fieldLabel}>Trainer</Text>
                  <TouchableOpacity style={styles.dropdown} onPress={() => setTrainerDropOpen(v => !v)}>
                    <Text style={styles.dropdownText}>{form.trainer_name || 'Select trainer'}</Text>
                    <Icon name={trainerDropOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
                  </TouchableOpacity>
                  {trainerDropOpen && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView style={{ maxHeight: 180 }}>
                        {trainers.map(t => (
                          <TouchableOpacity
                            key={t.id}
                            style={styles.dropdownItem}
                            onPress={() => { setForm((f: any) => ({ ...f, trainer_id: t.id, trainer_name: t.name })); setTrainerDropOpen(false); }}
                          >
                            <Text style={styles.dropdownItemText}>{t.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>Active Clients</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.active_clients} onChangeText={(v) => setForm((f: any) => ({ ...f, active_clients: v }))} />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>Referrals</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.referrals} onChangeText={(v) => setForm((f: any) => ({ ...f, referrals: v }))} />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>Transformations</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.transformations} onChangeText={(v) => setForm((f: any) => ({ ...f, transformations: v }))} />
                </View>
              </View>

              <View style={styles.toggleRow}>
                <TouchableOpacity style={styles.toggleItem} onPress={() => setForm((f: any) => ({ ...f, asked_for_google_review: !f.asked_for_google_review }))}>
                  <Icon name={form.asked_for_google_review ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={form.asked_for_google_review ? '#43A047' : '#999'} />
                  <Text style={styles.toggleLabel}>Google Review</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toggleItem} onPress={() => setForm((f: any) => ({ ...f, asked_for_video_shoot: !f.asked_for_video_shoot }))}>
                  <Icon name={form.asked_for_video_shoot ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={form.asked_for_video_shoot ? '#43A047' : '#999'} />
                  <Text style={styles.toggleLabel}>Video Shoot</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.remarks}
                onChangeText={(v) => setForm((f: any) => ({ ...f, remarks: v }))}
                multiline
              />
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  dateRow:      { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dateField:    { flex: 1 },
  fieldLabel:   { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6 },
  dateBox:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 13, color: '#1A1A1A' },

  banner:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2F6F4F', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  bannerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerText:   { color: '#FFF', fontSize: 13, fontWeight: '700' },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText:   { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },

  card:         { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  indexBox:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  indexText:    { fontSize: 12, fontWeight: '700', color: '#888' },
  trainerName:  { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  actionBtns:   { flexDirection: 'row', gap: 8 },
  iconBtn:      { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },

  grid:         { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  gridItem:     { width: '33%', paddingVertical: 5, paddingRight: 6 },
  gridLabel:    { fontSize: 11, color: '#999', marginBottom: 2 },
  gridValue:    { fontSize: 14, color: '#1A1A1A', fontWeight: '700' },
  referralValue: { color: '#1E88E5' },

  badgeRow:     { flexDirection: 'row', gap: 8, marginTop: 4 },
  checkBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F5F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  checkBadgeActive: { backgroundColor: '#E8F5E9' },
  checkLabel:   { fontSize: 11, fontWeight: '600', color: '#555' },

  textRow:      { marginTop: 8 },
  textValue:    { fontSize: 13, color: '#1A1A1A' },

  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:    { fontSize: 13, color: '#999' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '85%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle:   { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },

  dropdown:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dropdownText: { fontSize: 13, color: '#1A1A1A' },
  dropdownMenu: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },

  inputRow:     { flexDirection: 'row', gap: 8, marginBottom: 10 },
  inputCol:     { flex: 1 },
  input:        { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  textarea:     { height: 70, textAlignVertical: 'top', marginBottom: 14 },

  toggleRow:    { flexDirection: 'row', gap: 16, marginBottom: 10 },
  toggleItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleLabel:  { fontSize: 13, color: '#333', fontWeight: '600' },

  saveBtn:      { backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText:  { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default ReferralSheet;
