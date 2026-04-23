import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Switch, Alert } from 'react-native'
import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { updateAppImage } from '../../redux/slices/userSlice';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const Settings = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [autoBackup, setAutoBackup] = useState(true);
  
  // Get user data from Redux
  const { firstName, lastName, email, branch, role } = useSelector((state: RootState) => state.user.registrationData);
  const appImage = useSelector((state: RootState) => state.user.appImage);
  
  const profileName = `${firstName} ${lastName}`.trim() || 'User';
  const initials = `${firstName?.[0] || 'U'}${lastName?.[0] || 'S'}`.toUpperCase();

  const appSettings = [
    { label: 'Vostro World', sublabel: 'Replace', icon: null },
    { label: 'Contact Email', value: email || 'support@vostro.com' },
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
    { label: 'Current Branch', value: branch || 'Main Branch', icon: null },
    { label: 'List of branches', icon: 'chevron-right' },
    { label: 'Add branch', action: 'Add', actionStyle: true },
    { label: 'Delete branch', icon: 'chevron-right' },
    { label: 'Branch manager assignment', icon: 'chevron-right' },
  ];

  const rolesItems = [
    { label: 'Your Role', value: role || 'Staff', icon: null },
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

  const handleUpdateAppImage = () => {
    Alert.alert(
      'Update App Logo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => {
            launchCamera(
              {
                mediaType: 'photo',
                includeBase64: false,
                saveToPhotos: true,
              },
              (response) => {
                if (response.didCancel) {
                  console.log('Camera cancelled');
                } else if (response.errorCode) {
                  console.log('Camera error:', response.errorMessage);
                } else if (response.assets && response.assets.length > 0) {
                  const imageUri = response.assets[0].uri || null;
                  dispatch(updateAppImage(imageUri) as any);
                  console.log('Image selected from camera:', imageUri);
                }
              }
            );
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: () => {
            launchImageLibrary(
              {
                mediaType: 'photo',
                includeBase64: false,
              },
              (response) => {
                if (response.didCancel) {
                  console.log('Gallery cancelled');
                } else if (response.errorCode) {
                  console.log('Gallery error:', response.errorMessage);
                } else if (response.assets && response.assets.length > 0) {
                  const imageUri = response.assets[0].uri || null;
                  dispatch(updateAppImage(imageUri) as any);
                  console.log('Image selected from gallery:', imageUri);
                }
              }
            );
          },
        },
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]
    );
  };

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
                    <TouchableOpacity 
                      style={styles.logoPlaceholder}
                      onPress={handleUpdateAppImage}
                    >
                      {appImage ? (
                        <Image 
                          source={{ uri: appImage }} 
                          style={styles.logoImage}
                        />
                      ) : (
                        <Text style={styles.logoText}>{initials}</Text>
                      )}
                      <Icon name="camera" size={12} color="#fff" style={styles.cameraIcon} />
                    </TouchableOpacity>
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
              <TouchableOpacity 
                key={index} 
                style={[styles.settingRow, index === branchesItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'Delete branch') {
                    (navigation as any).navigate('DeleteBranch');
                  }
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                </View>
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
              <TouchableOpacity 
                key={index} 
                style={[styles.settingRow, index === rolesItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'Delete role') {
                    (navigation as any).navigate('DeleteRole');
                  }
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                </View>
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
              <TouchableOpacity 
                key={index} 
                style={[styles.settingRow, index === emailItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'SMTP settings') {
                    (navigation as any).navigate('SMTP');
                  } else if (item.label === 'Email templates') {
                    (navigation as any).navigate('EmailTemplates');
                  }
                }}
              >
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.icon && <Icon name={item.icon} size={20} color="#999" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Database Backup */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database Backup</Text>
            {databaseItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.settingRow, index === databaseItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'Download backup') {
                    (navigation as any).navigate('DatabaseBackup');
                  }
                }}
              >
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
              </TouchableOpacity>
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
              <TouchableOpacity
                key={index}
                style={[styles.settingRow, index === securityItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'Session timeout setting') {
                    (navigation as any).navigate('SecuritySettings');
                  }
                }}
              >
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
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
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