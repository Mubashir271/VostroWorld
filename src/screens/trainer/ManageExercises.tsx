import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import BranchField from '../../components/BranchField';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../hooks/useBranchSelector';
import {
  getExercises, addExercise, updateExercise, deleteExercise,
  getExerciseCategories, getExerciseSubCategories, ExerciseRow,
} from '../../api/exercises';

// The training/exercise taxonomies used to be hardcoded string lists here, but
// the API stores them as ids (115 "Weight Training", 204 "Chest"), so the
// strings could never have been submitted. Both dropdowns now load live.
interface Option { id: number; name: string }

// Row as rendered. The API's list shape names these training_type_id /
// exercise_type_id, while its write shape calls the same two values
// category_id / sub_category_id — mapped in one place, below.
interface Exercise {
  id: number;
  name: string;
  trainingType: string;
  trainingTypeId?: number;
  exerciseType: string;
  exerciseTypeId?: number;
  description: string;
}

const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  name: r.name ?? '',
  trainingType: r.training_type ?? '—',
  trainingTypeId: r.training_type_id,
  exerciseType: r.exercise_type ?? '—',
  exerciseTypeId: r.exercise_type_id,
  description: (r.description ?? '').trim() || 'N/A',
});

const listOf = (res: any): any[] => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const COL = { sr: 36, name: 130, training: 110, type: 100, desc: 90, action: 110 };

const ManageExercises = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchName, listBranchId, select: selectBranch,
  } = useBranchSelector();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<Option[]>([]);
  const [trainingType, setTrainingType] = useState<Option | null>(null);
  const [exerciseType, setExerciseType] = useState<Option | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [typeError, setTypeError] = useState(false);
  const [nameError, setNameError] = useState(false);

  const availableTypes = useMemo(() => subCategories, [subCategories]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getExercises({ branch_id: listBranchId, limit: 200, page: 1 });
      setExercises(listOf(res).map(toExercise));
    } catch (e: any) {
      // 404 is this API's "no rows", not a failure.
      if (e?.response?.status === 404) setExercises([]);
      else setLoadError('Failed to load exercises.');
    } finally {
      setLoading(false);
    }
  }, [listBranchId]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await getExerciseCategories(listBranchId);
      setCategories(listOf(res).map((c: any) => ({ id: c.id, name: c.name })));
    } catch {
      setCategories([]);
    }
  }, [listBranchId]);

  useEffect(() => { loadList(); loadCategories(); }, [loadList, loadCategories]);

  // Dependent dropdown: exercise types belong to the chosen training type.
  useEffect(() => {
    if (!trainingType) { setSubCategories([]); return; }
    let alive = true;
    (async () => {
      try {
        const res = await getExerciseSubCategories(trainingType.id, listBranchId);
        if (alive) setSubCategories(listOf(res).map((c: any) => ({ id: c.id, name: c.name })));
      } catch {
        // 404 here means this category simply has no sub-categories.
        if (alive) setSubCategories([]);
      }
    })();
    return () => { alive = false; };
  }, [trainingType, listBranchId]);

  const resetForm = () => {
    setExerciseName('');
    setDescription('');
    setExerciseType(null);
    setEditingId(null);
    setTypeError(false);
    setNameError(false);
  };

  const handleTrainingTypeChange = (type: Option) => {
    setTrainingType(type);
    setExerciseType(null);
  };

  const handleAdd = async () => {
    let hasError = false;
    if (!exerciseType) { setTypeError(true); hasError = true; }
    if (!exerciseName.trim()) { setNameError(true); hasError = true; }
    if (hasError) return;
    if (!trainingType) { setTypeError(true); return; }

    // `category_id` is the TRAINING type and `sub_category_id` the EXERCISE
    // type — the web maps them this way round; swapping them files the
    // exercise under the wrong taxonomy.
    const payload = {
      branch_id: listBranchId,
      name: exerciseName.trim(),
      // Description is required on the web form and every existing row stores
      // the literal string "N/A" when blank — match that rather than sending "".
      description: description.trim() || 'N/A',
      category_id: trainingType.id,
      sub_category_id: exerciseType!.id,
    };

    setSaving(true);
    try {
      if (editingId !== null) {
        await updateExercise(editingId, payload);
        Alert.alert('Updated', 'Exercise updated successfully!');
      } else {
        await addExercise(payload);
        Alert.alert('Added', 'Exercise added successfully!');
      }
      resetForm();
      await loadList();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not save this exercise.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setTrainingType(ex.trainingTypeId ? { id: ex.trainingTypeId, name: ex.trainingType } : null);
    setExerciseType(ex.exerciseTypeId ? { id: ex.exerciseTypeId, name: ex.exerciseType } : null);
    setExerciseName(ex.name);
    setDescription(ex.description === 'N/A' ? '' : ex.description);
    setTypeError(false);
    setNameError(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Exercise', 'Are you sure you want to delete this exercise?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExercise(id);
            await loadList();
          } catch (e: any) {
            Alert.alert('Failed', e?.response?.data?.message ?? 'Could not delete this exercise.');
          }
        },
      },
    ]);
  };

  return (
    <>
      <AppHeader
        title="Manage Exercises"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Add / Edit Exercise form ─────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{editingId !== null ? 'Edit Exercise' : 'Add Exercise'}</Text>
            <View style={s.divider} />

            <View style={s.formGroup}>
              <BranchField
                label={<>Branch Name <Text style={s.required}>*</Text></>}
                needsPicker={needsPicker}
                branchName={branchName}
                options={branchOptions}
                loadingOptions={loadingBranches}
                onSelect={selectBranch}
                labelStyle={s.label}
                staticStyle={s.readonlyBox}
                staticTextStyle={s.readonlyText}
                pickerStyle={s.readonlyBox}
                pickerTextStyle={s.readonlyText}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Select Training Type <Text style={s.required}>*</Text></Text>
              <View style={s.chipRow}>
                {categories.length === 0
                  ? <Text style={s.hintText}>No training types configured for this branch.</Text>
                  : categories.map(type => (
                    <TouchableOpacity
                      key={type.id}
                      style={[s.chip, trainingType?.id === type.id && s.chipActive]}
                      onPress={() => handleTrainingTypeChange(type)}
                    >
                      <Text style={[s.chipText, trainingType?.id === type.id && s.chipTextActive]}>{type.name}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Select Exercise Type <Text style={s.required}>*</Text></Text>
              <View style={[s.chipRow, typeError && s.chipRowError]}>
                {availableTypes.length === 0
                  ? <Text style={s.hintText}>
                      {trainingType ? 'This training type has no exercise types.' : 'Pick a training type first.'}
                    </Text>
                  : availableTypes.map(type => (
                    <TouchableOpacity
                      key={type.id}
                      style={[s.chip, exerciseType?.id === type.id && s.chipActive]}
                      onPress={() => { setExerciseType(type); setTypeError(false); }}
                    >
                      <Text style={[s.chipText, exerciseType?.id === type.id && s.chipTextActive]}>{type.name}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
              {typeError && <Text style={s.errorText}>Exercise type is required</Text>}
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Exercise Name <Text style={s.required}>*</Text></Text>
              <TextInput
                style={[s.input, nameError && s.inputError]}
                placeholder="Enter exercise name"
                placeholderTextColor="#999"
                value={exerciseName}
                onChangeText={(v) => { setExerciseName(v); if (v.trim()) setNameError(false); }}
              />
              {nameError && <Text style={s.errorText}>Required</Text>}
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Description</Text>
              <TextInput
                style={s.input}
                placeholder="N/A"
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={s.formActions}>
              <TouchableOpacity
                style={[s.addBtn, saving && s.addBtnDisabled]}
                onPress={handleAdd}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={s.addBtnText}>{editingId !== null ? 'Update' : 'Add'}</Text>}
              </TouchableOpacity>
              {editingId !== null && (
                <TouchableOpacity style={s.cancelBtn} onPress={resetForm}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Exercises list ───────────────────────────────────────────── */}
          <View style={[s.card, { marginTop: 16 }]}>
            <Text style={s.cardTitle}>View Exercises</Text>
            <View style={s.divider} />

            {loading ? (
              <ActivityIndicator size="large" color="#E63946" style={s.listLoader} />
            ) : loadError ? (
              <View style={s.listErrorBox}>
                <Text style={s.listErrorText}>{loadError}</Text>
                <TouchableOpacity style={s.retryBtn} onPress={loadList}>
                  <Text style={s.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : exercises.length === 0 ? (
              <View style={s.empty}>
                <Icon name="dumbbell" size={40} color="#ddd" />
                <Text style={s.emptyText}>No exercises found</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={s.tableHeader}>
                    <Text style={[s.headerCell, { width: COL.sr }]}>Sr#</Text>
                    <Text style={[s.headerCell, { width: COL.name }]}>Exercise Name</Text>
                    <Text style={[s.headerCell, { width: COL.training }]}>Training Type</Text>
                    <Text style={[s.headerCell, { width: COL.type }]}>Exercise Type</Text>
                    <Text style={[s.headerCell, { width: COL.desc }]}>Description</Text>
                    <Text style={[s.headerCell, { width: COL.action }]}>Actions</Text>
                  </View>
                  {exercises.map((ex, idx) => (
                    <View key={ex.id} style={[s.tableRow, idx % 2 === 0 && s.tableRowAlt]}>
                      <Text style={[s.cell, { width: COL.sr }]}>{idx + 1}</Text>
                      <Text style={[s.cell, { width: COL.name }]} numberOfLines={1}>{ex.name}</Text>
                      <Text style={[s.cell, { width: COL.training }]} numberOfLines={1}>{ex.trainingType}</Text>
                      <Text style={[s.cell, { width: COL.type }]} numberOfLines={1}>{ex.exerciseType}</Text>
                      <Text style={[s.cell, { width: COL.desc }]} numberOfLines={1}>{ex.description}</Text>
                      <View style={{ width: COL.action, flexDirection: 'row', gap: 14 }}>
                        <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(ex)}>
                          <Icon name="reload" size={13} color="#2E7D32" />
                          <Text style={s.updateText}>Update</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(ex.id)}>
                          <Icon name="trash-can-outline" size={13} color="#E63946" />
                          <Text style={s.deleteText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollContent: { padding: 16, paddingBottom: 60 },

  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EFEFEF' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },

  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  required: { color: '#E63946' },

  readonlyBox: { backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  readonlyText: { fontSize: 13, color: '#555', fontWeight: '500' },

  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: '#333',
  },
  inputError: { borderColor: '#E63946' },
  errorText: { fontSize: 11, color: '#E63946', marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hintText: { fontSize: 12, color: '#999', paddingVertical: 4 },
  addBtnDisabled: { opacity: 0.6 },
  listLoader: { paddingVertical: 34 },
  listErrorBox: { alignItems: 'center', gap: 10, paddingVertical: 26 },
  listErrorText: { fontSize: 13, color: '#999' },
  retryBtn: { borderWidth: 1, borderColor: '#E63946', borderRadius: 6, paddingHorizontal: 18, paddingVertical: 7 },
  retryText: { color: '#E63946', fontSize: 13, fontWeight: '700' },
  chipRowError: { borderWidth: 1, borderColor: '#E63946', borderRadius: 10, padding: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#FAFAFA' },
  chipActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  chipText: { fontSize: 12, color: '#555', fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  formActions: { flexDirection: 'row', gap: 10 },
  addBtn: { flex: 1, backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  cancelBtn: { flex: 1, backgroundColor: '#F0F0F0', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#555', fontSize: 14, fontWeight: '700' },

  tableHeader: { flexDirection: 'row', backgroundColor: '#E63946', borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  cell: { fontSize: 12, color: '#1A1A1A' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  updateText: { fontSize: 11, color: '#2E7D32', fontWeight: '700' },
  deleteText: { fontSize: 11, color: '#E63946', fontWeight: '700' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, color: '#999', marginTop: 10 },
});

export default ManageExercises;
