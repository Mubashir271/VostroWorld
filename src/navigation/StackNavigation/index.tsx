// Navigation.js
//
// ProtectedScreen wraps any Stack.Screen whose component should be
// inaccessible to non-admin users.  It reads the role from Redux and
// immediately redirects trainers back to the Drawer if they somehow reach
// a restricted route (e.g. via a deep link or back gesture).


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
import ListBranches from '../../screens/Settings/ListBranches';
import AddBranch from '../../screens/Settings/AddBranch';
import BranchManagerAssignment from '../../screens/Settings/BranchManagerAssignment';
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
import SalaryManagement from '../../screens/SalaryManagement';
import MySalarySlip from '../../screens/MySalarySlip';
import StaffLoans from '../../screens/StaffLoans';
import StaffFinance from '../../screens/StaffFinance';

// ── Admin screens ─────────────────────────────────────────────────────────────
import ViewClients from '../../screens/Sales/ViewClients';
import ViewFreezing from '../../screens/Sales/ViewFreezing';
import ApprovalsScreen from '../../screens/Sales/Approvals';
import ViewCards from '../../screens/Sales/ViewCards';
import Categories from '../../screens/Sales/Categories';
import SubCategories from '../../screens/Sales/SubCategories';
import AssignCards from '../../screens/Sales/AssignCards';
import ManageTowels from '../../screens/Sales/ManageTowels';
import MembershipPackages from '../../screens/Sales/MembershipPackages';
import GymPackages from '../../screens/Sales/GymPackages';
import TrainerPackages from '../../screens/Sales/TrainerPackages';
import BootcampPackages from '../../screens/Sales/BootcampPackages';
import PhysiotherapyPackages from '../../screens/Sales/PhysiotherapyPackages';
import MassageChair from '../../screens/Sales/MassageChair';
import SmallPTGroupPackages from '../../screens/Sales/SmallPTGroupPackages';
import GXPackages from '../../screens/Sales/GXPackages';
import CFTPackages from '../../screens/Sales/CFTPackages';
import GeneralPackages from '../../screens/Sales/GeneralPackages';
import DetailedPackages from '../../screens/Sales/DetailedPackages';
import HRDashboard from '../../screens/HR/HRDashboard';
import ViewStaff from '../../screens/HR/ViewStaff';
import EmployeeAttendance from '../../screens/HR/EmployeeAttendance';
import StaffDutyHours from '../../screens/HR/StaffDutyHours';
import PTAttendance from '../../screens/HR/PTAttendance';
import SessionPortalHR from '../../screens/HR/SessionPortalHR';
import StaffCommissions from '../../screens/HR/StaffCommissions';
import SalaryComponent from '../../screens/HR/SalaryComponent';
import LeaveQuota from '../../screens/HR/LeaveQuota';
import FinanceDashboard from '../../screens/Finance/FinanceDashboard';
import Expenses from '../../screens/Finance/Expenses';
import AddExpense from '../../screens/Finance/AddExpense';
import ViewCashInHand from '../../screens/Finance/ViewCashInHand';
import KeeneLedger from '../../screens/Finance/KeeneLedger';
import AddKeene from '../../screens/Finance/AddKeene';
import AddLiabilities from '../../screens/Finance/AddLiabilities';
import PayLiabilities from '../../screens/Finance/PayLiabilities';
import ViewLiabilitiesLedger from '../../screens/Finance/ViewLiabilitiesLedger';
import AddG13Cash from '../../screens/Finance/AddG13Cash';
import G13CashLedger from '../../screens/Finance/G13CashLedger';
import AddPettyCash from '../../screens/Finance/AddPettyCash';
import PettyCashLedger from '../../screens/Finance/PettyCashLedger';
import AddCharity from '../../screens/Finance/AddCharity';
import ViewCharityLedger from '../../screens/Finance/ViewCharityLedger';
import DailyExpense from '../../screens/Finance/DailyExpense';
import AddOfficeCash from '../../screens/Finance/AddOfficeCash';
import ViewOfficeLedger from '../../screens/Finance/ViewOfficeLedger';
import GXClasses from '../../screens/Fitness/GXClasses';
import PTRoster from '../../screens/Fitness/PTRoster';
import TimeSlotsScreen from '../../screens/Fitness/TimeSlots';
import ManageAvailabilityScreen from '../../screens/Fitness/ManageAvailability';

// ── Trainer feature screens ───────────────────────────────────────────────────
import TrainerDutyHours from '../../screens/trainer/TrainerDutyHours';
import QualificationsScreen from '../../screens/trainer/QualificationsScreen';
import TrainerDocumentsScreen from '../../screens/trainer/TrainerDocumentsScreen';
import SessionTrackerScreen from '../../screens/trainer/SessionTrackerScreen';
import SOPsScreen from '../../screens/trainer/SOPsScreen';
import ViewFitnessPlans from '../../screens/trainer/ViewFitnessPlans';
import AddFitnessPlan from '../../screens/trainer/AddFitnessPlan';
import ManageExercises from '../../screens/trainer/ManageExercises';

// ── Cafe Operations ───────────────────────────────────────────────────────────
import CafeDashboardScreen from '../../screens/CafeOperations/CafeDashboard';
import CafeCategoriesScreen from '../../screens/CafeOperations/CafeCategories';
import CafeProductsScreen from '../../screens/CafeOperations/CafeProducts';
import CafeDepositsScreen from '../../screens/CafeOperations/CafeDeposits';
import AddClientsDepositScreen from '../../screens/CafeOperations/AddClientsDeposit';
import ClientsAvailableBalanceScreen from '../../screens/CafeOperations/ClientsAvailableBalance';
import DepositsHistoryScreen from '../../screens/CafeOperations/DepositsHistory';
import CafeSalesReportScreen from '../../screens/CafeOperations/CafeSalesReport';
import ManagementPendingsScreen from '../../screens/CafeOperations/ManagementPendings';

// ── Reports ───────────────────────────────────────────────────────────────────
import TransactionReportScreen from '../../screens/reports/TransactionReport';
import CafeReportScreen from '../../screens/reports/CafeReports';
import SalesReportScreen from '../../screens/reports/SalesReport';
import MISReportScreen from '../../screens/reports/MISReport';
import DetailedSalesReportScreen from '../../screens/reports/DetailedSalesReport';
import ClientsReportScreen from '../../screens/reports/ClientsReport';
import SalesClientsReportScreen from '../../screens/Sales/ClientsReport';
import SalesByServicesScreen from '../../screens/reports/SalesByServices';
import SalesExpenseDailyScreen from '../../screens/reports/SalesExpenseDaily';
import SalesByBootcampScreen from '../../screens/reports/SalesByBootcamp';
import StaffAttendanceReportScreen from '../../screens/reports/StaffAttendanceReport';
import ClientsAttendanceScreen from '../../screens/reports/ClientsAttendance';
import FootfallReportScreen from '../../screens/reports/FootfallReport';

// ── Coming Soon placeholder ───────────────────────────────────────────────────
import ComingSoon from '../../screens/ComingSoon';

// ── Nutrition screens ─────────────────────────────────────────────────────────
import NutritionPackagesScreen from '../../screens/Nutrition/NutritionPackages';
import AddMealsPlanScreen from '../../screens/Nutrition/AddMealsPlan';
import ViewMealsPlanScreen from '../../screens/Nutrition/ViewMealsPlan';
import ViewNutritionAssessmentsScreen from '../../screens/Nutrition/ViewNutritionAssessments';
import NutritionAppointmentsScreen from '../../screens/Nutrition/NutritionAppointments';
import NutritionDashboardScreen from '../../screens/Nutrition/NutritionDashboard';
import ClientsDetailsScreen from '../../screens/Nutrition/ClientsDetails';
import DietPlanIssuedScreen from '../../screens/Nutrition/DietPlanIssued';
import HealthCampsScreen from '../../screens/Nutrition/HealthCamps';
import ReferralSheetScreen from '../../screens/Nutrition/ReferralSheet';
import ViewAssessmentQuestionnaireScreen from '../../screens/Nutrition/ViewAssessmentQuestionnaire';
import AddAssessmentQuestionnaireScreen from '../../screens/Nutrition/AddAssessmentQuestionnaire';
import AddNutritionAppointmentScreen from '../../screens/Nutrition/AddNutritionAppointment';
import AddNutritionAssessmentsScreen from '../../screens/Nutrition/AddNutritionAssessments';
import AddDietPlanIssuedScreen from '../../screens/Nutrition/AddDietPlanIssued';

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
                <Stack.Screen name="TrainerDutyHoursScreen" component={TrainerDutyHours} />
                <Stack.Screen name="Qualifications" component={QualificationsScreen} />
                <Stack.Screen name="TrainerDocuments" component={TrainerDocumentsScreen} />
                <Stack.Screen name="SOPs" component={SOPsScreen} />
                <Stack.Screen name="SessionTracker" component={SessionTrackerScreen} />
                <Stack.Screen name="PersonalTrainerDiary" component={TrainerRoster} />
                <Stack.Screen name="ViewFitnessPlans" component={ViewFitnessPlans} />
                <Stack.Screen name="AddFitnessPlan" component={AddFitnessPlan} />
                <Stack.Screen name="ManageExercises" component={ManageExercises} />
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
                <Stack.Screen name="MySalarySlip" component={MySalarySlip} />


                {/* ── Admin-only screens → show AccessDenied for non-admins ── */}
                <Stack.Screen name="NewMemberRegistration" component={protect(NewMemberRegistrationScreen)} />
                <Stack.Screen name="NewPackage" component={protect(NewPackage)} />
                <Stack.Screen name="Settings" component={protect(Settings)} />
                <Stack.Screen name="SMTP" component={protect(SMTP)} />
                <Stack.Screen name="DeleteRole" component={protect(DeleteRole)} />
                <Stack.Screen name="DeleteBranch" component={protect(DeleteBranch)} />
                <Stack.Screen name="ListBranches" component={protect(ListBranches)} />
                <Stack.Screen name="AddBranch" component={protect(AddBranch)} />
                <Stack.Screen name="BranchManagerAssignment" component={protect(BranchManagerAssignment)} />
                <Stack.Screen name="PermissionMatrix" component={protect(PermissionMatrix)} />
                <Stack.Screen name="EmailTemplates" component={protect(EmailTemplates)} />
                <Stack.Screen name="DatabaseBackup" component={protect(DatabaseBackup)} />
                <Stack.Screen name="SecuritySettings" component={protect(SecuritySettings)} />
                <Stack.Screen name="Orders" component={protect(Orders)} />
                <Stack.Screen name="NewOrder" component={protect(NewOrder)} />
                <Stack.Screen name="OrderDetail" component={protect(OrderDetail)} />
                <Stack.Screen name="SalaryManagement" component={protect(SalaryManagement)} />
                <Stack.Screen name="StaffLoans" component={protect(StaffLoans)} />
                <Stack.Screen name="StaffFinance" component={protect(StaffFinance)} />

                {/* ── Admin: Sales ── */}
                <Stack.Screen name="ViewClients" component={protect(ViewClients)} />
                <Stack.Screen name="ViewFreezing" component={protect(ViewFreezing)} />
                <Stack.Screen name="ApprovalsScreen" component={protect(ApprovalsScreen)} />
                <Stack.Screen name="ClientsReport" component={protect(SalesClientsReportScreen)} />
                <Stack.Screen name="SalesSessionReport" component={protect(ComingSoon)} />
                <Stack.Screen name="MembershipPackages" component={protect(MembershipPackages)} />
                <Stack.Screen name="GymPackages" component={protect(GymPackages)} />
                <Stack.Screen name="TrainerPackages" component={protect(TrainerPackages)} />
                <Stack.Screen name="BootcampPackages" component={protect(BootcampPackages)} />
                <Stack.Screen name="PhysiotherapyPackages" component={protect(PhysiotherapyPackages)} />
                <Stack.Screen name="MassageChair" component={protect(MassageChair)} />
                <Stack.Screen name="SmallPTGroupPackages" component={protect(SmallPTGroupPackages)} />
                <Stack.Screen name="GXPackages" component={protect(GXPackages)} />
                <Stack.Screen name="CFTPackages" component={protect(CFTPackages)} />
                <Stack.Screen name="GeneralPackages" component={protect(GeneralPackages)} />
                <Stack.Screen name="DetailedPackages" component={protect(DetailedPackages)} />
                <Stack.Screen name="Categories" component={protect(Categories)} />
                <Stack.Screen name="SubCategories" component={protect(SubCategories)} />
                <Stack.Screen name="ManageTowels" component={protect(ManageTowels)} />
                <Stack.Screen name="AssignCards" component={protect(AssignCards)} />
                <Stack.Screen name="ViewCards" component={protect(ViewCards)} />
                <Stack.Screen name="ManageBranches" component={protect(ListBranches)} />

                {/* ── Admin: Human Resource ── */}
                <Stack.Screen name="HRDashboard" component={protect(HRDashboard)} />
                <Stack.Screen name="ViewStaff" component={protect(ViewStaff)} />
                <Stack.Screen name="DetailedHRReport" component={protect(ComingSoon)} />
                <Stack.Screen name="AddStaff" component={protect(ComingSoon)} />
                <Stack.Screen name="StaffPromotion" component={protect(ComingSoon)} />
                <Stack.Screen name="StaffAdvances" component={protect(ComingSoon)} />
                <Stack.Screen name="SalaryComponent" component={protect(SalaryComponent)} />
                <Stack.Screen name="StaffCommissions" component={protect(StaffCommissions)} />
                <Stack.Screen name="SessionPortalHR" component={protect(SessionPortalHR)} />
                <Stack.Screen name="StaffDutyHours" component={protect(StaffDutyHours)} />
                <Stack.Screen name="EmployeeAttendance" component={protect(EmployeeAttendance)} />
                <Stack.Screen name="PTAttendance" component={protect(PTAttendance)} />
                <Stack.Screen name="LeaveQuota" component={protect(LeaveQuota)} />
                <Stack.Screen name="LetterManagement" component={protect(ComingSoon)} />
                <Stack.Screen name="ResourceManager" component={protect(ComingSoon)} />

                {/* ── Admin: Cafe ── */}
                <Stack.Screen name="CafeDashboard" component={protect(CafeDashboardScreen)} />
                <Stack.Screen name="CafeCategories" component={protect(CafeCategoriesScreen)} />
                <Stack.Screen name="CafeProducts" component={protect(CafeProductsScreen)} />
                <Stack.Screen name="CafeDeposits" component={protect(CafeDepositsScreen)} />
                <Stack.Screen name="AddClientsDeposit" component={protect(AddClientsDepositScreen)} />
                <Stack.Screen name="ClientsAvailableBalance" component={protect(ClientsAvailableBalanceScreen)} />
                <Stack.Screen name="DepositsHistory" component={protect(DepositsHistoryScreen)} />
                <Stack.Screen name="CafeSalesReport" component={protect(CafeSalesReportScreen)} />
                <Stack.Screen name="ManagementPendings" component={protect(ManagementPendingsScreen)} />

                {/* ── Admin: Reports ── */}
                <Stack.Screen name="ClientsReports" component={protect(ClientsReportScreen)} />
                <Stack.Screen name="SalesReport" component={protect(SalesReportScreen)} />
                <Stack.Screen name="DetailedSalesReport" component={protect(DetailedSalesReportScreen)} />
                <Stack.Screen name="MISReport" component={protect(MISReportScreen)} />
                <Stack.Screen name="SalesByServices" component={protect(SalesByServicesScreen)} />
                <Stack.Screen name="SalesExpenseDaily" component={protect(SalesExpenseDailyScreen)} />
                <Stack.Screen name="SalesByBootcamp" component={protect(SalesByBootcampScreen)} />
                <Stack.Screen name="CafeReports" component={protect(CafeReportScreen)} />
                <Stack.Screen name="TransactionReport" component={protect(TransactionReportScreen)} />
                <Stack.Screen name="StaffAttendanceReport" component={protect(StaffAttendanceReportScreen)} />
                <Stack.Screen name="ClientsAttendance" component={protect(ClientsAttendanceScreen)} />
                <Stack.Screen name="FootfallReport" component={protect(FootfallReportScreen)} />

                {/* ── Admin: Finance ── */}
                <Stack.Screen name="FinanceDashboard" component={protect(FinanceDashboard)} />
                <Stack.Screen name="Expenses" component={protect(Expenses)} />
                <Stack.Screen name="AddExpense" component={protect(AddExpense)} />
                <Stack.Screen name="DailyExpense" component={protect(DailyExpense)} />
                <Stack.Screen name="DailyExpenseReport" component={protect(ComingSoon)} />
                <Stack.Screen name="PaidExpenseReport" component={protect(ComingSoon)} />
                <Stack.Screen name="AddCashInHand" component={protect(ComingSoon)} />
                <Stack.Screen name="ViewCashInHand" component={protect(ViewCashInHand)} />
                <Stack.Screen name="AddCharity" component={protect(AddCharity)} />
                <Stack.Screen name="ViewCharityLedger" component={protect(ViewCharityLedger)} />
                <Stack.Screen name="AddOfficeCash" component={protect(AddOfficeCash)} />
                <Stack.Screen name="ViewOfficeLedger" component={protect(ViewOfficeLedger)} />
                <Stack.Screen name="AddBankCash" component={protect(ComingSoon)} />
                <Stack.Screen name="ViewBankLedger" component={protect(ComingSoon)} />
                <Stack.Screen name="AddPettyCash" component={protect(AddPettyCash)} />
                <Stack.Screen name="PettyCashLedger" component={protect(PettyCashLedger)} />
                <Stack.Screen name="AddG13Cash" component={protect(AddG13Cash)} />
                <Stack.Screen name="G13CashLedger" component={protect(G13CashLedger)} />
                <Stack.Screen name="AddLiabilities" component={protect(AddLiabilities)} />
                <Stack.Screen name="PayLiabilities" component={protect(PayLiabilities)} />
                <Stack.Screen name="ViewLiabilitiesLedger" component={protect(ViewLiabilitiesLedger)} />
                <Stack.Screen name="AddKeene" component={protect(AddKeene)} />
                <Stack.Screen name="KeeneLedger" component={protect(KeeneLedger)} />
                <Stack.Screen name="Assets" component={protect(ComingSoon)} />
                <Stack.Screen name="BalanceSheet" component={protect(ComingSoon)} />
                <Stack.Screen name="DailySalesCounter" component={protect(ComingSoon)} />
                <Stack.Screen name="CafeSalesExpenseReport" component={protect(ComingSoon)} />
                <Stack.Screen name="DailyOfficeClosing" component={protect(ComingSoon)} />
                <Stack.Screen name="BankDetails" component={protect(ComingSoon)} />

                {/* ── Admin: Fitness ── */}
                <Stack.Screen name="GXClasses" component={protect(GXClasses)} />
                <Stack.Screen name="PTRoster" component={protect(PTRoster)} />
                <Stack.Screen name="TrainerDiary" component={protect(ComingSoon)} />
                {/* PersonalTrainerDiary registered as trainer-allowed above */}
                <Stack.Screen name="PTSalesReport" component={protect(ComingSoon)} />
                <Stack.Screen name="SwitchBookingTime" component={protect(ComingSoon)} />
                <Stack.Screen name="TrainerAppointments" component={protect(ComingSoon)} />
                <Stack.Screen name="SessionAttendance" component={protect(ComingSoon)} />
                <Stack.Screen name="NewPTBookings" component={protect(ComingSoon)} />
                <Stack.Screen name="NewPTClients" component={protect(ComingSoon)} />
                <Stack.Screen name="AddGXSlots" component={protect(ComingSoon)} />
                <Stack.Screen name="AddGXClass" component={protect(ComingSoon)} />
                <Stack.Screen name="GXTrainers" component={protect(ComingSoon)} />
                <Stack.Screen name="GXSlotsList" component={protect(ComingSoon)} />
                <Stack.Screen name="GXBookings" component={protect(ComingSoon)} />
                <Stack.Screen name="GXAppointments" component={protect(ComingSoon)} />
                <Stack.Screen name="GXAttendance" component={protect(ComingSoon)} />
                <Stack.Screen name="GXAttendanceReport" component={protect(ComingSoon)} />
                <Stack.Screen name="BefitList" component={protect(ComingSoon)} />
                <Stack.Screen name="BefitBookings" component={protect(ComingSoon)} />
                <Stack.Screen name="BefitAppointments" component={protect(ComingSoon)} />
                <Stack.Screen name="BefitAttendance" component={protect(ComingSoon)} />
                <Stack.Screen name="BefitAttendanceReport" component={protect(ComingSoon)} />
                <Stack.Screen name="SPTList" component={protect(ComingSoon)} />
                <Stack.Screen name="SPTBookings" component={protect(ComingSoon)} />
                <Stack.Screen name="SPTAppointments" component={protect(ComingSoon)} />
                <Stack.Screen name="SPTAttendance" component={protect(ComingSoon)} />
                <Stack.Screen name="SPTAttendanceReport" component={protect(ComingSoon)} />
                {/* ViewFitnessPlans, AddFitnessPlan, ManageExercises registered as trainer-allowed above */}
                <Stack.Screen name="TimeSlots" component={protect(TimeSlotsScreen)} />
                <Stack.Screen name="ManageAvailability" component={protect(ManageAvailabilityScreen)} />

                {/* ── Admin: Nutrition ── */}
                <Stack.Screen name="NutritionPackages" component={protect(NutritionPackagesScreen)} />
                <Stack.Screen name="AddMealsPlan" component={protect(AddMealsPlanScreen)} />
                <Stack.Screen name="ViewMealsPlan" component={protect(ViewMealsPlanScreen)} />
                <Stack.Screen name="AddNutritionAssessments" component={protect(AddNutritionAssessmentsScreen)} />
                <Stack.Screen name="ViewNutritionAssessments" component={protect(ViewNutritionAssessmentsScreen)} />
                <Stack.Screen name="NutritionAppointments" component={protect(NutritionAppointmentsScreen)} />
                <Stack.Screen name="AddNutritionAppointment" component={protect(AddNutritionAppointmentScreen)} />
                <Stack.Screen name="NutritionDashboard" component={protect(NutritionDashboardScreen)} />
                <Stack.Screen name="ClientsDetails" component={protect(ClientsDetailsScreen)} />
                <Stack.Screen name="AddAssessmentQuestionnaire" component={protect(AddAssessmentQuestionnaireScreen)} />
                <Stack.Screen name="ViewAssessmentQuestionnaire" component={protect(ViewAssessmentQuestionnaireScreen)} />
                <Stack.Screen name="AddDietPlanIssued" component={protect(AddDietPlanIssuedScreen)} />
                <Stack.Screen name="ViewDietPlanIssued" component={protect(DietPlanIssuedScreen)} />
                <Stack.Screen name="HealthCamps" component={protect(HealthCampsScreen)} />
                <Stack.Screen name="ReferralSheet" component={protect(ReferralSheetScreen)} />
            </Stack.Navigator>
        </View>
    );
};

export default AppNavigator;