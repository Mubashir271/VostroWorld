import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native'
import { launchImageLibrary } from 'react-native-image-picker'
import FastImage from '@d11/react-native-fast-image'
import DeviceInfo from 'react-native-device-info'
import React, { useCallback, useEffect, useState } from 'react'
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import { RootState } from '../../redux/store';
import { performLogout } from '../../utils/logout';
import { isEmployee, isNutritionist, isTrainer, isGeneralTrainer, isPhysio, roleLabelOf } from '../../config/permissions';
import { getStaffDetail, updateStaffProfile } from '../../api/employeeDashboard';
import { patchProfile, bumpAvatarVersion, clearAppImage } from '../../redux/slices/userSlice';
import { avatarSource as avatarSourceOf } from '../../utils/avatar';
import { canEditOwnProfile, openProfileEdit } from '../../utils/profileEdit';


const AccountScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);

  const { profile, appImage, avatarVersion } = useSelector(
    (state: RootState) => state.user
  );

  // Pull-to-refresh re-reads the staff record (/v1/auth/get/{id}) and copies
  // name, email, phone and photo into the stored profile, so a change made on
  // the web shows up here, in the drawer and on Home.
  const onRefresh = useCallback(async () => {
    const id = Number(profile?.id ?? 0);
    if (!id) return;
    setRefreshing(true);
    try {
      const res = await getStaffDetail(id, Number(profile?.branchId) || 0);
      const rec = Array.isArray(res?.data) ? res.data[0] : res?.data;
      if (rec) {
        dispatch(patchProfile({
          firstName: rec.first_name ?? profile?.firstName,
          lastName: rec.last_name ?? profile?.lastName,
          email: rec.email ?? profile?.email,
          phone: rec.phone ?? profile?.phone,
          image: rec.image ?? profile?.image,
        }));
        const label = String(rec.designation ?? '').trim();
        if (label && label !== 'null') setDesignation(label);
      }
    } catch (error) {
      console.log('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, profile]);

  const canEdit = canEditOwnProfile(profile?.role);

  // Photo-only change, straight from this screen: pick from the library and
  // upload just the image (POST /v1/auth/update/{id} with `file` — the same
  // call the Employee Dashboard makes; empty fields are not sent, so nothing
  // else on the record changes). The new URL is then re-read and stored, which
  // updates the drawer, Home and this screen at once.
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const changePhoto = () => {
    const id = Number(profile?.id ?? 0);
    if (!id || uploadingPhoto) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async res => {
      const a = res.assets?.[0];
      if (res.didCancel || res.errorCode || !a?.uri) return;
      setUploadingPhoto(true);
      try {
        await updateStaffProfile(id, {}, { uri: a.uri, type: a.type, fileName: a.fileName });
        // A device-only photo picked in Settings would keep hiding the new one.
        dispatch(clearAppImage());
        try {
          const sd = await getStaffDetail(id, Number(profile?.branchId) || 0);
          const rec = Array.isArray(sd?.data) ? sd.data[0] : sd?.data;
          if (rec?.image) dispatch(patchProfile({ image: rec.image }));
          dispatch(bumpAvatarVersion());
        } catch {
          // Uploaded fine; still force every avatar to re-fetch.
          dispatch(bumpAvatarVersion());
        }
        Alert.alert('Photo updated', 'Your profile picture has been changed.');
      } catch (err: any) {
        Alert.alert('Upload failed', err?.response?.data?.message || 'Could not update your photo.');
      } finally {
        setUploadingPhoto(false);
      }
    });
  };
  const userIsNutritionist = isNutritionist(profile?.role);
  // Settings is not part of these roles' surface — the blank/Employee role's
  // whole app is the Employee Dashboard, matching the web's single menu item,
  // and Settings is not enabled for the trainer account either.
  // The General Trainer's whole surface is Employee Dashboard + GT Dashboard
  // (confirmed live 2026-09-23 from role 17's own menu-access), so Settings is
  // hidden for them too.
  const hideSettings =
    userIsNutritionist || isEmployee(profile?.role) || isTrainer(profile?.role) || isPhysio(profile?.role)
    || isGeneralTrainer(profile?.role);

  // /v1/auth/app-login carries designation_id (126) but not the label, so the
  // screen used to read "Designation 126". /v1/auth/get/{id} does carry it
  // ("Executive Director"), so fetch the record for the text.
  const [designation, setDesignation] = useState('');
  useEffect(() => {
    const id = Number(profile?.id ?? 0);
    if (!id) return;
    let cancelled = false;
    getStaffDetail(id, Number(profile?.branchId) || 0)
      .then(res => {
        if (cancelled) return;
        const rec = Array.isArray(res?.data) ? res.data[0] : res?.data;
        const label = String(rec?.designation ?? '').trim();
        if (label && label !== 'null') setDesignation(label);
      })
      .catch(() => {
        // Non-fatal: the id fallback below still renders something.
      });
    return () => { cancelled = true; };
  }, [profile?.id, profile?.branchId]);
  const avatarSource = avatarSourceOf(profile?.image, appImage, avatarVersion);
  const firstName = profile?.firstName || '';
  const lastName = profile?.lastName || '';

  const profileName =
    `${firstName} ${lastName}`.trim() || 'User';

  // Resolves what sits under the name. `role`/`type` from app-login are ids
  // ("9"), not labels — a digits-only value must never reach the screen.
  const roleLabel = designation || roleLabelOf(profile?.role, profile?.type);

  const profileData = {
    name: profileName,

    // /v1/auth/app-login returns `type` as a role id ("9"), not a label, so
    // rendering it first put a bare number under the name for every role that
    // has one. Prefer the real job title (fetched above), then a mapped role
    // label, and only accept `type`/`role` verbatim when they are actually
    // text rather than digits.
    role: roleLabel,

    verified: true,

    branch:
      profile?.branchName ||
      (profile?.branchId
        ? `Branch ${profile.branchId}`
        : 'Main Branch'),

    email: profile?.email || 'N/A',

    phone: profile?.phone || 'N/A',

    username:
      profile?.username ||
      profileName.toLowerCase().replace(/\s+/g, ''),

    joiningDate:
      profile?.joining ||
      profile?.appointmentDate ||
      'N/A',

    // Never render "Designation 126": when /v1/auth/get/{id} hasn't answered
    // with the label, fall back to the role label rather than the raw id.
    jobTitle: designation || roleLabel,
  };

  const handleLogout = () => {
    performLogout();
    navigation.replace('WelcomeAdmin');
  };




  const accountSections = [
    { label: 'Email', value: profileData.email },
    { label: 'Phone', value: profileData.phone },
    { label: 'Username', value: profileData.username },
    { label: 'Date of Joining', value: profileData.joiningDate },
    { label: 'Designing/Job Title', value: profileData.jobTitle },
  ];

  // `onPress` is optional: rows without one are informational.
  const aboutAppItems: { label: string; value?: string; icon?: string; onPress?: () => void }[] = [
    { label: 'App version', value: DeviceInfo.getVersion() },
    { label: 'Build number', value: DeviceInfo.getBuildNumber() },
    { label: 'Check for updates', icon: 'chevron-right' },
    { label: 'Legal', icon: 'chevron-right' },
  ];

  return (
    <>
      <AppHeader
        title="My Account"
        // leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        leftIcon={<BurgerSVG width={24} height={24} />}
        rightIcon={hideSettings ? undefined : <Icon name="cog-outline" size={24} color="#1A1A1A" />}
        // onLeftPress={() => navigation.goBack()}
        onLeftPress={() => navigation.openDrawer()}
        onRightPress={hideSettings ? undefined : () => navigation.navigate('Settings')}
        backgroundColor="#FFE5E5"
      />
      <View style={styles.container}>
        <ScrollView style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#E10600']}
              tintColor="#E10600"
            />
          }>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            {/* Tapping the photo (or its camera badge) changes just the photo. */}
            <TouchableOpacity
              style={styles.profileContent}
              onPress={changePhoto}
              disabled={uploadingPhoto}
              activeOpacity={0.85}
              accessibilityLabel="Change profile photo"
            >
              <FastImage
                source={avatarSource}
                style={styles.profileImage}
              />
              {uploadingPhoto ? (
                <View style={styles.photoBusy}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
              <View style={styles.editBadge}>
                <Icon name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>{profileData.name}</Text>
            <TouchableOpacity style={styles.roleTag}>
              <Text style={styles.roleText}>{profileData.role}</Text>
            </TouchableOpacity>
            <View style={styles.verificationRow}>
              <Icon name="check-circle" size={18} color="#27AE60" />
              <Text style={styles.verificationText}>Verified</Text>
            </View>
            <Text style={styles.branchText}>{profileData.branch}</Text>
            {canEdit ? (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openProfileEdit(navigation, profile?.role)}
                activeOpacity={0.8}
              >
                <Icon name="account-edit-outline" size={16} color="#E10600" />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : null}
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

          {/* About App */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About App</Text>
            {aboutAppItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.listItem} onPress={item.onPress}>
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
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete Account</Text>
            </TouchableOpacity> */}
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
  photoBusy: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E10600',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#E10600',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  editBtnText: {
    color: '#E10600',
    fontSize: 13,
    fontWeight: '700',
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