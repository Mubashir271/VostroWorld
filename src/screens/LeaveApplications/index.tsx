import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import { showSnackbar } from '../../redux/slices/snackbarSlice';
import {
  getLeaveQuota,
  getLeaveApplications,
  checkLeaveExists,
  checkLeaveEligibility,
  checkLeaveAvailability,
  submitLeaveApplication,
} from '../../api/employeeDashboard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuotaItem {
  leave_type: string;
  total_leaves: number;
  used_leaves: number;
  remaining_leaves: number;
}

interface ApplicationItem {
  id: number;
  leave_type: string;
  leave_status: string;
  application_status: string;
  from: string;
  to: string;
  number_of_leaves: number;
  reason?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES = ['Annual', 'Casual', 'Medical', 'Sick', 'Maternity', 'Paternity'];
const CATEGORIES  = ['Full', 'Half'] as const;

const APP_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending:  { bg: '#FFF3E0', text: '#E65100' },
  Approved: { bg: '#E6F4EA', text: '#2E7D32' },
  Rejected: { bg: '#FFEBEE', text: '#C62828' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
};

const countDays = (from: string, to: string, category: 'Full' | 'Half') => {
  const diff = (new Date(to).getTime() - new Date(from).getTime()) / 86400000 + 1;
  const days = Math.max(1, diff);
  return category === 'Half' ? 0.5 : days;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const LeaveApplications = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch<any>();
  const { profile } = useSelector((state: RootState) => state.user);

  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;
  const userId   = profile?.id ?? profile?.user_id;

  // ── Data state ──────────────────────────────────────────────────────────────
  const [quotas, setQuotas]       = useState<QuotaItem[]>([]);
  const [history, setHistory]     = useState<ApplicationItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [leaveType,   setLeaveType]   = useState('Annual');
  const [category,    setCategory]    = useState<'Full' | 'Half'>('Full');
  const [fromDate,    setFromDate]    = useState(fmt(new Date()));
  const [toDate,      setToDate]      = useState(fmt(new Date()));
  const [reason,      setReason]      = useState('');
  const [pickerFor,   setPickerFor]   = useState<'from' | 'to' | null>(null);
  const [showTypes,   setShowTypes]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  // ── Load quota + history ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoadingData(true);
    try {
      const [qData, hData] = await Promise.all([
        getLeaveQuota({ branch_id: branchId, user_id: userId, limit: 20 }),
        getLeaveApplications({ branch_id: branchId, user_id: userId, limit: 20 }),
      ]);
      setQuotas(qData?.data?.data ?? qData?.data ?? []);
      setHistory(hData?.data?.data ?? hData?.data ?? []);
    } catch {
      // quota fetch failure is non-blocking
    } finally {
      setLoadingData(false);
    }
  }, [branchId, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!reason.trim()) {
      dispatch(showSnackbar({ message: 'Please enter a reason for leave.', type: 'error' }));
      return;
    }
    const numberOfLeaves = countDays(fromDate, toDate, category);
    setSubmitting(true);
    try {
      // Step 1 — check overlap
      await checkLeaveExists({ user_id: userId, from: fromDate, to: toDate, leave_type: leaveType, number_of_leaves: numberOfLeaves });

      // Step 2 — check probation
      await checkLeaveEligibility({ user_id: userId, date: fromDate });

      // Step 3 — check quota
      await checkLeaveAvailability({ user_id: userId, leave_type: leaveType, number_of_leaves: numberOfLeaves });

      // Submit
      await submitLeaveApplication({
        branch_id: branchId,
        user_id: userId,
        leave_status: 'Leave',
        leave_type: leaveType,
        category,
        from: fromDate,
        to: toDate,
        number_of_leaves: numberOfLeaves,
        reason,
      });

      dispatch(showSnackbar({ message: 'Leave request submitted successfully!', type: 'success' }));
      setReason('');
      loadData();
    } catch (e: any) {
      const status  = e?.response?.status;
      const message = e?.response?.data?.message;
      if (status === 409) {
        dispatch(showSnackbar({ message: message ?? 'Leave conflict — overlapping dates or quota exceeded.', type: 'error' }));
      } else {
        dispatch(showSnackbar({ message: message ?? 'Failed to submit leave request.', type: 'error' }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'from') { setFromDate(iso); if (iso > toDate) setToDate(iso); }
    else setToDate(iso);
    setPickerFor(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <AppHeader
        title="Leave Applications"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Request Leave Form ─────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>APPLY</Text>
            </View>
            <Text style={styles.cardTitle}>Request Leave</Text>
            <Text style={styles.cardSubtitle}>
              Submit a leave request and the system will validate quota and eligibility before saving it.
            </Text>

            {/* Leave Type */}
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypes(v => !v)}>
              <Text style={styles.dropdownText}>{leaveType}</Text>
              <Icon name={showTypes ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            </TouchableOpacity>
            {showTypes && (
              <View style={styles.dropdownList}>
                {LEAVE_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.dropdownItem, leaveType === t && styles.dropdownItemActive]}
                    onPress={() => { setLeaveType(t); setShowTypes(false); }}
                  >
                    <Text style={[styles.dropdownItemText, leaveType === t && styles.dropdownItemTextActive]}>{t}</Text>
                    {leaveType === t && <Icon name="check" size={16} color="#E63946" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Category */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Day Type</Text>
            <View style={styles.segmentRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.segment, category === c && styles.segmentActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.segmentText, category === c && styles.segmentTextActive]}>
                    {c} Day
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dates */}
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Start Date</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerFor('from')}>
                  <Icon name="calendar" size={15} color="#E63946" />
                  <Text style={styles.dateBtnText}>{display(fromDate)}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>End Date</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerFor('to')}>
                  <Icon name="calendar" size={15} color="#E63946" />
                  <Text style={styles.dateBtnText}>{display(toDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.daysHint}>
              {countDays(fromDate, toDate, category)} day{countDays(fromDate, toDate, category) !== 1 ? 's' : ''} selected
            </Text>

            {/* Reason */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Reason for Leave</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for leave"
              placeholderTextColor="#AAA"
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
              {submitting
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitBtnText}>Submit Leave Request</Text>
              }
            </TouchableOpacity>
          </View>

          {/* ── Leave Quota Summary ────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>LEAVE SUMMARY</Text>
            </View>
            <Text style={styles.cardTitle}>Quota and Recent Applications</Text>
            <Text style={styles.cardSubtitle}>
              Track remaining quota and see the status of your recent leave applications.
            </Text>

            {loadingData ? (
              <ActivityIndicator color="#E63946" style={{ marginVertical: 16 }} />
            ) : quotas.length > 0 ? (
              quotas.map(q => (
                <View key={q.leave_type} style={styles.quotaRow}>
                  <View>
                    <Text style={styles.quotaType}>{q.leave_type}</Text>
                    <Text style={styles.quotaTaken}>
                      Taken: {q.used_leaves ?? 0} of {q.total_leaves ?? 0}
                    </Text>
                  </View>
                  <View style={styles.quotaBadge}>
                    <Text style={styles.quotaBadgeText}>{q.remaining_leaves ?? 0} LEFT</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No quota data available.</Text>
            )}
          </View>

          {/* ── Application History ────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Application History</Text>
            <Text style={styles.cardSubtitle}>Recent leave applications with their current approval status.</Text>

            {loadingData ? (
              <ActivityIndicator color="#E63946" style={{ marginVertical: 16 }} />
            ) : history.length > 0 ? (
              history.map(app => {
                const colors = APP_STATUS_COLORS[app.application_status] ?? APP_STATUS_COLORS.Pending;
                return (
                  <View key={app.id} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyType}>{app.leave_type}</Text>
                      <Text style={styles.historyDates}>
                        {display(app.from)} → {display(app.to)}  ·  {app.number_of_leaves} day{app.number_of_leaves !== 1 ? 's' : ''}
                      </Text>
                      {app.reason ? <Text style={styles.historyReason} numberOfLines={1}>{app.reason}</Text> : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                        {app.application_status}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxTitle}>No leave applications yet</Text>
                <Text style={styles.emptyText}>Apply for leave from the form above.</Text>
              </View>
            )}
          </View>

        </ScrollView>
      </View>

      <DateTimePickerModal
        isVisible={pickerFor !== null}
        mode="date"
        date={new Date(pickerFor === 'from' ? fromDate : toDate)}
        minimumDate={pickerFor === 'to' ? new Date(fromDate) : undefined}
        maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerFor(null)}
      />
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PRIMARY = '#E63946';
const BG      = '#F9F9FB';
const CARD    = '#FFFFFF';
const BORDER  = '#EFEFEF';
const TEXT    = '#1A1A1A';
const MUTED   = '#999';
const MID     = '#555';

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBadge:     { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  cardBadgeText: { fontSize: 11, fontWeight: '700', color: '#2E7D32', letterSpacing: 0.5 },
  cardTitle:     { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 4 },
  cardSubtitle:  { fontSize: 13, color: MID, marginBottom: 14, lineHeight: 18 },

  // ── Form ──
  fieldLabel: { fontSize: 13, fontWeight: '600', color: MID, marginBottom: 6 },

  dropdown:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12, backgroundColor: '#FAFAFA' },
  dropdownText:     { fontSize: 14, color: TEXT },
  dropdownList:     { borderWidth: 1, borderColor: BORDER, borderRadius: 8, marginTop: 4, overflow: 'hidden', backgroundColor: CARD },
  dropdownItem:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  dropdownItemActive:    { backgroundColor: '#FFF5F5' },
  dropdownItemText:      { fontSize: 14, color: MID },
  dropdownItemTextActive:{ color: PRIMARY, fontWeight: '600' },

  segmentRow:        { flexDirection: 'row', gap: 10 },
  segment:           { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#FAFAFA' },
  segmentActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  segmentText:       { fontSize: 14, color: MID, fontWeight: '500' },
  segmentTextActive: { color: '#FFF', fontWeight: '700' },

  dateRow:    { flexDirection: 'row', gap: 10, marginTop: 14 },
  dateField:  { flex: 1 },
  dateBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateBtnText:{ fontSize: 14, color: TEXT, fontWeight: '500' },
  daysHint:   { fontSize: 12, color: PRIMARY, fontWeight: '600', marginTop: 6, textAlign: 'right' },

  reasonInput: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12,
    fontSize: 14, color: TEXT, minHeight: 90, backgroundColor: '#FAFAFA', marginBottom: 14,
  },

  submitBtn:     { backgroundColor: TEXT, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // ── Quota ──
  quotaRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 14, marginBottom: 10 },
  quotaType:       { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  quotaTaken:      { fontSize: 12, color: MUTED },
  quotaBadge:      { backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  quotaBadgeText:  { fontSize: 13, fontWeight: '700', color: '#2E7D32' },

  // ── History ──
  historyRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingVertical: 12 },
  historyLeft:   { flex: 1, marginRight: 10 },
  historyType:   { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  historyDates:  { fontSize: 12, color: MID, marginBottom: 2 },
  historyReason: { fontSize: 12, color: MUTED },
  statusBadge:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText:{ fontSize: 12, fontWeight: '700' },

  emptyBox:      { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 20, alignItems: 'center', marginTop: 4 },
  emptyBoxTitle: { fontSize: 14, fontWeight: '700', color: MID, marginBottom: 4 },
  emptyText:     { fontSize: 13, color: MUTED, textAlign: 'center' },
});

export default LeaveApplications;
