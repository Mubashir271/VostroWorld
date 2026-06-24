# VostroWorld Mobile — Project Status

Single source of truth for screen implementation progress, API coverage, and
what's left to build. Updated: **2026-06-24**.

**Base URL:** `https://api.vostro-new.com/public/api`
**App package:** `com.vostroworld` | React Native 0.83.1

## ⚠️ Critical: every route needs the `/v1/` prefix

The axios `BASE_URL` (`src/api/service.ts`) does **not** include `/v1` — every
call site must add it explicitly (`/v1/hr/promotion/index`, not
`/hr/promotion/index`). Backend team confirmed (`missing-api.md`, 23 Jun 2026,
Downloads) that most "missing endpoint" reports were actually this bug: the
route exists under `/v1/...` and 404s with a generic Laravel "Not Found" page
when called without it. **Fixed 2026-06-24** in `employeeDashboard.ts` and
`PTAttendance` (8 call sites were missing the prefix — see Known API Notes).
When adding a new endpoint, always double-check the prefix live before
assuming a route doesn't exist.

Also confirmed: an unauthenticated/invalid-token request currently returns
**HTTP 500** with `Route [login] not defined` instead of a clean 401 — a known
backend bug, not a missing route. The app already attaches
`Authorization: Bearer {token}` automatically via the `service.ts` interceptor
once logged in, so this shouldn't surface in normal use.

---

## Progress Overview

| Section | Total Screens | ✅ Done | 🔴 ComingSoon |
|---|---|---|---|
| Sales | ~25 | ~24 | 1 |
| Human Resource | ~20 | ~16 | 5 |
| Finance | ~26 | ~17 | 11 |
| Fitness | ~28 | ~5 | 23 |
| Nutrition | ~12 | 12 | 0 |
| Settings / Other | ~15 | ~15 | 0 |
| **Total pending** | | | **40** |

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
| HRDashboard | `src/screens/HR/HRDashboard/` | Multi-endpoint fallback (`/v1/hr/dashboard` still under progress on backend) |
| ViewStaff | `src/screens/HR/ViewStaff/` | **Fixed 2026-06-24:** `GET /v1/staff/get` 404'd ("will not be added" per backend); switched to `GET /v1/auth/get`, normalized `first_name`+`last_name`→`name`, `branch_name`→`branch`, `joining`→`join_date` in `getStaffList()` |
| SalaryComponent | `src/screens/HR/SalaryComponent/` | **Fixed 2026-06-24:** wrong path `/v1/salary-components/get` → confirmed `GET /v1/hr/salary-components/index`, `POST .../store`. Live response uses lowercase `type` (`addition`/`deduction`) and `return_month` (not `salary_month`) — display mapping not yet updated to match |
| LeaveQuota | `src/screens/HR/LeaveQuota/` | `GET /v1/hr/leaves-quota/index`, `POST .../store` (path already had v1 prefix; staff dropdown now uses fixed `getStaffList`) |
| StaffDutyHours | `src/screens/HR/StaffDutyHours/` | `GET /v1/staff-timing/index` — already correct. Staff dropdown still a manual numeric ID field; could now use fixed `getStaffList`/`/v1/auth/get` as a follow-up |
| EmployeeAttendance | `src/screens/HR/EmployeeAttendance/` | `GET /v1/attendance/index?category=2`, `/v1/attendance/summery` — already correct |
| PTAttendance | `src/screens/HR/PTAttendance/` | **Fixed 2026-06-24:** all 8 raw `api.get/post/put/delete` calls to `fitness/commission-portal/hr/*` and `.../trainer/roster` were missing the `/v1/` prefix (hard 404s); now prefixed |
| StaffCommissions | `src/screens/HR/StaffCommissions/` | `GET /v1/fitness/commission-portal/hr/commissions` via `getHRCommissions` — already correct, just needed a valid Bearer token (auth, not a missing route) |
| SessionPortalHR | `src/screens/HR/SessionPortalHR/` | `GET /v1/orders-detail/get`, `/v1/clients/count` — already correct, just needed a valid Bearer token |
| LeaveApplications | `src/screens/LeaveApplications/` | **Fixed 2026-06-24:** `getLeaveQuota`, `getLeaveApplications`, `checkLeaveExists`, `checkLeaveAvailability`, `submitLeaveApplication` were all missing the `/v1/` prefix (confirmed live 404 → 200/409 once added) — this screen was fully broken in production before the fix |
| StaffLoans | `src/screens/StaffLoans/` | `GET /v1/staff-loans/get` — already correct, confirmed live. View-only; `addStaffLoan` (`POST /v1/staff-loans/add`, confirmed live) added to `employeeDashboard.ts` 2026-06-24 but no add-form UI yet (this is the screen PROJECT_STATUS previously tracked as "StaffAdvances") |

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

### Fitness
| Screen | File | API / Notes |
|---|---|---|
| GXClasses (drawer: "GX Slots List") | `src/screens/Fitness/GXClasses/` | `GET /v1/fitness/gx-class/index` — **fixed 2026-06-24** (was `/v1/gx/classes/get`, confirmed 404). Drawer route `GXSlotsList` was pointing at a `ComingSoon` placeholder instead of this screen — fixed |
| AddGXClass | `src/screens/Fitness/AddGXClass/` | **Built 2026-06-24.** `POST /v1/fitness/gx-class/store` — confirmed via empty-body validation: requires exactly `{package_id, name, day}`. Confirmed working by user in the running app |
| AddGXSlots | `src/screens/Fitness/AddGXSlots/` | **UI built 2026-06-24, submission gated** (`ADD_ENABLED = false`, same pattern as `AddOfficeCash`). Form + live "All GX Slots" table are real; `addGXSlot()` → `POST /v1/packages/add` is wired but unconfirmed/crash-prone — see Known Issues |
| TimeSlots | `src/screens/Fitness/TimeSlots/` | **Fixed 2026-06-24** — was a client-side-only mock; now wired to confirmed `GET /v1/fitness/time-slot/get`, `POST .../add`, `PUT .../update/{id}` (update payload unconfirmed) |
| PTRoster | `src/screens/Fitness/PTRoster/` | `GET /v1/fitness/commission-portal/trainer/roster` via `getPTRosterAdmin` — already correct, discovered already-built-and-working 2026-06-24 (was untracked) |

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

## 🔴 Remaining ComingSoon — 40 screens

### Sales (1)
| Screen | API Status | Best API |
|---|---|---|
| SalesSessionReport | ✅ | `GET /v1/orders-detail/detailed-sales-report` (fix 500 first) |

### Human Resource (5)
| Screen | API Status | Best API / Blocker |
|---|---|---|
| DetailedHRReport | ⚠️ | Combine multiple endpoints client-side. Fallback sources confirmed live — see Section 5 of `missing-api.md` |
| StaffPromotion | ✅ | `GET /v1/hr/promotion/index` (view, already wired via `getPromotions`, **fixed 2026-06-24** — was missing `/v1/`) + `POST /v1/hr/promotion/store` confirmed exists live, 2026-06-24 (was previously assumed missing). `addPromotion` added to `employeeDashboard.ts`, payload fields inferred/unconfirmed |
| AddStaff | ⚠️ | `POST /v1/auth/register` confirmed exists live, 2026-06-24 (no auth token needed) — was previously assumed missing entirely. Minimum required: `branch_id`, `first_name`, `last_name`, `gender`; full field contract unconfirmed and the backend 500s (`trim()` on a `DateTime`) on incomplete-but-plausible payloads, so `registerStaff()` is added but **not** wired to a screen yet — needs backend fix + more careful field-discovery first |
| LetterManagement | ✅ | Maps to `hr/staff-documents` (`getStaffDocuments`/`addStaffDocument`, already in `employeeDashboard.ts`, **fixed 2026-06-24** — was missing `/v1/`) |
| ResourceManager | ✅ | `GET /v1/related_things/get` (supports `type` filter, e.g. `Department`) + `add`/`update`/`delete`/`active`/`inactive` — confirmed exists live, 2026-06-24 (previously only `get-names-list[-new]` was assumed to exist). `getRelatedThings`/`addRelatedThing`/`updateRelatedThing`/`deleteRelatedThing`/`setRelatedThingStatus` added to `employeeDashboard.ts` |

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

### Fitness (23)
| Screen | API Status | Best API |
|---|---|---|
| TrainerDiary | ✅ | `GET /v1/fitness/commission-portal/trainer/history` — in `trainer.ts` (already correct) |
| PTSalesReport | ✅ | `GET /v1/orders-detail/detailed-sales-report` — exists; the 500 was a missing Bearer token, not a missing route |
| TrainerAppointments | ✅ | `GET /v1/fitness/commission-portal/trainer/roster` (already correct) |
| SessionAttendance | ✅ | `POST /v1/fitness/commission-portal/trainer/mark` — in `trainer.ts` (already correct) |
| NewPTBookings | ✅ | `POST /v1/fitness/commission-portal/hr/sessions` — **fixed 2026-06-24**, was missing `/v1/` (same bug as PTAttendance) |
| NewPTClients | ✅ | `GET /v1/fitness/commission-portal/hr/clients` — requires `trainer_id`; **fixed 2026-06-24**, was missing `/v1/` |
| GXTrainers | ✅ | `GET /v1/fitness/commission-portal/hr/trainers` — **fixed 2026-06-24**, was missing `/v1/`. Also now wrapped as `getGXTrainers()` |
| GXBookings | ❌ | `GET /v1/gx/bookings/get` confirmed 404 live, 2026-06-24 — no replacement route found yet |
| GXAppointments | ❌ | Same as GXBookings — depends on a `gx/bookings` route that doesn't exist |
| SwitchBookingTime | ⚠️ | No single reschedule endpoint (backend "under progress"). Workarounds confirmed live: `PUT /v1/fitness/commission-portal/hr/sessions/{id}` (HR-side), `GET /v1/orders-detail/update-time-slot/{id}/{time_slot_id}`, `POST /v1/fitness/time-slot-switching/store` + `.../process-request/{id}`, `GET /v1/fitness/commission-portal/trainer/taken-slots`, `PUT /v1/fitness/trainer-schedule/update/{id}` |
| GXAttendance | ⚠️ | Generic session endpoints; not GX-specific |
| GXAttendanceReport | ✅ | `GET /v1/session-detail-report` — confirmed exists; pass `branch_id` + `start_date`/`end_date`, can be slow on large ranges |
| BefitList | ⚠️ | `GET /v1/clients/get` filtered |
| BefitBookings | ⚠️ | Generic sessions endpoint |
| BefitAppointments | ⚠️ | Generic sessions endpoint |
| BefitAttendance | ⚠️ | Generic mark endpoint |
| BefitAttendanceReport | ✅ | `GET /v1/session-detail-report` — confirmed exists (see GXAttendanceReport note) |
| SPTList | ⚠️ | `GET /v1/clients/get?category=4` |
| SPTBookings | ⚠️ | Generic sessions endpoint |
| SPTAppointments | ⚠️ | Generic sessions endpoint |
| SPTAttendance | ⚠️ | Generic mark endpoint |
| SPTAttendanceReport | ✅ | `GET /v1/session-detail-report` — confirmed exists (see GXAttendanceReport note) |
| ManageAvailability | ⚠️ | `src/screens/Fitness/ManageAvailability/` already exists but is a client-side mock only. Likely real backing: `POST /v1/fitness/time-slot-assignment/add` (`branch_id`, `user_id` trainer, `time_slot_id` confirmed required) — contract beyond those 3 fields unconfirmed; do not probe further without capturing the real payload first |

(`GXSlotsList`/`GXClasses`, `AddGXClass`, and `AddGXSlots` were in this list as of 2026-06-19 — all three now have real screens, moved to the Fitness row in Implemented Screens above.)

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
| `/v1/auth/get` | Confirmed live 2026-06-24. Standard Laravel paginator: `{status, data:{current_page, data:[...], last_page, total}, totalRecord, totalPages, message}`. Records use `first_name`+`last_name` (no `name`), `branch_name` (no `branch`), `joining` (no `join_date`) — `getStaffList()` injects the aliased fields onto each record. |
| `/v1/auth/get/{id}` | Confirmed live 2026-06-24. Returns `{status, data:[record]}` — a one-element array, not a bare object. |
| `/v1/hr/salary-components/index` | Confirmed live 2026-06-24. Shape: `{message, data:[{id, branch_id, branch_name, staff_id, staff_name, component_name, description, type, amount, date, return_month, status, created_at}], pagination:{...}}`. `type` is lowercase (`addition`/`deduction`); field is `return_month`, not `salary_month` — the SalaryComponent screen's display mapping hasn't been updated to match yet. |
| `/v1/hr/promotion/index` | Confirmed live 2026-06-24. Shape: `{message, data:[{id, employee_id, employee, joining, branch_id, branch, previous_salary, new_salary, pervs_designation_id, pervs_designation, new_designation_id, new_designation, pervs_depart_id, pervs_depart, new_depart_id, new_depart, promotion_type, details, date, status}], pagination:{...}}`. |
| `/v1/related_things/get` | Confirmed live 2026-06-24 (previously assumed only `get-names-list[-new]` worked). Supports `type` filter. Shape: `{status, data:{current_page, data:[{id, name, department_id, department, description, type, status}], ...}}`. |
| `/v1/fitness/time-slot/get` | Confirmed live 2026-06-24. Shape: `{status, data:{current_page, data:[{id, branch_id, branch_name, start_time, end_time, date}], ...}}` — `start_time`/`end_time` are `"HH:mm AM/PM"` strings. |
| `/v1/fitness/gx-class/index` | Confirmed live 2026-06-24. Shape: `{status, data:{current_page, data:[{id, package_id, name, day, status, package:{id, slot_name, description, branch_id, branch_name}}], ...}}` — no trainer/capacity/duration/session-count fields. |
| `/v1/auth/register` | Confirmed live 2026-06-24 (POST only, no token required). Minimum required fields per a 422 probe: `branch_id`, `first_name`, `last_name`, `gender`. **Caution:** a follow-up probe with only those 4 fields triggered a backend 500 (`trim(): Argument #1 ($string) must be of type string, DateTime given` in `Controller.php`) — the full required-field set is unconfirmed. Do not wire this to a screen until the backend bug is fixed and the contract is confirmed. |
| Missing `/v1/` prefix | Confirmed live 2026-06-24 as a systemic bug, not isolated: `hr/promotion/index`, `hr/leave-application/*`, `hr/staff-documents/*`, `staff-timing/index`, `related_things/get`, `fitness/time-slot/get`, `fitness/gx-class/index` all return a hard Laravel 404 page without the prefix and 200 with it. If a "missing" endpoint turns up while building a new screen, check the prefix live before assuming the route doesn't exist. |

---

## ⚠️ Known Issues / Live-Data Incidents (2026-06-19)

While reverse-engineering undocumented write endpoints directly against the **production** API (`api.vostro-new.com`) to discover field contracts, two accidental live writes happened:

1. **Charity ledger** — two Rs. 1 test entries (IDs `561`, `562`, branch F-11) were created while probing `/v1/finance/charity/add`. Attempted cleanup via `PUT /v1/finance/charity/delete/{id}` **failed with a 500** — the `charity` table is missing a `deleted_by` column the delete handler writes to. **These two entries are still live** pending a backend fix. User was informed and chose to leave them for now.
2. **Office cash ledger** — three Rs. 1 test entries (IDs `6493`–`6495`, branch F-11) were created while probing `/v1/finance/office-cash-flow/add` (this endpoint's lax validation accepted a minimal payload instead of rejecting it like Charity did). These were **successfully deleted** via `PUT /v1/finance/office-cash-flow/delete/{id}` (204) and the running balance was verified to match the web UI exactly afterward (`-27,016,089`).

**Process change going forward:** no more live POST/PUT calls against production for field-discovery purposes without explicit per-endpoint confirmation. `AddOfficeCash`'s submit button is built but disabled (`ADD_ENABLED = false`) until re-enabled deliberately.

### 2026-06-24 — repeat incident while investigating "Add GX Slot"

The process change above was violated once: while reverse-engineering the real
backing endpoint for the web admin's "Add GX Slot" screen, two more
accidental live writes happened:

1. **GX packages** — two test packages named "Test" (IDs `1299`, `1300`,
   branch F-11, category 15, price 0) were created by `POST /v1/packages/add`
   with just `{branch_id, package_name, category}` — the request then crashed
   with a 500 (`handleTimeSlot()` — undefined `time_id`) *after* the package
   row had already been inserted. **Cleaned up** via `PUT
   /v1/packages/delete/{id}` (204 confirmed both times).
2. **Time slot assignment** — one record (ID `564`, trainer "Sidra Sharif",
   branch F-11) was created by `POST /v1/fitness/time-slot-assignment/add`
   with just `{branch_id, user_id, time_slot_id}` — this one didn't even
   error, it just succeeded. There's no working delete route for this
   endpoint; **marked inactive instead** via `PUT
   /v1/fitness/time-slot-assignment/inactive/564` (204 confirmed,
   `status` now `"0"`).

**Lesson reinforced:** an empty `{}` body is the only fully safe way to probe
a write endpoint's required-field list. Supplying the "minimal" field set
named in that validation error is *not* automatically safe — some
controllers (`packages/add`, `time-slot-assignment/add`) accept it and
insert immediately instead of validating further. Do not repeat this; if a
write contract is needed beyond what empty-body validation reveals, get it
from the web admin's browser Network tab instead of guessing against
production.

---

## API Functions in `src/api/employeeDashboard.ts`

| Function | Endpoint | Used By |
|---|---|---|
| `getSalaryComponents` | `GET /v1/hr/salary-components/index` (fixed 2026-06-24, was `/v1/salary-components/get`) | SalaryComponent |
| `addSalaryComponent` | `POST /v1/hr/salary-components/store` (fixed 2026-06-24) | SalaryComponent |
| `updateSalaryComponent` | `PUT /v1/hr/salary-components/update/{id}` (fixed 2026-06-24, unconfirmed) | SalaryComponent |
| `deleteSalaryComponent` | `PUT /v1/hr/salary-components/delete/{id}` (fixed 2026-06-24, unconfirmed) | SalaryComponent |
| `getStaffList` | `GET /v1/auth/get` (fixed 2026-06-24, was `/v1/staff/get` 404) — normalizes `name`/`branch`/`join_date` onto each record | ViewStaff, SalaryComponent, LeaveQuota |
| `getStaffDetail` | `GET /v1/auth/get/{id}` (fixed 2026-06-24, was `/v1/staff/detail/{id}` 404) | unused |
| `getStaffLoansList` | `GET /v1/staff-loans/get` (already correct, confirmed live) | StaffLoans |
| `addStaffLoan` | `POST /v1/staff-loans/add` (added 2026-06-24, confirmed exists; payload unconfirmed) | not yet wired to a screen |
| `getPromotions` | `GET /v1/hr/promotion/index` (fixed 2026-06-24, was missing `/v1/`) | unused (StaffPromotion screen not built) |
| `addPromotion` | `POST /v1/hr/promotion/store` (added 2026-06-24, confirmed exists; payload inferred/unconfirmed) | not yet wired to a screen |
| `registerStaff` | `POST /v1/auth/register` (added 2026-06-24, confirmed exists, no token needed) | not wired — backend 500s on incomplete payloads, field contract unconfirmed |
| `getRelatedThings` / `addRelatedThing` / `updateRelatedThing` / `deleteRelatedThing` / `setRelatedThingStatus` | `GET/POST/PUT /v1/related_things/*` (added 2026-06-24, confirmed exists incl. `type` filter) | not yet wired — best fit for ResourceManager |
| `getTimeSlots` / `addTimeSlot` / `updateTimeSlot` / `checkTimeSlotExists` | `GET/POST/PUT /v1/fitness/time-slot/*` (added 2026-06-24, `add` confirmed via empty-body validation: requires `branch_id`, `start_time`, `end_time`). **This manages the time-range master list, not the "Add GX Slot" package — see AddGXSlots row above.** | `getTimeSlots`/`addTimeSlot` wired into `TimeSlots/index.tsx` 2026-06-24 (was a client-side-only mock before); `updateTimeSlot`'s payload is an unconfirmed guess |
| `getGXClasses` | `GET /v1/fitness/gx-class/index` (fixed 2026-06-24, was `/v1/gx/classes/get` 404) | GXClasses, AddGXClass (Fitness), GXPackages (Sales) |
| `getGXClass` / `addGXClass` / `updateGXClass` | `GET/POST/PUT /v1/fitness/gx-class/{show,store,update}`. `addGXClass` confirmed via empty-body validation: requires exactly `{package_id, name, day}` (no `branch_id`) | `addGXClass` wired into `AddGXClass/index.tsx` 2026-06-24; `getGXClass`/`updateGXClass` unused |
| `setGXClassStatus` | `PUT /v1/fitness/gx-class/actions/{id}/{status}` (added 2026-06-24, route confirmed via GET-405 check) | `AddGXClass/index.tsx` (Delete button → deactivate) |
| `getGXTrainers` | `GET /v1/fitness/commission-portal/hr/trainers` (wrapped 2026-06-24; was already called directly via `api.get` in `PTAttendance`) | `AddGXSlots/index.tsx` (trainer dropdown) |
| `addGXSlot` | `POST /v1/packages/add` (added 2026-06-24) — **not confirmed safe**, crashed the backend on a minimal payload during discovery (see Known Issues). Wired but gated off | `AddGXSlots/index.tsx` (Add button disabled via `ADD_ENABLED = false`) |
| `getGXBookings` | `GET /v1/gx/bookings/get` — confirmed 404 live 2026-06-24, no replacement found | unused |
| `getLeaveQuota` | `GET /v1/hr/leaves-quota/index` (fixed 2026-06-24, was missing `/v1/`) | LeaveApplications |
| `getLeaveApplications` | `GET /v1/hr/leave-application/index` (fixed 2026-06-24) | LeaveApplications |
| `checkLeaveExists` | `POST /v1/hr/leave-application/is-exist` (fixed 2026-06-24) | LeaveApplications |
| `checkLeaveEligibility` | `POST /v1/attendance/check-leave-eligibility` (already correct) | LeaveApplications |
| `checkLeaveAvailability` | `POST /v1/hr/leave-application/check-leave-availability` (fixed 2026-06-24) | LeaveApplications |
| `submitLeaveApplication` | `POST /v1/hr/leave-application/store` (fixed 2026-06-24) | LeaveApplications |
| `getAllLeaveQuota` | `GET /v1/hr/leaves-quota/index` (already correct) | LeaveQuota (HR) |
| `addLeaveQuota` | `POST /v1/hr/leaves-quota/store` (already correct) | LeaveQuota (HR) |
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
4. `ResourceManager` — `related_things` full CRUD confirmed live, ready in `employeeDashboard.ts`
5. `LetterManagement` — `hr/staff-documents` already wired (just needed the `/v1/` fix)
6. `StaffPromotion` (add form) — `addPromotion` ready, payload fields unconfirmed (probe carefully, see Known API Notes)

**Done 2026-06-24 (see Fitness row in Implemented Screens for details):**
- `AddGXClass` (built), `AddGXSlots` (UI built, submission gated), `TimeSlots` (wired to real APIs), `GXClasses`/`GXSlotsList` (drawer route fixed), `PTRoster` (discovered already working)

**Still blocked:**
- `ManageAvailability` — still a client-side mock. Likely real backing is `POST /v1/fitness/time-slot-assignment/add` (`branch_id`, `user_id` trainer, `time_slot_id` confirmed required via an **accidental live insert** during this session's discovery — see Known Issues) — contract beyond those 3 fields unconfirmed, don't probe further without capturing the real payload first
- `GXBookings`, `GXAppointments` — depend on `/v1/gx/bookings/get`, confirmed 404 with no known replacement
- `AddStaff` — `auth/register` exists but the backend 500s on incomplete payloads; needs backend fix + field-discovery before wiring
- `SwitchBookingTime` — no single dedicated reschedule endpoint; would need to combine several workaround routes (see Fitness table)

**No longer blocked (fixed 2026-06-24):**
- PTAttendance, NewPTBookings, NewPTClients, GXTrainers — all were missing `/v1/`, now fixed
- LeaveApplications — was fully broken (5 of 6 calls missing `/v1/`), now fixed
- SalesSessionReport, PTSalesReport, StaffCommissions, SessionPortalHR — the 500s were a missing Bearer token, not a missing route; already resolved by the app's auth interceptor
- Branch ID mix-up in `PTAttendance`/`StaffDutyHours`/`EmployeeAttendance`: all three hardcoded `F 11 = 1, G 13 = 15`, but `/v1/branches/get` confirms the opposite (`G 13 = 1, F 11 = 15`) — fixed in all three

---

## UI Built, API Exists, Not Connected

A different category from ComingSoon — these screens are fully built and
reachable, but their save/add action doesn't call the available API. Found
2026-06-24 while auditing the codebase for this kind of gap.

| Screen | What's built | What's not connected |
|---|---|---|
| `AddDietPlanIssued` (`src/screens/Nutrition/AddDietPlanIssued/`) | Full form (client picker, date picker) | `handleSave()` explicitly skips the call and shows a "Not Yet Enabled" alert instead, per a code comment ("avoid POST for now"). `addDietPlanIssued()` in `nutrition.ts` sits unused |
| `GXPackages` (`src/screens/Sales/GXPackages/`) | Full Add/Update/Delete form + table | `handleAdd`/`handleUpdate`/`handleDelete` only mutate local React state — no API call at all, despite `POST /v1/packages/add` (the same route behind the new `addGXSlot()`) being a real, reachable endpoint |
| `StaffDutyHours` (`src/screens/HR/StaffDutyHours/`) | Full Add form + table | Staff is a manual numeric "Staff ID" text box instead of a name dropdown — a leftover from when `getStaffList` 404'd. Now that it's fixed (`/v1/auth/get`), this could become a real dropdown but hasn't been wired |
| `ManageAvailability` (`src/screens/Fitness/ManageAvailability/`) | Full trainer + multi-slot picker UI | Add button only updates local state. The likely real endpoint, `POST /v1/fitness/time-slot-assignment/add`, is confirmed to exist (`branch_id`, `user_id`, `time_slot_id` required) but has no app-side wrapper function yet — only checked via raw curl during this session's discovery, never added to `employeeDashboard.ts` |

**Correction to a pre-existing stale note:** `API_REFERENCE.md` previously said
`addNutritionAssessment` was "not yet called" — verified 2026-06-24 that
`AddNutritionAssessments/index.tsx` actually does call it for real
(`handleAdd()`). That note was wrong and has been fixed; this screen is
correctly wired, not part of the list above.
