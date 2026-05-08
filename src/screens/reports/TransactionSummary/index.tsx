import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { getTransactionSummary } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';

const TransactionSummaryScreen = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await getTransactionSummary({
      branch_id: 1,
      start_date: '2026-05-01',
      end_date: '2026-05-08',
    });

    setData(res.data?.data || []);
  };

  return (
<View style={styles.container}>
  <Text style={styles.title}>Transaction Summary</Text>

  {data.map((item, index) => (
    <View key={index} style={styles.card}>

      <Text style={{ fontWeight: '700' }}>
        {item.order_date}
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Orders</Text>
        <Text style={styles.value}>{item.order_count}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Net</Text>
        <Text style={styles.value}>{item.total_net_price}</Text>
      </View>

    </View>
  ))}
</View>
  );
};

export default TransactionSummaryScreen;