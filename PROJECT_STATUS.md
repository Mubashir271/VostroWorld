# VostroWorld Mobile — Project Status

Single source of truth for screen implementation progress, API coverage, and
what's left to build. Updated: **2026-06-19**.

**Base URL:** `https://api.vostro-new.com/public/api`
**App package:** `com.vostroworld` | React Native 0.83.1

---

## Progress Overview

| Section | Total Screens | ✅ Done | 🔴 ComingSoon |
|---|---|---|---|
| Sales | ~25 | ~24 | 1 |
| Human Resource | ~20 | ~14 | 6 |
| Finance | ~26 | ~17 | 11 |
| Fitness | ~25 | 0 | 25 |
| Nutrition | ~12 | 12 | 0 |
| Settings / Other | ~15 | ~15 | 0 |
| **Total pending** | | | **43** |

---

## ✅ Implemented Screens (all wired to real APIs unless noted)

### Sales
| Screen | File | API / Notes |
|---|---|---|
| Home / Dashboard | `src/screens/home/` | `GET /v1/summary`, clients count |
| ViewClients | `src/screens/Sales/ViewClients/` | `GET /v1/clients/get` |
| ViewFreezing | `src/screens/Sales/ViewFreezing/` | `GET /v1/freezing/get` |
| ApprovalsScreen | `src/screens/Sales/ApprovalsScreen/` | `GET /v1/approvals/get` |
| ClientsReport | `src/screens/Sales/ClientsReport/` | `GET /v1/clients/get` |
| MembershipPackages | `src/screens/Sales/MembershipPackages/` | UI only |
| GymPackages | `src/screens/Sales/GymPackages/` | UI only |
| TrainerPackages | `src/screens/Sales/TrainerPackages/` | `GET /v1/packages/get` |
| BootcampPackages | `src/screens/Sales/BootcampPackages/` | `GET /v1/packages/get` |
| PhysiotherapyPackages | `src/screens/Sales/PhysiotherapyPackages/` | `GET /v1/packages/get` |
| MassageChair | `src/screens/Sales/MassageChair/` | `GET /v1/packages/get` |
| SmallPTGroupPackages | `src/screens/Sales/SmallPTGroupPackages/` | `GET /v1/packages/get` |
| GXPackages | `src/screens/Sales/GXPackages/` | `GET /v1/packages/get` |
| CFTPackages | `src/screens/Sales/CFTPackages/` | `GET /v1/packages/get?category=11` |
| GeneralPackages | `src/screens/Sales/GeneralPackages/` | `GET /v1/packages/get?category=9` |
| DetailedPackages | `src/screens/Sales/DetailedPackages/` | `GET /v1/packages/all-with-categories` |
| Categories | `src/screens/Sales/Categories/` | UI only |
| SubCategories | `src/screens/Sales/SubCategories/` | UI only |
| ManageTowels | `src/screens/Sales/ManageTowels/` | UI only |
| AssignCards | `src/screens/Sales/AssignCards/` | UI only |
| ViewCards | `src/screens/Sales/ViewCards/` | UI only |
| ListBranches | `src/screens/Settings/ListBranches/` | Wired |
| AddBranch | `src/screens/Settings/AddBranch/` | Wired |
| BranchManagerAssignment | `src/screens/Settings/BranchManagerAssignment/` | Wired |

### Human Resource
| Screen | File | API / Notes |
|---|---|---|
| HRDashboard | `src/screens/HR/HRDashboard/` | Multi-endpoint fallback (404 on `/v1/hr/dashboard`) |
| ViewStaff | `src/screens/HR/ViewStaff/` | `GET /v1/staff-list/get` or similar |
| SalaryComponent | `src/screens/HR/SalaryComponent/` | `GET /v1/salary-components/get`, `POST .../store` |
| LeaveQuota | `src/screens/HR/LeaveQuota/` | `GET /hr/leaves-quota/index`, `POST .../store` |
| StaffDutyHours | `src/screens/HR/StaffDutyHours/` | `GET /staff-timing/index` — staff dropdown broken (404) |
| EmployeeAttendance | `src/screens/HR/EmployeeAttendance/` | `GET /attendance/index?category=2` — staff dropdown broken |
| PTAttendance | `src/screens/HR/PTAttendance/` | Trainer/session endpoints all 404 |
| StaffCommissions | `src/screens/HR/StaffCommissions/` | `/hr/commissions` 404 |
| SessionPortalHR | `src/screens/HR/SessionPortalHR/` | `/hr/sessions`, `/clients/count` broken |

### Finance
| Screen | File | API / Notes |
|---|---|---|
| FinanceDashboard | `src/screens/Finance/FinanceDashboard/` | `GET /v1/finance/dashboard` |
| Expenses | `src/screens/Finance/Expenses/` | `GET /v1/expenses/get` |
| ViewCashInHand | `src/screens/Finance/ViewCashInHand/` | `GET /finance/cash-in-hand/getCashInHandRecords` |
| AddKeene | `src/screens/Finance/AddKeene/` | `POST /v1/finance/keene-ledger/add` |
| KeeneLedger | `src/screens/Finance/KeeneLedger/` | `GET /v1/finance/keene-ledger/get`, running balance client-side |
| AddLiabilities | `src/screens/Finance/AddLiabilities/` | `POST /v1/finance/liabilities/add` (bulk, dynamic cards) |
| PayLiabilities | `src/screens/Finance/PayLiabilities/` | `POST /v1/finance/liability-installments/pay` |
| ViewLiabilitiesLedger | `src/screens/Finance/ViewLiabilitiesLedger/` | `GET /v1/finance/liability-ledger/get`, running balance |
| AddG13Cash | `src/screens/Finance/AddG13Cash/` | `POST /v1/finance/g-thirteen/add`; Bank Details shown only for Bank Account tx type |
| G13CashLedger | `src/screens/Finance/G13CashLedger/` | `GET /v1/finance/g-thirteen/get`, tx filter, running balance |
| AddPettyCash | `src/screens/Finance/AddPettyCash/` | `POST /v1/finance/petty-cash-ledger/add` |
| PettyCashLedger | `src/screens/Finance/PettyCashLedger/` | `GET /v1/finance/petty-cash-ledger/get`, tx filter, running balance |
| ViewCharityLedger | `src/screens/Finance/ViewCharityLedger/` | `GET /v1/finance/charity/get` + `/current-balance`. Server returns per-row running balances (`f_cash_balance`/`w_cash_balance`/`total_charity`) and an `opening_balance` block — no client-side math needed. Delete wired but server 500s (see Known Issues). |
| AddCharity | `src/screens/Finance/AddCharity/` | `POST /v1/finance/charity/add`. Field contract reverse-engineered live (undocumented): `type` (`Credit`/`Debit`/`Transfer`) + `person` (`Faisal`/`Waqas`, case-sensitive) for Credit/Debit, or `from_person`/`to_person` for Transfer. |
| DailyExpense | `src/screens/Finance/DailyExpense/` | `GET /v1/finance/cash-in-hand/getCashInHandRecords` (Bank/Charity/GST/Cash-in-Hand snapshot) + `GET /v1/expense/get` (itemized list + total) for a single date. Save form wired to `POST .../add` / `PUT .../update/{id}` but not yet live-tested. Scope note: built single-branch (matches app convention) — does **not** replicate the web admin's F-11/G-13 side-by-side comparison or the "Manage Payments/Approvals" section (that workflow already exists as the Liabilities screens). |
| ViewOfficeLedger | `src/screens/Finance/ViewOfficeLedger/` | `GET /v1/finance/office-cash-flow/get` (rows have no pre-computed balance — running balance computed client-side, seeded from the response's `opening_balance.balance`) + `GET /v1/finance/office-cash-flow/office-cash-balance` for the current total (verified matches web UI exactly: `-27,016,089`). Delete confirmed working (204). |
| AddOfficeCash | `src/screens/Finance/AddOfficeCash/` | `POST /v1/finance/office-cash-flow/add` (`branch_id`, `amount`, `type` required; `resource`, `date`, `description`, `is_petty_cash` optional — confirmed via live field-discovery probe). **Submission intentionally disabled** (`ADD_ENABLED = false` in the file) at user's request after an accidental live-write incident during API probing on this and the Charity endpoint; form/API call are fully built and ready, just gated off. |

### Nutrition (all done)
| Screen | File | API |
|---|---|---|
| NutritionDashboard | `src/screens/Nutrition/NutritionDashboard/` | Multiple nutrition endpoints |
| NutritionAppointments | `src/screens/Nutrition/NutritionAppointments/` | `GET /nutrition/appointments` |
| AddNutritionAppointment | `src/screens/Nutrition/AddNutritionAppointment/` | `POST /nutrition/appointments` |
| ClientsDetails | `src/screens/Nutrition/ClientsDetails/` | `GET /nutrition/client-hub` |
| ViewDietPlanIssued | `src/screens/Nutrition/DietPlanIssued/` | `GET /nutrition/diet-plans` |
| AddDietPlanIssued | `src/screens/Nutrition/AddDietPlanIssued/` | `POST /nutrition/diet-plans` (wired, not called) |
| ViewNutritionAssessments | `src/screens/Nutrition/ViewNutritionAssessments/` | `GET /fitness/nutrition-assessments/index` |
| AddNutritionAssessments | `src/screens/Nutrition/AddNutritionAssessments/` | `POST /fitness/nutrition-assessments/store` |
| ViewAssessmentQuestionnaire | `src/screens/Nutrition/ViewAssessmentQuestionnaire/` | `GET /nutrition/nutritionist-assessment-forms` |
| AddAssessmentQuestionnaire | `src/screens/Nutrition/AddAssessmentQuestionnaire/` | `POST /nutrition/nutritionist-assessment-forms` |
| HealthCamps | `src/screens/Nutrition/HealthCamps/` | `GET /nutrition/health-camps` |
| ReferralSheet | `src/screens/Nutrition/ReferralSheet/` | `GET/POST/PUT/DELETE /nutrition/referrals` |

---

## 🔴 Remaining ComingSoon — 43 screens

### Sales (1)
| Screen | API Status | Best API |
|---|---|---|
| SalesSessionReport | ✅ | `GET /v1/orders-detail/detailed-sales-report` (fix 500 first) |

### Human Resource (6)
| Screen | API Status | Best API / Blocker |
|---|---|---|
| DetailedHRReport | ⚠️ | Combine multiple endpoints client-side |
| StaffPromotion | ⚠️ | `GET /hr/promotion/index` view only; no create endpoint |
| StaffAdvances | ⚠️ | `GET /v1/staff-loans/get` view only; no add endpoint |
| AddStaff | ❌ | No staff-creation endpoint exists |
| LetterManagement | ❌ | No API |
| ResourceManager | ❌ | No API |

### Finance (11)
| Screen | API Status | Best API |
|---|---|---|
| ViewBankLedger | ✅ | `GET /finance/bank-ledger/get` + `/current-balance` |
| BankDetails | ✅ | `GET /finance/banking-details` |
| DailySalesCounter | ✅ | `GET /finance/transactions/get-sales-balance` |
| CafeSalesExpenseReport | ✅ | `GET /transaction-report-cafe` + `/v1/expenses/get` + `/orders-detail/generate-cafe-total` |
| BalanceSheet | ✅ | `GET /finance-v2/reports/balance-sheet` |
| AddCashInHand | ⚠️ | GET confirmed; add endpoint unconfirmed |
| AddBankCash | ⚠️ | `POST /finance-v2/transactions/transfer` available |
| DailyExpenseReport | ⚠️ | `GET /v1/expenses/get` — derive totals client-side |
| PaidExpenseReport | ⚠️ | `GET /v1/expenses/get` or `/finance/all-expenses/expenses-sum-by-category` |
| Assets | ⚠️ | `GET /finance/asset/get` likely works; write unconfirmed |
| DailyOfficeClosing | ⚠️ | Combine `/office-cash-flow/*` + `/transactions/sales-counter-balance` |

### Fitness (25)
| Screen | API Status | Best API |
|---|---|---|
| TrainerDiary | ✅ | `GET /fitness/commission-portal/trainer/history` — in `trainer.ts` |
| PTSalesReport | ✅ | `GET /v1/orders-detail/detailed-sales-report` (fix 500 first) |
| TrainerAppointments | ✅ | `GET /fitness/commission-portal/trainer/roster` |
| SessionAttendance | ✅ | `POST /fitness/commission-portal/trainer/mark` — in `trainer.ts` |
| NewPTBookings | ✅ | `POST /fitness/commission-portal/hr/sessions` (fix 404 first) |
| NewPTClients | ✅ | `GET /fitness/commission-portal/hr/clients` (fix 404 first) |
| GXTrainers | ✅ | `GET /fitness/commission-portal/hr/trainers` (fix 404 first) |
| GXSlotsList | ✅ | `GET /gx/classes/get` — in `employeeDashboard.ts` |
| GXBookings | ✅ | `GET /gx/bookings/get` — in `employeeDashboard.ts` |
| GXAppointments | ✅ | `GET /gx/bookings/get` |
| SwitchBookingTime | ⚠️ | `GET /trainer/taken-slots` for viewing; no reschedule PUT confirmed |
| GXAttendance | ⚠️ | Generic session endpoints; not GX-specific |
| GXAttendanceReport | ⚠️ | `GET /session-detail-report` — unconfirmed |
| BefitList | ⚠️ | `GET /clients/get` filtered |
| BefitBookings | ⚠️ | Generic sessions endpoint |
| BefitAppointments | ⚠️ | Generic sessions endpoint |
| BefitAttendance | ⚠️ | Generic mark endpoint |
| BefitAttendanceReport | ⚠️ | `GET /session-detail-report` — unconfirmed |
| SPTList | ⚠️ | `GET /clients/get?category=4` |
| SPTBookings | ⚠️ | Generic sessions endpoint |
| SPTAppointments | ⚠️ | Generic sessions endpoint |
| SPTAttendance | ⚠️ | Generic mark endpoint |
| SPTAttendanceReport | ⚠️ | `GET /session-detail-report` — unconfirmed |
| AddGXSlots | ❌ | No endpoint exists |
| AddGXClass | ❌ | No endpoint exists |

---

## Key API Notes (field mappings discovered from live data)

| Endpoint | Key Discovery |
|---|---|
| `/v1/finance/keene-ledger/get` | Returns `amount` + `type` (Credit/Debit). No pre-computed debit/credit/balance. Running balance computed client-side. |
| `/v1/finance/liability-ledger/get` | Same pattern. `transaction_type` = Resource column (not `resource`). |
| `/v1/finance/g-thirteen/get` | Same pattern. `transaction_type` values: Bank Account, G13, Mr Arif, Mr Waqas Credit Card, Office Counter, Personal, Sales Counter. |
| `/v1/finance/petty-cash-ledger/get` | Same pattern. `transaction_type` values observed: Mr Arif (likely others: Mr Bilal, etc.). |
| `/v1/finance/charity/get` | Returns per-row running balances already (`f_cash_balance`, `w_cash_balance`, `total_charity`) — no client math needed, unlike Keene/G13/Petty/Liability. `date` field is a full UTC timestamp stored at Asia/Karachi midnight (e.g. local `2026-06-19` comes back as `2026-06-18T19:00:00Z`) — naive `split('T')[0]` shows the date one day early; convert with `+5h` before extracting Y-M-D. |
| `/v1/finance/charity/add` | Undocumented. Required: `branch_id`, `date`, `type` (`Credit`/`Debit`/`Transfer`), `amount`, and `person` (`Faisal`/`Waqas`, case-sensitive) for Credit/Debit, or `from_person`/`to_person` for Transfer. |
| `/v1/finance/office-cash-flow/get` | No per-row balance — compute client-side, seeded from the response's `opening_balance.balance` (not zero, unlike Keene). `date` is a plain `YYYY-MM-DD` (no timezone quirk). |
| `/v1/finance/office-cash-flow/current-balance` | **Broken** — always returns `{"balance":"0"}` regardless of params. Use `/office-cash-flow/office-cash-balance` instead, which returns the correct `totalBalance` (verified against web UI). |
| `/v1/finance/office-cash-flow/add` | Undocumented. Only `branch_id`, `amount`, `type` are required — `type` and `resource` are **not** validated against an enum (any string is accepted), unlike Charity's strict enum. Be careful probing this one; minimal payloads succeed instead of returning a validation error. |
| All ledger screens | Catch 404/422 silently (show empty table). Only show error banner for 5xx / network failures. |

---

## ⚠️ Known Issues / Live-Data Incidents (2026-06-19)

While reverse-engineering undocumented write endpoints directly against the **production** API (`api.vostro-new.com`) to discover field contracts, two accidental live writes happened:

1. **Charity ledger** — two Rs. 1 test entries (IDs `561`, `562`, branch F-11) were created while probing `/v1/finance/charity/add`. Attempted cleanup via `PUT /v1/finance/charity/delete/{id}` **failed with a 500** — the `charity` table is missing a `deleted_by` column the delete handler writes to. **These two entries are still live** pending a backend fix. User was informed and chose to leave them for now.
2. **Office cash ledger** — three Rs. 1 test entries (IDs `6493`–`6495`, branch F-11) were created while probing `/v1/finance/office-cash-flow/add` (this endpoint's lax validation accepted a minimal payload instead of rejecting it like Charity did). These were **successfully deleted** via `PUT /v1/finance/office-cash-flow/delete/{id}` (204) and the running balance was verified to match the web UI exactly afterward (`-27,016,089`).

**Process change going forward:** no more live POST/PUT calls against production for field-discovery purposes without explicit per-endpoint confirmation. `AddOfficeCash`'s submit button is built but disabled (`ADD_ENABLED = false`) until re-enabled deliberately.

---

## API Functions in `src/api/employeeDashboard.ts`

| Function | Endpoint | Used By |
|---|---|---|
| `getSalaryComponents` | `GET /v1/salary-components/get` | SalaryComponent |
| `addSalaryComponent` | `POST /v1/salary-components/store` | SalaryComponent |
| `getAllLeaveQuota` | `GET /hr/leaves-quota/index` | LeaveQuota |
| `addLeaveQuota` | `POST /hr/leaves-quota/store` | LeaveQuota |
| `addLiability` | `POST /v1/finance/liabilities/add` | AddLiabilities |
| `getLiabilityLedger` | `GET /v1/finance/liability-ledger/get` | ViewLiabilitiesLedger |
| `getLiabilityBalance` | `GET /v1/finance/liability-ledger/current-balance` | ViewLiabilitiesLedger |
| `payLiability` | `POST /v1/finance/liability-installments/pay` | PayLiabilities |
| `deleteLiabilityEntry` | `PUT /v1/finance/liability-ledger/delete/{id}` | ViewLiabilitiesLedger |
| `updateLiabilityEntry` | `PUT /v1/finance/liability-ledger/update/{id}` | ViewLiabilitiesLedger |
| `getKeeneLedger` | `GET /v1/finance/keene-ledger/get` | KeeneLedger |
| `addKeeneEntry` | `POST /v1/finance/keene-ledger/add` | AddKeene |
| `deleteKeeneEntry` | `PUT /v1/finance/keene-ledger/delete/{id}` | KeeneLedger |
| `getG13Ledger` | `GET /v1/finance/g-thirteen/get` | G13CashLedger |
| `addG13Entry` | `POST /v1/finance/g-thirteen/add` | AddG13Cash |
| `deleteG13Entry` | `PUT /v1/finance/g-thirteen/delete/{id}` | G13CashLedger |
| `getPettyCashLedger` | `GET /v1/finance/petty-cash-ledger/get` | PettyCashLedger |
| `addPettyCashEntry` | `POST /v1/finance/petty-cash-ledger/add` | AddPettyCash |
| `deletePettyCashEntry` | `PUT /v1/finance/petty-cash-ledger/delete/{id}` | PettyCashLedger |
| `getCharityLedger` | `GET /v1/finance/charity/get` | ViewCharityLedger |
| `getCharityBalance` | `GET /v1/finance/charity/current-balance` | ViewCharityLedger, AddCharity |
| `addCharityEntry` | `POST /v1/finance/charity/add` | AddCharity |
| `deleteCharityEntry` | `PUT /v1/finance/charity/delete/{id}` (server 500s — backend bug) | ViewCharityLedger |
| `getCashInHand` | `GET /v1/finance/cash-in-hand/getCashInHandRecords` | DailyExpense, ViewCashInHand |
| `addCashInHandEntry` | `POST /v1/finance/cash-in-hand/add` | DailyExpense (wired, not live-tested) |
| `updateCashInHandEntry` | `PUT /v1/finance/cash-in-hand/update/{id}` | DailyExpense (wired, not live-tested) |
| `getOfficeCashLedger` | `GET /v1/finance/office-cash-flow/get` | ViewOfficeLedger |
| `getOfficeCashBalance` | `GET /v1/finance/office-cash-flow/office-cash-balance` | ViewOfficeLedger |
| `addOfficeCashEntry` | `POST /v1/finance/office-cash-flow/add` | AddOfficeCash (wired, submission disabled) |
| `deleteOfficeCashEntry` | `PUT /v1/finance/office-cash-flow/delete/{id}` | ViewOfficeLedger |

---

## Recommended Next Screens (by priority)

**Quick wins — ✅ API ready, just need screenshots:**
1. `ViewBankLedger` — same ledger pattern as Keene/G13/PettyCash/Office, GET confirmed
2. `BankDetails` — simple GET, view only
3. `TrainerDiary` — `trainer/history` already in `trainer.ts`
4. `GXSlotsList` + `GXBookings` + `GXAppointments` — GX APIs already wired

**Blocked on backend fixes:**
- All Fitness HR screens (PTAttendance already built but empty — needs `/commission-portal/hr/*` fixed)
- SalesSessionReport, PTSalesReport — needs `detailed-sales-report` 500 fixed
