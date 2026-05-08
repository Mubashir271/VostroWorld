import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ReportsScreen from '../../screens/reports';
import TransactionReportScreen from '../../screens/reports/TransactionReport';
import CafeReportScreen from '../../screens/reports/CafeReports';
import TransactionSlipScreen from '../../screens/reports/TransactionSlip';
import TransactionSummaryScreen from '../../screens/reports/TransactionSummary';
import SalesReportScreen from '../../screens/reports/SalesReport';

import { defaultStackOptions } from '../NavigationOptions';

// 👇 Define navigation types
export type ReportsStackParamList = {
  ReportsScreen: undefined;
  TransactionReportScreen: undefined;
  CafeReportScreen: undefined;
  TransactionSummaryScreen: undefined;
  SalesReportScreen: undefined;
  TransactionSlipScreen: undefined;
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

const ReportsStack = () => {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>

      <Stack.Screen
        name="ReportsScreen"
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />

      <Stack.Screen
        name="TransactionReportScreen"
        component={TransactionReportScreen}
        options={{ title: 'Transaction Report' }}
      />

      <Stack.Screen
        name="CafeReportScreen"
        component={CafeReportScreen}
        options={{ title: 'Cafe Report' }}
      />

      <Stack.Screen
        name="TransactionSummaryScreen"
        component={TransactionSummaryScreen}
        options={{ title: 'Summary Report' }}
      />

      <Stack.Screen
        name="SalesReportScreen"
        component={SalesReportScreen}
        options={{ title: 'Sales Report' }}
      />

      <Stack.Screen
        name="TransactionSlipScreen"
        component={TransactionSlipScreen}
        options={{ title: 'Transaction Slip' }}
      />

    </Stack.Navigator>
  );
};

export default ReportsStack;