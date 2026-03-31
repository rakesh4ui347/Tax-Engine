import Decimal from 'decimal.js';
import { TaxEngineInput, TaxLine, PAY_PERIODS_PER_YEAR } from './types';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// States with NO income tax (SIT)
const NO_INCOME_TAX_STATES = new Set([
  'AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY',
]);

// States with flat income tax rate
const FLAT_TAX_STATES: Record<string, number> = {
  IL: 0.0495,
  IN: 0.0305,
  KY: 0.04,
  MA: 0.05,
  MI: 0.0425,
  NC: 0.045,
  PA: 0.0307,
  UT: 0.0465,
  CO: 0.044,
  AZ: 0.025,
  GA: 0.0549,
  IA: 0.06,
  ID: 0.058,
  MT: 0.059, // simplified
};

// ─── Apply state brackets ─────────────────────────────────────────────────────

function applyBrackets(taxableIncome: Decimal, brackets: Array<any>): Decimal {
  let tax = new Decimal(0);
  const income = taxableIncome.lt(0) ? new Decimal(0) : taxableIncome;

  for (const bracket of brackets) {
    const bracketMin = new Decimal(bracket.min);
    const bracketMax = bracket.max !== null ? new Decimal(bracket.max) : null;
    const rate = new Decimal(bracket.rate);

    if (income.lte(bracketMin)) break;

    const taxableInBracket = bracketMax
      ? Decimal.min(income, bracketMax).minus(bracketMin)
      : income.minus(bracketMin);

    if (taxableInBracket.gt(0)) {
      tax = tax.plus(taxableInBracket.times(rate));
    }
  }

  return tax;
}

// ─── Calculate SIT for a single state ────────────────────────────────────────

function calculateSITForState(
  state: string,
  taxableWagePerPeriod: Decimal,
  periodsPerYear: number,
  stateConfig: any,
  filingStatus: string,
  stateAllowances: number,
  stateAdditionalWH: number,
  taxYear: number,
  ytdStateWages: number,
  ytdStateTax: number,
): TaxLine[] {
  const taxLines: TaxLine[] = [];

  if (NO_INCOME_TAX_STATES.has(state)) return taxLines;
  if (!stateConfig) return taxLines;
  if (!stateConfig.hasSIT) return taxLines;

  const periodsDecimal = new Decimal(periodsPerYear);
  const additionalWH = new Decimal(stateAdditionalWH);

  // Annualize wages
  let annualWages = taxableWagePerPeriod.times(periodsDecimal);

  // Subtract state standard deduction
  const stdDeduction = new Decimal(stateConfig.standardDeduction || 0);
  annualWages = annualWages.minus(stdDeduction);

  // Subtract personal exemption (per allowance for legacy states, or fixed amount)
  const personalExemption = new Decimal(stateConfig.personalExemption || 0);
  const allowanceAmount = personalExemption.times(stateAllowances || 1);
  annualWages = annualWages.minus(allowanceAmount);

  if (annualWages.lt(0)) annualWages = new Decimal(0);

  let annualTax = new Decimal(0);
  const brackets = stateConfig.brackets;

  // Flat rate states
  if (brackets.flat !== undefined) {
    annualTax = annualWages.times(new Decimal(brackets.flat));
  } else if (brackets.noSIT) {
    return taxLines;
  } else {
    // Multi-bracket: use filing status brackets, fall back to SINGLE
    const statusBrackets =
      brackets[filingStatus] ||
      brackets['SINGLE'] ||
      brackets[Object.keys(brackets)[0]];

    if (statusBrackets && Array.isArray(statusBrackets)) {
      annualTax = applyBrackets(annualWages, statusBrackets);
    }
  }

  if (annualTax.lt(0)) annualTax = new Decimal(0);

  // De-annualize
  let periodTax = annualTax.dividedBy(periodsDecimal);

  // Add state additional withholding
  periodTax = periodTax.plus(additionalWH);

  if (periodTax.lt(0)) periodTax = new Decimal(0);

  periodTax = periodTax.toDecimalPlaces(2);

  if (periodTax.gt(0)) {
    taxLines.push({
      taxCode: 'SIT',
      taxYear,
      description: `State Income Tax (${state})`,
      taxableWage: taxableWagePerPeriod.toNumber(),
      amount: periodTax.toNumber(),
      isEmployee: true,
      liabilityBucket: 'STATE',
      state,
    });
  }

  return taxLines;
}

// ─── Calculate SDI (State Disability Insurance) ───────────────────────────────

function calculateSDI(
  state: string,
  grossPay: Decimal,
  stateConfig: any,
  taxYear: number,
): TaxLine[] {
  const taxLines: TaxLine[] = [];

  if (!stateConfig?.sdiRate) return taxLines;

  const sdiRate = new Decimal(stateConfig.sdiRate);
  const sdiAmount = grossPay.times(sdiRate).toDecimalPlaces(2);

  if (sdiAmount.gt(0)) {
    taxLines.push({
      taxCode: 'SDI',
      taxYear,
      description: `State Disability Insurance (${state})`,
      taxableWage: grossPay.toNumber(),
      amount: sdiAmount.toNumber(),
      isEmployee: true,
      liabilityBucket: 'STATE',
      state,
    });
  }

  return taxLines;
}

// ─── Calculate SUI (State Unemployment Insurance) ────────────────────────────

function calculateSUI(
  state: string,
  grossPay: Decimal,
  ytdWagesForState: number,
  stateConfig: any,
  suiRate: Decimal,
  taxYear: number,
  isEmployer: boolean,
): TaxLine[] {
  const taxLines: TaxLine[] = [];
  if (!stateConfig) return taxLines;

  const suiWageBase = new Decimal(stateConfig.suiWageBase || 7000);
  const ytdWages = new Decimal(ytdWagesForState);
  const remainingBase = suiWageBase.minus(ytdWages);

  if (remainingBase.lte(0)) return taxLines;

  const suiTaxableThisPeriod = Decimal.min(grossPay, remainingBase);

  if (suiTaxableThisPeriod.lte(0)) return taxLines;

  const suiAmount = suiTaxableThisPeriod.times(suiRate).toDecimalPlaces(2);

  if (suiAmount.gt(0)) {
    taxLines.push({
      taxCode: isEmployer ? 'SUI_EMPLOYER' : 'SUI_EMPLOYEE',
      taxYear,
      description: `State Unemployment Insurance (${state}) - ${isEmployer ? 'Employer' : 'Employee'}`,
      taxableWage: suiTaxableThisPeriod.toNumber(),
      amount: suiAmount.toNumber(),
      isEmployee: !isEmployer,
      liabilityBucket: 'SUI',
      state,
    });
  }

  return taxLines;
}

// ─── NYC Local Tax ────────────────────────────────────────────────────────────
// New York City Resident Tax (2024). Applied when locality === 'NYC' and
// the employee's resident state is NY (resident city tax) or work state is NY
// with NYC locality (non-resident city tax at a slightly lower rate).
// We use the resident brackets for simplicity; non-resident rate is ~$0.

const NYC_RESIDENT_BRACKETS = [
  { min: 0,      max: 12000,  rate: 0.03078 },
  { min: 12000,  max: 25000,  rate: 0.03762 },
  { min: 25000,  max: 50000,  rate: 0.03819 },
  { min: 50000,  max: null,   rate: 0.03876 },
];

function calculateNYCLocal(
  grossPay: Decimal,
  preTaxDeductions: Decimal,
  periodsPerYear: number,
  taxYear: number,
): TaxLine[] {
  const taxableWage = grossPay.minus(preTaxDeductions).gt(0)
    ? grossPay.minus(preTaxDeductions)
    : new Decimal(0);

  const annualWages = taxableWage.times(periodsPerYear);
  const annualTax = applyBrackets(annualWages, NYC_RESIDENT_BRACKETS);
  const periodTax = annualTax.dividedBy(periodsPerYear).toDecimalPlaces(2);

  if (periodTax.lte(0)) return [];

  return [{
    taxCode: 'CITY',
    taxYear,
    description: 'New York City Resident Tax',
    taxableWage: taxableWage.toNumber(),
    amount: periodTax.toNumber(),
    isEmployee: true,
    liabilityBucket: 'LOCAL',
    state: 'NY',
    locality: 'NYC',
  }];
}

// ─── PA Local (Act 32) Earned Income Tax ──────────────────────────────────────
// Pennsylvania municipalities levy earned income tax under Act 32.
// The combined rate (municipality + school district) is typically 1–3.93%.
// Default combined rate is 1.0% (many suburban municipalities); Philadelphia
// is 3.75% for residents. Pass localTaxRate in StateCalcInput to override.

const PA_DEFAULT_LOCAL_RATE = 0.01; // 1% default (non-Philly)
const PA_PHILADELPHIA_RATE = 0.0375; // Philadelphia resident EIT

function calculatePALocal(
  grossPay: Decimal,
  preTaxDeductions: Decimal,
  taxYear: number,
  localTaxRate: number,
  locality: string,
): TaxLine[] {
  const taxableWage = grossPay.minus(preTaxDeductions).gt(0)
    ? grossPay.minus(preTaxDeductions)
    : new Decimal(0);

  const amount = taxableWage.times(localTaxRate).toDecimalPlaces(2);
  if (amount.lte(0)) return [];

  return [{
    taxCode: 'LOCAL',
    taxYear,
    description: `Pennsylvania Local EIT (${locality})`,
    taxableWage: taxableWage.toNumber(),
    amount: amount.toNumber(),
    isEmployee: true,
    liabilityBucket: 'LOCAL',
    state: 'PA',
    locality,
  }];
}

// ─── Main State Calculator ────────────────────────────────────────────────────

export interface StateCalcInput {
  input: TaxEngineInput;
  hasReciprocity: boolean;
  workStateConfig: any;
  residentStateConfig: any;
  suiRate: number; // from CompanyState
  localTaxRate?: number; // override for PA Act 32; defaults per locality
}

export function calculateState(params: StateCalcInput): TaxLine[] {
  const { input, hasReciprocity, workStateConfig, residentStateConfig, suiRate, localTaxRate } = params;
  const taxLines: TaxLine[] = [];

  const grossPay = new Decimal(input.grossPay);
  const preTaxDeductions = new Decimal(input.preTaxDeductions);
  const periodsPerYear = PAY_PERIODS_PER_YEAR[input.payFrequency] || 26;

  // SIT taxable wages = gross - pre-tax deductions
  const taxableWagePerPeriod = grossPay.minus(preTaxDeductions).gt(0)
    ? grossPay.minus(preTaxDeductions)
    : new Decimal(0);

  const { residentState, workState } = input;
  const w4 = input.w4;
  const stateFilingStatus = w4.stateFilingStatus || w4.filingStatus;
  const stateAllowances = w4.stateAllowances ?? 0;
  const stateAdditionalWH = w4.stateAdditionalWH ?? 0;

  if (hasReciprocity && workState !== residentState) {
    // Reciprocity: withhold ONLY for resident state
    taxLines.push(
      ...calculateSITForState(
        residentState,
        taxableWagePerPeriod,
        periodsPerYear,
        residentStateConfig,
        stateFilingStatus,
        stateAllowances,
        stateAdditionalWH,
        input.taxYear,
        input.ytdStateWages[residentState] ?? 0,
        input.ytdStateTax[residentState] ?? 0,
      ),
    );

    taxLines.push(
      ...calculateSDI(residentState, grossPay, residentStateConfig, input.taxYear),
    );
  } else if (workState !== residentState) {
    // No reciprocity: withhold for BOTH states (work state SIT, resident state SIT)
    // Work state
    taxLines.push(
      ...calculateSITForState(
        workState,
        taxableWagePerPeriod,
        periodsPerYear,
        workStateConfig,
        stateFilingStatus,
        stateAllowances,
        stateAdditionalWH,
        input.taxYear,
        input.ytdStateWages[workState] ?? 0,
        input.ytdStateTax[workState] ?? 0,
      ),
    );

    taxLines.push(
      ...calculateSDI(workState, grossPay, workStateConfig, input.taxYear),
    );

    // Resident state (if different and has SIT)
    if (!NO_INCOME_TAX_STATES.has(residentState)) {
      taxLines.push(
        ...calculateSITForState(
          residentState,
          taxableWagePerPeriod,
          periodsPerYear,
          residentStateConfig,
          stateFilingStatus,
          stateAllowances,
          0, // don't double-add state additional WH
          input.taxYear,
          input.ytdStateWages[residentState] ?? 0,
          input.ytdStateTax[residentState] ?? 0,
        ),
      );

      taxLines.push(
        ...calculateSDI(residentState, grossPay, residentStateConfig, input.taxYear),
      );
    }
  } else {
    // Same state: straightforward
    taxLines.push(
      ...calculateSITForState(
        workState,
        taxableWagePerPeriod,
        periodsPerYear,
        workStateConfig,
        stateFilingStatus,
        stateAllowances,
        stateAdditionalWH,
        input.taxYear,
        input.ytdStateWages[workState] ?? 0,
        input.ytdStateTax[workState] ?? 0,
      ),
    );

    taxLines.push(
      ...calculateSDI(workState, grossPay, workStateConfig, input.taxYear),
    );
  }

  // SUI — employer-side is always for work state
  const suiRateDecimal = new Decimal(suiRate);
  taxLines.push(
    ...calculateSUI(
      workState,
      grossPay,
      input.ytdStateWages[workState] ?? 0,
      workStateConfig,
      suiRateDecimal,
      input.taxYear,
      true, // employer
    ),
  );

  // ─── Local tax hooks ──────────────────────────────────────────────────────

  const locality = input.locality;

  // NYC: applies when employee works or resides in NYC
  if (locality === 'NYC' && (workState === 'NY' || residentState === 'NY')) {
    taxLines.push(
      ...calculateNYCLocal(
        grossPay,
        preTaxDeductions,
        periodsPerYear,
        input.taxYear,
      ),
    );
  }

  // PA Act 32 local EIT: applies when work state is PA
  if (workState === 'PA' && locality) {
    const paLocality = locality;
    const paRate = paLocality === 'PHILADELPHIA'
      ? PA_PHILADELPHIA_RATE
      : (localTaxRate ?? PA_DEFAULT_LOCAL_RATE);
    taxLines.push(
      ...calculatePALocal(grossPay, preTaxDeductions, input.taxYear, paRate, paLocality),
    );
  }

  return taxLines;
}
