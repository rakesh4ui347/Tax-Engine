export type PayFrequencyType = 'WEEKLY' | 'BIWEEKLY' | 'SEMIMONTHLY' | 'MONTHLY';

export const PAY_PERIODS_PER_YEAR: Record<PayFrequencyType, number> = {
  WEEKLY: 52,
  BIWEEKLY: 26,
  SEMIMONTHLY: 24,
  MONTHLY: 12,
};

export interface W4Input {
  filingStatus: string; // FilingStatus enum value
  multipleJobs: boolean;
  claimDependents: number;   // Step 3 dollar amount
  otherIncome: number;       // Step 4a
  deductionsAmount: number;  // Step 4b
  additionalWithholding: number; // Step 4c
  exemptFromFIT: boolean;
  exemptFromFICA: boolean;
  stateFilingStatus?: string;
  stateAllowances?: number;
  stateAdditionalWH?: number;
}

export interface TaxEngineInput {
  employeeId: string;
  companyId: string;
  taxYear: number;
  payFrequency: PayFrequencyType;
  grossPay: number;
  regularPay: number;
  overtimePay: number;
  bonusPay: number;
  preTaxDeductions: number;
  residentState: string;
  workState: string;
  locality?: string;   // e.g. 'NYC' for New York City, municipality code for PA Act 32
  ytdWages: number;
  ytdSS: number;
  ytdMedicare: number;
  ytdFUTA: number;
  ytdStateWages: Record<string, number>;
  ytdStateTax: Record<string, number>;
  w4: W4Input;
  federalConfig: any;
  stateConfig?: any;
  workStateConfig?: any;
}

export interface TaxLine {
  taxCode: string;
  taxYear: number;
  description: string;
  taxableWage: number;
  amount: number;
  isEmployee: boolean;
  liabilityBucket: string;
  state?: string;
  locality?: string;
}

export interface TaxEngineOutput {
  taxLines: TaxLine[];
  totalEmployeeTax: number;
  totalEmployerTax: number;
  taxableWagesByCode: Record<string, number>;
}
