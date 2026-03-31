// ─── Enums ────────────────────────────────────────────────────────────────────

export enum EmployeeType {
  FTE = 'FTE',
  HOURLY = 'HOURLY',
  CONTRACTOR = 'CONTRACTOR',
}

export enum PayFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  SEMIMONTHLY = 'SEMIMONTHLY',
  MONTHLY = 'MONTHLY',
}

export enum FilingStatus {
  SINGLE = 'SINGLE',
  MARRIED_FILING_JOINTLY = 'MARRIED_FILING_JOINTLY',
  MARRIED_FILING_SEPARATELY = 'MARRIED_FILING_SEPARATELY',
  HEAD_OF_HOUSEHOLD = 'HEAD_OF_HOUSEHOLD',
  QUALIFYING_WIDOW = 'QUALIFYING_WIDOW',
}

export enum PayrollRunStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum DeductionType {
  PRE_TAX_401K = 'PRE_TAX_401K',
  POST_TAX_ROTH = 'POST_TAX_ROTH',
  HEALTH_INSURANCE = 'HEALTH_INSURANCE',
  DENTAL = 'DENTAL',
  VISION = 'VISION',
  FSA = 'FSA',
  HSA = 'HSA',
  GARNISHMENT = 'GARNISHMENT',
  OTHER_PRE_TAX = 'OTHER_PRE_TAX',
  OTHER_POST_TAX = 'OTHER_POST_TAX',
}

export enum TaxBucket {
  FEDERAL = 'FEDERAL',
  FICA = 'FICA',
  FUTA = 'FUTA',
  STATE = 'STATE',
  SUI = 'SUI',
  LOCAL = 'LOCAL',
}

export enum WebhookEvent {
  PAYROLL_RUN_CREATED = 'payroll.run.created',
  PAYROLL_RUN_APPROVED = 'payroll.run.approved',
  PAYROLL_RUN_COMPLETED = 'payroll.run.completed',
  PAYROLL_RUN_FAILED = 'payroll.run.failed',
  EMPLOYEE_CREATED = 'employee.created',
  EMPLOYEE_UPDATED = 'employee.updated',
  TAX_LIABILITY_DUE = 'tax.liability.due',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  APPROVER = 'APPROVER',
  ACCOUNTANT = 'ACCOUNTANT',
  DEVELOPER = 'DEVELOPER',
  EMPLOYEE = 'EMPLOYEE',
  PLATFORM_INTEGRATOR = 'PLATFORM_INTEGRATOR',
}

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ein: string;
  address: Address;
  contactEmail: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Company {
  id: string;
  organizationId: string;
  name: string;
  ein: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email: string;
  payFrequency: PayFrequency;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyState {
  id: string;
  companyId: string;
  state: string;
  stateEin?: string;
  suiRate?: number;
  localTaxCodes?: string[];
  isActive: boolean;
  createdAt: string;
}

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  companyId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  ssn?: string; // masked: ***-**-1234
  dateOfBirth?: string;
  hireDate: string;
  terminationDate?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  employeeType: EmployeeType;
  annualSalary?: number;
  hourlyRate?: number;
  defaultHours?: number;
  overtimeEligible?: boolean;
  payFrequency?: PayFrequency;
  residentState: string;
  workState: string;
  w4Profile?: W4Profile;
  deductions?: EmployeeDeduction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface W4Profile {
  id: string;
  employeeId: string;
  taxYear: number;
  filingStatus: FilingStatus;
  multipleJobs: boolean;
  claimDependents: number;
  otherIncome: number;
  deductionsAmount: number;
  additionalWithholding: number;
  exemptFromFIT: boolean;
  exemptFromFICA: boolean;
  stateFilingStatus?: string;
  stateAllowances: number;
  stateAdditionalWH: number;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDeduction {
  id: string;
  employeeId: string;
  type: DeductionType;
  description?: string;
  amount?: number;
  percentage?: number;
  isPercentage: boolean;
  maxAnnual?: number;
  isActive: boolean;
  effectiveDate: string;
  endDate?: string;
  createdAt: string;
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface PayrollRun {
  id: string;
  companyId: string;
  company?: Company;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  payFrequency: PayFrequency;
  status: PayrollRunStatus;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalDeductions: number;
  notes?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  payStubs?: PayStub[];
  approvals?: PayrollApproval[];
  _count?: { payStubs: number };
}

export interface PayrollApproval {
  id: string;
  payrollRunId: string;
  approverId: string;
  status: PayrollRunStatus;
  notes?: string;
  approvedAt: string;
  approver?: { id: string; firstName: string; lastName: string; email: string };
}

export interface PayStub {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employee?: Employee;
  grossPay: number;
  regularPay: number;
  overtimePay: number;
  netPay: number;
  totalEmployeeTax: number;
  totalDeductions: number;
  ytdGross: number;
  ytdTax: number;
  ytdNet: number;
  taxLines: TaxLine[];
  deductionLines: DeductionLine[];
  createdAt: string;
}

export interface TaxLine {
  id: string;
  payStubId: string;
  taxCode: string;
  description: string;
  taxableWage: number;
  amount: number;
  isEmployee: boolean;
  liabilityBucket: string;
  state?: string;
  locality?: string;
}

export interface DeductionLine {
  id: string;
  payStubId: string;
  code: string;
  description: string;
  amount: number;
  preTax: boolean;
}

// ─── Tax Liability ────────────────────────────────────────────────────────────

export interface TaxLiability {
  id: string;
  companyId: string;
  payrollRunId?: string;
  jurisdiction: string;   // derived: state code, 'Federal', 'FICA', etc.
  taxCode: string;
  description: string;
  bucket: TaxBucket;
  amount: number;
  dueDate?: string;
  isPaid: boolean;
  paidAt?: string;
  period: string;
  createdAt: string;
}

export interface TaxLiabilitySummary {
  bucket: TaxBucket;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  liabilities: TaxLiability[];
}

// ─── Developer / API Keys ─────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  environment: 'live' | 'test';
  allowedIps: string[];
  requestCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export type ApiKeyScope =
  | 'payroll:read'
  | 'payroll:write'
  | 'employees:read'
  | 'employees:write'
  | 'reporting:read'
  | 'webhooks:manage'
  | 'admin';

export interface ApiKeyCreatedResponse {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  environment: 'live' | 'test';
  expiresAt?: string;
  createdAt: string;
  rawKey: string; // shown only once
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export interface Webhook {
  id: string;
  organizationId: string;
  url: string;
  description?: string;
  events: WebhookEvent[];
  secret: string; // masked
  isActive: boolean;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: 'success' | 'failed';
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: string;
  duration?: number;
  success: boolean;
  attemptedAt: string;
}

// ─── User / Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateEmployeeDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  ssn: string;
  dateOfBirth: string;
  hireDate: string;
  email: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  employeeType?: EmployeeType;
  annualSalary?: number;
  payFrequency?: PayFrequency;
  hourlyRate?: number;
  defaultHours?: number;
  overtimeEligible?: boolean;
  residentState: string;
  workState: string;
}

export interface UpdateW4Dto {
  taxYear?: number;
  filingStatus: FilingStatus;
  multipleJobs: boolean;
  claimDependents: number;
  otherIncome: number;
  deductionsAmount: number;
  additionalWithholding: number;
  exemptFromFIT: boolean;
}

export interface CreateDeductionDto {
  type: DeductionType;
  description?: string;
  amount?: number;
  percentage?: number;
  isPercentage: boolean;
  maxAnnual?: number;
  effectiveDate: string;
  endDate?: string;
}

export interface CreatePayrollRunDto {
  companyId: string; // used for URL path only, not sent in body
  periodStart: string;
  periodEnd: string;
  payDate: string;
  payFrequency: PayFrequency;
  idempotencyKey?: string;
}

export interface ApprovePayrollRunDto {
  notes?: string;
}

export interface CreateCompanyDto {
  organizationId: string;
  name: string;
  ein: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email: string;
  payFrequency?: PayFrequency;
  nextPayDate?: string;
}

export interface CreateCompanyStateDto {
  state: string;
  stateEin?: string;
  suiRate?: number;
  localTaxCodes?: string[];
}

export interface CreateApiKeyDto {
  name: string;
  description?: string;
  scopes: ApiKeyScope[];
  environment?: 'live' | 'test';
  allowedIps?: string[];
  expiresAt?: string;
}

export interface CreateWebhookDto {
  url: string;
  description?: string;
  events: WebhookEvent[];
}

// ─── Response Envelopes ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: Record<string, string[]>;
}

// ─── Dashboard / KPI ─────────────────────────────────────────────────────────

export interface DashboardKpi {
  totalPayrollThisMonth: number;
  totalEmployees: number;
  totalTaxesWithheld: number;
  pendingApprovals: number;
  payrollChange: number;
  employeeChange: number;
  taxChange: number;
}

export interface PayrollChartData {
  period: string;
  gross: number;
  net: number;
  taxes: number;
}

export interface TaxBreakdownData {
  name: string;
  value: number;
  color: string;
}

// ─── Reporting ────────────────────────────────────────────────────────────────

export interface PayrollRegisterRow {
  employeeName: string;
  employeeId: string;
  period: string;
  regularHours?: number;
  overtimeHours?: number;
  grossPay: number;
  federalIncomeTax: number;
  socialSecurity: number;
  medicare: number;
  stateTax: number;
  totalDeductions: number;
  netPay: number;
}

export interface YtdSummaryRow {
  employeeId: string;
  employeeName: string;
  ytdGross: number;
  ytdFit: number;
  ytdSocialSecurity: number;
  ytdMedicare: number;
  ytdStateTax: number;
  ytdDeductions: number;
  ytdNet: number;
}

export interface ReportFilters {
  companyId?: string;
  year?: number;
  quarter?: number;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  state?: string;
}
