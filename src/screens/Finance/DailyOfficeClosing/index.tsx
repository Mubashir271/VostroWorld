import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getDailyOfficeClosing } from '../../../api/employeeDashboard';

const R = '#C62828';

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const today = () => fmt(new Date());
const fmtRs = (val: any) => `Rs ${(parseFloat(val ?? 0) || 0).toLocaleString()}/-`;

interface TxRow {
  id: number;
  branch_name: string;
  transaction_type: string;
  category_name: string;
  sub_category_name: string;
  payment_type: string;
  amount: string | number;
  description: string;
  occurrence_date: string;
}

const TYPE_MAP: { type: string; label: string }[] = [
  { type: 'Bank Account', label: 'Bank Details' },
  { type: 'Sales Counter', label: 'Sales Counter Details' },
  { type: 'Office Counter', label: 'Office Details' },
  { type: '__other__', label: 'Personal Details' },
];

const DailyOfficeClosing = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const branchName = profile?.branchName ?? 'Branch';

  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setFetched(false);
    try {
      const res = await getDailyOfficeClosing({
        branch_id: branchId,
        start_date: startDate,
        end_date: endDate,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setFetched(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const knownTypes = new Set(TYPE_MAP.filter(t => t.type !== '__other__').map(t => t.type));

  const sectionRows = (typeKey: string) => {
    if (typeKey === '__other__') {
      return rows.filter(r => !knownTypes.has(r.transaction_type));
    }
    return rows.filter(r => r.transaction_type === typeKey);
  };

  const sectionTotal = (typeKey: string) => {
    return sectionRows(typeKey).reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0);
  };

  const overallTotal = rows.reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0);

  return (
    <View style={styles.root}>
      <AppHeader
        title="Daily Office Closing"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Office Closing Report</Text>

          <Text style={styles.label}>Branch Name</Text>
          <View style={styles.staticInput}>
            <Text style={styles.staticText}>{branchName}</Text>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.generateBtnText}>Generate</Text>
            }
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        {fetched && !loading && (
          <>
            {TYPE_MAP.map(({ type, label }) => {
              const section = sectionRows(type);
              const total = sectionTotal(type);
              return (
                <View key={type} style={styles.card}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{label}</Text>
                  </View>

                  {section.length === 0 ? (
                    <Text style={styles.emptyText}>No records.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View>
                        <View style={styles.thead}>
                          <Text style={[styles.th, styles.colSr]}>Sr#</Text>
                          <Text style={[styles.th, styles.colDesc]}>Description</Text>
                          <Text style={[styles.th, styles.colAmt]}>Amount</Text>
                          <Text style={[styles.th, styles.colCat]}>Category</Text>
                          <Text style={[styles.th, styles.colCat]}>Sub-Category</Text>
                          <Text style={[styles.th, styles.colDate]}>Date</Text>
                        </View>
                        {section.map((r, i) => (
                          <View key={r.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                            <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
                            <Text style={[styles.td, styles.colDesc]}>{r.description || '—'}</Text>
                            <Text style={[styles.td, styles.colAmt]}>{fmtRs(r.amount)}</Text>
                            <Text style={[styles.td, styles.colCat]}>{r.category_name || '—'}</Text>
                            <Text style={[styles.td, styles.colCat]}>{r.sub_category_name || '—'}</Text>
                            <Text style={[styles.td, styles.colDate]}>{r.occurrence_date ? display(r.occurrence_date.slice(0, 10)) : '—'}</Text>
                          </View>
                        ))}
                        <View style={styles.totalRow}>
                          <Text style={[styles.td, styles.colSr]} />
                          <Text style={[styles.td, styles.colDesc, styles.totalLabel]}>Total</Text>
                          <Text style={[styles.td, styles.colAmt, styles.totalLabel]}>{fmtRs(total)}</Text>
                          <Text style={[styles.td, styles.colCat]} />
                          <Text style={[styles.td, styles.colCat]} />
                          <Text style={[styles.td, styles.colDate]} />
                        </View>
                      </View>
                    </ScrollView>
                  )}
                </View>
              );
            })}

            <View style={styles.overallCard}>
              <Text style={styles.overallLabel}>Total Overall Expense</Text>
              <Text style={styles.overallAmount}>{fmtRs(overallTotal)}</Text>
            </View>
          </>
        )}

        {loading && <ActivityIndicator color={R} style={{ marginVertical: 30 }} />}
      </ScrollView>

      <DateTimePickerModal
        isVisible={!!pickerFor}
        mode="date"
        date={new Date((pickerFor === 'start' ? startDate : endDate) + 'T00:00:00')}
        onConfirm={d => {
          if (pickerFor === 'start') setStartDate(fmt(d));
          else setEndDate(fmt(d));
          setPickerFor(null);
        }}
        onCancel={() => setPickerFor(null)}
      />
    </View>
  );
};

export default DailyOfficeClosing;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 8 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  col2: { flex: 1 },
  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },
  generateBtn: {
    backgroundColor: '#222', borderRadius: 6, alignItems: 'center',
    paddingVertical: 11, marginTop: 10,
  },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errText: { color: R, fontSize: 13, marginHorizontal: 4, marginBottom: 8, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 10, fontSize: 13 },
  sectionHeader: {
    backgroundColor: '#1A1A1A', paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 6, marginBottom: 10,
  },
  sectionHeaderText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 6, textAlign: 'center' },
  colSr: { width: 36 },
  colDesc: { width: 160 },
  colAmt: { width: 110 },
  colCat: { width: 120 },
  colDate: { width: 90 },
  tr: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 11, color: '#333', paddingHorizontal: 6, textAlign: 'center', alignSelf: 'center' },
  totalRow: { flexDirection: 'row', paddingVertical: 7, backgroundColor: '#FFF3F3', borderTopWidth: 1, borderTopColor: '#EEE' },
  totalLabel: { fontWeight: '700', color: R },
  overallCard: {
    backgroundColor: '#1A1A1A', borderRadius: 8, padding: 16, marginBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  overallLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  overallAmount: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
