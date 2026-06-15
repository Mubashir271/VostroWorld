import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { SelectionField } from '../../../components/SelectionField';
import { SelectionModal } from '../../../components/SelectionModal';
import { RootState } from '../../../redux/store';
import { getAllPackagesWithCategories } from '../../../api/dashboard';

interface PackageItem {
  id: number;
  branch: string;
  name: string;
  price: string;
  duration: string;
  durationDays: number;
  category: string;
  tag?: string;
  trainer?: string;
  active: boolean;
}

// category_name is null for these category codes in the API response.
const CATEGORY_FALLBACK: Record<string, string> = {
  '14': 'Physiotherapy',
  '15': 'GX',
};

const formatDuration = (days: number): string => {
  if (!days) return 'N/A';
  if (days === 1) return '1 Day';
  if (days === 7) return '1 Week';
  if (days === 30) return 'Monthly';
  if (days === 90) return '3 Months';
  if (days === 180) return '6 Months';
  if (days === 365) return '12 Months';
  if (days % 30 === 0) return `${days / 30} Months`;
  return `${days} Days (${Math.round(days / 30)} Months)`;
};

const mapItem = (p: any): PackageItem => {
  const trainer = [p.user_first_name, p.user_last_name].filter(Boolean).join(' ').trim();
  const durationDays = Number(p.duration) || 0;
  return {
    id: p.id,
    branch: p.branches_name ?? '',
    name: p.package_name ?? '',
    price: String(p.price ?? ''),
    duration: formatDuration(durationDays),
    durationDays,
    category: p.category_name || CATEGORY_FALLBACK[String(p.category)] || 'Other',
    tag: p.membership_types_name || p.trainer_membership_name || undefined,
    trainer: trainer || undefined,
    active: String(p.status) === '1',
  };
};

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Status' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

type ModalField = 'branch' | 'status' | 'category' | 'duration' | 'trainer' | null;

const DetailedPackages = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getAllPackagesWithCategories(branchId);
        if (cancelled) return;
        const list: any[] = Array.isArray(res?.data) ? res.data : [];
        setPackages(list.map(mapItem));
      } catch {
        if (!cancelled) setPackages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [branchId]);

  const [branch, setBranch] = useState('all');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [duration, setDuration] = useState('all');
  const [trainer, setTrainer] = useState('all');
  const [modalField, setModalField] = useState<ModalField>(null);

  const branchOptions = useMemo(() => {
    const unique = Array.from(new Set(packages.map(p => p.branch).filter(Boolean)));
    return [{ id: 'all', label: 'All Branches' }, ...unique.map(b => ({ id: b, label: b }))];
  }, [packages]);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(packages.map(p => p.category)))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return [{ id: 'all', label: 'All Categories' }, ...unique.map(c => ({ id: c, label: c }))];
  }, [packages]);

  const durationOptions = useMemo(() => {
    const map = new Map<string, number>();
    packages.forEach(p => {
      if (!map.has(p.duration)) map.set(p.duration, p.durationDays);
    });
    const unique = Array.from(map.entries()).sort((a, b) => a[1] - b[1]);
    return [{ id: 'all', label: 'All Durations' }, ...unique.map(([d]) => ({ id: d, label: d }))];
  }, [packages]);

  const trainerOptions = useMemo(() => {
    const unique = Array.from(new Set(packages.map(p => p.trainer).filter((t): t is string => !!t)));
    return [{ id: 'all', label: 'All Trainers' }, ...unique.map(t => ({ id: t, label: t }))];
  }, [packages]);

  const branchLabel = branchOptions.find(o => o.id === branch)?.label ?? 'All Branches';
  const statusLabel = STATUS_OPTIONS.find(o => o.id === status)?.label ?? 'All Status';
  const categoryLabel = categoryOptions.find(o => o.id === category)?.label ?? 'All Categories';
  const durationLabel = durationOptions.find(o => o.id === duration)?.label ?? 'All Durations';
  const trainerLabel = trainerOptions.find(o => o.id === trainer)?.label ?? 'All Trainers';

  const handleClearFilters = () => {
    setBranch('all');
    setStatus('all');
    setCategory('all');
    setDuration('all');
    setTrainer('all');
  };

  const handleToggleActive = (item: PackageItem) => {
    Alert.alert(
      item.active ? 'Deactivate Package' : 'Activate Package',
      `${item.active ? 'Deactivate' : 'Activate'} "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.active ? 'Deactivate' : 'Activate',
          style: item.active ? 'destructive' : 'default',
          onPress: () => setPackages(prev => prev.map(p => p.id === item.id ? { ...p, active: !p.active } : p)),
        },
      ],
    );
  };

  const handleDelete = (item: PackageItem) => {
    Alert.alert('Delete Package', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setPackages(prev => prev.filter(p => p.id !== item.id)) },
    ]);
  };

  const handleEdit = (item: PackageItem) => {
    Alert.alert('Update Package', `Update "${item.name}" — coming soon.`);
  };

  const filtered = useMemo(() => packages.filter(p =>
    (branch === 'all' || p.branch === branch)
    && (status === 'all' || (status === 'active' ? p.active : !p.active))
    && (category === 'all' || p.category === category)
    && (duration === 'all' || p.duration === duration)
    && (trainer === 'all' || p.trainer === trainer),
  ), [packages, branch, status, category, duration, trainer]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, PackageItem[]>();
    filtered.forEach(p => {
      if (!byCategory.has(p.category)) byCategory.set(p.category, []);
      byCategory.get(p.category)!.push(p);
    });
    return Array.from(byCategory.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
      .map(([cat, items]) => {
        const byDuration = new Map<string, { count: number; days: number; items: PackageItem[] }>();
        items.forEach(p => {
          if (!byDuration.has(p.duration)) byDuration.set(p.duration, { count: 0, days: p.durationDays, items: [] });
          const entry = byDuration.get(p.duration)!;
          entry.count += 1;
          entry.items.push(p);
        });
        return {
          category: cat,
          count: items.length,
          durations: Array.from(byDuration.entries())
            .sort((a, b) => a[1].days - b[1].days)
            .map(([dur, v]) => ({ duration: dur, count: v.count, items: v.items })),
        };
      });
  }, [filtered]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Detailed Packages"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Filters ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Detailed Packages</Text>
          </View>
          <View style={styles.form}>
            <SelectionField
              label="Filter by Branch"
              value={branchLabel}
              placeholder="All Branches"
              onPress={() => setModalField('branch')}
            />
            <SelectionField
              label="Filter by Status"
              value={statusLabel}
              placeholder="All Status"
              onPress={() => setModalField('status')}
            />
            <SelectionField
              label="Filter by Category"
              value={categoryLabel}
              placeholder="All Categories"
              onPress={() => setModalField('category')}
            />
            <SelectionField
              label="Filter by Duration"
              value={durationLabel}
              placeholder="All Durations"
              onPress={() => setModalField('duration')}
            />
            <SelectionField
              label="Filter by Trainer"
              value={trainerLabel}
              placeholder="All Trainers"
              onPress={() => setModalField('trainer')}
            />

            <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilters}>
              <Icon name="close-circle-outline" size={16} color="#555" />
              <Text style={styles.clearBtnText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Grouped Results ── */}
        {loading ? (
          <View style={styles.section}>
            <View style={styles.noRecord}><ActivityIndicator size="small" color="#C0392B" /></View>
          </View>
        ) : grouped.length === 0 ? (
          <View style={styles.section}>
            <View style={styles.noRecord}><Text style={styles.noRecordText}>No Record Found</Text></View>
          </View>
        ) : grouped.map(group => (
          <View key={group.category} style={styles.section}>
            <View style={styles.categoryBar}>
              <Icon name="tag-outline" size={14} color="#FFF" />
              <Text style={styles.categoryBarText}>{group.category}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{group.count}</Text>
              </View>
            </View>

            {group.durations.map(durGroup => (
              <View key={durGroup.duration} style={styles.durationBlock}>
                <View style={styles.durationHeader}>
                  <Icon name="clock-outline" size={13} color="#666" />
                  <Text style={styles.durationHeaderText}>{durGroup.duration}</Text>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationBadgeText}>{durGroup.count}</Text>
                  </View>
                </View>

                <View style={styles.cardGrid}>
                  {durGroup.items.map(item => (
                    <View key={item.id} style={styles.card}>
                      <View style={styles.cardTopRow}>
                        <View style={styles.branchChip}>
                          <Icon name="domain" size={11} color="#FFF" />
                          <Text style={styles.branchChipText}>{item.branch}</Text>
                        </View>
                        <View style={styles.cardActions}>
                          <TouchableOpacity style={[styles.actionIcon, styles.actionEdit]} onPress={() => handleEdit(item)}>
                            <Icon name="pencil-outline" size={13} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionIcon, styles.actionToggle]} onPress={() => handleToggleActive(item)}>
                            <Icon name={item.active ? 'pause-circle-outline' : 'play-circle-outline'} size={13} color="#D97706" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionIcon, styles.actionDelete]} onPress={() => handleDelete(item)}>
                            <Icon name="trash-can-outline" size={13} color="#C0392B" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={styles.cardName}>{item.name}</Text>

                      <View style={[styles.statusBadge, item.active ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusBadgeText, item.active ? styles.statusActiveText : styles.statusInactiveText]}>
                          {item.active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>

                      <Text style={styles.cardPrice}>{`Rs ${item.price}/-`}</Text>

                      <View style={styles.cardRow}>
                        <Icon name="calendar-blank-outline" size={12} color="#888" />
                        <Text style={styles.cardRowText}>{item.duration}</Text>
                      </View>

                      {item.tag && (
                        <View style={styles.cardRow}>
                          <Icon name="tag-outline" size={12} color="#888" />
                          <Text style={styles.cardRowText} numberOfLines={1}>{item.tag}</Text>
                        </View>
                      )}

                      {item.trainer && (
                        <View style={styles.cardRow}>
                          <Icon name="account-outline" size={12} color="#888" />
                          <Text style={styles.cardRowText} numberOfLines={1}>{item.trainer}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <SelectionModal
        visible={modalField === 'branch'}
        title="Filter by Branch"
        options={branchOptions}
        selectedValue={branchLabel}
        onSelect={(val: string) => { setBranch(branchOptions.find(o => o.label === val)?.id ?? 'all'); setModalField(null); }}
        onClose={() => setModalField(null)}
      />
      <SelectionModal
        visible={modalField === 'status'}
        title="Filter by Status"
        options={STATUS_OPTIONS}
        selectedValue={statusLabel}
        onSelect={(val: string) => { setStatus(STATUS_OPTIONS.find(o => o.label === val)?.id ?? 'all'); setModalField(null); }}
        onClose={() => setModalField(null)}
      />
      <SelectionModal
        visible={modalField === 'category'}
        title="Filter by Category"
        options={categoryOptions}
        selectedValue={categoryLabel}
        onSelect={(val: string) => { setCategory(categoryOptions.find(o => o.label === val)?.id ?? 'all'); setModalField(null); }}
        onClose={() => setModalField(null)}
      />
      <SelectionModal
        visible={modalField === 'duration'}
        title="Filter by Duration"
        options={durationOptions}
        selectedValue={durationLabel}
        onSelect={(val: string) => { setDuration(durationOptions.find(o => o.label === val)?.id ?? 'all'); setModalField(null); }}
        onClose={() => setModalField(null)}
      />
      <SelectionModal
        visible={modalField === 'trainer'}
        title="Filter by Trainer"
        options={trainerOptions}
        selectedValue={trainerLabel}
        onSelect={(val: string) => { setTrainer(trainerOptions.find(o => o.label === val)?.id ?? 'all'); setModalField(null); }}
        onClose={() => setModalField(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F7F8FA' },
  scroll:           { padding: 12, paddingBottom: 30 },
  section:          { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  sectionHeader:    { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  form:             { padding: 14 },
  clearBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 12, marginTop: 4 },
  clearBtnText:     { fontSize: 13, fontWeight: '600', color: '#555' },
  noRecord:         { paddingVertical: 24, alignItems: 'center' },
  noRecordText:     { fontSize: 13, color: '#999' },

  categoryBar:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2F6FE4', paddingHorizontal: 14, paddingVertical: 12 },
  categoryBarText:  { flex: 1, fontSize: 14, fontWeight: '700', color: '#FFF' },
  categoryBadge:    { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  categoryBadgeText:{ fontSize: 12, fontWeight: '700', color: '#FFF' },

  durationBlock:    { paddingHorizontal: 14, paddingTop: 12 },
  durationHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  durationHeaderText:{ fontSize: 12, fontWeight: '700', color: '#444' },
  durationBadge:    { backgroundColor: '#EEE', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  durationBadgeText:{ fontSize: 11, fontWeight: '700', color: '#666' },

  cardGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12 },
  card:             { width: '47%', backgroundColor: '#FAFAFA', borderRadius: 10, borderWidth: 1, borderColor: '#EEE', padding: 10 },
  cardTopRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  branchChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2F6FE4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  branchChipText:   { fontSize: 10, fontWeight: '700', color: '#FFF' },
  cardActions:      { flexDirection: 'row', gap: 4 },
  actionIcon:       { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actionEdit:       { backgroundColor: '#E8F0FE' },
  actionToggle:     { backgroundColor: '#FEF3E2' },
  actionDelete:     { backgroundColor: '#FBEAEA' },
  cardName:         { fontSize: 12, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  statusBadge:      { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  statusActive:     { backgroundColor: '#E6F7EC' },
  statusInactive:   { backgroundColor: '#FEF3E2' },
  statusBadgeText:  { fontSize: 10, fontWeight: '700' },
  statusActiveText: { color: '#2A9348' },
  statusInactiveText:{ color: '#D97706' },
  cardPrice:        { fontSize: 13, fontWeight: '700', color: '#2F6FE4', marginBottom: 6 },
  cardRow:          { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  cardRowText:      { fontSize: 11, color: '#888' },
});

export default DetailedPackages;
