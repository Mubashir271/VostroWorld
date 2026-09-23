// src/navigation/DrawerNavigation/DrawerContent.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Edit_fill } from '../../assets/icons';
import ProfileHeader from '../../components/ProfileHeader';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { performLogout } from '../../utils/logout';
import { clearCredentials } from '../../utils/biometrics';
import {
  isAdmin,
  isHR,
  isSales,
  isNutritionist,
  isFitnessManager,
  TRAINER_ALLOWED_MENUS,
  TRAINER_ALLOWED_HR_CHILDREN,
  ADMIN_HIDDEN_MENUS,
  NUTRITIONIST_ALLOWED_MENUS,
  NUTRITIONIST_ALLOWED_FITNESS_CHILDREN,
  NUTRITIONIST_ALLOWED_NUTRITION_CHILDREN,
  FITNESS_MANAGER_ALLOWED_MENUS,
  FITNESS_MANAGER_ALLOWED_FITNESS_CHILDREN,
  FITNESS_MANAGER_ALLOWED_NUTRITION_CHILDREN,
  roleLabelOf,
  isEmployee,
  isSuperAdmin,
  isTrainer,
  isGeneralTrainer,
  GENERAL_TRAINER_ALLOWED_MENUS,
} from '../../config/permissions';

// ─── Menu definition ────────────────────────────────────────────────────────

// One drawer row. Declared explicitly rather than left to inference: the menus
// nest three deep in places (Finance › Legacy finance › Cash › …) and the
// inferred literal type of MENU stopped matching the role-filtered menus that
// are cast to `typeof MENU`.
type MenuItem = {
  title: string;
  icon?: string;
  screen?: string;
  /** Greyed out and not tappable — the web marks these SOON. */
  soon?: boolean;
  /** A caption rather than a row: its children render beneath it, always
   *  visible, with no expand/collapse of their own. */
  header?: boolean;
  children?: MenuItem[];
};

// The package-definition lists. They used to sit inside the admin Sales
// section; they are now a drawer section of their own, and the same group is
// reused as super admin's CRM / Clients › Packages.
const SALES_PACKAGES: MenuItem = {
  title: 'Packages',
  icon: 'package-variant',
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
};

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
const MENU: MenuItem[] = [
  // ── Shared ────────────────────────────────────────────────────────────────
  { title: 'Dashboard', icon: 'view-dashboard', screen: 'Dashboard' },
  // Super Admin only — filtered out for the F-11 / G-13 admins below, since
  // the web shows it under the all-branches login.
  { title: 'Admin Dashboard', icon: 'view-dashboard-variant', screen: 'AdminDashboard' },

  // ── Trainer-only (hidden from admin by ADMIN_HIDDEN_MENUS) ────────────────
  // { title: 'My Commission', icon: 'cash-multiple', screen: 'TrainerCommission' },
  // {
  //   title: 'HR Management',
  //   icon: 'briefcase-account',
  //   children: [
  //     { title: 'Leave Applications', screen: 'LeaveApplications' },
  //     { title: 'My Salary Slip',     screen: 'MySalarySlip' },
  //   ],
  // },

  // ── Admin: Sales ──────────────────────────────────────────────────────────
  {
    title: 'Sales',
    icon: 'store',
    children: [
      { title: 'View Clients', screen: 'ViewClients' },
      { title: 'Add Client', screen: 'NewMemberRegistration' },
      { title: 'Clients Report', screen: 'ClientsReport' },
      { title: 'Session Report', screen: 'SalesSessionReport' },
      // Real sell/renew flow (client search -> Package Sell -> cart). The old
      // `NewPackage` screen it used to point at is a hardcoded package-definition
      // mock with no API calls — see screens/Sales/SellPackage.
      { title: 'Sell Package', screen: 'SellPackage' },
      { title: 'View Freezing', screen: 'ViewFreezing' },
      { title: 'Categories', screen: 'Categories' },
      { title: 'Sub-Categories', screen: 'SubCategories' },
      { title: 'Manage Towels', screen: 'ManageTowels' },
      { title: 'Assign Cards', screen: 'AssignCards' },
      { title: 'View Cards', screen: 'ViewCards' },
      { title: 'Manage Branches', screen: 'ManageBranches' },
    ],
  },

  // ── Admin: Packages ───────────────────────────────────────────────────────
  // Its own section rather than a Sales subgroup, so the package-definition
  // screens stay one tap from the drawer root.
  SALES_PACKAGES,

  // ── Admin: Human Resource ─────────────────────────────────────────────────
  {
    title: 'Human Resource',
    icon: 'briefcase-account',
    children: [
      { title: 'HR Dashboard', screen: 'HRDashboard' },
      { title: 'Employee Master', screen: 'EmployeeMaster' },
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
          { title: 'Staff Attendance', screen: 'StaffAttendanceReport' },
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
      { title: 'Categories', screen: 'CafeCategories' },
      { title: 'Products', screen: 'CafeProducts' },
      { title: 'Inventory', soon: true },
      { title: 'Cafe Orders', screen: 'Orders' },
      { title: 'Cafe Deposits', screen: 'CafeDeposits' },
      { title: 'Add Clients Deposit', screen: 'AddClientsDeposit' },
      { title: 'Clients Balance', screen: 'ClientsAvailableBalance' },
      { title: 'Deposit History', screen: 'DepositsHistory' },
      { title: 'Sales', soon: true },
      { title: 'Expenses', soon: true },
      { title: 'Closing', soon: true },
      { title: 'Cafe Sales Report', screen: 'CafeSalesReport' },
      { title: 'Detailed Cafe Report', screen: 'DetailedCafeReport' },
      { title: 'Management Pendings', screen: 'ManagementPendings' },
      { title: 'Cafe Reports', soon: true },
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
      { title: 'Detailed Cafe Report', screen: 'DetailedCafeReport' },
      { title: 'Transaction Report', screen: 'TransactionReport' },
      { title: 'Staff Attendance', screen: 'StaffAttendanceReport' },
      { title: 'Clients Attendance', screen: 'ClientsAttendance' },
      { title: 'Footfall Report', screen: 'FootfallReport' },
    ],
  },

  // ── Admin: Finance ────────────────────────────────────────────────────────
  // Mirrors the web's Finance sidebar (checked 2026-09-21), which splits into
  // a "Finance V2 Books" group and a "Legacy finance" group. Every legacy
  // screen exists in the app; none of the V2 ones do yet, so those are marked
  // "soon" — as are Accounts / Receivables / Payables / Ledgers, which the web
  // itself marks SOON.
  {
    title: 'Finance',
    icon: 'finance',
    children: [
      {
        title: 'Finance V2 Books',
        header: true,
        children: [
          { title: 'Finance Dashboard', screen: 'FinanceDashboardV2' },
          { title: 'Setup wizard', screen: 'SetupWizardV2' },
          { title: 'Import & sync', screen: 'ImportSyncV2' },
          { title: 'Journals', screen: 'JournalsV2' },
          { title: 'Financial Reports (V2)', screen: 'FinancialReportsV2' },
          { title: 'Accounts', soon: true },
          { title: 'Receivables', soon: true },
          { title: 'Payables', soon: true },
        ],
      },
      {
        title: 'Legacy finance',
        header: true,
        children: [
          { title: 'Finance dashboard (legacy)', screen: 'FinanceDashboard' },
          {
            title: 'Expenses',
            children: [
              { title: 'Add Expense', screen: 'AddExpense' },
              { title: 'View Expenses', screen: 'Expenses' },
              { title: 'Daily Expense', screen: 'DailyExpense' },
              { title: 'Daily Expense Report', screen: 'DailyExpenseReport' },
              { title: 'Paid Expense Report', screen: 'PaidExpenseReport' },
            ],
          },
          {
            // The web keeps all four cash books under one "Cash" group; the
            // app used to split them into Cash In Hand / Office / Petty / G13.
            title: 'Cash',
            children: [
              { title: 'Add Cash In Hand', screen: 'AddCashInHand' },
              { title: 'View Cash In Hand', screen: 'ViewCashInHand' },
              { title: 'Add Office Cash', screen: 'AddOfficeCash' },
              { title: 'View Office Ledger', screen: 'ViewOfficeLedger' },
              { title: 'Add Petty Cash', screen: 'AddPettyCash' },
              { title: 'Petty Cash Ledger', screen: 'PettyCashLedger' },
              { title: 'Add G13 Cash', screen: 'AddG13Cash' },
              { title: 'G13 Cash Ledger', screen: 'G13CashLedger' },
            ],
          },
          {
            title: 'Bank',
            children: [
              { title: 'Add Bank Cash', screen: 'AddBankCash' },
              { title: 'View Bank Ledger', screen: 'ViewBankLedger' },
              { title: 'Bank Details', screen: 'BankDetails' },
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
          // The web calls this "Daily Closing".
          { title: 'Daily Closing', screen: 'DailyOfficeClosing' },
          { title: 'Ledgers', soon: true },
        ],
      },
    ],
  },

  // ── Admin: Fitness ────────────────────────────────────────────────────────
  {
    title: 'Fitness',
    icon: 'dumbbell',
    children: [
      { title: 'SOPs', screen: 'SOPs' },
      { title: 'Personal Trainer Diary', screen: 'PersonalTrainerDiary' },
      { title: 'PT Dashboard', screen: 'PTDashboard' },
      { title: 'Session Attendance Report', screen: 'SessionAttendanceReport' },
      { title: 'Session Tracker', screen: 'SessionTracker' },
      { title: 'Trainer Diary', screen: 'TrainerDiary' },
      { title: 'PT Sales Report', screen: 'PTSalesReport' },
      { title: 'Switch Booking Time', screen: 'SwitchBookingTime' },
      { title: 'Trainer Appointments', screen: 'TrainerAppointments' },
      { title: 'Session Attendance', screen: 'SessionAttendance' },
      { title: 'New PT Bookings', screen: 'NewPTBookings' },
      { title: 'New PT Clients', screen: 'NewPTClients' },
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
      { title: 'Nutrition Dashboard', screen: 'NutritionDashboard' },
      { title: 'Clients Details', screen: 'ClientsDetails' },
      { title: 'Appointments', screen: 'NutritionAppointments' },
      {
        title: 'Assessments',
        children: [
          { title: 'Add Nutrition Assessments', screen: 'AddNutritionAssessments' },
          { title: 'View Nutrition Assessments', screen: 'ViewNutritionAssessments' },
        ],
      },
      {
        title: 'Meals Plan',
        children: [
          { title: 'Add Meals Plan', screen: 'AddMealsPlan' },
          { title: 'View Meals Plan', screen: 'ViewMealsPlan' },
        ],
      },
      { title: 'Diet Plan Issuance', screen: 'ViewDietPlanIssued' },
      { title: 'Health Camps', screen: 'HealthCamps' },
      { title: 'Referrals', screen: 'ReferralSheet' },
      { title: 'Nutrition Packages', screen: 'NutritionPackages' },





      { title: 'Image Gallery', screen: 'NutritionImageGallery' },
      {
        title: 'Assessment Questionnaire',
        children: [
          { title: 'Add Questionnaire', screen: 'AddAssessmentQuestionnaire' },
          { title: 'View Questionnaire', screen: 'ViewAssessmentQuestionnaire' },
        ],
      },
    ],
  },

  // ── Admin: Physiotherapy ──────────────────────────────────────────────────
  {
    title: 'Physiotherapy',
    icon: 'medical-bag',
    children: [
      { title: 'Physio Dashboard', screen: 'PhysiotherapyDashboard' },
      { title: 'Client / Patient Details', screen: 'PhysiotherapyPatientDetails' },
      { title: 'Appointments', screen: 'PhysiotherapyAppointments' },
      { title: 'Assessments', soon: true },
      { title: 'Prescriptions', screen: 'PhysiotherapyPrescriptions' },
      { title: 'Sessions / GX', screen: 'PhysiotherapyGX' },
      
      { title: 'Referrals', screen: 'PhysiotherapyDailyClientReferral' },
      { title: 'Client Responses', screen: 'PhysiotherapyClientResponses' },
      { title: 'Physio Reports', soon: true },
    ],
  },

  // ── Settings / Approval / Notifications ───────────────────────────────────
  { title: 'Settings', icon: 'cog', screen: 'Settings' },
  { title: 'Approval', icon: 'check-circle', screen: 'ApprovalsScreen' },
  { title: 'Notifications', icon: 'bell-outline', screen: 'Notifications' },
]
// ─── Sales menu ─────────────────────────────────────────────────────────────
// Captured 2026-09-02 from the web admin's Sales login with every section
// expanded. Spelled out rather than filtered from MENU because the Sales menu
// reorders its items, renames two ('View Freezing' → 'Freezing Management'),
// and pulls in two entries that don't live in admin's Sales section at all
// ('Daily Sales Report' → /daily-sales-counter, and 'Cafe Products').
//
// Omitted — present on the web but with no screen in this app yet:
//   Cafe ▸ Detailed Cafe Report      (/detailed-cafe-report)
//   Reports ▸ Active Clients Report  (/active-clients-report)
//   Reports ▸ Client Details Report  (/client-details-report)
//   Reports ▸ Detailed Cafe Report   (/detailed-cafe-report)
// 'Social Leads (Sales)' is also on the web menu, deliberately deferred.
// The whole menu for a blank-role staff record — confirmed live 2026-09-07
// against the web, which shows this single entry and nothing else.
const EMPLOYEE_MENU = [
  { title: 'Employee Dashboard', icon: 'badge-account', screen: 'EmployeeDashboard' },
];

// Super Admin's Dashboard group — the web's all-branches login shows these
// under one expandable "Dashboard" (checked 2026-09-18), in this order. It
// replaces the flat Dashboard / Admin Dashboard entries and absorbs the
// standalone Approval entry. `soon` items are greyed out and not tappable:
// the web marks My Dashboard, Alerts & Notifications and Calendar "SOON", and
// Social Media Dashboard has no screen in the app yet.
// The trainer's Dashboard section. The web serves role 9 a collapsible
// "Dashboard" group whose only child is "Employee Dashboard" (confirmed live
// 2026-09-23 from the trainer login's own /v1/admin/menu-access/mine), rather
// than the flat "Dashboard" link every other role gets here.
//
// The group deliberately has no `screen` of its own: a parent with children is
// an expand/collapse row, so giving it one would make the header both toggle
// and navigate.
const TRAINER_DASHBOARD = {
  title: 'Dashboard',
  icon: 'view-dashboard',
  children: [
    { title: 'Employee Dashboard', screen: 'EmployeeDashboard' },
  ],
};

// The General Trainer's Fitness section. The web gives role 17 exactly one
// Fitness child, GT Dashboard (/gt-dashboard), backed by
// /v1/fitness/general-trainer/summary.
const GENERAL_TRAINER_FITNESS = {
  title: 'Fitness',
  icon: 'dumbbell',
  children: [
    { title: 'GT Dashboard', screen: 'GTDashboard' },
  ],
};

const SUPER_ADMIN_DASHBOARD = {
  title: 'Dashboard',
  icon: 'view-dashboard',
  children: [
    { title: 'Admin Dashboard', screen: 'AdminDashboard' },
    { title: 'Fitness Dashboard', screen: 'FitnessDashboard' },
    // The web lists Nutrition Dashboard and Marketing Dashboard here as well
    // as under their own sections (sidebar checked 2026-09-21); Marketing
    // Dashboard is the web's "Social Media Dashboard" page.
    { title: 'Nutrition Dashboard', screen: 'NutritionDashboard' },
    { title: 'Marketing Dashboard', screen: 'MarketingDashboard' },
    // { title: 'Dashboard', screen: 'Dashboard' },
    // { title: 'My Dashboard', soon: true },
    { title: 'Announcements', screen: 'Announcements' },
    { title: 'Approvals', screen: 'ApprovalsScreen' },
    // { title: 'Alerts & Notifications', soon: true },
    // { title: 'Calendar', soon: true },
  ],
};

// Super Admin's Marketing section — the web's sidebar (checked 2026-09-21).
// Only Marketing Dashboard has a screen in the app so far; Social Leads is
// coming, and the web itself marks the rest "SOON".
const SUPER_ADMIN_MARKETING = {
  title: 'Marketing',
  icon: 'bullhorn',
  children: [
    { title: 'Marketing Dashboard', screen: 'MarketingDashboard' },
    { title: 'Campaigns', soon: true },
    { title: 'Social Media', soon: true },
    { title: 'Content', soon: true },
    { title: 'Social Leads', screen: 'SocialLeads' },
    { title: 'Campaign Leads', soon: true },
    { title: 'Promotions & Offers', soon: true },
    { title: 'Events', soon: true },
    { title: 'Media Library', soon: true },
    { title: 'Marketing Reports', soon: true },
  ],
};

// Super Admin's CRM / Clients section — the web's all-branches sidebar
// (checked 2026-09-18), in its order and wording, mapped to existing screens.
// Packages reuses the admin Sales › Packages list; Memberships opens the
// membership package view/add screen. The web itself marks the four
// client-record items "SOON".
// Packages is not repeated here: it is its own top-level drawer section now,
// so super admin would otherwise see the same group twice.
const buildSuperAdminCRM = (): MenuItem => ({
  title: 'CRM / Clients',
  icon: 'account-group',
  children: [
    { title: 'Clients', screen: 'ViewClients' },
    { title: 'Add Client', screen: 'NewMemberRegistration' },
    { title: 'Freezing', screen: 'ViewFreezing' },
    { title: 'Access Control — Assign Cards', screen: 'AssignCards' },
    { title: 'Access Control — View Cards', screen: 'ViewCards' },
    { title: 'Client Profile', soon: true },
    // { title: 'Client Attendance', soon: true },
    // { title: 'Client Notes', soon: true },
    // { title: 'Client Documents', soon: true },
  ],
});

// Top-level order of the web's super admin sidebar, with its shorter names.
// Sections the app doesn't have (Facility, Marketing, Administration) are
// skipped; anything not listed keeps its place after these.
const SUPER_ADMIN_ORDER: [string, string][] = [
  ['Sales', 'Sales'],
  ['Fitness', 'Fitness'],
  ['Human Resource', 'HR'],
  ['Finance', 'Finance'],
  ['Nutrition', 'Nutrition'],
  ['Physiotherapy', 'Physio'],
  ['Cafe', 'Cafe'],
  // ['Facility', 'Facility'],  
  ['Reports', 'Reports'],
];

// HR login's own menu — mirrors the web HR-login sidebar item-for-item
// (checked 2026-09-18): a flat "HR" section in the web's order and wording,
// mapped onto the existing Human Resource screens. The admin's grouped
// "Manage Staff" layout doesn't match what HR sees on the web.
const HR_MENU = [
  { title: 'Dashboard', icon: 'view-dashboard', screen: 'Dashboard' },
  {
    title: 'HR',
    icon: 'briefcase-account',
    children: [
      { title: 'HR Dashboard', screen: 'HRDashboard' },
      { title: 'Employee Master', screen: 'EmployeeMaster' },
      { title: 'Add Employee', screen: 'AddStaff' },
      { title: 'Attendance', screen: 'StaffAttendanceReport' },
      { title: 'Employee Attendance', screen: 'EmployeeAttendance' },
      { title: 'PT Attendance', screen: 'PTAttendance' },
      { title: 'Staff Duty Hours', screen: 'StaffDutyHours' },
      {
        title: 'Leave Management',
        children: [
          { title: 'Leave Quota', screen: 'LeaveQuota' },
          { title: 'Leave Application', screen: 'LeaveApplications' },
        ],
      },
      { title: 'Salary Management', screen: 'SalaryManagement' },
      { title: 'Salary Components', screen: 'SalaryComponent' },
      { title: 'Loans / Advances', screen: 'StaffLoans' },
      { title: 'Staff Advances', screen: 'StaffAdvances' },
      { title: 'Fines & Penalties', screen: 'StaffFinance' },
      { title: 'Promotions & Disciplinary', screen: 'StaffPromotion' },
      { title: 'Session Portal', screen: 'SessionPortalHR' },
      { title: 'Resource Management', screen: 'ResourceManager' },
      { title: 'Letters & Certificates', screen: 'LetterManagement' },
      { title: 'HR Reports', screen: 'DetailedHRReport' },
    ],
  },
];

const SALES_MENU = [
  { title: 'Dashboard', icon: 'view-dashboard', screen: 'Dashboard' },
  {
    title: 'Sales',
    icon: 'store',
    children: [
      { title: 'View Clients', screen: 'ViewClients' },
      { title: 'Add Client', screen: 'NewMemberRegistration' },
      { title: 'Clients Report', screen: 'ClientsReport' },
      { title: 'Daily Sales Report', screen: 'DailySalesCounter' },
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
      { title: 'Cafe Products', screen: 'CafeProducts' },
      { title: 'Sell Package', screen: 'SellPackage' },
      { title: 'Freezing Management', screen: 'ViewFreezing' },
      { title: 'Assign Cards', screen: 'AssignCards' },
      { title: 'View Cards', screen: 'ViewCards' },
    ],
  },
  {
    title: 'Cafe',
    icon: 'coffee',
    children: [
      { title: 'Cafe Dashboard', screen: 'CafeDashboard' },
      { title: 'Cafe Categories', screen: 'CafeCategories' },
      { title: 'Cafe Products', screen: 'CafeProducts' },
      { title: 'Cafe Deposits', screen: 'CafeDeposits' },
      { title: 'Add Clients Deposit', screen: 'AddClientsDeposit' },
      { title: 'Clients Available Balance', screen: 'ClientsAvailableBalance' },
      { title: 'Deposits History', screen: 'DepositsHistory' },
      { title: 'Cafe Sales Report', screen: 'CafeSalesReport' },
      { title: 'Detailed Cafe Report', screen: 'DetailedCafeReport' },
      { title: 'Management Pendings', screen: 'ManagementPendings' },
    ],
  },
  {
    title: 'Reports',
    icon: 'chart-bar',
    children: [
      { title: 'Clients Reports', screen: 'ClientsReports' },
      { title: 'Sales', screen: 'SalesReport' },
      { title: 'Detailed Sales Report', screen: 'DetailedSalesReport' },
      { title: 'MIS Report', screen: 'MISReport' },
      { title: 'Sales By Services', screen: 'SalesByServices' },
      { title: 'Sales By Bootcamp', screen: 'SalesByBootcamp' },
      { title: 'Cafe Sales', screen: 'CafeReports' },
      { title: 'Detailed Cafe Report', screen: 'DetailedCafeReport' },
      { title: 'Transaction Report', screen: 'TransactionReport' },
      { title: 'Clients Attendance', screen: 'ClientsAttendance' },
      { title: 'Footfall Report', screen: 'FootfallReport' },
    ],
  },
  {
    title: 'Nutrition',
    icon: 'food-apple',
    children: [
      { title: 'Nutrition Packages', screen: 'NutritionPackages' },
      { title: 'Appointments', screen: 'NutritionAppointments' },
    ],
  },
  {
    title: 'Physiotherapy',
    icon: 'medical-bag',
    children: [
      { title: 'Appointments', screen: 'PhysiotherapyAppointments' },
    ],
  },
  { title: 'Approval', icon: 'check-circle', screen: 'ApprovalsScreen' },
  { title: 'Notifications', icon: 'bell-outline', screen: 'Notifications' },
];

// ─── Navigation helper ───────────────────────────────────────────────────────
// Screens that are also a bottom tab's root for certain roles must be reached
// by switching tab focus, not by pushing a second instance on the root Stack —
// pushing a duplicate on top of the already-mounted tab causes a torn/split
// render on iOS when the duplicate is popped back (react-native-screens
// compositing over a live sibling instance of the same screen).
const navigateTo = (navigation: any, screen: string, role?: string | null) => {
  if (screen === 'Dashboard') {
    navigation.navigate('Main', { screen: 'Home' });
  } else if (screen === 'EmployeeDashboard' && isEmployee(role)) {
    // For a blank-role account the Home tab already *is* this dashboard, so
    // switch tab focus rather than pushing the stack route — otherwise the
    // drawer opens a second copy over the live one, the exact duplicate-mount
    // problem this function exists to avoid.
    navigation.navigate('Main', { screen: 'Home' });
  } else if (screen === 'PTDashboard' && isTrainer(role)) {
    // A trainer's Home tab *is* the PT Dashboard, so the Fitness › PT
    // Dashboard entry must switch tab focus rather than push the stack route —
    // pushing would mount a second copy over the live one, the duplicate-mount
    // problem described above.
    navigation.navigate('Main', { screen: 'Home' });
  } else if (screen === 'SessionTracker' && isTrainer(role)) {
    // Same reason: Session Tracker is a bottom tab for role 9.
    navigation.navigate('Main', { screen: 'SessionTrackerTab' });
  } else if (screen === 'NutritionDashboard' && (isNutritionist(role) || isFitnessManager(role))) {
    navigation.navigate('Main', { screen: 'NutritionTab' });
  } else if (screen === 'GXAttendance' && isNutritionist(role)) {
    navigation.navigate('Main', { screen: 'AttendanceTab' });
  } else if (screen === 'SessionPortalHR' && isFitnessManager(role)) {
    navigation.navigate('Main', { screen: 'SessionPortalTab' });
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
  role: string | null | undefined,
): typeof MENU => {
  if (isEmployee(role)) {
    // A staff record with no role: the web shows exactly one item.
    return EMPLOYEE_MENU as typeof MENU;
  }

  if (isAdmin(role)) {
    // Admin: hide all trainer-only top-level items. Admin Dashboard is the
    // one entry reserved for Super Admin — the branch admins (role '3') are
    // pinned to a single branch and the screen is built around "All Branches".
    const adminMenu = menu.filter(
      item =>
        !ADMIN_HIDDEN_MENUS.includes(item.title) &&
        (item.title !== 'Admin Dashboard' || isSuperAdmin(role)),
    );
    if (!isSuperAdmin(role)) return adminMenu;
    const rest = adminMenu.filter(
      item => !['Dashboard', 'Admin Dashboard', 'Approval'].includes(item.title),
    );
    const ordered = SUPER_ADMIN_ORDER
      .map(([from, to]) => {
        const item = rest.find(i => i.title === from);
        return item ? { ...item, title: to } : null;
      })
      .filter(Boolean);
    const others = rest.filter(i => !SUPER_ADMIN_ORDER.some(([from]) => from === i.title));
    // Marketing has no counterpart in the shared admin menu, so it is not in
    // SUPER_ADMIN_ORDER. The web puts it immediately before Reports.
    const reportsAt = ordered.findIndex((i: any) => i.title === 'Reports');
    const withMarketing = reportsAt === -1
      ? [...ordered, SUPER_ADMIN_MARKETING]
      : [...ordered.slice(0, reportsAt), SUPER_ADMIN_MARKETING, ...ordered.slice(reportsAt)];
    return [
      SUPER_ADMIN_DASHBOARD,
      buildSuperAdminCRM(),
      ...withMarketing,
      ...others,
    ] as typeof MENU;
  }

  if (isHR(role)) {
    // HR has its own menu (see HR_MENU), plus the shared Notifications entry.
    return [
      ...HR_MENU,
      ...menu.filter(item => item.title === 'Notifications'),
    ] as typeof MENU;
  }

  if (isSales(role)) {
    // Sales has its own menu rather than a filtered view of the admin one —
    // see SALES_MENU for why.
    return SALES_MENU as typeof MENU;
  }

  if (isFitnessManager(role)) {
    // Fitness Manager: Dashboard, Human Resource › Session Portal, Fitness
    // (curated subset), Nutrition (curated subset), Notifications — web
    // Fitness-Manager login menu, re-checked 2026-09-14. No Staff Commissions.
    // Session Portal sits in its own "Human Resource" section, directly under
    // Dashboard — matching the web's Fitness-Manager drawer (Employee
    // Dashboard, Announcements, Human Resource › Session Portal, Fitness,
    // Nutrition), not appended to Fitness.
    const hrForFitnessManager = {
      title: 'Human Resource',
      icon: 'briefcase-account',
      children: [{ title: 'Session Portal', screen: 'SessionPortalHR' }],
    };

    const filtered = menu
      .filter(item => FITNESS_MANAGER_ALLOWED_MENUS.includes(item.title))
      .map(item => {
        if (item.title === 'Fitness' && item.children) {
          return {
            ...item,
            children: item.children.filter(c =>
              FITNESS_MANAGER_ALLOWED_FITNESS_CHILDREN.includes(c.title),
            ),
          };
        }
        if (item.title === 'Nutrition' && item.children) {
          return {
            ...item,
            children: item.children.filter(c =>
              FITNESS_MANAGER_ALLOWED_NUTRITION_CHILDREN.includes(c.title),
            ),
          };
        }
        return item;
      });

    const dashIdx = filtered.findIndex(item => item.title === 'Dashboard');
    return [
      ...filtered.slice(0, dashIdx + 1),
      hrForFitnessManager as typeof MENU[number],
      ...filtered.slice(dashIdx + 1),
    ];
  }

  if (isNutritionist(role)) {
    // Nutritionist: Dashboard, Fitness (GX Classes only), Nutrition (full,
    // minus admin-only Packages/Assessments), Notifications — confirmed
    // live 2026-07-23 against the web admin's Nutritionist-login menu.
    return menu
      .filter(item => NUTRITIONIST_ALLOWED_MENUS.includes(item.title))
      .map(item => {
        if (item.title === 'Fitness' && item.children) {
          return {
            ...item,
            children: item.children.filter(c =>
              NUTRITIONIST_ALLOWED_FITNESS_CHILDREN.includes(c.title),
            ),
          };
        }
        if (item.title === 'Nutrition' && item.children) {
          return {
            ...item,
            children: item.children.filter(c =>
              NUTRITIONIST_ALLOWED_NUTRITION_CHILDREN.includes(c.title),
            ),
          };
        }
        return item;
      });
  }

  // General Trainer (role '17'): Dashboard › Employee Dashboard, and a
  // Fitness section holding only GT Dashboard. Must be tested before the
  // trainer fallthrough below, which would otherwise hand role 17 the whole
  // personal-trainer menu.
  if (isGeneralTrainer(role)) {
    return menu
      .filter(item => GENERAL_TRAINER_ALLOWED_MENUS.includes(item.title))
      .map(item => {
        if (item.title === 'Dashboard') {
          // Same collapsible group the personal trainer gets — the web serves
          // both roles Dashboard › Employee Dashboard.
          return TRAINER_DASHBOARD as typeof MENU[number];
        }
        if (item.title === 'Fitness') {
          return GENERAL_TRAINER_FITNESS as typeof MENU[number];
        }
        return item;
      });
  }

  // Trainer: keep only allowed sections
  return menu
    .filter(item => TRAINER_ALLOWED_MENUS.includes(item.title))
    .map(item => {
      // Flat "Dashboard" link → collapsible group holding Employee Dashboard,
      // matching the web. The trainer's landing screen is the PT Dashboard
      // (see screens/home/index.tsx), so the employee one needs a home of its
      // own in the menu rather than being what "Dashboard" opens.
      if (item.title === 'Dashboard') {
        return TRAINER_DASHBOARD as typeof MENU[number];
      }
      if (item.title === 'HR Management' && item.children) {
        return {
          ...item,
          children: item.children.filter(c =>
            TRAINER_ALLOWED_HR_CHILDREN.includes(c.title),
          ),
        };
      }
      if (item.title === 'Fitness' && item.children) {
        // Match website trainer Fitness section exactly — the list below is
        // the trainer login's own `/v1/admin/menu-access/mine` response
        // (confirmed live 2026-09-23, role 9), which is what drives the web
        // sidebar.
        //
        // 'Session Attendance Report' is deliberately absent: the web does not
        // offer it to role 9, and it was hidden here on 2026-09-23 to match.
        // It stays in the admin MENU above, so other roles are unaffected.
        //
        // 'SOPs' is the one remaining difference — the web serves it under
        // Human Resource for trainers, this app keeps it under Fitness.
        const TRAINER_FITNESS = ['SOPs', 'Personal Trainer Diary', 'PT Dashboard', 'Fitness Plan', 'Session Tracker'];
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
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [active, setActive] = React.useState('Dashboard');

  const { profile, appImage } = useSelector((state: RootState) => state.user);

  const firstName = profile?.firstName || 'User';
  const lastName = profile?.lastName || '';
  const role = roleLabelOf(profile?.role, profile?.type);
  // Super admin has no branch of its own (branch_id 0), which used to render
  // as "Branch 0"; the web labels that login "All Branches".
  const branch = profile?.branchName
    || (profile?.branchId ? `Branch ${profile.branchId}` : 'All Branches');
  const avatarSource = appImage
    ? { uri: appImage }
    : profile?.image
      ? { uri: profile.image }
      : require('../../assets/img/userIcon.png');

  const profileName = `${firstName} ${lastName}`.trim() || 'User';

  const visibleMenu = filterMenuForRole(MENU, profile?.role);

  const handleLogout = () => {
    performLogout();
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

    const isOpen = expanded.has(key);
    const hasChildren = item.children?.length > 0;
    // Only leaves highlight — Super Admin's "Dashboard" group shares its title
    // with the Dashboard entry inside it.
    const isActive = !hasChildren && active === item.title;

    if (item.soon) {
      return (
        <View key={key} style={[styles.menuItem, { paddingLeft: 20 + level * 12 }]}>
          <Text style={[styles.menuText, styles.soonText]}>{item.title}</Text>
          <Text style={styles.soonBadge}>SOON</Text>
        </View>
      );
    }

    // A plain caption over the rows that follow — the web's "Finance V2 Books"
    // and "Legacy finance" are labels, not collapsible groups, so the children
    // render at the header's own level and are always visible.
    if (item.header) {
      return (
        <View key={key}>
          <Text style={[styles.groupHeader, { paddingLeft: 20 + level * 12 }]}>
            {item.title}
          </Text>
          {item.children?.map((child: any) => renderMenuItem(child, level, key))}
        </View>
      );
    }

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
              setExpanded(prev => {
                const next = new Set(prev);
                const isOpen = next.has(key);
                const parent = key.includes('.') ? key.substring(0, key.lastIndexOf('.')) : '';

                // Close all siblings at this level and their descendants (accordion)
                for (const k of [...next]) {
                  const kParent = k.includes('.') ? k.substring(0, k.lastIndexOf('.')) : '';
                  if (kParent === parent && k !== key) {
                    next.delete(k);
                    for (const dk of [...next]) {
                      if (dk.startsWith(k + '.')) next.delete(dk);
                    }
                  }
                }

                if (isOpen) {
                  // Close this item and cascade-close all its descendants
                  next.delete(key);
                  for (const dk of [...next]) {
                    if (dk.startsWith(key + '.')) next.delete(dk);
                  }
                } else {
                  next.add(key);
                }

                return next;
              });
            } else {
              setActive(item.title);
              navigateTo(navigation, item.screen ?? item.title, profile?.role);
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
        role={role}
        branch={branch || 'Main Branch'}
        avatar={avatarSource}
        {...(isEmployee(profile?.role)
          ? {
            // Opens the Employee Dashboard's "Change Information" modal.
            // The timestamp makes each tap a distinct param value, so the
            // modal re-opens rather than being ignored as unchanged state.
            editIcon: Edit_fill,
            onEditPress: () => {
              navigation.navigate('Main', {
                screen: 'Home',
                params: { screen: 'Dashboard', params: { openEdit: Date.now() } },
              });
              setTimeout(() => navigation.closeDrawer?.(), 100);
            },
          }
          : {})}
      />
      {/* Every other role gets no edit affordance. The icon used to navigate to
          'Account', which lives inside the bottom tab navigator
          (Drawer > Main > Tabs > Account) — navigate() from the drawer searches
          the drawer's own routes then bubbles up, never descending into the
          tabs, so it was inert. Give a role an editable screen before
          restoring its icon. */}

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
  groupHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
    paddingTop: 14,
    paddingBottom: 4,
    paddingRight: 20,
  },
  soonText: { fontSize: 13, color: '#BBB' },
  soonBadge: { fontSize: 11, color: '#BBB', fontWeight: '600', letterSpacing: 0.5 },
  logoutItem: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  bottomPadding: { height: 20 },
});

export default DrawerContent;