import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BurgerSVG from '../../assets/svg/BurgerSVG';


const AccountScreen = () => {
  const navigation = useNavigation();

  const profileData = {
    name: 'Ahmed Khan',
    role: 'Super Admin',
    verified: true,
    branch: 'Downtown Gym',
    email: 'ahmed.raza@email.com',
    phone: '+92 300 123456',
    username: 'ahmedraza',
    joiningDate: '12 March 2025',
    jobTitle: 'CEO',
  };

  const accountSections = [
    { label: 'Email', value: profileData.email },
    { label: 'Phone', value: profileData.phone },
    { label: 'Username', value: profileData.username },
    { label: 'Date of Joining', value: profileData.joiningDate },
    { label: 'Designing/Job Title', value: profileData.jobTitle },
  ];

  const securityItems = [
    { label: 'Change Password', icon: 'chevron-right' },
    { label: 'Two-factor authentication', icon: 'chevron-right' },
    { label: 'Active sessions', icon: 'chevron-right' },
  ];

  const preferenceItems = [
    { label: 'Language', value: 'English', icon: 'chevron-right' },
    { label: 'Time Zone', value: '(GMT+5:00)Pakistan', icon: 'chevron-right' },
    { label: 'Theme', value: 'Dark', icon: 'chevron-right' },
    { label: 'Notification preferences', icon: 'chevron-right' },
  ];

  const aboutAppItems = [
    { label: 'App version', value: '1.0.0' },
    { label: 'Build number', value: '68416 2569' },
    { label: 'Check for updates', icon: 'chevron-right' },
    { label: 'Legal', icon: 'chevron-right' },
  ];

  return (
    <>
      <AppHeader
        title="My Account"
        // leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        leftIcon={<BurgerSVG width={24} height={24} />}
        rightIcon={<Icon name="pencil" size={24} color="#1A1A1A" />}
        // onLeftPress={() => navigation.goBack()}
        onLeftPress={() => navigation.openDrawer()}
        onRightPress={() => console.log('Edit Account')}
        backgroundColor="#FFE5E5"
      />
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileContent}>
              <Image
                source={require('../../assets/img/userIcon.png')}
                style={styles.profileImage}
              />
              <View style={styles.notificationBadge}>
                <Icon name="bell" size={14} color="#fff" />
              </View>
            </View>
            <Text style={styles.profileName}>{profileData.name}</Text>
            <TouchableOpacity style={styles.roleTag}>
              <Text style={styles.roleText}>{profileData.role}</Text>
            </TouchableOpacity>
            <View style={styles.verificationRow}>
              <Icon name="check-circle" size={18} color="#27AE60" />
              <Text style={styles.verificationText}>Verified</Text>
            </View>
            <Text style={styles.branchText}>{profileData.branch}</Text>
          </View>

          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            {accountSections.map((item, index) => (
              <View key={index} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            {securityItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.listItem}>
                <Text style={styles.listLabel}>{item.label}</Text>
                <Icon name={item.icon} size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            {preferenceItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.listItem}>
                <View>
                  <Text style={styles.listLabel}>{item.label}</Text>
                  {item.value && <Text style={styles.listValue}>{item.value}</Text>}
                </View>
                <Icon name={item.icon} size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>

          {/* About App */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About App</Text>
            {aboutAppItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.listItem}>
                <View>
                  <Text style={styles.listLabel}>{item.label}</Text>
                  {item.value && <Text style={styles.listValue}>{item.value}</Text>}
                </View>
                {item.icon && <Icon name={item.icon} size={20} color="#999" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            <TouchableOpacity style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </>
  )
}

export default AccountScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100, paddingTop: 0 },

  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 12,
  },
  profileContent: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E0E0',
  },
  notificationBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E10600',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  roleTag: {
    backgroundColor: '#E10600',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  verificationText: {
    fontSize: 13,
    color: '#27AE60',
    fontWeight: '600',
  },
  branchText: {
    fontSize: 13,
    color: '#666',
  },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#E10600',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },

  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  listValue: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  buttonSection: {
    padding: 16,
    paddingBottom: 30,
    gap: 12,
  },
  logoutBtn: {
    backgroundColor: '#E10600',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    borderWidth: 1.5,
    borderColor: '#E10600',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#E10600',
    fontSize: 16,
    fontWeight: '600',
  },
})