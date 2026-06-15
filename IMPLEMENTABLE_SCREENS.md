# Pending Screens vs. Available APIs

Cross-reference of [PENDING_SCREENS.md](PENDING_SCREENS.md) (currently
`ComingSoon`) against [API_REFERENCE.md](API_REFERENCE.md).

**Status legend**
- ✅ **Ready** — matching API(s) confirmed in the docs (at least for
  viewing/listing). Send UI screenshot and it can be wired end-to-end (or
  view-wired with Add/Update mocked, matching the pattern used for
  `GymPackages`/`MembershipPackages`).
- ⚠️ **Partial** — some API exists (usually GET/view) but the key write
  action (Add/Pay/Create) is unconfirmed or generic. Can build the UI and
  wire what's available; the rest stays mock until confirmed.
- ❌ **Not ready** — no matching API found in any of the three docs. UI can
  still be built with mock data only (same as `ViewCards`, `Categories`,
  etc.), but nothing to wire yet.

---

## Sales (1 remaining, 9 of 10 implemented — see [PENDING_SCREENS.md](PENDING_SCREENS.md))

| Screen | Status | API(s) | Notes |
|---|---|---|---|
| SalesSessionReport | ✅ Ready | `GET /orders-detail/detailed-sales-report` or `GET /session-detail-report` | Already used in `reports.ts` for other reports — not yet implemented |

---

## Human Resource (13)

| Screen | Status | API(s) | Notes |
|---|---|---|---|
| StaffDutyHours | ✅ | `GET /staff-timing/index` | Already used (self-view); HR-wide view = same endpoint w/o `staff_id` filter |
| EmployeeAttendance | ✅ | `GET /attendance/index?category=2` | Already used for self; HR view = drop `member_id` filter |
| LeaveQuota | ✅ | `GET /hr/leaves-quota/index` | Already used for self; HR view = all staff |
| SalaryComponent | ✅ | `GET /salary` | Returns salary components/finance impacts |
| StaffCommissions | ✅ | `GET /fitness/commission-portal/hr/commissions` | HR session portal |
| SessionPortalHR | ✅ | `/fitness/commission-portal/hr/*` (full CRUD) | trainers, clients, sessions, bulk-sessions, commissions |
| PTAttendance | ✅ | `GET /fitness/commission-portal/hr/sessions` + `POST /fitness/commission-portal/trainer/mark` | HR view of PT session attendance |
| StaffPromotion | ⚠️ | `GET /hr/promotion/index` | View-only; no "create promotion" endpoint documented |
| StaffAdvances | ⚠️ | `GET /v1/staff-loans/get` | View-only; no add/pay endpoint documented |
| DetailedHRReport | ⚠️ | `GET /v1/hr/dashboard` + attendance/leave/salary endpoints | Combine multiple endpoints for a "detailed" view |
| AddStaff | ❌ | — | No staff-creation endpoint documented (`/auth/update/{id}` only edits existing) |
| LetterManagement | ❌ | — | No matching API |
| ResourceManager | ❌ | — | No matching API |

---

## Finance (26)

| Screen | Status | API(s) | Notes |
|---|---|---|---|
| AddExpense | ✅ | `POST /v1/expenses/store` | Already used in `employeeDashboard.ts` |
| DailyExpense | ✅ | `GET /v1/expenses/get` | Filter by date |
| ViewCharityLedger | ✅ | `GET /finance/charity/get`, `/finance/charity/current-balance` | View only |
| ViewOfficeLedger | ✅ | `GET /finance/office-cash-flow/get`, `/current-balance`, `/office-cash-balance` | View only |
| ViewBankLedger | ✅ | `GET /finance/bank-ledger/get`, `/current-balance` | View only |
| PettyCashLedger | ✅ | `GET /finance/petty-cash-ledger/get` | View only |
| G13CashLedger | ✅ | `GET /finance/g-thirteen/get` | View only |
| PayLiabilities | ✅ | `POST /finance/liability-installments/pay`, `/due-amount` | Confirmed write endpoint |
| ViewLiabilitiesLedger | ✅ | `GET /finance/liability-ledger/get`, `/current-balance` | View only |
| BalanceSheet | ✅ | `GET /finance-v2/reports/balance-sheet` | Requires Finance V2 setup to be complete for the branch |
| DailySalesCounter | ✅ | `GET /finance/transactions/get-sales-balance`, `/sales-counter-balance` | |
| CafeSalesExpenseReport | ✅ | `GET /transaction-report-cafe` (already in `cafe.ts`) + `GET /v1/expenses/get` + `GET /orders-detail/generate-cafe-total` | Combine cafe sales + expenses |
| BankDetails | ✅ | `GET /finance/banking-details` | View only |
| DailyExpenseReport | ⚠️ | `GET /v1/expenses/get` with date range | No dedicated report endpoint, can derive totals client-side |
| PaidExpenseReport | ⚠️ | `GET /v1/expenses/get` (filter paid) or `/finance/all-expenses/expenses-sum-by-category` | |
| AddCashInHand | ⚠️ | `GET .../getCashInHandRecords`, `/fetch-opening-balance` confirmed | Add endpoint follows CRUD `/add` convention but unconfirmed |
| AddCharity | ⚠️ | `POST /finance-v2/transactions/charity` (role-gated) | Or legacy `/finance/charity/add` (unconfirmed) |
| AddOfficeCash | ⚠️ | View confirmed (`/finance/office-cash-flow/get`) | Add endpoint unconfirmed |
| AddBankCash | ⚠️ | View confirmed; `POST /finance-v2/transactions/transfer` available | Legacy add unconfirmed |
| AddPettyCash | ⚠️ | View confirmed (`/finance/petty-cash-ledger/get`) | Add endpoint unconfirmed |
| AddG13Cash | ⚠️ | View confirmed (`/finance/g-thirteen/get`) | Add endpoint unconfirmed |
| AddLiabilities | ⚠️ | `/finance/liabilities` (CRUD pattern stated) | `/add` endpoint follows convention but unconfirmed |
| AddKeene | ⚠️ | View confirmed (`/finance/keene-ledger/get`) | Add endpoint unconfirmed |
| KeeneLedger | ✅ | `GET /finance/keene-ledger/get` | View only |
| Assets | ⚠️ | `/finance/asset` (CRUD pattern stated) | GET confirmed; add/update unconfirmed |
| DailyOfficeClosing | ⚠️ | Combine `/finance/office-cash-flow/*` + `/finance/transactions/sales-counter-balance` | No single "closing" endpoint |

---

## Fitness (25)

| Screen | Status | API(s) | Notes |
|---|---|---|---|
| TrainerDiary | ✅ | `GET /fitness/commission-portal/trainer/history` | Already in `trainer.ts` |
| PTSalesReport | ✅ | `GET /orders-detail/detailed-sales-report` | Already in `reports.ts`, filter category=2 |
| TrainerAppointments | ✅ | `GET /fitness/commission-portal/trainer/roster` or `/hr/sessions` | |
| SessionAttendance | ✅ | `POST /fitness/commission-portal/trainer/mark` | Already in `trainer.ts` |
| NewPTBookings | ✅ | `POST /fitness/commission-portal/hr/sessions` or `/bulk-sessions` | |
| NewPTClients | ✅ | `GET /fitness/commission-portal/hr/clients` | |
| GXTrainers | ✅ | `GET /fitness/commission-portal/hr/trainers` | |
| GXSlotsList | ✅ | `GET /gx/classes/get` | Already in `employeeDashboard.ts` |
| GXBookings | ✅ | `GET /gx/bookings/get` | Already in `employeeDashboard.ts` |
| GXAppointments | ✅ | `GET /gx/bookings/get` | Same data as GXBookings, different view |
| SwitchBookingTime | ⚠️ | `GET /fitness/commission-portal/trainer/taken-slots` (view free slots) | No confirmed "reschedule" endpoint; would need `PUT /fitness/commission-portal/hr/sessions/{id}` |
| GXAttendance | ⚠️ | `GET /fitness/commission-portal/hr/sessions` + `POST .../trainer/mark` | Generic session/mark APIs, not GX-specific |
| GXAttendanceReport | ⚠️ | `GET /session-detail-report` or `/attendance/showSummery` | Generic report, filter for GX |
| BefitList | ⚠️ | `GET /clients/get` (filtered) | No "Befit"-specific endpoint |
| BefitBookings | ⚠️ | `GET /fitness/commission-portal/hr/sessions` | Generic sessions endpoint |
| BefitAppointments | ⚠️ | `GET /fitness/commission-portal/hr/sessions` | Same as above |
| BefitAttendance | ⚠️ | `POST /fitness/commission-portal/trainer/mark` or `/hr/sessions` | Generic |
| BefitAttendanceReport | ⚠️ | `GET /session-detail-report` | Generic, filter for Befit |
| SPTList | ⚠️ | `GET /clients/get?category=4` (Small Group PT) | |
| SPTBookings | ⚠️ | `GET /fitness/commission-portal/hr/sessions` | Generic |
| SPTAppointments | ⚠️ | `GET /fitness/commission-portal/hr/sessions` | Generic |
| SPTAttendance | ⚠️ | `POST /fitness/commission-portal/trainer/mark` or `/hr/sessions` | Generic |
| SPTAttendanceReport | ⚠️ | `GET /session-detail-report` | Generic, filter for SPT |
| AddGXSlots | ❌ | — | No GX slot-creation endpoint documented |
| AddGXClass | ❌ | — | No GX class/package creation endpoint documented |

---

## Summary

| Status | Sales | HR | Finance | Fitness | Total |
|---|---|---|---|---|---|
| ✅ Ready | 1 | 7 | 13 | 10 | **31** |
| ⚠️ Partial | 0 | 3 | 13 | 13 | **29** |
| ❌ Not ready | 0 | 3 | 0 | 2 | **5** |

**Next step:** send UI screenshots for any ✅ or ⚠️ screen (in priority order
of your choice) and it can be implemented + wired to the listed API(s),
following the same UI-first/mock-fallback pattern used for the recently
completed screens (`ViewCards`, `Categories`, `GymPackages`, etc.).
