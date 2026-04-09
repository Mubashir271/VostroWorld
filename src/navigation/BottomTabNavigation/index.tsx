import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet } from 'react-native';

import { 
  AccountTab, 
  HomeTab, 
  MembersTab, 
  PackageTab, 
  ReportsTab 
} from '../../assets/icons';

import HomeStack from '../stacks/HomeStack';
import PackageStack from '../stacks/PackageStack';
import MembersStack from '../stacks/MembersStack';
import ReportsStack from '../stacks/ReportsStack';
import AccountStack from '../stacks/AccountStack';

const Tab = createBottomTabNavigator();

const BottomTabNavigation = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E63946',     // Red when active
        tabBarInactiveTintColor: '#A0A0A0',   // Gray when inactive
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Image 
              source={focused ? HomeTab : HomeTab}   // You can make separate active/inactive icons later
              style={[styles.tabIcon, { tintColor: color }]} 
              resizeMode="contain" 
            />
          ),
        }}
      />

      <Tab.Screen
        name="Package"
        component={PackageStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Image 
              source={focused ? PackageTab : PackageTab}
              style={[styles.tabIcon, { tintColor: color }]} 
              resizeMode="contain" 
            />
          ),
        }}
      />

      <Tab.Screen
        name="Members"
        component={MembersStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Image 
              source={focused ? MembersTab : MembersTab}
              style={[styles.tabIcon, { tintColor: color }]} 
              resizeMode="contain" 
            />
          ),
        }}
      />

      <Tab.Screen
        name="Reports"
        component={ReportsStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Image 
              source={focused ? ReportsTab : ReportsTab}
              style={[styles.tabIcon, { tintColor: color }]} 
              resizeMode="contain" 
            />
          ),
        }}
      />

      <Tab.Screen
        name="Account"
        component={AccountStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Image 
              source={focused ? AccountTab : AccountTab}
              style={[styles.tabIcon, { tintColor: color }]} 
              resizeMode="contain" 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFE5E5',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
});

export default BottomTabNavigation;