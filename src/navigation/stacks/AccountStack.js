import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import SettingsScreen from '../../screens/settings/SettingsScreen';
// import ProfileScreen from '../../screens/settings/ProfileScreen';
// import BranchesScreen from '../../screens/settings/BranchesScreen';
// import AppSettingsScreen from '../../screens/settings/AppSettingsScreen';
import AccountScreen from '../../screens/account';
import defaultStackOptions from './../NavigationOptions';

const Stack = createNativeStackNavigator();

const AccountStack = () => {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen 
        name="AccountScreen" 
        component={AccountScreen}
        options={{ headerShown: false }}
      />
      {/* <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="Branches" 
        component={BranchesScreen}
        options={{ title: 'Branches' }}
      />
      <Stack.Screen 
        name="AppSettings" 
        component={AppSettingsScreen}
        options={{ title: 'App Settings' }}
      /> */}
    </Stack.Navigator>
  );
};

export default AccountStack;