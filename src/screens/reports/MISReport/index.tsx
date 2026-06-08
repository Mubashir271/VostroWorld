import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getMISDashboard } from '../../../api/dashboard';

const fmtRs = (v: any) => {
  const n = parseFloat(v ?? 0);
  if (isNaN(n)) return '—';
  return `Rs ${n.toLocaleString()}`;
};
const fmtNum = (v: any) => {
  const n = parseFloat(v ?? 0);
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
  const branchId = profile?.branchId ?? 1;
  const branchName = profile?.branchName ?? `Branch ${branchId}`;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMISDashboard(branchId);
      setData(res);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Parse whatever shape the API returns
  const sales = data?.sales ?? data?.Sales ?? data;
  const finance = data?.finance ?? data?.Finance ?? data;
  const pt = data?.personal_training ?? data?.pt ?? data?.PT ?? data;
  const hr = data?.hr ?? data?.HR ?? data;

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

        {/* Load button */}
        <TouchableOpacity style={s.loadBtn} onPress={load} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={s.loadBtnText}>Load Report</Text>}
        </TouchableOpacity>

        {!fetched && !loading && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={s.emptyTitle}>MIS Report</Text>
            <Text style={s.emptySubtitle}>Tap "Load Report" to fetch today's MIS data.</Text>
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
                  qty={sales?.month_total_qty ?? sales?.month_qty ?? sales?.total_qty}
                  price={sales?.month_total_price ?? sales?.month_price ?? sales?.total_price}
                  discount={sales?.month_total_discount ?? sales?.month_discount ?? sales?.total_discount}
                  gst={sales?.month_total_gst ?? sales?.month_gst ?? sales?.total_gst}
                  net={sales?.month_total_net ?? sales?.month_net ?? sales?.net_price ?? sales?.total_net_price}
                />
                <TableRow
                  label="Today's Total Sale"
                  qty={sales?.today_qty ?? sales?.today_total_qty}
                  price={sales?.today_price ?? sales?.today_total_price}
                  discount={sales?.today_discount ?? sales?.today_total_discount}
                  gst={sales?.today_gst ?? sales?.today_total_gst}
                  net={sales?.today_net ?? sales?.today_total_net ?? sales?.today_net_price}
                  highlight
                />
              </View>
            </ScrollView>

            {/* ── DAILY SALES BREAKUP ── */}
            {(sales?.daily_breakup ?? sales?.breakup ?? data?.daily_sales_breakup) && (
              <>
                <SectionHeader title="DAILY SALES BREAKUP" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <TableHeader />
                    {(sales?.daily_breakup ?? sales?.breakup ?? data?.daily_sales_breakup ?? []).map((row: any, i: number) => (
                      <TableRow
                        key={i}
                        label={row.particulars ?? row.label ?? row.name ?? `Row ${i + 1}`}
                        qty={row.qty ?? row.quantity}
                        price={row.price}
                        discount={row.discount}
                        gst={row.gst ?? row.tax}
                        net={row.net_price ?? row.net}
                      />
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* ── FINANCE ── */}
            <SectionHeader title="FINANCE" />
            <View style={s.card}>
              <KVRow label="Total Sale to Date" value={fmtRs(finance?.total_sale_to_date ?? finance?.total_sales ?? finance?.total_sale)} />
              <KVRow label="Total Expenses to Date" value={fmtRs(finance?.total_expenses_to_date ?? finance?.total_expense)} />
              <KVRow label="Today's Expenses" value={fmtRs(finance?.todays_expenses ?? finance?.today_expense ?? finance?.today_expenses)} />
              <KVRow label="Total Expenses Pending Approval" value={fmtRs(finance?.pending_approval ?? finance?.expenses_pending)} redValue />
            </View>

            {/* ── PERSONAL TRAINING ── */}
            <SectionHeader title="PERSONAL TRAINING" />
            <View style={s.card}>
              <KVRow label="PT Staff Present" value={pt?.pt_staff_present ?? pt?.staff_present} />
              <KVRow label="New PT Units Sold" value={fmtNum(pt?.new_pt_units ?? pt?.new_units_sold ?? pt?.pt_units)} />
              <KVRow label="PT Renewed" value={fmtNum(pt?.pt_renewed ?? pt?.renewed)} />
              <KVRow label="Physio Sessions Conducted" value={fmtNum(pt?.physio_sessions ?? pt?.physio)} />
              <KVRow label="Nutritionist Sessions Conducted" value={fmtNum(pt?.nutritionist_sessions ?? pt?.nutrition)} />
            </View>

            {/* ── HR REPORT ── */}
            <SectionHeader title="HR REPORT" />
            <View style={s.card}>
              <KVRow label="Total Staff" value={fmtNum(hr?.total_staff ?? hr?.staff_count ?? data?.total_staff)} />
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
};

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F5F7FA' },
  reportHeader:    { backgroundColor: '#C0392B', padding: 16, margin: 12, borderRadius: 10 },
  reportTitle:     { color: '#FFF', fontWeight: '800', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  reportDate:      { color: '#FFCDD2', fontSize: 12, textAlign: 'center', marginTop: 4 },
  loadBtn:         { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, marginHorizontal: 12, alignItems: 'center', marginBottom: 8 },
  loadBtnText:     { color: '#FFF', fontWeight: '700', fontSize: 15 },
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
