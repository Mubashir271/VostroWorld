import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrainerHistory } from '../../redux/slices/trainerSlice';
import { RootState } from '../../redux/store';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';


const TrainerHistory = () => {
  const dispatch = useDispatch<any>();
  const { history } = useSelector((state: RootState) => state.trainer);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const loadHistory = useCallback(() => {
    dispatch(fetchTrainerHistory({ limit: 20 }));
  }, [dispatch]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Session History"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications' as never)}
        backgroundColor="#FFE5E5"
      />

      <FlatList
        data={history?.data || []}
        keyExtractor={(item: any) => item.id?.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.row}>
              <Text style={styles.client}>{item.client_name}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <Text style={styles.package}>{item.package_name}</Text>

            <View style={styles.statusRow}>
              <Text style={[styles.status, { color: item.staff_status === 'Delivered' ? '#10b981' : '#ef4444' }]}>
                {item.staff_status}
              </Text>
              <Text style={styles.slot}>{item.time_slot}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No session history found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  historyCard: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  client: { fontSize: 17, fontWeight: '700' },
  date: { color: '#64748b' },
  package: { color: '#0284c7', fontWeight: '600', marginBottom: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontWeight: '700' },
  slot: { color: '#f59e0b' },
  empty: { textAlign: 'center', marginTop: 50, color: '#666' },
});

export default TrainerHistory;