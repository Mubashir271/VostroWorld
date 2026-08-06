import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrainerRoster } from '../../redux/slices/trainerSlice';
import { RootState } from '../../redux/store';
import AppHeader from '../../components/AppHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'Active',   value: 1 },
  { label: 'Expired',  value: 0 },
  { label: 'All',      value: undefined },
];

const COL = { client: 130, pkg: 90, paid: 100, renewal: 100, status: 80 };

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TrainerRoster = () => {
  const dispatch   = useDispatch<any>();
  const navigation = useNavigation();
  const { roster, loading } = useSelector((state: RootState) => state.trainer);
  const { profile } = useSelector((state: RootState) => state.user);

  const branchId  = profile?.branchId || '';
  const trainerId = profile?.id;
  const firstName = profile?.firstName ?? '';
  const lastName  = profile?.lastName  ?? '';
  const trainerName = `${firstName} ${lastName}`.trim() || 'Trainer';

  const [packageStatus, setPackageStatus] = useState<number | undefined>(1);
  const [refreshing,    setRefreshing]    = useState(false);

  const load = useCallback((status?: number | undefined) => {
    dispatch(fetchTrainerRoster({
      branch_id:      branchId,
      trainer_id:     trainerId,
      package_status: status,
      limit:          50,
    }));
  }, [dispatch, branchId, trainerId]);

  useEffect(() => { load(packageStatus); }, [load, packageStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    load(packageStatus);
    setRefreshing(false);
  };

  const handleStatusChange = (val: number | undefined) => {
    setPackageStatus(val);
    load(val);
  };

  // Flatten all appointments from all trainer entries
  const trainerBlocks: any[] = roster?.data?.data ?? roster?.data ?? [];
  const totalRecords: number  = roster?.totalRecord ?? 0;

  const isLoading = loading?.roster;

  return (
    <>
      <AppHeader
        title="Personal Training Roster"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.screen}>

        {/* ── Filter bar ─────────────────────────────────────────────────────── */}
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>Package Status</Text>
          <View style={styles.pillRow}>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={String(opt.value)}
                style={[styles.pill, packageStatus === opt.value && styles.pillActive]}
                onPress={() => handleStatusChange(opt.value)}
              >
                <Text style={[styles.pillText, packageStatus === opt.value && styles.pillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {totalRecords > 0 && (
            <Text style={styles.totalLabel}>{totalRecords} record{totalRecords !== 1 ? 's' : ''}</Text>
          )}
        </View>

        {/* ── Loading ─────────────────────────────────────────────────────────── */}
        {isLoading && !refreshing && (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 40 }} />
        )}

        {/* ── Empty ───────────────────────────────────────────────────────────── */}
        {!isLoading && trainerBlocks.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Roster Data</Text>
            <Text style={styles.emptySubtitle}>No appointments found for the selected status.</Text>
          </View>
        )}

        {/* ── Roster ──────────────────────────────────────────────────────────── */}
        {!isLoading && trainerBlocks.length > 0 && (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E63946']} />}
          >
            {trainerBlocks.map((block: any) => {
              const name = block.Trainer_name ?? trainerName;
              const appointments: any[] = block.appointments ?? [];

              return (
                <View key={block.id} style={styles.block}>

                  {/* Trainer header row */}
                  <View style={styles.trainerHeader}>
                    <Icon name="account-tie" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.trainerHeaderText}>
                      Trainer Name: <Text style={{ fontWeight: '700' }}>{name}</Text>
                    </Text>
                  </View>

                  {appointments.length === 0 ? (
                    <View style={styles.noApptBox}>
                      <Text style={styles.noApptText}>No appointments</Text>
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View>

                        {/* Column headers */}
                        <View style={styles.tableHeader}>
                          <Text style={[styles.headerCell, { width: COL.client }]}>Client Name</Text>
                          <Text style={[styles.headerCell, { width: COL.pkg }]}>PT Package</Text>
                          <Text style={[styles.headerCell, { width: COL.paid }]}>Paid Date</Text>
                          <Text style={[styles.headerCell, { width: COL.renewal }]}>Renewal Date</Text>
                          <Text style={[styles.headerCell, { width: COL.status }]}>Status</Text>
                        </View>

                        {/* Rows */}
                        {appointments.map((appt: any, idx: number) => {
                          const isActive = (appt.status ?? appt.package_status ?? 'Active')
                            .toString().toLowerCase() !== 'expired';
                          return (
                            <View
                              key={appt.id ?? idx}
                              style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}
                            >
                              <Text style={[styles.cell, styles.clientCell, { width: COL.client }]} numberOfLines={1}>
                                {appt.client_name ?? '—'}
                              </Text>
                              <Text style={[styles.cell, { width: COL.pkg }]}>
                                {appt.package_name ?? appt.sessions ?? '—'}
                              </Text>
                              <Text style={[styles.cell, { width: COL.paid }]}>
                                {appt.paid_date ?? appt.start_date ?? '—'}
                              </Text>
                              <Text style={[styles.cell, { width: COL.renewal }]}>
                                {appt.renewal_date ?? appt.end_date ?? appt.expiry_date ?? '—'}
                              </Text>
                              <View style={{ width: COL.status, justifyContent: 'center' }}>
                                <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusExpired]}>
                                  <Text style={[styles.statusText, { color: isActive ? '#2E7D32' : '#C62828' }]}>
                                    {isActive ? 'Active' : 'Expired'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}

                      </View>
                    </ScrollView>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9F9FB' },

  // Filter bar
  filterBar:   { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EFEFEF', flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  pillRow:     { flexDirection: 'row', gap: 8 },
  pill:        { borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#FAFAFA' },
  pillActive:  { backgroundColor: '#E63946', borderColor: '#E63946' },
  pillText:    { fontSize: 13, color: '#555' },
  pillTextActive: { color: '#FFF', fontWeight: '600' },
  totalLabel:  { fontSize: 12, color: '#999', marginLeft: 'auto' },

  // Trainer block
  block: { marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  trainerHeader:     { backgroundColor: '#1A1A1A', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  trainerHeaderText: { fontSize: 14, color: '#FFF', fontWeight: '500', flex: 1 },

  // Table
  tableHeader:  { flexDirection: 'row', backgroundColor: '#E63946', paddingVertical: 10, paddingHorizontal: 12 },
  headerCell:   { fontSize: 12, fontWeight: '700', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow:     { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  tableRowAlt:  { backgroundColor: '#FAFAFA' },
  cell:         { fontSize: 13, color: '#1A1A1A' },
  clientCell:   { color: '#E63946', fontWeight: '500' },

  statusBadge:   { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusActive:  { backgroundColor: '#E6F4EA' },
  statusExpired: { backgroundColor: '#FFEBEE' },
  statusText:    { fontSize: 11, fontWeight: '700' },

  noApptBox:  { padding: 16, alignItems: 'center' },
  noApptText: { fontSize: 13, color: '#999' },

  // Empty
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  emptySubtitle:{ fontSize: 13, color: '#999', textAlign: 'center' },
});

export default TrainerRoster;
