import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { getCafeReport } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';


const CafeReportScreen = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    const res = await getCafeReport({
      branch_id: 1,
      start_date: '2026-05-01',
      end_date: '2026-05-08',
    });

    // setData(res.data?.data || []);
    setData(Array.isArray(res.data) ? res.data : res.data?.data || []);

    setLoading(false);
  };

  return (
    <>
      <AppHeader
        title="Cafe Reports"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <ScrollView style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : data.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☕</Text>
            <Text style={styles.emptyTitle}>Coming Soon</Text>
            <Text style={styles.emptySubtitle}>No cafe data available for this period.</Text>
          </View>
        ) : (
          data.map((item, index) => (
            <View key={index} style={styles.card}>
              <Text style={{ fontWeight: '700' }}>{item.date}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Meals</Text>
                <Text style={styles.value}>{item.total_meals}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Drinks</Text>
                <Text style={styles.value}>{item.total_drinks}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
};

export default CafeReportScreen;