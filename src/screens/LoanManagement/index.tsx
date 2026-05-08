import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface LoanData {
  id: string;
  employeeName: string;
  amount: number;
  remaining: number;
  status: string;
}

const LoanManagement = () => {
  const navigation = useNavigation<any>();

  const [loans] = useState<LoanData[]>([
    {
      id: '1',
      employeeName: 'Ahmed khan',
      amount: 500,
      remaining: 200,
      status: 'Active',
    },
    {
      id: '2',
      employeeName: 'Sara Ali',
      amount: 300,
      remaining: 300,
      status: 'Pending',
    },
  ]);

  const handleLoanPress = (loan: LoanData) => {
    navigation.navigate('LoanDetail', { loanData: loan });
  };

  const renderLoanCard = (item: LoanData) => {
    return (
      <TouchableOpacity
        style={styles.loanCard}
        onPress={() => handleLoanPress(item)}
      >
        <View style={styles.cardLeft}>
          <View style={styles.cardContent}>
            <Text style={styles.employeeName}>{item.employeeName}</Text>
            <Text style={styles.cardMeta}>
              ${item.amount} | Remaining: ${item.remaining}
            </Text>
          </View>
        </View>
        <Icon name="chevron-right" size={24} color="#999" />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <AppHeader
        title="Loan Management"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Loans List */}
          <View style={styles.loansContainer}>
            {loans.map((loan) => (
              <View key={loan.id}>
                {renderLoanCard(loan)}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Add Loan Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.addLoanButton}
            onPress={() => navigation.navigate('ApplyLoan')}
          >
            <Text style={styles.addLoanButtonText}>Add Loan</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
        {/* Bottom Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tab}>
            <Icon name="home" size={24} color="#E10600" />
            <Text style={styles.tabLabel}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="package-variant" size={24} color="#999" />
            <Text style={styles.tabLabel}>Package</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="account-group" size={24} color="#999" />
            <Text style={styles.tabLabel}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="chart-box" size={24} color="#999" />
            <Text style={styles.tabLabel}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="account" size={24} color="#999" />
            <Text style={styles.tabLabel}>Account</Text>
          </TouchableOpacity>
        </View>
    </>
  )
}

export default LoanManagement

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

  loansContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },

  loanCard: {
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

  cardLeft: {
    flex: 1,
  },

  cardContent: {
    gap: 4,
  },

  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  cardMeta: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },

  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  addLoanButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addLoanButtonText: {
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
