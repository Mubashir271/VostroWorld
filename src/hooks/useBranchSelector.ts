import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { getBranchesNameList } from '../api/employeeDashboard';

export interface BranchOption {
  id: number;
  name: string;
}

/**
 * Branch selection for screens whose web counterpart renders a required
 * "Branch Name*" dropdown (Leave Quota, Salary Component, Add Keene,
 * Pay Liabilities).
 *
 * Branch-scoped staff are pinned to their own branch — the web shows them the
 * same single option — so they keep the read-only field. Super admin has
 * `branch_id: 0` / `branch_name: null` (confirmed live via /v1/auth/get/10130),
 * meaning there is no own branch to fall back on, so they must pick one before
 * a create can carry a valid branch_id.
 */
export const useBranchSelector = () => {
  const { profile } = useSelector((state: RootState) => state.user);

  const ownBranchId = profile?.branchId ?? null;
  const ownBranchName = profile?.branchName ?? null;

  // branch_id 0 is the super-admin sentinel, not a real branch.
  const needsPicker = !ownBranchId;

  const [options, setOptions] = useState<BranchOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');

  useEffect(() => {
    if (!needsPicker) { return; }
    let cancelled = false;
    setLoadingOptions(true);
    getBranchesNameList()
      .then(res => {
        if (cancelled) { return; }
        const list: BranchOption[] = (res?.data ?? []).map((b: any) => ({
          id: Number(b.id),
          name: String(b.name),
        }));
        setOptions(list);
      })
      .catch(() => { if (!cancelled) { setOptions([]); } })
      .finally(() => { if (!cancelled) { setLoadingOptions(false); } });
    return () => { cancelled = true; };
  }, [needsPicker]);

  const select = useCallback((opt: BranchOption) => {
    setSelectedId(opt.id);
    setSelectedName(opt.name);
  }, []);

  // What a create should send. Null means "not chosen yet" — callers must
  // block submit rather than post an empty branch_id.
  const branchId: number | null = needsPicker ? selectedId : ownBranchId;

  // What the field displays.
  const branchName = needsPicker
    ? selectedName
    : (ownBranchName ?? 'Branch');

  // Listing calls accept an empty branch_id to mean "all branches", which is
  // what the web sends for super admin until a branch is chosen.
  const listBranchId: number | '' = branchId ?? '';

  return {
    needsPicker,
    options,
    loadingOptions,
    branchId,
    branchName,
    listBranchId,
    select,
  };
};
