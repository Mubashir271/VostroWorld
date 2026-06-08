import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../../redux/slices/snackbarSlice';

const NewOrder = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [selectedItems, setSelectedItems] = useState<string[]>(['Coffee x2', 'Sandwich x1']);
  const [showItemInput, setShowItemInput] = useState(false);
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      setSelectedItems([...selectedItems, newItem]);
      setNewItem('');
      setShowItemInput(false);
    }
  };

  const handlePlaceOrder = () => {
    dispatch(showSnackbar({ 
      message: 'Order placed successfully!', 
      type: 'success' 
    }));
    
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  return (
    <>
      <AppHeader
        title="New Order"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Items Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity 
              style={styles.addItemButton}
              onPress={() => setShowItemInput(true)}
            >
              <Text style={styles.addItemText}>Add Item +</Text>
            </TouchableOpacity>

            {showItemInput && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.itemInput}
                  placeholder="Enter item name and quantity"
                  placeholderTextColor="#999"
                  value={newItem}
                  onChangeText={setNewItem}
                />
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddItem}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Selected Items Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Items:</Text>
            <View style={styles.fieldContainer}>
              {selectedItems.map((item, index) => (
                <Text key={index} style={styles.itemText}>
                  -{item}
                </Text>
              ))}
            </View>
          </View>

          {/* Password Policy Section - placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.policyContainer}>
              <Text style={styles.policyText}>Password Policy</Text>
            </View>
          </View>

          {/* Place Order Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.placeOrderButton}
              onPress={handlePlaceOrder}
            >
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Bottom Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Icon name="home" size={24} color="#E10600" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
        >
          <Icon name="package-variant" size={24} color="#999" />
          <Text style={styles.tabLabel}>Package</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
        >
          <Icon name="account-group" size={24} color="#999" />
          <Text style={styles.tabLabel}>Members</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
        >
          <Icon name="chart-box" size={24} color="#999" />
          <Text style={styles.tabLabel}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
        >
          <Icon name="account" size={24} color="#999" />
          <Text style={styles.tabLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

export default NewOrder

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

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#E10600',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  addItemButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  addItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  itemInput: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    fontSize: 13,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  addButton: {
    backgroundColor: '#E10600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  fieldContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },

  itemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  policyContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  policyText: {
    fontSize: 14,
    color: '#666',
  },

  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },

  placeOrderButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeOrderButtonText: {
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
