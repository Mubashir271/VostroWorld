// src/screens/reports/TransactionReport/index.tsx
//
// The web admin's Reports › Transaction Report — see getTransactionReport in
// api/reports.ts for the capture notes.
//
// The endpoint returns the whole range in one response (orders grouped by
// date), so paging and the page-size selector are client-side over the
// flattened list, exactly as the web does it. The totals under the table are
// whole-result totals, not page totals: price/discount/net come from the
// response, GST and Pending are summed from the orders.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import ClientNameCell from '../../../components/ClientNameCell';
import QuickDates from '../../../components/QuickDates';
import { RootState } from '../../../redux/store';
import {
  getTransactionReport, orderPending, orderPaymentType,
  TransactionOrder, TransactionReportResult,
} from '../../../api/reports';

const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
// The table renders DD-MM-YYYY, as the web's Sale Date column does.
const saleDate = (iso: string) => { const [y, m, d] = (iso ?? '').split('-'); return y ? `${d}-${m}-${y}` : '—'; };
const today = () => fmt(new Date());

const rs = (n: number) => `Rs ${Math.round(Number(n) || 0).toLocaleString()}/-`;

const PAGE_SIZES = [10, 20, 50, 100];

const EMPTY: TransactionReportResult = {
  orders: [], totalPrice: 0, totalDiscount: 0, totalNetPrice: 0, totalGst: 0, totalPending: 0,
};

const TransactionReportScreen = () => {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);

  const [query, setQuery] = useState(() => ({ start_date: today(), end_date: today() }));
  const [result, setResult] = useState<TransactionReportResult>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState(20); // the web's default
  const [sizeOpen, setSizeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTransactionReport({ branch_id: branchId, ...query })
      .then(res => { if (!cancelled) { setResult(res); setPage(1); setExpanded(null); } })
      .catch((err: any) => {
        if (cancelled) return;
        setResult(EMPTY);
        const status = err?.response?.status;
        setError(
          err?.code === 'ECONNABORTED'
            ? 'The request timed out. Try a shorter date range.'
            : err?.response?.data?.message || (status ? `Request failed (${status}).` : 'Could not load the transaction report.'),
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, query]);

  const runQuery = () => setQuery({ start_date: startDate, end_date: endDate });

  const onPick = (date: Date) => {
    const v = fmt(date);
    if (picker === 'start') { setStartDate(v); if (v > endDate) setEndDate(v); }
    else setEndDate(v);
    setPicker(null);
  };

  const onQuickRange = useCallback((a: string, b: string) => { setStartDate(a); setEndDate(b); }, []);

  const totalPages = Math.max(1, Math.ceil(result.orders.length / pageSize));
  const pageRows = useMemo(
    () => result.orders.slice((page - 1) * pageSize, page * pageSize),
    [result.orders, page, pageSize],
  );

  const pageWindow = useMemo(() => {
    const RANGE = 8;
    let start = Math.max(1, page - Math.floor(RANGE / 2));
    const end = Math.min(totalPages, start + RANGE - 1);
    start = Math.max(1, Math.min(start, end - RANGE + 1));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const renderOrder = (o: TransactionOrder, i: number) => {
    const sr = (page - 1) * pageSize + i + 1;
    const open = expanded === o.id;
    return (
      <View key={o.id}>
        <View style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
          <TouchableOpacity style={tbl.wSr} onPress={() => setExpanded(open ? null : o.id)}>
            <View style={tbl.srCell}>
              <Text style={[tbl.cell, tbl.muted]}>{sr}</Text>
              <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
            </View>
          </TouchableOpacity>
          <ClientNameCell
            name={o.client_name}
            clientId={o.client_id}
            style={[tbl.cell, tbl.red, tbl.wClient]}
          />
          <Text style={[tbl.cell, tbl.wOrder]}>{o.id}</Text>
          <Text style={[tbl.cell, tbl.wSold]} numberOfLines={1}>{o.sold_by ?? '—'}</Text>
          <Text style={[tbl.cell, tbl.wDate]}>{saleDate(o.date)}</Text>
          <Text style={[tbl.cell, tbl.wMoney]}>{rs(o.price)}</Text>
          <Text style={[tbl.cell, tbl.wMoney]}>{rs(o.discount)}</Text>
          <Text style={[tbl.cell, tbl.wMoney]}>{rs(o.tax)}</Text>
          <Text style={[tbl.cell, tbl.wMoney, orderPending(o) > 0 && tbl.pending]}>{rs(orderPending(o))}</Text>
          <Text style={[tbl.cell, tbl.wMoney, tbl.bold]}>{rs(o.net_price)}</Text>
          <Text style={[tbl.cell, tbl.wPay]} numberOfLines={1}>{orderPaymentType(o)}</Text>
        </View>

        {open && (
          <View style={tbl.detail}>
            {(o.items ?? []).map(it => (
              <View key={it.id} style={tbl.detailRow}>
                <Text style={tbl.detailName} numberOfLines={1}>{it.package_name}</Text>
                <Text style={tbl.detailVal}>{rs(it.price)}</Text>
                <Text style={tbl.detailVal}>-{rs(it.discount)}</Text>
                <Text style={[tbl.detailVal, tbl.bold]}>{rs(it.net_price)}</Text>
              </View>
            ))}
            {!!o.note && <Text style={tbl.detailNote}>{o.note}</Text>}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <AppHeader
        title="Transaction Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.screen} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.section}>Dates</Text>
          <View style={s.row}>
            <TouchableOpacity style={s.dateBtn} onPress={() => setPicker('start')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={s.fieldText}>{display(startDate)}</Text>
            </TouchableOpacity>
            <Text style={s.sep}>→</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => setPicker('end')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={s.fieldText}>{display(endDate)}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.section}>Quick Dates</Text>
          <QuickDates onRange={onQuickRange} disabled={loading} />

          <TouchableOpacity style={s.goBtn} onPress={runQuery} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.goText}>Go</Text>}
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="large" style={s.spinner} color="#E63946" />}

        {!loading && error && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>⚠️</Text>
            <Text style={s.emptyTitle}>Something went wrong</Text>
            <Text style={s.emptySubtitle}>{error}</Text>
          </View>
        )}

        {!loading && !error && result.orders.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🧾</Text>
            <Text style={s.emptyTitle}>No Transactions</Text>
            <Text style={s.emptySubtitle}>No transactions for the selected period.</Text>
          </View>
        )}

        {!loading && !error && result.orders.length > 0 && (
          <>
            <View style={s.resultHead}>
              <Text style={s.resultTitle}>FILTERED RESULT</Text>
              <TouchableOpacity style={s.sizeBtn} onPress={() => setSizeOpen(true)}>
                <Text style={s.sizeText}>{pageSize}</Text>
                <Icon name="chevron-down" size={15} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={tbl.header}>
                  <Text style={[tbl.headerCell, tbl.wSr]}>Sr#</Text>
                  <Text style={[tbl.headerCell, tbl.wClient]}>Client</Text>
                  <Text style={[tbl.headerCell, tbl.wOrder]}>Order ID</Text>
                  <Text style={[tbl.headerCell, tbl.wSold]}>Sold By</Text>
                  <Text style={[tbl.headerCell, tbl.wDate]}>Sale Date</Text>
                  <Text style={[tbl.headerCell, tbl.wMoney]}>Price</Text>
                  <Text style={[tbl.headerCell, tbl.wMoney]}>Discount</Text>
                  <Text style={[tbl.headerCell, tbl.wMoney]}>GST</Text>
                  <Text style={[tbl.headerCell, tbl.wMoney]}>Pending</Text>
                  <Text style={[tbl.headerCell, tbl.wMoney]}>Net Price</Text>
                  <Text style={[tbl.headerCell, tbl.wPay]}>Payment Type</Text>
                </View>
                {pageRows.map(renderOrder)}
              </View>
            </ScrollView>

            {totalPages > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pg.bar}>
                <TouchableOpacity style={[pg.textBtn, page === 1 && pg.btnDisabled]}
                  onPress={() => setPage(1)} disabled={page === 1}>
                  <Text style={[pg.textBtnLabel, page === 1 && pg.textDisabled]}>First Page</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]}
                  onPress={() => setPage(page - 1)} disabled={page === 1}>
                  <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
                </TouchableOpacity>
                {pageWindow.map(p => (
                  <TouchableOpacity key={p} style={[pg.btn, p === page && pg.btnActive]} onPress={() => setPage(p)}>
                    <Text style={[pg.num, p === page && pg.numActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]}
                  onPress={() => setPage(page + 1)} disabled={page === totalPages}>
                  <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
                </TouchableOpacity>
                <TouchableOpacity style={[pg.textBtn, page === totalPages && pg.btnDisabled]}
                  onPress={() => setPage(totalPages)} disabled={page === totalPages}>
                  <Text style={[pg.textBtnLabel, page === totalPages && pg.textDisabled]}>Last Page</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Whole-range totals, not this page's — the API's own figures for
                price/discount/net, summed for GST and Pending. */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Totals</Text>
              {([
                ['Total Price', result.totalPrice],
                ['Total Discount', result.totalDiscount],
                ['Total GST', result.totalGst],
                ['Total Net Price', result.totalNetPrice],
                ['Total Pending', result.totalPending],
              ] as const).map(([label, value]) => (
                <View key={label} style={s.totalRow}>
                  <Text style={s.totalLabel}>{label}</Text>
                  <Text style={s.totalValue}>{rs(value)}</Text>
                </View>
              ))}
            </View>

            <Text style={s.footnote}>
              Page {page} of {totalPages} · {result.orders.length} transactions
            </Text>
          </>
        )}
      </ScrollView>

      <Modal visible={sizeOpen} transparent animationType="fade" onRequestClose={() => setSizeOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setSizeOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Rows per page</Text>
            {PAGE_SIZES.map(n => (
              <TouchableOpacity key={n} style={s.sheetRow}
                onPress={() => { setPageSize(n); setPage(1); setSizeOpen(false); }}>
                <Text style={[s.sheetText, n === pageSize && s.sheetTextActive]}>{n}</Text>
                {n === pageSize && <Icon name="check" size={16} color="#E63946" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <DateTimePickerModal
        isVisible={picker !== null}
        mode="date"
        date={new Date(picker === 'start' ? startDate : endDate)}
        maximumDate={picker === 'start' ? new Date(endDate) : new Date()}
        minimumDate={picker === 'end' ? new Date(startDate) : undefined}
        onConfirm={onPick}
        onCancel={() => setPicker(null)}
      />
    </>
  );
};

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  content:      { padding: 12, paddingBottom: 32 },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  section:      { fontSize: 12, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, marginTop: 4 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  fieldText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  sep:          { fontSize: 14, color: '#999' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  spinner:      { marginTop: 40 },
  resultHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultTitle:  { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5 },
  sizeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFF' },
  sizeText:     { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  totalLabel:   { fontSize: 13, color: '#555' },
  totalValue:   { fontSize: 13, color: '#1A1A1A', fontWeight: '700' },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 },
  sheet:        { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 8 },
  sheetTitle:   { fontSize: 13, fontWeight: '700', color: '#888', paddingHorizontal: 16, paddingVertical: 8 },
  sheetRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  sheetText:    { fontSize: 14, color: '#1A1A1A' },
  sheetTextActive: { color: '#E63946', fontWeight: '700' },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  footnote:     { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 4 },
});

const tbl = StyleSheet.create({
  header:     { flexDirection: 'row', backgroundColor: '#C0392B', paddingVertical: 10, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', paddingHorizontal: 4 },
  row:        { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowAlt:     { backgroundColor: '#FBF8F8' },
  cell:       { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  srCell:     { flexDirection: 'row', alignItems: 'center' },
  muted:      { color: '#888' },
  bold:       { fontWeight: '700' },
  red:        { color: '#C0392B', fontWeight: '600' },
  pending:    { color: '#D97706', fontWeight: '700' },
  detail:     { backgroundColor: '#FAFAFA', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  detailRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 10 },
  detailName: { flex: 1, fontSize: 12, color: '#555' },
  detailVal:  { fontSize: 12, color: '#1A1A1A', width: 90, textAlign: 'right' },
  detailNote: { fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic' },
  wSr:        { width: 54 },
  wClient:    { width: 140 },
  wOrder:     { width: 72 },
  wSold:      { width: 110 },
  wDate:      { width: 92 },
  wMoney:     { width: 92 },
  wPay:       { width: 100 },
});

const pg = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 2 },
  btn: { minWidth: 32, height: 32, paddingHorizontal: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  btnDisabled: { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  num: { fontSize: 13, color: '#555', fontWeight: '600' },
  numActive: { color: '#fff' },
  textBtn: { height: 32, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  textBtnLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
  textDisabled: { color: '#bbb' },
});

export default TransactionReportScreen;
