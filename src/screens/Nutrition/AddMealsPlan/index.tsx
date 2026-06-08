import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { RootState } from '../../../redux/store';
import { addMealPlan } from '../../../api/nutrition';

// ── Types ─────────────────────────────────────────────────────────────────────

type MealCell = { notes: string; photo: string | null };
type Grid = Record<number, Record<string, Record<string, MealCell>>>;

const WEEKS = [1, 2, 3, 4];
const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'MUNCHING'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Helper: build an empty 4×5×7 grid ─────────────────────────────────────────

const buildEmptyGrid = (): Grid => {
  const g: Grid = {};
  for (const w of WEEKS) {
    g[w] = {};
    for (const m of MEALS) {
      g[w][m] = {};
      for (const d of DAYS) {
        g[w][m][d] = { notes: '', photo: null };
      }
    }
  }
  return g;
};

// ── Date helpers ───────────────────────────────────────────────────────────────

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dd}`;
};

// Very simple inline date picker (year-month-day spinners are heavy;
// we use a text input with YYYY-MM-DD format to keep it lightweight and
// dependency-free — consistent with the no-external-UI-lib guideline).
const DateField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(value);

  const commit = () => {
    // basic YYYY-MM-DD validation
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      onChange(raw);
    } else {
      Alert.alert('Invalid Date', 'Please enter date as YYYY-MM-DD.');
      setRaw(value);
    }
    setEditing(false);
  };

  return (
    <View style={df.wrap}>
      <Text style={df.label}>{label}</Text>
      {editing ? (
        <View style={df.inputRow}>
          <TextInput
            style={df.input}
            value={raw}
            onChangeText={setRaw}
            onBlur={commit}
            onSubmitEditing={commit}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#aaa"
            autoFocus
          />
          <TouchableOpacity style={df.okBtn} onPress={commit}>
            <Text style={df.okText}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={df.display} onPress={() => { setRaw(value); setEditing(true); }}>
          <Icon name="calendar" size={16} color="#E63946" />
          <Text style={df.displayText}>{value}</Text>
          <Icon name="pencil-outline" size={14} color="#aaa" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────────

const AddMealsPlan = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;
  const branchName = (profile as any)?.branchName ?? `Branch ${branchId}`;

  // Header fields
  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());

  // Weekly grid
  const [activeWeek, setActiveWeek] = useState(1);
  const [grid, setGrid] = useState<Grid>(buildEmptyGrid);
  const [saving, setSaving] = useState(false);

  // ── Cell update helpers ─────────────────────────────────────────────────────
  const updateNotes = useCallback(
    (week: number, meal: string, day: string, text: string) => {
      setGrid(prev => ({
        ...prev,
        [week]: {
          ...prev[week],
          [meal]: {
            ...prev[week][meal],
            [day]: { ...prev[week][meal][day], notes: text },
          },
        },
      }));
    },
    [],
  );

  const pickPhoto = useCallback(
    async (week: number, meal: string, day: string) => {
      try {
        const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
        if (result.didCancel || !result.assets?.length) return;
        const uri = result.assets[0].uri ?? null;
        setGrid(prev => ({
          ...prev,
          [week]: {
            ...prev[week],
            [meal]: {
              ...prev[week][meal],
              [day]: { ...prev[week][meal][day], photo: uri },
            },
          },
        }));
      } catch {
        Alert.alert('Error', 'Failed to open image picker.');
      }
    },
    [],
  );

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!clientName.trim()) {
      Alert.alert('Validation', 'Please enter Client Name.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Validation', 'Please set Start and End dates.');
      return;
    }

    setSaving(true);
    try {
      await addMealPlan({
        branch_id: branchId,
        client_name: clientName.trim(),
        start_date: startDate,
        end_date: endDate,
        meals: grid,
      });
      Alert.alert('Success', 'Meal plan added successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to add meal plan.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render a single meal cell ───────────────────────────────────────────────
  const renderCell = (week: number, meal: string, day: string) => {
    const cell = grid[week][meal][day];
    return (
      <View key={`${meal}-${day}`} style={cell_styles.cell}>
        <TextInput
          style={cell_styles.notesInput}
          multiline
          numberOfLines={3}
          placeholder="Meal notes..."
          placeholderTextColor="#bbb"
          value={cell.notes}
          onChangeText={t => updateNotes(week, meal, day, t)}
          textAlignVertical="top"
        />
        {cell.photo ? (
          <View style={cell_styles.thumbWrap}>
            <Image source={{ uri: cell.photo }} style={cell_styles.thumb} />
            <TouchableOpacity
              style={cell_styles.removePhoto}
              onPress={() =>
                setGrid(prev => ({
                  ...prev,
                  [week]: {
                    ...prev[week],
                    [meal]: {
                      ...prev[week][meal],
                      [day]: { ...prev[week][meal][day], photo: null },
                    },
                  },
                }))
              }
            >
              <Icon name="close-circle" size={16} color="#E63946" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={cell_styles.photoBtn}
            onPress={() => pickPhoto(week, meal, day)}
          >
            <Icon name="image-plus" size={13} color="#E63946" />
            <Text style={cell_styles.photoBtnText}>Add photo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Meals Plan"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* ── Header card ───────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Plan Details</Text>

            {/* Branch (read-only) */}
            <Text style={styles.label}>Branch Name</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{branchName}</Text>
            </View>

            {/* Client name */}
            <Text style={styles.label}>Client Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter client name"
              placeholderTextColor="#aaa"
              value={clientName}
              onChangeText={setClientName}
            />

            {/* Dates */}
            <View style={styles.datesRow}>
              <View style={{ flex: 1 }}>
                <DateField label="Start Date" value={startDate} onChange={setStartDate} />
              </View>
              <View style={styles.dateSep} />
              <View style={{ flex: 1 }}>
                <DateField label="End Date" value={endDate} onChange={setEndDate} />
              </View>
            </View>
          </View>

          {/* ── Week tabs ─────────────────────────────────────────── */}
          <View style={styles.weekTabBar}>
            {WEEKS.map(w => (
              <TouchableOpacity
                key={w}
                style={[styles.weekTab, activeWeek === w && styles.weekTabActive]}
                onPress={() => setActiveWeek(w)}
              >
                <Text
                  style={[styles.weekTabText, activeWeek === w && styles.weekTabTextActive]}
                >
                  Week {w}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Grid for active week ──────────────────────────────── */}
          <View style={styles.gridCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                {/* Column headers (days) */}
                <View style={grid_styles.headerRow}>
                  {/* meal label spacer */}
                  <View style={[grid_styles.mealLabelCell, grid_styles.cornerCell]}>
                    <Text style={grid_styles.cornerText}>WEEK {activeWeek}</Text>
                  </View>
                  {DAYS.map(d => (
                    <View key={d} style={grid_styles.dayHeaderCell}>
                      <Text style={grid_styles.dayHeaderText}>{d.substring(0, 3).toUpperCase()}</Text>
                    </View>
                  ))}
                </View>

                {/* Meal rows */}
                {MEALS.map(meal => (
                  <View key={meal} style={grid_styles.mealRow}>
                    <View style={grid_styles.mealLabelCell}>
                      <Text style={grid_styles.mealLabel}>{meal}</Text>
                    </View>
                    {DAYS.map(day => renderCell(activeWeek, meal, day))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* ── Submit button ─────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Icon name="check-circle-outline" size={20} color="#FFF" />
                <Text style={styles.submitBtnText}>Add Meal Plan</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AddMealsPlan;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { padding: 12, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
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

  datesRow: { flexDirection: 'row', marginTop: 10, alignItems: 'flex-start' },
  dateSep: { width: 12 },

  // Week tabs
  weekTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  weekTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  weekTabActive: { borderBottomColor: '#E63946', backgroundColor: '#FFF5F5' },
  weekTabText: { fontSize: 13, color: '#888', fontWeight: '500' },
  weekTabTextActive: { color: '#E63946', fontWeight: '700' },

  // Grid wrapper card
  gridCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#E63946',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});

// DateField styles
const df = StyleSheet.create({
  wrap: {},
  label: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 4 },
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 11,
    backgroundColor: '#FAFAFA',
  },
  displayText: { flex: 1, fontSize: 13, color: '#1A1A1A' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E63946',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1A1A1A',
    backgroundColor: '#FFF',
  },
  okBtn: {
    backgroundColor: '#E63946',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  okText: { fontSize: 13, color: '#FFF', fontWeight: '700' },
});

// Grid styles
const CELL_WIDTH = 130;
const MEAL_LABEL_WIDTH = 90;

const grid_styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#C0392B',
  },
  cornerCell: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A93226',
  },
  cornerText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  dayHeaderCell: {
    width: CELL_WIDTH,
    paddingVertical: 10,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
  },
  dayHeaderText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  mealRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  mealLabelCell: {
    width: MEAL_LABEL_WIDTH,
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FBF5F5',
    borderRightWidth: 1,
    borderRightColor: '#EEE',
  },
  mealLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C0392B',
    letterSpacing: 0.5,
  },
});

// Cell styles
const cell_styles = StyleSheet.create({
  cell: {
    width: CELL_WIDTH,
    borderLeftWidth: 1,
    borderLeftColor: '#F0F0F0',
    padding: 6,
    backgroundColor: '#FFF',
  },
  notesInput: {
    fontSize: 11,
    color: '#333',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 60,
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: '#E63946',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  photoBtnText: { fontSize: 10, color: '#E63946', fontWeight: '600' },
  thumbWrap: { marginTop: 5, position: 'relative', alignSelf: 'flex-start' },
  thumb: { width: 60, height: 50, borderRadius: 6, resizeMode: 'cover' },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
});
