// src/screens/CafeOperations/CafeProducts/index.tsx
//
// Cafe POS — the app's version of the web admin's /cafe page: category chips,
// a product grid, and a cart you can adjust and pay off.
//
// This screen previously called /v1/cafe/products/get, which does not exist
// (confirmed 404 live 2026-09-02). Its catch swallowed the error, so it had
// always rendered an empty list. Cafe products are really `packages` with
// category 10 — see api/cafe.ts for the full route set.
//
// Not implemented: the web's Staff / Management discount. It needs a staff
// picker, switches the checkout to a different payload (`discount_type:
// "Amount"`), and Management forces the payment method to Postpaid. Building
// a partial version would be worse than leaving it out, so the standard
// (undiscounted) sale is what's wired here.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Modal, ScrollView, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FastImage from '@d11/react-native-fast-image';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { useSnackbarStore } from '../../../redux/hooks/useSnackbar';
import { RootState } from '../../../redux/store';
import {
  getCafeCategories, getCafeProducts, getCafeCart, addToCafeCart,
  updateCafeCartQty, deleteCafeCartItem, getCafePaymentMethods, getCafeTax,
  getCafeWalkInClient, cafeCheckout,
  CafeCategory, CafeProduct, CafeCartRow,
} from '../../../api/cafe';

const fmtRs = (v: any) => `Rs ${Math.round(parseFloat(v ?? 0)).toLocaleString()}/-`;

// The web hides Cheque (32) and Salary Deduction (83) on this page, and
// Postpaid (82) only appears under a Management discount — which isn't
// implemented here. Leaves Cash / Credit Card / Deposit / Online.
const HIDDEN_PAYMENT_IDS = [32, 83, 82];

const imgUri = (v?: string | null) => {
  const s = (v ?? '').trim();
  return !s || s === 'N/A' ? null : s;
};

const CafeProducts = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const { showSnackbar } = useSnackbarStore();

  const [categories, setCategories] = useState<CafeCategory[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null); // null = All
  const [products, setProducts] = useState<CafeProduct[]>([]);
  const [cart, setCart] = useState<CafeCartRow[]>([]);
  const [methods, setMethods] = useState<{ id: number; name: string }[]>([]);
  const [walkInId, setWalkInId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [cartOpen, setCartOpen] = useState(false);
  const [methodId, setMethodId] = useState<number | null>(null);
  const [gst, setGst] = useState(0);
  const [paying, setPaying] = useState(false);

  const subtotal = useMemo(
    () => cart.reduce((sum, r) => sum + (Number(r.package_price) || 0) * (Number(r.quantity) || 0), 0),
    [cart],
  );
  const total = subtotal + gst;
  const gstPct = subtotal > 0 ? Math.floor((gst / subtotal) * 100) : 0;
  const itemCount = cart.reduce((n, r) => n + (Number(r.quantity) || 0), 0);

  const loadCart = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await getCafeCart(branchId);
      setCart(res.data?.data?.data ?? []);
    } catch {
      setCart([]);
    }
  }, [branchId]);

  const loadProducts = useCallback(async (catId: number | null) => {
    if (!branchId) return;
    try {
      const res = await getCafeProducts({
        branch_id: branchId,
        ...(catId ? { cafe_category_id: catId, limit: 9999 } : {}),
      });
      setProducts(res.data?.data?.data ?? []);
    } catch {
      setProducts([]);
    }
  }, [branchId]);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!branchId) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [cats, meth, walkIn] = await Promise.all([
        getCafeCategories({ branch_id: branchId }).catch(() => null),
        getCafePaymentMethods().catch(() => null),
        getCafeWalkInClient(branchId).catch(() => null),
      ]);
      setCategories(cats?.data?.data ?? []);
      setMethods((meth?.data?.data ?? []).filter((m: any) => !HIDDEN_PAYMENT_IDS.includes(m.id)));

      const wi = walkIn?.data?.data;
      const wiRow = Array.isArray(wi) ? wi[0] : wi?.data?.[0];
      setWalkInId(wiRow?.id ?? null);

      await Promise.all([loadProducts(activeCat), loadCart()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, activeCat, loadProducts, loadCart]);

  useEffect(() => { loadAll(); }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCategory = async (catId: number | null) => {
    setActiveCat(catId);
    setLoading(true);
    await loadProducts(catId);
    setLoading(false);
  };

  const addProduct = async (p: CafeProduct) => {
    if (!walkInId) { showSnackbar('No cafe customer record for this branch.'); return; }
    setBusyId(p.id);
    try {
      await addToCafeCart({
        branch_id: branchId,
        client_id: walkInId,
        package_id: p.id,
        price: Number(p.price) || 0,
        net_price: Number(p.price) || 0,
      });
      await loadCart();
      // Any change to the bill invalidates a previously calculated GST.
      setGst(0); setMethodId(null);
      showSnackbar(`${p.package_name} added`);
    } catch (e: any) {
      showSnackbar(e?.response?.data?.message || 'Could not add to cart.');
    } finally {
      setBusyId(null);
    }
  };

  const changeQty = async (row: CafeCartRow, next: number) => {
    if (next < 1) { removeRow(row); return; }
    setBusyId(row.id);
    try {
      await updateCafeCartQty(row.id, next, Number(row.package_price) || 0);
      await loadCart();
      setGst(0); setMethodId(null);
    } catch (e: any) {
      showSnackbar(e?.response?.data?.message || 'Could not update quantity.');
    } finally {
      setBusyId(null);
    }
  };

  const removeRow = async (row: CafeCartRow) => {
    setBusyId(row.id);
    try {
      await deleteCafeCartItem(row.id);
      await loadCart();
      setGst(0); setMethodId(null);
    } catch (e: any) {
      showSnackbar(e?.response?.data?.message || 'Could not remove item.');
    } finally {
      setBusyId(null);
    }
  };

  // GST is only known once a payment method is chosen — the rate depends on
  // it. This is why the web shows "GST 0%" until one is picked.
  const selectMethod = async (id: number) => {
    setMethodId(id);
    if (subtotal <= 0) { setGst(0); return; }
    try {
      const res = await getCafeTax(branchId, Math.round(subtotal), id);
      setGst(Number(res.data) || 0);
    } catch {
      setGst(0);
    }
  };

  const payBill = () => {
    if (!methodId) { showSnackbar('Choose a payment method.'); return; }
    if (!cart.length || !walkInId) return;
    Alert.alert(
      'Pay Bill',
      `Charge ${fmtRs(total)} to ${methods.find(m => m.id === methodId)?.name ?? 'this method'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          style: 'destructive',
          onPress: async () => {
            setPaying(true);
            try {
              await cafeCheckout({
                branch_id: branchId,
                client_id: walkInId,
                price: Math.round(subtotal),
                discount: 0,
                net_price: Math.round(total),
                payment_method_id: methodId,
                tax: gst,
              });
              showSnackbar('Order placed.');
              setCartOpen(false);
              setMethodId(null);
              setGst(0);
              await loadCart();
            } catch (e: any) {
              showSnackbar(e?.response?.data?.message || 'Checkout failed.');
            } finally {
              setPaying(false);
            }
          },
        },
      ],
    );
  };

  const visible = search.trim()
    ? products.filter(p => (p.package_name ?? '').toLowerCase().includes(search.trim().toLowerCase()))
    : products;

  const renderProduct = ({ item }: { item: CafeProduct }) => {
    const uri = imgUri(item.image);
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => addProduct(item)}
        disabled={busyId === item.id}
        activeOpacity={0.8}
      >
        <View style={s.thumbWrap}>
          {uri ? (
            <FastImage source={{ uri }} style={s.thumb} resizeMode={FastImage.resizeMode.cover} />
          ) : (
            <View style={[s.thumb, s.thumbEmpty]}>
              <Icon name="food-variant" size={22} color="#CBD5E1" />
            </View>
          )}
          <View style={s.addBadge}>
            {busyId === item.id
              ? <ActivityIndicator size="small" color="#fff" />
              : <Icon name="plus" size={14} color="#fff" />}
          </View>
        </View>
        <Text style={s.name} numberOfLines={2}>{item.package_name}</Text>
        <Text style={s.price}>{fmtRs(item.price)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <AppHeader
        title="Cafe Products"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={s.searchWrap}>
        <Icon name="magnify" size={18} color="#94A3B8" />
        <TextInput
          style={s.searchInput}
          placeholder="Search products"
          placeholderTextColor="#B0B0B0"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chipRow}>
        <TouchableOpacity
          style={[s.chip, activeCat === null && s.chipActive]}
          onPress={() => selectCategory(null)}
        >
          <Text style={[s.chipText, activeCat === null && s.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[s.chip, activeCat === c.id && s.chipActive]}
            onPress={() => selectCategory(c.id)}
          >
            <Text style={[s.chipText, activeCat === c.id && s.chipTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#E10600" style={s.loader} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={p => String(p.id)}
          renderItem={renderProduct}
          numColumns={3}
          columnWrapperStyle={s.gridRow}
          contentContainerStyle={s.grid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#E10600" />}
          ListEmptyComponent={<Text style={s.empty}>No products found</Text>}
        />
      )}

      {/* Cart bar */}
      {cart.length > 0 && (
        <TouchableOpacity style={s.cartBar} onPress={() => setCartOpen(true)} activeOpacity={0.9}>
          <View style={s.cartCount}><Text style={s.cartCountText}>{itemCount}</Text></View>
          <Text style={s.cartBarText}>View Cart</Text>
          <Text style={s.cartBarTotal}>{fmtRs(subtotal)}</Text>
        </TouchableOpacity>
      )}

      {/* Cart sheet */}
      <Modal visible={cartOpen} animationType="slide" transparent onRequestClose={() => setCartOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Cafe Cart</Text>
              <TouchableOpacity onPress={() => setCartOpen(false)}>
                <Icon name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.sheetBody}>
              {cart.map(row => {
                const uri = imgUri(row.image);
                return (
                  <View key={row.id} style={s.cartRow}>
                    {uri ? (
                      <FastImage source={{ uri }} style={s.cartThumb} resizeMode={FastImage.resizeMode.cover} />
                    ) : (
                      <View style={[s.cartThumb, s.thumbEmpty]}>
                        <Icon name="food-variant" size={16} color="#CBD5E1" />
                      </View>
                    )}
                    <View style={s.cartInfo}>
                      <Text style={s.cartName} numberOfLines={1}>{row.package_name}</Text>
                      <Text style={s.cartUnit}>{fmtRs(row.package_price)}</Text>
                      <View style={s.qtyRow}>
                        <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(row, row.quantity - 1)} disabled={busyId === row.id}>
                          <Icon name="minus" size={14} color="#475569" />
                        </TouchableOpacity>
                        <Text style={s.qtyVal}>{row.quantity}</Text>
                        <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(row, row.quantity + 1)} disabled={busyId === row.id}>
                          <Icon name="plus" size={14} color="#475569" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={s.cartRight}>
                      <TouchableOpacity onPress={() => removeRow(row)} disabled={busyId === row.id}>
                        <Icon name="close" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                      <Text style={s.cartLine}>{fmtRs((Number(row.package_price) || 0) * (Number(row.quantity) || 0))}</Text>
                    </View>
                  </View>
                );
              })}

              <View style={s.totals}>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Subtotal</Text>
                  <Text style={s.totalVal}>{fmtRs(subtotal)}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>GST {gstPct}%</Text>
                  <Text style={s.totalVal}>{fmtRs(gst)}</Text>
                </View>
                <View style={[s.totalRow, s.grandRow]}>
                  <Text style={s.grandLabel}>Total</Text>
                  <Text style={s.grandVal}>{fmtRs(total)}</Text>
                </View>
              </View>

              <Text style={s.sectionLabel}>Payment Method</Text>
              <View style={s.methodRow}>
                {methods.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.method, methodId === m.id && s.methodActive]}
                    onPress={() => selectMethod(m.id)}
                  >
                    <Text style={[s.methodText, methodId === m.id && s.methodTextActive]}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.payBtn, (!methodId || paying) && s.payBtnDisabled]}
                onPress={payBill}
                disabled={!methodId || paying}
              >
                {paying
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.payText}>Pay Bill</Text>}
              </TouchableOpacity>

              <View style={s.sheetPad} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F8' },
  loader: { marginTop: 40 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', margin: 12, marginBottom: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 42, color: '#1A1A1A', fontSize: 14 },

  chipScroll: { maxHeight: 46, marginBottom: 4 },
  chipRow: { paddingHorizontal: 12, gap: 6, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#fff', marginRight: 6,
  },
  chipActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  chipText: { fontSize: 12, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  grid: { padding: 10, paddingBottom: 90 },
  gridRow: { gap: 8, marginBottom: 8 },
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: '#EEF2F6',
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: '100%', height: 68, borderRadius: 6, backgroundColor: '#F1F5F9' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  addBadge: {
    position: 'absolute', right: 4, bottom: 4,
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#E10600',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 11, color: '#334155', marginTop: 6, minHeight: 28 },
  price: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 13 },

  cartBar: {
    position: 'absolute', left: 12, right: 12, bottom: 14,
    backgroundColor: '#E10600', borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  cartCount: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  cartCountText: { color: '#E10600', fontWeight: '700', fontSize: 12 },
  cartBarText: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 },
  cartBarTotal: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '88%' },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  sheetBody: { paddingHorizontal: 16 },
  sheetPad: { height: 24 },

  cartRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  cartThumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#F1F5F9' },
  cartInfo: { flex: 1 },
  cartName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  cartUnit: { fontSize: 11, color: '#64748B', marginTop: 1 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  qtyBtn: {
    width: 24, height: 24, borderRadius: 5, borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyVal: { fontSize: 13, fontWeight: '600', color: '#1E293B', minWidth: 16, textAlign: 'center' },
  cartRight: { alignItems: 'flex-end', gap: 12 },
  cartLine: { fontSize: 13, fontWeight: '700', color: '#E10600' },

  totals: { paddingVertical: 14, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13, color: '#64748B' },
  totalVal: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  grandRow: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 2 },
  grandLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  grandVal: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 6, marginBottom: 8 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  method: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1, borderColor: '#F3C7C7', backgroundColor: '#FDECEC',
  },
  methodActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  methodText: { fontSize: 12, color: '#C62828', fontWeight: '600' },
  methodTextActive: { color: '#fff' },

  payBtn: {
    backgroundColor: '#E10600', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  payBtnDisabled: { opacity: 0.5 },
  payText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default CafeProducts;
