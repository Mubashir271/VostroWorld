// Navigation.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View } from 'react-native';
import Splash from '../../screens/AuthScreens/Splash';
import Login from '../../screens/AuthScreens/Login';
import Verification from '../../screens/AuthScreens/Verification';
import SMS from '../../screens/AuthScreens/Sms';
import Email from '../../screens/AuthScreens/Email';
import SecurityQuestions from '../../screens/AuthScreens/SecurityQuestions';
import ForgotPassword from '../../screens/AuthScreens/ForgotPassword';
import forgotsms from '../../screens/AuthScreens/ForgotPassword/forgotemail';
import Forgotsms from '../../screens/AuthScreens/ForgotPassword/forgotemail';
import Forgotphone from '../../screens/AuthScreens/ForgotPassword/forgotphone';
import Forgotquestions from '../../screens/AuthScreens/ForgotPassword/forgotquestions';
import ForgotEmail from '../../screens/AuthScreens/ForgotPassword/forgotemail';
import CreateNewPassword from '../../screens/AuthScreens/CreateNewPassword';
import ResetSuccess from '../../screens/AuthScreens/ResetSuccess';
import WelcomeAdminScreen from '../../screens/AuthScreens/WelcomeAdmin';
import { RegistrationScreen } from '../../screens/AuthScreens/Registration';
import DashboardScreen from '../../screens/home';
import DrawerNavigation from '../DrawerNavigation';
import NewMemberRegistrationScreen from '../../screens/NewMemberRegistration';
import NotificationScreen from '../../screens/Notification';
import NewPackage from '../../screens/NewPackage';
import Settings from '../../screens/Settings';
import SMTP from '../../screens/Settings/smtp';
import DeleteRole from '../../screens/Settings/DeleteRole';
import DeleteBranch from '../../screens/Settings/DeleteBranch';
import PermissionMatrix from '../../screens/Settings/PermissionMatrix';
import EmailTemplates from '../../screens/Settings/EmailTemplates';
import DatabaseBackup from '../../screens/Settings/DatabaseBackup';
import SecuritySettings from '../../screens/Settings/SecuritySettings';
import LeaveApplications from '../../screens/LeaveApplications';
import ApplyLeave from '../../screens/LeaveApplications/ApplyLeave';
import LeaveDetail from '../../screens/LeaveApplications/LeaveDetail';
const Stack = createStackNavigator();
// enableScreens();

const AppNavigator = () => {
    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{ headerShown: false }}>
                <Stack.Screen
                    name="Splash"
                    component={Splash}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="WelcomeAdmin"
                    component={WelcomeAdminScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Registration"
                    component={RegistrationScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Login"
                    component={Login}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Verification"
                    component={Verification}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="SMS"
                    component={SMS}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Email"
                    component={Email}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="SecurityQuestions"
                    component={SecurityQuestions}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="ForgotPassword"
                    component={ForgotPassword}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="ForgotEmail"
                    component={ForgotEmail}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="ForgotPhone"
                    component={Forgotphone}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="ForgotQuestions"
                    component={Forgotquestions}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="CreateNewPassword"
                    component={CreateNewPassword}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="ResetSuccess"
                    component={ResetSuccess}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Drawer"
                    component={DrawerNavigation}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="NewMemberRegistration"
                    component={NewMemberRegistrationScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Notifications"
                    component={NotificationScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="NewPackage"
                    component={NewPackage}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Settings"
                    component={Settings}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="SMTP"
                    component={SMTP}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="DeleteRole"
                    component={DeleteRole}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="DeleteBranch"
                    component={DeleteBranch}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="PermissionMatrix"
                    component={PermissionMatrix}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="EmailTemplates"
                    component={EmailTemplates}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="DatabaseBackup"
                    component={DatabaseBackup}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="SecuritySettings"
                    component={SecuritySettings}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="LeaveApplications"
                    component={LeaveApplications}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="ApplyLeave"
                    component={ApplyLeave}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="LeaveDetail"
                    component={LeaveDetail}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </View>
    );
};

export default AppNavigator;