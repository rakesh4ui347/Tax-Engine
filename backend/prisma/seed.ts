import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Federal Tax Data (IRS Publication 15-T) ─────────────────────────────────

const federalTaxConfigs = [
  {
    taxYear: 2020,
    ssWageBase: 137700,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: 200000,
    futaRate: 0.006,
    futaWageBase: 7000,
    futaCreditReduction: 0.0,
    standardDeductionSingle: 12400,
    standardDeductionMFJ: 24800,
    standardDeductionHOH: 18650,
    supplementalRate: 0.22,
    brackets: {
      SINGLE: [
        { min: 0, max: 9875, rate: 0.10 },
        { min: 9875, max: 40125, rate: 0.12 },
        { min: 40125, max: 85525, rate: 0.22 },
        { min: 85525, max: 163300, rate: 0.24 },
        { min: 163300, max: 207350, rate: 0.32 },
        { min: 207350, max: 518400, rate: 0.35 },
        { min: 518400, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 19750, rate: 0.10 },
        { min: 19750, max: 80250, rate: 0.12 },
        { min: 80250, max: 171050, rate: 0.22 },
        { min: 171050, max: 326600, rate: 0.24 },
        { min: 326600, max: 414700, rate: 0.32 },
        { min: 414700, max: 622050, rate: 0.35 },
        { min: 622050, max: null, rate: 0.37 },
      ],
      HEAD_OF_HOUSEHOLD: [
        { min: 0, max: 14100, rate: 0.10 },
        { min: 14100, max: 53700, rate: 0.12 },
        { min: 53700, max: 85500, rate: 0.22 },
        { min: 85500, max: 163300, rate: 0.24 },
        { min: 163300, max: 207350, rate: 0.32 },
        { min: 207350, max: 518400, rate: 0.35 },
        { min: 518400, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_SEPARATELY: [
        { min: 0, max: 9875, rate: 0.10 },
        { min: 9875, max: 40125, rate: 0.12 },
        { min: 40125, max: 85525, rate: 0.22 },
        { min: 85525, max: 163300, rate: 0.24 },
        { min: 163300, max: 207350, rate: 0.32 },
        { min: 207350, max: 311025, rate: 0.35 },
        { min: 311025, max: null, rate: 0.37 },
      ],
    },
  },
  {
    taxYear: 2021,
    ssWageBase: 142800,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: 200000,
    futaRate: 0.006,
    futaWageBase: 7000,
    futaCreditReduction: 0.0,
    standardDeductionSingle: 12550,
    standardDeductionMFJ: 25100,
    standardDeductionHOH: 18800,
    supplementalRate: 0.22,
    brackets: {
      SINGLE: [
        { min: 0, max: 9950, rate: 0.10 },
        { min: 9950, max: 40525, rate: 0.12 },
        { min: 40525, max: 86375, rate: 0.22 },
        { min: 86375, max: 164925, rate: 0.24 },
        { min: 164925, max: 209425, rate: 0.32 },
        { min: 209425, max: 523600, rate: 0.35 },
        { min: 523600, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 19900, rate: 0.10 },
        { min: 19900, max: 81050, rate: 0.12 },
        { min: 81050, max: 172750, rate: 0.22 },
        { min: 172750, max: 329850, rate: 0.24 },
        { min: 329850, max: 418850, rate: 0.32 },
        { min: 418850, max: 628300, rate: 0.35 },
        { min: 628300, max: null, rate: 0.37 },
      ],
      HEAD_OF_HOUSEHOLD: [
        { min: 0, max: 14200, rate: 0.10 },
        { min: 14200, max: 54200, rate: 0.12 },
        { min: 54200, max: 86350, rate: 0.22 },
        { min: 86350, max: 164900, rate: 0.24 },
        { min: 164900, max: 209400, rate: 0.32 },
        { min: 209400, max: 523600, rate: 0.35 },
        { min: 523600, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_SEPARATELY: [
        { min: 0, max: 9950, rate: 0.10 },
        { min: 9950, max: 40525, rate: 0.12 },
        { min: 40525, max: 86375, rate: 0.22 },
        { min: 86375, max: 164925, rate: 0.24 },
        { min: 164925, max: 209425, rate: 0.32 },
        { min: 209425, max: 314150, rate: 0.35 },
        { min: 314150, max: null, rate: 0.37 },
      ],
    },
  },
  {
    taxYear: 2022,
    ssWageBase: 147000,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: 200000,
    futaRate: 0.006,
    futaWageBase: 7000,
    futaCreditReduction: 0.0,
    standardDeductionSingle: 12950,
    standardDeductionMFJ: 25900,
    standardDeductionHOH: 19400,
    supplementalRate: 0.22,
    brackets: {
      SINGLE: [
        { min: 0, max: 10275, rate: 0.10 },
        { min: 10275, max: 41775, rate: 0.12 },
        { min: 41775, max: 89075, rate: 0.22 },
        { min: 89075, max: 170050, rate: 0.24 },
        { min: 170050, max: 215950, rate: 0.32 },
        { min: 215950, max: 539900, rate: 0.35 },
        { min: 539900, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 20550, rate: 0.10 },
        { min: 20550, max: 83550, rate: 0.12 },
        { min: 83550, max: 178150, rate: 0.22 },
        { min: 178150, max: 340100, rate: 0.24 },
        { min: 340100, max: 431900, rate: 0.32 },
        { min: 431900, max: 647850, rate: 0.35 },
        { min: 647850, max: null, rate: 0.37 },
      ],
      HEAD_OF_HOUSEHOLD: [
        { min: 0, max: 14650, rate: 0.10 },
        { min: 14650, max: 55900, rate: 0.12 },
        { min: 55900, max: 89050, rate: 0.22 },
        { min: 89050, max: 170050, rate: 0.24 },
        { min: 170050, max: 215950, rate: 0.32 },
        { min: 215950, max: 539900, rate: 0.35 },
        { min: 539900, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_SEPARATELY: [
        { min: 0, max: 10275, rate: 0.10 },
        { min: 10275, max: 41775, rate: 0.12 },
        { min: 41775, max: 89075, rate: 0.22 },
        { min: 89075, max: 170050, rate: 0.24 },
        { min: 170050, max: 215950, rate: 0.32 },
        { min: 215950, max: 323925, rate: 0.35 },
        { min: 323925, max: null, rate: 0.37 },
      ],
    },
  },
  {
    taxYear: 2023,
    ssWageBase: 160200,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: 200000,
    futaRate: 0.006,
    futaWageBase: 7000,
    futaCreditReduction: 0.0,
    standardDeductionSingle: 13850,
    standardDeductionMFJ: 27700,
    standardDeductionHOH: 20800,
    supplementalRate: 0.22,
    brackets: {
      SINGLE: [
        { min: 0, max: 11000, rate: 0.10 },
        { min: 11000, max: 44725, rate: 0.12 },
        { min: 44725, max: 95375, rate: 0.22 },
        { min: 95375, max: 182400, rate: 0.24 },
        { min: 182400, max: 231250, rate: 0.32 },
        { min: 231250, max: 578125, rate: 0.35 },
        { min: 578125, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 22000, rate: 0.10 },
        { min: 22000, max: 89450, rate: 0.12 },
        { min: 89450, max: 190750, rate: 0.22 },
        { min: 190750, max: 364200, rate: 0.24 },
        { min: 364200, max: 462500, rate: 0.32 },
        { min: 462500, max: 693750, rate: 0.35 },
        { min: 693750, max: null, rate: 0.37 },
      ],
      HEAD_OF_HOUSEHOLD: [
        { min: 0, max: 15700, rate: 0.10 },
        { min: 15700, max: 59850, rate: 0.12 },
        { min: 59850, max: 95350, rate: 0.22 },
        { min: 95350, max: 182400, rate: 0.24 },
        { min: 182400, max: 231250, rate: 0.32 },
        { min: 231250, max: 578100, rate: 0.35 },
        { min: 578100, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_SEPARATELY: [
        { min: 0, max: 11000, rate: 0.10 },
        { min: 11000, max: 44725, rate: 0.12 },
        { min: 44725, max: 95375, rate: 0.22 },
        { min: 95375, max: 182400, rate: 0.24 },
        { min: 182400, max: 231250, rate: 0.32 },
        { min: 231250, max: 346875, rate: 0.35 },
        { min: 346875, max: null, rate: 0.37 },
      ],
    },
  },
  {
    taxYear: 2024,
    ssWageBase: 168600,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: 200000,
    futaRate: 0.006,
    futaWageBase: 7000,
    futaCreditReduction: 0.0,
    standardDeductionSingle: 14600,
    standardDeductionMFJ: 29200,
    standardDeductionHOH: 21900,
    supplementalRate: 0.22,
    brackets: {
      SINGLE: [
        { min: 0, max: 11600, rate: 0.10 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 100525, rate: 0.22 },
        { min: 100525, max: 191950, rate: 0.24 },
        { min: 191950, max: 243725, rate: 0.32 },
        { min: 243725, max: 609350, rate: 0.35 },
        { min: 609350, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 23200, rate: 0.10 },
        { min: 23200, max: 94300, rate: 0.12 },
        { min: 94300, max: 201050, rate: 0.22 },
        { min: 201050, max: 383900, rate: 0.24 },
        { min: 383900, max: 487450, rate: 0.32 },
        { min: 487450, max: 731200, rate: 0.35 },
        { min: 731200, max: null, rate: 0.37 },
      ],
      HEAD_OF_HOUSEHOLD: [
        { min: 0, max: 16550, rate: 0.10 },
        { min: 16550, max: 63100, rate: 0.12 },
        { min: 63100, max: 100500, rate: 0.22 },
        { min: 100500, max: 191950, rate: 0.24 },
        { min: 191950, max: 243700, rate: 0.32 },
        { min: 243700, max: 609350, rate: 0.35 },
        { min: 609350, max: null, rate: 0.37 },
      ],
      MARRIED_FILING_SEPARATELY: [
        { min: 0, max: 11600, rate: 0.10 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 100525, rate: 0.22 },
        { min: 100525, max: 191950, rate: 0.24 },
        { min: 191950, max: 243725, rate: 0.32 },
        { min: 243725, max: 365600, rate: 0.35 },
        { min: 365600, max: null, rate: 0.37 },
      ],
    },
  },
  // 2025 — IRS Rev. Proc. 2024-40 (inflation-adjusted)
  {
    taxYear: 2025,
    ssWageBase: 176100,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: 200000,
    futaRate: 0.006,
    futaWageBase: 7000,
    futaCreditReduction: 0.0,
    standardDeductionSingle: 15000,
    standardDeductionMFJ: 30000,
    standardDeductionHOH: 22500,
    supplementalRate: 0.22,
    brackets: {
      SINGLE: [
        { min: 0,      max: 11925,  rate: 0.10 },
        { min: 11925,  max: 48475,  rate: 0.12 },
        { min: 48475,  max: 103350, rate: 0.22 },
        { min: 103350, max: 197300, rate: 0.24 },
        { min: 197300, max: 250525, rate: 0.32 },
        { min: 250525, max: 626350, rate: 0.35 },
        { min: 626350, max: null,   rate: 0.37 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0,      max: 23850,  rate: 0.10 },
        { min: 23850,  max: 96950,  rate: 0.12 },
        { min: 96950,  max: 206700, rate: 0.22 },
        { min: 206700, max: 394600, rate: 0.24 },
        { min: 394600, max: 501050, rate: 0.32 },
        { min: 501050, max: 751600, rate: 0.35 },
        { min: 751600, max: null,   rate: 0.37 },
      ],
      HEAD_OF_HOUSEHOLD: [
        { min: 0,      max: 17000,  rate: 0.10 },
        { min: 17000,  max: 64850,  rate: 0.12 },
        { min: 64850,  max: 103350, rate: 0.22 },
        { min: 103350, max: 197300, rate: 0.24 },
        { min: 197300, max: 250500, rate: 0.32 },
        { min: 250500, max: 626350, rate: 0.35 },
        { min: 626350, max: null,   rate: 0.37 },
      ],
      MARRIED_FILING_SEPARATELY: [
        { min: 0,      max: 11925,  rate: 0.10 },
        { min: 11925,  max: 48475,  rate: 0.12 },
        { min: 48475,  max: 103350, rate: 0.22 },
        { min: 103350, max: 197300, rate: 0.24 },
        { min: 197300, max: 250525, rate: 0.32 },
        { min: 250525, max: 375800, rate: 0.35 },
        { min: 375800, max: null,   rate: 0.37 },
      ],
    },
  },
];

// ─── State Reciprocity Agreements ─────────────────────────────────────────────
// Each pair (A→B) means: if resident in A and work in B, withhold only for A

const reciprocityPairs = [
  // Arizona
  { fromState: 'AZ', toState: 'CA', notes: 'Arizona residents working in CA withhold only AZ' },
  { fromState: 'AZ', toState: 'IN', notes: null },
  { fromState: 'AZ', toState: 'OR', notes: null },
  { fromState: 'AZ', toState: 'VA', notes: null },
  // DC / Maryland / Virginia triangle
  { fromState: 'DC', toState: 'MD', notes: 'DC-MD-VA reciprocity' },
  { fromState: 'DC', toState: 'VA', notes: null },
  { fromState: 'MD', toState: 'DC', notes: null },
  { fromState: 'MD', toState: 'PA', notes: null },
  { fromState: 'MD', toState: 'VA', notes: null },
  { fromState: 'MD', toState: 'WV', notes: null },
  { fromState: 'VA', toState: 'DC', notes: null },
  { fromState: 'VA', toState: 'KY', notes: null },
  { fromState: 'VA', toState: 'MD', notes: null },
  { fromState: 'VA', toState: 'NC', notes: null },
  { fromState: 'VA', toState: 'PA', notes: null },
  { fromState: 'VA', toState: 'WV', notes: null },
  // Indiana
  { fromState: 'IN', toState: 'KY', notes: null },
  { fromState: 'IN', toState: 'MI', notes: null },
  { fromState: 'IN', toState: 'OH', notes: null },
  { fromState: 'IN', toState: 'PA', notes: null },
  { fromState: 'IN', toState: 'WI', notes: null },
  // Iowa
  { fromState: 'IA', toState: 'IL', notes: null },
  // Kentucky
  { fromState: 'KY', toState: 'IL', notes: null },
  { fromState: 'KY', toState: 'IN', notes: null },
  { fromState: 'KY', toState: 'MI', notes: null },
  { fromState: 'KY', toState: 'MN', notes: null },
  { fromState: 'KY', toState: 'OH', notes: null },
  { fromState: 'KY', toState: 'VA', notes: null },
  { fromState: 'KY', toState: 'WI', notes: null },
  { fromState: 'KY', toState: 'WV', notes: null },
  // Michigan
  { fromState: 'MI', toState: 'IL', notes: null },
  { fromState: 'MI', toState: 'IN', notes: null },
  { fromState: 'MI', toState: 'KY', notes: null },
  { fromState: 'MI', toState: 'MN', notes: null },
  { fromState: 'MI', toState: 'OH', notes: null },
  { fromState: 'MI', toState: 'WI', notes: null },
  // Minnesota
  { fromState: 'MN', toState: 'MI', notes: null },
  { fromState: 'MN', toState: 'ND', notes: null },
  // Montana
  { fromState: 'MT', toState: 'ND', notes: null },
  // New Jersey
  { fromState: 'NJ', toState: 'PA', notes: null },
  // North Dakota
  { fromState: 'ND', toState: 'MN', notes: null },
  { fromState: 'ND', toState: 'MT', notes: null },
  // Ohio
  { fromState: 'OH', toState: 'IN', notes: null },
  { fromState: 'OH', toState: 'KY', notes: null },
  { fromState: 'OH', toState: 'MI', notes: null },
  { fromState: 'OH', toState: 'PA', notes: null },
  { fromState: 'OH', toState: 'WV', notes: null },
  // Pennsylvania
  { fromState: 'PA', toState: 'IN', notes: null },
  { fromState: 'PA', toState: 'MD', notes: null },
  { fromState: 'PA', toState: 'NJ', notes: null },
  { fromState: 'PA', toState: 'OH', notes: null },
  { fromState: 'PA', toState: 'VA', notes: null },
  { fromState: 'PA', toState: 'WV', notes: null },
  // West Virginia
  { fromState: 'WV', toState: 'KY', notes: null },
  { fromState: 'WV', toState: 'MD', notes: null },
  { fromState: 'WV', toState: 'OH', notes: null },
  { fromState: 'WV', toState: 'PA', notes: null },
  { fromState: 'WV', toState: 'VA', notes: null },
  // Wisconsin
  { fromState: 'WI', toState: 'IL', notes: null },
  { fromState: 'WI', toState: 'IN', notes: null },
  { fromState: 'WI', toState: 'KY', notes: null },
  { fromState: 'WI', toState: 'MI', notes: null },
];

// ─── State Tax Configs (2024) ─────────────────────────────────────────────────

const stateTaxConfigs = [
  // No income tax states
  { state: 'AK', taxYear: 2024, standardDeduction: 0, personalExemption: 0, brackets: { noSIT: true }, supplementalRate: 0, suiWageBase: 47100, sdiRate: null, hasSIT: false },
  { state: 'FL', taxYear: 2024, standardDeduction: 0, personalExemption: 0, brackets: { noSIT: true }, supplementalRate: 0, suiWageBase: 7000, sdiRate: null, hasSIT: false },
  { state: 'NV', taxYear: 2024, standardDeduction: 0, personalExemption: 0, brackets: { noSIT: true }, supplementalRate: 0, suiWageBase: 40100, sdiRate: null, hasSIT: false },
  { state: 'NH', taxYear: 2024, standardDeduction: 0, personalExemption: 0, brackets: { noSIT: true }, supplementalRate: 0, suiWageBase: 14000, sdiRate: null, hasSIT: false },
  { state: 'SD', taxYear: 2024, standardDeduction: 0, personalExemption: 0, brackets: { noSIT: true }, supplementalRate: 0, suiWageBase: 15000, sdiRate: null, hasSIT: false },
  { state: 'TN', taxYear: 2024, standardDeduction: 0, personalExemption: 0, brackets: { noSIT: true }, supplementalRate: 0, suiWageBase: 7000, sdiRate: null, hasSIT: false },
  { state: 'TX', taxYear: 2024, standardDeduction: 0, personalExemption: 0, brackets: { noSIT: true }, supplementalRate: 0, suiWageBase: 9000, sdiRate: null, hasSIT: false },
  { state: 'WA', taxYear: 2024, standardDeduction: 0, personalExemption: 0, brackets: { noSIT: true }, supplementalRate: 0, suiWageBase: 68500, sdiRate: null, hasSIT: false },
  { state: 'WY', taxYear: 2024, standardDeduction: 0, personalExemption: 0, brackets: { noSIT: true }, supplementalRate: 0, suiWageBase: 29100, sdiRate: null, hasSIT: false },
  // Flat rate states
  {
    state: 'IL', taxYear: 2024, standardDeduction: 2775, personalExemption: 2425,
    brackets: { flat: 0.0495 }, supplementalRate: 0.0495,
    suiWageBase: 13590, sdiRate: null, hasSIT: true,
  },
  {
    state: 'IN', taxYear: 2024, standardDeduction: 0, personalExemption: 1000,
    brackets: { flat: 0.0305 }, supplementalRate: 0.0305,
    suiWageBase: 9500, sdiRate: null, hasSIT: true,
  },
  {
    state: 'KY', taxYear: 2024, standardDeduction: 3160, personalExemption: 0,
    brackets: { flat: 0.04 }, supplementalRate: 0.04,
    suiWageBase: 11400, sdiRate: null, hasSIT: true,
  },
  {
    state: 'MA', taxYear: 2024, standardDeduction: 0, personalExemption: 4400,
    brackets: { flat: 0.05 }, supplementalRate: 0.05,
    suiWageBase: 15000, sdiRate: null, hasSIT: true,
  },
  {
    state: 'MI', taxYear: 2024, standardDeduction: 0, personalExemption: 5600,
    brackets: { flat: 0.0425 }, supplementalRate: 0.0425,
    suiWageBase: 9500, sdiRate: null, hasSIT: true,
  },
  {
    state: 'NC', taxYear: 2024, standardDeduction: 12750, personalExemption: 0,
    brackets: { flat: 0.045 }, supplementalRate: 0.045,
    suiWageBase: 29600, sdiRate: null, hasSIT: true,
  },
  {
    state: 'PA', taxYear: 2024, standardDeduction: 0, personalExemption: 0,
    brackets: { flat: 0.0307 }, supplementalRate: 0.0307,
    suiWageBase: 10000, sdiRate: null, hasSIT: true,
  },
  {
    state: 'UT', taxYear: 2024, standardDeduction: 887, personalExemption: 1896,
    brackets: { flat: 0.0465 }, supplementalRate: 0.0465,
    suiWageBase: 47000, sdiRate: null, hasSIT: true,
  },
  {
    state: 'CO', taxYear: 2024, standardDeduction: 14600, personalExemption: 0,
    brackets: { flat: 0.044 }, supplementalRate: 0.044,
    suiWageBase: 23800, sdiRate: null, hasSIT: true,
  },
  // Multi-bracket states — California
  {
    state: 'CA', taxYear: 2024,
    standardDeduction: 5202,
    personalExemption: 144,
    suiWageBase: 7000,
    sdiRate: 0.009,
    hasSIT: true,
    supplementalRate: 0.0660,
    brackets: {
      SINGLE: [
        { min: 0, max: 10412, rate: 0.01 },
        { min: 10412, max: 24684, rate: 0.02 },
        { min: 24684, max: 38959, rate: 0.04 },
        { min: 38959, max: 54081, rate: 0.06 },
        { min: 54081, max: 68350, rate: 0.08 },
        { min: 68350, max: 349137, rate: 0.093 },
        { min: 349137, max: 418961, rate: 0.103 },
        { min: 418961, max: 698274, rate: 0.113 },
        { min: 698274, max: null, rate: 0.123 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 20824, rate: 0.01 },
        { min: 20824, max: 49368, rate: 0.02 },
        { min: 49368, max: 77918, rate: 0.04 },
        { min: 77918, max: 108162, rate: 0.06 },
        { min: 108162, max: 136700, rate: 0.08 },
        { min: 136700, max: 698274, rate: 0.093 },
        { min: 698274, max: 837922, rate: 0.103 },
        { min: 837922, max: 1000000, rate: 0.113 },
        { min: 1000000, max: null, rate: 0.123 },
      ],
    },
  },
  // New York
  {
    state: 'NY', taxYear: 2024,
    standardDeduction: 8000,
    personalExemption: 0,
    suiWageBase: 12500,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.1185,
    brackets: {
      SINGLE: [
        { min: 0, max: 17150, rate: 0.04 },
        { min: 17150, max: 23600, rate: 0.045 },
        { min: 23600, max: 27900, rate: 0.0525 },
        { min: 27900, max: 161550, rate: 0.055 },
        { min: 161550, max: 323200, rate: 0.06 },
        { min: 323200, max: 2155350, rate: 0.0685 },
        { min: 2155350, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: null, rate: 0.109 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 27900, rate: 0.04 },
        { min: 27900, max: 43000, rate: 0.045 },
        { min: 43000, max: 161550, rate: 0.0525 },
        { min: 161550, max: 323200, rate: 0.055 },
        { min: 323200, max: 2155350, rate: 0.06 },
        { min: 2155350, max: 5000000, rate: 0.0685 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: null, rate: 0.109 },
      ],
    },
  },
  // Ohio
  {
    state: 'OH', taxYear: 2024,
    standardDeduction: 0,
    personalExemption: 2400,
    suiWageBase: 9000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.035,
    brackets: {
      SINGLE: [
        { min: 0, max: 26050, rate: 0.0 },
        { min: 26050, max: 100000, rate: 0.02765 },
        { min: 100000, max: 115300, rate: 0.03226 },
        { min: 115300, max: null, rate: 0.035 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 26050, rate: 0.0 },
        { min: 26050, max: 100000, rate: 0.02765 },
        { min: 100000, max: 115300, rate: 0.03226 },
        { min: 115300, max: null, rate: 0.035 },
      ],
    },
  },
  // Georgia
  {
    state: 'GA', taxYear: 2024,
    standardDeduction: 12000,
    personalExemption: 0,
    suiWageBase: 9500,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.0549,
    brackets: {
      SINGLE: [
        { min: 0, max: null, rate: 0.0549 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: null, rate: 0.0549 },
      ],
    },
  },
  // Virginia
  {
    state: 'VA', taxYear: 2024,
    standardDeduction: 8500,
    personalExemption: 930,
    suiWageBase: 8000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.0575,
    brackets: {
      SINGLE: [
        { min: 0, max: 3000, rate: 0.02 },
        { min: 3000, max: 5000, rate: 0.03 },
        { min: 5000, max: 17000, rate: 0.05 },
        { min: 17000, max: null, rate: 0.0575 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 3000, rate: 0.02 },
        { min: 3000, max: 5000, rate: 0.03 },
        { min: 5000, max: 17000, rate: 0.05 },
        { min: 17000, max: null, rate: 0.0575 },
      ],
    },
  },
  // Arizona
  {
    state: 'AZ', taxYear: 2024,
    standardDeduction: 13850,
    personalExemption: 0,
    suiWageBase: 8000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.025,
    brackets: {
      SINGLE: [
        { min: 0, max: null, rate: 0.025 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: null, rate: 0.025 },
      ],
    },
  },
  // New Jersey
  {
    state: 'NJ', taxYear: 2024,
    standardDeduction: 0,
    personalExemption: 1000,
    suiWageBase: 42300,
    sdiRate: 0.0009,
    hasSIT: true,
    supplementalRate: 0.0395,
    brackets: {
      SINGLE: [
        { min: 0, max: 20000, rate: 0.014 },
        { min: 20000, max: 35000, rate: 0.0175 },
        { min: 35000, max: 40000, rate: 0.035 },
        { min: 40000, max: 75000, rate: 0.05525 },
        { min: 75000, max: 500000, rate: 0.0637 },
        { min: 500000, max: 1000000, rate: 0.0897 },
        { min: 1000000, max: null, rate: 0.1075 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 20000, rate: 0.014 },
        { min: 20000, max: 50000, rate: 0.0175 },
        { min: 50000, max: 70000, rate: 0.0245 },
        { min: 70000, max: 80000, rate: 0.035 },
        { min: 80000, max: 150000, rate: 0.05525 },
        { min: 150000, max: 500000, rate: 0.0637 },
        { min: 500000, max: 1000000, rate: 0.0897 },
        { min: 1000000, max: null, rate: 0.1075 },
      ],
    },
  },
  // Minnesota
  {
    state: 'MN', taxYear: 2024,
    standardDeduction: 14575,
    personalExemption: 4800,
    suiWageBase: 42000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.0985,
    brackets: {
      SINGLE: [
        { min: 0, max: 30070, rate: 0.0535 },
        { min: 30070, max: 98760, rate: 0.068 },
        { min: 98760, max: 183340, rate: 0.0785 },
        { min: 183340, max: null, rate: 0.0985 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 43950, rate: 0.0535 },
        { min: 43950, max: 174610, rate: 0.068 },
        { min: 174610, max: 304970, rate: 0.0785 },
        { min: 304970, max: null, rate: 0.0985 },
      ],
    },
  },
  // Wisconsin
  {
    state: 'WI', taxYear: 2024,
    standardDeduction: 13170,
    personalExemption: 700,
    suiWageBase: 14000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.0765,
    brackets: {
      SINGLE: [
        { min: 0, max: 13810, rate: 0.035 },
        { min: 13810, max: 27630, rate: 0.044 },
        { min: 27630, max: 304170, rate: 0.053 },
        { min: 304170, max: null, rate: 0.0765 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 18420, rate: 0.035 },
        { min: 18420, max: 36840, rate: 0.044 },
        { min: 36840, max: 405550, rate: 0.053 },
        { min: 405550, max: null, rate: 0.0765 },
      ],
    },
  },
  // Maryland
  {
    state: 'MD', taxYear: 2024,
    standardDeduction: 2400,
    personalExemption: 3200,
    suiWageBase: 8500,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.055,
    brackets: {
      SINGLE: [
        { min: 0, max: 1000, rate: 0.02 },
        { min: 1000, max: 2000, rate: 0.03 },
        { min: 2000, max: 3000, rate: 0.04 },
        { min: 3000, max: 100000, rate: 0.0475 },
        { min: 100000, max: 125000, rate: 0.05 },
        { min: 125000, max: 150000, rate: 0.0525 },
        { min: 150000, max: 250000, rate: 0.055 },
        { min: 250000, max: null, rate: 0.055 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 1000, rate: 0.02 },
        { min: 1000, max: 2000, rate: 0.03 },
        { min: 2000, max: 3000, rate: 0.04 },
        { min: 3000, max: 150000, rate: 0.0475 },
        { min: 150000, max: 175000, rate: 0.05 },
        { min: 175000, max: 225000, rate: 0.0525 },
        { min: 225000, max: 300000, rate: 0.055 },
        { min: 300000, max: null, rate: 0.055 },
      ],
    },
  },
  // Missouri
  {
    state: 'MO', taxYear: 2024,
    standardDeduction: 14600,
    personalExemption: 0,
    suiWageBase: 10500,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.045,
    brackets: {
      SINGLE: [
        { min: 0, max: 1207, rate: 0.0 },
        { min: 1207, max: 2414, rate: 0.015 },
        { min: 2414, max: 3620, rate: 0.02 },
        { min: 3620, max: 4827, rate: 0.025 },
        { min: 4827, max: 6034, rate: 0.03 },
        { min: 6034, max: 7241, rate: 0.035 },
        { min: 7241, max: 8447, rate: 0.04 },
        { min: 8447, max: null, rate: 0.045 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 1207, rate: 0.0 },
        { min: 1207, max: 2414, rate: 0.015 },
        { min: 2414, max: 3620, rate: 0.02 },
        { min: 3620, max: 4827, rate: 0.025 },
        { min: 4827, max: 6034, rate: 0.03 },
        { min: 6034, max: 7241, rate: 0.035 },
        { min: 7241, max: 8447, rate: 0.04 },
        { min: 8447, max: null, rate: 0.045 },
      ],
    },
  },
  // Oregon
  {
    state: 'OR', taxYear: 2024,
    standardDeduction: 2745,
    personalExemption: 236,
    suiWageBase: 52800,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.099,
    brackets: {
      SINGLE: [
        { min: 0, max: 10000, rate: 0.0475 },
        { min: 10000, max: 250000, rate: 0.0675 },
        { min: 250000, max: null, rate: 0.099 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 18400, rate: 0.0475 },
        { min: 18400, max: 500000, rate: 0.0675 },
        { min: 500000, max: null, rate: 0.099 },
      ],
    },
  },
  // Iowa
  {
    state: 'IA', taxYear: 2024,
    standardDeduction: 14600,
    personalExemption: 40,
    suiWageBase: 38200,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.06,
    brackets: {
      SINGLE: [
        { min: 0, max: null, rate: 0.06 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: null, rate: 0.06 },
      ],
    },
  },
  // Connecticut
  {
    state: 'CT', taxYear: 2024,
    standardDeduction: 0,
    personalExemption: 15000,
    suiWageBase: 25000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.065,
    brackets: {
      SINGLE: [
        { min: 0, max: 10000, rate: 0.03 },
        { min: 10000, max: 50000, rate: 0.05 },
        { min: 50000, max: 100000, rate: 0.055 },
        { min: 100000, max: 200000, rate: 0.06 },
        { min: 200000, max: 250000, rate: 0.065 },
        { min: 250000, max: 500000, rate: 0.069 },
        { min: 500000, max: null, rate: 0.0699 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 20000, rate: 0.03 },
        { min: 20000, max: 100000, rate: 0.05 },
        { min: 100000, max: 200000, rate: 0.055 },
        { min: 200000, max: 400000, rate: 0.06 },
        { min: 400000, max: 500000, rate: 0.065 },
        { min: 500000, max: 1000000, rate: 0.069 },
        { min: 1000000, max: null, rate: 0.0699 },
      ],
    },
  },
  // North Carolina
  {
    state: 'NC', taxYear: 2024,
    standardDeduction: 12750,
    personalExemption: 0,
    suiWageBase: 29600,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.045,
    brackets: {
      SINGLE: [{ min: 0, max: null, rate: 0.045 }],
      MARRIED_FILING_JOINTLY: [{ min: 0, max: null, rate: 0.045 }],
    },
  },
  // Kansas
  {
    state: 'KS', taxYear: 2024,
    standardDeduction: 3500,
    personalExemption: 2250,
    suiWageBase: 14000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.057,
    brackets: {
      SINGLE: [
        { min: 0, max: 15000, rate: 0.031 },
        { min: 15000, max: 30000, rate: 0.0525 },
        { min: 30000, max: null, rate: 0.057 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 30000, rate: 0.031 },
        { min: 30000, max: 60000, rate: 0.0525 },
        { min: 60000, max: null, rate: 0.057 },
      ],
    },
  },
  // Arkansas
  {
    state: 'AR', taxYear: 2024,
    standardDeduction: 2340,
    personalExemption: 29,
    suiWageBase: 7000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.039,
    brackets: {
      SINGLE: [
        { min: 0, max: 4300, rate: 0.02 },
        { min: 4300, max: 8500, rate: 0.04 },
        { min: 8500, max: null, rate: 0.039 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 4300, rate: 0.02 },
        { min: 4300, max: 8500, rate: 0.04 },
        { min: 8500, max: null, rate: 0.039 },
      ],
    },
  },
  // Mississippi
  {
    state: 'MS', taxYear: 2024,
    standardDeduction: 2300,
    personalExemption: 6000,
    suiWageBase: 14000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.047,
    brackets: {
      SINGLE: [
        { min: 0, max: 10000, rate: 0.0 },
        { min: 10000, max: null, rate: 0.047 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 10000, rate: 0.0 },
        { min: 10000, max: null, rate: 0.047 },
      ],
    },
  },
  // Nebraska
  {
    state: 'NE', taxYear: 2024,
    standardDeduction: 7900,
    personalExemption: 157,
    suiWageBase: 9000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.0664,
    brackets: {
      SINGLE: [
        { min: 0, max: 3700, rate: 0.0246 },
        { min: 3700, max: 22170, rate: 0.0351 },
        { min: 22170, max: 35730, rate: 0.0501 },
        { min: 35730, max: null, rate: 0.0664 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 7390, rate: 0.0246 },
        { min: 7390, max: 44350, rate: 0.0351 },
        { min: 44350, max: 71470, rate: 0.0501 },
        { min: 71470, max: null, rate: 0.0664 },
      ],
    },
  },
  // Oklahoma
  {
    state: 'OK', taxYear: 2024,
    standardDeduction: 6350,
    personalExemption: 1000,
    suiWageBase: 25700,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.0475,
    brackets: {
      SINGLE: [
        { min: 0, max: 1000, rate: 0.0025 },
        { min: 1000, max: 2500, rate: 0.0075 },
        { min: 2500, max: 3750, rate: 0.0175 },
        { min: 3750, max: 4900, rate: 0.0275 },
        { min: 4900, max: 7200, rate: 0.0375 },
        { min: 7200, max: null, rate: 0.0475 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 2000, rate: 0.0025 },
        { min: 2000, max: 5000, rate: 0.0075 },
        { min: 5000, max: 7500, rate: 0.0175 },
        { min: 7500, max: 9800, rate: 0.0275 },
        { min: 9800, max: 12200, rate: 0.0375 },
        { min: 12200, max: null, rate: 0.0475 },
      ],
    },
  },
  // Idaho
  {
    state: 'ID', taxYear: 2024,
    standardDeduction: 14600,
    personalExemption: 0,
    suiWageBase: 53500,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.058,
    brackets: {
      SINGLE: [
        { min: 0, max: null, rate: 0.058 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: null, rate: 0.058 },
      ],
    },
  },
  // Montana
  {
    state: 'MT', taxYear: 2024,
    standardDeduction: 14600,
    personalExemption: 3080,
    suiWageBase: 43000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.059,
    brackets: {
      SINGLE: [
        { min: 0, max: 20500, rate: 0.047 },
        { min: 20500, max: null, rate: 0.059 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 20500, rate: 0.047 },
        { min: 20500, max: null, rate: 0.059 },
      ],
    },
  },
  // West Virginia
  {
    state: 'WV', taxYear: 2024,
    standardDeduction: 0,
    personalExemption: 2000,
    suiWageBase: 9000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.0512,
    brackets: {
      SINGLE: [
        { min: 0, max: 10000, rate: 0.0236 },
        { min: 10000, max: 25000, rate: 0.0315 },
        { min: 25000, max: 40000, rate: 0.0354 },
        { min: 40000, max: 60000, rate: 0.0472 },
        { min: 60000, max: null, rate: 0.0512 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 10000, rate: 0.0236 },
        { min: 10000, max: 25000, rate: 0.0315 },
        { min: 25000, max: 40000, rate: 0.0354 },
        { min: 40000, max: 60000, rate: 0.0472 },
        { min: 60000, max: null, rate: 0.0512 },
      ],
    },
  },
  // Rhode Island
  {
    state: 'RI', taxYear: 2024,
    standardDeduction: 10550,
    personalExemption: 4500,
    suiWageBase: 29200,
    sdiRate: 0.013,
    hasSIT: true,
    supplementalRate: 0.0599,
    brackets: {
      SINGLE: [
        { min: 0, max: 77450, rate: 0.0375 },
        { min: 77450, max: 176050, rate: 0.0475 },
        { min: 176050, max: null, rate: 0.0599 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 77450, rate: 0.0375 },
        { min: 77450, max: 176050, rate: 0.0475 },
        { min: 176050, max: null, rate: 0.0599 },
      ],
    },
  },
  // Maine
  {
    state: 'ME', taxYear: 2024,
    standardDeduction: 14600,
    personalExemption: 4700,
    suiWageBase: 12000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.075,
    brackets: {
      SINGLE: [
        { min: 0, max: 26050, rate: 0.058 },
        { min: 26050, max: 61600, rate: 0.0675 },
        { min: 61600, max: null, rate: 0.075 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 52100, rate: 0.058 },
        { min: 52100, max: 123250, rate: 0.0675 },
        { min: 123250, max: null, rate: 0.075 },
      ],
    },
  },
  // Vermont
  {
    state: 'VT', taxYear: 2024,
    standardDeduction: 7000,
    personalExemption: 4500,
    suiWageBase: 14300,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.0875,
    brackets: {
      SINGLE: [
        { min: 0, max: 45400, rate: 0.0335 },
        { min: 45400, max: 110050, rate: 0.066 },
        { min: 110050, max: 229550, rate: 0.076 },
        { min: 229550, max: null, rate: 0.0875 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 75850, rate: 0.0335 },
        { min: 75850, max: 183400, rate: 0.066 },
        { min: 183400, max: 279450, rate: 0.076 },
        { min: 279450, max: null, rate: 0.0875 },
      ],
    },
  },
  // Hawaii
  {
    state: 'HI', taxYear: 2024,
    standardDeduction: 2200,
    personalExemption: 1144,
    suiWageBase: 59100,
    sdiRate: 0.005,
    hasSIT: true,
    supplementalRate: 0.11,
    brackets: {
      SINGLE: [
        { min: 0, max: 2400, rate: 0.014 },
        { min: 2400, max: 4800, rate: 0.032 },
        { min: 4800, max: 9600, rate: 0.055 },
        { min: 9600, max: 14400, rate: 0.064 },
        { min: 14400, max: 19200, rate: 0.068 },
        { min: 19200, max: 24000, rate: 0.072 },
        { min: 24000, max: 36000, rate: 0.076 },
        { min: 36000, max: 48000, rate: 0.079 },
        { min: 48000, max: 150000, rate: 0.0825 },
        { min: 150000, max: 175000, rate: 0.09 },
        { min: 175000, max: 200000, rate: 0.10 },
        { min: 200000, max: null, rate: 0.11 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 4800, rate: 0.014 },
        { min: 4800, max: 9600, rate: 0.032 },
        { min: 9600, max: 19200, rate: 0.055 },
        { min: 19200, max: 28800, rate: 0.064 },
        { min: 28800, max: 38400, rate: 0.068 },
        { min: 38400, max: 48000, rate: 0.072 },
        { min: 48000, max: 72000, rate: 0.076 },
        { min: 72000, max: 96000, rate: 0.079 },
        { min: 96000, max: 300000, rate: 0.0825 },
        { min: 300000, max: 350000, rate: 0.09 },
        { min: 350000, max: 400000, rate: 0.10 },
        { min: 400000, max: null, rate: 0.11 },
      ],
    },
  },
  // New Mexico
  {
    state: 'NM', taxYear: 2024,
    standardDeduction: 14600,
    personalExemption: 4000,
    suiWageBase: 31700,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.059,
    brackets: {
      SINGLE: [
        { min: 0, max: 5500, rate: 0.017 },
        { min: 5500, max: 11000, rate: 0.032 },
        { min: 11000, max: 16000, rate: 0.047 },
        { min: 16000, max: 210000, rate: 0.049 },
        { min: 210000, max: null, rate: 0.059 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 8000, rate: 0.017 },
        { min: 8000, max: 16000, rate: 0.032 },
        { min: 16000, max: 24000, rate: 0.047 },
        { min: 24000, max: 315000, rate: 0.049 },
        { min: 315000, max: null, rate: 0.059 },
      ],
    },
  },
  // Louisiana
  {
    state: 'LA', taxYear: 2024,
    standardDeduction: 4500,
    personalExemption: 4500,
    suiWageBase: 7700,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.06,
    brackets: {
      SINGLE: [
        { min: 0, max: 12500, rate: 0.0185 },
        { min: 12500, max: 50000, rate: 0.035 },
        { min: 50000, max: null, rate: 0.0425 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 25000, rate: 0.0185 },
        { min: 25000, max: 100000, rate: 0.035 },
        { min: 100000, max: null, rate: 0.0425 },
      ],
    },
  },
  // South Carolina
  {
    state: 'SC', taxYear: 2024,
    standardDeduction: 14600,
    personalExemption: 0,
    suiWageBase: 14000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.065,
    brackets: {
      SINGLE: [
        { min: 0, max: 3460, rate: 0.0 },
        { min: 3460, max: 17330, rate: 0.03 },
        { min: 17330, max: null, rate: 0.065 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 3460, rate: 0.0 },
        { min: 3460, max: 17330, rate: 0.03 },
        { min: 17330, max: null, rate: 0.065 },
      ],
    },
  },
  // Alabama
  {
    state: 'AL', taxYear: 2024,
    standardDeduction: 3000,
    personalExemption: 1500,
    suiWageBase: 8000,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.05,
    brackets: {
      SINGLE: [
        { min: 0, max: 500, rate: 0.02 },
        { min: 500, max: 3000, rate: 0.04 },
        { min: 3000, max: null, rate: 0.05 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 1000, rate: 0.02 },
        { min: 1000, max: 6000, rate: 0.04 },
        { min: 6000, max: null, rate: 0.05 },
      ],
    },
  },
  // North Dakota
  {
    state: 'ND', taxYear: 2024,
    standardDeduction: 14600,
    personalExemption: 0,
    suiWageBase: 43800,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.029,
    brackets: {
      SINGLE: [
        { min: 0, max: 44725, rate: 0.011 },
        { min: 44725, max: 225975, rate: 0.0204 },
        { min: 225975, max: null, rate: 0.029 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 74750, rate: 0.011 },
        { min: 74750, max: 275925, rate: 0.0204 },
        { min: 275925, max: null, rate: 0.029 },
      ],
    },
  },
  // Delaware
  {
    state: 'DE', taxYear: 2024,
    standardDeduction: 3250,
    personalExemption: 110,
    suiWageBase: 10500,
    sdiRate: null,
    hasSIT: true,
    supplementalRate: 0.066,
    brackets: {
      SINGLE: [
        { min: 0, max: 2000, rate: 0.0 },
        { min: 2000, max: 5000, rate: 0.022 },
        { min: 5000, max: 10000, rate: 0.039 },
        { min: 10000, max: 20000, rate: 0.048 },
        { min: 20000, max: 25000, rate: 0.052 },
        { min: 25000, max: 60000, rate: 0.0555 },
        { min: 60000, max: null, rate: 0.066 },
      ],
      MARRIED_FILING_JOINTLY: [
        { min: 0, max: 2000, rate: 0.0 },
        { min: 2000, max: 5000, rate: 0.022 },
        { min: 5000, max: 10000, rate: 0.039 },
        { min: 10000, max: 20000, rate: 0.048 },
        { min: 20000, max: 25000, rate: 0.052 },
        { min: 25000, max: 60000, rate: 0.0555 },
        { min: 60000, max: null, rate: 0.066 },
      ],
    },
  },
];

async function main() {
  console.log('Seeding database...');

  // ─── Federal Tax Configs ──────────────────────────────────────────────────
  console.log('Inserting federal tax configs...');
  for (const config of federalTaxConfigs) {
    await prisma.federalTaxConfig.upsert({
      where: { taxYear: config.taxYear },
      update: {},
      create: {
        taxYear: config.taxYear,
        ssWageBase: config.ssWageBase,
        ssRate: config.ssRate,
        medicareRate: config.medicareRate,
        additionalMedicareRate: config.additionalMedicareRate,
        additionalMedicareThreshold: config.additionalMedicareThreshold,
        futaRate: config.futaRate,
        futaWageBase: config.futaWageBase,
        futaCreditReduction: config.futaCreditReduction,
        standardDeductionSingle: config.standardDeductionSingle,
        standardDeductionMFJ: config.standardDeductionMFJ,
        standardDeductionHOH: config.standardDeductionHOH,
        supplementalRate: config.supplementalRate,
        brackets: config.brackets as any,
      },
    });
  }

  // ─── Reciprocity Agreements ───────────────────────────────────────────────
  console.log('Inserting reciprocity agreements...');
  for (const pair of reciprocityPairs) {
    await prisma.stateReciprocityAgreement.upsert({
      where: {
        fromState_toState_effectiveFrom: {
          fromState: pair.fromState,
          toState: pair.toState,
          effectiveFrom: new Date('2000-01-01'),
        },
      },
      update: {},
      create: {
        fromState: pair.fromState,
        toState: pair.toState,
        effectiveFrom: new Date('2000-01-01'),
        notes: pair.notes,
      },
    });
  }

  // ─── State Tax Configs ────────────────────────────────────────────────────
  console.log('Inserting state tax configs...');
  for (const config of stateTaxConfigs) {
    await prisma.stateTaxConfig.upsert({
      where: { state_taxYear: { state: config.state, taxYear: config.taxYear } },
      update: {},
      create: {
        state: config.state,
        taxYear: config.taxYear,
        standardDeduction: config.standardDeduction,
        personalExemption: config.personalExemption,
        brackets: config.brackets as any,
        supplementalRate: config.supplementalRate,
        suiWageBase: config.suiWageBase,
        sdiRate: config.sdiRate,
        hasSIT: config.hasSIT,
      },
    });
  }

  // ─── Demo Organization + Company + Admin User ────────────────────────────
  console.log('Creating demo organization...');
  const org = await prisma.organization.upsert({
    where: { ein: '12-3456789' },
    update: {},
    create: {
      name: 'Demo Corp Inc.',
      ein: '12-3456789',
      addressLine1: '100 Main Street',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      email: 'admin@democorp.com',
      phone: '512-555-0100',
    },
  });

  const company = await prisma.company.upsert({
    where: { ein: '98-7654321' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Demo Corp LLC',
      ein: '98-7654321',
      addressLine1: '200 Tech Blvd',
      city: 'Austin',
      state: 'TX',
      zip: '78702',
      email: 'payroll@democorp.com',
      phone: '512-555-0200',
      payFrequency: 'BIWEEKLY',
    },
  });

  // Register TX for SUI
  await prisma.companyState.upsert({
    where: { companyId_state: { companyId: company.id, state: 'TX' } },
    update: {},
    create: {
      companyId: company.id,
      state: 'TX',
      suiAccountNumber: 'TX-1234567',
      suiRate: 0.027,
      filingFrequency: 'QUARTERLY',
    },
  });

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@democorp.com' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@democorp.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      role: 'ADMIN',
    },
  });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: adminUser.id, companyId: company.id } },
    update: {},
    create: {
      userId: adminUser.id,
      companyId: company.id,
      role: 'ADMIN',
    },
  });

  // Demo employees
  const emp1 = await prisma.employee.upsert({
    where: { companyId_employeeNumber: { companyId: company.id, employeeNumber: 'E001' } },
    update: {},
    create: {
      companyId: company.id,
      employeeNumber: 'E001',
      firstName: 'Jane',
      lastName: 'Smith',
      ssn: 'ENCRYPTED:123-45-6789',
      dateOfBirth: new Date('1985-06-15'),
      hireDate: new Date('2020-01-06'),
      email: 'jane.smith@democorp.com',
      addressLine1: '123 Oak Ave',
      city: 'Austin',
      state: 'TX',
      zip: '78703',
      employeeType: 'FTE',
      annualSalary: 85000,
      payFrequency: 'BIWEEKLY',
      residentState: 'TX',
      workState: 'TX',
    },
  });

  await prisma.w4Profile.upsert({
    where: { employeeId: emp1.id },
    update: {},
    create: {
      employeeId: emp1.id,
      taxYear: 2024,
      filingStatus: 'SINGLE',
      multipleJobs: false,
      claimDependents: 0,
      otherIncome: 0,
      deductionsAmount: 0,
      additionalWithholding: 0,
      exemptFromFIT: false,
      exemptFromFICA: false,
    },
  });

  await prisma.employeeDeduction.create({
    data: {
      employeeId: emp1.id,
      code: '401K',
      description: '401(k) Employee Contribution',
      percentage: 0.06,
      preTax: true,
      employeeShare: 1.0,
      employerShare: 0.0,
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { companyId_employeeNumber: { companyId: company.id, employeeNumber: 'E002' } },
    update: {},
    create: {
      companyId: company.id,
      employeeNumber: 'E002',
      firstName: 'John',
      lastName: 'Doe',
      ssn: 'ENCRYPTED:987-65-4321',
      dateOfBirth: new Date('1990-03-22'),
      hireDate: new Date('2021-03-15'),
      email: 'john.doe@democorp.com',
      addressLine1: '456 Pine St',
      city: 'Austin',
      state: 'TX',
      zip: '78704',
      employeeType: 'HOURLY',
      hourlyRate: 28.5,
      defaultHours: 80,
      overtimeEligible: true,
      residentState: 'TX',
      workState: 'TX',
    },
  });

  await prisma.w4Profile.upsert({
    where: { employeeId: emp2.id },
    update: {},
    create: {
      employeeId: emp2.id,
      taxYear: 2024,
      filingStatus: 'MARRIED_FILING_JOINTLY',
      multipleJobs: false,
      claimDependents: 4000,
      otherIncome: 0,
      deductionsAmount: 0,
      additionalWithholding: 0,
      exemptFromFIT: false,
      exemptFromFICA: false,
    },
  });

  console.log('Seed completed successfully!');
  console.log(`Organization: ${org.name} (${org.id})`);
  console.log(`Company: ${company.name} (${company.id})`);
  console.log(`Admin user: ${adminUser.email} / Admin@123`);
  console.log(`Employees: ${emp1.employeeNumber} (FTE), ${emp2.employeeNumber} (Hourly)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
