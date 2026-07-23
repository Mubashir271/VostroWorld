// src/config/permissions.ts

export const ROLES = {
  SUPER_ADMIN: '1', // confirmed live via /v1/auth/app-login (admin@vostroworld.com)
  ADMIN: '3',
  TRAINER: '9',    // Personal Trainer
  NUTRITIONIST: '10', // confirmed live 2026-07-23 via /v1/auth/get (designation "Nutritionist")
  HR: '12',        // HR Department — confirmed live 2026-06-29 via app-login
};


// Drawer menu sections allowed per role
// Admin (role === '3') gets everything.
// Anyone else (trainer, staff, etc.) gets only these sections + children.

export const TRAINER_ALLOWED_MENUS = [
  'Dashboard',
  'My Commission',
  'HR Management',
  'Fitness',
  'Notifications',
];

// Within HR Management, trainers can only see these children
export const TRAINER_ALLOWED_HR_CHILDREN = [
  'Leave Applications',
  'My Salary Slip',
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
  'Attendance',
  'HR Management', // trainer-only HR section; admin uses 'Human Resource'
];

export const isAdmin = (role?: string | null) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
export const isTrainer = (role?: string | null) => role === ROLES.TRAINER;
export const isHR = (role?: string | null) => role === ROLES.HR;
export const isNutritionist = (role?: string | null) => role === ROLES.NUTRITIONIST;

export const hasFullAccess = (role?: string | null) => isAdmin(role);

// HR-role drawer sections — confirmed live 2026-06-29 against the web
// admin's HR-login menu (Employee Dashboard, Announcements, Human
// Resource). The RN drawer's existing 'Human Resource' section already
// matches the web's HR submenu item-for-item; 'Announcements' has no
// dedicated screen in this app yet and maps to the shared 'Notifications'
// entry instead.
export const HR_ALLOWED_MENUS = ['Dashboard', 'Human Resource', 'Notifications'];

// Stack screen names HR users are allowed to navigate to — every screen
// under the drawer's 'Human Resource' section, plus the always-allowed
// shared ones. Before this list existed, HR (role '12') wasn't recognized
// by `isAdmin`, so `protect()` showed <AccessDenied/> on every one of
// these screens.
export const HR_ALLOWED_SCREENS = [
  'Drawer', 'Dashboard', 'Notifications', 'Account',
  'HRDashboard', 'DetailedHRReport',
  'ViewStaff', 'AddStaff', 'StaffPromotion', 'StaffFinance', 'StaffAdvances',
  'SalaryComponent', 'StaffLoans', 'SalaryManagement', 'StaffCommissions',
  'SessionPortalHR', 'StaffDutyHours', 'EmployeeAttendance', 'PTAttendance',
  'LeaveQuota', 'LeaveApplications',
  'LetterManagement',
  'ResourceManager',
];

// Nutritionist-role drawer sections — confirmed live 2026-07-23 against the
// web admin's Nutritionist-login menu (Employee Dashboard, Fitness > GX
// Classes only, Nutrition in full including the new Image Gallery screen).
export const NUTRITIONIST_ALLOWED_MENUS = ['Dashboard', 'Fitness', 'Nutrition', 'Notifications'];

// Within Fitness, the nutritionist login only shows GX Classes (no SOPs,
// Befit, SPT, Fitness Plan, etc. — those stay admin/trainer-only).
export const NUTRITIONIST_ALLOWED_FITNESS_CHILDREN = ['GX Classes'];

// Within Nutrition, the web's nutritionist login hides 'Nutrition Packages'
// and 'Nutrition Assessments' (admin-only) but adds 'Image Gallery', which
// has no admin-side menu entry yet — it's nutritionist-only for now.
export const NUTRITIONIST_ALLOWED_NUTRITION_CHILDREN = [
  'Meals Plan', 'Clients Details', 'Dashboard', 'Appointments',
  'Diet Plan Issued', 'Health Camps', 'Referral Sheet', 'Image Gallery',
  'Assessment Questionnaire',
];

// Stack screen names nutritionists are allowed to navigate to — every GX
// Classes screen under Fitness, every screen under Nutrition, plus the
// always-allowed shared ones.
export const NUTRITIONIST_ALLOWED_SCREENS = [
  'Drawer', 'Dashboard', 'Notifications', 'Account',
  // Fitness — GX Classes only
  'AddGXSlots', 'AddGXClass', 'GXTrainers', 'GXSlotsList', 'GXBookings',
  'GXAppointments', 'GXAttendance', 'GXAttendanceReport',
  // Nutrition
  'AddMealsPlan', 'ViewMealsPlan', 'ClientsDetails', 'NutritionDashboard',
  'NutritionAppointments', 'AddNutritionAppointment', 'ViewDietPlanIssued',
  'AddDietPlanIssued', 'HealthCamps', 'ReferralSheet',
  'AddAssessmentQuestionnaire', 'ViewAssessmentQuestionnaire',
  'NutritionImageGallery',
];
