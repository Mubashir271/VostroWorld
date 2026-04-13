import React, { useMemo, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MembersTab } from '../../assets/icons'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import { useNavigation } from '@react-navigation/native';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import NotificationSVG from '../../assets/svg/NotificationSVG';

const { width } = Dimensions.get('window')

type PackageItem = {
  id: string
  title: string
  category: string
  duration: string
  price: string
  members: number
  description?: string
  status: 'Active' | 'Inactive' | 'Expiring Soon'
  color?: string
}

const tabs = ['All Packages', 'Gym Packages', 'PT Packages', 'Nutrition', 'Other']

const samplePackages: PackageItem[] = [
  {
    id: '1',
    title: 'Basic Gym Membership',
    category: 'Gym',
    duration: '1 Month',
    price: 'PKR 5,000',
    members: 245,
    description: 'Access to gym facilities and group sessions.',
    status: 'Active',
    color: '#FF3B30',
  },
  {
    id: '2',
    title: 'Personal Training',
    category: 'PT',
    duration: '3 Month',
    price: 'PKR 5,000',
    members: 285,
    description: 'One-on-one training with a professional trainer.',
    status: 'Active',
    color: '#FF3B30',
  },
  {
    id: '3',
    title: 'Diet Plan Package',
    category: 'Nutrition',
    duration: '3 Month',
    price: 'PKR 5,000',
    members: 52,
    description: 'Personalize diet plans and nutritional support.',
    status: 'Inactive',
    color: '#8E8E93',
  },
  {
    id: '4',
    title: 'Cafe Membership',
    category: 'Other',
    duration: '1 Month',
    price: 'PKR 5,000',
    members: 34,
    description: 'Access to cafe discounts and loyalty rewards.',
    status: 'Expiring Soon',
    color: '#FF9500',
  },
]
// const samplePackages: PackageItem[] = []

const PackageScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(tabs[0])
  const [packages] = useState<PackageItem[]>(samplePackages)
  const navigation = useNavigation();

  const filtered = useMemo(() => {
    if (activeTab === 'All Packages') return packages
    // match by category name contained in tab
    return packages.filter((p) => activeTab.includes(p.category) || p.category === activeTab.replace(' Packages', ''))
  }, [activeTab, packages])

  const renderTab = (tab: string) => {
    const selected = tab === activeTab
    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tabItem, selected && styles.tabItemActive]}
        onPress={() => setActiveTab(tab)}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab}</Text>
      </TouchableOpacity>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyCard}>
      {/* <View style={styles.emptyCube} /> */}
      <Icon name="package-variant" size={50} color="#6B7280" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No packages created yet</Text>
      <Text style={styles.emptySubtitle}>Create your first package to get started</Text>
      <TouchableOpacity style={styles.createButton} activeOpacity={0.8}>
        <Text style={styles.createButtonText}>Create Your First Package</Text>
      </TouchableOpacity>
    </View>
  )

  const renderItem = ({ item }: { item: PackageItem }) => (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={[styles.iconCircle, { backgroundColor: item.color ?? '#FF3B30' }]}>
          <Text style={styles.iconText}>{item.category[0]}</Text>
        </View>
        <View style={styles.cardTopContent}>
          <View style={styles.titleStatusRow}>
            <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
              {item.title}
            </Text>
            <View style={[styles.statusBadge, item.status === 'Active' ? styles.statusActive : item.status === 'Inactive' ? styles.statusInactive : styles.statusExpiring]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
          <View style={styles.cardCategory}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>

            <Text style={styles.cardDuration}>{item.duration}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBottomContent}>
        <Text style={styles.price}>{item.price}</Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
            {item.description}
          </Text>
        )}
        <View style={styles.cardFooterRow}>
          <View style={styles.membersContainer}>
            <Image
              source={MembersTab}
              style={{ width: 18, height: 18, tintColor: '#E63946' }}
              resizeMode="contain"
            />
            <Text style={styles.membersText}>
              {item.members} Members
            </Text>
          </View>
          <TouchableOpacity style={styles.menuDots} activeOpacity={0.7}>
            <Text style={styles.menuDotsText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

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
      <View style={styles.safe}>

        <View style={styles.container}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
            {tabs.map(renderTab)}
          </ScrollView>

          {filtered.length === 0 ? (
            <View style={styles.emptyWrapper}>{renderEmpty()}</View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          <TouchableOpacity style={styles.fab} activeOpacity={0.8}
          onPress={() => navigation.navigate('NewPackage')}>
            <Text style={styles.fabPlus}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  )
}

export default PackageScreen

const styles = StyleSheet.create({
  safe: { flex: 1,marginTop :10, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 16 },
  tabs: { maxHeight: 44 },
  tabsContent: { alignItems: 'center' },
  tabItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  tabItemActive: { backgroundColor: '#FF333A', borderColor: '#FF333A' },
  tabText: { color: '#333', fontSize: 12 },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  listContent: { paddingVertical: 12, paddingBottom: 120 },
  card: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1D7D8',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 0,
  },
  cardTopContent: {
    flex: 1,
    paddingLeft: 12,
  },
  titleStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3D7DA',
    marginVertical: 12,
  },
  cardBottomContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  /* Category Pill - Red with White Text */
  categoryPill: {
    backgroundColor: '#E63946',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,           // pill shape
    alignSelf: 'flex-start',    // prevents full width
    marginTop: 6,
    marginBottom: 4,
  },

  categoryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Updated cardDuration (was cardCategory) */
  cardDuration: {
    color: '#8E8E93',
    fontSize: 13.5,
    marginTop: 2,
  },
  cardLeft: { width: 56, justifyContent: 'center', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  iconText: { color: '#fff', fontWeight: '700' },
  cardBody: { flex: 1, paddingLeft: 8 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1 },
  cardCategory: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { color: '#E63946', fontWeight: '700', marginTop: 0, marginBottom: 6 },
  description: {
    color: '#444',
    fontSize: 14,
    lineHeight: 16,
    marginBottom: 12,
  },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 0 },
  membersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,                    // spacing between icon and text
  },

  membersText: {
    color: '#8E8E93',
    fontSize: 13.5,
    fontWeight: '500',
  },
  // membersText: { color: '#8E8E93', fontSize: 13 },
  menuDots: { paddingHorizontal: 8, paddingVertical: 4 },
  menuDotsText: { fontSize: 20, color: '#E63946' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#E7F9EF' },
  statusInactive: { backgroundColor: '#ECECEC' },
  statusExpiring: { backgroundColor: '#FFF4E6' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#000' },
  emptyWrapper: { marginTop: 16 },
  emptyCard: {
    backgroundColor: '#FEEEED',        // soft pink
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E63946',
    paddingVertical: 50,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: '100%',
    // maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  emptyIcon: {
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },

  createButton: {
    backgroundColor: '#E63946',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },

  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 26,
    left: (width - 64) / 2,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF333A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  fabPlus: { color: '#fff', fontSize: 36, lineHeight: 36, fontWeight: '700' },
})