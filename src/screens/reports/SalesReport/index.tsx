import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView } from 'react-native';
import { getSalesReport } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SalesReportScreen = () => {
  const [data, setData] = useState<any[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await getSalesReport({
      branch_id: 1,
      start_date: '2026-05-01',
      end_date: '2026-05-08',
    });

    setData(res.data?.data || []);
  };

  return (
    <>
      <AppHeader
        title="Cafe Reports"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Sales Report</Text>
        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyTitle}>Coming Soon</Text>
            <Text style={styles.emptySubtitle}>No sales data available for this period.</Text>
          </View>
        ) : (
          data.map((item, index) => (
            <View key={index} style={styles.card}>
              <Text style={{ fontWeight: '700' }}>{item.package_name}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Net Sales</Text>
                <Text style={styles.value}>{item.total_net_price}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
};

export default SalesReportScreen;