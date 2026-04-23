import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';

interface Permission {
  [key: string]: boolean;
}

interface Permissions {
  [key: string]: Permission;
}

const PermissionMatrix = () => {
  const navigation = useNavigation();
  
  const [permissions, setPermissions] = useState<Permissions>({
    Members: { View: true, Add: true, Edit: true, Delete: false },
    Trainers: { View: true, Add: true, Edit: true, Delete: false },
    Plans: { View: true, Add: false, Edit: false, Delete: false },
    Payments: { View: true, Add: true, Edit: false, Delete: false },
  });

  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [selectedCol, setSelectedCol] = useState<string | null>(null);

  const roles = Object.keys(permissions);
  const actions = ['View', 'Add', 'Edit', 'Delete'];

  const togglePermission = (role: string, action: string) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [action]: !prev[role][action]
      }
    }));
  };

  const handleSelectRow = (role: string) => {
    setSelectedRow(selectedRow === role ? null : role);
  };

  const handleSelectColumn = (action: string) => {
    setSelectedCol(selectedCol === action ? null : action);
  };

  const handleSave = () => {
    Alert.alert('Success', 'Permission matrix saved successfully!');
  };

  return (
    <>
      <AppHeader
        title="Permission Matrix"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>Permissions (Admin)</Text>

          {/* Permission Matrix Table */}
          <View style={styles.tableContainer}>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.roleHeaderCell}>
                <Text style={styles.headerText}></Text>
              </View>
              {actions.map((action) => (
                <TouchableOpacity 
                  key={action} 
                  style={[
                    styles.actionHeaderCell,
                    selectedCol === action && styles.selectedColHeader
                  ]}
                  onPress={() => handleSelectColumn(action)}
                >
                  <Text style={styles.headerText}>{action}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Data Rows */}
            {roles.map((role) => (
              <View key={role} style={styles.dataRow}>
                <TouchableOpacity
                  style={[
                    styles.roleCell,
                    selectedRow === role && styles.selectedRow
                  ]}
                  onPress={() => handleSelectRow(role)}
                >
                  <Text style={styles.roleText}>{role}</Text>
                </TouchableOpacity>

                {actions.map((action) => (
                  <TouchableOpacity
                    key={`${role}-${action}`}
                    style={[
                      styles.permissionCell,
                      selectedCol === action && styles.selectedCol
                    ]}
                    onPress={() => togglePermission(role, action)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        permissions[role][action] && styles.checkedCheckbox
                      ]}
                    >
                      {permissions[role][action] && (
                        <Icon name="check" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Selection Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.selectBtn}
              onPress={() => {
                // Select all permissions in selected row
                if (selectedRow) {
                  const newPerms = { ...permissions[selectedRow] };
                  Object.keys(newPerms).forEach(action => {
                    newPerms[action] = true;
                  });
                  setPermissions(prev => ({
                    ...prev,
                    [selectedRow]: newPerms
                  }));
                }
              }}
            >
              <Text style={styles.selectBtnText}>Select Row</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.selectBtn}
              onPress={() => {
                // Select all permissions in selected column
                if (selectedCol) {
                  const newPerms = { ...permissions };
                  Object.keys(newPerms).forEach(role => {
                    newPerms[role][selectedCol] = true;
                  });
                  setPermissions(newPerms);
                }
              }}
            >
              <Text style={styles.selectBtnText}>Select Column</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.spacer} />

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default PermissionMatrix

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  roleHeaderCell: {
    width: 90,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  actionHeaderCell: {
    width: 70,
    paddingHorizontal: 6,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColHeader: {
    backgroundColor: '#FFE5E5',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  roleCell: {
    width: 90,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  selectedRow: {
    backgroundColor: '#FFE5E5',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  permissionCell: {
    width: 70,
    paddingHorizontal: 6,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCol: {
    backgroundColor: '#FFE5E5',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#E10600',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkedCheckbox: {
    backgroundColor: '#E10600',
    borderColor: '#E10600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  selectBtn: {
    flex: 1,
    backgroundColor: '#E10600',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
  saveBtn: {
    backgroundColor: '#E10600',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
