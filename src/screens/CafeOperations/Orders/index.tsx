import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface OrderData {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
}

const Orders = () => {
  const navigation = useNavigation<any>();

  const [orders] = useState<OrderData[]>([
    {
      id: '1',
      orderNumber: '1023',
      amount: 25,
      status: 'completed',
    },
    {
      id: '2',
      orderNumber: '1024',
      amount: 15,
      status: 'Pending',
    },
  ]);

  const handleOrderPress = (order: OrderData) => {
    navigation.navigate('OrderDetail', { orderData: order });
  };

  const renderOrderCard = (item: OrderData) => {
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
      >
        <View style={styles.cardContent}>
          <Text style={styles.orderNumber}>Order # {item.orderNumber}</Text>
          <Text style={styles.orderMeta}>
            ${item.amount} | {item.status}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color="#999" />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <AppHeader
        title="Orders"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Orders List */}
          <View style={styles.ordersContainer}>
            {orders.map((order) => (
              <View key={order.id}>
                {renderOrderCard(order)}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Create New Order Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.createOrderButton}
            onPress={() => navigation.navigate('NewOrder')}
          >
            <Text style={styles.createOrderButtonText}>Create New Order</Text>
          </TouchableOpacity>
        </View>
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

export default Orders

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
    paddingTop: 16,
  },

  ordersContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },

  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#E10600',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  cardContent: {
    flex: 1,
    gap: 4,
  },

  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  orderMeta: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },

  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  createOrderButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  createOrderButtonText: {
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
