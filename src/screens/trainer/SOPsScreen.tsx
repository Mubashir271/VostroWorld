import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import api from '../../api/service';

interface SOP {
  id: number;
  title: string;
  sop_for: string;
  content: string;
}

// Converts HTML to readable plain text
const htmlToText = (html: string): string => {
  return html
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '  • ')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '$1')
    .replace(/<b>(.*?)<\/b>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export default function SOPsScreen() {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId;

  const [sops, setSops]           = useState<SOP[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]   = useState<SOP | null>(null);

  const fetchSops = useCallback(async () => {
    try {
      const res = await api.get('/v1/fitness/sops/index', {
        params: { branch_id: branchId, status: 1, limit: 100, page: 1 },
      });
      setSops(res?.data?.data ?? []);
    } catch (e) {
      console.log('SOPs error:', e);
    }
  }, [branchId]);

  useEffect(() => {
    setLoading(true);
    fetchSops().finally(() => setLoading(false));
  }, [fetchSops]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSops().finally(() => setRefreshing(false));
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <>
        <AppHeader
          title="SOP Detail"
          leftIcon={<Icon name="arrow-left" size={22} color="#333" />}
          rightIcon={<NotificationSVG width={24} height={24} />}
          onLeftPress={() => setSelected(null)}
          onRightPress={() => navigation.navigate('Notifications')}
          backgroundColor="#FFE5E5"
        />
        <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
          <View style={s.detailCard}>
            <Text style={s.detailSopFor}>{selected.sop_for}</Text>
            <Text style={s.detailTitle}>{selected.title}</Text>
            <View style={s.divider} />
            <Text style={s.detailContent}>{htmlToText(selected.content)}</Text>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <>
      <AppHeader
        title="SOPs"
        leftIcon={<Icon name="arrow-left" size={24} color="#333" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView
          style={s.container}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E63946" />}
        >
          {/* Header card */}
          <View style={s.headerCard}>
            <Text style={s.headerTitle}>Standard Operating Procedures</Text>
            <Text style={s.headerSub}>Review the latest SOPs shared by your Fitness Manager in a clean, readable format.</Text>
            <View style={s.trainerBadge}>
              <Text style={s.trainerBadgeText}>Trainer View</Text>
            </View>
          </View>

          {/* SOP list */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>AVAILABLE SOPs</Text>
            <Text style={s.sectionTitle}>SOP Library</Text>

            {sops.length === 0 ? (
              <Text style={s.empty}>No SOPs available</Text>
            ) : (
              sops.map(sop => (
                <TouchableOpacity key={sop.id} style={s.sopCard} onPress={() => setSelected(sop)}>
                  <View style={s.sopCardLeft}>
                    <Text style={s.sopTitle}>{sop.title}</Text>
                    <Text style={s.sopFor} numberOfLines={2}>{sop.sop_for}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#94a3b8" />
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f8fafc', padding: 14 },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  headerCard:       { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  headerTitle:      { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  headerSub:        { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 12 },
  trainerBadge:     { alignSelf: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  trainerBadgeText: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  // Section
  section:          { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionLabel:     { fontSize: 11, fontWeight: '700', color: '#0ea5e9', letterSpacing: 1, marginBottom: 4 },
  sectionTitle:     { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  empty:            { color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },
  // SOP list item
  sopCard:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sopCardLeft:      { flex: 1, marginRight: 8 },
  sopTitle:         { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 3 },
  sopFor:           { fontSize: 12, color: '#64748b', lineHeight: 18 },
  // Detail view
  detailCard:       { backgroundColor: '#fff', borderRadius: 14, padding: 18, margin: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  detailSopFor:     { fontSize: 12, fontWeight: '700', color: '#0ea5e9', letterSpacing: 0.5, marginBottom: 6 },
  detailTitle:      { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  divider:          { height: 1, backgroundColor: '#f1f5f9', marginBottom: 14 },
  detailContent:    { fontSize: 14, color: '#374151', lineHeight: 24 },
});
