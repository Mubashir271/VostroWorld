// src/navigation/TrainerStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TrainerHome from '../../screens/trainer/TrainerHome';
import MarkAttendance from '../../screens/trainer/MarkAttendance';
import TrainerCommission from '../../screens/trainer/TrainerCommission';
import TrainerHistory from '../../screens/trainer/TrainerHistory';
import TrainerRoster from '../../screens/trainer/TrainerRoster';
import SessionAttendanceReport from '../../screens/trainer/SessionAttendanceReport';

const Stack = createNativeStackNavigator();

const TrainerStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrainerHome" component={TrainerHome} />
      <Stack.Screen name="MarkAttendance" component={MarkAttendance} />
      <Stack.Screen name="TrainerCommission" component={TrainerCommission} />
      <Stack.Screen name="TrainerHistory" component={TrainerHistory} />
      <Stack.Screen name="TrainerRoster" component={TrainerRoster} />
      <Stack.Screen name="SessionAttendanceReport" component={SessionAttendanceReport} />
    </Stack.Navigator>
  );
};

export default TrainerStack;