import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const LeaveDetail = () => {
  const navigation = useNavigation();

  return (
    <>
      <AppHeader
        title="Leave Detail"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Employee Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Employee</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ahmed khan</Text>
            </View>
          </View>

          {/* Leave Type Section */}
          <View style={styles.section}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type: sick Leave</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dates: 12-14 March</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status: Pending</Text>
            </View>
          </View>

          {/* Reason Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reason:</Text>
            </View>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonText}>Fever and rest required</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.approveButton}>
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton}>
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

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

export default LeaveDetail

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20, paddingTop: 0 },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },

  sectionHeader: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  detailRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  detailLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  reasonBox: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  reasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
  },

  approveButton: {
    flex: 1,
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  rejectButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E10600',
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
