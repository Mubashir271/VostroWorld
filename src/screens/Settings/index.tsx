import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, Switch, Alert,
} from 'react-native'
import FastImage from '@d11/react-native-fast-image'
import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { updateAppImage, setAutoBackup } from '../../redux/slices/userSlice'
import { launchImageLibrary, launchCamera } from 'react-native-image-picker'
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import TimeFormatModal from './TimeFormatModal'
import DateFormatModal from './DateFormatModal'
import CurrencyModal from './CurrencyModal'

type RootStackParamList = {
  DeleteBranch: undefined
  ListBranches: undefined
  AddBranch: undefined
  BranchManagerAssignment: undefined
  DeleteRole: undefined
  SMTP: undefined
  EmailTemplates: undefined
  DatabaseBackup: undefined
  SecuritySettings: undefined
}

const Settings = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const dispatch   = useDispatch<AppDispatch>()

  // Modal visibility
  const [timeFormatVisible, setTimeFormatVisible] = useState(false)
  const [dateFormatVisible, setDateFormatVisible] = useState(false)
  const [currencyVisible,   setCurrencyVisible]   = useState(false)

  // Format states (local — not critical to persist)
  const [timeFormat, setTimeFormat] = useState('12-Hour')
  const [dateFormat, setDateFormat] = useState('DD/MM/YY')
  const [currency,   setCurrency]   = useState('PKR')

  // ── Redux ──────────────────────────────────────────────────────────────
  const profile    = useSelector((state: RootState) => state.user.profile)
  const appImage   = useSelector((state: RootState) => state.user.appImage)
  const autoBackup = useSelector((state: RootState) => state.user.autoBackup)

  const firstName = profile?.firstName ?? ''
  const lastName  = profile?.lastName  ?? ''
  const email     = profile?.email     ?? 'support@vostro.com'
  const branch    = profile?.branchName ?? 'Main Branch'
  const role      = profile?.role ?? profile?.type ?? 'Staff'
  const initials  = `${firstName[0] ?? 'U'}${lastName[0] ?? 'S'}`.toUpperCase()
  // ───────────────────────────────────────────────────────────────────────

  const handleUpdateAppImage = () => {
    Alert.alert('Update App Logo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: () =>
          launchCamera({ mediaType: 'photo', saveToPhotos: true }, (res) => {
            if (!res.didCancel && !res.errorCode) {
              dispatch(updateAppImage(res.assets?.[0]?.uri ?? null))
            }
          }),
      },
      {
        text: 'Choose from Gallery',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo' }, (res) => {
            if (!res.didCancel && !res.errorCode) {
              dispatch(updateAppImage(res.assets?.[0]?.uri ?? null))
            }
          }),
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const appSettings = [
    { label: 'Vostro World', sublabel: 'Replace', icon: null },
    { label: 'Contact Email', value: email },
    { label: 'Support Phone', value: '+92 300 1234567' },
    { label: 'Website URL',   value: 'www.vostroworld.com' },
  ]

  const generalSettings = [
    { label: 'Time format',    value: timeFormat, icon: 'chevron-right' },
    { label: 'Date Format',    value: dateFormat, icon: 'chevron-right' },
    { label: 'Currency',       value: currency,   icon: 'chevron-right' },
    { label: 'Tax Percentage', value: null,        icon: 'chevron-right' },
  ]

  const branchesItems = [
    { label: 'Current Branch',            value: branch, icon: null as string | null },
    { label: 'List of branches',          icon: 'chevron-right' as string | null },
    { label: 'Add branch',                action: 'Add' },
    { label: 'Delete branch',             icon: 'chevron-right' as string | null },
    { label: 'Branch manager assignment', icon: 'chevron-right' as string | null },
  ]

  const rolesItems = [
    { label: 'Your Role',                  value: role, icon: null as string | null },
    { label: 'Add new role',               action: 'Add' },
    { label: 'Delete role',                icon: 'chevron-right' as string | null },
    { label: 'Permission matrix per role', icon: 'chevron-right' as string | null },
  ]

  const emailItems = [
    { label: 'Email templates',                     icon: 'chevron-right' },
    { label: 'SMTP settings',                       icon: 'chevron-right' },
    { label: 'Notification triggers configuration', icon: 'chevron-right' },
  ]

  const databaseItems = [
    { label: 'Last backup',      value: '11 April 2025 - 2:00 AM', icon: null as string | null, toggle: false },
    { label: 'Auto-backup',      value: null,                       icon: null as string | null, toggle: true  },
    { label: 'Backup frequency', value: null,                       icon: 'chevron-right',        toggle: false },
    { label: 'Download backup',  value: null,                       icon: 'chevron-right',        toggle: false },
  ]

  const appUpdateItems = [
    { label: 'Current version',    value: '1.0.0',  icon: null as string | null },
    { label: 'Check for updates',  value: null,      icon: 'chevron-right' },
    { label: 'Update history log', value: null,      icon: 'chevron-right' },
  ]

  const securityItems = [
    { label: 'Session timeout setting',    icon: 'chevron-right' },
    { label: 'IP whitelist',               icon: 'chevron-right' },
    { label: 'Two-factor authentication',  icon: 'chevron-right' },
    { label: 'Password policy',            icon: 'chevron-right' },
  ]

  return (
    <>
      <AppHeader
        title="Settings"
        rightIcon={<Icon name="magnify"    size={24} color="#1A1A1A" />}
        leftIcon={<Icon  name="arrow-left" size={24} color="#1A1A1A" />}
        onRightPress={() => console.log('Search')}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />

      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* ── App Settings ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            {appSettings.map((item, index) => (
              <View
                key={index}
                style={[styles.settingRow, index === appSettings.length - 1 && styles.lastRow]}
              >
                {item.sublabel ? (
                  <>
                    <TouchableOpacity style={styles.logoPlaceholder} onPress={handleUpdateAppImage}>
                      {appImage ? (
                        <FastImage source={{ uri: appImage }} style={styles.logoImage} />
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
                  <View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    {item.value ? <Text style={styles.settingValue}>{item.value}</Text> : null}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* ── General ──────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            {generalSettings.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.settingRow, index === generalSettings.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'Time format') setTimeFormatVisible(true)
                  if (item.label === 'Date Format') setDateFormatVisible(true)
                  if (item.label === 'Currency')    setCurrencyVisible(true)
                }}
              >
                <View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value ? <Text style={styles.settingValue}>{item.value}</Text> : null}
                </View>
                {item.icon ? <Icon name={item.icon} size={20} color="#999" /> : null}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Branches ─────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Branches</Text>
            {branchesItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.settingRow, index === branchesItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'List of branches')          navigation.navigate('ListBranches')
                  if (item.label === 'Add branch')                 navigation.navigate('AddBranch')
                  if (item.label === 'Delete branch')              navigation.navigate('DeleteBranch')
                  if (item.label === 'Branch manager assignment')  navigation.navigate('BranchManagerAssignment')
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {'value' in item && item.value
                    ? <Text style={styles.settingValue}>{item.value}</Text>
                    : null}
                </View>
                {'action' in item && item.action ? (
                  <View style={styles.actionButton}>
                    <Text style={styles.actionText}>{item.action}</Text>
                  </View>
                ) : item.icon ? (
                  <Icon name={item.icon} size={20} color="#999" />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Roles & Permissions ───────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Roles & Permissions</Text>
            {rolesItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.settingRow, index === rolesItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'Delete role') navigation.navigate('DeleteRole')
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {'value' in item && item.value
                    ? <Text style={styles.settingValue}>{item.value}</Text>
                    : null}
                </View>
                {'action' in item && item.action ? (
                  <View style={styles.actionButton}>
                    <Text style={styles.actionText}>{item.action}</Text>
                  </View>
                ) : item.icon ? (
                  <Icon name={item.icon} size={20} color="#999" />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Email & Notifications ─────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email & Notifications</Text>
            {emailItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.settingRow, index === emailItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'SMTP settings')   navigation.navigate('SMTP')
                  if (item.label === 'Email templates') navigation.navigate('EmailTemplates')
                }}
              >
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.icon ? <Icon name={item.icon} size={20} color="#999" /> : null}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Database Backup ───────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database Backup</Text>
            {databaseItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.settingRow, index === databaseItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'Download backup') navigation.navigate('DatabaseBackup')
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value ? <Text style={styles.settingValue}>{item.value}</Text> : null}
                </View>
                {item.toggle ? (
                  <Switch
                    value={autoBackup}
                    onValueChange={(val) => { dispatch(setAutoBackup(val)); }}
                    trackColor={{ false: '#ccc', true: '#E10600' }}
                    thumbColor={autoBackup ? '#E10600' : '#f4f3f4'}
                  />
                ) : item.icon ? (
                  <Icon name={item.icon} size={20} color="#999" />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── App Updates ───────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Updates</Text>
            {appUpdateItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.settingRow, index === appUpdateItems.length - 1 && styles.lastRow]}
              >
                <View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value ? <Text style={styles.settingValue}>{item.value}</Text> : null}
                </View>
                {item.icon ? <Icon name={item.icon} size={20} color="#999" /> : null}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Security ─────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            {securityItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.settingRow, index === securityItems.length - 1 && styles.lastRow]}
                onPress={() => {
                  if (item.label === 'Session timeout setting') navigation.navigate('SecuritySettings')
                }}
              >
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.icon ? <Icon name={item.icon} size={20} color="#999" /> : null}
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>

      <TimeFormatModal
        visible={timeFormatVisible}
        onClose={() => setTimeFormatVisible(false)}
        onSelect={setTimeFormat}
        currentFormat={timeFormat}
      />
      <DateFormatModal
        visible={dateFormatVisible}
        onClose={() => setDateFormatVisible(false)}
        onSelect={setDateFormat}
        currentFormat={dateFormat}
      />
      <CurrencyModal
        visible={currencyVisible}
        onClose={() => setCurrencyVisible(false)}
        onSelect={setCurrency}
        currentCurrency={currency}
      />
    </>
  )
}

export default Settings

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8F8F8' },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 50 },

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
  lastRow: { borderBottomWidth: 0 },

  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E10600',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  logoImage:  { width: '100%', height: '100%', borderRadius: 8, resizeMode: 'cover' },
  cameraIcon: { position: 'absolute', bottom: -2, right: -2 },

  settingLabel: { fontSize: 14, color: '#333', fontWeight: '500', marginBottom: 2 },
  settingValue: { fontSize: 12, color: '#999', marginTop: 2 },

  actionButton: {
    backgroundColor: '#E10600',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
})