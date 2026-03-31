# Payroll Tax Engine — Database Schema Reference

> **Database:** PostgreSQL 16
> **ORM:** Prisma 5
> **Schema file:** `backend/prisma/schema.prisma`

---

## Entity Relationship Overview

```
Organization ──< Company ──< Employee ──< W4Profile
                    │             └──< EmployeeDeduction
                    │
                    ├──< PayrollRun ──< PayStub ──< TaxLine
                    │         └──< PayrollApproval   └──< DeductionLine
                    │         └──< TaxLiability
                    │
                    ├──< CompanyState
                    ├──< Webhook ──< WebhookDelivery
                    └──< UserCompany >── User ──< ApiKey
                                               └──< AuditLog
```

---

## Enums

| Enum | Values |
|------|--------|
| `UserRole` | `SUPER_ADMIN`, `ADMIN`, `ACCOUNTANT`, `APPROVER`, `DEVELOPER`, `EMPLOYEE` |
| `EmployeeType` | `FTE`, `HOURLY`, `CONTRACTOR` |
| `PayFrequency` | `WEEKLY`, `BIWEEKLY`, `SEMIMONTHLY`, `MONTHLY` |
| `FilingStatus` | `SINGLE`, `MARRIED_FILING_JOINTLY`, `MARRIED_FILING_SEPARATELY`, `HEAD_OF_HOUSEHOLD`, `QUALIFYING_WIDOW` |
| `PayrollRunStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PROCESSING`, `COMPLETED`, `FAILED`, `VOIDED` |
| `TaxCodeType` | `FIT`, `SS_EMPLOYEE`, `SS_EMPLOYER`, `MEDICARE_EMPLOYEE`, `MEDICARE_EMPLOYER`, `ADDL_MEDICARE`, `FUTA`, `SIT`, `SUI_EMPLOYEE`, `SUI_EMPLOYER`, `SDI`, `LOCAL`, `CITY` |
| `LiabilityBucket` | `FEDERAL`, `FICA`, `FUTA`, `STATE`, `SUI`, `LOCAL` |
| `WebhookEvent` | `PAYROLL_RUN_CREATED`, `PAYROLL_RUN_APPROVED`, `PAYROLL_RUN_COMPLETED`, `PAYROLL_RUN_FAILED`, `EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED`, `TAX_FILING_SUBMITTED` |
| `WebhookStatus` | `PENDING`, `DELIVERED`, `FAILED`, `RETRYING` |

---

## Tables

### `Organization`
Top-level tenant. One organization can manage multiple companies.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | String | Legal organization name |
| `ein` | String UNIQUE | Employer Identification Number |
| `addressLine1` | String | |
| `addressLine2` | String? | |
| `city` | String | |
| `state` | String | Primary state (2-letter) |
| `zip` | String | |
| `phone` | String? | |
| `email` | String | |
| `website` | String? | |
| `fiscalYearStart` | Int | Month 1–12, default 1 (January) |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |
| `deletedAt` | DateTime? | Soft delete |

---

### `Company`
A legal employer entity under an Organization. All payroll is scoped to a Company.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organizationId` | UUID FK → Organization | |
| `name` | String | |
| `ein` | String UNIQUE | Federal EIN |
| `addressLine1` | String | |
| `city` | String | |
| `state` | String | Primary/domicile state |
| `zip` | String | |
| `email` | String | |
| `payFrequency` | PayFrequency | Default pay cadence |
| `nextPayDate` | DateTime? | Upcoming scheduled pay date |
| `deletedAt` | DateTime? | Soft delete |

---

### `CompanyState`
States where a company is registered to do business. Defines SUI rates and filing frequencies per state.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `companyId` | UUID FK → Company | |
| `state` | String | 2-letter state code |
| `suiAccountNumber` | String? | State unemployment account |
| `suiRate` | Decimal(8,6) | State unemployment insurance rate |
| `filingFrequency` | String | `MONTHLY`, `QUARTERLY`, or `ANNUAL` |
| `effectiveFrom` | DateTime | When this rate became effective |
| `effectiveTo` | DateTime? | End date (null = current) |
| **Unique** | | `(companyId, state)` |

---

### `User`
Platform user. Can belong to one Organization and multiple Companies with different roles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organizationId` | UUID FK? → Organization | Null for SUPER_ADMIN |
| `email` | String UNIQUE | |
| `passwordHash` | String | bcrypt hash |
| `firstName` | String | |
| `lastName` | String | |
| `role` | UserRole | Global role |
| `isActive` | Boolean | Soft disable |
| `lastLoginAt` | DateTime? | |

---

### `UserCompany`
Many-to-many between User and Company with a per-company role override.

| Column | Type | Notes |
|--------|------|-------|
| `userId` | UUID FK → User | Composite PK |
| `companyId` | UUID FK → Company | Composite PK |
| `role` | UserRole | Company-scoped role |

---

### `ApiKey`
API keys for Developer/Platform Integrator authentication.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organizationId` | UUID FK → Organization | |
| `userId` | UUID FK → User | Owner |
| `name` | String | Human label |
| `keyHash` | String UNIQUE | bcrypt hash of raw key |
| `keyPrefix` | String | First 8 chars, shown in UI (`pk_live_XXXXXXXX`) |
| `scopes` | String[] | Granted permission scopes |
| `isActive` | Boolean | |
| `lastUsedAt` | DateTime? | |
| `expiresAt` | DateTime? | Optional expiry |

**Authentication flow:** Pass raw key in `x-api-key` header. The strategy finds the record by prefix, then bcrypt-compares.

---

### `Employee`
Core employee record. All payroll processing is employee-scoped.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `companyId` | UUID FK → Company | Strict company scoping |
| `employeeNumber` | String | Unique within company |
| `firstName`, `lastName`, `middleName` | String | |
| `ssn` | String | AES-256 encrypted at rest |
| `dateOfBirth` | DateTime | |
| `hireDate` | DateTime | |
| `terminationDate` | DateTime? | |
| `email` | String | |
| `addressLine1/2`, `city`, `state`, `zip` | String | Home address |
| `employeeType` | EmployeeType | `FTE` or `HOURLY` |
| `annualSalary` | Decimal(14,2)? | FTE only |
| `payFrequency` | PayFrequency? | FTE override; defaults to company |
| `hourlyRate` | Decimal(10,4)? | HOURLY only |
| `defaultHours` | Decimal(6,2)? | Hours per pay period (HOURLY) |
| `overtimeEligible` | Boolean | HOURLY: eligible for OT |
| `residentState` | String | State of legal residence |
| `workState` | String | Primary work state |

**Validation rules enforced in service:**
- `FTE`: `annualSalary` required
- `HOURLY`: `hourlyRate` + `defaultHours` required

---

### `W4Profile`
Employee's federal withholding elections (IRS Form W-4, 2020+).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `employeeId` | UUID FK → Employee UNIQUE | One active W4 per employee |
| `taxYear` | Int | W4 version year |
| `filingStatus` | FilingStatus | Step 1c |
| `multipleJobs` | Boolean | Step 2c checkbox |
| `claimDependents` | Decimal(12,2) | Step 3 dollar amount |
| `otherIncome` | Decimal(12,2) | Step 4a |
| `deductionsAmount` | Decimal(12,2) | Step 4b |
| `additionalWithholding` | Decimal(10,2) | Step 4c |
| `exemptFromFIT` | Boolean | Exempt from federal income tax |
| `exemptFromFICA` | Boolean | Exempt from SS+Medicare (rare) |
| `stateFilingStatus` | String? | State-specific filing status |
| `stateAllowances` | Int | Pre-2020 state allowances |
| `stateAdditionalWH` | Decimal(10,2) | State extra withholding |

---

### `EmployeeDeduction`
Recurring pre/post-tax deductions per employee (401k, health, dental, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `employeeId` | UUID FK → Employee | |
| `code` | String | `401K`, `HEALTH`, `DENTAL`, `VISION`, `HSA`, `FSA`, `GARNISHMENT` |
| `amount` | Decimal(10,2)? | Fixed dollar amount per period |
| `percentage` | Decimal(6,4)? | % of gross (mutually exclusive with amount) |
| `preTax` | Boolean | Reduces FIT taxable wage if true |
| `employeeShare` | Decimal(4,3) | Fraction paid by employee (0–1) |
| `employerShare` | Decimal(4,3) | Fraction paid by employer |
| `effectiveFrom` | DateTime | |
| `effectiveTo` | DateTime? | |

---

### `PayrollRun`
A single payroll processing run for a company covering a pay period.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `companyId` | UUID FK → Company | |
| `periodStart` | DateTime | Pay period start |
| `periodEnd` | DateTime | Pay period end |
| `payDate` | DateTime | Actual disbursement date |
| `payFrequency` | PayFrequency | |
| `status` | PayrollRunStatus | State machine |
| `totalGross` | Decimal(14,2) | Sum of all employee gross pay |
| `totalNet` | Decimal(14,2) | Sum of all net pay |
| `totalTax` | Decimal(14,2) | Sum of all employee + employer taxes |
| `totalDeductions` | Decimal(14,2) | Sum of all deductions |
| `idempotencyKey` | String? UNIQUE | Client-supplied idempotency key |
| `processedAt` | DateTime? | When disbursement completed |

**Status flow:** `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `PROCESSING` → `COMPLETED` / `FAILED`

---

### `PayStub`
Per-employee earnings statement within a payroll run.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `payrollRunId` | UUID FK → PayrollRun | |
| `employeeId` | UUID FK → Employee | |
| `grossPay` | Decimal(14,2) | |
| `netPay` | Decimal(14,2) | grossPay − employeeTaxes − deductions |
| `regularPay` | Decimal(14,2) | |
| `overtimePay` | Decimal(14,2) | |
| `bonusPay` | Decimal(14,2) | |
| `totalEmployeeTax` | Decimal(14,2) | Sum of isEmployee TaxLines |
| `totalEmployerTax` | Decimal(14,2) | Sum of !isEmployee TaxLines |
| `totalDeductions` | Decimal(14,2) | |
| `ytdGross` | Decimal(14,2) | Year-to-date including this run |
| `ytdTax` | Decimal(14,2) | |
| `ytdNet` | Decimal(14,2) | |
| **Unique** | | `(payrollRunId, employeeId)` |

---

### `TaxLine`
Itemized tax computation result per employee per run. One row per tax code.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `payStubId` | UUID FK → PayStub | |
| `taxCode` | TaxCodeType | `FIT`, `SS_EMPLOYEE`, `MEDICARE_EMPLOYEE`, etc. |
| `taxYear` | Int | Calendar year |
| `description` | String | Human-readable label |
| `taxableWage` | Decimal(14,2) | Wage subject to this tax |
| `amount` | Decimal(14,2) | Tax amount |
| `isEmployee` | Boolean | true = employee-paid; false = employer-paid |
| `liabilityBucket` | LiabilityBucket | `FEDERAL`, `FICA`, `FUTA`, `STATE`, etc. |
| `state` | String? | 2-letter state code (SIT only) |
| `locality` | String? | Local jurisdiction code |

---

### `DeductionLine`
Snapshot of each deduction applied in a pay stub.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `payStubId` | UUID FK → PayStub | |
| `code` | String | Matches EmployeeDeduction.code |
| `description` | String | |
| `amount` | Decimal(14,2) | Employee's share this period |
| `preTax` | Boolean | |

---

### `TaxLiability`
Aggregated tax obligations per company per period. Generated when a run is approved.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `companyId` | UUID FK → Company | |
| `payrollRunId` | UUID FK? → PayrollRun | |
| `taxCode` | TaxCodeType | |
| `taxYear` | Int | |
| `period` | String | `"2024-Q1"`, `"2024-01"` |
| `state` | String? | |
| `locality` | String? | |
| `amount` | Decimal(14,2) | Total liability |
| `liabilityBucket` | LiabilityBucket | |
| `dueDate` | DateTime? | IRS/state deposit due date |
| `paidAt` | DateTime? | When remitted |
| `filingStatus` | FilingStatus2290 | `PENDING`, `SUBMITTED`, `ACCEPTED`, `REJECTED` |
| **Unique** | | `(companyId, payrollRunId, taxCode, state, locality)` |

---

### `PayrollApproval`
Approval audit trail for each payroll run.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `payrollRunId` | UUID FK → PayrollRun | |
| `approverId` | UUID FK → User | Must have APPROVER role |
| `status` | PayrollRunStatus | Decision recorded |
| `notes` | String? | Approver comments |
| `approvedAt` | DateTime | |

---

### `StateReciprocityAgreement`
Lookup table for US state income tax reciprocity agreements.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `fromState` | String | Work state |
| `toState` | String | Resident state |
| `effectiveFrom` | DateTime | Agreement start date |
| `effectiveTo` | DateTime? | End date (null = still active) |
| `notes` | String? | Reference/source |

**Decision rule:** If `hasReciprocity(workState, residentState)` is true, withhold SIT for **resident state only** and skip work state SIT.

**Known reciprocity pairs (as of 2024):**

| States |
|--------|
| MD ↔ DC, VA, WV, PA |
| NJ ↔ PA |
| WI ↔ IL, IN, KY, MI |
| OH ↔ IN, KY, MI, PA, WV |
| KY ↔ IL, IN, MI, OH, VA, WV, WI |
| VA ↔ DC, KY, MD, PA, WV |
| MI ↔ IL, IN, KY, MN, OH, WI |
| IN ↔ KY, MI, OH, PA, WI |

---

### `StateTaxConfig`
State income tax bracket data and rates per year (supports 5-year lookback).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `state` | String | 2-letter code |
| `taxYear` | Int | |
| `standardDeduction` | Decimal(12,2) | |
| `personalExemption` | Decimal(12,2) | Per allowance |
| `brackets` | Json | `[{ min, max, rate }]` annualized |
| `supplementalRate` | Decimal(6,4) | Flat rate for bonuses |
| `suiWageBase` | Decimal(12,2) | State SUI taxable wage ceiling |
| `sdiRate` | Decimal(6,4)? | State disability insurance rate |
| `hasSIT` | Boolean | False for TX, FL, NV, WA, WY, SD, AK |
| **Unique** | | `(state, taxYear)` |

---

### `FederalTaxConfig`
IRS tax parameters per year (Publication 15 / 15-T).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `taxYear` | Int UNIQUE | |
| `ssWageBase` | Decimal(12,2) | SS taxable wage ceiling |
| `ssRate` | Decimal(6,4) | 0.062 (each side) |
| `medicareRate` | Decimal(6,4) | 0.0145 (each side) |
| `additionalMedicareRate` | Decimal(6,4) | 0.009 (employee only) |
| `additionalMedicareThreshold` | Decimal(12,2) | $200,000 |
| `futaRate` | Decimal(6,4) | Net rate (0.006 after credit) |
| `futaWageBase` | Decimal(12,2) | $7,000 |
| `futaCreditReduction` | Decimal(6,4) | Credit reduction for non-compliant states |
| `standardDeductionSingle` | Decimal(12,2) | |
| `standardDeductionMFJ` | Decimal(12,2) | |
| `standardDeductionHOH` | Decimal(12,2) | |
| `brackets` | Json | Per filing status: `{ SINGLE: [...], MARRIED_FILING_JOINTLY: [...], HEAD_OF_HOUSEHOLD: [...] }` |
| `supplementalRate` | Decimal(6,4) | 0.22 flat for bonuses/commissions |

**Historical data loaded for tax years 2020–2024.**

---

### `Webhook`
Configured endpoint for real-time event delivery.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `companyId` | UUID FK → Company | |
| `url` | String | HTTPS endpoint |
| `events` | WebhookEvent[] | Subscribed events |
| `secret` | String | HMAC signing key (stored, not hashed) |
| `isActive` | Boolean | |

---

### `WebhookDelivery`
Delivery attempt log for each webhook event.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `webhookId` | UUID FK → Webhook | |
| `event` | WebhookEvent | |
| `payload` | Json | Full event payload |
| `idempotencyKey` | String UNIQUE | Prevents duplicate delivery |
| `status` | WebhookStatus | `PENDING` → `DELIVERED` / `FAILED` |
| `attempts` | Int | Retry count |
| `responseCode` | Int? | HTTP response from endpoint |
| `nextRetryAt` | DateTime? | Exponential backoff schedule |

---

### `AuditLog`
Immutable audit trail for all create/update/delete actions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `userId` | UUID FK? → User | Actor (null = system) |
| `action` | String | `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `VOID` |
| `resource` | String | Entity name |
| `resourceId` | String? | Entity ID |
| `oldValue` | Json? | Before state |
| `newValue` | Json? | After state |
| `ipAddress` | String? | |
| `userAgent` | String? | |
| `createdAt` | DateTime | Immutable timestamp |

---

## Tax Calculation Data Flow

```
PayrollRun.calculateRun()
  │
  ├─ for each Employee:
  │    ├─ Load W4Profile, EmployeeDeduction[], YTD aggregates
  │    ├─ Compute grossPay
  │    │    FTE:    annualSalary / payPeriodsPerYear
  │    │    HOURLY: hourlyRate × defaultHours (+ OT if applicable)
  │    │
  │    ├─ Compute preTaxDeductions (sum of preTax EmployeeDeductions)
  │    │
  │    ├─ TaxEngine.calculate(TaxEngineInput)
  │    │    ├─ FederalCalculator
  │    │    │    ├─ FIT  (IRS Pub 15-T percentage method)
  │    │    │    ├─ SS Employee + Employer (wage base capped)
  │    │    │    ├─ Medicare Employee + Employer (uncapped)
  │    │    │    ├─ Additional Medicare 0.9% (>$200k YTD threshold)
  │    │    │    └─ FUTA Employer ($7,000 wage base)
  │    │    │
  │    │    └─ StateCalculator
  │    │         ├─ ReciprocityService.hasReciprocity(workState, residentState)
  │    │         ├─ if reciprocity → withhold for residentState only
  │    │         ├─ else → withhold for both states
  │    │         └─ for each applicable state:
  │    │              annualize → deduction → brackets → de-annualize
  │    │
  │    ├─ Upsert PayStub
  │    ├─ Upsert TaxLine[] (one per tax code)
  │    ├─ Upsert DeductionLine[]
  │    └─ netPay = gross − employeeTaxes − deductions
  │
  └─ Aggregate TaxLiability rows by (companyId, period, taxCode, state)
```

---

## Indexing Strategy

Key indexes to add via Prisma migrations for production:

```sql
-- Company scoping (most common filter)
CREATE INDEX idx_employee_company ON "Employee"("companyId");
CREATE INDEX idx_payroll_run_company ON "PayrollRun"("companyId", "status");
CREATE INDEX idx_tax_line_paystub ON "TaxLine"("payStubId");
CREATE INDEX idx_tax_liability_company_period ON "TaxLiability"("companyId", "taxYear", "period");
CREATE INDEX idx_webhook_delivery_status ON "WebhookDelivery"("status", "nextRetryAt");
CREATE INDEX idx_audit_log_resource ON "AuditLog"("resource", "resourceId");
CREATE INDEX idx_api_key_prefix ON "ApiKey"("keyPrefix") WHERE "isActive" = true;
```
