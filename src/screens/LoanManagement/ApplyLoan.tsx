import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native'
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

const ApplyLoan = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const loanData = (route.params as any)?.loanData as LoanData || {
    employeeName: 'Employee Name',
  };

  const [loanAmount, setLoanAmount] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    console.log('Submit loan application', {
      loanAmount,
      repaymentMonths,
      reason,
    });
    
    dispatch(showSnackbar({ message: 'Loan request submitted successfully!', type: 'success' }));
    
    navigation.goBack();
  };

  return (
    <>
      <AppHeader
        title="Apply Loan"
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
              <Text style={styles.fieldLabel}>Employee</Text>
              <View style={styles.displayField}>
                <Text style={styles.displayFieldText}>{loanData.employeeName}</Text>
              </View>
            </View>
          </View>

          {/* Loan Amount Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loan Amount</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter loan amount"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={loanAmount}
              onChangeText={setLoanAmount}
            />
          </View>

          {/* Repayment Duration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Repayment Duration (months)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter number of months"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={repaymentMonths}
              onChangeText={setRepaymentMonths}
            />
          </View>

          {/* Start Data Section - placeholder for date picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start Data</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
            >
              <Text style={[styles.datePickerText, styles.placeholderText]}>
                {'Select Data'}
              </Text>
              <Icon name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Reason Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for loan"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
            />
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Create Loan</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default ApplyLoan

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

  fieldContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  fieldLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },

  displayField: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  displayFieldText: {
    fontSize: 14,
    color: '#666',
  },

  textInput: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    fontSize: 14,
    color: '#333',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  datePickerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },

  placeholderText: {
    color: '#999',
  },

  reasonInput: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },

  submitButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})
