import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';

interface FitnessPlan {
  id: number;
  clientName: string;
  trainerName: string;
  startDate: string;
  endDate: string;
}

const SAMPLE_PLANS: FitnessPlan[] = [
  { id: 1, clientName: 'Madiha Khalid',  trainerName: 'Maryam Sharif', startDate: '01-06-2026', endDate: '30-06-2026' },
  { id: 2, clientName: 'Sehat ullah khan', trainerName: 'Maryam Sharif', startDate: '05-06-2026', endDate: '05-07-2026' },
  { id: 3, clientName: 'Zahida sarmad',  trainerName: 'Maryam Sharif', startDate: '03-06-2026', endDate: '03-07-2026' },
];

const COL = { sr: 36, client: 130, trainer: 130, start: 100, end: 100, action: 90 };

const ViewFitnessPlans = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const trainerName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'Trainer';

  const [plans, setPlans] = useState<FitnessPlan[]>(SAMPLE_PLANS);
  const [clientName, setClientName] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => (query ? plans.filter(p => p.clientName.toLowerCase().includes(query.toLowerCase())) : plans),
    [plans, query],
  );

  const handleSearch = () => setQuery(clientName.trim());

  const handleDelete = (id: number) => {
    Alert.alert('Delete Plan', 'Are you sure you want to delete this fitness plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setPlans(prev => prev.filter(p => p.id !== id)) },
    ]);
  };

  return (
    <>
      <AppHeader
        title="Fitness Plan"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <View style={s.screen}>
        <View style={s.headerRow}>
          <Text style={s.title}>Fitness Plans List</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('AddFitnessPlan')}>
            <Icon name="plus" size={16} color="#FFF" />
            <Text style={s.addBtnText}>Add Fitness Plan</Text>
          </TouchableOpacity>
        </View>

        <View style={s.filterBar}>
          <Text style={s.filterLabel}>Client Name</Text>
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              placeholder="Enter client name"
              placeholderTextColor="#999"
              value={clientName}
              onChangeText={setClientName}
            />
            <TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
              <Text style={s.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Icon name="clipboard-text-outline" size={44} color="#ddd" />
            <Text style={s.emptyText}>No Record Found</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={s.tableHeader}>
                  <Text style={[s.headerCell, { width: COL.sr }]}>Sr#</Text>
                  <Text style={[s.headerCell, { width: COL.client }]}>Client Name</Text>
                  <Text style={[s.headerCell, { width: COL.trainer }]}>Trainer Name</Text>
                  <Text style={[s.headerCell, { width: COL.start }]}>Start Date</Text>
                  <Text style={[s.headerCell, { width: COL.end }]}>End Date</Text>
                  <Text style={[s.headerCell, { width: COL.action }]}>Action</Text>
                </View>
                {filtered.map((plan, idx) => (
                  <View key={plan.id} style={[s.tableRow, idx % 2 === 0 && s.tableRowAlt]}>
                    <Text style={[s.cell, { width: COL.sr }]}>{idx + 1}</Text>
                    <Text style={[s.cell, s.clientCell, { width: COL.client }]} numberOfLines={1}>{plan.clientName}</Text>
                    <Text style={[s.cell, { width: COL.trainer }]} numberOfLines={1}>{plan.trainerName}</Text>
                    <Text style={[s.cell, { width: COL.start }]}>{plan.startDate}</Text>
                    <Text style={[s.cell, { width: COL.end }]}>{plan.endDate}</Text>
                    <View style={{ width: COL.action, flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => Alert.alert(plan.clientName, `Trainer: ${plan.trainerName}\nStart: ${plan.startDate}\nEnd: ${plan.endDate}`)}>
                        <Icon name="eye-outline" size={18} color="#0284c7" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(plan.id)}>
                        <Icon name="trash-can-outline" size={18} color="#E63946" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        )}
      </View>
    </>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9F9FB' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  filterBar: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 14, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EFEFEF' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInput: { flex: 1, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#333' },
  searchBtn: { backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center' },
  searchBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  listContent: { paddingBottom: 30 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E63946', marginHorizontal: 16, marginTop: 16, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  headerCell: { fontSize: 12, fontWeight: '700', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  cell: { fontSize: 13, color: '#1A1A1A' },
  clientCell: { color: '#E63946', fontWeight: '600' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 10 },
});

export default ViewFitnessPlans;
