import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrainerCommission } from '../../redux/slices/trainerSlice';
import { RootState } from '../../redux/store';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const TrainerCommission = () => {
  const dispatch = useDispatch<any>();
  const { commission, loading } = useSelector((state: RootState) => state.trainer);
  const navigation = useNavigation();

  useEffect(() => {
    dispatch(fetchTrainerCommission({}));
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="My Commission"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications' as never)}
        backgroundColor="#FFE5E5"
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading.commission} onRefresh={() => dispatch(fetchTrainerCommission({}))} />
        }
      >
        <View style={styles.card}>
          <Text style={styles.period}>
            {commission?.period?.start_date} — {commission?.period?.end_date}
          </Text>

          <Text style={styles.grandTotal}>
            PKR {commission?.commission?.grand_total?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.label}>Total Commission</Text>

          <View style={styles.statsGrid}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{commission?.session_stats?.delivered || 0}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{commission?.session_stats?.client_no_show || 0}</Text>
              <Text style={styles.statLabel}>Client No-Show</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{commission?.session_stats?.trainer_no_show || 0}</Text>
              <Text style={styles.statLabel}>My No-Show</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  card: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 16, elevation: 3 },
  period: { textAlign: 'center', color: '#64748b', marginBottom: 8 },
  grandTotal: { fontSize: 42, fontWeight: '700', textAlign: 'center', color: '#E10600' },
  label: { textAlign: 'center', fontSize: 16, color: '#475569', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 13, color: '#64748b' },
});

export default TrainerCommission;