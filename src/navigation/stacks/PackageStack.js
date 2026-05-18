import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PackageScreen from '../../screens/package';
import { defaultStackOptions } from '../NavigationOptions';
import { useRouteGuard } from '../../hooks/useRouteGuard';
import AccessDenied from '../../screens/AccessDenied';
// import AnalyticsScreen from '../../screens/analytics/AnalyticsScreen';
// import RevenueDetailsScreen from '../../screens/analytics/RevenueDetailsScreen';
// import { defaultStackOptions } from '../navigationOptions';

const Stack = createNativeStackNavigator();

const PackageStack = () => {
    const { accessDenied } = useRouteGuard('Package');
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen
        name="PackageScreen"
        options={{ title: 'Analytics' }}
      >
        {() =>
          accessDenied ? <AccessDenied /> : <PackageScreen />
        }
      </Stack.Screen>
      {/* <Stack.Screen 
        name="RevenueDetails" 
        component={RevenueDetailsScreen}
        options={{ title: 'Revenue Details' }}
      /> */}
    </Stack.Navigator>
  );
};

export default PackageStack;