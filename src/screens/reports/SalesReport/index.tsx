import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { getSalesReport } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';

const SalesReportScreen = () => {
  const [data, setData] = useState<any[]>([]);

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
<View style={styles.container}>
  <Text style={styles.title}>Sales Report</Text>

  {data.map((item, index) => (
    <View key={index} style={styles.card}>

      <Text style={{ fontWeight: '700' }}>
        {item.package_name}
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Net Sales</Text>
        <Text style={styles.value}>{item.total_net_price}</Text>
      </View>

    </View>
  ))}
</View>
  );
};

export default SalesReportScreen;