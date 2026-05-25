// // Navigation.js
// import React from 'react';
// import { createStackNavigator } from '@react-navigation/stack';
// import { View } from 'react-native';
// import Splash from '../../screens/AuthScreens/Splash';
// import Login from '../../screens/AuthScreens/Login';
// import Verification from '../../screens/AuthScreens/Verification';
// import SMS from '../../screens/AuthScreens/Sms';
// import Email from '../../screens/AuthScreens/Email';
// import SecurityQuestions from '../../screens/AuthScreens/SecurityQuestions';
// import ForgotPassword from '../../screens/AuthScreens/ForgotPassword';
// import forgotsms from '../../screens/AuthScreens/ForgotPassword/forgotemail';
// import Forgotsms from '../../screens/AuthScreens/ForgotPassword/forgotemail';
// import Forgotphone from '../../screens/AuthScreens/ForgotPassword/forgotphone';
// import Forgotquestions from '../../screens/AuthScreens/ForgotPassword/forgotquestions';
// import ForgotEmail from '../../screens/AuthScreens/ForgotPassword/forgotemail';
// import CreateNewPassword from '../../screens/AuthScreens/CreateNewPassword';
// import ResetSuccess from '../../screens/AuthScreens/ResetSuccess';
// import WelcomeAdminScreen from '../../screens/AuthScreens/WelcomeAdmin';
// import { RegistrationScreen } from '../../screens/AuthScreens/Registration';
// import DashboardScreen from '../../screens/home';
// import DrawerNavigation from '../DrawerNavigation';
// import NewMemberRegistrationScreen from '../../screens/NewMemberRegistration';
// import NotificationScreen from '../../screens/Notification';
// import NewPackage from '../../screens/NewPackage';
// import Settings from '../../screens/Settings';
// import SMTP from '../../screens/Settings/smtp';
// import DeleteRole from '../../screens/Settings/DeleteRole';
// import DeleteBranch from '../../screens/Settings/DeleteBranch';
// import PermissionMatrix from '../../screens/Settings/PermissionMatrix';
// import EmailTemplates from '../../screens/Settings/EmailTemplates';
// import DatabaseBackup from '../../screens/Settings/DatabaseBackup';
// import SecuritySettings from '../../screens/Settings/SecuritySettings';
// import LeaveApplications from '../../screens/LeaveApplications';
// import ApplyLeave from '../../screens/LeaveApplications/ApplyLeave';
// import LeaveDetail from '../../screens/LeaveApplications/LeaveDetail';
// import LoanManagement from '../../screens/LoanManagement';
// import ApplyLoan from '../../screens/LoanManagement/ApplyLoan';
// import LoanDetail from '../../screens/LoanManagement/LoanDetail';
// import Orders from '../../screens/CafeOperations/Orders';
// import NewOrder from '../../screens/CafeOperations/Orders/NewOrder';
// import OrderDetail from '../../screens/CafeOperations/Orders/OrderDetail';
// const Stack = createStackNavigator();
// // enableScreens();

// const AppNavigator = () => {
//     return (
//         <View style={{ flex: 1 }}>
//             <Stack.Navigator
//                 initialRouteName="Splash"
//                 screenOptions={{ headerShown: false }}>
//                 <Stack.Screen
//                     name="Splash"
//                     component={Splash}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="WelcomeAdmin"
//                     component={WelcomeAdminScreen}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="Registration"
//                     component={RegistrationScreen}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="Login"
//                     component={Login}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="Verification"
//                     component={Verification}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="SMS"
//                     component={SMS}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="Email"
//                     component={Email}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="SecurityQuestions"
//                     component={SecurityQuestions}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="ForgotPassword"
//                     component={ForgotPassword}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="ForgotEmail"
//                     component={ForgotEmail}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="ForgotPhone"
//                     component={Forgotphone}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="ForgotQuestions"
//                     component={Forgotquestions}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="CreateNewPassword"
//                     component={CreateNewPassword}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="ResetSuccess"
//                     component={ResetSuccess}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="Drawer"
//                     component={DrawerNavigation}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="NewMemberRegistration"
//                     component={NewMemberRegistrationScreen}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="Notifications"
//                     component={NotificationScreen}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="NewPackage"
//                     component={NewPackage}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="Settings"
//                     component={Settings}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="SMTP"
//                     component={SMTP}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="DeleteRole"
//                     component={DeleteRole}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="DeleteBranch"
//                     component={DeleteBranch}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="PermissionMatrix"
//                     component={PermissionMatrix}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="EmailTemplates"
//                     component={EmailTemplates}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="DatabaseBackup"
//                     component={DatabaseBackup}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="SecuritySettings"
//                     component={SecuritySettings}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="LeaveApplications"
//                     component={LeaveApplications}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="ApplyLeave"
//                     component={ApplyLeave}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="LeaveDetail"
//                     component={LeaveDetail}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="LoanManagement"
//                     component={LoanManagement}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="ApplyLoan"
//                     component={ApplyLoan}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="LoanDetail"
//                     component={LoanDetail}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="Orders"
//                     component={Orders}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="NewOrder"
//                     component={NewOrder}
//                     options={{ headerShown: false }}
//                 />
//                 <Stack.Screen
//                     name="OrderDetail"
//                     component={OrderDetail}
//                     options={{ headerShown: false }}
//                 />
//             </Stack.Navigator>
//         </View>
//     );
// };

// export default AppNavigator;


// Navigation.js
//
// ProtectedScreen wraps any Stack.Screen whose component should be
// inaccessible to non-admin users.  It reads the role from Redux and
// immediately redirects trainers back to the Drawer if they somehow reach
// a restricted route (e.g. via a deep link or back gesture).

// Navigation.js

import React from 'react';
import { View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

// ── Auth screens ──────────────────────────────────────────────────────────────
import Splash from '../../screens/AuthScreens/Splash';
import Login from '../../screens/AuthScreens/Login';
import Verification from '../../screens/AuthScreens/Verification';
import SMS from '../../screens/AuthScreens/Sms';
import Email from '../../screens/AuthScreens/Email';
import SecurityQuestions from '../../screens/AuthScreens/SecurityQuestions';
import ForgotPassword from '../../screens/AuthScreens/ForgotPassword';
import ForgotEmail from '../../screens/AuthScreens/ForgotPassword/forgotemail';
import Forgotphone from '../../screens/AuthScreens/ForgotPassword/forgotphone';
import Forgotquestions from '../../screens/AuthScreens/ForgotPassword/forgotquestions';
import CreateNewPassword from '../../screens/AuthScreens/CreateNewPassword';
import ResetSuccess from '../../screens/AuthScreens/ResetSuccess';
import WelcomeAdminScreen from '../../screens/AuthScreens/WelcomeAdmin';
import { RegistrationScreen } from '../../screens/AuthScreens/Registration';

// ── App screens ───────────────────────────────────────────────────────────────
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
import LoanManagement from '../../screens/LoanManagement';
import ApplyLoan from '../../screens/LoanManagement/ApplyLoan';
import LoanDetail from '../../screens/LoanManagement/LoanDetail';
import Orders from '../../screens/CafeOperations/Orders';
import NewOrder from '../../screens/CafeOperations/Orders/NewOrder';
import OrderDetail from '../../screens/CafeOperations/Orders/OrderDetail';

// ── Access Denied screen ──────────────────────────────────────────────────────
import AccessDenied from '../../screens/AccessDenied';

// ── Permissions ───────────────────────────────────────────────────────────────
import { isAdmin } from '../../config/permissions';
import AttendanceScreen from '../../screens/Attendance';
import MyClientsScreen from '../../screens/MyClientsScreen';
import TrainerCommission from '../../screens/trainer/TrainerCommission';
import TrainerHistory from '../../screens/trainer/TrainerHistory';
import TrainerRoster from '../../screens/trainer/TrainerRoster';
import SessionAttendanceReport from '../../screens/trainer/SessionAttendanceReport';

const Stack = createStackNavigator();

// ─── ProtectedScreen ──────────────────────────────────────────────────────────
// Renders <AccessDenied /> in-place for non-admin users.
// No redirect — the user stays on the screen but sees the access denied UI.

const ProtectedScreen = ({
    component: Component,
    ...rest
}: {
    component: React.ComponentType<any>;
    [key: string]: any;
}) => {
    const profile = useSelector((state: any) => state.user.profile);
    const userIsAdmin = isAdmin(profile?.role);

    if (!userIsAdmin) {
        return <AccessDenied />;
    }

    return <Component {...rest} />;
};

// Wraps a screen so non-admins see <AccessDenied /> instead of the real screen
const protect = (Comp: React.ComponentType<any>) =>
    (props: any) => <ProtectedScreen component={Comp} {...props} />;

// ─── AppNavigator ─────────────────────────────────────────────────────────────

const AppNavigator = () => {
    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{ headerShown: false }}
            >
                {/* ── Public / Auth screens ── */}
                <Stack.Screen name="Splash" component={Splash} />
                <Stack.Screen name="WelcomeAdmin" component={WelcomeAdminScreen} />
                <Stack.Screen name="Registration" component={RegistrationScreen} />
                <Stack.Screen name="Login" component={Login} />
                <Stack.Screen name="Verification" component={Verification} />
                <Stack.Screen name="SMS" component={SMS} />
                <Stack.Screen name="Email" component={Email} />
                <Stack.Screen name="SecurityQuestions" component={SecurityQuestions} />
                <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
                <Stack.Screen name="ForgotEmail" component={ForgotEmail} />
                <Stack.Screen name="ForgotPhone" component={Forgotphone} />
                <Stack.Screen name="ForgotQuestions" component={Forgotquestions} />
                <Stack.Screen name="CreateNewPassword" component={CreateNewPassword} />
                <Stack.Screen name="ResetSuccess" component={ResetSuccess} />

                {/* ── Main app shell ── */}
                <Stack.Screen name="Drawer" component={DrawerNavigation} />

                {/* ── Trainer-allowed screens (no guard) ── */}
                <Stack.Screen name="Notifications" component={NotificationScreen} />
                <Stack.Screen name="LeaveApplications" component={LeaveApplications} />
                <Stack.Screen name="ApplyLeave" component={ApplyLeave} />
                <Stack.Screen name="LeaveDetail" component={LeaveDetail} />
                <Stack.Screen name="LoanManagement" component={LoanManagement} />
                <Stack.Screen name="ApplyLoan" component={ApplyLoan} />
                <Stack.Screen name="LoanDetail" component={LoanDetail} />
                <Stack.Screen name="AttendanceScreen" component={AttendanceScreen} />
                <Stack.Screen name="TrainerHome" component={MyClientsScreen} />
                <Stack.Screen name="TrainerCommission" component={TrainerCommission} />
                <Stack.Screen name="TrainerHistory" component={TrainerHistory} />
                <Stack.Screen name="TrainerRoster" component={TrainerRoster} />
                <Stack.Screen name="SessionAttendanceReport" component={SessionAttendanceReport} />


                {/* ── Admin-only screens → show AccessDenied for non-admins ── */}
                <Stack.Screen name="NewMemberRegistration" component={protect(NewMemberRegistrationScreen)} />
                <Stack.Screen name="NewPackage" component={protect(NewPackage)} />
                <Stack.Screen name="Settings" component={protect(Settings)} />
                <Stack.Screen name="SMTP" component={protect(SMTP)} />
                <Stack.Screen name="DeleteRole" component={protect(DeleteRole)} />
                <Stack.Screen name="DeleteBranch" component={protect(DeleteBranch)} />
                <Stack.Screen name="PermissionMatrix" component={protect(PermissionMatrix)} />
                <Stack.Screen name="EmailTemplates" component={protect(EmailTemplates)} />
                <Stack.Screen name="DatabaseBackup" component={protect(DatabaseBackup)} />
                <Stack.Screen name="SecuritySettings" component={protect(SecuritySettings)} />
                <Stack.Screen name="Orders" component={protect(Orders)} />
                <Stack.Screen name="NewOrder" component={protect(NewOrder)} />
                <Stack.Screen name="OrderDetail" component={protect(OrderDetail)} />
            </Stack.Navigator>
        </View>
    );
};

export default AppNavigator;