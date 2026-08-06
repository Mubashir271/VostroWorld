import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getHRCommissions } from '../../../api/employeeDashboard';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface CommRecord {
  id: number;
  staff_name: string;
  department: string;
  designation: string;
  commission_per?: number;        // PT %
  gross_commission: number;
  pt_commission?: number;
  gx_commission?: number;
  small_pt_commission?: number;
  paid_commission?: number;
  outstanding_commission?: number;
  payout_status?: string;
  payout_date?: string | null;
}

const Rs = (n: any) => `Rs ${Number(n || 0).toLocaleString()}/-`;

const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const apiDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const STATUS_COLOR: Record<string, string> = {
  paid: '#2E7D32',
  settled: '#2E7D32',
  partial: '#E65100',
  unpaid: '#C62828',
};

const ROW_BG: Record<string, string> = {
  paid: '#E8F5E9',
  settled: '#E8F5E9',
  partial: '#FFF8E1',
  unpaid: '#FFEBEE',   // Light red for unpaid
};

const COLS = [
  { key: 'name',       label: 'Staff Name',        width: 160 },
  { key: 'dept',       label: 'Department',        width: 130 },
  { key: 'desig',      label: 'Designation',       width: 155 },
  { key: 'pt_per',     label: 'PT %',              width: 60  },
  { key: 'pt_comm',    label: 'PT Commission',     width: 140 },
  { key: 'studio',     label: 'Studio Commission', width: 155 },
  { key: 'spt',        label: 'SPT Commission',    width: 145 },
  { key: 'gross',      label: 'Gross Commission',  width: 150 },
  { key: 'status',     label: 'Payout Status',     width: 120 },
  { key: 'date',       label: 'Payout Date',       width: 120 },
  { key: 'action',     label: 'Action',            width: 145 },
];

const TABLE_W = COLS.reduce((sum, c) => sum + c.width, 0);

const StaffCommissions = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [selMonth,    setSelMonth]    = useState(now.getMonth());
  const [year,        setYear]        = useState(String(now.getFullYear()));
  const [fromDate,    setFromDate]    = useState(monthStart);
  const [toDate,      setToDate]      = useState(monthEnd);
  const [showFrom,    setShowFrom]    = useState(false);
  const [showTo,      setShowTo]      = useState(false);
  const [selTrainer,  setSelTrainer]  = useState('');
  const [trainerList, setTrainerList] = useState<string[]>([]);
  const [records,     setRecords]     = useState<CommRecord[]>([]);
  const [filtered,    setFiltered]    = useState<CommRecord[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [generated,   setGenerated]   = useState(false);
  const [monthModal,  setMonthModal]  = useState(false);
  const [trainerModal,setTrainerModal]= useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHRCommissions({
        branch_id: branchId,
        start_date: apiDate(fromDate),
        end_date: apiDate(toDate),
        limit: 200,
      });

      const rawData = res?.data?.data ?? res?.data ?? [];
      const data: CommRecord[] = rawData.map((item: any) => ({
        id: item.id,
        staff_name: item.name || item.staff_name || '-',
        department: item.department || 'Fitness',
        designation: item.designation || 'Personal Trainer',
        commission_per: Number(item.commission?.commission_per ?? 0),
        gross_commission: Number(item.commission?.gross_commission ?? item.commission?.commission ?? 0),
        pt_commission: Number(item.commission?.pt_commission ?? 0),
        gx_commission: Number(item.commission?.gx_commission ?? 0),
        small_pt_commission: Number(item.commission?.small_pt_commission ?? 0),
        paid_commission: Number(item.commission?.paid_commission ?? 0),
        outstanding_commission: Number(item.commission?.outstanding_commission ?? 0),
        payout_status: item.commission?.payout_status || 'unpaid',
        payout_date: item.commission?.payout_date,
      }));

      setRecords(data);
      setFiltered(data);
      setTrainerList(data.map(r => r.staff_name).filter(Boolean));
      setSelTrainer('');
      setGenerated(true);
    } catch {
      setRecords([]);
      setFiltered([]);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }, [branchId, fromDate, toDate]);

  const pickTrainer = (t: string) => {
    setSelTrainer(t);
    setFiltered(t ? records.filter(r => r.staff_name === t) : records);
    setTrainerModal(false);
  };

  const getStatusKey = (r: CommRecord) => {
    const status = String(r.payout_status || '').toLowerCase().trim();
    const paid = Number(r.paid_commission) || 0;
    const gross = Number(r.gross_commission) || 0;

    if (status === 'settled' || status === 'paid' || status === 'completed') return 'settled';
    if (gross === 0 && paid === 0) return 'settled';
    if (gross > 0 && paid >= gross) return 'settled';
    if (paid > 0 && paid < gross) return 'partial';
    return 'unpaid';
  };

  const getCell = (key: string, r: CommRecord): string => {
    switch (key) {
      case 'name': return r.staff_name || '-';
      case 'dept': return r.department || '-';
      case 'desig': return r.designation || '-';
      case 'pt_per': return `${r.commission_per ?? 0}%`;
      case 'pt_comm': return Rs(r.pt_commission);
      case 'studio': return Rs(r.gx_commission);
      case 'spt': return Rs(r.small_pt_commission);
      case 'gross': return Rs(r.gross_commission);
      case 'date': return r.payout_date || '-';
      default: return '';
    }
  };

  return (
    <View style={s.container}>
      <AppHeader
        title="Staff Commission"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {/* Filters */}
      <View style={s.filterWrap}>
        <View style={s.filterRow}>
          <TouchableOpacity style={[s.dropdown, { flex: 1.4 }]} onPress={() => setMonthModal(true)}>
            <View style={s.dropInner}>
              <Text style={s.dropLabel}>Select Month</Text>
              <Text style={s.dropValue}>{MONTHS[selMonth]}</Text>
            </View>
            <Icon name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>

          <View style={[s.dropdown, { flex: 0.8 }]}>
            <View style={s.dropInner}>
              <Text style={s.dropLabel}>Enter Year</Text>
              <TextInput
                style={s.yearInput}
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>
        </View>

        <View style={s.filterRow}>
          <TouchableOpacity style={[s.dropdown, { flex: 1 }]} onPress={() => setShowFrom(true)}>
            <View style={s.dropInner}>
              <Text style={s.dropLabel}>From</Text>
              <Text style={s.dropValue}>{fmtDate(fromDate)}</Text>
            </View>
            <Icon name="calendar" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={[s.dropdown, { flex: 1 }]} onPress={() => setShowTo(true)}>
            <View style={s.dropInner}>
              <Text style={s.dropLabel}>To</Text>
              <Text style={s.dropValue}>{fmtDate(toDate)}</Text>
            </View>
            <Icon name="calendar" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={s.filterRow}>
          <TouchableOpacity
            style={[s.dropdown, { flex: 1 }]}
            onPress={() => generated && trainerList.length > 0 && setTrainerModal(true)}
          >
            <View style={s.dropInner}>
              <Text style={s.dropLabel}>Available Trainers</Text>
              <Text style={s.dropValue} numberOfLines={1}>{selTrainer || 'Select Trainer'}</Text>
            </View>
            <Icon name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={s.genBtn} onPress={generate}>
            <Text style={s.genBtnText}>Generate</Text>
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: '#4CAF50' }]} />
            <Text style={s.legendText}>Green = fully paid</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: '#FFC107' }]} />
            <Text style={s.legendText}>Yellow = half/partial paid</Text>
          </View>
        </View>
      </View>

      {/* Table */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#E63946" />
        </View>
      ) : !generated ? (
        <View style={s.center}>
          <Icon name="table-large" size={52} color="#DDD" />
          <Text style={s.emptyText}>Set date range and tap Generate</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Icon name="currency-usd-off" size={52} color="#DDD" />
          <Text style={s.emptyText}>No commission records found</Text>
          <Text style={s.emptySubText}>The commission API may not be available yet</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
          <View style={{ width: TABLE_W }}>
            <View style={s.hdr}>
              {COLS.map(c => (
                <View key={c.key} style={[s.hCell, { width: c.width }]}>
                  <Text style={s.hText} numberOfLines={2}>{c.label}</Text>
                </View>
              ))}
            </View>
            <ScrollView nestedScrollEnabled>
              {filtered.map((r, i) => {
                const sk = getStatusKey(r);
                const rowBg = ROW_BG[sk];
                return (
                  <View key={String(r.id ?? i)} style={[s.row, rowBg ? { backgroundColor: rowBg } : i % 2 === 1 ? s.rowAlt : undefined]}>
                    {COLS.map(c => {
                      if (c.key === 'status') {
                        const label = (r.payout_status ?? 'Unpaid');
                        return (
                          <View key={c.key} style={[s.cell, { width: c.width }]}>
                            <View style={[s.badge, { backgroundColor: STATUS_COLOR[sk] ?? '#757575' }]}>
                              <Text style={s.badgeText}>{label}</Text>
                            </View>
                          </View>
                        );
                      }
                      if (c.key === 'action') {
                        const isSettled = sk === 'settled';
                        return (
                          <View key={c.key} style={[s.cell, { width: c.width, justifyContent: 'center' }]}>
                            {isSettled ? (
                              <View style={[s.badge, { backgroundColor: '#2E7D32', paddingHorizontal: 14, paddingVertical: 6 }]}>
                                <Text style={[s.badgeText, { fontSize: 12 }]}>Settled</Text>
                              </View>
                            ) : (
                              <TouchableOpacity style={s.recBtn}>
                                <Text style={s.recBtnText}>Record Payment</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      }
                      return (
                        <View key={c.key} style={[s.cell, { width: c.width }]}>
                          <Text
                            style={[
                              s.cellText,
                              c.key === 'name'  && s.nameText,
                              c.key === 'gross' && s.grossText,
                            ]}
                            numberOfLines={1}
                          >
                            {getCell(c.key, r)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Date pickers */}
      {showFrom && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowFrom(false); if (d) setFromDate(d); }}
        />
      )}
      {showTo && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowTo(false); if (d) setToDate(d); }}
        />
      )}

      {/* Month modal */}
      <Modal visible={monthModal} transparent animationType="fade" onRequestClose={() => setMonthModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setMonthModal(false)}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Select Month</Text>
            <ScrollView>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[s.mItem, selMonth === i && s.mItemSel]}
                  onPress={() => {
                    setSelMonth(i);
                    const y = parseInt(year, 10) || now.getFullYear();
                    setFromDate(new Date(y, i, 1));
                    setToDate(new Date(y, i + 1, 0));
                    setMonthModal(false);
                  }}
                >
                  <Text style={[s.mText, selMonth === i && s.mTextSel]}>{m}</Text>
                  {selMonth === i && <Icon name="check" size={16} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Trainer modal */}
      <Modal visible={trainerModal} transparent animationType="fade" onRequestClose={() => setTrainerModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setTrainerModal(false)}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Select Trainer</Text>
            <ScrollView>
              <TouchableOpacity
                style={[s.mItem, selTrainer === '' && s.mItemSel]}
                onPress={() => pickTrainer('')}
              >
                <Text style={[s.mText, selTrainer === '' && s.mTextSel]}>All Trainers</Text>
                {selTrainer === '' && <Icon name="check" size={16} color="#E63946" />}
              </TouchableOpacity>
              {trainerList.map((t, i) => (
                <TouchableOpacity
                  key={`t-${i}`}
                  style={[s.mItem, selTrainer === t && s.mItemSel]}
                  onPress={() => pickTrainer(t)}
                >
                  <Text style={[s.mText, selTrainer === t && s.mTextSel]}>{t}</Text>
                  {selTrainer === t && <Icon name="check" size={16} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8F9FA' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:    { color: '#999', marginTop: 12, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  emptySubText: { color: '#BBB', marginTop: 6, fontSize: 12, textAlign: 'center' },

  filterWrap:   { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  filterRow:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dropdown:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  dropInner:    { flex: 1 },
  dropLabel:    { fontSize: 10, color: '#999', marginBottom: 2 },
  dropValue:    { fontSize: 13, color: '#333', fontWeight: '500' },
  yearInput:    { fontSize: 13, color: '#333', fontWeight: '500', padding: 0 },
  genBtn:       { backgroundColor: '#E63946', borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  genBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  legend:       { flexDirection: 'row', gap: 16, marginTop: 4 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:          { width: 14, height: 14, borderRadius: 3 },
  legendText:   { fontSize: 11, color: '#666' },

  hdr:          { flexDirection: 'row', backgroundColor: '#E63946' },
  hCell:        { paddingVertical: 10, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' },
  hText:        { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },

  row:          { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  rowAlt:       { backgroundColor: '#FFF5F5' },
  cell:         { paddingVertical: 9, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  cellText:     { fontSize: 12, color: '#444', textAlign: 'center' },
  nameText:     { color: '#E63946', fontWeight: '600' },
  grossText:    { color: '#1B5E20', fontWeight: '700' },

  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText:    { color: '#fff', fontSize: 11, fontWeight: '700' },

  recBtn:       { borderWidth: 1, borderColor: '#E63946', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  recBtnText:   { fontSize: 11, color: '#E63946', fontWeight: '600' },

  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '80%', maxHeight: '70%' },
  modalTitle:   { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  mItem:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  mItemSel:     { backgroundColor: '#FFF5F5' },
  mText:        { fontSize: 14, color: '#333' },
  mTextSel:     { color: '#E63946', fontWeight: '600' },
});

export default StaffCommissions;
