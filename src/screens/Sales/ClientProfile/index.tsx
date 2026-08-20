import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FastImage from '@d11/react-native-fast-image';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { getClientById } from '../../../api/employeeDashboard';

// Mirrors the web admin's client profile page. Editing is intentionally not
// wired: no update endpoint for a client has ever been captured or confirmed,
// and this project already carries several "shows success, saves nothing"
// screens. Fields render read-only until that contract is confirmed, at which
// point this becomes a form.
const EDIT_ENABLED = false;

interface ClientDetail {
  id: number;
  uid?: string;
  club_id?: string;
  branch_id?: number;
  branches_name?: string;
  first_name?: string;
  last_name?: string;
  identification_type?: string;
  identification_number?: string;
  email?: string;
  phone?: string;
  gender?: string;
  image?: string;
  city?: string;
  address?: string;
  country?: string;
  postal_code?: string;
  date?: string;
  emergency_contact_no?: string;
  blood_group?: string;
  status?: string;
  birthday?: string;
  available_balance?: number;
  membership_type?: Array<{ get_package_name?: { name: string } }>;
}

const EMPTY = '—';

const val = (v?: string | number | null) => {
  if (v === null || v === undefined) { return EMPTY; }
  const s = String(v).trim();
  // The API uses these as "unset" sentinels rather than null.
  if (!s || s === '0000-00-00') { return EMPTY; }
  return s;
};

const Field = ({ label, value, flex }: { label: string; value?: string | number | null; flex?: boolean }) => (
  <View style={[styles.field, flex && styles.fieldFlex]}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.readonlyBox}>
      <Text style={styles.readonlyText} numberOfLines={2}>{val(value)}</Text>
    </View>
  </View>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const ClientProfile = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clientId: number | undefined = route.params?.clientId;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (clientId == null) { setError('No client selected.'); setLoading(false); return; }
    if (isRefresh) { setRefreshing(true); } else { setLoading(true); }
    setError('');
    try {
      const res = await getClientById(clientId);
      // `data` comes back as a one-element array here, unlike the list endpoint.
      const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
      if (!row) { setError('Client not found.'); setClient(null); }
      else { setClient(row as ClientDetail); }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load client.');
      setClient(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const name = `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim() || EMPTY;
  const membership = client?.membership_type?.[0]?.get_package_name?.name;

  return (
    <View style={styles.root}>
      <AppHeader
        title="Client Profile"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <ActivityIndicator color="#C62828" style={styles.loader} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#C62828']} tintColor="#C62828" />
          }>

          {!!error && <Text style={styles.errText}>{error}</Text>}

          {!!client && (
            <>
              {/* Title + membership summary */}
              <View style={styles.card}>
                <Text style={styles.clientTitle} numberOfLines={2}>Client: {name}</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Membership No</Text>
                    <Text style={styles.summaryValue}>{val(client.uid)}</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Available Balance</Text>
                    <Text style={[styles.summaryValue, styles.balance]}>
                      Rs {client.available_balance ?? 0}/-
                    </Text>
                  </View>
                </View>
                <View style={styles.chipRow}>
                  {!!client.branches_name && (
                    <View style={styles.chip}><Text style={styles.chipText}>{client.branches_name}</Text></View>
                  )}
                  <View style={[styles.chip, client.status === '1' ? styles.chipActive : styles.chipInactive]}>
                    <Text style={[styles.chipText, client.status === '1' ? styles.chipTextActive : styles.chipTextInactive]}>
                      {client.status === '1' ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  {!!membership && (
                    <View style={styles.chip}><Text style={styles.chipText}>{membership}</Text></View>
                  )}
                </View>
              </View>

              {/* Client image */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Client Image</Text>
                <View style={styles.avatarWrap}>
                  {client.image ? (
                    <FastImage source={{ uri: client.image }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarEmpty]}>
                      <Icon name="account" size={44} color="#BBB" />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.card}>
                <Section title="Client Name">
                  <View style={styles.row2}>
                    <Field label="First Name" value={client.first_name} flex />
                    <Field label="Last Name" value={client.last_name} flex />
                  </View>
                </Section>

                <Section title="Client Contact Details">
                  <Field label="Email" value={client.email} />
                  <Field label="Phone" value={client.phone} />
                  <View style={styles.row2}>
                    <Field label="Identification Type" value={client.identification_type} flex />
                    <Field label="CNIC" value={client.identification_number} flex />
                  </View>
                </Section>

                <Section title="Client Address Details">
                  <Field label="Address" value={client.address} />
                  <View style={styles.row2}>
                    <Field label="Club ID" value={client.club_id} flex />
                    <Field label="City" value={client.city} flex />
                  </View>
                  <View style={styles.row2}>
                    <Field label="Country" value={client.country} flex />
                    <Field label="Postal Code" value={client.postal_code} flex />
                  </View>
                </Section>

                <Section title="Client Other Details">
                  <View style={styles.row2}>
                    <Field label="Gender" value={client.gender} flex />
                    <Field label="Birthday" value={client.birthday} flex />
                  </View>
                  <View style={styles.row2}>
                    <Field label="Blood Group" value={client.blood_group} flex />
                    <Field label="Emergency Contact" value={client.emergency_contact_no} flex />
                  </View>
                  <Field label="Registered On" value={client.date} />
                </Section>

                {EDIT_ENABLED ? (
                  <TouchableOpacity style={styles.updateBtn}>
                    <Text style={styles.updateBtnText}>Update Profile</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noticeBox}>
                    <Icon name="information-outline" size={15} color="#8A6D3B" />
                    <Text style={styles.noticeText}>
                      Editing is disabled — the client update endpoint has not been confirmed yet.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default ClientProfile;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flex: 1 },
  body: { padding: 12, paddingBottom: 30 },
  loader: { marginTop: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  clientTitle: { fontSize: 15, fontWeight: '800', color: '#222', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCell: { flex: 1 },
  summaryLabel: { fontSize: 11, color: '#777', marginBottom: 3 },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#222' },
  balance: { color: '#2E7D32' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { backgroundColor: '#F0F0F0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 11, color: '#444', fontWeight: '600' },
  chipActive: { backgroundColor: '#E8F5E9' },
  chipInactive: { backgroundColor: '#FFEBEE' },
  chipTextActive: { color: '#1B5E20' },
  chipTextInactive: { color: '#B71C1C' },
  avatarWrap: { alignItems: 'center', paddingVertical: 6 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0F0F0' },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E5E5' },
  section: { marginBottom: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#C62828', marginBottom: 10 },
  row2: { flexDirection: 'row', gap: 10 },
  field: { marginBottom: 12 },
  fieldFlex: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  readonlyBox: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
  },
  readonlyText: { fontSize: 13, color: '#444' },
  updateBtn: {
    backgroundColor: '#222', borderRadius: 6, paddingVertical: 12,
    alignItems: 'center', marginTop: 4,
  },
  updateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  noticeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
    backgroundColor: '#FCF8E3', borderRadius: 6, padding: 10,
  },
  noticeText: { flex: 1, fontSize: 11, color: '#8A6D3B', lineHeight: 15 },
  errText: { color: '#C62828', fontSize: 13, marginBottom: 10, textAlign: 'center' },
});
