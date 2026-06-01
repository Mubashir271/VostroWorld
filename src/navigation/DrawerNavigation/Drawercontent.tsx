// src/navigation/DrawerNavigation/DrawerContent.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Edit_fill } from '../../assets/icons';
import ProfileHeader from '../../components/ProfileHeader';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { logoutUser } from '../../redux/slices/userSlice';
import { clearCredentials } from '../../utils/biometrics';
import {
  isAdmin,
  TRAINER_ALLOWED_MENUS,
  TRAINER_ALLOWED_HR_CHILDREN,
  ADMIN_HIDDEN_MENUS,
} from '../../config/permissions';

// ─── Menu definition ────────────────────────────────────────────────────────

// const MENU = [
//   { title: 'Dashboard', icon: 'view-dashboard', screen: 'Dashboard' },
//   {
//     title: 'Members',
//     icon: 'account-group',
//     children: [
//       { title: 'All Members',       screen: 'AllMembers' },
//       { title: 'New Registration',  screen: 'NewRegistration' },
//       { title: 'Member Search',     screen: 'MemberSearch' },
//       { title: 'Member Balance',    screen: 'MemberBalance' },
//     ],
//   },
//   {
//     title: 'Packages',
//     icon: 'package-variant',
//     children: [
//       { title: 'Manage Packages', screen: 'ManagePackages' },
//       { title: 'Pricing',         screen: 'Pricing' },
//     ],
//   },
//   {
//     title: 'Staff Management',
//     icon: 'account-tie',
//     children: [
//       { title: 'Users / Staff',         screen: 'UsersStaff' },
//       { title: 'Roles and Permissions', screen: 'RolesPermissions' },
//       { title: 'Departments',           screen: 'Departments' },
//       { title: 'Schedule / Timing',     screen: 'StaffTiming' },
//     ],
//   },
//   {
//     title: 'Fitness',
//     icon: 'dumbbell',
//     children: [
//           {
//       title: 'Fitness Plans',
//       children: [
//         { title: 'View Plans', screen: 'ViewFitnessPlans' },
//         { title: 'Add Plans', screen: 'AddFitnessPlan' },
//         { title: 'Manage Exercises', screen: 'ManageExercises' },
//       ],
//     },
//       { title: 'Classes/Sessions',   screen: 'Classes' },
//       { title: 'Trainer Management', screen: 'TrainerManagement' },
//       { title: 'Progress Tracking',  screen: 'ProgressTracking' },
//     ],
//   },
//   {
//     title: 'Finance',
//     icon: 'finance',
//     children: [
//       { title: 'Transactions', screen: 'Transactions' },
//       { title: 'Reports',      screen: 'Reports' },
//       { title: 'Expenses',     screen: 'Expenses' },
//       { title: 'Approvals',    screen: 'Approvals' },
//       { title: 'Bank Accounts',screen: 'BankAccounts' },
//     ],
//   },
//   {
//     title: 'HR Management',
//     icon: 'briefcase-account',
//     children: [
//       { title: 'Leave Applications', screen: 'LeaveApplications' },
//       { title: 'Loan Management',    screen: 'LoanManagement' },
//       { title: 'Salary Management',  screen: 'SalaryManagement' },
//       { title: 'Promotions',         screen: 'Promotions' },
//     ],
//   },
//   {
//     title: 'Cafe Operations',
//     icon: 'coffee',
//     children: [
//       { title: 'Orders',        screen: 'Orders' },
//       { title: 'Inventory',     screen: 'Inventory' },
//       { title: 'Cafe Accounts', screen: 'CafeAccounts' },
//       { title: 'Cafe Reports',  screen: 'DailyReports' },
//     ],
//   },
//   {
//     title: 'Settings',
//     icon: 'cog',
//     children: [
//       { title: 'Branches',        screen: 'Branches' },
//       { title: 'App Settings',    screen: 'AppSettings' },
//       { title: 'User Management', screen: 'UserManagement' },
//       { title: 'Roles',           screen: 'Roles' },
//       { title: 'Notifications',   screen: 'Notifications' },
//     ],
//   },
// ];
const MENU = [
  // ── Shared ────────────────────────────────────────────────────────────────
  { title: 'Dashboard', icon: 'view-dashboard', screen: 'Dashboard' },

  // ── Trainer-only (hidden from admin by ADMIN_HIDDEN_MENUS) ────────────────
  { title: 'My Commission', icon: 'cash-multiple', screen: 'TrainerCommission' },
  {
    title: 'HR Management',
    icon: 'briefcase-account',
    children: [
      { title: 'Leave Applications', screen: 'LeaveApplications' },
      { title: 'My Salary Slip',     screen: 'MySalarySlip' },
    ],
  },

  // ── Admin: Sales ──────────────────────────────────────────────────────────
  {
    title: 'Sales',
    icon: 'store',
    children: [
      { title: 'View Clients', screen: 'ViewClients' },
      { title: 'Add Client', screen: 'NewMemberRegistration' },
      { title: 'Clients Report', screen: 'ClientsReport' },
      { title: 'Session Report', screen: 'SalesSessionReport' },
      {
        title: 'Packages',
        children: [
          { title: 'Membership Packages', screen: 'MembershipPackages' },
          { title: 'Gym Packages', screen: 'GymPackages' },
          { title: 'Trainer Packages', screen: 'TrainerPackages' },
          { title: 'Bootcamp Packages', screen: 'BootcampPackages' },
          { title: 'Physiotherapy Packages', screen: 'PhysiotherapyPackages' },
          { title: 'Massage Chair', screen: 'MassageChair' },
          { title: 'Small PT Group Packages', screen: 'SmallPTGroupPackages' },
          { title: 'GX Packages', screen: 'GXPackages' },
          { title: 'CFT', screen: 'CFTPackages' },
          { title: 'General Packages', screen: 'GeneralPackages' },
          { title: 'Detailed Packages', screen: 'DetailedPackages' },
        ],
      },
      { title: 'Sell Package', screen: 'NewPackage' },
      { title: 'View Freezing', screen: 'ViewFreezing' },
      { title: 'Categories', screen: 'Categories' },
      { title: 'Sub-Categories', screen: 'SubCategories' },
      { title: 'Manage Towels', screen: 'ManageTowels' },
      { title: 'Assign Cards', screen: 'AssignCards' },
      { title: 'View Cards', screen: 'ViewCards' },
      { title: 'Manage Branches', screen: 'ManageBranches' },
    ],
  },

  // ── Admin: Human Resource ─────────────────────────────────────────────────
  {
    title: 'Human Resource',
    icon: 'briefcase-account',
    children: [
      { title: 'HR Dashboard', screen: 'HRDashboard' },
      { title: 'Detailed HR Report', screen: 'DetailedHRReport' },
      {
        title: 'Manage Staff',
        children: [
          { title: 'View Staff', screen: 'ViewStaff' },
          { title: 'Add Staff', screen: 'AddStaff' },
          { title: 'Staff Promotion', screen: 'StaffPromotion' },
          { title: 'Manage Staff Fines', screen: 'StaffFinance' },
          { title: 'Manage Staff Advances', screen: 'StaffAdvances' },
          { title: 'Add Salary Component', screen: 'SalaryComponent' },
          { title: 'Manage Staff Loans', screen: 'StaffLoans' },
          { title: 'Manage Staff Salaries', screen: 'SalaryManagement' },
          { title: 'Staff Commissions', screen: 'StaffCommissions' },
          { title: 'Session Portal (HR)', screen: 'SessionPortalHR' },
          { title: 'Staff Duty Hours', screen: 'StaffDutyHours' },
          { title: 'Employee Attendance', screen: 'EmployeeAttendance' },
          { title: 'PT Attendance', screen: 'PTAttendance' },
        ],
      },
      {
        title: 'Leave Management',
        children: [
          { title: 'Leave Quota', screen: 'LeaveQuota' },
          { title: 'Leave Application', screen: 'LeaveApplications' },
        ],
      },
      {
        title: 'Letter Management',
        children: [
          { title: 'Employee Certificates & Letters', screen: 'LetterManagement' },
        ],
      },
      {
        title: 'Resource Manager',
        children: [
          { title: 'Add Departments & Designations', screen: 'ResourceManager' },
        ],
      },
    ],
  },

  // ── Admin: Cafe ───────────────────────────────────────────────────────────
  {
    title: 'Cafe',
    icon: 'coffee',
    children: [
      { title: 'Cafe Dashboard', screen: 'CafeDashboard' },
      { title: 'Cafe Categories', screen: 'CafeCategories' },
      { title: 'Cafe Products', screen: 'CafeProducts' },
      { title: 'Cafe Orders', screen: 'Orders' },
      { title: 'Cafe Deposits', screen: 'CafeDeposits' },
      { title: 'Add Clients Deposit', screen: 'AddClientsDeposit' },
      { title: 'Clients Available Balance', screen: 'ClientsAvailableBalance' },
      { title: 'Deposits History', screen: 'DepositsHistory' },
      { title: 'Cafe Sales Report', screen: 'CafeSalesReport' },
      { title: 'Management Pendings', screen: 'ManagementPendings' },
    ],
  },

  // ── Admin: Reports ────────────────────────────────────────────────────────
  {
    title: 'Reports',
    icon: 'chart-bar',
    children: [
      { title: 'Clients Reports', screen: 'ClientsReports' },
      { title: 'Sales', screen: 'SalesReport' },
      { title: 'Detailed Sales Report', screen: 'DetailedSalesReport' },
      { title: 'MIS Report', screen: 'MISReport' },
      { title: 'Sales By Services', screen: 'SalesByServices' },
      { title: 'Sales & Expense Daily', screen: 'SalesExpenseDaily' },
      { title: 'Sales By Bootcamp', screen: 'SalesByBootcamp' },
      { title: 'Cafe Sales', screen: 'CafeReports' },
      { title: 'Transaction Report', screen: 'TransactionReport' },
      { title: 'Staff Attendance', screen: 'StaffAttendanceReport' },
      { title: 'Clients Attendance', screen: 'ClientsAttendance' },
      { title: 'Footfall Report', screen: 'FootfallReport' },
    ],
  },

  // ── Admin: Finance ────────────────────────────────────────────────────────
  {
    title: 'Finance',
    icon: 'finance',
    children: [
      { title: 'Finance Dashboard', screen: 'FinanceDashboard' },
      {
        title: 'Expense',
        children: [
          { title: 'Add Expense', screen: 'AddExpense' },
          { title: 'View Expenses', screen: 'Expenses' },
          { title: 'Daily Expense', screen: 'DailyExpense' },
          { title: 'Daily Expense Report', screen: 'DailyExpenseReport' },
          { title: 'Paid Expense Report', screen: 'PaidExpenseReport' },
        ],
      },
      {
        title: 'Cash In Hand',
        children: [
          { title: 'Add Cash In Hand', screen: 'AddCashInHand' },
          { title: 'View Cash In Hand', screen: 'ViewCashInHand' },
        ],
      },
      {
        title: 'Charity',
        children: [
          { title: 'Add Charity', screen: 'AddCharity' },
          { title: 'View Charity Ledger', screen: 'ViewCharityLedger' },
        ],
      },
      {
        title: 'Office Ledger',
        children: [
          { title: 'Add Office Cash', screen: 'AddOfficeCash' },
          { title: 'View Office Ledger', screen: 'ViewOfficeLedger' },
        ],
      },
      {
        title: 'Bank Ledger',
        children: [
          { title: 'Add Bank Cash', screen: 'AddBankCash' },
          { title: 'View Bank Ledger', screen: 'ViewBankLedger' },
        ],
      },
      {
        title: 'Petty Cash Ledger',
        children: [
          { title: 'Add Petty Cash', screen: 'AddPettyCash' },
          { title: 'Petty Cash Ledger', screen: 'PettyCashLedger' },
        ],
      },
      {
        title: 'G13 Ledger',
        children: [
          { title: 'Add G13 Cash', screen: 'AddG13Cash' },
          { title: 'G13 Cash Ledger', screen: 'G13CashLedger' },
        ],
      },
      {
        title: 'Liabilities',
        children: [
          { title: 'Add Liabilities', screen: 'AddLiabilities' },
          { title: 'Pay Liabilities', screen: 'PayLiabilities' },
          { title: 'View Liabilities Ledger', screen: 'ViewLiabilitiesLedger' },
        ],
      },
      {
        title: 'Keene Ledger',
        children: [
          { title: 'Add Keene', screen: 'AddKeene' },
          { title: 'Keene Ledger', screen: 'KeeneLedger' },
        ],
      },
      { title: 'Assets', screen: 'Assets' },
      { title: 'Balance Sheet', screen: 'BalanceSheet' },
      { title: 'Daily Sales Counter', screen: 'DailySalesCounter' },
      { title: 'Cafe Sales & Expense Report', screen: 'CafeSalesExpenseReport' },
      { title: 'Daily Office Closing', screen: 'DailyOfficeClosing' },
      { title: 'Bank Details', screen: 'BankDetails' },
    ],
  },

  // ── Admin: Fitness ────────────────────────────────────────────────────────
  {
    title: 'Fitness',
    icon: 'dumbbell',
    children: [
      { title: 'SOPs',                      screen: 'SOPs' },
      { title: 'Personal Trainer Diary',    screen: 'PersonalTrainerDiary' },
      { title: 'Session Attendance Report', screen: 'SessionAttendanceReport' },
      { title: 'Session Tracker',           screen: 'SessionTracker' },
      { title: 'Trainer Diary',             screen: 'TrainerDiary' },
      { title: 'PT Sales Report',           screen: 'PTSalesReport' },
      { title: 'Switch Booking Time',       screen: 'SwitchBookingTime' },
      { title: 'Trainer Appointments',      screen: 'TrainerAppointments' },
      { title: 'Session Attendance',        screen: 'SessionAttendance' },
      { title: 'New PT Bookings',           screen: 'NewPTBookings' },
      { title: 'New PT Clients',            screen: 'NewPTClients' },
      {
        title: 'GX Classes',
        children: [
          { title: 'Add Slots', screen: 'AddGXSlots' },
          { title: 'Add Class', screen: 'AddGXClass' },
          { title: 'GX Trainers', screen: 'GXTrainers' },
          { title: 'GX Slots List', screen: 'GXSlotsList' },
          { title: 'GX Bookings', screen: 'GXBookings' },
          { title: 'GX Appointments', screen: 'GXAppointments' },
          { title: 'GX Attendance', screen: 'GXAttendance' },
          { title: 'GX Attendance Report', screen: 'GXAttendanceReport' },
        ],
      },
      {
        title: 'Befit',
        children: [
          { title: 'Befit List', screen: 'BefitList' },
          { title: 'Befit Bookings', screen: 'BefitBookings' },
          { title: 'Befit Appointments', screen: 'BefitAppointments' },
          { title: 'Befit Attendance', screen: 'BefitAttendance' },
          { title: 'Befit Attendance Report', screen: 'BefitAttendanceReport' },
        ],
      },
      {
        title: 'SPT',
        children: [
          { title: 'SPT List', screen: 'SPTList' },
          { title: 'SPT Bookings', screen: 'SPTBookings' },
          { title: 'SPT Appointments', screen: 'SPTAppointments' },
          { title: 'SPT Attendance', screen: 'SPTAttendance' },
          { title: 'SPT Attendance Report', screen: 'SPTAttendanceReport' },
        ],
      },
      {
        title: 'Fitness Plan',
        children: [
          { title: 'View Plans', screen: 'ViewFitnessPlans' },
          { title: 'Add Plans', screen: 'AddFitnessPlan' },
          { title: 'Manage Exercises', screen: 'ManageExercises' },
        ],
      },
      {
        title: 'Trainer Schedule',
        children: [
          { title: 'Time Slots', screen: 'TimeSlots' },
          { title: 'Manage Availability', screen: 'ManageAvailability' },
        ],
      },
    ],
  },

  // ── Admin: Nutrition ──────────────────────────────────────────────────────
  {
    title: 'Nutrition',
    icon: 'food-apple',
    children: [
      { title: 'Nutrition Packages', screen: 'NutritionPackages' },
      {
        title: 'Meals Plan',
        children: [
          { title: 'Add Meals Plan', screen: 'AddMealsPlan' },
          { title: 'View Meals Plan', screen: 'ViewMealsPlan' },
        ],
      },
      {
        title: 'Nutrition Assessments',
        children: [
          { title: 'Add Nutrition Assessments', screen: 'AddNutritionAssessments' },
          { title: 'View Nutrition Assessments', screen: 'ViewNutritionAssessments' },
        ],
      },
    ],
  },

  // ── Settings / Approval / Notifications ───────────────────────────────────
  { title: 'Settings', icon: 'cog', screen: 'Settings' },
  { title: 'Approval', icon: 'check-circle', screen: 'ApprovalsScreen' },
  { title: 'Notifications', icon: 'bell-outline', screen: 'Notifications' },
]
// ─── Navigation helper ───────────────────────────────────────────────────────

// ─── Navigation helper ───────────────────────────────────────────────────────
const navigateTo = (navigation: any, screen: string) => {
  if (screen === 'Dashboard') {
    navigation.navigate('Main', { screen: 'Home' });
  } else {
    navigation.navigate(screen);
  }
  if (navigation.closeDrawer) {
    setTimeout(() => navigation.closeDrawer(), 100);
  }
};

// ─── Role-based menu filter ──────────────────────────────────────────────────

const filterMenuForRole = (
  menu: typeof MENU,
  userIsAdmin: boolean,
): typeof MENU => {
  if (userIsAdmin) {
    // Admin: hide all trainer-only top-level items
    return menu.filter(item => !ADMIN_HIDDEN_MENUS.includes(item.title));
  }

  // Trainer: keep only allowed sections
  return menu
    .filter(item => TRAINER_ALLOWED_MENUS.includes(item.title))
    .map(item => {
      if (item.title === 'HR Management' && item.children) {
        return {
          ...item,
          children: item.children.filter(c =>
            TRAINER_ALLOWED_HR_CHILDREN.includes(c.title),
          ),
        };
      }
      if (item.title === 'Fitness' && item.children) {
        // Match website trainer Fitness section exactly
        const TRAINER_FITNESS = ['SOPs', 'Personal Trainer Diary', 'Session Attendance Report', 'Fitness Plan', 'Session Tracker'];
        return {
          ...item,
          children: item.children.filter(c => TRAINER_FITNESS.includes(c.title)),
        };
      }
      return item;
    });
};

// ─── Component ───────────────────────────────────────────────────────────────

const DrawerContent = (props: any) => {
  const { navigation } = props;
  const dispatch = useDispatch();
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [active, setActive] = React.useState('Dashboard');

  const { profile, appImage } = useSelector((state: RootState) => state.user);

  const userIsAdmin = isAdmin(profile?.role);

  const firstName = profile?.firstName || 'User';
  const lastName = profile?.lastName || '';
  const role = profile?.role || profile?.type || 'Staff';
  const branch = profile?.branchName || `Branch ${profile?.branchId}`;
  const avatarSource = appImage
    ? { uri: appImage }
    : profile?.image
      ? { uri: profile.image }
      : require('../../assets/img/userIcon.png');

  const profileName = `${firstName} ${lastName}`.trim() || 'User';

  const visibleMenu = filterMenuForRole(MENU, userIsAdmin);

  const handleLogout = () => {
    dispatch(logoutUser());
    clearCredentials();
    navigation.replace('WelcomeAdmin');
  };


  // ── Render ────────────────────────────────────────────────────────────────

  // const renderParent = (item: any) => {
  //   const isOpen   = expanded === item.title;
  //   const isActive = active === item.title;

  //   return (
  //     <View key={item.title}>
  //       <TouchableOpacity
  //         style={[
  //           styles.menuItem,
  //           isActive && styles.activeItem,
  //           isOpen   && styles.openItem,
  //         ]}
  //         onPress={() => {
  //           if (item.children) {
  //             toggleExpand(item.title);
  //           } else {
  //             setActive(item.title);
  //             navigateTo(navigation, item.screen ?? item.title);
  //           }
  //         }}
  //       >
  //         <View style={styles.menuItemLeft}>
  //           <Icon
  //             name={item.icon}
  //             size={20}
  //             color={isActive ? '#FFF' : '#666'}
  //           />
  //           <Text
  //             style={[
  //               styles.menuText,
  //               isActive && styles.activeText,
  //               isOpen   && styles.openText,
  //             ]}
  //           >
  //             {item.title}
  //           </Text>
  //         </View>

  //         {item.children && (
  //           <Icon
  //             name={isOpen ? 'chevron-up' : 'chevron-down'}
  //             size={18}
  //             color={isActive ? '#FFF' : '#999'}
  //           />
  //         )}
  //       </TouchableOpacity>

  //       {isOpen && item.children && (
  //         <View style={styles.subContainer}>
  //           {item.children.map((child: any) => {
  //             const childActive = active === child.title;
  //             return (
  //               <TouchableOpacity
  //                 key={child.title}
  //                 style={[styles.subMenuItem, childActive && styles.activeSubItem]}
  //                 onPress={() => {
  //                   setActive(child.title);
  //                   navigateTo(navigation, child.screen);
  //                 }}
  //               >
  //                 <Text style={[styles.subMenuText, childActive && styles.activeSubText]}>
  //                   {child.title}
  //                 </Text>
  //               </TouchableOpacity>
  //             );
  //           })}
  //         </View>
  //       )}
  //     </View>
  //   );
  // };
  const renderMenuItem = (item: any, level = 0, parentKey = '') => {
    const key = parentKey ? `${parentKey}.${item.title}` : item.title;

    const isOpen = expanded === key;
    const isActive = active === item.title;
    const hasChildren = item.children?.length > 0;

    return (
      <View key={key}>
        <TouchableOpacity
          style={[
            styles.menuItem,
            { paddingLeft: 20 + level * 12 },
            isActive && styles.activeItem,
            isOpen && styles.openItem,
          ]}
          onPress={() => {
            if (hasChildren) {
              setExpanded(prev => (prev === key ? null : key));
            } else {
              setActive(item.title);
              navigateTo(navigation, item.screen ?? item.title);
            }
          }}
        >
          <View style={styles.menuItemLeft}>
            {level === 0 && item.icon && (
              <Icon
                name={item.icon}
                size={20}
                color={isActive ? '#FFF' : '#666'}
              />
            )}

            <Text
              style={[
                styles.menuText,
                isActive && styles.activeText,
                isOpen && styles.openText,
                level > 0 && { fontSize: 13, color: '#555' },
              ]}
            >
              {item.title}
            </Text>
          </View>

          {hasChildren && (
            <Icon
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={isActive ? '#FFF' : '#999'}
            />
          )}
        </TouchableOpacity>

        {isOpen && hasChildren && (
          <View>
            {item.children.map((child: any) =>
              renderMenuItem(child, level + 1, key),
            )}
          </View>
        )}
      </View>
    );
  };
  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      <ProfileHeader
        name={profileName}
        role={role || 'Staff'}
        branch={branch || 'Main Branch'}
        avatar={avatarSource}
        editIcon={Edit_fill}
        onEditPress={() => navigation.navigate('Account')}
      />

      <View style={styles.menuSection}>
        {/* {visibleMenu.map(renderMenuItem)} */}
        {visibleMenu.map(item => renderMenuItem(item))}
      </View>

      <TouchableOpacity
        style={[styles.menuItem, styles.logoutItem]}
        onPress={handleLogout}
      >
        <View style={styles.menuItemLeft}>
          <Icon name="logout" size={20} color="#E63946" style={styles.menuIcon} />
          <Text style={styles.menuTextDanger}>Logout</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </DrawerContentScrollView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  menuSection: { paddingTop: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIcon: { marginRight: 16 },
  menuText: { fontSize: 15, color: '#333', fontWeight: '500', marginLeft: 12 },
  menuTextDanger: { color: '#E63946', marginLeft: 12, fontSize: 15, fontWeight: '500' },
  activeItem: { backgroundColor: '#E63946', borderRadius: 8, marginHorizontal: 10 },
  activeText: { color: '#FFF', fontWeight: '600' },
  openItem: { backgroundColor: '#FFF5F5', borderRadius: 8, marginHorizontal: 10 },
  openText: { color: '#E63946', fontWeight: '600' },
  subContainer: { marginLeft: 25, borderLeftWidth: 1, borderLeftColor: '#F0F0F0', paddingLeft: 10 },
  subMenuItem: { paddingVertical: 10, paddingHorizontal: 10 },
  activeSubItem: { backgroundColor: '#FFF5F5', borderRadius: 6 },
  subMenuText: { fontSize: 14, color: '#666' },
  activeSubText: { color: '#E63946', fontWeight: '600' },
  logoutItem: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  bottomPadding: { height: 20 },
});

export default DrawerContent;