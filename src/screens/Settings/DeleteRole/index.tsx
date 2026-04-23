import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';

const DeleteRole = () => {
  const navigation = useNavigation();
  const [roleName, setRoleName] = useState('abc@gamil.com');
  const [description, setDescription] = useState('This is test mail');
  const [permissions, setPermissions] = useState('Open Permission Matrix');

  const handleContinue = () => {
    if (!roleName || !description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    Alert.alert('Success', 'Role deleted successfully!');
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleOpenPermissionMatrix = () => {
    (navigation as any).navigate('PermissionMatrix');
  };

  return (
    <>
      <AppHeader
        title="Delete Role"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Role Name Field */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Role name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter role name"
              placeholderTextColor="#999"
              value={roleName}
              onChangeText={setRoleName}
              autoCapitalize="none"
            />
          </View>

          {/* Description Field */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.bodyInput]}
              placeholder="Enter description"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Permissions Field */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Permissions</Text>
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={handleOpenPermissionMatrix}
            >
              <Text style={styles.permissionText}>{permissions}</Text>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.spacer} />

          {/* Continue Button */}
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default DeleteRole

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#333',
  },
  bodyInput: {
    paddingTop: 14,
    minHeight: 100,
  },
  permissionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  spacer: {
    height: 40,
  },
  continueBtn: {
    backgroundColor: '#E10600',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E10600',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#E10600',
    fontSize: 16,
    fontWeight: '700',
  },
})