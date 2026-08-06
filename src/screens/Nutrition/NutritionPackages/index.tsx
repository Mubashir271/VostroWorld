import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import {
  getNutritionists,
  getNutritionPackages,
  addNutritionPackage,
} from '../../../api/nutrition';

const NUTRITION_TYPES = ['Silver', 'Gold', 'Platinum'];

interface Nutritionist {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
}

interface NutritionPackage {
  id: number;
  branch_name?: string;
  branches_name?: string;
  package_name?: string;
  nutritionist?: { first_name?: string; last_name?: string; name?: string };
  nutritionist_name?: string;
  nutrition_type?: string;
  number_of_sessions?: number;
  duration?: number;
  price?: number | string;
}

const NutritionPackages = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const branchName = (profile as any)?.branchName ?? `Branch ${branchId}`;

  // Tab state
  const [activeTab, setActiveTab] = useState<'add' | 'view'>('add');

  // ── Add Package form state ─────────────────────────────────────────────────
  const [nutritionists, setNutritionists] = useState<Nutritionist[]>([]);
  const [nutriDropOpen, setNutriDropOpen] = useState(false);
  const [selectedNutritionist, setSelectedNutritionist] = useState<Nutritionist | null>(null);

  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');

  const [packageName, setPackageName] = useState('');
  const [price, setPrice] = useState('');
  const [sessions, setSessions] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  // ── View Packages state ────────────────────────────────────────────────────
  const [packages, setPackages] = useState<NutritionPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // ── Load nutritionists ─────────────────────────────────────────────────────
  const loadNutritionists = useCallback(async () => {
    try {
      const res = await getNutritionists({ branch_id: branchId });
      setNutritionists(res?.data?.data ?? res?.data ?? []);
    } catch {
      setNutritionists([]);
    }
  }, [branchId]);

  // ── Load packages ──────────────────────────────────────────────────────────
  const loadPackages = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingPkgs(true);
    try {
      const res = await getNutritionPackages({ branch_id: branchId, limit: 200, page: 1 });
      setPackages(res?.data?.data ?? res?.data ?? []);
    } catch {
      setPackages([]);
    } finally {
      setLoadingPkgs(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadNutritionists();
    loadPackages();
  }, [loadNutritionists, loadPackages]);

  // ── Submit add form ────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!selectedNutritionist) {
      Alert.alert('Validation', 'Please select a Nutritionist.');
      return;
    }
    if (!selectedType) {
      Alert.alert('Validation', 'Please select a Nutrition Type.');
      return;
    }
    if (!packageName.trim()) {
      Alert.alert('Validation', 'Package Name is required.');
      return;
    }
    if (!price || isNaN(Number(price))) {
      Alert.alert('Validation', 'Please enter a valid Price.');
      return;
    }
    if (!sessions || isNaN(Number(sessions))) {
      Alert.alert('Validation', 'Please enter a valid Number of Sessions.');
      return;
    }
    if (!duration || isNaN(Number(duration))) {
      Alert.alert('Validation', 'Please enter a valid Duration.');
      return;
    }

    setSaving(true);
    try {
      await addNutritionPackage({
        branch_id: branchId,
        nutritionist_id: selectedNutritionist.id,
        nutrition_type: selectedType,
        package_name: packageName.trim(),
        price: Number(price),
        number_of_sessions: Number(sessions),
        duration: Number(duration),
      });
      Alert.alert('Success', 'Nutrition package added successfully.');
      setSelectedNutritionist(null);
      setSelectedType('');
      setPackageName('');
      setPrice('');
      setSessions('');
      setDuration('');
      loadPackages();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to add package.');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const nutritionistLabel = (n: Nutritionist) =>
    (n.name ?? `${n.first_name ?? ''} ${n.last_name ?? ''}`.trim()) || `#${n.id}`;

  const filteredPackages = packages.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.package_name ?? '').toLowerCase().includes(q) ||
      (p.nutrition_type ?? '').toLowerCase().includes(q)
    );
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <AppHeader
        title="Nutrition Packages"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.tabActive]}
          onPress={() => setActiveTab('add')}
        >
          <Icon
            name="plus-circle-outline"
            size={16}
            color={activeTab === 'add' ? '#E63946' : '#888'}
          />
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
            Add Package
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'view' && styles.tabActive]}
          onPress={() => setActiveTab('view')}
        >
          <Icon
            name="format-list-bulleted"
            size={16}
            color={activeTab === 'view' ? '#E63946' : '#888'}
          />
          <Text style={[styles.tabText, activeTab === 'view' && styles.tabTextActive]}>
            View Packages
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── ADD PACKAGE TAB ─────────────────────────────────────── */}
      {activeTab === 'add' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.formScroll}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Package Details</Text>

              {/* Branch Name (read-only) */}
              <Text style={styles.label}>Branch Name</Text>
              <View style={styles.readonlyField}>
                <Text style={styles.readonlyText}>{branchName}</Text>
              </View>

              {/* Nutritionist dropdown */}
              <Text style={styles.label}>Nutritionist Name</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setNutriDropOpen(v => !v);
                  setTypeDropOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !selectedNutritionist && styles.dropdownPlaceholder,
                  ]}
                >
                  {selectedNutritionist
                    ? nutritionistLabel(selectedNutritionist)
                    : 'Select Nutritionist'}
                </Text>
                <Icon
                  name={nutriDropOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#555"
                />
              </TouchableOpacity>
              {nutriDropOpen && (
                <View style={styles.dropdownMenu}>
                  {nutritionists.length === 0 ? (
                    <Text style={styles.dropdownEmpty}>No nutritionists found</Text>
                  ) : (
                    nutritionists.map(n => (
                      <TouchableOpacity
                        key={n.id}
                        style={[
                          styles.dropdownItem,
                          selectedNutritionist?.id === n.id && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setSelectedNutritionist(n);
                          setNutriDropOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selectedNutritionist?.id === n.id &&
                              styles.dropdownItemTextActive,
                          ]}
                        >
                          {nutritionistLabel(n)}
                        </Text>
                        {selectedNutritionist?.id === n.id && (
                          <Icon name="check" size={14} color="#E63946" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* Nutrition Type dropdown */}
              <Text style={styles.label}>Nutrition Type</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setTypeDropOpen(v => !v);
                  setNutriDropOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !selectedType && styles.dropdownPlaceholder,
                  ]}
                >
                  {selectedType || 'Select Type'}
                </Text>
                <Icon
                  name={typeDropOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#555"
                />
              </TouchableOpacity>
              {typeDropOpen && (
                <View style={styles.dropdownMenu}>
                  {NUTRITION_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.dropdownItem,
                        selectedType === t && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setSelectedType(t);
                        setTypeDropOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedType === t && styles.dropdownItemTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                      {selectedType === t && (
                        <Icon name="check" size={14} color="#E63946" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Package Name */}
              <Text style={styles.label}>Package Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter package name"
                placeholderTextColor="#aaa"
                value={packageName}
                onChangeText={setPackageName}
              />

              {/* Price */}
              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price"
                placeholderTextColor="#aaa"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              {/* Number of Sessions */}
              <Text style={styles.label}>Number of Sessions</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter number of sessions"
                placeholderTextColor="#aaa"
                value={sessions}
                onChangeText={setSessions}
                keyboardType="numeric"
              />

              {/* Duration */}
              <Text style={styles.label}>
                Enter Duration{' '}
                <Text style={styles.labelHint}>(Please enter the duration in form of days)</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter duration in days"
                placeholderTextColor="#aaa"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />

              {/* Add button */}
              <TouchableOpacity
                style={[styles.addBtn, saving && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Icon name="plus" size={18} color="#FFF" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── VIEW PACKAGES TAB ───────────────────────────────────── */}
      {activeTab === 'view' && (
        <View style={{ flex: 1 }}>
          {/* Search bar */}
          <View style={styles.toolbar}>
            <View style={styles.searchBar}>
              <Icon name="magnify" size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor="#aaa"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={15} color="#bbb" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loadingPkgs ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#E63946" />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.tableScroll}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadPackages(true)}
                  colors={['#E63946']}
                />
              }
            >
              <View style={styles.tableCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Nutrition Packages</Text>
                  <Text style={styles.sectionCount}>
                    {filteredPackages.length} record
                    {filteredPackages.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    {/* Table header */}
                    <View style={tbl.headerRow}>
                      <Text style={[tbl.headerCell, { width: 40 }]}>Sr#</Text>
                      <Text style={[tbl.headerCell, { width: 100 }]}>Branch</Text>
                      <Text style={[tbl.headerCell, { width: 140 }]}>Package Name</Text>
                      <Text style={[tbl.headerCell, { width: 130 }]}>Nutritionist</Text>
                      <Text style={[tbl.headerCell, { width: 90 }]}>Type</Text>
                      <Text style={[tbl.headerCell, { width: 80 }]}>Sessions</Text>
                      <Text style={[tbl.headerCell, { width: 80 }]}>Duration</Text>
                      <Text style={[tbl.headerCell, { width: 80 }]}>Price</Text>
                    </View>
                    {filteredPackages.length === 0 ? (
                      <View style={styles.noRecord}>
                        <Text style={styles.noRecordText}>No Record Found</Text>
                      </View>
                    ) : (
                      filteredPackages.map((pkg, index) => {
                        const nutri = pkg.nutritionist
                          ? (pkg.nutritionist.name ??
                              `${pkg.nutritionist.first_name ?? ''} ${pkg.nutritionist.last_name ?? ''}`.trim())
                          : (pkg.nutritionist_name ?? '—');
                        const brName =
                          pkg.branch_name ?? pkg.branches_name ?? branchName;
                        return (
                          <View
                            key={pkg.id}
                            style={[tbl.dataRow, index % 2 === 1 && tbl.dataRowAlt]}
                          >
                            <Text style={[tbl.cell, tbl.cellMuted, { width: 40 }]}>
                              {index + 1}
                            </Text>
                            <Text
                              style={[tbl.cell, { width: 100 }]}
                              numberOfLines={1}
                            >
                              {brName}
                            </Text>
                            <Text
                              style={[tbl.cell, tbl.cellRed, { width: 140 }]}
                              numberOfLines={1}
                            >
                              {pkg.package_name ?? '—'}
                            </Text>
                            <Text
                              style={[tbl.cell, { width: 130 }]}
                              numberOfLines={1}
                            >
                              {nutri}
                            </Text>
                            <Text
                              style={[tbl.cell, { width: 90 }]}
                              numberOfLines={1}
                            >
                              {pkg.nutrition_type ?? '—'}
                            </Text>
                            <Text style={[tbl.cell, { width: 80 }]}>
                              {pkg.number_of_sessions ?? '—'}
                            </Text>
                            <Text style={[tbl.cell, { width: 80 }]}>
                              {pkg.duration != null ? `${pkg.duration}d` : '—'}
                            </Text>
                            <Text style={[tbl.cell, { width: 80 }]}>
                              {pkg.price != null ? `${pkg.price}` : '—'}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

export default NutritionPackages;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#E63946' },
  tabText: { fontSize: 14, color: '#888', fontWeight: '500' },
  tabTextActive: { color: '#E63946', fontWeight: '700' },

  // Form
  formScroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  labelHint: { fontSize: 11, fontWeight: '400', color: '#888' },
  readonlyField: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F7F7F7',
  },
  readonlyText: { fontSize: 14, color: '#555' },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  dropdownText: { fontSize: 14, color: '#1A1A1A' },
  dropdownPlaceholder: { color: '#aaa' },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginTop: 2,
    backgroundColor: '#FFF',
    elevation: 4,
    zIndex: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemActive: { backgroundColor: '#FFF5F5' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemTextActive: { color: '#E63946', fontWeight: '600' },
  dropdownEmpty: { padding: 14, fontSize: 13, color: '#999', textAlign: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E63946',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 24,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Toolbar / search
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },

  // Table wrapper
  tableScroll: { padding: 12, paddingBottom: 30 },
  tableCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  sectionCount: { fontSize: 12, color: '#888' },
  noRecord: { paddingVertical: 28, alignItems: 'center' },
  noRecordText: { fontSize: 13, color: '#999' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const tbl = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#C0392B',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    paddingHorizontal: 4,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dataRowAlt: { backgroundColor: '#FBF8F8' },
  cell: { fontSize: 12, color: '#1A1A1A', paddingHorizontal: 4, alignSelf: 'center' },
  cellMuted: { color: '#888' },
  cellRed: { color: '#C0392B', fontWeight: '600' },
});
