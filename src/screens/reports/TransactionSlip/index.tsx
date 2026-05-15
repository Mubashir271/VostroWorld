import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getTransactionSlip } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';
import AppHeader from '../../../components/AppHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';


const TransactionSlipScreen = () => {
  const [slip, setSlip] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const navigation = useNavigation();

  const loadSlip = async () => {
    try {
      setLoading(true);
      const res = await getTransactionSlip(101);
      setSlip(res.data?.data ?? res.data ?? null);
    } catch (e) {
      setSlip(null);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  return (
    <>
      <AppHeader
        title="Transaction Slip"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <ScrollView style={slipStyles.container}>
        {/* <Text style={slipStyles.title}>Transaction Slip</Text> */}
        <TouchableOpacity style={slipStyles.btn} onPress={loadSlip} activeOpacity={0.8}>
          <Text style={slipStyles.btnText}>Load Slip</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} />}

        {!loading && loaded && !slip && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>Coming Soon</Text>
            <Text style={styles.emptySubtitle}>No slip data found for this order.</Text>
          </View>
        )}

        {!loading && slip && (
          <View style={slipStyles.card}>
            <Text style={slipStyles.json}>{JSON.stringify(slip, null, 2)}</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
};

const slipStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#111827' },
  btn: {
    backgroundColor: '#E10600', paddingVertical: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 16,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: '#fff', padding: 14, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  json: { fontSize: 12, color: '#374151', fontFamily: 'monospace' },
});

export default TransactionSlipScreen;