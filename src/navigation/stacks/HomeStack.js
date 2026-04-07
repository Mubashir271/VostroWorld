import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../../screens/home';
import { defaultStackOptions } from '../NavigationOptions';
// import HomeScreen from '../../screens/home/HomeScreen';
// import DashboardScreen from '../../screens/home/DashboardScreen';
// import MemberDetailsScreen from '../../screens/shared/MemberDetailsScreen';
// import { defaultStackOptions } from '../navigationOptions';

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}
    >
    {/* //   <Stack.Screen 
    //     name="HomeScreen" 
    //     component={HomeScreen}
    //     options={{ title: 'Vostro Admin' }}
    //   /> */}
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
      
      />
    {/* //   <Stack.Screen 
    //     name="MemberDetails" 
    //     component={MemberDetailsScreen}
    //     options={{ title: 'Member Details' }}
    //   /> */}
    </Stack.Navigator>
  );
};

export default HomeStack;