import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReportsScreen from '../../screens/reports';
import { defaultStackOptions } from '../NavigationOptions';
// import ReportsScreen from '../../screens/reports/ReportsScreen';
// import ReportDetailsScreen from '../../screens/reports/ReportDetailsScreen';
// import { defaultStackOptions } from '../navigationOptions';

const Stack = createNativeStackNavigator();

const ReportsStack = () => {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen 
        name="ReportsScreen" 
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
      {/* <Stack.Screen 
        name="ReportDetails" 
        component={ReportDetailsScreen}
        options={{ title: 'Report Details' }}
      /> */}
    </Stack.Navigator>
  );
};

export default ReportsStack;