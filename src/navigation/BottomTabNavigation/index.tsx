import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet } from 'react-native';

import { AccountTab, HomeTab, MembersTab, PackageTab, ReportsTab } from '../../assets/icons';
import HomeStack from '../stacks/HomeStack';
import PackageStack from '../stacks/PackageStack';
import MembersStack from '../stacks/MembersStack';
import ReportsStack from '../stacks/ReportsStack';
import AccountStack from '../stacks/AccountStack';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Home: {
    active: HomeTab,
    inactive: HomeTab,
  },
  Package: {
    active: PackageTab,
    inactive: PackageTab,
  },
  Members: {
    active: MembersTab,
    inactive: MembersTab,
  },
  Reports: {
    active: ReportsTab,
    inactive: ReportsTab,
  },
  Account: {
    active: AccountTab,
    inactive: AccountTab,
  },
};


const TabIcon = ({ name, focused }) => {
  const icon = focused ? tabIcons[name]?.active : tabIcons[name]?.inactive;
  return <Image source={icon} style={styles.tabIcon} resizeMode="contain" />;
};

const BottomTabNavigation = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E63946',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Package"
        component={PackageStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Package" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Members"
        component={MembersStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Members" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Reports" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Account" focused={focused} />,
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