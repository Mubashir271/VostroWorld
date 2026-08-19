import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import BranchField from '../../components/BranchField';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { useBranchSelector } from '../../hooks/useBranchSelector';

const TRAINING_TYPES = ['Cardio', 'Weight Training'];
const EXERCISE_TYPES: Record<string, string[]> = {
  'Cardio': ['Running', 'Cycling', 'Rowing', 'Stair Climber'],
  'Weight Training': ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'],
};

interface Exercise {
  id: number;
  name: string;
  trainingType: string;
  exerciseType: string;
  description: string;
}

const SAMPLE_EXERCISES: Exercise[] = [
  { id: 1, name: 'Flat Bench Press',    trainingType: 'Weight Training', exerciseType: 'Chest', description: 'N/A' },
  { id: 2, name: 'Incline Bench Press', trainingType: 'Weight Training', exerciseType: 'Chest', description: 'N/A' },
  { id: 3, name: 'Lat Pull Down',       trainingType: 'Weight Training', exerciseType: 'Back',  description: 'N/A' },
  { id: 4, name: 'Treadmill Run',       trainingType: 'Cardio',          exerciseType: 'Running', description: 'N/A' },
];

const COL = { sr: 36, name: 130, training: 110, type: 100, desc: 90, action: 110 };

const ManageExercises = () => {
  const navigation = useNavigation<any>();
  const {
    needsPicker, options: branchOptions, loadingOptions: loadingBranches,
    branchName, select: selectBranch,
  } = useBranchSelector();

  const [exercises, setExercises] = useState<Exercise[]>(SAMPLE_EXERCISES);
  const [trainingType, setTrainingType] = useState('Weight Training');
  const [exerciseType, setExerciseType] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [typeError, setTypeError] = useState(false);
  const [nameError, setNameError] = useState(false);

  const availableTypes = useMemo(() => EXERCISE_TYPES[trainingType] ?? [], [trainingType]);

  const resetForm = () => {
    setExerciseName('');
    setDescription('');
    setExerciseType('');
    setEditingId(null);
    setTypeError(false);
    setNameError(false);
  };

  const handleTrainingTypeChange = (type: string) => {
    setTrainingType(type);
    setExerciseType('');
  };

  const handleAdd = () => {
    let hasError = false;
    if (!exerciseType) { setTypeError(true); hasError = true; }
    if (!exerciseName.trim()) { setNameError(true); hasError = true; }
    if (hasError) return;

    if (editingId !== null) {
      setExercises(prev => prev.map(ex => ex.id === editingId
        ? { ...ex, name: exerciseName.trim(), trainingType, exerciseType, description: description.trim() || 'N/A' }
        : ex));
      Alert.alert('Updated', 'Exercise updated successfully!');
    } else {
      const newExercise: Exercise = {
        id: Date.now(),
        name: exerciseName.trim(),
        trainingType,
        exerciseType,
        description: description.trim() || 'N/A',
      };
      setExercises(prev => [newExercise, ...prev]);
      Alert.alert('Added', 'Exercise added successfully!');
    }
    resetForm();
  };

  const handleEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setTrainingType(ex.trainingType);
    setExerciseType(ex.exerciseType);
    setExerciseName(ex.name);
    setDescription(ex.description === 'N/A' ? '' : ex.description);
    setTypeError(false);
    setNameError(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Exercise', 'Are you sure you want to delete this exercise?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setExercises(prev => prev.filter(ex => ex.id !== id)) },
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
                {TRAINING_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[s.chip, trainingType === type && s.chipActive]}
                    onPress={() => handleTrainingTypeChange(type)}
                  >
                    <Text style={[s.chipText, trainingType === type && s.chipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Select Exercise Type <Text style={s.required}>*</Text></Text>
              <View style={[s.chipRow, typeError && s.chipRowError]}>
                {availableTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[s.chip, exerciseType === type && s.chipActive]}
                    onPress={() => { setExerciseType(type); setTypeError(false); }}
                  >
                    <Text style={[s.chipText, exerciseType === type && s.chipTextActive]}>{type}</Text>
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
              <TouchableOpacity style={s.addBtn} onPress={handleAdd}>
                <Text style={s.addBtnText}>{editingId !== null ? 'Update' : 'Add'}</Text>
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

            {exercises.length === 0 ? (
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
