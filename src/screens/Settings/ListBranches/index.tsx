import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';

const BRANCHES = [
  {
    id: 1,
    name: 'F-11 Branch',
    address: 'Street 5, F-11 Markaz, Islamabad',
    manager: 'Ali Raza',
    status: 'Active',
  },
  {
    id: 2,
    name: 'G-13 Branch',
    address: 'G-13 Markaz, Islamabad',
    manager: 'Sara Khan',
    status: 'Active',
  },
  {
    id: 3,
    name: 'DHA Branch',
    address: 'Phase 4, DHA, Lahore',
    manager: 'Bilal Ahmed',
    status: 'Inactive',
  },
];

const ListBranches = () => {
  const navigation = useNavigation<any>();

  return (
    <>
      <AppHeader
        title="List of Branches"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<Icon name="plus" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('AddBranch')}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {BRANCHES.map(branch => (
            <View key={branch.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Icon name="office-building-outline" size={20} color="#E10600" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.branchName}>{branch.name}</Text>
                  <Text style={styles.branchAddress}>{branch.address}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    branch.status === 'Active' ? styles.statusActive : styles.statusInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      branch.status === 'Active' ? styles.statusTextActive : styles.statusTextInactive,
                    ]}
                  >
                    {branch.status}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardFooter}>
                <View style={styles.managerRow}>
                  <Icon name="account-outline" size={16} color="#999" />
                  <Text style={styles.managerText}>Manager: {branch.manager}</Text>
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('AddBranch', { branchId: branch.id })}
                  >
                    <Icon name="pencil-outline" size={16} color="#E10600" />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('DeleteBranch', { branchId: branch.id })}
                  >
                    <Icon name="trash-can-outline" size={16} color="#E10600" />
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default ListBranches

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 14,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  branchAddress: { fontSize: 12, color: '#999', marginTop: 2 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#E6F7EC' },
  statusInactive: { backgroundColor: '#F0F0F0' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextActive: { color: '#2A9348' },
  statusTextInactive: { color: '#999' },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  managerText: { fontSize: 13, color: '#555' },

  actionsRow: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: '#E10600', fontWeight: '600' },
})
