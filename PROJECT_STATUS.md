# VostroWorld Mobile — Project Status

Single source of truth for screen implementation progress, API coverage, and
what's left to build. Updated: **2026-06-29** (GX/Befit/SPT Attendance
Report built; pagination added to all three to match the web admin's
25/page layout).

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
| Sales | ~25 | 25 | 0 |
| Human Resource | ~20 | ~19 | 2 |
| Finance | ~26 | ~22 | 6 |
| Fitness | ~28 | ~16 | 12 |
| Nutrition | ~12 | 12 | 0 |
| Settings / Other | ~15 | ~15 | 0 |
| **Total pending** | | | **23** |

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
| SalesSessionReport | `src/screens/Sales/SalesSessionReport/` | **Built 2026-06-25.** Confirmed via web admin screenshot that this is **not** a financial sales report (the previous "Best API" guess, `orders-detail/detailed-sales-report`, was wrong) — it's functionally the same feature as `PTAttendance` (full session-attendance CRUD via `/v1/fitness/commission-portal/hr/sessions`), just exposed under Sales instead of HR, with a Package-centric selector (vs. PTAttendance's Client-centric one) and an added "Filter by Package". Adapted directly from `PTAttendance`'s already-proven code rather than rebuilt from scratch |
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
| StaffPromotion | `src/screens/HR/StaffPromotion/` | **Built 2026-06-25.** `GET /v1/hr/promotion/index` (view, via `getPromotions`) + `POST /v1/hr/promotion/store` (via `addPromotion`). Form (Branch, Name, Promotion Type, conditional Department/Designation/Salary fields) matches the web admin UI exactly, including cascading dropdowns sourced from `getRelatedThings`. **Add button intentionally gated off** (`ADD_ENABLED = false`) — a safe empty-body probe found the required field names (`user_id` not `employee_id`), but a follow-up probe (still safe — used only the 4 known-required fields, no department/designation/salary) attempted a real INSERT for every promotion type and failed on a `previous_department` foreign-key violation every time, meaning the full write contract needs one more live test with real values before this can be confidently enabled — see Known API Notes |
| LetterManagement | `src/screens/HR/LetterManagement/` | **Built 2026-06-25.** `GET /v1/hr/staff-documents/index`, `POST .../store` via `getStaffDocuments`/`addStaffDocument`. Form fields (Branch [static], Staff, Document Category, Document Type, Issue Date, Document Code*, Subject) reverse-engineered from the web admin UI (screenshots), not guessed. Document Category enum confirmed: `Letter`/`Certificate`/`Form`; Document Type dropdown (5 options) only confirmed for the `Letter` category — falls back to a free-text input for `Certificate`/`Form` since those option lists are unconfirmed. `document_code` is required (matches a live validation message seen in the web UI) |
| ResourceManager | `src/screens/HR/ResourceManager/` | **Built 2026-06-25.** Full CRUD via `getRelatedThings`/`addRelatedThing`/`updateRelatedThing`/`deleteRelatedThing`/`setRelatedThingStatus`. Category toggle (Department / Designations) confirmed live via a **read-only** GET probe (safe — no write) of `/v1/related_things/get`: `type` values are `"Department"` (singular) and `"Designations"` (plural, **not** "Designation" — would have been a reasonable but wrong guess), and `Designations` records require a `department_id` pointing at the parent department, matching the join shown in the live data (`department_id`/`department` fields) |

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
| ViewBankLedger | `src/screens/Finance/ViewBankLedger/` | Already built (in the "Missing apis done" commit), but **PROJECT_STATUS hadn't caught up and the underlying GETs were actually broken** — fixed 2026-06-25: `getBankLedger`/`getBankLedgerBalance` were both missing `/v1/` (hard 404, confirmed live), and the response's list lives at `data.data` (paginator), not bare `data` — the screen was silently always rendering "No records found". Running balance now seeded from the response's `opening_balance.balance` (matches web UI's "Opening Balance" row #1) instead of starting at 0. `current-balance` is broken server-side (always returns `"0"`, no working sibling endpoint found, same failure mode as Office Cash Flow) — dropped from the UI; "Total Balance" is now just the running balance's last value |
| BankDetails | `src/screens/Finance/BankDetails/` | Same situation as ViewBankLedger — fixed 2026-06-25: real route is `/v1/finance/banking-details/get` (was `/finance/banking-details`, missing both `/v1/` and `/get`). List shape uses `account_no` (not `account_number` as the screen assumed). `addBankDetail`'s field contract confirmed via the web admin's "Add Bank Details" form (Branch/Bank Name/Account Title/Account Number) cross-checked against an empty-body validation probe — the web form's "Bank Name"/"Account Number" labels map to API fields `name`/`account_no`. Submission still gated (`ADD_ENABLED = false`) pending an actual live insert test |
| BalanceSheet | `src/screens/Finance/BalanceSheet/` | **Built 2026-06-25.** The web admin's "Balance Sheet" page is actually an Income Statement (Sales/Expenses breakdown + Net P&L), **not** a true balance sheet — `GET /finance-v2/reports/balance-sheet` (this screen's previous "Best API" guess) returns an empty, structurally different assets/liabilities/equity report because Finance V2 isn't set up for this branch. Built instead on `getSalesExpenseDaily` (`/v1/finance/transactions/get-sales-and-expense-by-category`, already wired in `reports.ts`), confirmed live to return exactly the `sales`/`expenses` breakdown the web page shows. Includes a donut chart for the Sales Breakup, built with `react-native-svg` (already a dependency) since the project has no charting library |
| DailySalesCounter | `src/screens/Finance/DailySalesCounter/` | **Built 2026-06-25.** `/v1/finance/transactions/get-sales-balance` (this screen's previous "Best API" guess) only returns a single total, not the rich report shown — built instead on three endpoints: `getSalesByServices` (package-level sales, already in `reports.ts`), `getSalesExpenseDaily`'s `expenses` half (same as BalanceSheet), and a new `getSalesByCategoryAndPayment` (`fetch-sales-by-category-and-payment`) for the per-category payment-method breakdown cards (Gym/PT/Guest Pass/etc.), confirmed live — needed the `/v1/` prefix |
| CafeSalesExpenseReport | `src/screens/Finance/CafeSalesExpenseReport/` | **Built 2026-06-25.** Day-by-day cafe sales (orders/tax/discount/total) and itemized cafe expenses, computed entirely client-side from two already-wired endpoints — `getCafeReport` (`/v1/transaction-report-cafe`) grouped by `date`, and `getExpensesList` (`/v1/expense/get` — **note singular**, `/v1/expenses/get` 404s) filtered to `category_name === 'Cafe Expense'` and grouped by `occurrence_date`. No new endpoint needed; `/orders-detail/generate-cafe-total` (the third API this screen was originally guessed to need) turned out to be redundant once the other two were grouped by day |

### Fitness
| Screen | File | API / Notes |
|---|---|---|
| GXClasses (drawer: "GX Slots List") | `src/screens/Fitness/GXClasses/` | `GET /v1/fitness/gx-class/index` — **fixed 2026-06-24** (was `/v1/gx/classes/get`, confirmed 404). Drawer route `GXSlotsList` was pointing at a `ComingSoon` placeholder instead of this screen — fixed |
| AddGXClass | `src/screens/Fitness/AddGXClass/` | **Built 2026-06-24.** `POST /v1/fitness/gx-class/store` — confirmed via empty-body validation: requires exactly `{package_id, name, day}`. Confirmed working by user in the running app |
| AddGXSlots | `src/screens/Fitness/AddGXSlots/` | **UI built 2026-06-24, submission gated** (`ADD_ENABLED = false`, same pattern as `AddOfficeCash`). Form + live "All GX Slots" table are real; `addGXSlot()` → `POST /v1/packages/add` is wired but unconfirmed/crash-prone — see Known Issues |
| TimeSlots | `src/screens/Fitness/TimeSlots/` | **Fixed 2026-06-24** — was a client-side-only mock; now wired to confirmed `GET /v1/fitness/time-slot/get`, `POST .../add`, `PUT .../update/{id}` (update payload unconfirmed) |
| PTRoster | `src/screens/Fitness/PTRoster/` | `GET /v1/fitness/commission-portal/trainer/roster` via `getPTRosterAdmin` — already correct, discovered already-built-and-working 2026-06-24 (was untracked) |
| TrainerDiary | `src/screens/Fitness/TrainerDiary/` | **Built 2026-06-25.** Does **not** use `trainer/history` despite that being this row's previous "Best API" guess — confirmed live that route is self-scoped (`"5.5 — My Session History"`) and returns `"No record found"` regardless of a `trainer_id` param when called with a non-trainer (admin) token, so it can't power an HR-side view of an arbitrary trainer's diary. Built on `GET /v1/fitness/commission-portal/hr/sessions` instead (new `getHRSessions` wrapper) — already used via raw `api.get` in `PTAttendance`, and confirmed live 2026-06-25 that it also accepts `start_date`/`end_date` filters (which `PTAttendance` never needed). Trainer dropdown reuses `getGXTrainers` |
| PTSalesReport | `src/screens/Fitness/PTSalesReport/` | **Built 2026-06-25.** `GET /v1/orders-detail/detailed-sales-report` (already wrapped as `getDetailedSalesReport`), filtered client-side to rows with a non-blank `trainer_name` (the raw endpoint returns ~1600 rows/month across every category, not just PT — confirmed live). End Date isn't returned directly; computed client-side as `sale_date + package_duration` months, matching the web UI's values exactly for the sampled rows. **Caution (found 2026-06-29 building `NewPTBookings`):** this only holds for `quantity: 1` rows — a `quantity: 3` renewal proved the real formula is `sale_date + (package_duration * quantity)` **days**, not months (`package_duration` itself is in days, e.g. `30`, not "1" for "1 month"). This screen doesn't read `quantity` at all, so multi-quantity renewals likely show a wrong End Date — not yet fixed here |
| TrainerAppointments | `src/screens/Fitness/TrainerAppointments/` | **Built 2026-06-25.** **Not** `trainer/roster` (this row's previous "Best API" guess, a flat client list with no day-of-week data) — confirmed via a web admin screenshot that this is a weekly schedule grid (Time × Mon–Sun, "Free" or a client name per cell). Built on a newly-discovered endpoint, `GET /v1/fitness/trainer-schedule/index` (new `getTrainerSchedule` wrapper) — confirmed live, reproduces the exact screenshot data. `trainer_id` param appears to be ignored server-side (always returns every trainer; filtered client-side instead); `start_date`/`end_date` are required for the `schedule` field to populate at all |
| GXTrainers | `src/screens/Fitness/GXTrainers/` | **Built 2026-06-25.** **Not** `hr/trainers` (this row's previous "Best API" guess, which returns ~20 PT trainers — far more than the 3 shown in the web admin's "All GX Trainer" table). Confirmed live that "GX Trainer" is just a flag, `is_gx_trainer`, on the staff record — `getStaffList()` filtered client-side to `is_gx_trainer === 1` reproduces the exact 3 rows (same uids, names, order) from the web admin screenshot. Add/Remove (toggling the flag) gated off — `/v1/auth/update/{id}`'s documented fields don't include `is_gx_trainer`, so the write contract is unconfirmed |
| GXBookings | `src/screens/Fitness/GXBookings/` | **Built 2026-06-25.** Previous "Best API" guess (`/v1/gx/bookings/get`) was a confirmed dead end (404, no replacement found at the time). Turns out GX bookings are just category `15` rows from `detailed-sales-report` — the same endpoint `PTSalesReport` uses for category-2/14/etc. — confirmed live, matches the web admin screenshot exactly. **Caution if reusing this pattern elsewhere:** GX packages' `package_duration` is in **days**, not months like PT packages — End Date here is `sale_date + package_duration` days, vs. `PTSalesReport`'s `+ months` |
| GXAttendanceReport | `src/screens/Fitness/GXAttendanceReport/` | **Built & confirmed live 2026-06-29.** Previous "Best API" guess (`GET /v1/session-detail-report`, via `getSalesByBootcamp`) was wrong despite returning 200 — that endpoint actually returns a payment-type breakdown report, not session/attendance rows. Built instead on `hr/sessions` (new `getHRSessionsAll` wrapper — see Key API Notes), filtered client-side to `type === 'GX'`. Trainer dropdown reuses the `is_gx_trainer` filter from `GXTrainers`. Confirmed working in the running app by the user |
| BefitAttendanceReport | `src/screens/Fitness/BefitAttendanceReport/` | **UI built 2026-06-29, data source unconfirmed.** Mirrors `GXAttendanceReport`'s layout exactly (Dates/Quick Dates, Trainer/Package filters, Trainer+Client Attendance toggles, Summary/Detail, paginated table). Filters `hr/sessions` rows to `type === 'Befit'`, but that value was never observed live — `hr/sessions` was checked across 26k+ rows on two branches and only ever returned `'GX'` or `'PT'`. Will most likely show "No records found" until the real Befit endpoint is identified (best path: capture the request from the web admin's Network tab on this exact page) |
| SPTAttendanceReport | `src/screens/Fitness/SPTAttendanceReport/` | **UI built 2026-06-29, data source unconfirmed.** Same situation as `BefitAttendanceReport` — filters `hr/sessions` to `type === 'SPT'`, an unconfirmed guess; real endpoint not yet found |
| SessionAttendance | drawer route only — reuses `SalesSessionReport` | **Fixed 2026-06-29.** Confirmed by the user that the web admin's "Session Attendance" (Fitness) is the exact same screen as Sales → Session Report. `Stack.Screen` now points `SessionAttendance` directly at the already-built `SalesSessionReport` component instead of `ComingSoon` — no new screen needed |
| NewPTBookings | `src/screens/Fitness/NewPTBookings/` | **Built 2026-06-29.** Branch (static) + Available Trainers filter + Search, matching the web admin screenshot exactly (no add form — this is a filtered view of existing "New" PT bookings, not a create form). Same `getDetailedSalesReport` source as `PTSalesReport`, filtered to non-blank `trainer_name` + `sale_type === 'New'`. Does **not** auto-load on focus (matches the web admin's default "No Record Found" until Search is pressed — confirmed live this endpoint otherwise returns real rows immediately, the web's empty default is a frontend choice, not a real empty dataset). "PT Package" and "End Date" use the corrected `session_count * quantity` / `+ (package_duration * quantity)` days formulas (see Key API Notes) |
| NewPTClients | `src/screens/Fitness/NewPTClients/` | **Built 2026-06-29.** Branch (static) + Client Name + Trainer + Time Reservation (New/Renew) filters + Search, paginated. Same source/fixes as `NewPTBookings`. "Time Slot" column is the endpoint's real `trainer_reservation` field (`Pending`/`Reserved`) — confirmed exact match against the web screenshot, not a placeholder. "Time Reservation: New/Renew" mapped to `sale_type` reproduced 9 of ~11 candidate rows exactly for one sampled trainer/window — closest known field, but the precise filter the web applies isn't 100% confirmed |

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

## 🔴 Remaining ComingSoon — 26 screens

### Human Resource (2)
| Screen | API Status | Best API / Blocker |
|---|---|---|
| DetailedHRReport | ⚠️ | Combine multiple endpoints client-side. Fallback sources confirmed live — see Section 5 of `missing-api.md` |
| AddStaff | ⚠️ | `POST /v1/auth/register` confirmed exists live, 2026-06-24 (no auth token needed) — was previously assumed missing entirely. Minimum required: `branch_id`, `first_name`, `last_name`, `gender`; full field contract unconfirmed and the backend 500s (`trim()` on a `DateTime`) on incomplete-but-plausible payloads, so `registerStaff()` is added but **not** wired to a screen yet — needs backend fix + more careful field-discovery first |

### Finance (6)
| Screen | API Status | Best API |
|---|---|---|
| AddCashInHand | ⚠️ | GET confirmed; add endpoint unconfirmed |
| AddBankCash | ⚠️ | `POST /finance-v2/transactions/transfer` available |
| DailyExpenseReport | ⚠️ | `GET /v1/expenses/get` — derive totals client-side |
| PaidExpenseReport | ⚠️ | `GET /v1/expenses/get` or `/finance/all-expenses/expenses-sum-by-category` |
| Assets | ⚠️ | `GET /finance/asset/get` likely works; write unconfirmed |
| DailyOfficeClosing | ⚠️ | Combine `/office-cash-flow/*` + `/transactions/sales-counter-balance` |

### Fitness (12)
| Screen | API Status | Best API |
|---|---|---|
| GXAppointments | ❌ | Looks identical to `TrainerAppointments` (weekly Time×Day grid) but confirmed live 2026-06-25 that it is **not** powered by the same `trainer-schedule/index` endpoint — queried it for all 3 confirmed GX trainers (`is_gx_trainer=1`) across both a 1-week and a full-year date range and got an empty `schedule` for 2 of the 3, despite the web admin screenshot showing real "Vitality Studio" bookings for both. `gx-class/index` was also checked and has no time/trainer linkage. Real data source not yet found — needs the web admin's Network tab, not more guessing |
| SwitchBookingTime | ⚠️ | No single reschedule endpoint (backend "under progress"). Workarounds confirmed live: `PUT /v1/fitness/commission-portal/hr/sessions/{id}` (HR-side), `GET /v1/orders-detail/update-time-slot/{id}/{time_slot_id}`, `POST /v1/fitness/time-slot-switching/store` + `.../process-request/{id}`, `GET /v1/fitness/commission-portal/trainer/taken-slots`, `PUT /v1/fitness/trainer-schedule/update/{id}` |
| GXAttendance | ⚠️ | Generic session endpoints; not GX-specific |
| BefitList | ⚠️ | `GET /v1/clients/get` filtered |
| BefitBookings | ⚠️ | Generic sessions endpoint |
| BefitAppointments | ⚠️ | Generic sessions endpoint |
| BefitAttendance | ⚠️ | Generic mark endpoint |
| SPTList | ⚠️ | `GET /v1/clients/get?category=4` |
| SPTBookings | ⚠️ | Generic sessions endpoint |
| SPTAppointments | ⚠️ | Generic sessions endpoint |
| SPTAttendance | ⚠️ | Generic mark endpoint |
| ManageAvailability | ⚠️ | `src/screens/Fitness/ManageAvailability/` already exists but is a client-side mock only. Likely real backing: `POST /v1/fitness/time-slot-assignment/add` (`branch_id`, `user_id` trainer, `time_slot_id` confirmed required) — contract beyond those 3 fields unconfirmed; do not probe further without capturing the real payload first |

(`GXAttendanceReport`, `SessionAttendance`, `NewPTBookings`, `NewPTClients` — fully done; `BefitAttendanceReport`/`SPTAttendanceReport` — UI done, data source still unconfirmed; see their rows in Implemented Screens above, moved out of this ComingSoon list 2026-06-29.)

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
| `/v1/finance/bank-ledger/get` | Confirmed live 2026-06-25 — was also missing `/v1/` (same systemic bug, found in code that had already shipped). Shape: `{opening_balance:{balance, date}, status, data:{current_page, data:[{id, branch_id, branch_name, bank_account_id, bank_name, bank_account_no, amount, resource, type, description, date, status}], ...}}`. `resource` values seen live: `Sales Counter`, `Bank Account`. |
| `/v1/finance/bank-ledger/current-balance` | **Broken** — confirmed live 2026-06-25, always returns `{"balance":"0"}` regardless of branch, same failure mode as `office-cash-flow/current-balance` but with no working sibling endpoint (`bank-balance`/`total-balance`/`balance` variants all 404). Don't rely on it — seed running balance from `opening_balance.balance` instead. |
| `/v1/finance/banking-details/get` | Confirmed live 2026-06-25. Real route needed both the `/v1/` prefix *and* a `/get` suffix — `/finance/banking-details` (no suffix) 404s even with `/v1/`. Shape: `{id, branch_id, branch_name, bank_name, account_no, account_title, date, status}`. |
| `/v1/finance/banking-details/add` | Confirmed live 2026-06-25 via empty-body validation + cross-checked against the web admin's "Add Bank Details" form. Required: `branch_id`, `name`, `account_no` — note the input field names (`name`, `account_no`) differ from the GET response's `bank_name`/`account_no` (the GET echoes `name` back as `bank_name`). `account_title` is shown as required in the web UI but the validator didn't flag it as required. |
| `/v1/fitness/commission-portal/trainer/history` | Confirmed live 2026-06-25 to be **self-scoped only** — calling it with an admin token and any `trainer_id` param still returns `"No record found"` (the doc comment "5.5 — My Session History" was the clue missed earlier). Not usable for an HR-side "view any trainer's diary" screen; use `hr/sessions` with a `trainer_id` filter instead (see `getHRSessions`). |
| `/v1/fitness/commission-portal/hr/sessions` | Already used via raw `api.get` in `PTAttendance` (list/create/update/delete), but `start_date`/`end_date` filters were never tried there. Confirmed live 2026-06-25 that they work. Shape per row: `{id, date, day, staff_status, client_status, staff_note, client_note, type, order_id, client_name, client_id, trainer_name, trainer_id, package_name, package_type, package_start_date, package_end_date, branch_name}`. |
| `/v1/hr/promotion/store` | Confirmed live 2026-06-25 via an empty-body 422: required `branch_id`, `user_id` (**not** `employee_id`, despite the GET response's field being named `employee_id`), `date`, `promotion_type`. A follow-up probe sending only those 4 fields (still safe — no department/designation/salary) attempted a real INSERT for all 4 promotion_type values (`Department`/`Position`/`Salary`/`All`) and failed every time with a foreign-key violation on `previous_department` — so the DB requires a valid department id even for Salary-only promotions, confirming the web form silently carries the staff's current department/designation/salary even when those fields aren't shown for that promotion type. `addPromotion`'s exact field names beyond the confirmed 4 (`previous_department`/`new_department`/etc.) are an educated guess matching the failed INSERT's own column name, not confirmed — gated off in `StaffPromotion`. |
| `/v1/finance-v2/reports/balance-sheet`, `/v1/finance-v2/reports/profit-and-loss` | Confirmed live 2026-06-25 — both return real, structurally-correct-but-empty responses (`{assets:[], liabilities:[], ...}` / `{income_lines:[], expense_lines:[], ...}`) because Finance V2 isn't set up for this branch. **Not** what powers the web admin's "Balance Sheet" page (see `getSalesExpenseDaily` below). |
| `/v1/finance/transactions/get-sales-and-expense-by-category` | Already wired (`getSalesExpenseDaily` in `reports.ts`) but newly discovered to be the real engine behind the web admin's "Balance Sheet" page (an Income Statement, not a true balance sheet). Shape: `{sales:[{category, Type: "New"\|"Renew"\|"Mix", total_quantity, total_price}], expenses:[{category: "<name>", total_quantity, total_price}]}` — `category` in `sales` is the Category Code Reference (§5); `Type` distinguishes New vs. Existing within a category (e.g. category `1` + `New` = "Gym-New", + `Renew` = "Gym-Existing"). |
| `/v1/finance/transactions/fetch-sales-by-category-and-payment` | Confirmed live 2026-06-25 (needed `/v1/`). Shape: `{"<category_code>": [{Cash}, {Cheque}, {"Credit Card"}, {Online}, {"Cafe Assistant"}, {Deposit}, {Postpaid}, {"Salary Deduction"}]}` — powers Daily Sales Counter's per-category payment-method breakdown cards. |
| `/v1/finance/transactions/get-sales-balance` | Confirmed live 2026-06-25 (needed `/v1/`). Only returns `{balance: <total>}` — a single number, not the rich report the "Daily Sales Counter" web page shows (that's built from `get-sales-by-service-category` + `get-sales-and-expense-by-category` + `fetch-sales-by-category-and-payment` instead). |
| `/v1/expense/get` | **Singular** `expense`, not `expenses` — `/v1/expenses/get` 404s. Already wired as `getExpensesList` in `employeeDashboard.ts`. Records include `category_name`/`sub_category_name` — filtering client-side to `category_name === 'Cafe Expense'` is how `CafeSalesExpenseReport` derives its itemized expense list. |
| `/v1/orders-detail/detailed-sales-report` | Already wired (`getDetailedSalesReport` in `reports.ts`). Confirmed live 2026-06-25: returns ~1600 rows/month **across every package category**, not just PT — `PTSalesReport` filters client-side to rows with a non-blank `trainer_name`. No explicit end-date field; the web UI's "End Date" column is `sale_date + package_duration` months (verified matches the sampled rows exactly). |
| Web admin "Session Report" (Sales) | Looks like a sales report by its drawer label but is actually a session-attendance CRUD screen, functionally identical to `PTAttendance` — confirmed via web admin screenshot. Don't assume drawer labels describe the underlying data; check a screenshot before guessing an API for anything with "Report" in the name. |
| `/v1/fitness/trainer-schedule/index` | New discovery, 2026-06-25 — powers the web admin's "Trainer Appointments" weekly grid. `trainer_id` param appears to be ignored (always returns every trainer); `start_date`/`end_date` are required for `schedule` to populate (omitted → every slot returns `schedule: []` even for trainers with real bookings). Shape confirmed exactly against a screenshot. **Does not cover GX class schedules** — confirmed live that 2 of the 3 `is_gx_trainer=1` staff return empty schedules here across both a 1-week and full-year range despite having visible GX bookings in the web UI, so GX appointments come from a different, not-yet-found source. |
| `is_gx_trainer` (staff field, `/v1/auth/get`) | Confirmed live 2026-06-25 — this is what the web admin's "GX Trainers" list actually filters on (3 of 90 staff on branch 15), not a separate GX-trainers endpoint. No confirmed write path yet — `/v1/auth/update/{id}`'s documented fields don't include it. |
| `/v1/orders-detail/detailed-sales-report` — GX rows (`category: "15"`) | `package_duration` is in **days** for GX packages (e.g. `28` → +28 days), unlike PT-category rows where it's in **months** (e.g. `1` → +1 month). Both confirmed live against the web UI's exact End Date values for their respective categories — don't assume one unit applies to every category. |
| `/v1/session-detail-report` | Confirmed live 2026-06-29 to be the **wrong** endpoint for attendance reports despite returning 200 — actual shape is `{PaymentType: [[{category, tax, name, payment_method_id, receiving_date}, ...], ...]}`, a payment-method breakdown, not session/attendance rows. Don't reuse this for any future "Attendance Report" screen. |
| `/v1/fitness/commission-portal/hr/sessions` — `type` field | Confirmed live 2026-06-29 by paging through **26k+ rows on branch 15 (F11) and 11k+ on branch 1 (G13)**: the only `type` values that ever appear are `'GX'` and `'PT'` (plus a handful of legacy rows with `type: ''` that are still GX by package_type/package_name). **No `'Befit'` or `'SPT'` rows exist anywhere in this table on either branch.** `package_type` is not a reliable category discriminator either — both GX and PT rows use `package_type: '2'` (GX class packages specifically use `'15'`). Befit/SPT attendance must come from a different, not-yet-found endpoint — capture it from the web admin's Network tab rather than guessing further. Pagination: this endpoint paginates server-side (web admin shows 25/page); use `getHRSessionsAll` (loops every page) instead of a single large `limit`. |

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
| `getBankLedger` | `GET /v1/finance/bank-ledger/get` (fixed 2026-06-25, was missing `/v1/`) | ViewBankLedger |
| `getBankLedgerBalance` | `GET /v1/finance/bank-ledger/current-balance` (fixed 2026-06-25, was missing `/v1/`; endpoint itself is broken — always `0`) | unused (dropped from ViewBankLedger's UI) |
| `addBankCashEntry` | `POST /v1/finance/bank-ledger/add` (fixed 2026-06-25, was missing `/v1/`; required fields `branch_id`/`amount`/`type` confirmed via empty-body probe) | AddBankCash (wired, submission disabled) |
| `deleteBankCashEntry` | `PUT /v1/finance/bank-ledger/delete/{id}` (fixed 2026-06-25, was missing `/v1/`) | ViewBankLedger (button present, gated) |
| `getBankDetails` | `GET /v1/finance/banking-details/get` (fixed 2026-06-25, was `/finance/banking-details` — missing `/v1/` and `/get`) | BankDetails |
| `addBankDetail` | `POST /v1/finance/banking-details/add` (fixed 2026-06-25; payload fields corrected to `name`/`account_no` matching the real validator, not `bank_name`/`account_number`) | BankDetails (wired, submission disabled) |
| `getHRSessions` | `GET /v1/fitness/commission-portal/hr/sessions` (added 2026-06-25 — wraps a route already used raw in `PTAttendance`; confirmed `start_date`/`end_date` filters work) | TrainerDiary |
| `getHRSessionsAll` | Same endpoint as `getHRSessions`, but loops through every page instead of trusting one `limit` (added 2026-06-29 — the endpoint paginates server-side and a wide date range across all trainers can exceed any single-page guess) | GXAttendanceReport, BefitAttendanceReport, SPTAttendanceReport |

---

## Recommended Next Screens (by priority)

**Quick wins:** none currently identified — the last batch (`SessionAttendance`, `NewPTBookings`, `NewPTClients`) was finished 2026-06-29 (see below). Remaining Fitness ComingSoon screens (`GXAppointments`, `BefitList`/`Bookings`/`Appointments`/`Attendance`, `SPTList`/`Bookings`/`Appointments`/`Attendance`, `SwitchBookingTime`, `ManageAvailability`) all need real field-discovery before building — see the Fitness ComingSoon table above.

**Done 2026-06-29:**
- `GXAttendanceReport` (built and confirmed live, see Fitness row in Implemented Screens) — replaced the doc's previous wrong "Best API" guess (`session-detail-report`, actually a payment-breakdown report) with `hr/sessions` filtered to `type === 'GX'`
- `BefitAttendanceReport`, `SPTAttendanceReport` — UI built (identical layout to `GXAttendanceReport`, matches the web admin screenshots), but the `type === 'Befit'`/`'SPT'` filter is an **unconfirmed guess** — `hr/sessions` was checked across 26k+ rows on two branches and never produced either value. Will likely show empty until the real endpoint is found
- Added pagination (25/page, matching the web admin's page-number footer) to all three Attendance Report screens, replacing an earlier "fetch everything into one scroll" approach
- `SessionAttendance` — confirmed by the user to be the same screen as Sales → Session Report; `Stack.Screen` now points it at the existing `SalesSessionReport` component instead of `ComingSoon`
- `NewPTBookings`, `NewPTClients` (built, see Fitness rows in Implemented Screens) — both use `getDetailedSalesReport`, the same source as `PTSalesReport`. Found and fixed two calculation bugs in the process by diffing raw API rows against web screenshots: "PT Package" is `session_count * quantity` (not `session_count` alone), and "End Date" is `sale_date + (package_duration * quantity)` **days**, not months — `PTSalesReport` likely has the same End Date bug for any `quantity > 1` row (not fixed there yet, flagged in its row above). Also stopped both new screens from auto-loading on focus, matching the web admin's default empty state until "Search" is pressed

**Done 2026-06-25:**
- `LetterManagement` (built, see HR row in Implemented Screens), `ResourceManager` (built, see HR row in Implemented Screens) — both wired to drawer + stack, replacing their `ComingSoon` placeholders
- `TrainerDiary` (built, see Fitness row in Implemented Screens) — wired to drawer + stack, replacing its `ComingSoon` placeholder
- `ViewBankLedger`, `BankDetails` — these already had real screens built (pre-existing, untracked by this doc), but their GET calls were silently 404ing the whole time (missing `/v1/`, plus `BankDetails` was hitting the wrong path entirely). Both fixed — see their rows in Implemented Screens
- `StaffPromotion` (built, gated submission), `BalanceSheet`, `DailySalesCounter`, `CafeSalesExpenseReport`, `SalesSessionReport`, `PTSalesReport` — see their rows in Implemented Screens for details, including two cases (`BalanceSheet`, `SalesSessionReport`) where the screen's actual web-admin behavior turned out to be completely different from this doc's previous "Best API" guess

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
