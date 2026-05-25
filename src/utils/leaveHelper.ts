import {
  checkLeaveExists,
  checkLeaveEligibility,
  checkLeaveAvailability,
  submitLeaveApplication,
} from '../api/employeeDashboard';

interface LeavePayload {
  branch_id: number;
  user_id: number;
  leave_type: string;
  category: 'Full' | 'Half';
  from: string;
  to: string;
  number_of_leaves: number;
  reason: string;
  leave_status?: string;
}

/**
 * Runs all 3 pre-submit checks in sequence, then submits.
 * Throws a user-friendly string on any failure.
 */
export const applyLeaveWithChecks = async (payload: LeavePayload) => {
  // Step 1 — overlap check
  await checkLeaveExists({
    user_id: payload.user_id,
    from: payload.from,
    to: payload.to,
    leave_type: payload.leave_type,
    number_of_leaves: payload.number_of_leaves,
  }).catch(() => {
    throw new Error('You already have a leave application for these dates.');
  });

  // Step 2 — probation eligibility
  await checkLeaveEligibility({
    user_id: payload.user_id,
    date: payload.from,
  }).catch(() => {
    throw new Error('You are not eligible to apply for leave (probation period).');
  });

  // Step 3 — quota check
  await checkLeaveAvailability({
    user_id: payload.user_id,
    leave_type: payload.leave_type,
    number_of_leaves: payload.number_of_leaves,
  }).catch(() => {
    throw new Error('Insufficient leave quota for the selected leave type.');
  });

  // All checks passed — submit
  return submitLeaveApplication({
    ...payload,
    leave_status: payload.leave_status ?? 'Leave',
  });
};
