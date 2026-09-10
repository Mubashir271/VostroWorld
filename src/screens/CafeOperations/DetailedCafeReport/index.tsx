// src/screens/CafeOperations/DetailedCafeReport/index.tsx
//
// The web admin's Detailed Cafe Report — reachable from both Cafe and Reports,
// as it is on the web. See getDetailedCafeReport in api/cafe.ts for the
// capture notes and the money rules.
//
// Only Branch / dates / Client reach the server; Item, Staff, Sale Type,
// Payment Type, Sold By and Order ID filter the returned rows, which is how
// the web behaves. The ten tiles are computed over the filtered rows, so they
// move with the filters — the response's own totals are shown separately
// because they don't agree with the rows it returns.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { RootState } from '../../../redux/store';
import {
  getDetailedCafeReport, getCafeReportBranches, getCafeReportItems,
  getCafeReportClients, getCafeReportUsers,
  cafeOrderGst, cafeOrderNet, cafeOrderReceived, cafeOrderPending, cafeOrderPayment,
  cafeSaleType, CafeSaleType, NamedOption,
} from '../../../api/cafe';

const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const display = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const saleDate = (iso: string) => { const [y, m, d] = (iso ?? '').split('-'); return y ? `${d}-${m}-${y}` : '—'; };
const today = () => fmt(new Date());
const rs = (n: number) => `Rs ${Math.round(Number(n) || 0).toLocaleString()} /-`;

const ALL = '';
const PAGE_SIZES = [10, 25, 50, 100];
const SALE_TYPES = [
  { id: ALL, name: 'All Sales' },
  { id: 'Regular', name: 'Regular' },
  { id: 'Staff', name: 'Staff' },
  { id: 'Management', name: 'Management' },
];

// The six buttons this page shows, unlike the twelve on the Reports pages.
// The quick ranges are computed here rather than through /v1/get-dates: this
// page's set doesn't line up with the keys that endpoint is known to serve,
// and none of these buttons were exercised in the capture.
const startOfQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
const shift = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const QUICK: { label: string; range: () => [string, string] }[] = [
  { label: 'Last Month', range: () => { const n = new Date(); return [fmt(new Date(n.getFullYear(), n.getMonth() - 1, 1)), fmt(new Date(n.getFullYear(), n.getMonth(), 0))]; } },
  { label: 'Last Quarter', range: () => { const s = startOfQuarter(new Date()); const e = new Date(s.getTime() - 86400000); return [fmt(startOfQuarter(e)), fmt(e)]; } },
  { label: 'Yesterday', range: () => [fmt(shift(1)), fmt(shift(1))] },
  { label: 'To-Date', range: () => { const n = new Date(); return [fmt(new Date(n.getFullYear(), n.getMonth(), 1)), fmt(n)]; } },
  { label: 'Previous 30 days', range: () => [fmt(shift(29)), today()] },
  { label: 'Previous 90 days', range: () => [fmt(shift(89)), today()] },
];

type Picker = { title: string; options: { id: any; name: string }[]; value: any; onSelect: (v: any) => void };

const Field = ({ label, text, placeholder, onPress }: {
  label: string; text?: string; placeholder: string; onPress: () => void;
}) => (
  <View style={s.half}>
    <Text style={s.label}>{label}</Text>
    <TouchableOpacity style={s.field} onPress={onPress}>
      <Text style={[s.fieldText, !text && s.placeholder]} numberOfLines={1}>{text || placeholder}</Text>
      <Icon name="chevron-down" size={16} color="#888" />
    </TouchableOpacity>
  </View>
);

const Tile = ({ label, value }: { label: string; value: string }) => (
  <View style={s.tile}>
    <Text style={s.tileLabel}>{label}</Text>
    <Text style={s.tileValue}>{value}</Text>
  </View>
);

const DetailedCafeReportScreen = () => {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const ownBranch = profile?.branchId || '';

  const [branch, setBranch] = useState<any>(ownBranch);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [orderId, setOrderId] = useState('');
  const [item, setItem] = useState<any>(ALL);
  const [client, setClient] = useState<any>(ALL);
  const [staff, setStaff] = useState<any>(ALL);
  const [saleType, setSaleType] = useState<any>(ALL);
  const [payment, setPayment] = useState<any>(ALL);
  const [soldBy, setSoldBy] = useState<any>(ALL);

  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [search, setSearch] = useState('');

  const [branches, setBranches] = useState<NamedOption[]>([]);
  const [items, setItems] = useState<NamedOption[]>([]);
  const [clients, setClients] = useState<NamedOption[]>([]);
  const [users, setUsers] = useState<NamedOption[]>([]);
  const [mgmt, setMgmt] = useState<NamedOption[]>([]);

  const [query, setQuery] = useState(() => ({
    branch_id: ownBranch, start_date: today(), end_date: today(), client_id: ALL as any,
  }));
  const [orders, setOrders] = useState<any[]>([]);
  const [apiTotals, setApiTotals] = useState({ price: 0, discount: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => { getCafeReportBranches().then(setBranches); }, []);

  useEffect(() => {
    if (!branch) return;
    getCafeReportItems(branch).then(setItems);
    getCafeReportClients(branch).then(setClients);
    getCafeReportUsers(branch, 'no').then(setUsers);
    getCafeReportUsers(branch, 'yes').then(setMgmt);
  }, [branch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDetailedCafeReport(query)
      .then(res => {
        if (cancelled) return;
        setOrders(res.orders);
        setApiTotals({ price: res.apiTotalPrice, discount: res.apiTotalDiscount, net: res.apiTotalNetPrice });
        setPage(1);
        setExpanded(null);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setOrders([]);
        const status = err?.response?.status;
        setError(
          err?.code === 'ECONNABORTED'
            ? 'The request timed out. Try a shorter date range.'
            : err?.response?.data?.message || (status ? `Request failed (${status}).` : 'Could not load the cafe report.'),
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  const generate = () => setQuery({
    branch_id: branch, start_date: startDate, end_date: endDate, client_id: client,
  });

  const onPickDate = (d: Date) => {
    const v = fmt(d);
    if (datePicker === 'start') { setStartDate(v); if (v > endDate) setEndDate(v); }
    else setEndDate(v);
    setDatePicker(null);
  };

  const staffIds = useMemo(() => new Set(users.map(u => u.id)), [users]);
  const mgmtIds = useMemo(() => new Set(mgmt.map(u => u.id)), [mgmt]);

  // Everything except Branch/dates/Client is applied here, as on the web.
  const filtered = useMemo(() => orders.filter(o => {
    if (orderId.trim() && !String(o.id).includes(orderId.trim())) return false;
    if (item && !(o.items ?? []).some((i: any) => String(i.package_id) === String(item))) return false;
    if (soldBy) {
      const u = users.find(x => x.id === soldBy);
      if (!u || String(o.sold_by ?? '').trim() !== u.name) return false;
    }
    if (payment && !cafeOrderPayment(o).split(', ').includes(payment)) return false;
    const type: CafeSaleType = cafeSaleType(o, staffIds, mgmtIds);
    if (saleType && type !== saleType) return false;
    if (staff) {
      const m = /,\s*(\d+)\s*$/.exec(String(o.note ?? ''));
      if (!m || Number(m[1]) !== staff) return false;
    }
    return true;
  }), [orders, orderId, item, soldBy, payment, saleType, staff, users, staffIds, mgmtIds]);

  const totals = useMemo(() => {
    const gross = filtered.reduce((n, o) => n + (Number(o.price) || 0), 0);
    const discount = filtered.reduce((n, o) => n + (Number(o.discount) || 0), 0);
    const gst = filtered.reduce((n, o) => n + cafeOrderGst(o), 0);
    const staffDisc = filtered
      .filter(o => cafeSaleType(o, staffIds, mgmtIds) === 'Staff')
      .reduce((n, o) => n + (Number(o.discount) || 0), 0);
    const mgmtDisc = filtered
      .filter(o => cafeSaleType(o, staffIds, mgmtIds) === 'Management')
      .reduce((n, o) => n + (Number(o.discount) || 0), 0);
    return {
      orders: filtered.length,
      gross,
      withoutGst: gross - discount,
      discount,
      staffDisc,
      mgmtDisc,
      gst,
      net: filtered.reduce((n, o) => n + cafeOrderNet(o), 0),
      received: filtered.reduce((n, o) => n + cafeOrderReceived(o), 0),
      pending: filtered.reduce((n, o) => n + cafeOrderPending(o), 0),
    };
  }, [filtered, staffIds, mgmtIds]);

  const paymentTypes = useMemo(
    () => [...new Set(orders.flatMap((o: any) => (o.payment_history ?? []).map((p: any) => p.payment_type)).filter(Boolean))]
      .map(p => ({ id: p, name: p as string })),
    [orders],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const openPicker = useCallback((p: Picker) => { setSearch(''); setPicker(p); }, []);

  const pickerOptions = useMemo(() => {
    if (!picker) return [];
    const q = search.trim().toLowerCase();
    const list = q ? picker.options.filter(o => o.name.toLowerCase().includes(q)) : picker.options;
    return list.slice(0, 200);
  }, [picker, search]);

  const nameOf = (list: { id: any; name: string }[], id: any) => list.find(o => o.id === id)?.name;

  return (
    <>
      <AppHeader
        title="Detailed Cafe Report"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.screen} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.subtitle}>
            Branch, date, item, client, staff, payment and sale-type filters with full cafe totals.
          </Text>

          <View style={s.row}>
            <Field label="Branch" placeholder="Select branch"
              text={nameOf(branches, Number(branch))}
              onPress={() => openPicker({
                title: 'Branch', options: branches, value: Number(branch),
                onSelect: v => setBranch(v),
              })} />
            <View style={s.half}>
              <Text style={s.label}>Order ID</Text>
              <TextInput style={s.input} value={orderId} onChangeText={setOrderId}
                placeholder="Optional" placeholderTextColor="#B0B0B0" keyboardType="number-pad" />
            </View>
          </View>

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.label}>Start Date</Text>
              <TouchableOpacity style={s.field} onPress={() => setDatePicker('start')}>
                <Text style={s.fieldText}>{display(startDate)}</Text>
                <Icon name="calendar" size={15} color="#E63946" />
              </TouchableOpacity>
            </View>
            <View style={s.half}>
              <Text style={s.label}>End Date</Text>
              <TouchableOpacity style={s.field} onPress={() => setDatePicker('end')}>
                <Text style={s.fieldText}>{display(endDate)}</Text>
                <Icon name="calendar" size={15} color="#E63946" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.row}>
            <Field label="Item" placeholder="All Items" text={nameOf(items, item)}
              onPress={() => openPicker({
                title: 'Item', options: [{ id: ALL, name: 'All Items' }, ...items],
                value: item, onSelect: setItem,
              })} />
            <Field label="Client" placeholder="All Clients" text={nameOf(clients, client)}
              onPress={() => openPicker({
                title: 'Client', options: [{ id: ALL, name: 'All Clients' }, ...clients],
                value: client, onSelect: setClient,
              })} />
          </View>

          <View style={s.row}>
            <Field label="Staff / Management" placeholder="All Staff" text={nameOf(mgmt, staff)}
              onPress={() => openPicker({
                title: 'Staff / Management', options: [{ id: ALL, name: 'All Staff' }, ...mgmt],
                value: staff, onSelect: setStaff,
              })} />
            <Field label="Sale Type" placeholder="All Sales" text={nameOf(SALE_TYPES, saleType)}
              onPress={() => openPicker({
                title: 'Sale Type', options: SALE_TYPES, value: saleType, onSelect: setSaleType,
              })} />
          </View>

          <View style={s.row}>
            <Field label="Payment Type" placeholder="All Payments" text={nameOf(paymentTypes, payment)}
              onPress={() => openPicker({
                title: 'Payment Type', options: [{ id: ALL, name: 'All Payments' }, ...paymentTypes],
                value: payment, onSelect: setPayment,
              })} />
            <Field label="Sold By" placeholder="All Users" text={nameOf(users, soldBy)}
              onPress={() => openPicker({
                title: 'Sold By', options: [{ id: ALL, name: 'All Users' }, ...users],
                value: soldBy, onSelect: setSoldBy,
              })} />
          </View>

          <View style={s.quickRow}>
            {QUICK.map(q => (
              <TouchableOpacity key={q.label} style={s.chip}
                onPress={() => { const [a, b] = q.range(); setStartDate(a); setEndDate(b); }}>
                <Text style={s.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.goBtn} onPress={generate} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.goText}>Generate Report</Text>}
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

        {!loading && !error && (
          <>
            <View style={s.tiles}>
              <Tile label="Total Orders" value={String(totals.orders)} />
              <Tile label="Gross Sales (Before Discount)" value={rs(totals.gross)} />
              <Tile label="Sales Without GST" value={rs(totals.withoutGst)} />
              <Tile label="Total Discount" value={rs(totals.discount)} />
              <Tile label="Staff Discounts" value={rs(totals.staffDisc)} />
              <Tile label="Management Discounts" value={rs(totals.mgmtDisc)} />
              <Tile label="Total GST" value={rs(totals.gst)} />
              <Tile label="Net Sales (With GST)" value={rs(totals.net)} />
              <Tile label="Total Received" value={rs(totals.received)} />
              <Tile label="Total Pending" value={rs(totals.pending)} />
            </View>

            <View style={s.resultHead}>
              <View style={s.flex1}>
                <Text style={s.resultTitle}>FILTERED RESULTS ({filtered.length})</Text>
                <Text style={s.apiTotals}>
                  API totals for selected range: Gross {rs(apiTotals.price)} · Discount {rs(apiTotals.discount)} · Net {rs(apiTotals.net)}
                </Text>
              </View>
              <TouchableOpacity style={s.sizeBtn}
                onPress={() => openPicker({
                  title: 'Rows per page',
                  options: PAGE_SIZES.map(n => ({ id: n, name: String(n) })),
                  value: pageSize,
                  onSelect: v => { setPageSize(v); setPage(1); },
                })}>
                <Text style={s.sizeText}>{pageSize}</Text>
                <Icon name="chevron-down" size={15} color="#888" />
              </TouchableOpacity>
            </View>

            {filtered.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>☕</Text>
                <Text style={s.emptyTitle}>No Results</Text>
                <Text style={s.emptySubtitle}>No cafe sales match these filters.</Text>
              </View>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={tbl.header}>
                      <Text style={[tbl.headerCell, tbl.wSr]}>Sr#</Text>
                      <Text style={[tbl.headerCell, tbl.wClient]}>Client / Staff</Text>
                      <Text style={[tbl.headerCell, tbl.wBranch]}>Branch</Text>
                      <Text style={[tbl.headerCell, tbl.wOrder]}>Order ID</Text>
                      <Text style={[tbl.headerCell, tbl.wDate]}>Sale Date</Text>
                      <Text style={[tbl.headerCell, tbl.wType]}>Sale Type</Text>
                      <Text style={[tbl.headerCell, tbl.wMoney]}>Price</Text>
                      <Text style={[tbl.headerCell, tbl.wMoney]}>Discount</Text>
                      <Text style={[tbl.headerCell, tbl.wMoney]}>GST</Text>
                      <Text style={[tbl.headerCell, tbl.wMoney]}>Net Price</Text>
                      <Text style={[tbl.headerCell, tbl.wMoney]}>Received</Text>
                      <Text style={[tbl.headerCell, tbl.wMoney]}>Pending</Text>
                      <Text style={[tbl.headerCell, tbl.wPay]}>Payment</Text>
                      <Text style={[tbl.headerCell, tbl.wSold]}>Sold By</Text>
                    </View>

                    {pageRows.map((o, i) => {
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
                            <Text style={[tbl.cell, tbl.wBranch]}>{o.branch_name ?? '—'}</Text>
                            <Text style={[tbl.cell, tbl.wOrder]}>{o.id}</Text>
                            <Text style={[tbl.cell, tbl.wDate]}>{saleDate(o.date)}</Text>
                            <Text style={[tbl.cell, tbl.wType]}>{cafeSaleType(o, staffIds, mgmtIds)}</Text>
                            <Text style={[tbl.cell, tbl.wMoney]}>{rs(o.price)}</Text>
                            <Text style={[tbl.cell, tbl.wMoney]}>{rs(o.discount)}</Text>
                            <Text style={[tbl.cell, tbl.wMoney]}>{rs(cafeOrderGst(o))}</Text>
                            <Text style={[tbl.cell, tbl.wMoney, tbl.bold]}>{rs(cafeOrderNet(o))}</Text>
                            <Text style={[tbl.cell, tbl.wMoney]}>{rs(cafeOrderReceived(o))}</Text>
                            <Text style={[tbl.cell, tbl.wMoney, cafeOrderPending(o) > 0 && tbl.pending]}>
                              {rs(cafeOrderPending(o))}
                            </Text>
                            <Text style={[tbl.cell, tbl.wPay]} numberOfLines={1}>{cafeOrderPayment(o)}</Text>
                            <Text style={[tbl.cell, tbl.wSold]} numberOfLines={1}>{o.sold_by ?? '—'}</Text>
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
                              {!!o.note && <Text style={tbl.detailNote}>{o.note}</Text>}
                            </View>
                          )}
                        </View>
                      );
                    })}

                    <View style={tbl.totalsRow}>
                      <Text style={[tbl.totalsLabel, tbl.wTotalsLabel]}>Totals</Text>
                      <Text style={[tbl.cell, tbl.bold, tbl.wMoney]}>{rs(totals.gross)}</Text>
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

                <Text style={s.footnote}>Page {page} of {totalPages} · {filtered.length} of {orders.length} orders</Text>
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setPicker(null)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1}>
            <Text style={s.sheetTitle}>{picker?.title}</Text>
            {(picker?.options.length ?? 0) > 12 && (
              <TextInput style={s.search} placeholder="Search…" placeholderTextColor="#B0B0B0"
                value={search} onChangeText={setSearch} autoCorrect={false} />
            )}
            <FlatList
              data={pickerOptions}
              keyExtractor={o => String(o.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: o }) => (
                <TouchableOpacity style={s.sheetRow}
                  onPress={() => { picker?.onSelect(o.id); setPicker(null); }}>
                  <Text style={[s.sheetText, o.id === picker?.value && s.sheetTextActive]}>{o.name}</Text>
                  {o.id === picker?.value && <Icon name="check" size={16} color="#E63946" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.sheetEmpty}>Nothing to choose from.</Text>}
            />
          </TouchableOpacity>
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
  subtitle:     { fontSize: 11, color: '#888', marginBottom: 10 },
  row:          { flexDirection: 'row', gap: 8, marginBottom: 8 },
  half:         { flex: 1 },
  flex1:        { flex: 1 },
  label:        { fontSize: 11, color: '#888', marginBottom: 4 },
  field:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA' },
  fieldText:    { fontSize: 13, color: '#1A1A1A', fontWeight: '500', flex: 1 },
  placeholder:  { color: '#B0B0B0', fontWeight: '400' },
  input:        { borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: '#FAFAFA', fontSize: 13, color: '#1A1A1A' },
  quickRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10, marginTop: 2 },
  chip:         { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#F0F0F0', borderRadius: 14 },
  chipText:     { fontSize: 12, color: '#444', fontWeight: '500' },
  goBtn:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  goText:       { color: '#FFF', fontWeight: '700', fontSize: 15 },
  spinner:      { marginTop: 40 },
  tiles:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tile:         { flexGrow: 1, minWidth: '47%', backgroundColor: '#FFF', borderRadius: 10, padding: 12, elevation: 1 },
  tileLabel:    { fontSize: 10, color: '#888', marginBottom: 4 },
  tileValue:    { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  resultHead:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  resultTitle:  { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5 },
  apiTotals:    { fontSize: 10, color: '#999', marginTop: 2 },
  sizeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFF' },
  sizeText:     { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
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
  detailNote: { fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic' },
  wSr:        { width: 54 },
  wClient:    { width: 150 },
  wBranch:    { width: 60 },
  wOrder:     { width: 72 },
  wDate:      { width: 92 },
  wType:      { width: 80 },
  wMoney:     { width: 92 },
  wPay:       { width: 90 },
  wSold:      { width: 100 },
  wTotalsLabel: { width: 508 },
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

export default DetailedCafeReportScreen;
