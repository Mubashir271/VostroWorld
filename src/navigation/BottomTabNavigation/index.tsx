import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';

import {
  AccountTab, HomeTab, MembersTab, PackageTab, ReportsTab,
} from '../../assets/icons';
import { RootState } from '../../redux/store';
import { isAdmin, isHR, isSales, isNutritionist, isFitnessManager, isEmployee, isTrainer, isGeneralTrainer, isPhysio } from '../../config/permissions';

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
import SessionTrackerScreen from '../../screens/trainer/SessionTrackerScreen';

// ── HR screens ────────────────────────────────────────────────────────────────
import EmployeeMaster from '../../screens/HR/EmployeeMaster';
import EmployeeAttendance from '../../screens/HR/EmployeeAttendance';
import SalaryManagement from '../../screens/SalaryManagement';

// The HR login's tabs: the three Human Resource pages HR opens most, with a
// drawer burger instead of a dead back arrow.
const EmployeesTab = () => <EmployeeMaster asTab />;
const StaffAttendanceTab = () => <EmployeeAttendance asTab />;
const SalaryTab = () => <SalaryManagement asTab />;


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
  const userIsHR = isHR(profile?.role);
  const userIsSales = isSales(profile?.role);
  const userIsNutritionist = isNutritionist(profile?.role);
  const userIsFitnessManager = isFitnessManager(profile?.role);
  const userIsTrainer = isTrainer(profile?.role);
  // Blank role: the web gives this account only the Employee Dashboard, so
  // the trainer tabs (My Clients / Attendance / Roster) must not appear.
  const userIsEmployee = isEmployee(profile?.role);
  // General Trainer (role 17): the web gives them Employee Dashboard and a GT
  // Dashboard and nothing else, so they get the same bare Home + Account tab
  // pair as a blank-role employee — not the personal trainer's My Clients /
  // Attendance / Roster, which is what they used to fall through to.
  const userIsGeneralTrainer = isGeneralTrainer(profile?.role);
  // Physio (role 15): Home (their Physio Dashboard) + Account. Without this
  // they fell through to the trainer's My Clients / Attendance / Roster.
  const userIsPhysio = isPhysio(profile?.role);

  // Sales works the same client/package/report surface as admin, so it gets
  // the same tab set rather than the trainer's My Clients/Attendance/Roster.
  const useAdminTabs = userIsAdmin || userIsSales;

  return (
    <Tab.Navigator screenOptions={screenOptions}>

      {/* Shared: Home */}
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarIcon: imgIcon(HomeTab) }}
      />

      {/* Fitness Manager: Home (their Fitness Dashboard) + Account only — the
          web dropped Nutrition and Session Portal from this login (2026-10-15).
          Physio likewise: their Home tab is the Physio Dashboard. */}
      {userIsEmployee || userIsGeneralTrainer || userIsFitnessManager || userIsPhysio ? null : useAdminTabs ? (
        /* ── Admin / Sales tabs ── */
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
      ) : userIsHR ? (
        /* ── HR tabs: Home is the HR Dashboard ── */
        <>
          <Tab.Screen
            name="EmployeesTab"
            component={EmployeesTab}
            options={{ tabBarLabel: 'Employees', tabBarIcon: mcIcon('account-group') }}
          />
          <Tab.Screen
            name="StaffAttendanceTab"
            component={StaffAttendanceTab}
            options={{ tabBarLabel: 'Attendance', tabBarIcon: mcIcon('calendar-check') }}
          />
          <Tab.Screen
            name="SalaryTab"
            component={SalaryTab}
            options={{ tabBarLabel: 'Salary', tabBarIcon: mcIcon('cash-multiple') }}
          />
        </>
      ) : userIsNutritionist ? (
        /* A nutritionist's Home tab already is the Nutrition Dashboard, and
           they reach everything else from the drawer. */
        null
      ) : (
        /* ── Trainer / Employee tabs ── */
        <>
          {userIsTrainer ? null : (
            <Tab.Screen
              name="MyClients"
              component={MyClientsScreen}
              options={{ tabBarLabel: 'My Clients', tabBarIcon: mcIcon('account-multiple') }}
            />
          )}
          {/* A personal trainer marks sessions rather than staff attendance,
              so role 9 gets Session Tracker in this slot instead. */}
          {userIsTrainer ? (
            <Tab.Screen
              name="SessionTrackerTab"
              component={SessionTrackerScreen}
              options={{ tabBarLabel: 'Sessions', tabBarIcon: mcIcon('clipboard-check-outline') }}
            />
          ) : (
            <Tab.Screen
              name="Attendance"
              component={AttendanceScreen}
              options={{ tabBarLabel: 'Attendance', tabBarIcon: mcIcon('calendar-check') }}
            />
          )}
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
