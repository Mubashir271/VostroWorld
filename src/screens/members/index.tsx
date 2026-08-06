import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { styles } from './styles';
import AppHeader from '../../components/AppHeader';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import { getClientsList } from '../../api/employeeDashboard';

interface Membership {
  client_id?: number;
  package_id?: number;
  category?: string;
  get_package_name?: { id: number; name: string };
}

interface Member {
  id: number;
  uid: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
  image: string;
  city: string;
  status: string; // '1' = Active, '0' = Inactive
  birthday: string;
  available_balance: number;
  branches_name: string;
  membership_type: Membership[];
}

const membershipName = (m: Member) =>
  m.membership_type?.[0]?.get_package_name?.name ?? 'No Membership';

const memberStatus = (m: Member): 'Active' | 'Expired' | 'Inactive' => {
  if (m.status === '1' || m.status === 'Active' || m.status === 'active') return 'Active';
  if (m.status === '0' || m.status === 'Inactive' || m.status === 'inactive') return 'Inactive';
  return 'Expired';
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  Active:   { bg: '#E6F4EA', text: '#2E7D32' },
  Expired:  { bg: '#FFEBEE', text: '#C62828' },
  Inactive: { bg: '#F5F5F5', text: '#666' },
};

const MembersScreen = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Filter states
  const [status, setStatus] = useState('All');
  const [membership, setMembership] = useState('All');
  const [dateRange, setDateRange] = useState('All Time');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Bottom Sheet Refs
  const statusRef = useRef<any>(null);
  const membershipRef = useRef<any>(null);
  const dateRef = useRef<any>(null);

  const snapPoints = useMemo(() => ['42%'], []);

  const openBottomSheet = useCallback((targetRef: React.RefObject<any>) => {
    [statusRef, membershipRef, dateRef].forEach((ref) => {
      if (ref.current && ref !== targetRef) ref.current.close();
    });
    setTimeout(() => targetRef.current?.expand(), 50);
  }, []);

  const load = useCallback(async (isRefresh = false, nextPage = 1) => {
    if (isRefresh) { setRefreshing(true); setPage(1); }
    else if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await getClientsList({ branch_id: branchId, limit: 30, page: nextPage });
      const rawList: Member[] = res?.data?.data ?? [];
      const totalPages = res?.totalPages ?? 1;

      if (isRefresh || nextPage === 1) {
        setMembers(rawList);
      } else {
        setMembers(prev => [...prev, ...rawList]);
      }
      setPage(nextPage);
      setHasMore(nextPage < totalPages);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) load(false, page + 1);
  };

  const resetFilters = () => {
    setStatus('All');
    setMembership('All');
    setDateRange('All Time');
    setSearch('');
  };

  // Derive unique filter options from loaded members
  const statusOptions = useMemo(() => {
    const seen = new Set(members.map(m => memberStatus(m)));
    return ['All', ...Array.from(seen)];
  }, [members]);

  const membershipOptions = useMemo(() => {
    const seen = new Set(
      members
        .map(m => membershipName(m))
        .filter(n => n !== 'No Membership'),
    );
    return ['All', ...Array.from(seen)];
  }, [members]);

  // Client-side filtering on loaded data
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
      const matchSearch = !search ||
        fullName.includes(search.toLowerCase()) ||
        m.uid?.toLowerCase().includes(search.toLowerCase()) ||
        m.phone?.includes(search);

      const matchStatus = status === 'All' || memberStatus(m) === status;

      const matchMembership =
        membership === 'All' ||
        membershipName(m).toLowerCase().includes(membership.toLowerCase());

      return matchSearch && matchStatus && matchMembership;
    });
  }, [members, search, status, membership]);

  const callPhone = (phone: string) => {
    const url = `tel:${phone}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Error', 'Phone calls are not supported on this device.');
    });
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=${cleaned}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('WhatsApp Not Found', 'WhatsApp is not installed on this device.');
    });
  };

  const renderItem = ({ item }: { item: Member }) => {
    const ms = memberStatus(item);
    const badge = STATUS_BADGE[ms] ?? STATUS_BADGE.Expired;
    const fullName = `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim();
    const initial = (item.first_name?.[0] ?? '?').toUpperCase();

    return (
      <View style={cardStyles.card}>
        {/* Top row: avatar + name/info + badge */}
        <View style={cardStyles.topRow}>
          <View style={cardStyles.avatar}>
            <Text style={cardStyles.avatarText}>{initial}</Text>
          </View>

          <View style={cardStyles.infoCol}>
            <Text style={cardStyles.name} numberOfLines={1}>{fullName}</Text>
            <Text style={cardStyles.membership} numberOfLines={1}>
              {membershipName(item)}
            </Text>
            <Text style={cardStyles.meta} numberOfLines={1}>
              {[item.uid, item.branches_name, item.gender].filter(Boolean).join('  ·  ')}
            </Text>
          </View>

          <View style={[cardStyles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[cardStyles.badgeText, { color: badge.text }]}>{ms}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={cardStyles.divider} />

        {/* Bottom row: phone info + action buttons */}
        <View style={cardStyles.bottomRow}>
          {item.phone ? (
            <Text style={cardStyles.phone} numberOfLines={1}>
              <Icon name="phone-outline" size={12} color="#888" /> {item.phone}
            </Text>
          ) : (
            <Text style={cardStyles.phone}>No phone on file</Text>
          )}

          <View style={cardStyles.actions}>
            <TouchableOpacity
              style={cardStyles.iconBtn}
              onPress={() => item.phone && callPhone(item.phone)}
              disabled={!item.phone}
            >
              <Icon name="phone" size={15} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[cardStyles.iconBtn, { backgroundColor: '#25D366' }]}
              onPress={() => item.phone && openWhatsApp(item.phone)}
              disabled={!item.phone}
            >
              <Icon name="whatsapp" size={15} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity style={[cardStyles.iconBtn, { backgroundColor: '#555' }]}>
              <Icon name="eye-outline" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const FilterChip = ({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.filterChip} onPress={onPress}>
      <Text style={styles.filterChipText}>
        {label}: {value}
      </Text>
      <Icon name="chevron-down" size={14} color="#666" />
    </TouchableOpacity>
  );

  return (
    <>
      <AppHeader
        title="Members"
        leftIcon={<BurgerSVG width={24} height={24} />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.openDrawer()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <View style={styles.container}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color="#999" />
          <TextInput
            placeholder="Search by name, UID or phone"
            value={search}
            onChangeText={setSearch}
            style={styles.input}
            placeholderTextColor="#999"
          />
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label="Status"
            value={status}
            onPress={() => openBottomSheet(statusRef)}
          />
          <FilterChip
            label="Membership"
            value={membership}
            onPress={() => openBottomSheet(membershipRef)}
          />
          <FilterChip
            label="Date"
            value={dateRange}
            onPress={() => openBottomSheet(dateRef)}
          />
        </ScrollView>

        <TouchableOpacity onPress={resetFilters}>
          <Text style={styles.reset}>Reset Filters</Text>
        </TouchableOpacity>

        {/* Members List */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#E63946" />
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={filteredMembers}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                colors={['#E63946']}
                tintColor="#E63946"
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color="#E63946" style={{ marginVertical: 16 }} />
              ) : hasMore ? null : (
                <Text style={{ textAlign: 'center', color: '#999', padding: 16, fontSize: 12 }}>
                  All {members.length} members loaded
                </Text>
              )
            }
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Icon name="account-off-outline" size={48} color="#ccc" />
                <Text style={{ color: '#999', fontSize: 16, marginTop: 12 }}>
                  No members found
                </Text>
              </View>
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('NewMemberRegistration')}
        >
          <Icon name="plus" size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Status Bottom Sheet */}
        <BottomSheet
          ref={statusRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
        >
          <BottomSheetView style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Status</Text>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionItem,
                  status === option && styles.optionSelected,
                ]}
                onPress={() => {
                  setStatus(option);
                  statusRef.current?.close();
                }}
              >
                <Text
                  style={
                    status === option
                      ? styles.optionTextSelected
                      : styles.optionText
                  }
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </BottomSheetView>
        </BottomSheet>

        {/* Membership Bottom Sheet */}
        <BottomSheet
          ref={membershipRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
        >
          <BottomSheetView style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Membership</Text>
            {membershipOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionItem,
                  membership === option && styles.optionSelected,
                ]}
                onPress={() => {
                  setMembership(option);
                  membershipRef.current?.close();
                }}
              >
                <Text
                  style={
                    membership === option
                      ? styles.optionTextSelected
                      : styles.optionText
                  }
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </BottomSheetView>
        </BottomSheet>

        {/* Date Bottom Sheet */}
        <BottomSheet
          ref={dateRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
        >
          <BottomSheetView style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Date Range</Text>
            {['All Time', 'Last 7 Days', 'Last 30 Days', 'This Month'].map(
              (option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionItem,
                    dateRange === option && styles.optionSelected,
                  ]}
                  onPress={() => {
                    setDateRange(option);
                    dateRef.current?.close();
                  }}
                >
                  <Text
                    style={
                      dateRange === option
                        ? styles.optionTextSelected
                        : styles.optionText
                    }
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 10,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E63946',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 18,
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  membership: {
    fontSize: 12,
    color: '#E63946',
    fontWeight: '600',
    marginTop: 2,
  },
  meta: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phone: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    backgroundColor: '#E63946',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MembersScreen;
