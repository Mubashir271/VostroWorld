import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../redux/store';
import { getHRDashboard } from '../../../api/employeeDashboard';

interface DeptSummary {
  department: string;
  total: number;
  f11?: number;
  g13?: number;
  roles?: string;
}

interface HRData {
  total_staff: number;
  f11_staff: number;
  g13_staff: number;
  present_today: number;
  absent_today: number;
  on_leave: number;
  departments: DeptSummary[];
}

const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) => (
  <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Icon name={icon} size={22} color={color} />
    </View>
    <View style={styles.statInfo}>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const HRDashboard = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [data, setData] = useState<HRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getHRDashboard({
        branch_id: branchId,
        date: new Date().toISOString().split('T')[0],
      });
      setData(res?.data ?? res ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const DEPT_COLORS = ['#E63946', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HR Dashboard</Text>
        <TouchableOpacity onPress={() => load(true)}>
          <Icon name="refresh" size={22} color="#E63946" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          {/* Staff Overview */}
          <Text style={styles.sectionTitle}>Staff Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="account-group" label="Total Staff" value={data?.total_staff ?? 85} color="#E63946" />
            <StatCard icon="office-building" label="F-11 Staff" value={data?.f11_staff ?? 59} color="#1E88E5" />
            <StatCard icon="office-building-outline" label="G-13 Staff" value={data?.g13_staff ?? 26} color="#43A047" />
          </View>

          {/* Today Attendance */}
          <Text style={styles.sectionTitle}>Today's Attendance</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="check-circle" label="Present" value={data?.present_today ?? '—'} color="#43A047" />
            <StatCard icon="close-circle" label="Absent" value={data?.absent_today ?? '—'} color="#E63946" />
            <StatCard icon="calendar-remove" label="On Leave" value={data?.on_leave ?? '—'} color="#FB8C00" />
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'account-multiple', label: 'View Staff', screen: 'ViewStaff' },
              { icon: 'cash-multiple', label: 'Salary', screen: 'SalaryManagement' },
              { icon: 'bank-transfer', label: 'Staff Loans', screen: 'StaffLoans' },
              { icon: 'account-alert', label: 'Fines & Advances', screen: 'StaffFinance' },
              { icon: 'calendar-check', label: 'Leave Apps', screen: 'LeaveApplications' },
              { icon: 'chart-bar', label: 'HR Report', screen: 'HRDashboard' },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.actionCard}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={styles.actionIcon}>
                  <Icon name={item.icon} size={24} color="#E63946" />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Department Summary */}
          {data?.departments?.length ? (
            <>
              <Text style={styles.sectionTitle}>Department Summary</Text>
              {data.departments.map((dept, i) => (
                <View key={dept.department} style={[styles.deptCard, { borderLeftColor: DEPT_COLORS[i % DEPT_COLORS.length], borderLeftWidth: 4 }]}>
                  <View style={styles.deptHeader}>
                    <Text style={styles.deptName}>{dept.department}</Text>
                    <View style={[styles.deptBadge, { backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] + '20' }]}>
                      <Text style={[styles.deptTotal, { color: DEPT_COLORS[i % DEPT_COLORS.length] }]}>{dept.total}</Text>
                    </View>
                  </View>
                  {dept.roles ? <Text style={styles.deptRoles}>{dept.roles}</Text> : null}
                  {(dept.f11 || dept.g13) ? (
                    <View style={styles.branchRow}>
                      {dept.f11 != null && <Text style={styles.branchChip}>F-11: {dept.f11}</Text>}
                      {dept.g13 != null && <Text style={styles.branchChip}>G-13: {dept.g13}</Text>}
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          ) : (
            <View style={styles.demoSection}>
              <Text style={styles.sectionTitle}>Department Summary</Text>
              {[
                { name: 'Fitness', total: 33, f11: 20, g13: 13, roles: 'Personal Trainer (26), General Trainer (7)' },
                { name: 'Housekeeping', total: 13, f11: 10, g13: 3, roles: 'Housekeeper (11), Supervisor (2)' },
                { name: 'Facility & Maintenance', total: 9, f11: 7, g13: 2, roles: 'Towel Counter (3), Electrician (2)' },
                { name: 'Sales', total: 8, f11: 5, g13: 3, roles: 'Sales Executive (8)' },
              ].map((dept, i) => (
                <View key={dept.name} style={[styles.deptCard, { borderLeftColor: DEPT_COLORS[i], borderLeftWidth: 4 }]}>
                  <View style={styles.deptHeader}>
                    <Text style={styles.deptName}>{dept.name}</Text>
                    <View style={[styles.deptBadge, { backgroundColor: DEPT_COLORS[i] + '20' }]}>
                      <Text style={[styles.deptTotal, { color: DEPT_COLORS[i] }]}>{dept.total}</Text>
                    </View>
                  </View>
                  <Text style={styles.deptRoles}>{dept.roles}</Text>
                  <View style={styles.branchRow}>
                    <Text style={styles.branchChip}>F-11: {dept.f11}</Text>
                    <Text style={styles.branchChip}>G-13: {dept.g13}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  scroll: { padding: 16, paddingBottom: 30 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 10, marginTop: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '28%', backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statInfo: {},
  statValue: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionCard: { width: '30%', backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  actionIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, color: '#555', textAlign: 'center', fontWeight: '600' },
  deptCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  deptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  deptName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  deptBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  deptTotal: { fontSize: 16, fontWeight: '800' },
  deptRoles: { fontSize: 12, color: '#888', marginBottom: 6 },
  branchRow: { flexDirection: 'row', gap: 8 },
  branchChip: { fontSize: 12, backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, color: '#555', fontWeight: '600' },
  demoSection: {},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default HRDashboard;
