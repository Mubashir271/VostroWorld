import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PackageScreen from '../../screens/package';
import { defaultStackOptions } from '../NavigationOptions';
// import AnalyticsScreen from '../../screens/analytics/AnalyticsScreen';
// import RevenueDetailsScreen from '../../screens/analytics/RevenueDetailsScreen';
// import { defaultStackOptions } from '../navigationOptions';

const Stack = createNativeStackNavigator();

const PackageStack = () => {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen 
        name="PackageScreen" 
        component={PackageScreen}
        options={{ title: 'Analytics' }}
      />
      {/* <Stack.Screen 
        name="RevenueDetails" 
        component={RevenueDetailsScreen}
        options={{ title: 'Revenue Details' }}
      /> */}
    </Stack.Navigator>
  );
};

export default PackageStack;