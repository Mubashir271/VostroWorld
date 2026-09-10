// src/screens/Sales/PackageSell/index.tsx
//
// "Package Sell" — step 2 of the web admin's sell/renew flow. `SellPackage`
// finds the client; this screen configures the package and adds it to that
// client's cart.
//
// Field list and data sources mirror the web admin's /package-sell form,
// confirmed from a HAR of that page (2026-09-10) and re-verified live on dev:
//
//   Select Service    GET /v1/cart/list-package-categories/{client_id}
//                     (client id is a PATH segment; result is per-client, so a
//                      client who already holds a membership is not offered
//                      Registration again)
//   Membership Type   GET /v1/packages/names-list?branch_id&category&status=1
//   Price / dates     GET /v1/packages/fetch-package-info?id&startDate&quantity
//                     (⚠️ the param is `id` — `package_id` silently returns 0)
//   Add Package       POST /v1/cart/add
//
// Styling follows this app's own screens, not the web admin's.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';
import {
  getClientServiceOptions,
  getPackageNamesForCategory,
  getPackageInfo,
  addPackageToCart,
} from '../../../api/employeeDashboard';

interface Option { id: string; label: string; }

const SALE_TYPES: Option[] = [
  { id: 'New', label: 'New' },
  { id: 'Renew', label: 'Renew' },
];
const DISCOUNT_TYPES: Option[] = [
  { id: 'Amount', label: 'Amount' },
  { id: 'Percentage', label: 'Percentage' },
];

const fmtApi = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDisplay = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const money = (n: number) => `Rs ${(Number(n) || 0).toLocaleString()}`;

/** Reusable dropdown field styled like the rest of the app. */
const PickerField = ({ label, required, value, placeholder, onPress, disabled }: {
  label: string; required?: boolean; value: string;
  placeholder: string; onPress: () => void; disabled?: boolean;
}) => (
  <View style={s.field}>
    <Text style={s.label}>{label}{required ? ' *' : ''}</Text>
    <TouchableOpacity
      style={[s.picker, disabled && s.pickerDisabled]}
      onPress={() => !disabled && onPress()}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={value ? s.pickerText : s.placeholder} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Icon name="chevron-down" size={16} color="#94a3b8" />
    </TouchableOpacity>
  </View>
);

const PackageSell = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const profile = useSelector((st: RootState) => st.user.profile);
  const branchId = profile?.branchId;

  const client = route.params?.client ?? {};
  const clientId: number = client.id;
  const clientName: string =
    client.name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || '—';

  const [saleType, setSaleType] = useState('New');
  const [service, setService] = useState<Option | null>(null);
  const [services, setServices] = useState<Option[]>([]);
  const [pkg, setPkg] = useState<Option | null>(null);
  const [packages, setPackages] = useState<Option[]>([]);

  const [price, setPrice] = useState('0');
  const [discountType, setDiscountType] = useState('Amount');
  const [discount, setDiscount] = useState('0');
  const [approvedBy, setApprovedBy] = useState('');
  const [referencedBy, setReferencedBy] = useState('');
  const [salesNotes, setSalesNotes] = useState('');
  const [saleDate, setSaleDate] = useState(fmtApi(new Date()));
  const [dates, setDates] = useState<{ start?: string; end?: string }>({});

  const [openPicker, setOpenPicker] = useState<null | 'saleType' | 'service' | 'package' | 'discountType'>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Services this particular client is eligible for.
  useEffect(() => {
    if (!clientId) return;
    getClientServiceOptions(clientId)
      .then(res => {
        // Shape is { "<tag>": "<category code>" } — not a list.
        const raw = res?.data ?? res ?? {};
        const list: Option[] = Object.entries(raw)
          .filter(([, code]) => code != null && typeof code !== 'object')
          .map(([tag, code]) => ({
            id: String(code),
            label: tag.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
          }));
        setServices(list);
      })
      .catch(() => setServices([]));
  }, [clientId]);

  // Packages inside the chosen service.
  useEffect(() => {
    if (!service || branchId == null) { setPackages([]); return; }
    setLoadingPkgs(true);
    setPkg(null);
    setPrice('0');
    getPackageNamesForCategory({ branch_id: branchId, category: service.id, status: 1 })
      .then(res => {
        const list = res?.data ?? [];
        setPackages(
          (Array.isArray(list) ? list : []).map((p: any) => ({ id: String(p.id), label: p.name })),
        );
      })
      .catch(() => setPackages([]))
      .finally(() => setLoadingPkgs(false));
  }, [service, branchId]);

  // Price + start/end dates for the chosen package.
  const loadPackageInfo = useCallback(async (option: Option) => {
    try {
      const res = await getPackageInfo({ id: option.id, startDate: saleDate, quantity: 1 });
      const info = res?.data ?? res ?? {};
      if (info.price != null) setPrice(String(info.price));
      setDates({ start: info.startDate, end: info.endDate });
    } catch {
      setDates({});
    }
  }, [saleDate]);

  const payAfterDiscount = useMemo(() => {
    const p = parseFloat(price) || 0;
    const d = parseFloat(discount) || 0;
    const off = discountType === 'Percentage' ? (p * d) / 100 : d;
    return Math.max(0, p - off);
  }, [price, discount, discountType]);

  const pickerOptions: Option[] =
    openPicker === 'saleType' ? SALE_TYPES
      : openPicker === 'service' ? services
        : openPicker === 'package' ? packages
          : openPicker === 'discountType' ? DISCOUNT_TYPES
            : [];

  const onPick = (opt: Option) => {
    if (openPicker === 'saleType') setSaleType(opt.id);
    if (openPicker === 'service') setService(opt);
    if (openPicker === 'package') { setPkg(opt); loadPackageInfo(opt); }
    if (openPicker === 'discountType') setDiscountType(opt.id);
    setOpenPicker(null);
  };

  const handleAdd = async () => {
    if (branchId == null) { setError('No branch on your profile.'); return; }
    if (!clientId) { setError('No client selected.'); return; }
    if (!service) { setError('Select Service is required.'); return; }
    if (!pkg) { setError('Membership Type is required.'); return; }
    const p = parseFloat(price);
    if (isNaN(p)) { setError('Package Full Price is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await addPackageToCart({
        branch_id: branchId,
        client_id: clientId,
        package_id: Number(pkg.id),
        category: service.id,
        sale_type: saleType,
        price: p,
        discount: parseFloat(discount) || 0,
        discount_type: discountType as 'Amount' | 'Percentage',
        net_price: payAfterDiscount,
        sale_date: saleDate,
        quantity: 1,
        start_date: dates.start,
        end_date: dates.end,
        approved_by: approvedBy.trim() || undefined,
        referenced_by: referencedBy.trim() || undefined,
        sales_notes: salesNotes.trim() || undefined,
      });
      dispatch(showSnackbar({ message: 'Package added to cart', type: 'success' }));
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(
        typeof msg === 'string' ? msg
          : msg ? Object.values(msg).flat().join('\n')
            : 'Could not add the package. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <AppHeader
        title="Package Sell"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.cardTitle}>Package Sell</Text>
        <Text style={s.hint}>Fields marked * are required.</Text>

        {/* Client — fixed, chosen on the previous screen */}
        <View style={s.field}>
          <Text style={s.label}>Client</Text>
          <View style={s.readonly}>
            <Icon name="account-circle-outline" size={18} color="#94a3b8" />
            <Text style={s.readonlyText} numberOfLines={1}>{clientName}</Text>
          </View>
        </View>

        <PickerField
          label="Sale Type" required value={saleType}
          placeholder="Select Sale Type" onPress={() => setOpenPicker('saleType')}
        />
        <PickerField
          label="Select Service" required value={service?.label ?? ''}
          placeholder={services.length ? 'Select Service' : 'No services available'}
          onPress={() => setOpenPicker('service')} disabled={!services.length}
        />
        <PickerField
          label="Membership Type" required
          value={pkg?.label ?? ''}
          placeholder={
            !service ? 'Select a service first'
              : loadingPkgs ? 'Loading…'
                : packages.length ? 'Select Membership Type' : 'No packages found'
          }
          onPress={() => setOpenPicker('package')}
          disabled={!service || loadingPkgs || !packages.length}
        />

        <View style={s.field}>
          <Text style={s.label}>Package Full Price (Editable) *</Text>
          <TextInput
            style={s.input} value={price} onChangeText={setPrice}
            keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8"
          />
        </View>

        <PickerField
          label="Discount Type" required value={discountType}
          placeholder="Select Discount Type" onPress={() => setOpenPicker('discountType')}
        />

        <View style={s.field}>
          <Text style={s.label}>Discount *</Text>
          <TextInput
            style={s.input} value={discount} onChangeText={setDiscount}
            keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Pay After Discount</Text>
          <View style={s.readonly}>
            <Text style={s.totalText}>{money(payAfterDiscount)}</Text>
          </View>
        </View>

        {(dates.start || dates.end) && (
          <Text style={s.datesNote}>
            Package runs {fmtDisplay(dates.start ?? '')} → {fmtDisplay(dates.end ?? '')}
          </Text>
        )}

        <View style={s.field}>
          <Text style={s.label}>Approve By</Text>
          <TextInput
            style={s.input} value={approvedBy} onChangeText={setApprovedBy}
            placeholder="Optional" placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Referenced By</Text>
          <TextInput
            style={s.input} value={referencedBy} onChangeText={setReferencedBy}
            placeholder="Optional" placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Sales Notes</Text>
          <TextInput
            style={[s.input, s.multiline]} value={salesNotes} onChangeText={setSalesNotes}
            placeholder="Optional" placeholderTextColor="#94a3b8" multiline
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Sale Date</Text>
          <TouchableOpacity style={s.picker} onPress={() => setDatePickerOpen(true)}>
            <Text style={s.pickerText}>{fmtDisplay(saleDate)}</Text>
            <Icon name="calendar" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {!!error && <Text style={s.errText}>{error}</Text>}

        <TouchableOpacity
          style={[s.addBtn, saving && s.addBtnDisabled]}
          onPress={handleAdd}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.addBtnText}>Add Package</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Shared option picker */}
      <Modal visible={openPicker !== null} transparent animationType="fade" onRequestClose={() => setOpenPicker(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpenPicker(null)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>
              {openPicker === 'saleType' ? 'Select Sale Type'
                : openPicker === 'service' ? 'Select Service'
                  : openPicker === 'package' ? 'Select Membership Type'
                    : 'Select Discount Type'}
            </Text>
            <ScrollView style={s.sheetScroll}>
              {pickerOptions.map(opt => (
                <TouchableOpacity key={opt.id} style={s.sheetRow} onPress={() => onPick(opt)}>
                  <Text style={s.sheetRowText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
              {pickerOptions.length === 0 && (
                <Text style={s.sheetEmpty}>Nothing to choose from.</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <DateTimePickerModal
        isVisible={datePickerOpen}
        mode="date"
        date={new Date(saleDate)}
        onConfirm={d => { setSaleDate(fmtApi(d)); setDatePickerOpen(false); }}
        onCancel={() => setDatePickerOpen(false)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F8' },
  scroll: { flex: 1 },
  body: { padding: 16, paddingBottom: 32 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  hint: { fontSize: 11, color: '#94a3b8', marginBottom: 14 },

  field: { marginBottom: 12 },
  label: { fontSize: 12, color: '#64748b', marginBottom: 6 },

  input: {
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12, height: 46, color: '#1A1A1A', fontSize: 14,
  },
  multiline: { height: 80, textAlignVertical: 'top', paddingTop: 12 },

  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12, height: 46,
  },
  pickerDisabled: { backgroundColor: '#F1F3F5' },
  pickerText: { fontSize: 14, color: '#1A1A1A', flex: 1 },
  placeholder: { fontSize: 14, color: '#94a3b8', flex: 1 },

  readonly: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F1F3F5', borderRadius: 8, borderWidth: 1, borderColor: '#E8E8E8',
    paddingHorizontal: 12, height: 46,
  },
  readonlyText: { fontSize: 14, color: '#1A1A1A', flex: 1 },
  totalText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  datesNote: { fontSize: 11, color: '#64748b', marginTop: -4, marginBottom: 12 },

  errText: { color: '#C62828', fontSize: 12, marginBottom: 10 },

  addBtn: {
    backgroundColor: '#C62828', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', maxHeight: '70%' },
  sheetTitle: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A', padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEE',
  },
  sheetScroll: { paddingVertical: 4 },
  sheetRow: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F3F5',
  },
  sheetRowText: { fontSize: 14, color: '#1A1A1A' },
  sheetEmpty: { padding: 14, fontSize: 13, color: '#94a3b8' },
});

export default PackageSell;
