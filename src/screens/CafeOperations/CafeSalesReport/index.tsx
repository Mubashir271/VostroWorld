// src/screens/CafeOperations/CafeSalesReport/index.tsx
//
// The web admin's Cafe Sales report. It is ONE page reached from two menus —
// "Cafe Sales Report" under Cafe and "Cafe Sales" under Reports (the breadcrumb
// reads "Reports » Cafe Sales" while the sidebar highlights Cafe Sales Report)
// — so both routes render this component.
//
// See the Cafe Sales Report notes in api/cafe.ts for the capture details and,
// in particular, for why the totals row deliberately disagrees with the GST and
// Net Price columns above it.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList,
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
  getDetailedCafeReport, getCafeReportItems, getCafeSummaryReport,
  cafeOrderGst, cafeOrderNet, cafeOrderReceived, cafeOrderPending, cafeOrderPayment,
  cafeSalesTotalGst, cafeSalesTotalNet, NamedOption,
} from '../../../api/cafe';

const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const saleDate = (iso: string) => { const [y, m, d] = (iso ?? '').split('-'); return y ? `${d}-${m}-${y}` : '—'; };
const today = () => fmt(new Date());
const rs = (n: number) => `Rs ${Math.round(Number(n) || 0).toLocaleString()}/-`;
const num = (v: any) => Number(v) || 0;

const ALL = '';
const PAGE_SIZES = [10, 25, 50, 100];

const CafeSalesReportScreen = () => {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [mode, setMode] = useState<'summary' | 'detail'>('detail');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [item, setItem] = useState<any>(ALL);
  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [items, setItems] = useState<NamedOption[]>([]);
  const [query, setQuery] = useState(() => ({ start_date: today(), end_date: today() }));

  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => { if (branchId) getCafeReportItems(branchId).then(setItems); }, [branchId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getDetailedCafeReport({ branch_id: branchId, ...query }),
      // Summary is the per-day rollup this codebase already documents:
      // /v1/transaction-report-summery with category 10.
      getCafeSummaryReport({ branch_id: branchId, ...query })
        .then(r => (r?.data?.data ?? r?.data ?? []))
        .catch(() => []),
    ])
      .then(([detail, sum]) => {
        if (cancelled) return;
        setOrders(detail.orders);
        setSummary(Array.isArray(sum) ? sum : []);
        setPage(1);
        setExpanded(null);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setOrders([]); setSummary([]);
        const status = err?.response?.status;
        setError(
          err?.code === 'ECONNABORTED'
            ? 'The request timed out. Try a shorter date range.'
            : err?.response?.data?.message || (status ? `Request failed (${status}).` : 'Could not load the cafe sales report.'),
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, query]);

  const go = () => setQuery({ start_date: startDate, end_date: endDate });

  const onPickDate = (d: Date) => {
    const v = fmt(d);
    if (datePicker === 'start') { setStartDate(v); if (v > endDate) setEndDate(v); }
    else setEndDate(v);
    setDatePicker(null);
  };

  // Select Item is applied to the returned rows — it is not sent to the server.
  const rows = useMemo(
    () => (item ? orders.filter(o => (o.items ?? []).some((i: any) => String(i.package_id) === String(item))) : orders),
    [orders, item],
  );

  // Columns use the item-level figures; totals use the order-level ones. That
  // mismatch is the web's, reproduced deliberately — see api/cafe.ts.
  const totals = useMemo(() => ({
    price: rows.reduce((n, o) => n + num(o.price), 0),
    discount: rows.reduce((n, o) => n + num(o.discount), 0),
    gst: rows.reduce((n, o) => n + cafeSalesTotalGst(o), 0),
    net: rows.reduce((n, o) => n + cafeSalesTotalNet(o), 0),
    received: rows.reduce((n, o) => n + cafeOrderReceived(o), 0),
    pending: rows.reduce((n, o) => n + cafeOrderPending(o), 0),
  }), [rows]);

  const summaryTotals = useMemo(() => summary.reduce((acc: any, r: any) => ({
    orders: acc.orders + num(r.order_count),
    price: acc.price + num(r.total_price),
    discount: acc.discount + num(r.total_discount),
    tax: acc.tax + num(r.total_tax),
    net: acc.net + num(r.total_net_price),
  }), { orders: 0, price: 0, discount: 0, tax: 0, net: 0 }), [summary]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );

  const itemOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [{ id: ALL, name: 'All Items' }, ...items];
    return (q ? list.filter(o => o.name.toLowerCase().includes(q)) : list).slice(0, 200);
  }, [items, search]);

  return (
    <>
      <AppHeader
        title="Cafe Sales"
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
            <TouchableOpacity style={s.dateBtn} onPress={() => setDatePicker('start')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={s.fieldText}>{display(startDate)}</Text>
            </TouchableOpacity>
            <Text style={s.sep}>→</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => setDatePicker('end')}>
              <Icon name="calendar" size={14} color="#E63946" />
              <Text style={s.fieldText}>{display(endDate)}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Select Item</Text>
          <TouchableOpacity style={s.field} onPress={() => { setSearch(''); setItemOpen(true); }}>
            <Text style={s.fieldText} numberOfLines={1}>
              {items.find(i => i.id === item)?.name ?? 'All Items'}
            </Text>
            <Icon name="chevron-down" size={16} color="#888" />
          </TouchableOpacity>

          <Text style={s.section}>Quick Dates</Text>
          <QuickDates onRange={(a, b) => { setStartDate(a); setEndDate(b); }} disabled={loading} />

          <Text style={s.section}>Options</Text>
          <View style={s.radioRow}>
            {(['summary', 'detail'] as const).map(m => (
              <TouchableOpacity key={m} style={s.radio} onPress={() => setMode(m)}>
                <Icon name={mode === m ? 'radiobox-marked' : 'radiobox-blank'} size={18}
                  color={mode === m ? '#E63946' : '#999'} />
                <Text style={[s.radioText, mode === m && s.radioTextActive]}>
                  {m === 'summary' ? 'Summary' : 'Detail'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.goBtn} onPress={go} disabled={loading}>
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

        {!loading && !error && mode === 'summary' && (
          summary.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>☕</Text>
              <Text style={s.emptyTitle}>No Records</Text>
              <Text style={s.emptySubtitle}>No cafe sales for the selected period.</Text>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>Summary</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={tbl.header}>
                    <Text style={[tbl.headerCell, tbl.wDate]}>Date</Text>
                    <Text style={[tbl.headerCell, tbl.wSmall]}>Orders</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>Price</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>Discount</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>GST</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>Net Price</Text>
                  </View>
                  {summary.map((r: any, i: number) => (
                    <View key={r.order_date ?? i} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
                      <Text style={[tbl.cell, tbl.wDate]}>{r.order_date ?? '—'}</Text>
                      <Text style={[tbl.cell, tbl.wSmall]}>{r.order_count ?? 0}</Text>
                      <Text style={[tbl.cell, tbl.wMoney]}>{rs(num(r.total_price))}</Text>
                      <Text style={[tbl.cell, tbl.wMoney]}>{rs(num(r.total_discount))}</Text>
                      <Text style={[tbl.cell, tbl.wMoney]}>{rs(num(r.total_tax))}</Text>
                      <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(num(r.total_net_price))}</Text>
                    </View>
                  ))}
                  <View style={tbl.totalsRow}>
                    <Text style={[tbl.cell, tbl.bold, tbl.wDate]}>Totals</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wSmall]}>{summaryTotals.orders}</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(summaryTotals.price)}</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(summaryTotals.discount)}</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(summaryTotals.tax)}</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(summaryTotals.net)}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          )
        )}

        {!loading && !error && mode === 'detail' && (
          rows.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>☕</Text>
              <Text style={s.emptyTitle}>No Records</Text>
              <Text style={s.emptySubtitle}>No cafe sales for the selected filters.</Text>
            </View>
          ) : (
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
                    <Text style={[tbl.headerCell, tbl.wDate]}>Sale Date</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>Price</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>Discount</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>GST</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>Net Price</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>Received</Text>
                    <Text style={[tbl.headerCell, tbl.wMoney]}>Pending</Text>
                    <Text style={[tbl.headerCell, tbl.wPay]}>Payment Type</Text>
                  </View>

                  {pageRows.map((o: any, i: number) => {
                    const open = expanded === o.id;
                    return (
                      <View key={o.id}>
                        <View style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
                          <TouchableOpacity style={tbl.wSr} onPress={() => setExpanded(open ? null : o.id)}>
                            <View style={tbl.srCell}>
                              <Text style={[tbl.cell, tbl.muted]}>{(page - 1) * pageSize + i + 1}</Text>
                              <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
                            </View>
                          </TouchableOpacity>
                          <ClientNameCell name={o.client_name} clientId={o.client_id}
                            style={[tbl.cell, tbl.red, tbl.wClient]} />
                          <Text style={[tbl.cell, tbl.wOrder]}>{o.id}</Text>
                          <Text style={[tbl.cell, tbl.wDate]}>{saleDate(o.date)}</Text>
                          <Text style={[tbl.cell, tbl.wMoney]}>{rs(o.price)}</Text>
                          <Text style={[tbl.cell, tbl.wMoney]}>{rs(o.discount)}</Text>
                          <Text style={[tbl.cell, tbl.wMoney]}>{rs(cafeOrderGst(o))}</Text>
                          <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(cafeOrderNet(o))}</Text>
                          <Text style={[tbl.cell, tbl.wMoney]}>{rs(cafeOrderReceived(o))}</Text>
                          <Text style={[tbl.cell, tbl.wMoney, cafeOrderPending(o) > 0 && tbl.pending]}>
                            {rs(cafeOrderPending(o))}
                          </Text>
                          <Text style={[tbl.cell, tbl.wPay]} numberOfLines={1}>{cafeOrderPayment(o)}</Text>
                        </View>
                        {open && (
                          <View style={tbl.detail}>
                            {(o.items ?? []).map((it: any) => (
                              <View key={it.id} style={tbl.detailRow}>
                                <Text style={tbl.detailName} numberOfLines={1}>{it.package_name}</Text>
                                <Text style={tbl.detailVal}>{rs(it.price)}</Text>
                                <Text style={tbl.detailVal}>GST {rs(it.tax)}</Text>
                                <Text style={[tbl.detailVal, tbl.bold]}>{rs(it.net_price)}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}

                  <View style={tbl.totalsRow}>
                    <Text style={[tbl.totalsLabel, tbl.wTotalsLabel]}>Totals</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(totals.price)}</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(totals.discount)}</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(totals.gst)}</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(totals.net)}</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(totals.received)}</Text>
                    <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(totals.pending)}</Text>
                  </View>
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
                  <View style={pg.btn}><Text style={pg.num}>{page}</Text></View>
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

              <View style={s.card}>
                <Text style={s.cardTitle}>Totals</Text>
                {([
                  ['Total Price', totals.price],
                  ['Total Discount', totals.discount],
                  ['Total GST', totals.gst],
                  ['Total Net Price', totals.net],
                  ['Total Received', totals.received],
                  ['Total Pending', totals.pending],
                ] as const).map(([label, value]) => (
                  <View key={label} style={s.totalRow}>
                    <Text style={s.totalLabel}>{label}</Text>
                    <Text style={s.totalValue}>{rs(value)}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.footnote}>Page {page} of {totalPages} · {rows.length} orders</Text>
            </>
          )
        )}
      </ScrollView>

      <Modal visible={itemOpen} transparent animationType="fade" onRequestClose={() => setItemOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setItemOpen(false)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1}>
            <Text style={s.sheetTitle}>Select Item</Text>
            <TextInput style={s.search} placeholder="Search…" placeholderTextColor="#B0B0B0"
              value={search} onChangeText={setSearch} autoCorrect={false} />
            <FlatList
              data={itemOptions}
              keyExtractor={o => String(o.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: o }) => (
                <TouchableOpacity style={s.sheetRow}
                  onPress={() => { setItem(o.id); setItemOpen(false); setPage(1); }}>
                  <Text style={[s.sheetText, o.id === item && s.sheetTextActive]}>{o.name}</Text>
                  {o.id === item && <Icon name="check" size={16} color="#E63946" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.sheetEmpty}>No matching items.</Text>}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
        isVisible={datePicker !== null}
        mode="date"
        date={new Date(datePicker === 'start' ? startDate : endDate)}
        maximumDate={datePicker === 'start' ? new Date(endDate) : new Date()}
        minimumDate={datePicker === 'end' ? new Date(startDate) : undefined}
        onConfirm={onPickDate}
        onCancel={() => setDatePicker(null)}
      />
    </>
  );
};

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F5F7FA' },
  content:      { padding: 12, paddingBottom: 32 },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  section:      { fontSize: 12, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, marginTop: 6 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label:        { fontSize: 11, color: '#888', marginBottom: 4 },
  dateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  field:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  fieldText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500', flex: 1 },
  sep:          { fontSize: 14, color: '#999' },
  radioRow:     { flexDirection: 'row', gap: 24, marginBottom: 12 },
  radio:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioText:    { fontSize: 13, color: '#555' },
  radioTextActive: { color: '#E63946', fontWeight: '700' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
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
  sheet:        { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 8, maxHeight: '70%' },
  sheetTitle:   { fontSize: 13, fontWeight: '700', color: '#888', paddingHorizontal: 16, paddingVertical: 8 },
  sheetRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  sheetText:    { fontSize: 14, color: '#1A1A1A', flex: 1 },
  sheetTextActive: { color: '#E63946', fontWeight: '700' },
  sheetEmpty:   { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 24 },
  search:       { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  empty:        { alignItems: 'center', paddingVertical: 50 },
  emptyIcon:    { fontSize: 44, marginBottom: 10 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
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
  totalsRow:  { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, backgroundColor: '#FFF7F7', borderTopWidth: 1, borderTopColor: '#F0D0D0' },
  totalsLabel:{ fontSize: 12, fontWeight: '800', color: '#1A1A1A', paddingHorizontal: 4, textAlign: 'right' },
  detail:     { backgroundColor: '#FAFAFA', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  detailRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 10 },
  detailName: { flex: 1, fontSize: 12, color: '#555', minWidth: 140 },
  detailVal:  { fontSize: 12, color: '#1A1A1A', width: 100, textAlign: 'right' },
  wSr:        { width: 54 },
  wClient:    { width: 150 },
  wOrder:     { width: 72 },
  wDate:      { width: 92 },
  wSmall:     { width: 64 },
  wMoney:     { width: 92 },
  wPay:       { width: 100 },
  wTotalsLabel: { width: 368 },
});

const pg = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 2 },
  btn: { minWidth: 32, height: 32, paddingHorizontal: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnDisabled: { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  num: { fontSize: 13, color: '#555', fontWeight: '600' },
  textBtn: { height: 32, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  textBtnLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
  textDisabled: { color: '#bbb' },
});

export default CafeSalesReportScreen;
