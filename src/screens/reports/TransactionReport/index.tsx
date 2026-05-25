import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { getTransactionReport } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/AppHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import NotificationSVG from '../../../assets/svg/NotificationSVG';


const TransactionReportScreen = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    const res = await getTransactionReport({
      branch_id: 1,
      start_date: '2026-05-01',
      end_date: '2026-05-08',
    });

    setData(res.data?.data || []);
    setLoading(false);
  };

  return (
    <>
      <AppHeader
        title="Transaction Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : (
        <FlatList
          data={data}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>

              <Text style={{ fontWeight: '700', marginBottom: 6 }}>
                {item.date}
              </Text>

              {item.data.map((tx: any) => (
                <View key={tx.id} style={{ marginBottom: 10 }}>

                  <View style={styles.row}>
                    <Text style={styles.label}>Client</Text>
                    <Text style={styles.value}>{tx.client_name}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Net</Text>
                    <Text style={styles.value}>{tx.net_price}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Sold By</Text>
                    <Text style={styles.value}>{tx.sold_by}</Text>
                  </View>

                </View>
              ))}

            </View>
          )}
        />
        )}
      </View>
    </>
  );
};

export default TransactionReportScreen;