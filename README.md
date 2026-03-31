# Payroll Tax Engine

A production-grade, multi-tenant US payroll and tax processing platform built for embedding into other platforms via REST API and React UI components.

## Feature Overview

| Capability | Detail |
|-----------|--------|
| **Multi-tenant** | Organization → Company → Employee hierarchy |
| **Tax Engine** | Federal (FIT, FICA, FUTA) + all 50 states + local jurisdictions |
| **Historical** | Tax calculation support for 2020–2024 (5-year lookback) |
| **Gross-to-Net** | FTE (salary) + Hourly + Overtime calculation |
| **W-4 Support** | 2020+ IRS W-4 form (Steps 1–4) with all filing statuses |
| **RBAC** | Super Admin, Admin, Accountant, Approver, Developer, Employee |
| **Approval Workflow** | Payroll runs require APPROVER sign-off before processing |
| **Temporal Workflows** | Long-running payroll orchestration via Temporal |
| **API Auth** | JWT Bearer + API Key (`x-api-key`) for partner integrations |
| **Webhooks** | Real-time event delivery with HMAC-SHA256 signing + idempotency |
| **Idempotency** | Client-supplied keys prevent duplicate payroll runs |
| **Atomic Writes** | All multi-model payroll writes wrapped in Prisma transactions |
| **Swagger** | Interactive API docs at `/api/v1/docs` |
| **Embeddable UI** | React components + iFrame-ready pay stub viewer |
| **Reporting** | Payroll register, tax liability summary, YTD CSV export |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Partner Platforms                    │
│         (embed via API Key + React components)           │
└────────────────────┬────────────────────────────────────┘
                     │ REST API / Webhooks
┌────────────────────▼────────────────────────────────────┐
│                  NestJS Backend (port 3000)              │
│                                                          │
│  Auth ── Companies ── Employees ── Payroll ── Reporting  │
│                          │                               │
│                    Tax Engine                            │
│              ┌───────────┴──────────┐                   │
│         Federal Calc          State Calc                 │
│         (FIT/FICA/FUTA)   (SIT + Reciprocity)           │
│                                                          │
│  Webhooks ── Temporal Client ── Audit Log                │
└──────┬───────────────────────────────────────────────────┘
       │
┌──────▼───────┐  ┌────────────────┐  ┌──────────────────┐
│  PostgreSQL  │  │     Redis      │  │  Temporal Server  │
│  (Prisma)    │  │  (idempotency) │  │  (workflows)      │
└──────────────┘  └────────────────┘  └──────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Next.js Frontend (port 3001)                │
│   Dashboard │ Payroll │ Employees │ Reporting │ Dev Portal│
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
payroll-tax-engine/
├── backend/                          # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma             # Full DB schema (27 models)
│   │   └── seed.ts                   # Seed: federal config, state config, reciprocity
│   ├── src/
│   │   ├── main.ts                   # Bootstrap + Swagger setup
│   │   ├── app.module.ts             # Root module
│   │   ├── prisma/                   # PrismaService
│   │   ├── auth/                     # JWT + API Key strategies, guards, decorators
│   │   ├── users/                    # User CRUD
│   │   ├── organizations/            # Org management
│   │   ├── companies/                # Company + CompanyState management
│   │   ├── employees/                # Employee profiles, W4, deductions
│   │   ├── tax-engine/
│   │   │   ├── types.ts              # TaxEngineInput / TaxEngineOutput DTOs
│   │   │   ├── federal-calculator.ts # FIT, SS, Medicare, FUTA
│   │   │   ├── state-calculator.ts   # SIT for all 50 states + SDI/SUI
│   │   │   ├── reciprocity.service.ts# State reciprocity agreement lookup
│   │   │   └── tax-engine.service.ts # Orchestrator
│   │   ├── payroll/                  # Run lifecycle: create → calculate → approve → process
│   │   ├── reporting/                # Register, liability summary, YTD, CSV export
│   │   ├── webhooks/                 # Webhook CRUD + delivery with retry
│   │   ├── temporal/
│   │   │   ├── temporal.module.ts
│   │   │   ├── temporal.service.ts   # Temporal client wrapper
│   │   │   ├── worker.ts             # Standalone Temporal worker process
│   │   │   ├── workflows/
│   │   │   │   └── payroll.workflow.ts
│   │   │   └── activities/
│   │   │       └── payroll.activities.ts
│   │   └── audit/                    # Immutable audit log
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── package.json
│
├── frontend/                         # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/         # Login page
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx          # Dashboard with KPIs + charts
│   │   │   │   ├── payroll/          # Run list, new run, run detail, approve
│   │   │   │   ├── employees/        # List, create, profile, W4, deductions
│   │   │   │   ├── companies/        # List, create, detail, state config
│   │   │   │   ├── reporting/        # Register, tax liability, YTD export
│   │   │   │   └── developer/        # API keys, webhooks, quickstart
│   │   │   └── embed/
│   │   │       └── pay-stub/[id]/    # iFrame-ready pay stub viewer
│   │   ├── components/
│   │   │   ├── ui/                   # Button, Input, Card, Modal, Badge, Table, etc.
│   │   │   ├── layout/               # Sidebar, Header, Providers
│   │   │   ├── dashboard/            # KpiCard, PayrollChart, TaxLiabilityChart
│   │   │   ├── payroll/              # RunCard, PayStubTable, TaxBreakdown
│   │   │   ├── employees/            # EmployeeForm, W4Form, DeductionForm
│   │   │   ├── companies/            # CompanyForm
│   │   │   ├── reporting/            # ReportFilters, DataTable
│   │   │   ├── developer/            # ApiKeyManager, WebhookConfig
│   │   │   └── embed/
│   │   │       ├── PayrollWidget.tsx # Embeddable payroll summary widget
│   │   │       └── EmployeePayStub.tsx # Embeddable pay stub component
│   │   ├── hooks/                    # usePayroll, useEmployees, useReporting, useAuth
│   │   ├── lib/                      # api.ts (axios), auth.ts (next-auth), utils.ts
│   │   └── types/                    # api.ts, auth.ts type definitions
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml                # Full dev stack
├── schema.md                         # DB schema reference
└── README.md                         # This file
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| npm | 9+ |
| PostgreSQL | 16+ |
| Redis | 7+ |
| Docker + Docker Compose | 24+ (optional but recommended) |
| Temporal | 1.24+ (optional — graceful fallback if unavailable) |

---

## Quick Start (Docker — Recommended)

### 1. Clone and configure

```bash
git clone <repo-url> payroll-tax-engine
cd payroll-tax-engine
```

Copy and edit the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/payroll_tax_engine
JWT_SECRET=use-a-long-random-string-here
JWT_EXPIRES_IN=24h
REDIS_HOST=localhost
REDIS_PORT=6379
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=payroll-engine
WEBHOOK_SIGNING_SECRET=use-another-random-string
PORT=3000
NODE_ENV=development
```

Copy and edit the frontend environment file:

```bash
cp frontend/.env.local.example frontend/.env.local
```

Edit `frontend/.env.local`:

```env
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=use-yet-another-random-string
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 2. Start infrastructure services

```bash
# Start PostgreSQL, Redis, Temporal
docker-compose up -d postgres redis temporal temporal-ui
```

Wait ~15 seconds for Temporal to initialize.

### 3. Run database migrations and seed

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
```

The seed creates:
- Federal tax configs for 2020–2024
- State tax configs for all 50 states
- State reciprocity agreements (~30 pairs)
- Demo organization, company, and admin user (`admin@demo.com` / `Admin@123`)

### 4. Start the backend

```bash
# From backend/
npm run start:dev
```

API available at: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api/v1/docs`

### 5. Start the Temporal worker (optional)

In a separate terminal:

```bash
# From backend/
npx ts-node src/temporal/worker.ts
```

### 6. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend available at: `http://localhost:3001`

---

## Full Docker Deploy

```bash
# Build and start everything
docker-compose up --build

# Or detached
docker-compose up --build -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:3000/api/v1 |
| Swagger Docs | http://localhost:3000/api/v1/docs |
| Temporal UI | http://localhost:8080 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Manual Local Setup (without Docker)

### Backend

```bash
cd backend
npm install

# Set DATABASE_URL in .env to your local Postgres instance
npx prisma migrate dev --name init
npx prisma db seed

npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## API Authentication

### JWT (for dashboard users)

```bash
# Login
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "admin@demo.com", "password": "Admin@123" }

# Response: { "access_token": "eyJ..." }

# Use token
GET /api/v1/companies
Authorization: Bearer eyJ...
```

### API Key (for partner integrations)

```bash
# Create an API key via dashboard → Developer → API Keys
# Or via API:
POST /api/v1/auth/api-keys
Authorization: Bearer eyJ...

{ "name": "My Integration", "scopes": ["payroll:read", "employees:read"] }

# Response: { "key": "pk_live_XXXXXXXX...", "prefix": "pk_live_XX" }
# IMPORTANT: The raw key is shown ONCE — store it immediately.

# Use the API key
GET /api/v1/companies
x-api-key: pk_live_XXXXXXXX...
```

---

## RBAC — Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| `SUPER_ADMIN` | All operations across all organizations |
| `ADMIN` | All operations within their organization |
| `ACCOUNTANT` | Create/edit payroll runs and employees; view reports |
| `APPROVER` | Approve payroll runs; read-only access otherwise |
| `DEVELOPER` | API key management; read-only access via API |
| `EMPLOYEE` | View own pay stubs only |

Roles are enforced via `@Roles()` decorator + `RolesGuard` on all endpoints.

---

## Tax Engine

### Federal Taxes

| Tax Code | Description | Rate | Wage Base |
|----------|-------------|------|-----------|
| `FIT` | Federal Income Tax | Progressive brackets (IRS Pub 15-T) | None |
| `SS_EMPLOYEE` | Social Security (employee) | 6.2% | $168,600 (2024) |
| `SS_EMPLOYER` | Social Security (employer) | 6.2% | $168,600 (2024) |
| `MEDICARE_EMPLOYEE` | Medicare (employee) | 1.45% | None |
| `MEDICARE_EMPLOYER` | Medicare (employer) | 1.45% | None |
| `ADDL_MEDICARE` | Additional Medicare (employee) | 0.9% | >$200,000 YTD |
| `FUTA` | Federal Unemployment (employer) | 0.6% net | $7,000 |

### FIT Calculation Method (IRS Publication 15-T, Percentage Method)

1. Annualize gross wages × pay periods per year
2. Add Step 4a other income (annualized)
3. Subtract standard deduction (halved if Multiple Jobs checkbox)
4. Subtract Step 4b extra deductions
5. Apply tax brackets for filing status → annual FIT
6. Subtract Step 3 credits (dollar amount)
7. De-annualize ÷ pay periods per year
8. Add Step 4c additional withholding per period

### State Reciprocity

When `residentState ≠ workState` and a reciprocity agreement exists:
- **With reciprocity:** Withhold SIT for resident state only
- **Without reciprocity:** Withhold SIT for both states

~30 reciprocity pairs are seeded covering all known US agreements.

### No-SIT States

The following states have no state income tax — SIT withholding is skipped:
`TX`, `FL`, `NV`, `WA`, `WY`, `SD`, `AK`, `NH`, `TN`

### Supported Tax Years

2020, 2021, 2022, 2023, 2024 — with real IRS bracket and wage base data seeded.

---

## Payroll Run Lifecycle

```
1. POST /companies/{id}/payroll/runs          → status: DRAFT
2. POST /payroll/runs/{id}/calculate          → status: PROCESSING (tax engine runs)
3. POST /payroll/runs/{id}/submit             → status: PENDING_APPROVAL
4. POST /payroll/runs/{id}/approve            → status: APPROVED (APPROVER role required)
5. POST /payroll/runs/{id}/process            → status: COMPLETED (via Temporal workflow)
```

All writes in step 2 are wrapped in a single `prisma.$transaction()` call ensuring atomicity.

---

## Key API Endpoints

### Companies
```
GET    /api/v1/companies
POST   /api/v1/companies
GET    /api/v1/companies/:id
PATCH  /api/v1/companies/:id
POST   /api/v1/companies/:id/states         # Add registered state
```

### Employees
```
GET    /api/v1/companies/:companyId/employees
POST   /api/v1/companies/:companyId/employees
GET    /api/v1/companies/:companyId/employees/:id
PATCH  /api/v1/companies/:companyId/employees/:id
POST   /api/v1/companies/:companyId/employees/:id/w4
POST   /api/v1/companies/:companyId/employees/:id/deductions
```

### Payroll
```
GET    /api/v1/companies/:companyId/payroll/runs
POST   /api/v1/companies/:companyId/payroll/runs
GET    /api/v1/companies/:companyId/payroll/runs/:id
POST   /api/v1/companies/:companyId/payroll/runs/:id/calculate
POST   /api/v1/companies/:companyId/payroll/runs/:id/approve
POST   /api/v1/companies/:companyId/payroll/runs/:id/void
GET    /api/v1/companies/:companyId/payroll/runs/:id/paystubs
```

### Reporting
```
GET    /api/v1/reporting/:companyId/register?runId=...
GET    /api/v1/reporting/:companyId/tax-liability?year=2024&quarter=1
GET    /api/v1/reporting/:companyId/ytd?employeeId=...&year=2024
GET    /api/v1/reporting/:companyId/register/export-csv?runId=...
```

### Webhooks
```
GET    /api/v1/companies/:companyId/webhooks
POST   /api/v1/companies/:companyId/webhooks
DELETE /api/v1/companies/:companyId/webhooks/:id
```

### API Keys
```
POST   /api/v1/auth/api-keys
GET    /api/v1/auth/api-keys
DELETE /api/v1/auth/api-keys/:id
```

---

## Webhook Integration

### Event payload structure

```json
{
  "event": "PAYROLL_RUN_COMPLETED",
  "timestamp": "2024-01-19T20:00:00Z",
  "data": {
    "payrollRunId": "uuid",
    "companyId": "uuid",
    "status": "COMPLETED",
    "totalGross": 125000.00,
    "totalNet": 94200.00
  }
}
```

### Signature verification

```typescript
import crypto from 'crypto';

app.post('/webhooks/payroll', (req, res) => {
  const sig = req.headers['x-payroll-signature'];
  const computed = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (sig !== computed) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process event...
  res.sendStatus(200);
});
```

### Retry policy

Failed deliveries are retried with exponential backoff:
- Attempt 1: immediate
- Attempt 2: 5 minutes
- Attempt 3: 30 minutes
- After 3 failures: status set to `FAILED`

---

## Embedding in Partner Platforms

### 1. iFrame — Pay Stub Viewer

```html
<iframe
  src="https://payroll.yourplatform.com/embed/pay-stub/{payStubId}?apiKey=pk_live_xxx&theme=light&company=Acme+Corp"
  width="700"
  height="600"
  frameborder="0"
  style="border-radius: 12px;"
/>
```

### 2. React Component — Payroll Widget

```tsx
import { PayrollWidget } from '@payroll-engine/embed';

<PayrollWidget
  companyId="your-company-id"
  apiKey="pk_live_your_key"
  apiBaseUrl="https://api.yourplatform.com/api/v1"
  theme="light"
  onRunClick={(runId) => router.push(`/payroll/${runId}`)}
/>
```

### 3. React Component — Employee Pay Stub

```tsx
import { EmployeePayStub } from '@payroll-engine/embed';

<EmployeePayStub
  payStubId="stub-uuid"
  apiKey="pk_live_your_key"
  theme="dark"
  companyName="Acme Corp"
/>
```

---

## Reporting

### Payroll Register

Returns a flat list of all employee earnings for a run, suitable for accounting reconciliation.

```
GET /api/v1/reporting/{companyId}/register?runId={runId}
```

### Tax Liability Summary

Returns aggregated tax obligations by jurisdiction and period.

```
GET /api/v1/reporting/{companyId}/tax-liability?year=2024&quarter=1
```

### YTD Export

Returns year-to-date earnings, taxes, and deductions for an employee.

```
GET /api/v1/reporting/{companyId}/ytd?employeeId={id}&year=2024
```

### CSV Export

```
GET /api/v1/reporting/{companyId}/register/export-csv?runId={runId}
```

Returns `Content-Type: text/csv` with `Content-Disposition: attachment`.

---

## Development Commands

### Backend

```bash
npm run start:dev          # Development with hot reload
npm run build              # Production build
npm run start              # Run production build
npm run prisma:generate    # Regenerate Prisma client
npm run prisma:migrate     # Run pending migrations
npm run prisma:seed        # Seed lookup tables
npx prisma studio          # Visual DB browser at localhost:5555
```

### Frontend

```bash
npm run dev                # Development server (port 3001)
npm run build              # Production build
npm run start              # Run production build
npm run type-check         # TypeScript type checking
npm run lint               # ESLint
```

### Database

```bash
# Reset DB (destructive — dev only)
npx prisma migrate reset

# View/edit data in browser
npx prisma studio

# Generate migration from schema changes
npx prisma migrate dev --name <migration-name>
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (32+ chars) |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `24h`) |
| `REDIS_HOST` | No | Redis host (default: `localhost`) |
| `REDIS_PORT` | No | Redis port (default: `6379`) |
| `TEMPORAL_ADDRESS` | No | Temporal gRPC address (skip to disable) |
| `TEMPORAL_NAMESPACE` | No | Temporal namespace (default: `payroll-engine`) |
| `WEBHOOK_SIGNING_SECRET` | Yes | HMAC secret for webhook signatures |
| `PORT` | No | HTTP port (default: `3000`) |
| `NODE_ENV` | No | `development` or `production` |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | Full URL of frontend app |
| `NEXTAUTH_SECRET` | Yes | NextAuth signing secret |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_APP_URL` | No | Frontend app URL |

---

## Production Deployment Checklist

- [ ] Rotate all secrets (`JWT_SECRET`, `NEXTAUTH_SECRET`, `WEBHOOK_SIGNING_SECRET`)
- [ ] Set `NODE_ENV=production`
- [ ] Use a managed PostgreSQL instance (AWS RDS, Supabase, Neon)
- [ ] Use a managed Redis instance (AWS ElastiCache, Upstash)
- [ ] Deploy Temporal with a persistent backend (PostgreSQL or Cassandra)
- [ ] Configure `ALLOWED_ORIGINS` in backend for CORS
- [ ] Enable HTTPS (TLS termination at load balancer)
- [ ] Set up database connection pooling (PgBouncer or Prisma Accelerate)
- [ ] Configure log aggregation (CloudWatch, Datadog, etc.)
- [ ] Set `output: 'standalone'` in `next.config.ts` for minimal Docker image
- [ ] Set up backup strategy for PostgreSQL (`pg_dump` or managed snapshots)
- [ ] Enable SSN encryption key rotation policy

---

## Compliance Notes

- **SSN storage:** Social Security Numbers are AES-256 encrypted at rest. The encryption key must be stored in a secrets manager (AWS Secrets Manager, HashiCorp Vault) — never in code or `.env` in production.
- **Audit trail:** All create/update/delete/approve actions are recorded in `AuditLog` with old/new values, actor, IP, and timestamp. This log is append-only.
- **Data retention:** Payroll records must be retained for at least 4 years per IRS requirements. Do not implement automatic deletion of `PayrollRun`, `PayStub`, or `TaxLine` records.
- **Tax accuracy:** Federal bracket data is seeded from IRS Publication 15-T. State data is sourced from state revenue departments. Always validate against current-year publications before production use.
- **FUTA credit reduction:** Some states lose their FUTA credit in years when they carry unemployment insurance debt. Update `FederalTaxConfig.futaCreditReduction` annually if your state is on the DOL credit reduction list.


Install backend deps: cd backend && npm install
Install frontend deps: cd frontend && npm install
Run DB migrations: cd backend && npx prisma migrate dev
Start backend: cd backend && npm run start:dev (port 3000)
Start frontend: cd frontend && npm run dev (port 3001)
---

## License

MIT
