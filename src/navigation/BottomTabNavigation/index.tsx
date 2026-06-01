import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';

import {
  AccountTab, HomeTab, MembersTab, PackageTab, ReportsTab,
} from '../../assets/icons';
import { RootState } from '../../redux/store';
import { isAdmin } from '../../config/permissions';

// ── Stacks ───────────────────────────────────────────────────────────────────
import HomeStack from '../stacks/HomeStack';
import PackageStack from '../stacks/PackageStack';
import MembersStack from '../stacks/MembersStack';
import ReportsStack from '../stacks/ReportsStack';
import AccountStack from '../stacks/AccountStack';

// ── Trainer screens ───────────────────────────────────────────────────────────
import MyClientsScreen from '../../screens/MyClientsScreen';
import AttendanceScreen from '../../screens/Attendance';
import TrainerRoster from '../../screens/trainer/TrainerRoster';

const Tab = createBottomTabNavigator();

// Styles defined first so helpers can reference them
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFE5E5',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  icon:     { width: 24, height: 24 },
});

// Icon helpers
const imgIcon = (src: any) =>
  ({ color }: { color: string }) => (
    <Image source={src} style={[styles.icon, { tintColor: color }]} resizeMode="contain" />
  );

const mcIcon = (name: string) =>
  ({ color, size }: { color: string; size: number }) => (
    <Icon name={name} size={size} color={color} />
  );

// Shared tab bar options
const screenOptions = {
  headerShown:           false,
  tabBarActiveTintColor:   '#E63946',
  tabBarInactiveTintColor: '#A0A0A0',
  tabBarStyle:           styles.tabBar,
  tabBarLabelStyle:      styles.tabLabel,
};

// ── Component ─────────────────────────────────────────────────────────────────
const BottomTabNavigation = () => {
  const profile = useSelector((state: RootState) => state.user.profile);
  const userIsAdmin = isAdmin(profile?.role || profile?.type);

  return (
    <Tab.Navigator screenOptions={screenOptions}>

      {/* Shared: Home */}
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarIcon: imgIcon(HomeTab) }}
      />

      {userIsAdmin ? (
        /* ── Admin tabs ── */
        <>
          <Tab.Screen
            name="Members"
            component={MembersStack}
            options={{ tabBarIcon: imgIcon(MembersTab) }}
          />
          <Tab.Screen
            name="Package"
            component={PackageStack}
            options={{ tabBarIcon: imgIcon(PackageTab) }}
          />
          <Tab.Screen
            name="Reports"
            component={ReportsStack}
            options={{ tabBarIcon: imgIcon(ReportsTab) }}
          />
        </>
      ) : (
        /* ── Trainer / Employee tabs ── */
        <>
          <Tab.Screen
            name="MyClients"
            component={MyClientsScreen}
            options={{ tabBarLabel: 'My Clients', tabBarIcon: mcIcon('account-multiple') }}
          />
          <Tab.Screen
            name="Attendance"
            component={AttendanceScreen}
            options={{ tabBarLabel: 'Attendance', tabBarIcon: mcIcon('calendar-check') }}
          />
          <Tab.Screen
            name="Roster"
            component={TrainerRoster}
            options={{ tabBarLabel: 'Roster', tabBarIcon: mcIcon('calendar-text') }}
          />
        </>
      )}

      {/* Shared: Account */}
      <Tab.Screen
        name="Account"
        component={AccountStack}
        options={{ tabBarIcon: imgIcon(AccountTab) }}
      />

    </Tab.Navigator>
  );
};

export default BottomTabNavigation;
