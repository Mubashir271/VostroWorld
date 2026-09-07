// src/screens/home/RenewalsPanel.tsx
//
// The dashboard's "RENEWALS …" panel, mirroring the web admin's Sales
// dashboard: three package tabs, a From/To date range, a Quick Filter, four
// summary boxes and a server-paginated table.
//
// Everything here is server-side — the endpoint returns 3280 rows across
// 1094 pages for branch 15 alone, so the table pages through the API 25 at a
// time rather than pulling the set down and slicing it locally.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useNavigation } from '@react-navigation/native';
import {
  getRenewals,
  RENEWAL_TABS,
  RENEWAL_DURATIONS,
  RENEWAL_STATUSES,
  EMPTY_RENEWAL_SUMMARY,
  RenewalRow,
  RenewalSummary,
} from '../../api/dashboard';

const PAGE_SIZE = 25;

// end_date arrives as YYYY-MM-DD; the web renders DD-MM-YYYY.
const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso;
};

const toApiDate = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const statusLabel = (s: string) =>
  s === 'renewed' ? 'Renewed' : s === 'expired' ? 'Expired' : 'Pending';

type Props = { branchId: number | string };

const RenewalsPanel = ({ branchId }: Props) => {
  const navigation = useNavigation() as any;

  const [category, setCategory] = useState<string>(RENEWAL_TABS[0].key);
  const [duration, setDuration] = useState('');
  const [renewalStatus, setRenewalStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [picker, setPicker] = useState<null | 'from' | 'to'>(null);

  const [rows, setRows] = useState<RenewalRow[]>([]);
  const [summary, setSummary] = useState<RenewalSummary>(EMPTY_RENEWAL_SUMMARY);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTab = RENEWAL_TABS.find(t => t.key === category) ?? RENEWAL_TABS[0];

  // Sliding window of page numbers, centred on the current page — the same
  // shape react-js-pagination gives the web at pageRangeDisplayed: 8.
  const pageWindow = useMemo(() => {
    const RANGE = 8;
    let start = Math.max(1, page - Math.floor(RANGE / 2));
    const end = Math.min(totalPages, start + RANGE - 1);
    start = Math.max(1, Math.min(start, end - RANGE + 1));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getRenewals({
        branch_id: branchId,
        category,
        page,
        limit: PAGE_SIZE,
        duration,
        from_date: fromDate,
        to_date: toDate,
        renewal_status: renewalStatus,
      });
      setRows(res.rows);
      setSummary(res.summary);
      setTotalPages(Math.max(1, res.totalPages));
    } catch (e: any) {
      // The web treats a 404 as "no rows" rather than an error — the endpoint
      // returns it for filter combinations that match nothing.
      if (e?.response?.status === 404) {
        setRows([]);
        setSummary(e.response?.data?.summary ?? EMPTY_RENEWAL_SUMMARY);
        setTotalPages(1);
      } else {
        setError('Could not load renewals.');
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, category, page, duration, fromDate, toDate, renewalStatus]);

  useEffect(() => { load(); }, [load]);

  // Any filter change restarts at page 1; changing the tab clears the filters
  // the way the web's tab handler does.
  const selectTab = (key: string) => {
    if (key === category) return;
    setCategory(key);
    setDuration('');
    setRenewalStatus('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const selectDuration = (value: string) => {
    setDuration(value);
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const applyDateRange = (which: 'from' | 'to', date: Date) => {
    const value = toApiDate(date);
    if (which === 'from') setFromDate(value); else setToDate(value);
    setDuration('');
    setPage(1);
  };

  const clearDates = () => {
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <View style={s.wrap}>
      {/* Tabs */}
      <View style={s.tabs}>
        {RENEWAL_TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, category === t.key && s.tabActive]}
            onPress={() => selectTab(t.key)}
          >
            <Text style={[s.tabText, category === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.title}>{activeTab.title}</Text>

      {/* Date range */}
      <View style={s.dateRow}>
        <TouchableOpacity style={s.dateField} onPress={() => setPicker('from')}>
          <Text style={s.dateLabel}>From</Text>
          <Text style={[s.dateValue, !fromDate && s.datePlaceholder]}>
            {fromDate ? formatDate(fromDate) : 'Select'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.dateField} onPress={() => setPicker('to')}>
          <Text style={s.dateLabel}>To</Text>
          <Text style={[s.dateValue, !toDate && s.datePlaceholder]}>
            {toDate ? formatDate(toDate) : 'Select'}
          </Text>
        </TouchableOpacity>
        {(fromDate || toDate) ? (
          <TouchableOpacity style={s.clearBtn} onPress={clearDates}>
            <Icon name="close" size={16} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
        {RENEWAL_DURATIONS.map(d => (
          <TouchableOpacity
            key={d.value || 'all'}
            style={[s.chip, duration === d.value && !fromDate && !toDate && s.chipActive]}
            onPress={() => selectDuration(d.value)}
          >
            <Text style={[s.chipText, duration === d.value && !fromDate && !toDate && s.chipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary boxes */}
      <View style={s.summaryGrid}>
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Total Due</Text>
          <Text style={s.summaryValue}>{summary.total?.toLocaleString() ?? 0}</Text>
        </View>
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Renewed</Text>
          <Text style={[s.summaryValue, s.green]}>{summary.renewed?.toLocaleString() ?? 0}</Text>
        </View>
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Expired</Text>
          <Text style={[s.summaryValue, s.red]}>{summary.expired?.toLocaleString() ?? 0}</Text>
        </View>
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Remaining</Text>
          <Text style={[s.summaryValue, s.amber]}>{summary.remaining?.toLocaleString() ?? 0}</Text>
        </View>
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
        {RENEWAL_STATUSES.map(st => (
          <TouchableOpacity
            key={st.value}
            style={[s.chip, renewalStatus === st.value && s.chipActive]}
            onPress={() => { setRenewalStatus(st.value); setPage(1); }}
          >
            <Text style={[s.chipText, renewalStatus === st.value && s.chipTextActive]}>
              {st.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Rows */}
      {loading ? (
        <View style={s.centered}><ActivityIndicator color="#E10600" /></View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : rows.length === 0 ? (
        <View style={s.centered}><Text style={s.emptyText}>No Record Found</Text></View>
      ) : (
        rows.map((r, i) => {
          const done = r.renewal_status === 'renewed';
          const settled = done || r.orderStatus === '1';
          return (
            <View key={`${r.id}-${i}`} style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.srNo}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                <TouchableOpacity
                  style={s.nameWrap}
                  onPress={() => navigation.navigate('ClientProfile', { clientId: r.client_id })}
                >
                  <Text style={s.name} numberOfLines={1}>{r.name}</Text>
                </TouchableOpacity>
                <View style={[
                  s.statusPill,
                  done ? s.pillGreen : r.renewal_status === 'expired' ? s.pillRed : s.pillGrey,
                ]}>
                  <Text style={[
                    s.statusText,
                    done ? s.pillGreenText : r.renewal_status === 'expired' ? s.pillRedText : s.pillGreyText,
                  ]}>
                    {statusLabel(r.renewal_status)}
                  </Text>
                </View>
              </View>

              <Text style={s.pkg} numberOfLines={2}>{r.package_name}</Text>

              <View style={s.cardFoot}>
                <Text style={s.meta}>Rs {Number(r.price || 0).toLocaleString()}/-</Text>
                <Text style={s.meta}>{formatDate(r.end_date)}</Text>
                {settled ? (
                  <View style={s.actionDone}>
                    <Icon name="check-circle-outline" size={13} color="#15803d" />
                    <Text style={s.actionDoneText}>{done ? 'Done' : 'Active'}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.actionRenew}
                    // The web's Renew goes to /package-sell/{client_id}?saleType=Renew
                    // — the sell page with the search step already resolved. Straight
                    // to the client profile is that same destination here.
                    onPress={() => navigation.navigate('ClientProfile', {
                      clientId: r.client_id,
                      saleType: 'Renew',
                    })}
                  >
                    <Icon name="plus-circle-outline" size={13} color="#fff" />
                    <Text style={s.actionRenewText}>Renew</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Pagination — numbered, mirroring the web's react-js-pagination
          (pageRangeDisplayed: 8, First Page / Last Page). Scrolls
          horizontally because 8 numbers plus both end buttons don't fit a
          phone width. */}
      {!loading && !error && totalPages > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={pg.bar}
        >
          <TouchableOpacity
            style={[pg.textBtn, page === 1 && pg.btnDisabled]}
            onPress={() => setPage(1)}
            disabled={page === 1}
          >
            <Text style={[pg.textBtnLabel, page === 1 && pg.textDisabled]}>First Page</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[pg.btn, page === 1 && pg.btnDisabled]}
            onPress={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
          </TouchableOpacity>

          {pageWindow.map(p => (
            <TouchableOpacity
              key={p}
              style={[pg.btn, p === page && pg.btnActive]}
              onPress={() => setPage(p)}
            >
              <Text style={[pg.num, p === page && pg.numActive]}>{p}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[pg.btn, page === totalPages && pg.btnDisabled]}
            onPress={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[pg.textBtn, page === totalPages && pg.btnDisabled]}
            onPress={() => setPage(totalPages)}
            disabled={page === totalPages}
          >
            <Text style={[pg.textBtnLabel, page === totalPages && pg.textDisabled]}>Last Page</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <DateTimePickerModal
        isVisible={picker !== null}
        mode="date"
        onConfirm={d => {
          const which = picker;
          setPicker(null);
          if (which) applyDateRange(which, d);
        }}
        onCancel={() => setPicker(null)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },

  title: { fontSize: 13, fontWeight: '700', color: '#0f172a', letterSpacing: 0.5, marginBottom: 10 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dateField: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateLabel: { fontSize: 10, color: '#94a3b8', marginBottom: 2 },
  dateValue: { fontSize: 13, color: '#1e293b', fontWeight: '500' },
  datePlaceholder: { color: '#cbd5e1', fontWeight: '400' },
  clearBtn: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },

  chipScroll: { marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    marginRight: 6,
  },
  chipActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  chipText: { fontSize: 12, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  summaryBox: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  summaryLabel: { fontSize: 11, color: '#64748b', marginBottom: 3 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  green: { color: '#15803d' },
  red: { color: '#dc2626' },
  amber: { color: '#d97706' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  srNo: { fontSize: 11, color: '#94a3b8', minWidth: 22 },
  nameWrap: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#E10600' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  pillGreen: { backgroundColor: '#dcfce7' },
  pillGreenText: { color: '#15803d' },
  pillRed: { backgroundColor: '#fee2e2' },
  pillRedText: { color: '#dc2626' },
  pillGrey: { backgroundColor: '#f1f5f9' },
  pillGreyText: { color: '#475569' },

  pkg: { fontSize: 12, color: '#475569', marginTop: 6 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  meta: { fontSize: 12, color: '#64748b', flex: 1 },
  actionDone: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionDoneText: { fontSize: 11, color: '#15803d', fontWeight: '600' },
  actionRenew: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E10600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionRenewText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  centered: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#94a3b8' },
  errorText: { fontSize: 13, color: '#dc2626', marginBottom: 8 },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, backgroundColor: '#E10600' },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
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

export default RenewalsPanel;
