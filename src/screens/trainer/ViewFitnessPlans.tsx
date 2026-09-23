// src/screens/trainer/ViewFitnessPlans.tsx
//
// Fitness Plans List — the app's version of the web admin's /fitness-plan
// page.
//
// Until 2026-09-23 this screen rendered three hardcoded sample rows and made
// no API call at all, so a trainer saw invented clients assigned to a trainer
// who wasn't them. It now reads GET /v1/fitness/plan/listing, the same call
// the web page makes (2026-09-23 HAR, confirmed live against prod).
//
// Paging is server-side: the web sends `limit=25` and walks `total_pages`, so
// this does too — a page of rows is fetched per page turn rather than pulling
// the whole list and slicing it client-side.
//
// Branch: a trainer is pinned to their own branch, per the standing rule that
// only branch-less logins (super admin, HR) get a branch picker. The web shows
// a Branch dropdown here because it also serves admins; for role 9 it is
// preselected and effectively fixed, so no picker is rendered.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import {
  getFitnessPlans, getTrainerPackageClients,
  FitnessPlanRow, TrainerPackageClient,
} from '../../api/trainer';

const PAGE_SIZE = 25;

const COL = { sr: 36, client: 130, trainer: 130, start: 100, end: 100, action: 60 };

// "2026-09-01" → "01-09-2026", the format the web's table prints.
const fmtDate = (s?: string): string => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return y && m && d ? `${d}-${m}-${y}` : s;
};

const ViewFitnessPlans = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);

  const branchId = profile?.branchId || '';
  const trainerId = profile?.id ?? '';

  const [plans, setPlans] = useState<FitnessPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecord, setTotalRecord] = useState(0);

  // Client filter — the web picks from the trainer's own package clients
  // rather than free-typing, so the same list backs the picker here. The text
  // box stays, as a way to narrow a long picker list.
  const [clients, setClients] = useState<TrainerPackageClient[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<TrainerPackageClient | null>(null);

  const [detail, setDetail] = useState<FitnessPlanRow | null>(null);

  const load = useCallback(async (p = page, isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await getFitnessPlans({
        page: p,
        limit: PAGE_SIZE,
        branch_id: branchId,
        trainer_id: trainerId,
        client_id: selectedClient?.client_id ?? '',
      });
      setPlans(Array.isArray(res?.data) ? res.data : []);
      setTotalPages(Math.max(Number(res?.total_pages) || 1, 1));
      setTotalRecord(Number(res?.total_record) || 0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not load fitness plans.');
      setPlans([]);
      setTotalPages(1);
      setTotalRecord(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, branchId, trainerId, selectedClient]);

  useEffect(() => { load(page); }, [load, page]);

  // The client picker is a one-off fetch; a failure just leaves the picker
  // empty rather than blocking the table.
  useEffect(() => {
    if (!trainerId) return;
    getTrainerPackageClients(trainerId)
      .then(rows => setClients(Array.isArray(rows) ? rows : []))
      .catch(() => setClients([]));
  }, [trainerId]);

  const goto = (p: number) => setPage(Math.min(Math.max(p, 1), totalPages));

  const applyClient = (c: TrainerPackageClient | null) => {
    setSelectedClient(c);
    setPickerOpen(false);
    setPage(1);
  };

  // Dedupe: a client with several packages appears once per package in the
  // source list, but the filter is by client.
  const pickerRows = React.useMemo(() => {
    const seen = new Set<number>();
    return clients
      .filter(c => {
        if (seen.has(c.client_id)) return false;
        seen.add(c.client_id);
        return true;
      })
      .filter(c =>
        !clientQuery.trim() ||
        (c.client_name ?? '').toLowerCase().includes(clientQuery.trim().toLowerCase()),
      );
  }, [clients, clientQuery]);

  const startIdx = (page - 1) * PAGE_SIZE;

  return (
    <>
      <AppHeader
        title="Fitness Plan"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <View style={s.screen}>
        <View style={s.headerRow}>
          <Text style={s.title}>Fitness Plans List</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('AddFitnessPlan')}>
            <Icon name="plus" size={16} color="#FFF" />
            <Text style={s.addBtnText}>Add Fitness Plan</Text>
          </TouchableOpacity>
        </View>

        <View style={s.filterBar}>
          <Text style={s.filterLabel}>Client Name</Text>
          <View style={s.searchRow}>
            <TouchableOpacity
              style={s.selectField}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[s.selectText, !selectedClient && s.selectPlaceholder]}
                numberOfLines={1}
              >
                {selectedClient?.client_name ?? 'All clients'}
              </Text>
              <Icon name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
            {selectedClient ? (
              <TouchableOpacity style={s.clearBtn} onPress={() => applyClient(null)}>
                <Text style={s.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {totalRecord > 0 ? (
            <Text style={s.resultCount}>
              {totalRecord} plan{totalRecord === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Icon name="alert-circle-outline" size={16} color="#C62828" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={s.empty}><ActivityIndicator size="large" color="#E63946" /></View>
        ) : plans.length === 0 ? (
          <ScrollView
            contentContainerStyle={s.empty}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(page, true)} colors={['#E63946']} />
            }
          >
            <Icon name="clipboard-text-outline" size={44} color="#ddd" />
            <Text style={s.emptyText}>No Record Found</Text>
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(page, true)} colors={['#E63946']} />
            }
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={s.tableHeader}>
                  <Text style={[s.headerCell, { width: COL.sr }]}>Sr#</Text>
                  <Text style={[s.headerCell, { width: COL.client }]}>Client Name</Text>
                  <Text style={[s.headerCell, { width: COL.trainer }]}>Trainer Name</Text>
                  <Text style={[s.headerCell, { width: COL.start }]}>Start Date</Text>
                  <Text style={[s.headerCell, { width: COL.end }]}>End Date</Text>
                  <Text style={[s.headerCell, { width: COL.action }]}>Action</Text>
                </View>
                {plans.map((plan, idx) => (
                  <View key={plan.id} style={[s.tableRow, idx % 2 === 0 && s.tableRowAlt]}>
                    <Text style={[s.cell, { width: COL.sr }]}>{startIdx + idx + 1}</Text>
                    <Text style={[s.cell, s.clientCell, { width: COL.client }]} numberOfLines={1}>{plan.client}</Text>
                    <Text style={[s.cell, { width: COL.trainer }]} numberOfLines={1}>{plan.trainer}</Text>
                    <Text style={[s.cell, { width: COL.start }]}>{fmtDate(plan.start_date)}</Text>
                    <Text style={[s.cell, { width: COL.end }]}>{fmtDate(plan.end_date)}</Text>
                    <View style={[s.actionCell, { width: COL.action }]}>
                      <TouchableOpacity onPress={() => setDetail(plan)}>
                        <Icon name="eye-outline" size={18} color="#0284c7" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {totalPages > 1 ? (
              <View style={pg.bar}>
                <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]} onPress={() => goto(1)} disabled={page === 1}>
                  <Icon name="chevron-double-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
                </TouchableOpacity>
                <TouchableOpacity style={[pg.btn, page === 1 && pg.btnDisabled]} onPress={() => goto(page - 1)} disabled={page === 1}>
                  <Icon name="chevron-left" size={14} color={page === 1 ? '#ccc' : '#555'} />
                </TouchableOpacity>
                <Text style={pg.info}>Page <Text style={pg.infoB}>{page}</Text> of <Text style={pg.infoB}>{totalPages}</Text></Text>
                <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]} onPress={() => goto(page + 1)} disabled={page === totalPages}>
                  <Icon name="chevron-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
                </TouchableOpacity>
                <TouchableOpacity style={[pg.btn, page === totalPages && pg.btnDisabled]} onPress={() => goto(totalPages)} disabled={page === totalPages}>
                  <Icon name="chevron-double-right" size={14} color={page === totalPages ? '#ccc' : '#555'} />
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

      {/* ── Client picker ── */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={s.modalBack} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Select Client</Text>
            <TextInput
              style={s.modalSearch}
              placeholder="Search client…"
              placeholderTextColor="#BBB"
              value={clientQuery}
              onChangeText={setClientQuery}
            />
            <ScrollView>
              <TouchableOpacity style={s.modalRow} onPress={() => applyClient(null)}>
                <Text style={s.modalRowText}>All clients</Text>
                {!selectedClient && <Icon name="check" size={18} color="#E63946" />}
              </TouchableOpacity>
              {pickerRows.map(c => (
                <TouchableOpacity key={c.client_id} style={s.modalRow} onPress={() => applyClient(c)}>
                  <Text style={s.modalRowText} numberOfLines={1}>{c.client_name}</Text>
                  {selectedClient?.client_id === c.client_id && <Icon name="check" size={18} color="#E63946" />}
                </TouchableOpacity>
              ))}
              {pickerRows.length === 0 ? (
                <Text style={s.emptyText}>No clients found.</Text>
              ) : null}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Plan detail ── */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <TouchableOpacity style={s.modalBack} activeOpacity={1} onPress={() => setDetail(null)}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{detail?.client ?? 'Plan'}</Text>
            {([
              ['Trainer', detail?.trainer],
              ['Branch', detail?.branch],
              ['Start Date', fmtDate(detail?.start_date)],
              ['End Date', fmtDate(detail?.end_date)],
              ['Note', detail?.note],
            ] as [string, string | undefined][]).map(([k, v]) => (
              <View key={k} style={s.detailRow}>
                <Text style={s.detailKey}>{k}</Text>
                <Text style={s.detailVal}>{v && v !== 'N/A' ? v : '—'}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9F9FB' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  filterBar: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 14, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EFEFEF' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 10 },
  selectField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E5E5E5',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
  },
  selectText: { flex: 1, fontSize: 13, color: '#333' },
  selectPlaceholder: { color: '#999' },
  clearBtn: { backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  clearBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  resultCount: { fontSize: 11.5, color: '#999', marginTop: 8, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', borderRadius: 10, padding: 11,
    marginHorizontal: 16, marginTop: 12,
  },
  errorText: { flex: 1, fontSize: 12.5, color: '#C62828' },

  listContent: { paddingBottom: 30 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E63946', marginHorizontal: 16, marginTop: 16, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  headerCell: { fontSize: 12, fontWeight: '700', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  cell: { fontSize: 13, color: '#1A1A1A' },
  clientCell: { color: '#E63946', fontWeight: '600' },
  actionCell: { flexDirection: 'row', gap: 10 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 10, textAlign: 'center' },

  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 30 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, maxHeight: '70%' },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  modalSearch: {
    backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E5E5E5',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 13, color: '#333', marginBottom: 8,
  },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9',
  },
  modalRowText: { flex: 1, fontSize: 13.5, color: '#334155' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  detailKey: { fontSize: 12.5, color: '#888', fontWeight: '600' },
  detailVal: { flex: 1, fontSize: 12.5, color: '#1A1A1A', textAlign: 'right', fontWeight: '600' },
});

const pg = StyleSheet.create({
  bar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FAFAFA' },
  btn:        { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnDisabled:{ backgroundColor: '#F5F5F5', borderColor: '#EEE' },
  info:       { fontSize: 13, color: '#555', paddingHorizontal: 8 },
  infoB:      { fontWeight: '700', color: '#1A1A1A' },
});

export default ViewFitnessPlans;
