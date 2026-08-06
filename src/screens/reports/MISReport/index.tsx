import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getMISDashboard } from '../../../api/dashboard';
import { getBranchesNameList } from '../../../api/employeeDashboard';

interface BranchOption { id: string; label: string; branch_id: number; }

// Values from /v1/MISReport/get are often pre-formatted strings with comma
// thousands separators (e.g. "2,244,063.00") — parseFloat stops at the
// first comma, so these must be stripped before parsing or every value over
// 999 silently truncates to its first 1-3 digits.
const fmtRs = (v: any) => {
  if (v == null || v === '') return '—';
  const n = parseFloat(String(v).replace(/,/g, ''));
  if (isNaN(n)) return '—';
  return `Rs ${n.toLocaleString()}`;
};
const fmtNum = (v: any) => {
  if (v == null || v === '') return '—';
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? '—' : n.toLocaleString();
};

const SectionHeader = ({ title }: { title: string }) => (
  <View style={s.sectionHeader}>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const TableRow = ({
  label, qty, price, discount, gst, net, highlight,
}: {
  label: string; qty?: any; price?: any; discount?: any; gst?: any; net?: any; highlight?: boolean;
}) => (
  <View style={[s.tableRow, highlight && s.tableRowHL]}>
    <Text style={[s.tableCell, s.tableCellLabel]} numberOfLines={2}>{label}</Text>
    <Text style={[s.tableCell, s.tableCellNum]}>{qty != null ? fmtNum(qty) : '—'}</Text>
    <Text style={[s.tableCell, s.tableCellNum]}>{price != null ? fmtRs(price) : '—'}</Text>
    <Text style={[s.tableCell, s.tableCellNum]}>{discount != null ? fmtRs(discount) : '—'}</Text>
    <Text style={[s.tableCell, s.tableCellNum]}>{gst != null ? fmtRs(gst) : '—'}</Text>
    <Text style={[s.tableCell, s.tableCellNum, s.netCell]}>{net != null ? fmtRs(net) : '—'}</Text>
  </View>
);

const TableHeader = () => (
  <View style={s.tableHeader}>
    {['Particulars', 'Qty', 'Price', 'Discount', 'GST', 'Net Price'].map((h, i) => (
      <Text key={h} style={[s.tableCell, s.tableHeaderCell, i === 0 && s.tableCellLabel]}>{h}</Text>
    ))}
  </View>
);

const KVRow = ({ label, value, redValue }: { label: string; value: any; redValue?: boolean }) => (
  <View style={s.kvRow}>
    <Text style={s.kvLabel}>{label}</Text>
    <Text style={[s.kvValue, redValue && { color: '#E63946' }]}>{value ?? '—'}</Text>
  </View>
);

const MISReportScreen = () => {
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.user);
  // Super Admin has no fixed branch (branchId is 0 — they oversee every
  // branch). The web admin's MIS Report requires them to pick one specific
  // branch before it'll load anything (HAR-confirmed: no all-branches
  // aggregate exists for this report), so mirror that here instead of
  // silently calling the endpoint with an empty/0 branch id.
  const hasFixedBranch = !!profile?.branchId;

  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchOption | null>(null);
  const [branchModalVisible, setBranchModalVisible] = useState(false);

  useEffect(() => {
    if (hasFixedBranch) return;
    getBranchesNameList()
      .then(res => {
        const branches = res?.data ?? [];
        setBranchOptions(branches.map((b: any) => ({ id: String(b.id), label: b.name, branch_id: b.id })));
      })
      .catch(() => {});
  }, [hasFixedBranch]);

  const effectiveBranchId = hasFixedBranch ? profile?.branchId : selectedBranch?.branch_id;
  const branchName = hasFixedBranch
    ? (profile?.branchName ?? `Branch ${profile?.branchId}`)
    : (selectedBranch?.label ?? 'Select a branch');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const load = async () => {
    if (effectiveBranchId == null) return;
    setLoading(true);
    try {
      const res = await getMISDashboard(effectiveBranchId);
      setData(res);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // /v1/MISReport/get returns a flat object (confirmed live 2026-08-05), not
  // the nested { sales, finance, personal_training, hr } shape this screen
  // used to guess at — that mismatch was silently rendering "—"/0 everywhere
  // despite the API returning real data. Daily Sales Breakup rows use a
  // per-category prefix on otherwise-identical field suffixes.
  const BREAKUP_CATEGORIES = [
    { label: 'Gym New', prefix: 'gn' },
    { label: 'Gym Existing', prefix: 'gr' },
    { label: 'Personal Training New', prefix: 'ptn' },
    { label: 'Personal Training ReNew', prefix: 'ptr' },
    { label: 'Gx Studio', prefix: 'gx' },
    { label: 'Nutrition', prefix: 'n' },
    { label: 'Physio', prefix: 'phy' },
    { label: 'Academy', prefix: 'cft' },
    { label: 'Cafe', prefix: 'c' },
  ];

  return (
    <>
      <AppHeader
        title="MIS Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => (navigation as any).navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Report header */}
        <View style={s.reportHeader}>
          <Text style={s.reportTitle}>VOSTRO WORLD ({branchName.toUpperCase()}) DAILY MIS REPORT</Text>
          <Text style={s.reportDate}>Date: {today}</Text>
        </View>

        {/* Branch selector — only for users with no fixed branch (Super Admin) */}
        {!hasFixedBranch && (
          <View style={s.branchField}>
            <Text style={s.branchLabel}>Select Branch</Text>
            <TouchableOpacity
              style={s.branchSelect}
              onPress={() => setBranchModalVisible(true)}
            >
              <Text style={selectedBranch ? s.branchSelectText : s.branchSelectPlaceholder}>
                {selectedBranch ? selectedBranch.label : 'Select Branch'}
              </Text>
              <Icon name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Load button */}
        <TouchableOpacity
          style={[s.loadBtn, (!hasFixedBranch && !selectedBranch) && s.loadBtnDisabled]}
          onPress={load}
          disabled={loading || (!hasFixedBranch && !selectedBranch)}
        >
          {loading
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={s.loadBtnText}>Load Report</Text>}
        </TouchableOpacity>

        {!fetched && !loading && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={s.emptyTitle}>MIS Report</Text>
            <Text style={s.emptySubtitle}>
              {!hasFixedBranch && !selectedBranch
                ? 'Select a branch above, then tap "Load Report".'
                : 'Tap "Load Report" to fetch today\'s MIS data.'}
            </Text>
          </View>
        )}

        {!loading && fetched && data && (
          <>
            {/* ── SALES ── */}
            <SectionHeader title="SALES" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <TableHeader />
                <TableRow
                  label={`Sales Till Date\n(from month start)`}
                  qty={data.salem_qty}
                  price={data.salem_price}
                  discount={data.salem_discount}
                  gst={data.salem_gst}
                  net={data.salem_net}
                />
                <TableRow
                  label="Today's Total Sale"
                  qty={data.saleqty_today}
                  price={data.saleprice_today}
                  discount={data.salediscount_today}
                  gst={data.salegst_today}
                  net={data.salenet_today}
                  highlight
                />
              </View>
            </ScrollView>

            {/* ── DAILY SALES BREAKUP ── */}
            <SectionHeader title="DAILY SALES BREAKUP" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <TableHeader />
                {BREAKUP_CATEGORIES.map(({ label, prefix }) => (
                  <TableRow
                    key={prefix}
                    label={label}
                    qty={data[`${prefix}saleqty_today`]}
                    price={data[`${prefix}saleprice_today`]}
                    discount={data[`${prefix}salediscount_today`]}
                    gst={data[`${prefix}salegst_today`]}
                    net={data[`${prefix}salenet_today`]}
                  />
                ))}
              </View>
            </ScrollView>

            {/* ── FINANCE ── */}
            <SectionHeader title="FINANCE" />
            <View style={s.card}>
              <KVRow label="Total Sale to Date" value={fmtRs(data.salem_net)} />
              <KVRow label="Total Expenses to Date" value={fmtRs(data.t_expense_date)} />
              <KVRow label="Today's Expenses" value={fmtRs(data.today_expense)} />
              <KVRow label="Total Expenses Pending Approval" value={fmtRs(data.expenses_pending_approval)} redValue />
            </View>

            {/* ── PERSONAL TRAINING ── */}
            <SectionHeader title="PERSONAL TRAINING" />
            <View style={s.card}>
              <KVRow label="PT Staff Present" value={data.ptStaffPresent} />
              <KVRow label="New PT Units Sold" value={fmtNum(data.ptnsaleqty_today)} />
              <KVRow label="PT Renewed" value={fmtNum(data.ptrsaleqty_today)} />
              <KVRow label="Physio Sessions Conducted" value={fmtNum(data.physaleqty_today)} />
              <KVRow label="Nutritionist Sessions Conducted" value={fmtNum(data.nsaleqty_today)} />
            </View>

            {/* ── HR REPORT ── */}
            <SectionHeader title="HR REPORT" />
            <View style={s.card}>
              <KVRow label="Total Staff" value={fmtNum(data.totalStaff)} />
              <KVRow label="Present" value={fmtNum(data.presentStaff)} />
              <KVRow label="Absent" value={fmtNum(data.absentStaff)} />
              <KVRow label="Late" value={fmtNum(data.lateStaff)} />
            </View>

            {/* ── FOOTFALL ── */}
            <SectionHeader title="FOOTFALL" />
            <View style={s.card}>
              <KVRow label="Morning 7:00 am to 12:00 pm" value={fmtNum(data.morning_SevnToTwlv)} />
              <KVRow label="Afternoon 12:00 pm to 5:00 pm" value={fmtNum(data.after_twlvTofive)} />
              <KVRow label="Evening 5:00 pm to 11:00 pm" value={fmtNum(data.even_fiveToeleven)} />
              <KVRow label="Total Females" value={fmtNum(data.totalFemales)} />
              <KVRow label="Total Males" value={fmtNum(data.totalMales)} />
            </View>

            {/* ── CAFE REPORT ── */}
            <SectionHeader title="CAFE REPORT" />
            <View style={s.card}>
              <KVRow label="Total Sale" value={fmtRs(data.csalenet_today)} />
              <KVRow label="Total Meals Sold" value={fmtNum(data.total_meals)} />
              <KVRow label="Total Drinks" value={fmtNum(data.total_drinks)} />
              <KVRow label="Total Sides" value={fmtNum(data.total_sides)} />
            </View>
          </>
        )}
      </ScrollView>

      {/* Branch selection modal */}
      <Modal visible={branchModalVisible} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setBranchModalVisible(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select Branch</Text>
            {branchOptions.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[s.modalOption, selectedBranch?.id === opt.id && s.modalOptionSelected]}
                onPress={() => { setSelectedBranch(opt); setBranchModalVisible(false); }}
              >
                <Icon
                  name={selectedBranch?.id === opt.id ? 'check-circle' : 'circle-outline'}
                  size={20}
                  color={selectedBranch?.id === opt.id ? '#E63946' : '#ccc'}
                  style={{ marginRight: 10 }}
                />
                <Text style={[s.modalOptionText, selectedBranch?.id === opt.id && { color: '#E63946', fontWeight: '700' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F5F7FA' },
  reportHeader:    { backgroundColor: '#C0392B', padding: 16, margin: 12, borderRadius: 10 },
  reportTitle:     { color: '#FFF', fontWeight: '800', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  reportDate:      { color: '#FFCDD2', fontSize: 12, textAlign: 'center', marginTop: 4 },
  loadBtn:         { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, marginHorizontal: 12, alignItems: 'center', marginBottom: 8 },
  loadBtnDisabled: { backgroundColor: '#9CA3AF' },
  loadBtnText:     { color: '#FFF', fontWeight: '700', fontSize: 15 },
  branchField:     { marginHorizontal: 12, marginBottom: 10 },
  branchLabel:     { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6 },
  branchSelect:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E63946', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF' },
  branchSelectText: { fontSize: 14, color: '#1A1A1A' },
  branchSelectPlaceholder: { fontSize: 14, color: '#999' },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28 },
  modalTitle:      { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  modalOption:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalOptionSelected: { backgroundColor: '#FFF5F5', borderRadius: 8 },
  modalOptionText: { fontSize: 14, color: '#333' },
  emptyState:      { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:       { fontSize: 48, marginBottom: 12 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:   { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  sectionHeader:   { backgroundColor: '#E63946', marginHorizontal: 12, marginTop: 14, marginBottom: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  sectionTitle:    { color: '#FFF', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:            { backgroundColor: '#FFF', marginHorizontal: 12, marginBottom: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingVertical: 4, elevation: 1 },
  tableHeader:     { flexDirection: 'row', backgroundColor: '#2C3E50', paddingVertical: 8, paddingHorizontal: 4 },
  tableHeaderCell: { color: '#FFF', fontWeight: '700', fontSize: 11 },
  tableRow:        { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tableRowHL:      { backgroundColor: '#FFF8E1' },
  tableCell:       { fontSize: 11, color: '#1A1A1A', paddingHorizontal: 4, width: 90, alignSelf: 'center' },
  tableCellLabel:  { width: 140 },
  tableCellNum:    { textAlign: 'right' },
  netCell:         { color: '#10b981', fontWeight: '700' },
  kvRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  kvLabel:         { fontSize: 13, color: '#555', flex: 1 },
  kvValue:         { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
});

export default MISReportScreen;
