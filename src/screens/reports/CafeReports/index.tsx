import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { getCafeReport } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';

const CafeReportScreen = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

    setData(res.data?.data || []);
    setLoading(false);
  };

  if (loading) return <ActivityIndicator />;

  return (
<View style={styles.container}>
  <Text style={styles.title}>Cafe Report</Text>

  {data.map((item, index) => (
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
  ))}
</View>
  );
};

export default CafeReportScreen;