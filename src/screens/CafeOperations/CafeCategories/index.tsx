import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { getCafeCategories, createCafeCategory } from '../../../api/cafe';

const CafeCategories = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [catName, setCatName]     = useState('');
  const [catDesc, setCatDesc]     = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getCafeCategories({ branch_id: branchId, limit: 100 });
      setRows(res.data?.data ?? res.data ?? []);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!catName.trim()) { Alert.alert('Error', 'Category name is required.'); return; }
    setSaving(true);
    try {
      await createCafeCategory({ branch_id: branchId, name: catName.trim(), description: catDesc.trim() || undefined });
      setShowModal(false);
      setCatName('');
      setCatDesc('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  };

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.card, index % 2 === 1 && { backgroundColor: '#FBF8F8' }]}>
      <View style={styles.iconBox}>
        <Icon name="tag" size={20} color="#E63946" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.catName}>{item.name ?? '—'}</Text>
        {item.description ? <Text style={styles.catDesc}>{item.description}</Text> : null}
        <Text style={styles.catMeta}>{item.products_count ?? 0} products</Text>
      </View>
      <Icon name="chevron-right" size={20} color="#ccc" />
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Cafe Categories"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E63946" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderRow}
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="tag-multiple-outline" size={48} color="#ddd" />
              <Text style={styles.emptyTitle}>No Categories</Text>
              <Text style={styles.emptyText}>Add categories to organise your cafe menu.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
          <Icon name="plus" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.fabText}>Add Category</Text>
        </TouchableOpacity>
      </View>

      {/* Add Category Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Category</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput style={styles.fieldInput} placeholder="Category name" placeholderTextColor="#aaa" value={catName} onChangeText={setCatName} />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Description</Text>
            <TextInput style={styles.fieldInput} placeholder="Optional description" placeholderTextColor="#aaa" value={catDesc} onChangeText={setCatDesc} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalBtnText}>Save Category</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, elevation: 1 },
  iconBox:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF3F3', alignItems: 'center', justifyContent: 'center' },
  cardInfo:     { flex: 1 },
  catName:      { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  catDesc:      { fontSize: 12, color: '#888', marginTop: 2 },
  catMeta:      { fontSize: 12, color: '#E63946', marginTop: 2, fontWeight: '500' },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#333' },
  emptyText:    { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 30 },
  fabContainer: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  fab:          { backgroundColor: '#E63946', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  fabText:      { fontSize: 15, fontWeight: '700', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  fieldInput:   { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  modalBtn:     { backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

export default CafeCategories;
