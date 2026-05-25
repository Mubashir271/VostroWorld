import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import { getMySalarySlip } from '../../api/employeeDashboard';

interface SlipData {
  id: number;
  name: string;
  uid: string;
  branch: string;
  department: string;
  designation: string;
  joining: string;
  salary: number;
  medical: number;
  fine: number;
  advance: number;
  reward: number;
  loan: number;
  cafe: number;
  detections: number;
  components_addition: number;
  components_deduction: number;
  commission: {
    commission_per: number;
    commission: number;
    pt_commission: number;
    gx_commission: number;
    total_delivered_sessions: number;
    total_payable_no_show_sessions: number;
  };
}

const fmt = (n: number) => `PKR ${Number(n || 0).toLocaleString()}`;

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: string }) => (
  <View style={styles.slipRow}>
    <Text style={styles.slipLabel}>{label}</Text>
    <Text style={[styles.slipValue, highlight ? { color: highlight } : {}]}>{value}</Text>
  </View>
);

const MySalarySlip = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;
  const userId = profile?.id ?? profile?.user_id;

  const [slip, setSlip] = useState<SlipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getMySalarySlip({ branch_id: branchId, user_id: userId });
      const data = res?.data;
      setSlip(Array.isArray(data) ? data[0] : data ?? null);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, userId]);

  useEffect(() => { load(); }, [load]);

  const net = slip
    ? (slip.salary || 0) +
      (slip.medical || 0) +
      (slip.reward || 0) +
      (slip.components_addition || 0) +
      (slip.commission?.commission || 0) -
      (slip.fine || 0) -
      (slip.advance || 0) -
      (slip.loan || 0) -
      (slip.detections || 0) -
      (slip.components_deduction || 0)
    : 0;

  return (
    <View style={styles.container}>
      <AppHeader
        title="My Salary Slip"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#E63946" />
          </View>
        ) : !slip ? (
          <View style={styles.center}>
            <Icon name="file-document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No salary slip available</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />
            }
          >
            {/* Header card */}
            <View style={styles.headerCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{slip.name?.[0] ?? '?'}</Text>
              </View>
              <Text style={styles.staffName}>{slip.name}</Text>
              <Text style={styles.staffMeta}>{slip.designation} · {slip.department}</Text>
              <Text style={styles.staffUid}>{slip.uid} · {slip.branch}</Text>
              <Text style={styles.joining}>Joined: {slip.joining}</Text>
            </View>

            {/* Earnings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Earnings</Text>
              <Row label="Base Salary" value={fmt(slip.salary)} />
              {slip.medical > 0 && <Row label="Medical Allowance" value={fmt(slip.medical)} />}
              {slip.reward > 0 && <Row label="Reward" value={fmt(slip.reward)} highlight="#2E7D32" />}
              {slip.components_addition > 0 && <Row label="Allowances" value={fmt(slip.components_addition)} />}
            </View>

            {/* Commission */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Commission ({slip.commission?.commission_per}%)</Text>
              <Row label="Total Commission" value={fmt(slip.commission?.commission)} highlight="#2E7D32" />
              {slip.commission?.pt_commission > 0 && <Row label="PT Commission" value={fmt(slip.commission.pt_commission)} />}
              {slip.commission?.gx_commission > 0 && <Row label="GX Commission" value={fmt(slip.commission.gx_commission)} />}
              <Row label="Sessions Delivered" value={String(slip.commission?.total_delivered_sessions || 0)} />
            </View>

            {/* Deductions */}
            {(slip.fine > 0 || slip.advance > 0 || slip.loan > 0 || slip.detections > 0 || slip.components_deduction > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Deductions</Text>
                {slip.fine > 0 && <Row label="Fine" value={`-${fmt(slip.fine)}`} highlight="#C62828" />}
                {slip.advance > 0 && <Row label="Advance" value={`-${fmt(slip.advance)}`} highlight="#C62828" />}
                {slip.loan > 0 && <Row label="Loan Installment" value={`-${fmt(slip.loan)}`} highlight="#C62828" />}
                {slip.detections > 0 && <Row label="Other Deductions" value={`-${fmt(slip.detections)}`} highlight="#C62828" />}
                {slip.components_deduction > 0 && <Row label="Component Deductions" value={`-${fmt(slip.components_deduction)}`} highlight="#C62828" />}
              </View>
            )}

            {/* Net Payable */}
            <View style={styles.netCard}>
              <Text style={styles.netLabel}>Net Payable</Text>
              <Text style={styles.netValue}>{fmt(net)}</Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8F9FA' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:    { color: '#999', marginTop: 12, fontSize: 14 },
  headerCard:   { backgroundColor: '#E63946', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  avatar:       { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:   { color: '#fff', fontWeight: '700', fontSize: 28 },
  staffName:    { fontSize: 20, fontWeight: '700', color: '#fff' },
  staffMeta:    { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  staffUid:     { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  joining:      { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  section:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#E63946', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  slipRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  slipLabel:    { fontSize: 14, color: '#555' },
  slipValue:    { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  netCard:      { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 24, alignItems: 'center' },
  netLabel:     { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  netValue:     { fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 4 },
});

export default MySalarySlip;
