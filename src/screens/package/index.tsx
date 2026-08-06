import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeader from '../../components/AppHeader';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { getPackageCategories, getPackagesSalesReport } from '../../api/dashboard';
import { setCategories, setPackages } from '../../redux/slices/package';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

const lastDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

const formatPKR = (amount: number) =>
  `PKR ${Math.round(amount).toLocaleString('en-PK')}`;

// category code → light background + text colour
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  '1':  { bg: '#FFE5E5', text: '#E63946' }, // Gym
  '2':  { bg: '#E5F0FF', text: '#1D6FE8' }, // Trainer
  '3':  { bg: '#E5FFE9', text: '#2A9348' }, // Guest Pass
  '4':  { bg: '#FFF3E5', text: '#E07B00' }, // Small Group PT
  '5':  { bg: '#F0E5FF', text: '#7B2DE8' }, // Nutrition
  '6':  { bg: '#E5FBFF', text: '#0095B0' }, // Registration
  '7':  { bg: '#FFF9E5', text: '#C89000' }, // Bootcamp
  '8':  { bg: '#F0F0F0', text: '#555'    }, // Freezing
  '9':  { bg: '#F5F5F5', text: '#666'    }, // General
  '10': { bg: '#FFF0E5', text: '#C65200' }, // Cafe
  '11': { bg: '#E5FFE5', text: '#1A7A1A' }, // CFT
  '12': { bg: '#E5E5FF', text: '#3A3AE8' }, // Massage Chair
  '13': { bg: '#FFE5F5', text: '#C02080' }, // Cafe Deposits
  '14': { bg: '#E5FFF8', text: '#009966' }, // Physiotherapy
  '15': { bg: '#FFE5EF', text: '#E8004A' }, // GX
};

const categoryColor = (code: string) =>
  CATEGORY_COLORS[code] ?? { bg: '#F0F0F0', text: '#444' };

// ─── Sub-components ─────────────────────────────────────────────────────────

const SummaryCard = ({
  label,
  value,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon: string;
  iconColor: string;
}) => (
  <View style={styles.summaryCard}>
    <View style={[styles.summaryIconWrap, { backgroundColor: iconColor + '20' }]}>
      <Icon name={icon} size={18} color={iconColor} />
    </View>
    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

const PackageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const { profile } = useSelector((state: RootState) => state.user);
  const { categories, packages, summary } = useSelector(
    (state: RootState) => state.packages,
  );

  // '' (not 0) for Super Admin — /v1/transaction-report treats a literal
  // branch_id=0 as a nonexistent branch (404 "No record found") but branch_id=
  // (empty) as "all branches" (confirmed live 2026-08-06, same as the
  // Reports screens' fix).
  const branchId = profile?.branchId || '';

  // ── Month navigation ──
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  const startDate = `${year}-${pad(month)}-01`;
  const endDate   = `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`;

  // ── Category tab ──
  const [activeTab, setActiveTab] = useState<string>('all');

  // ── Loading ──
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch helpers ──
  const fetchCategories = useCallback(async () => {
    try {
      const res = await getPackageCategories();
      const cats = res?.data;
      dispatch(setCategories(Array.isArray(cats) ? cats : []));
    } catch {}
  }, [dispatch]);

  const fetchPackages = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        // getPackagesSalesReport already aggregates the raw day-grouped
        // /v1/transaction-report response into per-package totals (see
        // api/dashboard.ts) — no further reshaping needed here.
        const res = await getPackagesSalesReport({
          branch_id: branchId,
          start_date: startDate,
          end_date: endDate,
        });
        dispatch(
          setPackages({
            data: res?.data ?? [],
            total_price: res?.total_price ?? 0,
            total_discount: res?.total_discount ?? 0,
            total_net_price: res?.total_net_price ?? 0,
          }),
        );
      } catch {
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branchId, startDate, endDate, dispatch],
  );

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  // ── Tab list ──
  const tabs = useMemo(
    () => [{ code: 'all', tag: 'All' }, ...(Array.isArray(categories) ? categories : [])],
    [categories],
  );

  // ── Filtered packages ──
  const filtered = useMemo(() => {
    if (activeTab === 'all') return packages;
    return packages.filter(p => String(p.package_category) === String(activeTab));
  }, [packages, activeTab]);

  // ── Render package card ──
  const renderItem = ({ item }: { item: typeof packages[0] }) => {
    const catTag = categories.find(c => String(c.code) === String(item.package_category))?.tag ?? '';
    const color = categoryColor(item.package_category);
    const salesCount = item.order_detail?.length ?? 0;
    const hasDiscount = item.total_discount > 0;

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.catPill, { backgroundColor: color.bg }]}>
            <Text style={[styles.catPillText, { color: color.text }]}>{catTag}</Text>
          </View>
          <View style={styles.salesBadge}>
            <Icon name="cart-outline" size={12} color="#E63946" />
            <Text style={styles.salesBadgeText}>{salesCount} sold</Text>
          </View>
        </View>

        {/* Package name */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.package_name}
        </Text>

        <View style={styles.divider} />

        {/* Revenue rows */}
        <View style={styles.revenueRow}>
          <View style={styles.revenueItem}>
            <Text style={styles.revenueLabel}>Gross</Text>
            <Text style={styles.revenueValue}>{formatPKR(item.total_price)}</Text>
          </View>
          {hasDiscount && (
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Discount</Text>
              <Text style={[styles.revenueValue, { color: '#E07B00' }]}>
                − {formatPKR(item.total_discount)}
              </Text>
            </View>
          )}
          <View style={styles.revenueItem}>
            <Text style={styles.revenueLabel}>Net</Text>
            <Text style={[styles.revenueValue, styles.netValue]}>
              {formatPKR(item.total_net_price)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Empty state ──
  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Icon name="package-variant-closed" size={52} color="#CCC" />
      <Text style={styles.emptyTitle}>No packages found</Text>
      <Text style={styles.emptySubtitle}>
        No sales recorded for {MONTHS[month - 1]} {year}
      </Text>
    </View>
  );

  return (
    <>
      <AppHeader
        title="Packages"
        leftIcon={<BurgerSVG width={24} height={24} />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.openDrawer()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.root}>
        {/* Month navigator */}
        <View style={styles.monthBar}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
            <Icon name="chevron-left" size={22} color="#E63946" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTHS[month - 1]} {year}
          </Text>
          <TouchableOpacity
            onPress={nextMonth}
            style={styles.monthArrow}
            disabled={isCurrentMonth}>
            <Icon
              name="chevron-right"
              size={22}
              color={isCurrentMonth ? '#CCC' : '#E63946'}
            />
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Gross"
            value={formatPKR(summary.total_price)}
            icon="cash"
            iconColor="#2A9348"
          />
          <SummaryCard
            label="Discount"
            value={formatPKR(summary.total_discount)}
            icon="tag-minus"
            iconColor="#E07B00"
          />
          <SummaryCard
            label="Net"
            value={formatPKR(summary.total_net_price)}
            icon="currency-usd"
            iconColor="#E63946"
          />
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsBar}
          contentContainerStyle={styles.tabsContent}>
          {tabs.map(tab => {
            const selected = tab.code === activeTab;
            return (
              <TouchableOpacity
                key={tab.code}
                style={[styles.tabChip, selected && styles.tabChipActive]}
                onPress={() => setActiveTab(tab.code)}>
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>
                  {tab.tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#E63946" />
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={filtered}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchPackages(true)}
                colors={['#E63946']}
                tintColor="#E63946"
              />
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('NewPackage')}>
          <Text style={styles.fabPlus}>+</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default PackageScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7F7' },

  // Month bar
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  monthArrow: { padding: 4 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#111' },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 10,
    alignItems: 'center',
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  summaryLabel: { fontSize: 10, color: '#888', marginTop: 2 },

  // Tabs
  tabsBar: { maxHeight: 46, backgroundColor: '#FFF' },
  tabsContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  tabChipActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  tabText: { fontSize: 12, color: '#555', fontWeight: '500' },
  tabTextActive: { color: '#FFF', fontWeight: '700' },

  // List
  list: { flex: 1 },
  listContent: { padding: 14, paddingBottom: 30 },

  // Package card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1D7D8',
    marginBottom: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  catPillText: { fontSize: 11, fontWeight: '600' },
  salesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  salesBadgeText: { fontSize: 11, color: '#E63946', fontWeight: '600' },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    lineHeight: 20,
    marginBottom: 10,
  },
  divider: { height: 1, backgroundColor: '#F3D7DA', marginBottom: 10 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between' },
  revenueItem: { alignItems: 'center', flex: 1 },
  revenueLabel: { fontSize: 10, color: '#999', marginBottom: 2 },
  revenueValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  netValue: { color: '#E63946' },

  // Loading / empty
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: { fontSize: 13, color: '#999', textAlign: 'center' },

  fab: {
    position: 'absolute',
    bottom: 26,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  fabPlus: { color: '#fff', fontSize: 36, lineHeight: 40, fontWeight: '700' },
});
