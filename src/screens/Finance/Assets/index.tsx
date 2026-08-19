import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import BranchField from '../../../components/BranchField';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../../hooks/useBranchSelector';
import {
  getAssets, addAsset,
  getExpenseCategories, getExpenseSubCategories,
} from '../../../api/employeeDashboard';

// NOT CONFIRMED — no HAR captured for Assets. Endpoints are inferred from
// codebase pattern. Submit is gated until confirmation.
const ADD_ENABLED = false;

const R = '#C62828';
const PAGE_SIZE = 25;

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const today = () => fmt(new Date());
const fmtRs = (val: any) => `Rs ${(parseFloat(val ?? 0) || 0).toLocaleString()}/-`;

interface Category { id: number; name: string; }
interface AssetRow {
  id: number;
  name: string;
  category_name: string;
  sub_category_name: string;
  purchase_cost: number | string;
  quantity: number | string;
  total_cost: number | string;
  current_value: number | string;
  acquisition_date: string;
  vendor_name: string;
}

const Assets = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchId, branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  // ── form state
  const [name, setName] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [quantity, setQuantity] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState(today());
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const [category, setCategory] = useState<Category | null>(null);
  const [subCategory, setSubCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);

  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubCatModal, setShowSubCatModal] = useState(false);
  const [showAcqDatePicker, setShowAcqDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── list state
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const loadDropdowns = useCallback(async () => {
    try {
      const [cats, subs] = await Promise.all([
        getExpenseCategories(),
        getExpenseSubCategories(),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSubCategories(Array.isArray(subs) ? subs : []);
    } catch {}
  }, []);

  const loadAssets = useCallback(async (targetPage = 1) => {
    setListLoading(true);
    setListError('');
    try {
      const res = await getAssets({
        branch_id: listBranchId,
        start_date: startDate,
        end_date: endDate,
        page: targetPage,
        limit: PAGE_SIZE,
      });
      setAssets(Array.isArray(res?.data) ? res.data : []);
      setTotalPages(Math.max(1, res?.pagination?.total_pages ?? 1));
      setPage(targetPage);
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 404 || s === 422) { setAssets([]); setTotalPages(1); }
      else setListError(e?.response?.data?.message ?? 'Failed to load assets.');
    } finally {
      setListLoading(false);
    }
  }, [listBranchId, startDate, endDate]);

  useFocusEffect(useCallback(() => {
    loadDropdowns();
    loadAssets(1);
  }, [loadDropdowns, loadAssets]));

  const totalCost = purchaseCost && quantity
    ? (parseFloat(purchaseCost) * parseFloat(quantity)).toFixed(2)
    : '';

  const handleSubmit = async () => {
    if (!ADD_ENABLED) {
      Alert.alert(
        'Not Yet Confirmed',
        'The Assets API endpoint has not been confirmed. Submit is disabled until the endpoint is verified.',
      );
      return;
    }
    if (branchId == null) { setError('Please select a branch.'); return; }
    if (!name.trim()) { setError('Asset Name is required.'); return; }
    if (!purchaseCost || isNaN(parseFloat(purchaseCost))) { setError('Purchase Cost is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await addAsset({
        branch_id: branchId,
        category_id: category?.id,
        sub_category_id: subCategory?.id,
        name: name.trim(),
        purchase_cost: parseFloat(purchaseCost),
        quantity: quantity ? parseInt(quantity, 10) : undefined,
        total_cost: totalCost ? parseFloat(totalCost) : undefined,
        current_value: currentValue ? parseFloat(currentValue) : undefined,
        acquisition_date: acquisitionDate,
        vendor_name: vendorName.trim() || undefined,
        vendor_contact: vendorContact.trim() || undefined,
        description: formDescription.trim() || undefined,
      });
      flash('Asset added successfully.');
      setName(''); setPurchaseCost(''); setQuantity(''); setCurrentValue('');
      setAcquisitionDate(today()); setVendorName(''); setVendorContact('');
      setFormDescription(''); setCategory(null); setSubCategory(null);
      loadAssets(1);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to add asset. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Assets Management"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Add Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Asset</Text>

          <BranchField
            label="Branch Name"
            needsPicker={needsPicker}
            branchName={branchName}
            options={branchOptions}
            loadingOptions={loadingBranches}
            onSelect={selectBranch}
            labelStyle={styles.label}
            staticStyle={styles.staticInput}
            staticTextStyle={styles.staticText}
            pickerStyle={styles.picker}
            pickerTextStyle={styles.pickerText}
            placeholderStyle={styles.placeholder}
          />

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowCatModal(true)}>
                <Text style={category ? styles.pickerText : styles.placeholder}>
                  {category?.name ?? 'Select Category'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Sub-Category</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowSubCatModal(true)}>
                <Text style={subCategory ? styles.pickerText : styles.placeholder}>
                  {subCategory?.name ?? 'Select Sub-Category'}
                </Text>
                <Icon name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Asset Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter asset name"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Purchase Cost *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#aaa"
                value={purchaseCost}
                onChangeText={setPurchaseCost}
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#aaa"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Total Cost *</Text>
              <View style={styles.staticInput}>
                <Text style={styles.staticText}>{totalCost ? fmtRs(totalCost) : 'Auto'}</Text>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Current Value *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#aaa"
                value={currentValue}
                onChangeText={setCurrentValue}
              />
            </View>
          </View>

          <Text style={styles.label}>Acquisition Date *</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowAcqDatePicker(true)}>
            <Text style={styles.dateText}>{display(acquisitionDate)}</Text>
            <Icon name="calendar" size={15} color="#666" />
          </TouchableOpacity>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Vendor Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Vendor name"
                placeholderTextColor="#aaa"
                value={vendorName}
                onChangeText={setVendorName}
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Vendor Contact</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="Vendor contact"
                placeholderTextColor="#aaa"
                value={vendorContact}
                onChangeText={setVendorContact}
              />
            </View>
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholder="Enter description"
            placeholderTextColor="#aaa"
            value={formDescription}
            onChangeText={setFormDescription}
          />

          {!!error && <Text style={styles.errText}>{error}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          {!ADD_ENABLED && (
            <Text style={styles.hintText}>
              Note: Submit is disabled — Assets API endpoint not yet confirmed from HAR.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitBtnText}>Add Asset</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Assets List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assets List</Text>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('start')}>
                <Text style={styles.dateText}>{display(startDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => setPickerFor('end')}>
                <Text style={styles.dateText}>{display(endDate)}</Text>
                <Icon name="calendar" size={15} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.searchBtn} onPress={() => loadAssets(1)}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>

          {!!listError && <Text style={styles.errText}>{listError}</Text>}

          {listLoading
            ? <ActivityIndicator color={R} style={{ marginVertical: 20 }} />
            : assets.length === 0
              ? <Text style={styles.emptyText}>No assets found.</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    <View style={styles.thead}>
                      <Text style={[styles.th, styles.colSr]}>Sr#</Text>
                      <Text style={[styles.th, styles.colName]}>Asset Name</Text>
                      <Text style={[styles.th, styles.colCat]}>Category</Text>
                      <Text style={[styles.th, styles.colCat]}>Sub-Category</Text>
                      <Text style={[styles.th, styles.colAmt]}>Purchase Cost</Text>
                      <Text style={[styles.th, styles.colSr]}>Qty</Text>
                      <Text style={[styles.th, styles.colAmt]}>Total Cost</Text>
                      <Text style={[styles.th, styles.colAmt]}>Current Value</Text>
                      <Text style={[styles.th, styles.colDate]}>Acq. Date</Text>
                      <Text style={[styles.th, styles.colName]}>Vendor</Text>
                    </View>
                    {assets.map((a, i) => (
                      <View key={a.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <Text style={[styles.td, styles.colSr]}>{(page - 1) * PAGE_SIZE + i + 1}</Text>
                        <Text style={[styles.td, styles.colName]}>{a.name}</Text>
                        <Text style={[styles.td, styles.colCat]}>{a.category_name || '—'}</Text>
                        <Text style={[styles.td, styles.colCat]}>{a.sub_category_name || '—'}</Text>
                        <Text style={[styles.td, styles.colAmt]}>{fmtRs(a.purchase_cost)}</Text>
                        <Text style={[styles.td, styles.colSr]}>{a.quantity ?? '—'}</Text>
                        <Text style={[styles.td, styles.colAmt]}>{fmtRs(a.total_cost)}</Text>
                        <Text style={[styles.td, styles.colAmt]}>{fmtRs(a.current_value)}</Text>
                        <Text style={[styles.td, styles.colDate]}>{a.acquisition_date ? display(a.acquisition_date.slice(0, 10)) : '—'}</Text>
                        <Text style={[styles.td, styles.colName]}>{a.vendor_name || '—'}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )
          }
        </View>

        {!listLoading && totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={page === 1} onPress={() => loadAssets(1)}>
              <Text style={[styles.pageEdge, page === 1 && styles.pageDisabled]}>First Page</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={page === 1} onPress={() => loadAssets(Math.max(1, page - 1))}>
              <Text style={[styles.pageArrow, page === 1 && styles.pageDisabled]}>‹</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumScroll}>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
                <TouchableOpacity key={n} onPress={() => loadAssets(n)} style={[styles.pageNum, page === n && styles.pageNumActive]}>
                  <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity disabled={page === totalPages} onPress={() => loadAssets(Math.min(totalPages, page + 1))}>
              <Text style={[styles.pageArrow, page === totalPages && styles.pageDisabled]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={page === totalPages} onPress={() => loadAssets(totalPages)}>
              <Text style={[styles.pageEdge, page === totalPages && styles.pageDisabled]}>Last Page</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={showAcqDatePicker}
        mode="date"
        date={new Date(acquisitionDate + 'T00:00:00')}
        onConfirm={d => { setAcquisitionDate(fmt(d)); setShowAcqDatePicker(false); }}
        onCancel={() => setShowAcqDatePicker(false)}
      />

      <DateTimePickerModal
        isVisible={!!pickerFor}
        mode="date"
        date={new Date((pickerFor === 'start' ? startDate : endDate) + 'T00:00:00')}
        onConfirm={d => {
          if (pickerFor === 'start') setStartDate(fmt(d));
          else setEndDate(fmt(d));
          setPickerFor(null);
        }}
        onCancel={() => setPickerFor(null)}
      />

      <Modal visible={showCatModal} transparent animationType="fade" onRequestClose={() => setShowCatModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCatModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Category</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setCategory(null); setSubCategory(null); setShowCatModal(false); }}>
                <Text style={styles.dropdownItemText}>All Categories</Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => { setCategory(c); setSubCategory(null); setShowCatModal(false); }}>
                  <Text style={styles.dropdownItemText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showSubCatModal} transparent animationType="fade" onRequestClose={() => setShowSubCatModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowSubCatModal(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Sub-Category</Text>
            <ScrollView>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSubCategory(null); setShowSubCatModal(false); }}>
                <Text style={styles.dropdownItemText}>All Sub-Categories</Text>
              </TouchableOpacity>
              {subCategories.map(c => (
                <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => { setSubCategory(c); setShowSubCatModal(false); }}>
                  <Text style={styles.dropdownItemText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default Assets;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 8 },
  staticInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F0F0F0',
  },
  staticText: { fontSize: 13, color: '#444' },
  row2: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  col2: { flex: 1 },
  picker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 13, color: '#222', flex: 1 },
  placeholder: { fontSize: 13, color: '#aaa', flex: 1 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, fontSize: 13, color: '#222',
    backgroundColor: '#FAFAFA',
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  datePicker: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#FAFAFA',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 13, color: '#222' },
  errText: { color: R, fontSize: 13, marginTop: 8, fontWeight: '500' },
  successText: { color: '#388E3C', fontSize: 13, marginTop: 8, fontWeight: '500' },
  hintText: { color: '#E65100', fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  submitBtn: {
    backgroundColor: R, borderRadius: 6, alignItems: 'center',
    paddingVertical: 13, marginTop: 14,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchBtn: {
    backgroundColor: '#222', borderRadius: 6, alignItems: 'center',
    paddingVertical: 10, marginTop: 10, marginBottom: 12,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 16, fontSize: 13 },
  thead: { flexDirection: 'row', backgroundColor: R, paddingVertical: 8 },
  th: { color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 6, textAlign: 'center' },
  colSr: { width: 36 },
  colName: { width: 130 },
  colCat: { width: 110 },
  colAmt: { width: 110 },
  colDate: { width: 90 },
  tr: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { fontSize: 11, color: '#333', paddingHorizontal: 6, textAlign: 'center', alignSelf: 'center' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  pageEdge: { fontSize: 12, fontWeight: '700', color: R },
  pageArrow: { fontSize: 16, fontWeight: '700', color: R, paddingHorizontal: 4 },
  pageDisabled: { color: '#BBB' },
  pageNumScroll: { flexGrow: 0, maxWidth: 220 },
  pageNum: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#EFEFEF', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  pageNumActive: { backgroundColor: R, borderColor: R },
  pageNumText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pageNumTextActive: { color: '#FFF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '80%', maxHeight: 400 },
  dropdownTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#222' },
  dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
});
