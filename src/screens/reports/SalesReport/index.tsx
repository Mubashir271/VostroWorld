import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { getSalesReport } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
};

const SalesReportScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? profile?.branch_id ?? 1;

  const [data, setData]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [fetched, setFetched]   = useState(false);
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return fmt(d); });
  const [endDate, setEndDate]   = useState(fmt(new Date()));
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSalesReport({ branch_id: branchId, start_date: startDate, end_date: endDate });
      setData(res.data?.data ?? (Array.isArray(res.data) ? res.data : []));
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    const iso = fmt(date);
    if (pickerFor === 'start') { setStartDate(iso); if (iso > endDate) setEndDate(iso); }
    else setEndDate(iso);
    setPickerFor(null);
  };

  // Totals
  const totalNet = data.reduce((s, r) => s + (parseFloat(r.total_net_price) || 0), 0);
  const totalQty = data.reduce((s, r) => s + (parseInt(r.total_quantity ?? r.quantity ?? 0) || 0), 0);

  return (
    <>
      <AppHeader
        title="Sales Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <ScrollView style={styles.container}>

        {/* Date filter */}
        <View style={filterStyles.bar}>
          <TouchableOpacity style={filterStyles.dateBtn} onPress={() => setPickerFor('start')}>
            <Icon name="calendar" size={14} color="#E63946" />
            <Text style={filterStyles.dateText}>{display(startDate)}</Text>
          </TouchableOpacity>
          <Text style={filterStyles.sep}>→</Text>
          <TouchableOpacity style={filterStyles.dateBtn} onPress={() => setPickerFor('end')}>
            <Icon name="calendar" size={14} color="#E63946" />
            <Text style={filterStyles.dateText}>{display(endDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={filterStyles.goBtn} onPress={load} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={filterStyles.goText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {/* Summary row */}
        {fetched && !loading && data.length > 0 && (
          <View style={filterStyles.summaryRow}>
            <View style={filterStyles.summaryCard}>
              <Text style={filterStyles.summaryVal}>{data.length}</Text>
              <Text style={filterStyles.summaryLabel}>Packages</Text>
            </View>
            <View style={filterStyles.summaryCard}>
              <Text style={filterStyles.summaryVal}>{totalQty}</Text>
              <Text style={filterStyles.summaryLabel}>Units Sold</Text>
            </View>
            <View style={[filterStyles.summaryCard, { borderColor: '#E63946' }]}>
              <Text style={[filterStyles.summaryVal, { color: '#E63946' }]}>
                {totalNet.toLocaleString()}
              </Text>
              <Text style={filterStyles.summaryLabel}>Net Sales</Text>
            </View>
          </View>
        )}

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

        {!loading && fetched && data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptySubtitle}>No sales data for the selected period.</Text>
          </View>
        )}

        {!loading && !fetched && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Sales by Package</Text>
            <Text style={styles.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {!loading && data.map((item, index) => (
          <View key={index} style={styles.card}>
            <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: 8, color: '#1A1A1A' }}>
              {item.package_name ?? item.name ?? `Package ${index + 1}`}
            </Text>
            {item.package_type != null && (
              <View style={styles.row}>
                <Text style={styles.label}>Type</Text>
                <Text style={styles.value}>{item.package_type}</Text>
              </View>
            )}
            {(item.total_quantity ?? item.quantity) != null && (
              <View style={styles.row}>
                <Text style={styles.label}>Units Sold</Text>
                <Text style={styles.value}>{item.total_quantity ?? item.quantity}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Net Sales</Text>
              <Text style={[styles.value, { color: '#10b981', fontWeight: '700' }]}>
                {parseFloat(item.total_net_price ?? 0).toLocaleString()}
              </Text>
            </View>
            {item.total_discount != null && (
              <View style={styles.row}>
                <Text style={styles.label}>Discount</Text>
                <Text style={styles.value}>{item.total_discount}</Text>
              </View>
            )}
          </View>
        ))}

      </ScrollView>

      <DateTimePickerModal
        isVisible={pickerFor !== null}
        mode="date"
        date={new Date(pickerFor === 'start' ? startDate : endDate)}
        maximumDate={pickerFor === 'start' ? new Date(endDate) : new Date()}
        minimumDate={pickerFor === 'end' ? new Date(startDate) : undefined}
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerFor(null)}
      />
    </>
  );
};

import { StyleSheet } from 'react-native';
const filterStyles = StyleSheet.create({
  bar:          { flexDirection: 'row', alignItems: 'center', margin: 16, gap: 8 },
  dateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:          { fontSize: 14, color: '#999' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
  summaryRow:   { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 4 },
  summaryCard:  { flex: 1, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: '#FFF' },
  summaryVal:   { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  summaryLabel: { fontSize: 11, color: '#999', marginTop: 2 },
});

export default SalesReportScreen;
