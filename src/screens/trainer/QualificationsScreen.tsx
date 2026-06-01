import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import api from '../../api/service';

type EntryType = 'Qualification' | 'Experience';

interface Entry {
  id: number;
  entry_type: EntryType;
  title: string;
  organization: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export default function QualificationsScreen() {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId;
  const userId   = profile?.id;

  const [entries, setEntries]   = useState<Entry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const [form, setForm] = useState({
    entry_type: 'Qualification' as EntryType,
    title: '', organization: '', location: '',
    start_date: '', end_date: '', description: '',
  });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/hr/employee-profile-entries/index', {
        params: { branch_id: branchId, user_id: userId, status: 1, limit: 100 },
      });
      setEntries(res?.data?.data ?? []);
    } catch (e) {
      console.log('Profile entries error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.organization.trim()) {
      Alert.alert('Required', 'Title and Organization are required');
      return;
    }
    try {
      setSaving(true);
      await api.post('/v1/hr/employee-profile-entries/store', {
        branch_id: branchId, user_id: userId, ...form,
      });
      Alert.alert('Saved', 'Record saved successfully');
      setForm({ entry_type: 'Qualification', title: '', organization: '', location: '', start_date: '', end_date: '', description: '' });
      fetchEntries();
    } catch (e) {
      Alert.alert('Error', 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const qualifications = entries.filter(e => e.entry_type === 'Qualification');
  const experiences    = entries.filter(e => e.entry_type === 'Experience');

  const renderEntry = (item: Entry) => (
    <View key={item.id} style={s.entryCard}>
      <View style={s.entryHeader}>
        <Text style={s.entryTitle}>{item.title}</Text>
        <TouchableOpacity style={s.editBtn}>
          <Text style={s.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.entryOrg}>{item.organization}{item.location ? ` | ${item.location}` : ''}</Text>
      <Text style={s.entryDate}>
        {item.start_date || 'N/A'} to {item.end_date || 'N/A'}
      </Text>
      {item.description ? <Text style={s.entryDesc} numberOfLines={3}>{item.description}</Text> : null}
    </View>
  );

  return (
    <>
      <AppHeader
        title="Qualifications & Experience"
        leftIcon={<Icon name="arrow-left" size={24} color="#333" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

          {/* Add Form */}
          <View style={s.section}>
            <Text style={s.sectionBadge}>PROFILE BUILDING</Text>
            <Text style={s.sectionTitle}>Add Qualification or Experience</Text>
            <Text style={s.sectionSub}>Add qualifications, work experience, and education details to keep your employee profile complete.</Text>

            <Text style={s.fieldLabel}>Type</Text>
            <TouchableOpacity style={s.dropdown} onPress={() => setTypeOpen(!typeOpen)}>
              <Text style={s.dropdownText}>{form.entry_type}</Text>
              <Icon name={typeOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
            </TouchableOpacity>
            {typeOpen && (
              <View style={s.dropdownList}>
                {(['Qualification', 'Experience'] as EntryType[]).map(t => (
                  <TouchableOpacity key={t} style={s.dropdownItem} onPress={() => { setForm(f => ({ ...f, entry_type: t })); setTypeOpen(false); }}>
                    <Text style={s.dropdownItemText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.fieldLabel}>Title *</Text>
            <TextInput style={s.input} placeholder="Title" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} />

            <Text style={s.fieldLabel}>Institute / Company *</Text>
            <TextInput style={s.input} placeholder="Institute / Company" value={form.organization} onChangeText={v => setForm(f => ({ ...f, organization: v }))} />

            <Text style={s.fieldLabel}>Location</Text>
            <TextInput style={s.input} placeholder="Location" value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} />

            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.fieldLabel}>Start Date</Text>
                <TextInput style={s.input} placeholder="YYYY-MM-DD" value={form.start_date} onChangeText={v => setForm(f => ({ ...f, start_date: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>End Date</Text>
                <TextInput style={s.input} placeholder="YYYY-MM-DD" value={form.end_date} onChangeText={v => setForm(f => ({ ...f, end_date: v }))} />
              </View>
            </View>

            <Text style={s.fieldLabel}>Description</Text>
            <TextInput style={[s.input, s.textarea]} placeholder="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline numberOfLines={4} />

            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Record</Text>}
            </TouchableOpacity>
          </View>

          {/* Saved Records */}
          <View style={s.section}>
            <Text style={s.sectionBadge}>SAVED RECORDS</Text>
            <Text style={s.sectionTitle}>Qualification</Text>
            <Text style={s.sectionSub}>All saved qualification details linked to your profile.</Text>
            {qualifications.length === 0
              ? <Text style={s.empty}>No qualifications added yet</Text>
              : qualifications.map(renderEntry)}
          </View>

          <View style={s.section}>
            <Text style={s.sectionBadge}>SAVED RECORDS</Text>
            <Text style={s.sectionTitle}>Experience</Text>
            <Text style={s.sectionSub}>All experience details linked to your profile.</Text>
            {experiences.length === 0
              ? <Text style={s.empty}>No experience added yet</Text>
              : experiences.map(renderEntry)}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section:         { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionBadge:    { fontSize: 11, fontWeight: '700', color: '#0ea5e9', letterSpacing: 1, marginBottom: 6 },
  sectionTitle:    { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  sectionSub:      { fontSize: 13, color: '#64748b', marginBottom: 16 },
  empty:           { color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },
  row:             { flexDirection: 'row' },
  fieldLabel:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  dropdown:        { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' },
  dropdownText:    { fontSize: 14, color: '#1e293b' },
  dropdownList:    { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, marginTop: 4, backgroundColor: '#fff' },
  dropdownItem:    { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemText:{ fontSize: 14, color: '#1e293b' },
  input:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f9fafb' },
  textarea:        { height: 100, textAlignVertical: 'top' },
  saveBtn:         { backgroundColor: '#1e293b', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  entryCard:       { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 },
  entryHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  entryTitle:      { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },
  editBtn:         { borderWidth: 1, borderColor: '#3b82f6', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 },
  editBtnText:     { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  entryOrg:        { fontSize: 13, color: '#475569', marginBottom: 2 },
  entryDate:       { fontSize: 12, color: '#94a3b8', marginBottom: 6 },
  entryDesc:       { fontSize: 13, color: '#64748b', lineHeight: 20 },
});
