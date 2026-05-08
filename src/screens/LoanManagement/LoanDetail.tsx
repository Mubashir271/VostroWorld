import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../redux/slices/snackbarSlice';

interface LoanData {
  id: string;
  employeeName: string;
  amount: number;
  remaining: number;
  status: string;
}

const LoanDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  const [installments, setInstallments] = useState([
    { month: 'Jan', status: 'Paid' },
    { month: 'Feb', status: 'Paid' },
    { month: 'Mar', status: 'Pending' },
  ]);

  const loanData = (route.params as any)?.loanData as LoanData || {
    employeeName: 'Employee Name',
    amount: 500,
    remaining: 200,
    status: 'Active',
  };

  const handleMarkAsPaid = () => {
    // Find the first pending installment and mark it as paid
    const pendingIndex = installments.findIndex(inst => inst.status === 'Pending');
    
    if (pendingIndex !== -1) {
      const updatedInstallments = [...installments];
      updatedInstallments[pendingIndex].status = 'Paid';
      setInstallments(updatedInstallments);
      
      // Show success snackbar
      dispatch(showSnackbar({ 
        message: `${updatedInstallments[pendingIndex].month} installment marked as paid!`, 
        type: 'success' 
      }));
      
      // Navigate back after a short delay to show the snackbar
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } else {
      // All installments are paid
      dispatch(showSnackbar({ 
        message: 'All installments are already paid!', 
        type: 'info' 
      }));
    }
  };

  return (
    <>
      <AppHeader
        title="Loan Detail"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Employee Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Employee</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldValue}>{loanData.employeeName}</Text>
            </View>
          </View>

          {/* Loan Amount Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loan</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldValue}>Loan: ${loanData.amount}</Text>
              <Text style={styles.fieldValue}>Paid: ${loanData.amount - loanData.remaining}</Text>
              <Text style={styles.fieldValue}>Remaining:${loanData.remaining}</Text>
            </View>
          </View>

          {/* Installments Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Installments:</Text>
            <View style={styles.fieldContainer}>
              {installments.map((installment, index) => (
                <Text key={index} style={styles.installmentItem}>
                  -{installment.month}: {installment.status}
                </Text>
              ))}
            </View>
          </View>

          {/* Mark as Paid Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.markPaidButton}
              onPress={handleMarkAsPaid}
            >
              <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* Bottom Tab Navigation */}
      </SafeAreaView>
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

export default LoanDetail

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

  fieldValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  installmentItem: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },

  markPaidButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  markPaidButtonText: {
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
