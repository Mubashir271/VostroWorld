// src/utils/profileEdit.ts
//
// "Edit my info" — opens the Employee Dashboard's Change Information modal.
// Shared by the drawer's pencil and the Account screen's pencil so both go to
// the same place for the same roles.

import {
  isEmployee, isPhysio, isGeneralTrainer, isTrainer, isNutritionist,
} from '../config/permissions';

/** Roles whose own Employee Dashboard is open to them (see *_ALLOWED_SCREENS). */
export const canEditOwnProfile = (role?: string | null) =>
  isEmployee(role) || isPhysio(role) || isGeneralTrainer(role)
  || isTrainer(role) || isNutritionist(role);

/**
 * For a blank-role employee or a physio the Home tab *is* the Employee
 * Dashboard, so the signal goes there; everyone else's Home is a role
 * dashboard, so the stack's EmployeeDashboard route is opened instead. The
 * timestamp makes every tap distinct, so the modal re-opens each time.
 */
export const openProfileEdit = (navigation: any, role?: string | null) => {
  const openEdit = Date.now();
  if (isEmployee(role) || isPhysio(role)) {
    navigation.navigate('Main', {
      screen: 'Home',
      params: { screen: 'Dashboard', params: { openEdit } },
    });
  } else {
    navigation.navigate('EmployeeDashboard', { openEdit });
  }
};
