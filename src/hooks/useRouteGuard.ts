// src/hooks/useRouteGuard.ts
//
// Usage in any screen:
//
//   import { useRouteGuard } from '../../hooks/useRouteGuard';
//   import AccessDenied from '../screens/AccessDenied';
//
//   const MyAdminScreen = () => {
//     const { accessDenied } = useRouteGuard('Settings');
//     if (accessDenied) return <AccessDenied />;
//     return <View>...</View>;
//   };

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { isAdmin, isSales, SALES_ALLOWED_SCREENS, PERSONAL_TRAINER_ALLOWED_SCREENS } from '../config/permissions';

interface RouteGuardResult {
  accessDenied: boolean;  // true  → render <AccessDenied />
  isAdmin: boolean;       // true  → user has full admin access
}

/**
 * Guards the current screen against non-admin users.
 *
 * @param screenName  The stack screen name of the current screen.
 *                    Checked against PERSONAL_TRAINER_ALLOWED_SCREENS.
 *                    If omitted, the screen is treated as admin-only.
 *
 * @returns { accessDenied, isAdmin }
 */
export const useRouteGuard = (screenName?: string): RouteGuardResult => {
  const profile     = useSelector((state: RootState) => state.user.profile);
  const userIsAdmin = isAdmin(profile?.role);

  // Sales shares the admin bottom tabs (Members/Package/Reports), so it has to
  // clear this guard too — MembersStack and PackageStack call it with their
  // tab route names.
  const salesAllowed =
    isSales(profile?.role) &&
    !!screenName &&
    SALES_ALLOWED_SCREENS.includes(screenName);

  const allowed =
    userIsAdmin ||
    salesAllowed ||
    !screenName ||
    PERSONAL_TRAINER_ALLOWED_SCREENS.includes(screenName);

  const [accessDenied, setAccessDenied] = useState(!allowed);

  useEffect(() => {
    setAccessDenied(!allowed);
  }, [allowed]);

  return { accessDenied, isAdmin: userIsAdmin };
};