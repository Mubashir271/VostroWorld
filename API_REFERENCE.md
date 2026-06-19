# VostroWorld Mobile API Reference

Consolidated index of all backend APIs documented for the mobile app, drawn
from:

- `Mobile-API-Sales-Finance-Nutrition.md` (Downloads) — Sales, Finance
  (Legacy + V2), Nutrition
- `Vostro_API_doc.docx` (Downloads) — Dashboard & Reports (MIS report,
  transaction reports, branches, announcements)
- `PT-API-DOC.pdf` (Downloads) — PT/Trainer Portal (Role 9) + Employee
  Dashboard (HR self-service & approvals)


  Admin login: f11@vostroworld.com
  vostro@8402
**Base URL:** `https://api.vostro-new.com/public/api/v1` (prod) /
`https://dev-api.vostro-new.com/public/api/v1` (dev)

**Auth:** `Authorization: Bearer {access_token}` on all endpoints except
`/auth/app-login`, `/auth/login`, and `/search-history/get`.

The **"In App"** column marks whether the endpoint is already called
somewhere in `src/api/*.ts`. `—` means not wired yet.

---

## 1. Authentication

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| POST | `/auth/app-login` | Mobile login, returns JWT + user (incl. `branch_name`, `role`) | ✅ `service.ts` |
| POST | `/auth/login` | Web/admin login (alternative) | — |
| POST | `/auth/refresh` | Refresh JWT token | — |
| POST | `/auth/logout` | Invalidate session | — |
| GET | `/auth/user-profile` | Current logged-in user | — |
| GET | `/auth/get/{id}` | Staff profile by ID (employee profile card) | — |
| POST | `/auth/update/{id}` | Update staff profile (multipart: cnic, email, phone, address, password, file, image_upload_from) | — |

---

## 2. Sales

### 2.1 Orders (`/orders`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| POST | `/orders/add` | Create sale order (header + payment) | — |
| POST | `/orders/store` | Alternative order creation (POS flow) | — |
| GET | `/orders/get`, `/orders/get/{id}` | List / fetch order(s) | ✅ `dashboard.ts`, `employeeDashboard.ts` |
| PUT | `/orders/update/{id}` | Update order | — |
| PUT | `/orders/soft-delete/{id}` | Soft-delete order | — |
| DELETE | `/orders/delete/{id}` | Hard delete order | — |
| GET | `/orders/sales-report` | Mobile sales detail report | — |
| GET | `/orders/detail-report` | Detailed sales report w/ payment breakdown | — |
| GET | `/orders/summery-report` | Summary report by category/payment | — |
| GET | `/orders/transaction-report` | Transaction-level sales report | — |
| GET | `/orders/export` | Export orders to Excel | — |
| GET | `/orders/export-summery` | Export summary to Excel | — |

### 2.2 Order Details / Line Items (`/orders-detail`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/orders-detail/get`, `/orders-detail/get/{id}` | List / single line item | — |
| POST | `/orders-detail/add` | Add package/item to order | — |
| PUT | `/orders-detail/update/{id}` | Update package dates | — |
| PUT | `/orders-detail/soft-delete/{id}` | Soft delete line item | — |
| DELETE | `/orders-detail/delete/{id}` | Permanent delete | — |
| GET | `/orders-detail/have-active-gym-package/{id}` | Check active gym package | — |
| GET | `/orders-detail/is-frozen/{id}` | Check if package is frozen | — |
| GET | `/orders-detail/check-for-purchase/{client_id}` | Check purchase history | — |
| GET | `/orders-detail/package-dates/{id?}` | Fetch package start/end dates | — |
| GET | `/orders-detail/detailed-sales-report` | Detailed PT/sales report | ✅ `reports.ts` |
| GET | `/orders-detail/export-pt-sales` | Export PT sales Excel | — |
| GET | `/orders-detail/generate-cafe-total` | Cafe sales totals | — |
| PUT | `/orders-detail/update-payment-type/{id}` | Change payment type on line | — |
| GET | `/orders-detail/report` | Order detail report | — |

### 2.3 Cart (`/cart`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| POST | `/cart/add` | Add package to cart | — |
| GET | `/cart/get`, `/cart/get/{id}` | List / single cart item | — |
| PUT | `/cart/update/{id}` | Update cart item | — |
| PUT | `/cart/cart-update/{id}` | Update cart fields | — |
| PUT | `/cart/cart-clientId-update` | Assign client to cart | — |
| DELETE | `/cart/delete/{id}` | Remove item | — |
| DELETE | `/cart/destroy/{client_id}` | Clear client cart | — |
| GET | `/cart/list-package-categories/{id?}` | Package categories for cart | — |

### 2.4 Payments History (`/payments-history`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| POST | `/payments-history/add` | Record a payment | — |
| GET | `/payments-history/get`, `/get/{id}` | List / single payment | — |
| PUT | `/payments-history/update/{id}` | Update payment | — |
| GET | `/payments-history/last-transaction/{id}` | Client last transaction | — |
| GET | `/payments-history/client-balance/{id}` | Client outstanding balance | — |

### 2.5 Packages (`/packages`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/packages/get`, `/get/{id}` | List / single package | — |
| GET | `/packages/names-list/{id?}` | Package name dropdown | — |
| GET | `/packages/fetch-package-info` | Package details by filters | — |
| GET | `/packages/cafe-products/{id?}` | Cafe menu products | — |
| GET | `/packages/all-with-categories` | All packages grouped by category | — |
| GET | `/packages/gx` | GX class packages | — |

### 2.6 Related Things (`/related_things`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/related_things/get-names-list-new` | Payment methods/categories by type | — |
| GET | `/related_things/get-names-list` | Legacy name list | — |

### 2.7 Sales Reports (App-Optimized)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/transaction-report` | Transaction listing w/ items + payments | ✅ `dashboard.ts`, `reports.ts` |
| GET | `/transaction-report-cafe` | Cafe-only transaction report | ✅ `cafe.ts`, `reports.ts` |
| GET | `/transaction-slip` | Single transaction slip/receipt | — |
| GET | `/transaction-report-summery` | Daily summary totals | ✅ `reports.ts` |
| GET | `/generate-sales-report` | Package-wise sales report | ✅ `reports.ts` |
| GET | `/package-categories` | Package category codes/labels | ✅ `dashboard.ts` |
| GET | `/report` | Sales by payment method (onspot vs deposits) | — |
| GET | `/detail`, `/summary` | Legacy detail/summary reports | — |

### 2.8 Client Balance & Cafe Accounts

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/client-balance/get` | Client credit balance records | — |
| POST | `/client-balance/credit` | Add client credit | — |
| GET | `/cafe-accounts/get` | Staff cafe receivable accounts | — |
| PUT | `/cafe-accounts/receive/{orderId}` | Mark cafe payment received | — |

### 2.9 Approval Workflow

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/approval/get` | Pending approvals | — |
| POST | `/approval/add/{orderId}` | Submit order for approval | — |
| PUT | `/approval/approve/{id}` | Approve | — |
| PUT | `/approval/denied/{id}` | Deny | — |

### 2.10 Clients

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/clients/get` | List clients (filters: `status`, `gender`, `start_date`, `end_date`, etc.) | ✅ `cafe.ts`, `employeeDashboard.ts`, `reports.ts` |
| GET | `/clients/count` | Client count | ✅ `dashboard.ts` |

---

## 3. Finance

### 3.1 Finance V2 (double-entry accounting) — `/finance-v2`

Write ops require role in `[1, 3, 5]`.

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/finance-v2/setup/status` | Setup progress for branch | — |
| GET | `/finance-v2/setup/wizard-options` | Dropdown options for wizard | — |
| POST | `/finance-v2/setup/company` | Save company settings | — |
| POST | `/finance-v2/setup/seed-chart` | Seed chart of accounts | — |
| POST | `/finance-v2/setup/opening-balances` | Save opening balances | — |
| POST | `/finance-v2/setup/complete` | Mark setup complete | — |
| GET | `/finance-v2/accounts` | Hierarchical chart of accounts | — |
| GET | `/finance-v2/accounts/list` | Flat account list | — |
| GET | `/finance-v2/accounts/types` | Account type definitions | — |
| POST | `/finance-v2/accounts` | Create new account | — |
| GET | `/finance-v2/journals` | List journal entries | — |
| GET | `/finance-v2/journals/{id}` | Single journal with lines | — |
| POST | `/finance-v2/journals` | Create manual journal | — |
| POST | `/finance-v2/journals/{id}/void` | Void a journal | — |
| GET | `/finance-v2/reports/dashboard` | Finance hub overview | — |
| GET | `/finance-v2/reports/trial-balance` | Trial balance | — |
| GET | `/finance-v2/reports/profit-and-loss` | P&L statement | — |
| GET | `/finance-v2/reports/balance-sheet` | Balance sheet | — |
| GET | `/finance-v2/reports/general-ledger/{accountId}` | Account ledger | — |
| GET | `/finance-v2/reports/accounts-receivable` | AR aging | — |
| GET | `/finance-v2/reports/health-check` | Data integrity check | — |
| GET | `/finance-v2/transactions/types` | Transaction type list | — |
| POST | `/finance-v2/transactions/expense` | Record expense | — |
| POST | `/finance-v2/transactions/transfer` | Bank/cash transfer | — |
| POST | `/finance-v2/transactions/charity` | Charity donation | — |
| POST | `/finance-v2/sync/order/{orderId}` | Sync single sale to ledger | — |
| GET | `/finance-v2/sync/backfill-stats` | Backfill statistics | — |
| POST | `/finance-v2/sync/backfill` | Run backfill job | — |
| GET | `/finance-v2/sync/log` | Sync log entries | — |
| GET | `/finance-v2/import/module-status` | Import module status | — |
| POST | `/finance-v2/import/all` \| `/expenses` \| `/charity` \| `/payroll` | Backfill legacy data | — |
| `/finance-v2/mappings` | GET/POST/seed | Map packages/payments to accounts | — |
| `/finance-v2/vendors` | GET/POST/import | Vendor management | — |
| `/finance-v2/bank` | uncleared/summary/clear | Bank reconciliation | — |
| `/finance-v2/fiscal` | periods/close | Fiscal period management | — |
| GET | `/finance-v2/audit-log` | Audit trail | — |

### 3.2 Legacy Finance — `/finance`

CRUD pattern: `POST .../add`, `GET .../get`, `PUT .../update/{id}`, `PUT .../delete/{id}`

| Prefix / Endpoint | Method | Purpose | In App |
|---|---|---|---|
| `/finance/categories` | CRUD | Expense/income categories | — |
| `/finance/sub-categories` | CRUD | Sub-categories | — |
| `/finance/transactions/get-sales-by-service-category` | GET | Sales grouped by service | ✅ `reports.ts` |
| `/finance/transactions/fetch-sales-by-category-and-payment` | GET | Sales by category + payment | — |
| `/finance/transactions/get-sales-by-payment-method` | GET | Sales by payment method | — |
| `/finance/transactions/fetch-sales-sum-by-payment-method` | GET | Payment method totals | — |
| `/finance/transactions/get-sales-and-expense-by-category` | GET | Combined sales + expenses | ✅ `reports.ts` |
| `/finance/transactions/get-sales-balance` | GET | Sales counter balance | — |
| `/finance/transactions/sales-counter-balance` | GET | Counter balance detail | — |
| `/finance/transactions/fetch-expense-detail` | GET | Expense breakdown | — |
| `/finance/transactions/get-bank-balance-detail` | GET | Bank balance transactions | — |
| `/v1/finance/office-cash-flow/get` | GET | Office cash transactions. No per-row balance — opening balance in `opening_balance.balance`, compute running balance client-side | ✅ `employeeDashboard.ts` (`getOfficeCashLedger`) |
| `/v1/finance/office-cash-flow/current-balance` | GET | **Broken** — always returns `{"balance":"0"}` regardless of branch/date | ⚠️ avoid |
| `/v1/finance/office-cash-flow/office-cash-balance` | GET | Correct current total (`totalBalance`, `lastCreditAmount`, `lastDebitAmount`) — use this instead of `current-balance` | ✅ `employeeDashboard.ts` (`getOfficeCashBalance`) |
| `/v1/finance/office-cash-flow/add` | POST | Add entry. Required: `branch_id`, `amount`, `type`. Optional: `resource`, `bank_account_id`, `date`, `description`, `is_petty_cash`. **`type`/`resource` are not enum-validated** — any string is accepted, so a minimal payload succeeds instead of erroring | ✅ `employeeDashboard.ts` (`addOfficeCashEntry`, wired but submission disabled in `AddOfficeCash` screen pending confirmation) |
| `/v1/finance/office-cash-flow/delete/{id}` | PUT | Soft delete. Confirmed working (204) | ✅ `employeeDashboard.ts` (`deleteOfficeCashEntry`) |
| `/finance/cash-in-hand/getCashInHandRecords`, `/fetch-opening-balance` | GET | Petty cash in hand | ✅ `employeeDashboard.ts` (`getCashInHandRecords`) |
| `/v1/finance/cash-in-hand/add`, `/update/{id}` | POST/PUT | Add/update daily cash-in-hand snapshot (Bank Funds/Charity Cash/GST Cash/Cash in Hand). Only `branch_id`/`date` required | ✅ `employeeDashboard.ts` (`addCashInHandEntry`, `updateCashInHandEntry` — wired, used by `DailyExpense`, not yet live-tested) |
| `/finance/bank-ledger/get`, `/current-balance` | GET | Bank ledger entries | — |
| `/finance/petty-cash-ledger/get` | GET | Petty cash ledger | — |
| `/finance/keene-ledger/get` | GET | Keene ledger | — |
| `/finance/liability-ledger/get`, `/current-balance` | GET | Liability ledger | — |
| `/v1/finance/charity/get` | GET | Charity fund. Returns per-row running balances (`f_cash_balance`/`w_cash_balance`/`total_charity`) + `opening_balance` block. `date` is a UTC timestamp at Asia/Karachi midnight — shift +5h before extracting the calendar date | ✅ `employeeDashboard.ts` (`getCharityLedger`) |
| `/v1/finance/charity/current-balance` | GET | Confirmed working — `f_cash_balance`/`w_cash_balance`/`total_charity` | ✅ `employeeDashboard.ts` (`getCharityBalance`) |
| `/v1/finance/charity/add` | POST | Required: `branch_id`, `date`, `type` (`Credit`/`Debit`/`Transfer`), `amount`, `person` (`Faisal`/`Waqas`, case-sensitive) for Credit/Debit or `from_person`/`to_person` for Transfer. Strictly enum-validated (unlike office-cash-flow) | ✅ `employeeDashboard.ts` (`addCharityEntry`) |
| `/v1/finance/charity/delete/{id}` | PUT | **Broken** — 500s, backend missing `deleted_by` column on the `charity` table | ⚠️ `employeeDashboard.ts` (`deleteCharityEntry`, wired but server-side bug) |
| `/finance/g-thirteen/get` | GET | G-13 tax records | — |
| `/finance/liabilities` | CRUD | Liability records | — |
| `/finance/liability-installments` (`/due-amount`, `/pay`) | — | Installment payments | — |
| `/finance/asset` | CRUD | Fixed assets | — |
| `/finance/vostro-expense` (`/report`, `/export`) | — | Vostro expense tracking | — |
| `/finance/all-expenses/expenses-sum-by-category` | GET | Expense sum by category | — |
| `/finance/setting` (`/get-current-charges`, `/tax-calculator/{branch}/{amount}/{paymentMethod}/{type}`) | — | Finance settings/tax calc | — |
| `/finance/banking-details` | GET | Bank account details | — |
| `/v1/expenses/get`, `/v1/expenses/store` | GET/POST | Generic expenses | ✅ `employeeDashboard.ts` |
| `/v1/finance/dashboard` | GET | Finance dashboard summary | ✅ `employeeDashboard.ts` |

---

## 4. Nutrition

**Prefixes:** `/nutrition`, `/fitness/meal-plane`, `/fitness/nutrition-assessments`.
`branch_id` mandatory on most list endpoints.

### 4.1 Client Hub

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/nutrition/client-hub` | Paginated clients w/ counts of meal plans, assessments, questionnaires, diet plans, appointments. Params: `branch_id`, `client_id`, `search`, `filter` (`all`/`has_any`/`missing_any`/`meal_plan`/`nutrition_assessment`/`questionnaire`/`diet_plan`/`appointments`), `limit` (max 50), `page` | ✅ `nutrition.ts` |

### 4.2 Appointments (`/nutrition/appointments`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/nutrition/appointments` | List appointments (`branch_id` required) | ✅ `nutrition.ts` |
| GET | `/nutrition/appointments/{id}` | Single appointment | — |
| POST | `/nutrition/appointments` | Create appointment | ✅ `nutrition.ts` (`addNutritionAppointment`) |
| PUT | `/nutrition/appointments/{id}` | Update appointment | — |
| DELETE | `/nutrition/appointments/{id}` | Delete appointment | — |
| PUT | `/nutrition/appointments/actions/{id}/{status}` | Change status | — |
| GET | `/nutrition/appointments/statistics` | Dashboard stats | ✅ `nutrition.ts` |
| GET | `/nutrition/appointments/nutritionists` | List nutritionists (role 11) | ✅ `nutrition.ts` |
| GET | `/nutrition/appointments/trainers` | List trainers | ✅ `nutrition.ts` |
| GET | `/nutrition/appointments/booked-slots` | Already-booked time slots | — |
| GET | `/nutrition/appointments/conversion-options` | Conversion dropdown values | ✅ `nutrition.ts` |
| GET | `/nutrition/appointments/export` | Export Excel | — |

### 4.3 Diet Plans (`/nutrition/diet-plans`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/nutrition/diet-plans` | List diet plan records | ✅ `nutrition.ts` |
| GET | `/nutrition/diet-plans/{id}` | Single record | — |
| POST | `/nutrition/diet-plans` | Create record | ✅ `nutrition.ts` (`addDietPlanIssued`, not yet called — "avoid POST for now") |
| PUT | `/nutrition/diet-plans/{id}` | Update record | — |
| DELETE | `/nutrition/diet-plans/{id}` | Soft delete | — |
| GET | `/nutrition/diet-plans/goal-options` | Goal dropdown list | ✅ `nutrition.ts` |
| GET | `/nutrition/diet-plans/search-clients` | Search clients for diet plan | — |
| GET | `/nutrition/diet-plans/statistics` | Dashboard statistics | ✅ `nutrition.ts` |
| GET | `/nutrition/diet-plans/export` | Export Excel | — |

### 4.4 Health Camps (`/nutrition/health-camps`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/nutrition/health-camps` | List camp records | ✅ `nutrition.ts` |
| POST | `/nutrition/health-camps` | Create record | — |
| PUT | `/nutrition/health-camps/{id}` | Update record | — |
| DELETE | `/nutrition/health-camps/{id}` | Delete record | — |
| GET | `/nutrition/health-camps/options` | Conversion & lifestyle dropdowns | — |
| GET | `/nutrition/health-camps/statistics` | Stats | ✅ `nutrition.ts` |
| GET | `/nutrition/health-camps/export` | Export Excel | — |

### 4.5 Referral Sheet (`/nutrition/referrals`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/nutrition/referrals` | List weekly referral records | ✅ `nutrition.ts` |
| POST | `/nutrition/referrals` | Create record | ✅ `nutrition.ts` |
| PUT | `/nutrition/referrals/{id}` | Update record | ✅ `nutrition.ts` |
| DELETE | `/nutrition/referrals/{id}` | Delete record | ✅ `nutrition.ts` |
| GET | `/nutrition/referrals/trainers` | Trainer dropdown | ✅ `nutrition.ts` |
| GET | `/nutrition/referrals/trainer-active-clients` | Active client count per trainer | — |
| GET | `/nutrition/referrals/statistics` | Weekly stats | ✅ `nutrition.ts` |
| GET | `/nutrition/referrals/export` | Export Excel | — |

### 4.6 Nutritionist Assessment Questionnaire (`/nutrition/nutritionist-assessment-forms`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/nutrition/nutritionist-assessment-forms` | List forms | ✅ `nutrition.ts` |
| GET | `/nutrition/nutritionist-assessment-forms/{id}` | Single form with body entries | — |
| GET | `/nutrition/nutritionist-assessment-forms/by-client/{clientId}` | Form for a client | — |
| POST | `/nutrition/nutritionist-assessment-forms` | Create form | ✅ `nutrition.ts` |
| PUT | `/nutrition/nutritionist-assessment-forms/{id}` | Update form | ✅ `nutrition.ts` |
| DELETE | `/nutrition/nutritionist-assessment-forms/{id}` | Delete form | — |
| POST | `/nutrition/nutritionist-assessment-forms/{id}/body-entries` | Add body measurement entry | — |
| PUT | `/nutrition/nutritionist-assessment-forms/{id}/body-entries/{entryId}` | Update body entry | — |

### 4.7 Meal Plans / 6-Page Diet Plan (`/fitness/meal-plane`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| POST | `/fitness/meal-plane/store` | Create meal plan (returns `uuid`) | ✅ `nutrition.ts` |
| GET | `/fitness/meal-plane/index` | List meal plans | — |
| GET | `/fitness/meal-plane/show/{id}` | Single plan detail | — |
| GET | `/fitness/meal-plane/listing` | Simplified listing | ✅ `nutrition.ts` |
| PUT | `/fitness/meal-plane/update/{id}` | Update plan | — |
| PUT | `/fitness/meal-plane/destroy/{id}` | Delete plan | — |
| GET | `/fitness/meal-plane/intake-form` | Load 6-page diet plan form (`uuid`/`plan_uuid`) | — |
| POST | `/fitness/meal-plane/intake-form` | Save 6-page form (multipart, image fields per meal section) | — |

### 4.8 Nutrition Assessments — Fitness Module (`/fitness/nutrition-assessments`)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/fitness/nutrition-assessments/index` | List assessments (`branch_id`, `client_id`, `limit`) | ✅ `nutrition.ts` |
| GET | `/fitness/nutrition-assessments/show/{id}` | Single assessment | — |
| POST | `/fitness/nutrition-assessments/store` | Create assessment | ✅ `nutrition.ts` (not yet called — "avoid POST for now") |
| PUT | `/fitness/nutrition-assessments/update/{id}` | Update assessment | — |
| PUT | `/fitness/nutrition-assessments/actions/{id}/{status}` | Activate/deactivate | — |

### 4.9 Nutrition Packages

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/v1/nutrition-packages/get` | List nutrition packages | ✅ `nutrition.ts` |
| POST | `/v1/nutrition-packages/store` | Create nutrition package | ✅ `nutrition.ts` |
| GET | `/v1/nutritionists/get` | List nutritionists | ✅ `nutrition.ts` |

---

## 5. Dashboard & Reports

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/v1/MISReport/get?bId={branch_id}` | Super-admin dashboard: today's sales/attendance/footfall by category (Gym, PT, GX, Nutrition, Cafe, Physio, CFT) + month-to-date | — |
| GET | `/v1/search-history/get?branch_id={id}` | Today's front-desk search history (no auth) | — |
| GET | `/v1/branches/get` | Branch list (for selectors) | — |
| GET | `/v1/announcements/index` | Active announcements | ✅ `employeeDashboard.ts` |
| GET | `/v1/summary` | Generic summary | ✅ `dashboard.ts` |

(Transaction/sales report endpoints — `/transaction-report`, `/transaction-report-cafe`,
`/transaction-report-summery`, `/generate-sales-report`, `/package-categories` —
are listed under §2.7 Sales Reports.)

### Category Code Reference

| Code | Category |
|------|----------|
| 1 | Gym |
| 2 | Personal Training (PT) |
| 3 | Guest Pass |
| 4 | Small Group PT |
| 5 | Nutrition |
| 6 | Registration |
| 7 | Bootcamp |
| 8 | Freezing |
| 9 | General |
| 10 | Cafe |
| 11 | CFT / Academy |
| 12 | Massage Chair |
| 13 | Cafe Deposits |
| 14 | Physiotherapy |
| 15 | GX (Group Exercise) |

---

## 6. PT Trainer Portal (Role 9) — `/fitness/commission-portal/trainer`

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/fitness/commission-portal/trainer/clients` | My clients (PT home): sessions delivered/remaining, today's slot/status, `branch_id`, `include_expired`, `check_date` | ✅ `trainer.ts` |
| POST | `/fitness/commission-portal/trainer/mark` | Mark attendance (Delivered/No Show/Cancel for staff & client); errors `403` not present, `409` duplicate/slot conflict | ✅ `trainer.ts` |
| GET | `/fitness/commission-portal/trainer/taken-slots` | Already-taken time slots for a date | ✅ `trainer.ts` |
| GET | `/fitness/commission-portal/trainer/commission` | Commission totals + session stats for period | ✅ `trainer.ts` |
| GET | `/fitness/commission-portal/trainer/history` | Session history (`limit`, `start_date`, `end_date`, `order_id`) | ✅ `trainer.ts` |
| GET | `/fitness/commission-portal/trainer/roster` | Personal trainer roster (`branch_id`, `trainer_id`, `package_status`, `limit`, `page`) | ✅ `trainer.ts`, `employeeDashboard.ts` |

### 6.1 HR Session Portal (optional, not required for PT self-flow)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/fitness/commission-portal/hr/trainers` | List trainers | — |
| GET | `/fitness/commission-portal/hr/clients` | List clients | — |
| GET | `/fitness/commission-portal/hr/sessions` | List sessions | — |
| POST | `/fitness/commission-portal/hr/sessions` | Create session | — |
| PUT | `/fitness/commission-portal/hr/sessions/{id}` | Update session | — |
| DELETE | `/fitness/commission-portal/hr/sessions/{id}` | Delete session | — |
| POST | `/fitness/commission-portal/hr/bulk-sessions` | Bulk create sessions | — |
| GET | `/fitness/commission-portal/hr/commissions` | Commission report | — |

---

## 7. Employee Dashboard (Self-Service + HR Approvals)

### 7.1 Profile & Core

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/auth/get/{id}` | Profile detail | — |
| POST | `/auth/update/{id}` | Update profile (multipart) | — |
| GET | `/hr/promotion/index` | Promotions history (`branch_id`, `user_id`, `status`, `limit`, `page`) | ✅ `employeeDashboard.ts` |
| GET | `/announcements/index` | Announcements feed (`branch_id`, `search`, `priority`, `status`, `active_only`, `limit`, `page`) | ✅ `employeeDashboard.ts` |

### 7.2 Attendance

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/attendance/index` | Attendance list (`category=2` staff, `branch_id`, `member_id`, dates, `attendance_status`, `late_filter`, `limit`, `page`) | ✅ `employeeDashboard.ts` |
| GET | `/attendance/summery` | Attendance summary counter (`on_time`, `late`, `absent`, `leave`) | ✅ `employeeDashboard.ts` |

### 7.3 Duty Hours

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/staff-timing/index` | Current duty hours (`branch_id`, `staff_id`, `status`, `limit`, `page`) | ✅ `employeeDashboard.ts` |
| GET | `/hr/employee-duty-hour-requests/index` | Duty hour requests list (`branch_id`, `user_id`, `approval_status`, `day`, `status`, `limit`) | ✅ `employeeDashboard.ts` |
| POST | `/hr/employee-duty-hour-requests/store` | Create duty hour request | ✅ `employeeDashboard.ts` |
| PUT | `/hr/employee-duty-hour-requests/update/{id}` | Update request (pending only) | — |
| PUT | `/hr/employee-duty-hour-requests/review/{id}` | Review request (HR/Admin): `approval_status`, `review_notes` | — |

### 7.4 Salary

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/salary` | Salary slip data (`branch_id`, `start_date`, `end_date`, `user_id`, `limit`) | ✅ `employeeDashboard.ts` |

### 7.5 Leave

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/hr/leaves-quota/index` | Leave quota (`branch_id`, `user_id`, `leave_type`, `status`, `limit`, `page`) | ✅ `employeeDashboard.ts` |
| GET | `/hr/leave-application/index` | Leave applications list | ✅ `employeeDashboard.ts` |
| POST | `/hr/leave-application/is-exist` | Conflict check (`200` not exist / `409` overlap) | ✅ `employeeDashboard.ts` |
| POST | `/attendance/check-leave-eligibility` | Probation eligibility check (`200`/`409`) | ✅ `employeeDashboard.ts` |
| POST | `/hr/leave-application/check-leave-availability` | Quota availability check (`200`/`409`) | ✅ `employeeDashboard.ts` |
| POST | `/hr/leave-application/store` | Submit leave application | ✅ `employeeDashboard.ts` |

### 7.6 Qualification / Experience

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/hr/employee-profile-entries/index` | List entries (`branch_id`, `user_id`, `entry_type`, `status`, `limit`) | ✅ `employeeDashboard.ts` |
| POST | `/hr/employee-profile-entries/store` | Create entry (Qualification/Experience) | ✅ `employeeDashboard.ts` |
| PUT | `/hr/employee-profile-entries/update/{id}` | Update entry | — |
| PUT | `/hr/employee-profile-entries/actions/{id}/{status}` | Archive/action | — |

### 7.7 Documents

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/hr/staff-documents/index` | List documents (`branch_id`, `user_id`, `approval_status`, `status`, `limit`, `page`) | ✅ `employeeDashboard.ts` |
| POST | `/hr/staff-documents/store` | Add document (multipart: `document_type`, `document_category`, `issue_date`, `subject`, `description`, `document_code`, `document_file`) | ✅ `employeeDashboard.ts` |
| POST | `/hr/staff-documents/update/{id}` | Update document (multipart; resets approval to Pending; cannot edit if approved) | — |
| PUT | `/hr/staff-documents/review/{id}` | Review document (HR/Admin): `approval_status`, `review_notes` | — |

### 7.8 Reviewer/HR Approvals (shown in Employee Dashboard)

| Method | Endpoint | Purpose | In App |
|--------|----------|---------|--------|
| GET | `/hr/employee-duty-hour-requests/index?approval_status=Pending` | Pending duty-hour requests | — |
| PUT | `/hr/employee-duty-hour-requests/review/{id}` | Review duty-hour request | — |
| GET | `/hr/staff-documents/index?approval_status=Pending` | Pending documents | — |
| PUT | `/hr/staff-documents/review/{id}` | Review document | — |
| GET | `/v1/approvals/get` | Generic approvals list | ✅ `employeeDashboard.ts` |

---

## 8. Standard Response Formats

**Success — single/list:**
```json
{ "status": true, "message": "Record found", "data": { } }
```

**Success — paginated (Helper pattern):**
```json
{ "status": true, "message": "Record found", "data": [ ], "totalRecord": 120, "totalPages": 12 }
```

**Success — paginated (Nutrition pattern):**
```json
{ "status": true, "message": "Appointments retrieved successfully", "data": [ ],
  "pagination": { "total_record": 120, "total_pages": 12, "current_page": 1, "per_page": 15 } }
```

**Created (201):**
```json
{ "status": true, "message": "The record was inserted successfully!.." }
```

**Validation error (422):**
```json
{ "status": false, "message": "The branch id field is required." }
```

**Not found (404):**
```json
{ "status": false, "message": "No record found" }
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | Updated/deleted (no body) |
| 401 | Unauthorized — missing/invalid token |
| 403 | Forbidden — insufficient role/ownership (e.g. Finance V2 writes, editing approved docs) |
| 404 | Not found |
| 409 | Conflict — duplicate leave/attendance, quota exceeded, slot conflict |
| 422 | Validation error |
| 500 | Server error |

---

## 9. Mobile Integration Notes

1. Store `access_token` from `/auth/app-login` securely (Keychain/Keystore).
2. Attach `Authorization: Bearer {token}` on every call except login.
3. `branch_id` — use the logged-in user's `branch_id` unless multi-branch access.
4. Dates — ISO `YYYY-MM-DD`.
5. Sales amounts are integers (PKR, no decimals).
6. Check both pagination shapes (`totalRecord`/`totalPages` vs `pagination` object).
7. File uploads (meal plan intake form, documents, profile image) use
   `multipart/form-data` — do not set `Content-Type: application/json`.
8. Export endpoints return Excel/binary — handle as file download, not JSON.
9. Role `9` = PT/Trainer, Role `10` = Nutritionist, Role `11` = Nutritionist (assessment forms).
10. Leave submission pre-checks, in order: `/hr/leave-application/is-exist` →
    `/attendance/check-leave-eligibility` → `/hr/leave-application/check-leave-availability`.
