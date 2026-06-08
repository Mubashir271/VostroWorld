import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../redux/store';
import { getExpensesList, addExpense } from '../../../api/employeeDashboard';

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  branch_name: string;
  added_by: string;
  status: string;
}

const CATEGORIES = ['Cafe Expense', 'CEO Personal', 'Diesel', 'General', 'Maintenance',
  'Media Expense', 'New Investment', 'Others', 'Rents', 'Staff Salaries', 'Tax', 'Utility Bills', 'Vendors'];

const CATEGORY_COLORS: Record<string, string> = {
  'Cafe Expense': '#FB8C00', 'Staff Salaries': '#E63946', 'Maintenance': '#1E88E5',
  'Utility Bills': '#43A047', 'Rents': '#8E24AA', 'General': '#607D8B',
};

const Expenses = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add form state
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getExpensesList({ branch_id: branchId, limit: 100 });
      setExpenses(res?.data ?? res ?? []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newCategory || !newAmount) {
      Alert.alert('Required', 'Please select a category and enter amount');
      return;
    }
    setAdding(true);
    try {
      await addExpense({
        branch_id: branchId,
        category: newCategory,
        amount: parseFloat(newAmount),
        description: newDesc,
        expense_date: new Date().toISOString().split('T')[0],
      });
      setShowAddModal(false);
      setNewCategory('');
      setNewAmount('');
      setNewDesc('');
      load();
    } catch {
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setAdding(false);
    }
  };

  const catColor = (cat: string) => CATEGORY_COLORS[cat] || '#607D8B';

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={styles.card}>
      <View style={[styles.catDot, { backgroundColor: catColor(item.category) }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.amount}>Rs {Number(item.amount || 0).toLocaleString()}/-</Text>
        </View>
        {item.description ? <Text style={styles.desc} numberOfLines={1}>{item.description}</Text> : null}
        <View style={styles.cardBottom}>
          <Text style={styles.dateText}>{formatDate(item.expense_date)}</Text>
          {item.added_by ? <Text style={styles.addedBy}>by {item.added_by}</Text> : null}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expenses</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Icon name="plus-circle" size={26} color="#E63946" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="receipt" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No expenses found</Text>
              <TouchableOpacity style={styles.addEmptyBtn} onPress={() => setShowAddModal(true)}>
                <Text style={styles.addEmptyText}>Add First Expense</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Category *</Text>
            <TouchableOpacity style={styles.catSelector} onPress={() => setShowCatPicker(true)}>
              <Text style={[styles.catSelectorText, !newCategory && { color: '#aaa' }]}>
                {newCategory || 'Select Category'}
              </Text>
              <Icon name="chevron-down" size={18} color="#888" />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Amount (PKR) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={newAmount}
              onChangeText={setNewAmount}
              keyboardType="numeric"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Optional description"
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              placeholderTextColor="#aaa"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={adding}>
              {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Add Expense</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Picker */}
      <Modal visible={showCatPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={styles.pickerItem}
                onPress={() => { setNewCategory(cat); setShowCatPicker(false); }}
              >
                <View style={[styles.catDot, { backgroundColor: catColor(cat) }]} />
                <Text style={styles.pickerItemText}>{cat}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCatPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  list: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, alignItems: 'stretch' },
  catDot: { width: 6, borderRadius: 3, marginRight: 12, alignSelf: 'stretch' },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  category: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  amount: { fontSize: 15, fontWeight: '800', color: '#E63946' },
  desc: { fontSize: 12, color: '#888', marginBottom: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  dateText: { fontSize: 12, color: '#aaa' },
  addedBy: { fontSize: 11, color: '#bbb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12, marginBottom: 16 },
  addEmptyBtn: { backgroundColor: '#E63946', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  addEmptyText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  pickerContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  catSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  catSelectorText: { fontSize: 14, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#333' },
  submitBtn: { backgroundColor: '#E63946', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerItemText: { fontSize: 14, color: '#333', marginLeft: 10 },
  cancelBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#E63946', fontWeight: '700', fontSize: 15 },
});

export default Expenses;
