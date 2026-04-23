import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface LeaveApplication {
  id: string;
  employeeName: string;
  leaveType: string;
  dates: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

const LeaveApplications = () => {
  const navigation = useNavigation();
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([
    {
      id: '1',
      employeeName: 'Ahmed khan',
      leaveType: 'Sick Leave | 12- 14 Mar',
      dates: 'Status : Approved',
      status: 'Approved',
    },
    {
      id: '2',
      employeeName: 'Sara Ali',
      leaveType: 'Casual Leave | 5 Apr',
      dates: 'Status : Pending',
      status: 'Pending',
    },
  ]);

  const handleSave = () => {
    console.log('Save leave applications');
  };

  const renderLeaveItem = ({ item }: { item: LeaveApplication }) => (
    <TouchableOpacity
      style={styles.leaveCard}
      onPress={() => (navigation as any).navigate('ApplyLeave', { leaveData: item })}
    >
      <View>
        <Text style={styles.employeeName}>{item.employeeName}</Text>
        <Text style={styles.leaveInfo}>{item.leaveType}</Text>
        <Text style={styles.statusText}>{item.dates}</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );

  return (
    <>
      <AppHeader
        title="Leave Application"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <FlatList
            data={leaveApplications}
            renderItem={renderLeaveItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        </ScrollView>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tab}>
            <Icon name="home" size={24} color="#E10600" />
            <Text style={styles.tabLabel}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="package-variant" size={24} color="#999" />
            <Text style={styles.tabLabel}>Package</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="account-group" size={24} color="#999" />
            <Text style={styles.tabLabel}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="chart-box" size={24} color="#999" />
            <Text style={styles.tabLabel}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="account" size={24} color="#999" />
            <Text style={styles.tabLabel}>Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  )
}

export default LeaveApplications

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20, paddingTop: 0 },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  leaveCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E10600',
  },

  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },

  leaveInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },

  statusText: {
    fontSize: 12,
    color: '#999',
  },

  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  saveButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFD9D9',
  },

  tab: {
    alignItems: 'center',
    flex: 1,
  },

  tabLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
})
