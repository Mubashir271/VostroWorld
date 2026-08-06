import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { RootState } from '../../../redux/store';
import {
  getMealPlanIntakeForm, saveMealPlanIntakeForm, getNutritionGallery,
  uploadNutritionGalleryImage, MealPlanIntakeFormData, MealOption,
} from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

type MealPrefix = 'pre_breakfast' | 'breakfast' | 'lunch' | 'dinner';

const MEAL_SECTIONS: { prefix: MealPrefix; page: number; title: string }[] = [
  { prefix: 'pre_breakfast', page: 2, title: 'Pre breakfast' },
  { prefix: 'breakfast', page: 3, title: 'Breakfast' },
  { prefix: 'lunch', page: 4, title: 'Lunch' },
  { prefix: 'dinner', page: 5, title: 'Dinner' },
];

const PAGES = [
  { page: 1, label: "Client & Do's/Don'ts" },
  { page: 2, label: 'Pre breakfast' },
  { page: 3, label: 'Breakfast' },
  { page: 4, label: 'Lunch' },
  { page: 5, label: 'Dinner' },
  { page: 6, label: 'Closing notes' },
];

const emptyForm = (): MealPlanIntakeFormData => ({
  name: '', age_gender: '', height: '', weight: '', bmi: '', body_fat_pct: '',
  lifestyle: '', assessment_date: '', medical_history: '', food_allergy: '',
  goals: '', recommendations: '', carbs_grams: '', proteins_grams: '',
  fats_grams: '', calories_required: '', dos_list: [], donts_list: [],
  closing_notes: '',
  pre_breakfast_label: 'Pre Breakfast', pre_breakfast_time: '', pre_breakfast_options: [],
  breakfast_label: 'Breakfast', breakfast_time: '', breakfast_options: [],
  lunch_label: 'Lunch/Snack', lunch_time: '', lunch_options: [],
  dinner_label: 'Dinner', dinner_time: '', dinner_options: [],
});

type GalleryImage = { id: number; image_url: string; title: string };

const MealPlanDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { uuid, clientName: routeClientName } = route.params ?? {};
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<MealPlanIntakeFormData>(emptyForm());

  // Gallery-picker modal
  const [galleryFor, setGalleryFor] = useState<{ prefix: MealPrefix; index: number } | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMealPlanIntakeForm({ uuid });
      const body = res?.data;
      const fd = body?.data?.form_data;
      if (fd) setForm({ ...emptyForm(), ...fd });
    } catch {
      // No intake form saved yet for this plan — start from a blank one.
    } finally {
      setLoading(false);
      setDirty(false);
    }
  }, [uuid]);

  useEffect(() => { load(); }, [load]);

  const updateField = <K extends keyof MealPlanIntakeFormData>(key: K, value: MealPlanIntakeFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // ── Do's / Don'ts ────────────────────────────────────────────────────────
  const updateListItem = (key: 'dos_list' | 'donts_list', index: number, value: string) => {
    setForm(prev => {
      const list = [...prev[key]];
      list[index] = value;
      return { ...prev, [key]: list };
    });
    setDirty(true);
  };
  const addListItem = (key: 'dos_list' | 'donts_list') => {
    setForm(prev => ({ ...prev, [key]: [...prev[key], ''] }));
    setDirty(true);
  };
  const removeListItem = (key: 'dos_list' | 'donts_list', index: number) => {
    setForm(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
    setDirty(true);
  };

  // ── Meal sections (Pre breakfast / Breakfast / Lunch / Dinner) ──────────
  const getOptions = (prefix: MealPrefix): MealOption[] => (form as any)[`${prefix}_options`] ?? [];

  const setOptions = (prefix: MealPrefix, options: MealOption[]) => {
    setForm(prev => ({ ...prev, [`${prefix}_options`]: options }));
    setDirty(true);
  };

  const updateOptionText = (prefix: MealPrefix, index: number, text: string) => {
    const options = [...getOptions(prefix)];
    options[index] = { ...options[index], text };
    setOptions(prefix, options);
  };

  const addOption = (prefix: MealPrefix) => {
    setOptions(prefix, [...getOptions(prefix), { text: '', imageUrl: null }]);
  };

  const removeOption = (prefix: MealPrefix, index: number) => {
    setOptions(prefix, getOptions(prefix).filter((_, i) => i !== index));
  };

  const removePhoto = (prefix: MealPrefix, index: number) => {
    const options = [...getOptions(prefix)];
    options[index] = { ...options[index], imageUrl: null };
    setOptions(prefix, options);
  };

  const setOptionPhoto = (prefix: MealPrefix, index: number, url: string) => {
    const options = [...getOptions(prefix)];
    options[index] = { ...options[index], imageUrl: url };
    setOptions(prefix, options);
  };

  const uploadFromDevice = async (prefix: MealPrefix, index: number) => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;

      const key = `${prefix}-${index}`;
      setUploadingIndex(key);
      const fileName = asset.fileName || `meal_${Date.now()}.jpg`;
      const res = await uploadNutritionGalleryImage({
        branch_id: branchId,
        title: fileName.replace(/\.[^./]+$/, ''),
        image: { uri: asset.uri, name: fileName, type: asset.type || 'image/jpeg' },
      });
      const url = res?.data?.data?.image_url ?? res?.data?.image_url;
      if (url) setOptionPhoto(prefix, index, url);
      else Alert.alert('Error', 'Upload succeeded but no image URL was returned.');
    } catch {
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const openGalleryPicker = async (prefix: MealPrefix, index: number) => {
    setGalleryFor({ prefix, index });
    setGalleryLoading(true);
    try {
      const res = await getNutritionGallery({ branch_id: branchId, limit: 200 });
      const data = res?.data?.data ?? [];
      setGalleryImages(Array.isArray(data) ? data : []);
    } catch {
      setGalleryImages([]);
    } finally {
      setGalleryLoading(false);
    }
  };

  const pickFromGallery = (img: GalleryImage) => {
    if (galleryFor) setOptionPhoto(galleryFor.prefix, galleryFor.index, img.image_url);
    setGalleryFor(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMealPlanIntakeForm({ plan_uuid: uuid, form_data: form });
      setDirty(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to save diet plan.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────
  const renderTextField = (label: string, value: string, onChange: (v: string) => void, multiline = false) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor="#aaa"
      />
    </View>
  );

  const renderPage1 = () => (
    <View>
      <View style={styles.card}>
        {renderTextField('Name', form.name, v => updateField('name', v))}
        {renderTextField('Age/Gender', form.age_gender, v => updateField('age_gender', v))}
        {renderTextField('Height', form.height, v => updateField('height', v))}
        {renderTextField('Weight', form.weight, v => updateField('weight', v))}
        {renderTextField('BMI', form.bmi, v => updateField('bmi', v))}
        {renderTextField('Total Body Fat %', form.body_fat_pct, v => updateField('body_fat_pct', v))}
        {renderTextField('Lifestyle', form.lifestyle, v => updateField('lifestyle', v))}
        {renderTextField('Date (first assessment)', form.assessment_date, v => updateField('assessment_date', v))}
        {renderTextField('Medical History', form.medical_history, v => updateField('medical_history', v), true)}
        {renderTextField('Food Allergy', form.food_allergy, v => updateField('food_allergy', v), true)}
        {renderTextField('Goals', form.goals, v => updateField('goals', v), true)}
        {renderTextField('Recommendations', form.recommendations, v => updateField('recommendations', v), true)}
        {renderTextField('Carbohydrates (grams)', form.carbs_grams, v => updateField('carbs_grams', v))}
        {renderTextField('Proteins (grams)', form.proteins_grams, v => updateField('proteins_grams', v))}
        {renderTextField('Lipids / Fats (grams)', form.fats_grams, v => updateField('fats_grams', v))}
        {renderTextField('Calories required', form.calories_required, v => updateField('calories_required', v))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Do's</Text>
        {form.dos_list.map((item, i) => (
          <View key={i} style={styles.listRow}>
            <TextInput
              style={[styles.input, styles.listInput]}
              value={item}
              onChangeText={v => updateListItem('dos_list', i, v)}
              multiline
            />
            <TouchableOpacity style={styles.listRemoveBtn} onPress={() => removeListItem('dos_list', i)}>
              <Icon name="close" size={16} color="#E63946" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addLineBtn} onPress={() => addListItem('dos_list')}>
          <Icon name="plus" size={14} color="#2A6DF4" />
          <Text style={styles.addLineBtnText}>Add do</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Don'ts</Text>
        {form.donts_list.map((item, i) => (
          <View key={i} style={styles.listRow}>
            <TextInput
              style={[styles.input, styles.listInput]}
              value={item}
              onChangeText={v => updateListItem('donts_list', i, v)}
              multiline
            />
            <TouchableOpacity style={styles.listRemoveBtn} onPress={() => removeListItem('donts_list', i)}>
              <Icon name="close" size={16} color="#E63946" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addLineBtn} onPress={() => addListItem('donts_list')}>
          <Icon name="plus" size={14} color="#2A6DF4" />
          <Text style={styles.addLineBtnText}>Add don't</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMealPage = (prefix: MealPrefix) => {
    const options = getOptions(prefix);
    return (
      <View>
        <View style={styles.card}>
          {renderTextField('Meal title', (form as any)[`${prefix}_label`], v => updateField(`${prefix}_label` as any, v))}
          {renderTextField('Time / schedule', (form as any)[`${prefix}_time`], v => updateField(`${prefix}_time` as any, v))}
        </View>

        {options.map((opt, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.optionHeader}>
              <Text style={styles.sectionTitle}>Option {i + 1}</Text>
              <TouchableOpacity style={styles.optionDeleteBtn} onPress={() => removeOption(prefix, i)}>
                <Icon name="close" size={16} color="#E63946" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Meal description, ingredients, portions..."
              placeholderTextColor="#aaa"
              value={opt.text}
              onChangeText={v => updateOptionText(prefix, i, v)}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.photoActionBtn}
              onPress={() => openGalleryPicker(prefix, i)}
            >
              <Icon name="image-multiple-outline" size={16} color="#2A6DF4" />
              <Text style={styles.photoActionText}>Choose from gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoActionBtn}
              onPress={() => uploadFromDevice(prefix, i)}
              disabled={uploadingIndex === `${prefix}-${i}`}
            >
              {uploadingIndex === `${prefix}-${i}`
                ? <ActivityIndicator size="small" color="#555" />
                : <Icon name="tray-arrow-up" size={16} color="#555" />}
              <Text style={[styles.photoActionText, { color: '#555' }]}>Upload from photos</Text>
            </TouchableOpacity>

            {opt.imageUrl ? (
              <View style={styles.photoPreviewWrap}>
                <FastImage source={{ uri: opt.imageUrl }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(prefix, i)}>
                  <Text style={styles.removePhotoText}>Remove photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noPhotoBox}><Text style={styles.noPhotoText}>No photo</Text></View>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addLineBtn} onPress={() => addOption(prefix)}>
          <Icon name="plus" size={14} color="#2A6DF4" />
          <Text style={styles.addLineBtnText}>Add option</Text>
        </TouchableOpacity>
        <Text style={styles.hintText}>Note: Follow these options alternatively.</Text>
      </View>
    );
  };

  const renderPage6 = () => (
    <View style={styles.card}>
      {renderTextField('Closing notes', form.closing_notes, v => updateField('closing_notes', v), true)}
    </View>
  );

  const renderPageContent = () => {
    if (page === 1) return renderPage1();
    if (page === 6) return renderPage6();
    const section = MEAL_SECTIONS.find(s => s.page === page);
    return section ? renderMealPage(section.prefix) : null;
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="View / Edit Diet Plan"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        rightText={saving ? 'Saving…' : 'Save'}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        onRightTextPress={saving ? undefined : handleSave}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText} numberOfLines={1}>
          Client: <Text style={styles.subHeaderBold}>{form.name || routeClientName || '—'}</Text>
          {'  '}Plan ID: <Text style={styles.subHeaderBold}>{uuid}</Text>
        </Text>
        <Text style={styles.savedText}>{dirty ? 'Unsaved changes' : 'All changes saved'}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {PAGES.map(p => (
          <TouchableOpacity
            key={p.page}
            style={[styles.tab, page === p.page && styles.tabActive]}
            onPress={() => setPage(p.page)}
          >
            <Text style={[styles.tabText, page === p.page && styles.tabTextActive]} numberOfLines={1}>
              Page {p.page} — {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {renderPageContent()}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Gallery picker modal */}
      <Modal visible={galleryFor !== null} transparent animationType="fade" onRequestClose={() => setGalleryFor(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose from Gallery</Text>
              <TouchableOpacity onPress={() => setGalleryFor(null)}>
                <Icon name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            {galleryLoading ? (
              <ActivityIndicator size="large" color="#E63946" style={{ marginVertical: 30 }} />
            ) : galleryImages.length === 0 ? (
              <Text style={styles.modalEmptyText}>No images in the gallery yet.</Text>
            ) : (
              <FlatList
                data={galleryImages}
                keyExtractor={item => String(item.id)}
                numColumns={3}
                columnWrapperStyle={{ gap: 8 }}
                contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.galleryItem} onPress={() => pickFromGallery(item)}>
                    <FastImage source={{ uri: item.image_url }} style={styles.galleryThumb} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  subHeader: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  subHeaderText: { fontSize: 12, color: '#666' },
  subHeaderBold: { fontWeight: '700', color: '#1a1a1a' },
  savedText: { fontSize: 11, color: '#2A9348', marginTop: 2 },

  tabBar: { flexGrow: 0, flexShrink: 0, height: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabBarContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  tab: { flexGrow: 0, flexShrink: 0, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: '#F5F5F5' },
  tabActive: { backgroundColor: '#E63946' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },

  scroll: { padding: 12, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1a1a1a', backgroundColor: '#FAFAFA' },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },

  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  listInput: { flex: 1, minHeight: 44 },
  listRemoveBtn: { padding: 8, borderWidth: 1, borderColor: '#F5D0D2', borderRadius: 8, marginTop: 2 },

  addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4 },
  addLineBtnText: { fontSize: 13, fontWeight: '700', color: '#2A6DF4' },
  hintText: { fontSize: 11, color: '#999', marginTop: 4, marginBottom: 8 },

  optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  optionDeleteBtn: { padding: 4 },

  photoActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, marginTop: 8 },
  photoActionText: { fontSize: 13, fontWeight: '600', color: '#2A6DF4' },

  photoPreviewWrap: { marginTop: 10, alignItems: 'center' },
  photoPreview: { width: '100%', height: 140, borderRadius: 8, backgroundColor: '#EEE' },
  removePhotoBtn: { marginTop: 8, backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  removePhotoText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  noPhotoBox: { marginTop: 10, borderWidth: 1, borderColor: '#eee', borderStyle: 'dashed', borderRadius: 8, paddingVertical: 20, alignItems: 'center' },
  noPhotoText: { fontSize: 12, color: '#aaa' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  modalEmptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 30 },
  galleryItem: { flex: 1 / 3, aspectRatio: 1 },
  galleryThumb: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#EEE' },
});

export default MealPlanDetail;
