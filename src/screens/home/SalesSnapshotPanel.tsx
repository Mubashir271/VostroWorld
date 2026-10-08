// The Sales Dashboard's middle band — package-wise sales, today's client
// attendance, trainer-wise sales and birthdays — all from one
// /v1/sales-dashboard/snapshot response (see getSalesDashboardSnapshot).
// Same sections and data as the web's Sales Dashboard; styled like the rest
// of the app's dashboard cards rather than the web's.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SalesDashboardSnapshot } from '../../api/dashboard';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';

type Props = {
  snapshot: SalesDashboardSnapshot;
  onOpenDetailedSales?: () => void;
};

const SectionHeader = ({ title, badge, onPress }: { title: string; badge?: string; onPress?: () => void }) => (
  <View style={s.header}>
    <Text style={s.title}>{title}</Text>
    {badge ? (
      <TouchableOpacity disabled={!onPress} onPress={onPress} style={s.badge}>
        <Text style={s.badgeText}>{badge}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const SalesSnapshotPanel = ({ snapshot, onOpenDetailedSales }: Props) => {
  const formatCurrency = useCurrencyFormatter();
  const packages = snapshot.package_sales_mtd ?? [];
  const maxNet = Math.max(1, ...packages.map(p => p.net || 0));
  const footfall = snapshot.footfall ?? { total: 0, female: 0, male: 0 } as any;
  const genderTotal = Math.max(1, (footfall.female || 0) + (footfall.male || 0));
  const trainers = snapshot.trainers ?? [];
  const birthdays = snapshot.birthdays ?? [];

  return (
    <View>
      {/* Package-wise sales this month */}
      <View style={s.card}>
        <SectionHeader title="Package-wise sales this month" badge="Detailed Sales Report" onPress={onOpenDetailedSales} />
        {packages.map(p => (
          <View key={p.name} style={s.barRow}>
            <View style={s.barLabelRow}>
              <Text style={s.barLabel}>{p.name}</Text>
              <Text style={s.barValue}>{formatCurrency(p.net || 0)} · {p.qty || 0}</Text>
            </View>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${((p.net || 0) / maxNet) * 100}%` }]} />
            </View>
          </View>
        ))}
        {packages.length === 0 && <Text style={s.empty}>No package sales this month.</Text>}
      </View>

      {/* Client attendance today */}
      <View style={s.card}>
        <SectionHeader title="Client attendance today" badge={`${footfall.total || 0} check-ins`} />
        <View style={s.kvRow}>
          <Text style={s.kvLabel}>Female</Text>
          <Text style={s.kvValue}>{footfall.female || 0}</Text>
        </View>
        <View style={s.kvRow}>
          <Text style={s.kvLabel}>Male</Text>
          <Text style={s.kvValue}>{footfall.male || 0}</Text>
        </View>
        <View style={s.kvRow}>
          <Text style={s.kvLabel}>Gym packages due in 7 days</Text>
          <Text style={s.kvValue}>{snapshot.expiring_7_days || 0}</Text>
        </View>
        <View style={s.splitTrack}>
          <View style={[s.splitFemale, { flex: (footfall.female || 0) / genderTotal }]} />
          <View style={[s.splitMale, { flex: (footfall.male || 0) / genderTotal }]} />
        </View>
        <View style={s.legendRow}>
          <View style={s.legendItem}><View style={[s.dot, s.dotFemale]} /><Text style={s.legendText}>Female</Text></View>
          <View style={s.legendItem}><View style={[s.dot, s.dotMale]} /><Text style={s.legendText}>Male</Text></View>
        </View>
      </View>

      {/* Trainer-wise sales this month */}
      <View style={s.card}>
        <SectionHeader title="Trainer-wise sales this month" badge="PT and Small PT" />
        {trainers.map((t, i) => (
          <View key={`${t.name}-${i}`} style={[s.listRow, i === trainers.length - 1 && s.listRowLast]}>
            <View style={s.listMain}>
              <Text style={s.listName} numberOfLines={1}>{t.name}</Text>
              <Text style={s.listSub}>{t.clients} clients · {t.sales} sales</Text>
            </View>
            <Text style={s.listAmount}>{formatCurrency(t.amount || 0)}</Text>
          </View>
        ))}
        {trainers.length === 0 && <Text style={s.empty}>No trainer sales this month.</Text>}
      </View>

      {/* Client birthdays */}
      <View style={s.card}>
        <SectionHeader title="Client birthdays" badge="Rest of this month" />
        {birthdays.map((b, i) => (
          <View key={b.id} style={[s.listRow, i === birthdays.length - 1 && s.listRowLast]}>
            <Icon name="cake-variant" size={18} color="#E63946" style={s.listIcon} />
            <View style={s.listMain}>
              <View style={s.nameRow}>
                <Text style={s.listName} numberOfLines={1}>{b.name}</Text>
                {b.is_today && <View style={s.todayPill}><Text style={s.todayText}>Today</Text></View>}
              </View>
              <Text style={s.listSub}>{b.day} · turns {b.turns} · {b.branch}</Text>
            </View>
          </View>
        ))}
        {birthdays.length === 0 && <Text style={s.empty}>No birthdays for the rest of this month.</Text>}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  badge: { backgroundColor: '#FFE5E5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#E63946' },

  barRow: { marginBottom: 10 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 12, color: '#334155', fontWeight: '600' },
  barValue: { fontSize: 12, color: '#64748b' },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: '#E63946' },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  kvLabel: { fontSize: 13, color: '#475569' },
  kvValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  splitTrack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#f1f5f9', marginTop: 12 },
  splitFemale: { backgroundColor: '#E63946' },
  splitMale: { backgroundColor: '#1e293b' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotFemale: { backgroundColor: '#E63946' },
  dotMale: { backgroundColor: '#1e293b' },
  legendText: { fontSize: 11, color: '#64748b' },

  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listRowLast: { borderBottomWidth: 0 },
  listIcon: { marginRight: 10 },
  listMain: { flex: 1, marginRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listName: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: '#1e293b' },
  listSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  listAmount: { fontSize: 13, fontWeight: '700', color: '#E63946' },
  todayPill: { backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  todayText: { fontSize: 10, fontWeight: '700', color: '#166534' },

  empty: { fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },
});

export default SalesSnapshotPanel;
