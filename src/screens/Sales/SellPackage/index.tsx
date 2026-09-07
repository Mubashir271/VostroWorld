// src/screens/Sales/SellPackage/index.tsx
//
// "Sell Package" — the client-search step of the web admin's sell/renew flow
// (/package-sell). Search a client by name, client ID or membership number,
// then open their profile to sell or renew.
//
// Contract HAR-confirmed 2026-09-02: the search key is a different query
// param per mode (`name` / `id` / `membership_no`), not a `type` field —
// see `searchClients` in api/employeeDashboard.ts.
//
// This replaces the old `NewPackage` screen for Sales, which was a hardcoded
// package-definition mock ("3 - Month Gym Gold") with no API calls and no
// relationship to selling a package to a client.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  searchClients,
  getClientNames,
  CLIENT_SEARCH_MODES,
  ClientSearchMode,
  ClientSearchRow,
  ClientNameRow,
} from '../../../api/employeeDashboard';

const PAGE_SIZE = 25;

const SellPackage = () => {
  const navigation = useNavigation<any>();
  const profile = useSelector((s: RootState) => s.user.profile);
  const branchId = profile?.branchId;

  const [mode, setMode] = useState<ClientSearchMode>('name');
  const [value, setValue] = useState('');
  const [rows, setRows] = useState<ClientSearchRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecord, setTotalRecord] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Autocomplete source — one fetch per branch, filtered locally. The web does
  // the same thing via a <datalist>.
  const [names, setNames] = useState<ClientNameRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    getClientNames({ branch_id: branchId })
      .then(res => setNames((res?.data ?? []) as ClientNameRow[]))
      .catch(() => setNames([]));
  }, [branchId]);

  const suggestions = useMemo(() => {
    if (mode !== 'name' || value.trim().length < 2) return [];
    const q = value.trim().toLowerCase();
    return names
      .filter(n => `${n.first_name} ${n.last_name}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [names, value, mode]);

  const runSearch = useCallback(async (nextPage = 1) => {
    if (!branchId) { setError('No branch on your profile.'); return; }
    if (!value.trim()) { setError('Enter a search value.'); return; }
    Keyboard.dismiss();
    setShowSuggestions(false);
    setLoading(true);
    setError('');
    try {
      const res = await searchClients({
        mode,
        value: value.trim(),
        branch_id: branchId,
        limit: PAGE_SIZE,
        page: nextPage,
      });
      setRows(res.rows);
      setTotalPages(Math.max(1, res.totalPages));
      setTotalRecord(res.totalRecord);
      setPage(nextPage);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setRows([]);
        setTotalPages(1);
        setTotalRecord(0);
      } else {
        setError(e?.response?.data?.message || 'Search failed.');
        setRows(null);
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, mode, value]);

  const reset = () => {
    setValue('');
    setRows(null);
    setError('');
    setPage(1);
    setTotalPages(1);
    setTotalRecord(0);
    setShowSuggestions(false);
  };

  return (
    <View style={s.root}>
      <AppHeader
        title="Sell Package"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.cardTitle}>Search Clients</Text>

        {/* Search mode */}
        <Text style={s.label}>Search</Text>
        <View style={s.modeRow}>
          {CLIENT_SEARCH_MODES.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[s.modeChip, mode === m.value && s.modeChipActive]}
              onPress={() => { setMode(m.value); setValue(''); setRows(null); }}
            >
              <Text style={[s.modeText, mode === m.value && s.modeTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search value */}
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            value={value}
            onChangeText={t => { setValue(t); setShowSuggestions(true); }}
            placeholder={
              mode === 'name' ? 'Enter name'
                : mode === 'id' ? 'Enter client ID'
                  : 'Enter membership no'
            }
            placeholderTextColor="#B0B0B0"
            autoCapitalize="none"
            keyboardType={mode === 'id' ? 'number-pad' : 'default'}
            returnKeyType="search"
            onSubmitEditing={() => runSearch(1)}
          />
          {value.length > 0 && (
            <TouchableOpacity onPress={reset}>
              <Icon name="close-circle" size={18} color="#BDBDBD" />
            </TouchableOpacity>
          )}
        </View>

        {showSuggestions && suggestions.length > 0 && (
          <View style={s.suggestBox}>
            {suggestions.map(n => (
              <TouchableOpacity
                key={n.id}
                style={s.suggestRow}
                onPress={() => {
                  setValue(`${n.first_name} ${n.last_name}`.trim());
                  setShowSuggestions(false);
                }}
              >
                <Text style={s.suggestName}>{`${n.first_name} ${n.last_name}`.trim()}</Text>
                <Text style={s.suggestMeta}>{n.uid}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.btnRow}>
          <TouchableOpacity style={s.searchBtn} onPress={() => runSearch(1)} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.searchBtnText}>Search</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.resetBtn} onPress={reset}>
            <Text style={s.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {!!error && <Text style={s.errText}>{error}</Text>}

        {/* Results */}
        {rows !== null && !loading && (
          rows.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>No Record Found</Text></View>
          ) : (
            <>
              <Text style={s.resultCount}>
                {totalRecord} {totalRecord === 1 ? 'result' : 'results'}
              </Text>
              {rows.map((c, i) => (
                <TouchableOpacity
                  key={c.id}
                  style={s.row}
                  onPress={() => navigation.navigate('ClientProfile', { clientId: c.id })}
                >
                  <Text style={s.rowNo}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                  <View style={s.rowMain}>
                    <Text style={s.rowName} numberOfLines={1}>
                      {`${c.first_name} ${c.last_name}`.trim()}
                    </Text>
                    <Text style={s.rowMeta}>ID {c.id} · {c.uid}</Text>
                    {!!c.phone && <Text style={s.rowMeta}>{c.phone}</Text>}
                  </View>
                  <View style={s.goBtn}>
                    <Text style={s.goText}>Go</Text>
                    <Icon name="chevron-right" size={14} color="#C62828" />
                  </View>
                </TouchableOpacity>
              ))}

              {totalPages > 1 && (
                <View style={pg.bar}>
                  <TouchableOpacity
                    style={[pg.btn, page === 1 && pg.btnDisabled]}
                    onPress={() => runSearch(1)}
                    disabled={page === 1}
                  >
                    <Icon name="chevron-double-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[pg.btn, page === 1 && pg.btnDisabled]}
                    onPress={() => runSearch(page - 1)}
                    disabled={page === 1}
                  >
                    <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
                  </TouchableOpacity>
                  <Text style={pg.info}>
                    Page <Text style={pg.infoB}>{page}</Text> of <Text style={pg.infoB}>{totalPages}</Text>
                  </Text>
                  <TouchableOpacity
                    style={[pg.btn, page === totalPages && pg.btnDisabled]}
                    onPress={() => runSearch(page + 1)}
                    disabled={page === totalPages}
                  >
                    <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[pg.btn, page === totalPages && pg.btnDisabled]}
                    onPress={() => runSearch(totalPages)}
                    disabled={page === totalPages}
                  >
                    <Icon name="chevron-double-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )
        )}

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F8' },
  scroll: { flex: 1 },
  body: { padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  label: { fontSize: 12, color: '#64748b', marginBottom: 6 },

  modeRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  modeChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#fff',
  },
  modeChipActive: { backgroundColor: '#C62828', borderColor: '#C62828' },
  modeText: { fontSize: 12, color: '#555' },
  modeTextActive: { color: '#fff', fontWeight: '600' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12,
  },
  input: { flex: 1, height: 46, color: '#1A1A1A', fontSize: 14 },

  suggestBox: {
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E8E8E8',
    marginTop: 4, overflow: 'hidden',
  },
  suggestRow: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEE',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  suggestName: { fontSize: 13, color: '#1A1A1A', flex: 1 },
  suggestMeta: { fontSize: 11, color: '#94a3b8', marginLeft: 8 },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  searchBtn: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resetBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#D0D0D0',
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  resetBtnText: { color: '#333', fontWeight: '600', fontSize: 14 },

  errText: { color: '#C62828', fontSize: 12, marginTop: 10 },
  resultCount: { fontSize: 12, color: '#64748b', marginTop: 18, marginBottom: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#EEF2F6',
  },
  rowNo: { fontSize: 11, color: '#94a3b8', minWidth: 20 },
  rowMain: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#C62828' },
  rowMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  goBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FDECEC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
  },
  goText: { fontSize: 12, fontWeight: '700', color: '#C62828' },

  empty: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#94a3b8' },
  bottomPad: { height: 30 },
});

const pg = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  btn: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnDisabled: { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  info: { fontSize: 13, color: '#555', paddingHorizontal: 8 },
  infoB: { fontWeight: '700', color: '#1A1A1A' },
});

export default SellPackage;
