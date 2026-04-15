import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Switch } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const Settings = () => {
  const [autoBackup, setAutoBackup] = useState(true);
  const navigation = useNavigation();

  const appSettings = [
    { label: 'Vostro World', sublabel: 'Replace', icon: null },
    { label: 'Contact Email', value: 'support@vostro.com' },
    { label: 'Support Phone', value: '+92 300 1234567' },
    { label: 'Website URL', value: 'www.vostroworld.com' },
  ];

  const generalSettings = [
    { label: 'Time format', value: '12-Hour', icon: 'chevron-right' },
    { label: 'Date Format', value: 'DD/MM/YY', icon: 'chevron-right' },
    { label: 'Currency', value: 'PKR', icon: 'chevron-right' },
    { label: 'Tax Percentage', value: null, icon: 'chevron-right' },
  ];

  const branchesItems = [
    { label: 'List of branches', icon: 'chevron-right' },
    { label: 'Add branch', action: 'Add', actionStyle: true },
    { label: 'Delete branch', icon: 'chevron-right' },
    { label: 'Branch manager assignment', icon: 'chevron-right' },
  ];

  const rolesItems = [
    { label: 'Add new role', action: 'Add', actionStyle: true },
    { label: 'Delete role', icon: 'chevron-right' },
    { label: 'Permission matrix per role', icon: 'chevron-right' },
  ];

  const emailItems = [
    { label: 'Email templates', icon: 'chevron-right' },
    { label: 'SMTP settings', icon: 'chevron-right' },
    { label: 'Notification triggers configuration', icon: 'chevron-right' },
  ];

  const databaseItems = [
    { label: 'Last backup', value: '11 April 2025 - 2:00 AM', icon: null },
    { label: 'Auto-backup', value: null, toggle: true },
    { label: 'Backup frequency', value: null, icon: 'chevron-right' },
    { label: 'Download backup', icon: 'chevron-right' },
  ];

  const appUpdateItems = [
    { label: 'Current version', value: '1.0.0' },
    { label: 'Check for updates', icon: 'chevron-right' },
    { label: 'Update history log', icon: 'chevron-right' },
  ];

  const securityItems = [
    { label: 'Session timeout setting', icon: 'chevron-right' },
    { label: 'IP whitelist', icon: 'chevron-right' },
    { label: 'Two-factor authentication', icon: 'chevron-right' },
    { label: 'Password policy', icon: 'chevron-right' },
  ];

  return (
    <>
      <AppHeader
        title="Settings"
        rightIcon={<Icon name="magnify" size={24} color="#1A1A1A" />}
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onRightPress={() => console.log('Search')}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* App Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            {appSettings.map((item, index) => (
              <View key={index} style={[styles.settingRow, index === appSettings.length - 1 && styles.lastRow]}>
                {item.icon === null && item.sublabel ? (
                  <>
                    <View style={styles.logoPlaceholder}>
                      <Text style={styles.logoText}>VS</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      <Text style={styles.settingValue}>{item.sublabel}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>

          {/* General */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            {generalSettings.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.settingRow, index === generalSettings.length - 1 && styles.lastRow]}>
                <View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                </View>
                {item.icon && <Icon name={item.icon} size={20} color="#999" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Branches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Branches</Text>
            {branchesItems.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.settingRow, index === branchesItems.length - 1 && styles.lastRow]}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.action ? (
                  <View style={styles.actionButton}>
                    <Text style={styles.actionText}>{item.action}</Text>
                  </View>
                ) : (
                  item.icon && <Icon name={item.icon} size={20} color="#999" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Roles & Permissions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Roles & Permissions</Text>
            {rolesItems.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.settingRow, index === rolesItems.length - 1 && styles.lastRow]}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.action ? (
                  <View style={styles.actionButton}>
                    <Text style={styles.actionText}>{item.action}</Text>
                  </View>
                ) : (
                  item.icon && <Icon name={item.icon} size={20} color="#999" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Email & Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email & Notifications</Text>
            {emailItems.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.settingRow, index === emailItems.length - 1 && styles.lastRow]}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.icon && <Icon name={item.icon} size={20} color="#999" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Database Backup */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database Backup</Text>
            {databaseItems.map((item, index) => (
              <View key={index} style={[styles.settingRow, index === databaseItems.length - 1 && styles.lastRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                </View>
                {item.toggle ? (
                  <Switch
                    value={autoBackup}
                    onValueChange={setAutoBackup}
                    trackColor={{ false: '#ccc', true: '#E10600' }}
                    thumbColor={autoBackup ? '#E10600' : '#f4f3f4'}
                  />
                ) : (
                  item.icon && <Icon name={item.icon} size={20} color="#999" />
                )}
              </View>
            ))}
          </View>

          {/* App Updates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Updates</Text>
            {appUpdateItems.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.settingRow, index === appUpdateItems.length - 1 && styles.lastRow]}>
                <View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                </View>
                {item.icon && <Icon name={item.icon} size={20} color="#999" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            {securityItems.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.settingRow, index === securityItems.length - 1 && styles.lastRow]}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.icon && <Icon name={item.icon} size={20} color="#999" />}
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default Settings

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 50, paddingTop: 0 },

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

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },

  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E10600',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  settingLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  actionButton: {
    backgroundColor: '#E10600',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
})