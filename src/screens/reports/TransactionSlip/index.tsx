// Transaction Detail Report — GET /v1/transaction-report
// Full list of sales transactions with items & payments
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { getTransactionReport } from '../../../api/reports';
import { reportStyles as styles } from '../styles/reportStyles';
import AppHeader from '../../../components/AppHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };

const TransactionSlipScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [data, setData]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return fmt(d); });
  const [endDate, setEndDate]     = useState(fmt(new Date()));
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTransactionReport({ branch_id: branchId, start_date: startDate, end_date: endDate });
      // API returns grouped by date: [{ date, data: [tx, ...] }] or flat array
      const raw = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setData(raw);
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

  const renderTx = (tx: any, key: any) => (
    <View key={key} style={txStyles.txRow}>
      <View style={txStyles.txHeader}>
        <Text style={txStyles.clientName}>{tx.client_name ?? tx.member_name ?? '—'}</Text>
        <Text style={txStyles.netPrice}>{parseFloat(tx.net_price ?? tx.total ?? 0).toLocaleString()}</Text>
      </View>
      {tx.package_name && (
        <Text style={txStyles.meta}>{tx.package_name}</Text>
      )}
      <View style={txStyles.metaRow}>
        {tx.sold_by  && <Text style={txStyles.tag}>By: {tx.sold_by}</Text>}
        {tx.payment_method && <Text style={txStyles.tag}>{tx.payment_method}</Text>}
        {tx.invoice_no && <Text style={txStyles.tag}>#{tx.invoice_no}</Text>}
      </View>
    </View>
  );

  // Support both grouped (array of {date, data:[...]}) and flat array
  const isGrouped = data.length > 0 && data[0]?.date && Array.isArray(data[0]?.data);

  return (
    <>
      <AppHeader
        title="Transaction Detail"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <ScrollView style={styles.container}>

        {/* Date filter */}
        <View style={txStyles.bar}>
          <TouchableOpacity style={txStyles.dateBtn} onPress={() => setPickerFor('start')}>
            <Icon name="calendar" size={14} color="#E63946" />
            <Text style={txStyles.dateText}>{display(startDate)}</Text>
          </TouchableOpacity>
          <Text style={txStyles.sep}>→</Text>
          <TouchableOpacity style={txStyles.dateBtn} onPress={() => setPickerFor('end')}>
            <Icon name="calendar" size={14} color="#E63946" />
            <Text style={txStyles.dateText}>{display(endDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={txStyles.goBtn} onPress={load} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={txStyles.goText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#E63946" />}

        {!loading && fetched && data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptySubtitle}>No transactions found for the selected period.</Text>
          </View>
        )}

        {!loading && !fetched && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>Transaction Detail</Text>
            <Text style={styles.emptySubtitle}>Select a date range and tap Go.</Text>
          </View>
        )}

        {!loading && isGrouped && data.map((group: any, gi: number) => (
          <View key={gi} style={styles.card}>
            <Text style={txStyles.groupDate}>{group.date}</Text>
            {group.data.map((tx: any, ti: number) => renderTx(tx, ti))}
          </View>
        ))}

        {!loading && !isGrouped && data.map((tx: any, i: number) => (
          <View key={i} style={styles.card}>
            {tx.date && <Text style={txStyles.groupDate}>{tx.date}</Text>}
            {renderTx(tx, i)}
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

const txStyles = StyleSheet.create({
  bar:        { flexDirection: 'row', alignItems: 'center', margin: 16, gap: 8 },
  dateBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  dateText:   { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:        { fontSize: 14, color: '#999' },
  goBtn:      { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  goText:     { color: '#FFF', fontWeight: '700', fontSize: 14 },
  groupDate:  { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  txRow:      { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  txHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  clientName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  netPrice:   { fontSize: 14, fontWeight: '700', color: '#10b981' },
  meta:       { fontSize: 12, color: '#666', marginBottom: 4 },
  metaRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:        { fontSize: 11, color: '#555', backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
});

export default TransactionSlipScreen;
