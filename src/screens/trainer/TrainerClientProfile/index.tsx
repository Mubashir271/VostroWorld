// src/screens/trainer/TrainerClientProfile/index.tsx
//
// The trainer's view of one of their clients — the app's counterpart of the
// web admin's /trainer-client/{id}, reached by tapping a red client name in
// the Personal Training Roster.
//
// Deliberately minimal: the web shows a trainer only the photo, name, email
// and membership number, plus a Tools menu (Add Assessment / View
// Assessments). It is NOT the Sales "Client Profile" screen, which carries
// contact/address/other details a trainer isn't given on the web.
//
// Confirmed against the 2026-09-17 HAR: the page loads GET /v1/clients/get/{id}.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { getClientById } from '../../../api/employeeDashboard';

interface ClientRow {
  id: number;
  uid?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  image?: string;
}

const fullName = (c?: ClientRow | null) =>
  `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || '—';

const orDash = (v?: string | null) => {
  const s = String(v ?? '').trim();
  return s && s !== 'null' ? s : '—';
};

const TrainerClientProfile = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clientId: number = Number(route.params?.clientId);
  const passedName: string | undefined = route.params?.clientName;

  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(clientId) || clientId <= 0) {
      setError('No client selected.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await getClientById(clientId);
      // /v1/clients/get/{id} answers { status, data: [ {...} ] }
      const row = (res?.data?.[0] ?? res?.data ?? null) as ClientRow | null;
      setClient(row);
      if (!row) setError('Client not found.');
    } catch {
      setError('Failed to load this client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const go = (screen: string) => {
    setToolsOpen(false);
    // fullName() returns the '—' placeholder when the client hasn't loaded,
    // and '—' is truthy — so fall back on the name the roster passed in rather
    // than forwarding a dash as if it were the client's name.
    const loaded = fullName(client);
    const name = loaded !== '—' ? loaded : (passedName ?? '');
    navigation.navigate(screen, { clientId, clientName: name });
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Client Profile"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Client Profile</Text>
            <TouchableOpacity style={styles.toolsBtn} onPress={() => setToolsOpen(true)}>
              <Icon name="tools" size={14} color="#FFF" />
              <Text style={styles.toolsBtnText}>Tools</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#E63946" style={styles.loader} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardBody}>
              {client?.image ? (
                <Image source={{ uri: client.image }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photo, styles.photoEmpty]}>
                  <Icon name="account" size={44} color="#CFCFCF" />
                </View>
              )}

              <View style={styles.fields}>
                <Field label="Name" value={fullName(client)} />
                <Field label="Email" value={orDash(client?.email)} />
                <Field label="Membership No" value={orDash(client?.uid)} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Tools menu — the web renders this as a dropdown under the button */}
      <Modal visible={toolsOpen} transparent animationType="fade" onRequestClose={() => setToolsOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setToolsOpen(false)}>
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => go('AddPreAssessment')}>
              <Icon name="clipboard-plus-outline" size={18} color="#E63946" />
              <Text style={styles.menuText}>Add Assessment</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => go('ViewAssessment')}>
              <Icon name="clipboard-text-outline" size={18} color="#E63946" />
              <Text style={styles.menuText}>View Assessments</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue} numberOfLines={2}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9F9FB' },
  body:   { padding: 16 },

  card: {
    backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  toolsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E63946', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  toolsBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  cardBody: { flexDirection: 'row', padding: 16, gap: 16 },
  photo:      { width: 110, height: 140, borderRadius: 8, backgroundColor: '#F2F2F2' },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },

  fields: { flex: 1, justifyContent: 'center', gap: 14 },
  fieldRow:   { gap: 3 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#666' },
  fieldValue: { fontSize: 14, color: '#1A1A1A' },

  loader:   { paddingVertical: 40 },
  errorBox: { padding: 24, alignItems: 'center', gap: 12 },
  errorText: { fontSize: 13, color: '#999', textAlign: 'center' },
  retryBtn:  { borderWidth: 1, borderColor: '#E63946', borderRadius: 6, paddingHorizontal: 18, paddingVertical: 7 },
  retryText: { color: '#E63946', fontSize: 13, fontWeight: '700' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', paddingTop: 128, paddingHorizontal: 20, alignItems: 'flex-end' },
  menu: {
    backgroundColor: '#FFF', borderRadius: 8, minWidth: 200, paddingVertical: 4,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  menuItem:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  menuText:    { fontSize: 14, color: '#1A1A1A' },
  menuDivider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 12 },
});

export default TrainerClientProfile;
