// src/config/permissions.ts

export const ROLES = {
  ADMIN: '3',
  TRAINER: '9',    // Personal Trainer
};


// Drawer menu sections allowed per role
// Admin (role === '3') gets everything.
// Anyone else (trainer, staff, etc.) gets only these sections + children.

export const TRAINER_ALLOWED_MENUS = [
  'Dashboard',
  'My Clients',
  'Attendance',
  'My Commission',
  'Roster',
  'Fitness',
  'HR Management',
];

// Within HR Management, trainers can only see these children
export const TRAINER_ALLOWED_HR_CHILDREN = [
  'Leave Applications',
  // 'Loan Management',
];

// Stack screen names that trainers are allowed to navigate to
export const TRAINER_ALLOWED_SCREENS = [
  'Drawer',
  'Dashboard',
  // Fitness
  'FitnessPlans',
  'Classes',
  'TrainerManagement',
  'ProgressTracking',
  // HR — own leave & loan only
  'LeaveApplications',
  'ApplyLeave',
  'LeaveDetail',
  'LoanManagement',
  'ApplyLoan',
  'LoanDetail',
  // Always allowed
  'Notifications',
  'Account',
  // 'NewPackage',
];

// Top-level menu items hidden from admin (trainer-only sections)
export const ADMIN_HIDDEN_MENUS = [
  'My Clients',
  'My Commission',
  'Roster',
];

// Children hidden from admin inside their parent section
export const ADMIN_HIDDEN_FITNESS_CHILDREN = [
  'Session History',
];

export const isAdmin = (role?: string | null) => role === ROLES.ADMIN;
export const isTrainer = (role?: string | null) => role === ROLES.TRAINER;

export const hasFullAccess = (role?: string | null) => isAdmin(role);
