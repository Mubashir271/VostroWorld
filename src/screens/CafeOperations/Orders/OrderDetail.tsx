import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import AppHeader from '../../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

interface OrderData {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
}

const OrderDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const orderData = (route.params as any)?.orderData as OrderData || {
    orderNumber: '1023',
    amount: 25,
    status: 'completed',
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
            <View style={styles.fieldContainer}>
              <Text style={styles.itemText}>-Coffee x2</Text>
              <Text style={styles.itemText}>-sandwich x1</Text>
            </View>
          </View>

          {/* Order Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Info:</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.infoText}>Total: ${orderData.amount}</Text>
              <Text style={styles.infoText}>Status: {orderData.status}</Text>
            </View>
          </View>

          {/* Print Receipt Button */}
          {/* <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.printButton}>
              <Text style={styles.printButtonText}>Print Receipt</Text>
            </TouchableOpacity>
          </View> */}

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

export default OrderDetail

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F8F8' 
  },
  scroll: { 
    flex: 1 
  },
  scrollContent: { 
    paddingBottom: 20,
    paddingTop: 0,
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

  infoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },

  printButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  printButtonText: {
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
