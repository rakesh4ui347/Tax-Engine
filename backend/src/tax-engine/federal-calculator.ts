import Decimal from 'decimal.js';
import { TaxEngineInput, TaxLine, PAY_PERIODS_PER_YEAR } from './types';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── IRS Pub 15-T Standard Deduction Amounts by Filing Status ────────────────

const STANDARD_DEDUCTION_KEY: Record<string, string> = {
  SINGLE: 'standardDeductionSingle',
  MARRIED_FILING_SEPARATELY: 'standardDeductionSingle',
  MARRIED_FILING_JOINTLY: 'standardDeductionMFJ',
  QUALIFYING_WIDOW: 'standardDeductionMFJ',
  HEAD_OF_HOUSEHOLD: 'standardDeductionHOH',
};

// ─── Bracket Calculation (Annualized) ────────────────────────────────────────

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

// ─── Federal Income Tax (IRS Percentage Method, Pub 15-T) ────────────────────

export function calculateFIT(input: TaxEngineInput): TaxLine[] {
  const { w4, federalConfig, payFrequency, taxYear } = input;
  const taxLines: TaxLine[] = [];

  if (w4.exemptFromFIT) return taxLines;

  const periodsPerYear = new Decimal(PAY_PERIODS_PER_YEAR[payFrequency] || 26);
  const grossPay = new Decimal(input.grossPay);
  const preTaxDeductions = new Decimal(input.preTaxDeductions);

  // Step 1: Taxable wages per period = gross - pre-tax deductions
  const taxableWagesPerPeriod = grossPay.minus(preTaxDeductions).gt(0)
    ? grossPay.minus(preTaxDeductions)
    : new Decimal(0);

  // Step 2: Annualize
  let annualWages = taxableWagesPerPeriod.times(periodsPerYear);

  // Step 3: Add Step 4a (other income) annualized
  annualWages = annualWages.plus(new Decimal(w4.otherIncome));

  // Step 4: Determine standard deduction based on filing status
  const stdDeductionKey = STANDARD_DEDUCTION_KEY[w4.filingStatus] || 'standardDeductionSingle';
  let standardDeduction = new Decimal(federalConfig[stdDeductionKey] || 0);

  // If Multiple Jobs checked, use HALF the standard deduction (Pub 15-T Table 2)
  if (w4.multipleJobs) {
    standardDeduction = standardDeduction.dividedBy(2);
  }

  // Step 5: Subtract Step 4b (extra deductions) + standard deduction
  let taxableAnnualIncome = annualWages
    .minus(standardDeduction)
    .minus(new Decimal(w4.deductionsAmount));

  if (taxableAnnualIncome.lt(0)) taxableAnnualIncome = new Decimal(0);

  // Step 6: Get brackets for this filing status
  const brackets = (federalConfig.brackets as any)[w4.filingStatus]
    || (federalConfig.brackets as any)['SINGLE']
    || [];

  // Step 7: Apply brackets
  let annualTax = applyBrackets(taxableAnnualIncome, brackets);

  // Step 8: Subtract Step 3 credits (claimDependents is already the dollar amount)
  annualTax = annualTax.minus(new Decimal(w4.claimDependents));
  if (annualTax.lt(0)) annualTax = new Decimal(0);

  // Step 9: De-annualize
  let periodTax = annualTax.dividedBy(periodsPerYear);

  // Step 10: Add Step 4c (additional withholding per period)
  periodTax = periodTax.plus(new Decimal(w4.additionalWithholding));

  if (periodTax.lt(0)) periodTax = new Decimal(0);

  // Round to cents
  periodTax = periodTax.toDecimalPlaces(2);

  if (periodTax.gt(0)) {
    taxLines.push({
      taxCode: 'FIT',
      taxYear,
      description: 'Federal Income Tax',
      taxableWage: taxableWagesPerPeriod.toNumber(),
      amount: periodTax.toNumber(),
      isEmployee: true,
      liabilityBucket: 'FEDERAL',
    });
  }

  return taxLines;
}

// ─── Social Security ──────────────────────────────────────────────────────────

export function calculateSocialSecurity(input: TaxEngineInput): TaxLine[] {
  const { w4, federalConfig, taxYear } = input;
  const taxLines: TaxLine[] = [];

  if (w4.exemptFromFICA) return taxLines;

  const grossPay = new Decimal(input.grossPay);
  const ytdSS = new Decimal(input.ytdSS);
  const ssWageBase = new Decimal(federalConfig.ssWageBase);
  const ssRate = new Decimal(federalConfig.ssRate); // e.g., 0.062

  // Current period taxable SS wages = gross pay (no pre-tax deduction offset for SS wage base tracking)
  // SS taxable = gross pay - section 125 pre-tax deductions (certain cafeteria plans)
  // For simplicity: SS taxable = gross pay (most pre-tax deductions don't reduce SS wages)
  const taxableWage = grossPay;

  // How much room remains under the wage base
  const remainingBase = ssWageBase.minus(ytdSS);

  if (remainingBase.lte(0)) {
    return taxLines; // Already hit the wage base
  }

  // Taxable SS for this period = min(current gross, remaining wage base space)
  const ssTaxableThisPeriod = Decimal.min(taxableWage, remainingBase);

  if (ssTaxableThisPeriod.lte(0)) return taxLines;

  const employeeAmount = ssTaxableThisPeriod.times(ssRate).toDecimalPlaces(2);
  const employerAmount = ssTaxableThisPeriod.times(ssRate).toDecimalPlaces(2);

  taxLines.push({
    taxCode: 'SS_EMPLOYEE',
    taxYear,
    description: 'Social Security Tax (Employee)',
    taxableWage: ssTaxableThisPeriod.toNumber(),
    amount: employeeAmount.toNumber(),
    isEmployee: true,
    liabilityBucket: 'FICA',
  });

  taxLines.push({
    taxCode: 'SS_EMPLOYER',
    taxYear,
    description: 'Social Security Tax (Employer)',
    taxableWage: ssTaxableThisPeriod.toNumber(),
    amount: employerAmount.toNumber(),
    isEmployee: false,
    liabilityBucket: 'FICA',
  });

  return taxLines;
}

// ─── Medicare ─────────────────────────────────────────────────────────────────

export function calculateMedicare(input: TaxEngineInput): TaxLine[] {
  const { w4, federalConfig, taxYear } = input;
  const taxLines: TaxLine[] = [];

  if (w4.exemptFromFICA) return taxLines;

  const grossPay = new Decimal(input.grossPay);
  const ytdWages = new Decimal(input.ytdWages);
  const medicareRate = new Decimal(federalConfig.medicareRate); // 0.0145
  const addlMedicareRate = new Decimal(federalConfig.additionalMedicareRate); // 0.009
  const addlMedicareThreshold = new Decimal(federalConfig.additionalMedicareThreshold); // 200000

  // Regular Medicare (no wage base cap)
  const employeeRegular = grossPay.times(medicareRate).toDecimalPlaces(2);
  const employerRegular = grossPay.times(medicareRate).toDecimalPlaces(2);

  taxLines.push({
    taxCode: 'MEDICARE_EMPLOYEE',
    taxYear,
    description: 'Medicare Tax (Employee)',
    taxableWage: grossPay.toNumber(),
    amount: employeeRegular.toNumber(),
    isEmployee: true,
    liabilityBucket: 'FICA',
  });

  taxLines.push({
    taxCode: 'MEDICARE_EMPLOYER',
    taxYear,
    description: 'Medicare Tax (Employer)',
    taxableWage: grossPay.toNumber(),
    amount: employerRegular.toNumber(),
    isEmployee: false,
    liabilityBucket: 'FICA',
  });

  // Additional Medicare 0.9% on wages exceeding $200,000 (employee only)
  // YTD threshold tracking: starts withholding once cumulative wages exceed threshold
  const ytdAfterThisPeriod = ytdWages.plus(grossPay);

  if (ytdAfterThisPeriod.gt(addlMedicareThreshold)) {
    // Portion of this period's wages subject to additional medicare
    const previouslyBelowThreshold = Decimal.max(
      addlMedicareThreshold.minus(ytdWages),
      new Decimal(0),
    );
    const wagesAboveThreshold = grossPay.minus(previouslyBelowThreshold);

    if (wagesAboveThreshold.gt(0)) {
      const addlAmount = wagesAboveThreshold.times(addlMedicareRate).toDecimalPlaces(2);

      taxLines.push({
        taxCode: 'ADDL_MEDICARE',
        taxYear,
        description: 'Additional Medicare Tax (Employee 0.9%)',
        taxableWage: wagesAboveThreshold.toNumber(),
        amount: addlAmount.toNumber(),
        isEmployee: true,
        liabilityBucket: 'FICA',
      });
    }
  }

  return taxLines;
}

// ─── FUTA (Federal Unemployment Tax) ─────────────────────────────────────────

export function calculateFUTA(input: TaxEngineInput): TaxLine[] {
  const { federalConfig, taxYear } = input;
  const taxLines: TaxLine[] = [];

  const grossPay = new Decimal(input.grossPay);
  const ytdFUTA = new Decimal(input.ytdFUTA);
  const futaWageBase = new Decimal(federalConfig.futaWageBase); // 7000
  const futaRate = new Decimal(federalConfig.futaRate); // 0.006 (net after credit)

  const remainingFUTABase = futaWageBase.minus(ytdFUTA);

  if (remainingFUTABase.lte(0)) return taxLines;

  const futaTaxableThisPeriod = Decimal.min(grossPay, remainingFUTABase);

  if (futaTaxableThisPeriod.lte(0)) return taxLines;

  const futaAmount = futaTaxableThisPeriod.times(futaRate).toDecimalPlaces(2);

  taxLines.push({
    taxCode: 'FUTA',
    taxYear,
    description: 'Federal Unemployment Tax (FUTA)',
    taxableWage: futaTaxableThisPeriod.toNumber(),
    amount: futaAmount.toNumber(),
    isEmployee: false,
    liabilityBucket: 'FUTA',
  });

  return taxLines;
}

// ─── Main Federal Calculator ──────────────────────────────────────────────────

export function calculateFederal(input: TaxEngineInput): TaxLine[] {
  const taxLines: TaxLine[] = [];

  taxLines.push(...calculateFIT(input));
  taxLines.push(...calculateSocialSecurity(input));
  taxLines.push(...calculateMedicare(input));
  taxLines.push(...calculateFUTA(input));

  return taxLines;
}
