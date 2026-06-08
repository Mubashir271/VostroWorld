import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrainerClients } from '../../redux/slices/trainerSlice';
import { RootState } from '../../redux/store';
import AppHeader from '../../components/AppHeader';

const TrainerHome = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const { clients, loading } = useSelector((state: RootState) => state.trainer);

  const loadClients = useCallback(() => {
    dispatch(fetchTrainerClients({ check_date: new Date().toISOString().split('T')[0] }) as any);
  }, [dispatch]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleMarkAttendance = (client: any) => {
    navigation.navigate('MarkAttendance', { client });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="My Clients" />

      <FlatList
        data={clients?.data || []}
        keyExtractor={(item) => item.order_id.toString()}
        refreshControl={<RefreshControl refreshing={loading.clients} onRefresh={loadClients} />}
        renderItem={({ item }) => (
          <View style={styles.clientCard}>
            <View style={styles.info}>
              <Text style={styles.clientName}>{item.client_name}</Text>
              <Text style={styles.package}>{item.package_name}</Text>
              <Text style={styles.sessions}>
                {item.sessions_delivered}/{item.total_sessions} sessions
              </Text>
            </View>

            <TouchableOpacity
              style={styles.markBtn}
              onPress={() => handleMarkAttendance(item)}
            >
              <Text style={styles.markBtnText}>Mark</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No clients scheduled today</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  clientCard: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: { flex: 1 },
  clientName: { fontSize: 18, fontWeight: '700' },
  package: { color: '#666', marginVertical: 4 },
  sessions: { color: '#0284c7', fontWeight: '600' },
  markBtn: {
    backgroundColor: '#E10600',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  markBtnText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 50, color: '#666' },
});

export default TrainerHome;