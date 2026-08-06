import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import { getSalaryList } from '../../api/employeeDashboard';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface SalaryRecord {
  id: number;
  name: string;
  uid: string;
  branch: string;
  department: string;
  designation: string;
  salary: number;
  medical: number;
  fine: number;
  advance: number;
  reward: number;
  loan: number;
  detections: number;
  cafe?: number;
  components_addition: number;
  components_deduction: number;
  commission?: {
    commission_per?: number;
    commission?: number;
    studio_commission?: number;
    spt_commission?: number;
  };
}

const Rs = (n: any) => `Rs ${Number(n || 0).toLocaleString()}/-`;

const calcNet = (r: SalaryRecord) => {
  const pt = r.commission?.commission || 0;
  const st = r.commission?.studio_commission || 0;
  const sp = r.commission?.spt_commission || 0;
  return (r.salary || 0) + (r.medical || 0) + (r.reward || 0)
    + (r.components_addition || 0) + pt + st + sp
    - (r.fine || 0) - (r.advance || 0) - (r.loan || 0)
    - (r.detections || 0) - (r.components_deduction || 0) - (r.cafe || 0);
};

const COLS = [
  { key: 'sr',         label: 'Sr#',               width: 50  },
  { key: 'name',       label: 'Staff Name',         width: 160 },
  { key: 'dept',       label: 'Department',         width: 140 },
  { key: 'desig',      label: 'Designation',        width: 160 },
  { key: 'salary',     label: 'Salary',             width: 120 },
  { key: 'pt_per',     label: 'PT %',               width: 60  },
  { key: 'pt_comm',    label: 'PT Commission',      width: 140 },
  { key: 'studio',     label: 'Studio Commission',  width: 155 },
  { key: 'spt',        label: 'SPT Commission',     width: 145 },
  { key: 'total_comm', label: 'Total Commission',   width: 150 },
  { key: 'reward',     label: 'Reward',             width: 110 },
  { key: 'advance',    label: 'Advance',            width: 110 },
  { key: 'fine',       label: 'Fine',               width: 110 },
  { key: 'loan',       label: 'Monthly Installment',width: 170 },
  { key: 'comp_plus',  label: 'Component (+)',      width: 135 },
  { key: 'comp_minus', label: 'Component (-)',      width: 135 },
  { key: 'cafe',       label: 'Cafe',               width: 90  },
  { key: 'deduction',  label: 'Deduction',          width: 110 },
  { key: 'medical',    label: 'Medical',            width: 100 },
  { key: 'net',        label: 'Net Salary',         width: 130 },
  { key: 'print',      label: 'Print Slip',         width: 110 },
];

const TABLE_W = COLS.reduce((s, c) => s + c.width, 0);

const SalaryManagement = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [year, setYear]         = useState(String(now.getFullYear()));
  const [selStaff, setSelStaff] = useState('');
  const [records, setRecords]   = useState<SalaryRecord[]>([]);
  const [filtered, setFiltered] = useState<SalaryRecord[]>([]);
  const [staffList, setStaffList] = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const [generated, setGenerated] = useState(false);
  const [monthModal, setMonthModal] = useState(false);
  const [staffModal, setStaffModal] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const m = selMonth + 1;
      const y = parseInt(year, 10) || now.getFullYear();
      const lastDay = new Date(y, m, 0).getDate();
      const res = await getSalaryList({
        branch_id: branchId,
        start_date: `${y}-${String(m).padStart(2, '0')}-01`,
        end_date:   `${y}-${String(m).padStart(2, '0')}-${lastDay}`,
        limit: 200,
      });
      const data: SalaryRecord[] = res?.data ?? [];
      setRecords(data);
      setFiltered(data);
      setStaffList(data.map(r => r.name).filter(Boolean));
      setSelStaff('');
      setGenerated(true);
    } catch {
      setRecords([]);
      setFiltered([]);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }, [branchId, selMonth, year]);

  const pickStaff = (s: string) => {
    setSelStaff(s);
    setFiltered(s ? records.filter(r => r.name === s) : records);
    setStaffModal(false);
  };

  const getCell = (key: string, r: SalaryRecord, idx: number): string => {
    const pt = r.commission?.commission || 0;
    const st = r.commission?.studio_commission || 0;
    const sp = r.commission?.spt_commission || 0;
    switch (key) {
      case 'sr':         return String(idx + 1);
      case 'name':       return r.name || '-';
      case 'dept':       return r.department || '-';
      case 'desig':      return r.designation || '-';
      case 'salary':     return Rs(r.salary);
      case 'pt_per':     return `${r.commission?.commission_per || 0}%`;
      case 'pt_comm':    return Rs(pt);
      case 'studio':     return Rs(st);
      case 'spt':        return Rs(sp);
      case 'total_comm': return Rs(pt + st + sp);
      case 'reward':     return Rs(r.reward);
      case 'advance':    return Rs(r.advance);
      case 'fine':       return Rs(r.fine);
      case 'loan':       return Rs(r.loan);
      case 'comp_plus':  return Rs(r.components_addition);
      case 'comp_minus': return Rs(r.components_deduction);
      case 'cafe':       return Rs(r.cafe);
      case 'deduction':  return Rs(r.detections);
      case 'medical':    return Rs(r.medical);
      case 'net':        return Rs(calcNet(r));
      default:           return '';
    }
  };

  return (
    <View style={s.container}>
      <AppHeader
        title="Staff Members Salary"
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
            <Icon name="chevron-down" size={18} color="#666" />
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
          <TouchableOpacity
            style={[s.dropdown, { flex: 1 }]}
            onPress={() => generated && staffList.length > 0 && setStaffModal(true)}
          >
            <View style={s.dropInner}>
              <Text style={s.dropLabel}>Available Staff</Text>
              <Text style={s.dropValue} numberOfLines={1}>{selStaff || 'Select Names'}</Text>
            </View>
            <Icon name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={s.genBtn} onPress={generate}>
            <Text style={s.genBtnText}>Generate</Text>
          </TouchableOpacity>
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
          <Text style={s.emptyText}>Select month & year, then tap Generate</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Icon name="account-cash-outline" size={52} color="#DDD" />
          <Text style={s.emptyText}>No salary records found</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
          <View style={{ width: TABLE_W }}>
            {/* Header */}
            <View style={s.hdr}>
              {COLS.map(c => (
                <View key={c.key} style={[s.hCell, { width: c.width }]}>
                  <Text style={s.hText} numberOfLines={2}>{c.label}</Text>
                </View>
              ))}
            </View>
            {/* Rows */}
            <ScrollView nestedScrollEnabled>
              {filtered.map((r, i) => (
                <View key={String(r.id)} style={[s.row, i % 2 === 1 && s.rowAlt]}>
                  {COLS.map(c => (
                    c.key === 'print' ? (
                      <View key={c.key} style={[s.cell, { width: c.width }]}>
                        <TouchableOpacity style={s.printBtn}>
                          <Icon name="printer-outline" size={12} color="#E63946" />
                          <Text style={s.printText}>Print Slip</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View key={c.key} style={[s.cell, { width: c.width }]}>
                        <Text
                          style={[
                            s.cellText,
                            c.key === 'name'  && s.nameText,
                            c.key === 'net'   && s.netText,
                          ]}
                          numberOfLines={1}
                        >
                          {getCell(c.key, r, i)}
                        </Text>
                      </View>
                    )
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
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
                  onPress={() => { setSelMonth(i); setMonthModal(false); }}
                >
                  <Text style={[s.mText, selMonth === i && s.mTextSel]}>{m}</Text>
                  {selMonth === i && <Icon name="check" size={16} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Staff modal */}
      <Modal visible={staffModal} transparent animationType="fade" onRequestClose={() => setStaffModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setStaffModal(false)}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Select Staff</Text>
            <ScrollView>
              <TouchableOpacity
                style={[s.mItem, selStaff === '' && s.mItemSel]}
                onPress={() => pickStaff('')}
              >
                <Text style={[s.mText, selStaff === '' && s.mTextSel]}>All Staff</Text>
                {selStaff === '' && <Icon name="check" size={16} color="#E63946" />}
              </TouchableOpacity>
              {staffList.map((st, i) => (
                <TouchableOpacity
                  key={`st-${i}`}
                  style={[s.mItem, selStaff === st && s.mItemSel]}
                  onPress={() => pickStaff(st)}
                >
                  <Text style={[s.mText, selStaff === st && s.mTextSel]}>{st}</Text>
                  {selStaff === st && <Icon name="check" size={16} color="#E63946" />}
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
  container:  { flex: 1, backgroundColor: '#F8F9FA' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:  { color: '#999', marginTop: 12, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },

  filterWrap: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  filterRow:  { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dropdown:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  dropInner:  { flex: 1 },
  dropLabel:  { fontSize: 10, color: '#999', marginBottom: 2 },
  dropValue:  { fontSize: 13, color: '#333', fontWeight: '500' },
  yearInput:  { fontSize: 13, color: '#333', fontWeight: '500', padding: 0 },
  genBtn:     { backgroundColor: '#E63946', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  genBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  hdr:        { flexDirection: 'row', backgroundColor: '#E63946' },
  hCell:      { paddingVertical: 10, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' },
  hText:      { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },

  row:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  rowAlt:     { backgroundColor: '#FFF5F5' },
  cell:       { paddingVertical: 9, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: '#EEE', justifyContent: 'center' },
  cellText:   { fontSize: 12, color: '#444', textAlign: 'center' },
  nameText:   { color: '#E63946', fontWeight: '600', textAlign: 'left' },
  netText:    { color: '#1B5E20', fontWeight: '700' },

  printBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E63946', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  printText:  { fontSize: 11, color: '#E63946', fontWeight: '600' },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox:   { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '80%', maxHeight: '70%' },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  mItem:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  mItemSel:   { backgroundColor: '#FFF5F5' },
  mText:      { fontSize: 14, color: '#333' },
  mTextSel:   { color: '#E63946', fontWeight: '600' },
});

export default SalaryManagement;
