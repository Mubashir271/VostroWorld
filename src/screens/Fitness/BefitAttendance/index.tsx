import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  getBefitAttendanceTrainers,
  getBefitTrainerPackages,
  getBefitAttendance,
  addBefitAttendance,
} from '../../../api/employeeDashboard';

interface Trainer { id: number; name: string; }
interface Package { id: number; name: string; }
interface AttendanceRow {
  id: number;
  trainer_name?: string;
  client_name?: string;
  package_name?: string;
  trainer_attendance?: string;
  client_attendance?: string;
  date?: string;
}

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}/${y}`;
};
const fmtApi = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const displayDate = (iso?: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};
const todayDisplay = () => fmt(new Date());
const todayApi = () => fmtApi(new Date());

const TRAINER_ATTENDANCE = ['Cancel', 'Delivered', 'No Show'];
const CLIENT_ATTENDANCE = ['No Show', 'Delivered', 'Cancel'];
const LIMITS = [25, 50, 100];

const COLS = [
  { key: 'sr', label: 'Sr#', width: 36 },
  { key: 'trainer', label: 'Trainer Name', width: 130 },
  { key: 'client', label: 'Client Name', width: 130 },
  { key: 'package', label: 'Package Name', width: 160 },
  { key: 'trainerAtt', label: 'Trainer Attendance', width: 110 },
  { key: 'clientAtt', label: 'Client Attendance', width: 110 },
  { key: 'date', label: 'Date', width: 90 },
  { key: 'actions', label: 'Actions', width: 80 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const DropdownModal = ({
  visible, title, items, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  items: { label: string; value: string }[];
  onSelect: (value: string, label: string) => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.dropdownBox}>
        <Text style={styles.dropdownTitle}>{title}</Text>
        <ScrollView>
          {items.map(item => (
            <TouchableOpacity
              key={item.value}
              style={styles.dropdownItem}
              onPress={() => { onSelect(item.value, item.label); onClose(); }}
            >
              <Text style={styles.dropdownItemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

const AttendanceTable = ({
  rows, loading, limit, trainers, onLimitChange, onTrainerChange, onPackageChange,
  trainerId, packageFilter, page, onPageChange, title,
}: {
  rows: AttendanceRow[];
  loading: boolean;
  limit: number;
  trainers: Trainer[];
  onLimitChange: (v: number) => void;
  onTrainerChange: (id: string, name: string) => void;
  onPackageChange: (v: string) => void;
  trainerId: string;
  packageFilter: string;
  page: number;
  onPageChange: (p: number) => void;
  title: string;
}) => {
  const [limitModal, setLimitModal] = useState(false);
  const [trainerModal, setTrainerModal] = useState(false);
  const [packageModal, setPackageModal] = useState(false);
  const [trainerName, setTrainerName] = useState('Select Trainer');

  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const pagedRows = rows.slice((page - 1) * limit, page * limit);

  const packages = [...new Set(rows.map(r => r.package_name).filter(Boolean))].map(p => ({ label: p!, value: p! }));

  return (
    <View style={[styles.card, { marginTop: 14 }]}>
      <Text style={styles.cardTitle}>{title}</Text>

      {title.startsWith('Active') && (
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.limitBtn} onPress={() => setLimitModal(true)}>
            <Text style={styles.limitText}>{limit}</Text>
            <Icon name="chevron-down" size={14} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setTrainerModal(true)}>
            <Text style={styles.filterBtnText} numberOfLines={1}>{trainerName}</Text>
            <Icon name="chevron-down" size={14} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setPackageModal(true)}>
            <Text style={styles.filterBtnText} numberOfLines={1}>{packageFilter || 'Select Package'}</Text>
            <Icon name="chevron-down" size={14} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfBtn}>
            <Icon name="file-pdf-box" size={14} color="#fff" />
            <Text style={styles.pdfBtnText}>PDF</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading
        ? <ActivityIndicator color={R} style={{ marginVertical: 30 }} />
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
                {pagedRows.map((r, i) => (
                  <View key={r.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.td, { width: COLS[0].width }]}>{(page - 1) * limit + i + 1}</Text>
                    <Text style={[styles.td, { width: COLS[1].width, textAlign: 'left' }]} numberOfLines={1}>{r.trainer_name ?? '-'}</Text>
                    <Text style={[styles.td, { width: COLS[2].width, textAlign: 'left' }]} numberOfLines={1}>{r.client_name ?? '-'}</Text>
                    <Text style={[styles.td, { width: COLS[3].width, textAlign: 'left' }]} numberOfLines={1}>{r.package_name ?? '-'}</Text>
                    <Text style={[styles.td, { width: COLS[4].width }]}>{r.trainer_attendance ?? '-'}</Text>
                    <Text style={[styles.td, { width: COLS[5].width }]}>{r.client_attendance ?? '-'}</Text>
                    <Text style={[styles.td, { width: COLS[6].width }]}>{displayDate(r.date)}</Text>
                    <Text style={[styles.td, { width: COLS[7].width, color: R, fontWeight: '700' }]}>Edit</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )
      }

      {!loading && rows.length > limit && (
        <View style={styles.pagination}>
          <TouchableOpacity disabled={page === 1} onPress={() => onPageChange(1)}>
            <Text style={[styles.pageEdgeText, page === 1 && styles.pageDisabled]}>First</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={page === 1} onPress={() => onPageChange(Math.max(1, page - 1))}>
            <Text style={[styles.pageArrow, page === 1 && styles.pageDisabled]}>‹</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumScroll}>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
              <TouchableOpacity key={n} onPress={() => onPageChange(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
                <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity disabled={page === totalPages} onPress={() => onPageChange(Math.min(totalPages, page + 1))}>
            <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabled]}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={page === totalPages} onPress={() => onPageChange(totalPages)}>
            <Text style={[styles.pageEdgeText, page === totalPages && styles.pageDisabled]}>Last</Text>
          </TouchableOpacity>
        </View>
      )}

      <DropdownModal
        visible={limitModal}
        title="Limit"
        items={LIMITS.map(l => ({ label: String(l), value: String(l) }))}
        onSelect={(v) => { onLimitChange(Number(v)); onPageChange(1); }}
        onClose={() => setLimitModal(false)}
      />
      <DropdownModal
        visible={trainerModal}
        title="Filter By Trainer"
        items={[{ label: 'All Trainers', value: '' }, ...trainers.map(t => ({ label: t.name, value: String(t.id) }))]}
        onSelect={(v, l) => { onTrainerChange(v, l); setTrainerName(l || 'Select Trainer'); onPageChange(1); }}
        onClose={() => setTrainerModal(false)}
      />
      <DropdownModal
        visible={packageModal}
        title="Filter By Package"
        items={[{ label: 'Select Package', value: '' }, ...packages]}
        onSelect={(v) => { onPackageChange(v); onPageChange(1); }}
        onClose={() => setPackageModal(false)}
      />
    </View>
  );
};

const BefitAttendance = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? 'Branch';

  // Form state
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerId, setTrainerId] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerModal, setTrainerModal] = useState(false);

  const [packages, setPackages] = useState<Package[]>([]);
  const [packageId, setPackageId] = useState('');
  const [packageName, setPackageName] = useState('');
  const [packageModal, setPackageModal] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const [time, setTime] = useState('');
  const [timeModal, setTimeModal] = useState(false);

  const [trainerAtt, setTrainerAtt] = useState('Cancel');
  const [trainerAttModal, setTrainerAttModal] = useState(false);

  const [clientAtt, setClientAtt] = useState('No Show');
  const [clientAttModal, setClientAttModal] = useState(false);

  const [date, setDate] = useState(todayDisplay());
  const [dateObj, setDateObj] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [packageErr, setPackageErr] = useState(false);
  const [timeErr, setTimeErr] = useState(false);

  // Active table state
  const [activeRows, setActiveRows] = useState<AttendanceRow[]>([]);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeLimit, setActiveLimit] = useState(25);
  const [activeTrainerId, setActiveTrainerId] = useState('');
  const [activePackage, setActivePackage] = useState('');
  const [activePage, setActivePage] = useState(1);

  // Inactive table state
  const [inactiveRows, setInactiveRows] = useState<AttendanceRow[]>([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [inactiveLimit, setInactiveLimit] = useState(25);
  const [inactivePage, setInactivePage] = useState(1);

  const loadTrainers = useCallback(async () => {
    try {
      const res = await getBefitAttendanceTrainers(branchId);
      const list = res?.data ?? [];
      setTrainers((Array.isArray(list) ? list : []).map((t: any) => ({
        id: t.id,
        name: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim(),
      })));
    } catch {}
  }, [branchId]);

  const loadActiveRows = useCallback(async () => {
    setActiveLoading(true);
    try {
      const res = await getBefitAttendance({ branch_id: branchId, status: 0, limit: 500 });
      const data: AttendanceRow[] = res?.data?.data ?? res?.data ?? [];
      setActiveRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 404 || s === 422) setActiveRows([]);
    } finally {
      setActiveLoading(false);
    }
  }, [branchId]);

  const loadInactiveRows = useCallback(async () => {
    setInactiveLoading(true);
    try {
      const res = await getBefitAttendance({ branch_id: branchId, status: 1, limit: 500 });
      const data: AttendanceRow[] = res?.data?.data ?? res?.data ?? [];
      setInactiveRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 404 || s === 422) setInactiveRows([]);
    } finally {
      setInactiveLoading(false);
    }
  }, [branchId]);

  useFocusEffect(useCallback(() => {
    loadTrainers();
    loadActiveRows();
    loadInactiveRows();
  }, [loadTrainers, loadActiveRows, loadInactiveRows]));

  const onTrainerSelect = async (id: string, name: string) => {
    setTrainerId(id);
    setTrainerName(name);
    setPackageId('');
    setPackageName('');
    setPackages([]);
    setTime('');
    if (!id) return;
    setPackagesLoading(true);
    try {
      const res = await getBefitTrainerPackages(Number(id));
      const list = res?.data ?? [];
      setPackages((Array.isArray(list) ? list : []).map((p: any) => ({
        id: p.id,
        name: p.package_name ?? p.name ?? String(p.id),
      })));
    } catch {}
    finally { setPackagesLoading(false); }
  };

  const filteredActive = activeRows.filter(r => {
    if (activeTrainerId && String(r.trainer_name) !== activeTrainerId) return false;
    if (activePackage && r.package_name !== activePackage) return false;
    return true;
  });

  useEffect(() => { setActivePage(1); }, [activeTrainerId, activePackage, activeRows]);

  const handleAdd = async () => {
    const pErr = !packageId;
    const tErr = !time;
    setPackageErr(pErr);
    setTimeErr(tErr);
    if (pErr || tErr || !trainerId) {
      setFormError('Please fill all required fields.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      await addBefitAttendance({
        branch_id: branchId,
        user_id: Number(trainerId),
        package_id: Number(packageId),
        time,
        trainer_attendance: trainerAtt,
        client_attendance: clientAtt,
        date: fmtApi(dateObj),
        type: 'Befit',
      });
      setTrainerId(''); setTrainerName('');
      setPackageId(''); setPackageName(''); setPackages([]);
      setTime('');
      setTrainerAtt('Cancel'); setClientAtt('No Show');
      setDate(todayDisplay()); setDateObj(new Date());
      setPackageErr(false); setTimeErr(false);
      await Promise.all([loadActiveRows(), loadInactiveRows()]);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to add attendance. Endpoint may not be confirmed yet.');
    } finally {
      setSubmitting(false);
    }
  };

  const timeItems = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM',
    '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
    '09:00 PM', '10:00 PM',
  ].map(t => ({ label: t, value: t }));

  return (
    <View style={styles.root}>
      <AppHeader
        title="Befit Attendance"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Add Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Befit Attendance</Text>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Branch Name*</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Trainer*</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTrainerModal(true)}>
                <Text style={trainerId ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                  {trainerName || 'Select Trainer'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Package*</Text>
              <TouchableOpacity
                style={[styles.picker, packageErr && styles.pickerErr]}
                onPress={() => { if (!trainerId) { setFormError('Please select a trainer first.'); return; } setPackageModal(true); }}
              >
                {packagesLoading
                  ? <ActivityIndicator size="small" color={R} style={{ flex: 1 }} />
                  : <Text style={packageId ? styles.pickerText : styles.placeholder} numberOfLines={1}>
                      {packageName || 'Select Package'}
                    </Text>
                }
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
              {packageErr && <Text style={styles.fieldErr}>Package is required</Text>}
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Time*</Text>
              <TouchableOpacity style={[styles.picker, timeErr && styles.pickerErr]} onPress={() => setTimeModal(true)}>
                <Text style={time ? styles.pickerText : styles.placeholder}>{time || 'Select Time'}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
              {timeErr && <Text style={styles.fieldErr}>Time is required</Text>}
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Trainer Attendance*</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setTrainerAttModal(true)}>
                <Text style={styles.pickerText}>{trainerAtt}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Client Attendance*</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setClientAttModal(true)}>
                <Text style={styles.pickerText}>{clientAtt}</Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Date*</Text>
          <TouchableOpacity style={[styles.picker, { marginBottom: 14 }]} onPress={() => setDatePickerVisible(true)}>
            <Text style={styles.pickerText}>{date}</Text>
            <Icon name="calendar" size={16} color="#666" />
          </TouchableOpacity>

          {!!formError && <Text style={styles.errText}>{formError}</Text>}

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.addBtnText}>Add</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Active table */}
        <AttendanceTable
          title="Active Befit Attendance"
          rows={filteredActive}
          loading={activeLoading}
          limit={activeLimit}
          trainers={trainers}
          onLimitChange={setActiveLimit}
          onTrainerChange={(id) => setActiveTrainerId(id)}
          onPackageChange={setActivePackage}
          trainerId={activeTrainerId}
          packageFilter={activePackage}
          page={activePage}
          onPageChange={setActivePage}
        />

        {/* Inactive table */}
        <AttendanceTable
          title="Inactive Befit Attendance"
          rows={inactiveRows}
          loading={inactiveLoading}
          limit={inactiveLimit}
          trainers={trainers}
          onLimitChange={setInactiveLimit}
          onTrainerChange={() => {}}
          onPackageChange={() => {}}
          trainerId=""
          packageFilter=""
          page={inactivePage}
          onPageChange={setInactivePage}
        />

      </ScrollView>

      <DateTimePickerModal
        isVisible={datePickerVisible}
        mode="date"
        date={dateObj}
        onConfirm={d => { setDateObj(d); setDate(fmt(d)); setDatePickerVisible(false); }}
        onCancel={() => setDatePickerVisible(false)}
      />

      <DropdownModal
        visible={trainerModal}
        title="Select Trainer"
        items={[{ label: 'Select Trainer', value: '' }, ...trainers.map(t => ({ label: t.name, value: String(t.id) }))]}
        onSelect={(v, l) => onTrainerSelect(v, l)}
        onClose={() => setTrainerModal(false)}
      />
      <DropdownModal
        visible={packageModal}
        title="Select Package"
        items={packages.map(p => ({ label: p.name, value: String(p.id) }))}
        onSelect={(v, l) => { setPackageId(v); setPackageName(l); setPackageErr(false); }}
        onClose={() => setPackageModal(false)}
      />
      <DropdownModal
        visible={timeModal}
        title="Select Time"
        items={timeItems}
        onSelect={(v) => { setTime(v); setTimeErr(false); }}
        onClose={() => setTimeModal(false)}
      />
      <DropdownModal
        visible={trainerAttModal}
        title="Trainer Attendance"
        items={TRAINER_ATTENDANCE.map(a => ({ label: a, value: a }))}
        onSelect={(v) => setTrainerAtt(v)}
        onClose={() => setTrainerAttModal(false)}
      />
      <DropdownModal
        visible={clientAttModal}
        title="Client Attendance"
        items={CLIENT_ATTENDANCE.map(a => ({ label: a, value: a }))}
        onSelect={(v) => setClientAtt(v)}
        onClose={() => setClientAttModal(false)}
      />
    </View>
  );
};

export default BefitAttendance;

const R = '#C62828';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
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
    minHeight: 42,
  },
  pickerErr: { borderColor: R },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },
  fieldErr: { color: R, fontSize: 11, marginTop: 3, fontWeight: '500' },
  errText: { color: R, fontSize: 13, marginBottom: 8, fontWeight: '500' },

  addBtn: {
    backgroundColor: '#1A1A1A', borderRadius: 6,
    alignItems: 'center', paddingVertical: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  limitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FAFAFA',
  },
  limitText: { fontSize: 13, color: '#333' },
  filterBtn: {
    flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#FAFAFA',
  },
  filterBtnText: { fontSize: 12, color: '#555', flex: 1 },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#C62828', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  pdfBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20, fontSize: 13 },

  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 5, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 5, textAlign: 'center', alignSelf: 'center' },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 14, flexWrap: 'wrap',
  },
  pageEdgeText: { fontSize: 12, fontWeight: '700', color: R },
  pageArrow: { fontSize: 16, fontWeight: '700', color: R, paddingHorizontal: 4 },
  pageDisabled: { color: '#BBB' },
  pageNumScroll: { flexGrow: 0, maxWidth: 220 },
  pageNum: {
    width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF',
    backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3,
  },
  pageNumActive: { backgroundColor: R, borderColor: R },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
