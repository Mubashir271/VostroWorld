import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MembersScreen from '../../screens/members';
import { defaultStackOptions } from '../NavigationOptions';
// import MembersScreen from '../../screens/members/MembersScreen';
// import MemberDetailsScreen from '../../screens/shared/MemberDetailsScreen';
// import AddMemberScreen from '../../screens/members/AddMemberScreen';
// import EditMemberScreen from '../../screens/members/EditMemberScreen';
// import { defaultStackOptions } from '../navigationOptions';

const Stack = createNativeStackNavigator();

const MembersStack = () => {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen 
        name="MembersScreen" 
        component={MembersScreen}
        options={{ title: 'Members' }}
      />
      {/* <Stack.Screen 
        name="MemberDetails" 
        component={MemberDetailsScreen}
        options={{ title: 'Member Details' }}
      />
      <Stack.Screen 
        name="AddMember" 
        component={AddMemberScreen}
        options={{ title: 'Add Member' }}
      />
      <Stack.Screen 
        name="EditMember" 
        component={EditMemberScreen}
        options={{ title: 'Edit Member' }}
      /> */}
    </Stack.Navigator>
  );
};

export default MembersStack;