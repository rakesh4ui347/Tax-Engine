'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, US_STATES } from '@/lib/utils';
import { EmployeeType, PayFrequency } from '@/types/api';
import { Calculator, Info } from 'lucide-react';

// ─── 2025 Federal Tax Tables (IRS Rev. Proc. 2024-40) ────────────────────────

const STD_DEDUCTION: Record<string, number> = {
  SINGLE: 15000,
  MARRIED_FILING_JOINTLY: 30000,
  HEAD_OF_HOUSEHOLD: 22500,
  MARRIED_FILING_SEPARATELY: 15000,
};

type Bracket = [number, number, number]; // [min, max, rate]

const BRACKETS: Record<string, Bracket[]> = {
  SINGLE: [
    [0, 11925, 0.10],
    [11925, 48475, 0.12],
    [48475, 103350, 0.22],
    [103350, 197300, 0.24],
    [197300, 250525, 0.32],
    [250525, 626350, 0.35],
    [626350, Infinity, 0.37],
  ],
  MARRIED_FILING_JOINTLY: [
    [0, 23850, 0.10],
    [23850, 96950, 0.12],
    [96950, 206700, 0.22],
    [206700, 394600, 0.24],
    [394600, 501050, 0.32],
    [501050, 751600, 0.35],
    [751600, Infinity, 0.37],
  ],
  HEAD_OF_HOUSEHOLD: [
    [0, 17000, 0.10],
    [17000, 64850, 0.12],
    [64850, 103350, 0.22],
    [103350, 197300, 0.24],
    [197300, 250500, 0.32],
    [250500, 626350, 0.35],
    [626350, Infinity, 0.37],
  ],
  MARRIED_FILING_SEPARATELY: [
    [0, 11925, 0.10],
    [11925, 48475, 0.12],
    [48475, 103350, 0.22],
    [103350, 197300, 0.24],
    [197300, 250525, 0.32],
    [250525, 375800, 0.35],
    [375800, Infinity, 0.37],
  ],
};

const SS_WAGE_BASE = 176100;
const SS_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLD: Record<string, number> = {
  SINGLE: 200000,
  MARRIED_FILING_JOINTLY: 250000,
  HEAD_OF_HOUSEHOLD: 200000,
  MARRIED_FILING_SEPARATELY: 125000,
};

// ─── State Income Tax Configuration (2025) ───────────────────────────────────
// Per-state: progressive brackets OR flat rate, plus standard deduction,
// personal exemption (deduction or credit). All based on 2025 official tables.

interface StateIncomeTaxConfig {
  brackets?: Partial<Record<string, Bracket[]>>;   // progressive
  flatRate?: number;                                // truly flat
  stdDeduction?: Partial<Record<string, number>>;  // reduces taxable income
  exemptionDeduction?: Partial<Record<string, number>>; // reduces taxable income
  exemptionCredit?: Partial<Record<string, number>>;    // reduces tax owed
}

const S = Infinity; // shorthand for top bracket ceiling

const STATE_INCOME_TAX: Record<string, StateIncomeTaxConfig> = {
  // ── No income tax ──────────────────────────────────────────────────────────
  AK: { flatRate: 0 }, FL: { flatRate: 0 }, NV: { flatRate: 0 },
  NH: { flatRate: 0 }, SD: { flatRate: 0 }, TN: { flatRate: 0 },
  TX: { flatRate: 0 }, WA: { flatRate: 0 }, WY: { flatRate: 0 },

  // ── Flat-tax states ────────────────────────────────────────────────────────
  AR: { flatRate: 0.039, stdDeduction: { SINGLE: 2200, MARRIED_FILING_JOINTLY: 4400, HEAD_OF_HOUSEHOLD: 2200 } },
  AZ: { flatRate: 0.025 },
  CO: { flatRate: 0.044 },
  GA: { flatRate: 0.0549, stdDeduction: { SINGLE: 12000, MARRIED_FILING_JOINTLY: 24000, HEAD_OF_HOUSEHOLD: 18000 } },
  IA: { flatRate: 0.038, stdDeduction: { SINGLE: 14600, MARRIED_FILING_JOINTLY: 29200, HEAD_OF_HOUSEHOLD: 14600 } },
  ID: { flatRate: 0.058, stdDeduction: { SINGLE: 14600, MARRIED_FILING_JOINTLY: 29200, HEAD_OF_HOUSEHOLD: 14600 } },
  IL: { flatRate: 0.0495, exemptionDeduction: { SINGLE: 2425, MARRIED_FILING_JOINTLY: 4850, HEAD_OF_HOUSEHOLD: 2425 } },
  IN: { flatRate: 0.0305, exemptionDeduction: { SINGLE: 1000, MARRIED_FILING_JOINTLY: 2000, HEAD_OF_HOUSEHOLD: 1500 } },
  KY: { flatRate: 0.040, stdDeduction: { SINGLE: 3160, MARRIED_FILING_JOINTLY: 3160, HEAD_OF_HOUSEHOLD: 3160 } },
  LA: { flatRate: 0.030, stdDeduction: { SINGLE: 12500, MARRIED_FILING_JOINTLY: 25000, HEAD_OF_HOUSEHOLD: 12500 } },
  MA: { flatRate: 0.050, exemptionDeduction: { SINGLE: 4400, MARRIED_FILING_JOINTLY: 8800, HEAD_OF_HOUSEHOLD: 6800 } },
  MI: { flatRate: 0.0425, exemptionDeduction: { SINGLE: 5600, MARRIED_FILING_JOINTLY: 11200, HEAD_OF_HOUSEHOLD: 5600 } },
  MS: { flatRate: 0.047, stdDeduction: { SINGLE: 2300, MARRIED_FILING_JOINTLY: 4600, HEAD_OF_HOUSEHOLD: 3400 } },
  NC: { flatRate: 0.0425, stdDeduction: { SINGLE: 12750, MARRIED_FILING_JOINTLY: 25500, HEAD_OF_HOUSEHOLD: 19125 } },
  ND: { flatRate: 0.025 },
  PA: { flatRate: 0.0307 },
  UT: { flatRate: 0.0465, exemptionCredit: { SINGLE: 885, MARRIED_FILING_JOINTLY: 1770, HEAD_OF_HOUSEHOLD: 885 } },

  // ── Progressive states ─────────────────────────────────────────────────────
  AL: {
    brackets: {
      SINGLE:                [[0,500,0.02],[500,3000,0.04],[3000,S,0.05]],
      MARRIED_FILING_JOINTLY:[[0,1000,0.02],[1000,6000,0.04],[6000,S,0.05]],
    },
    stdDeduction: { SINGLE: 2500, MARRIED_FILING_JOINTLY: 7500, HEAD_OF_HOUSEHOLD: 4700 },
    exemptionDeduction: { SINGLE: 1500, MARRIED_FILING_JOINTLY: 3000, HEAD_OF_HOUSEHOLD: 3000 },
  },
  CA: {
    brackets: {
      SINGLE:                [[0,10756,0.01],[10756,25499,0.02],[25499,40245,0.04],[40245,55866,0.06],[55866,70606,0.08],[70606,360659,0.093],[360659,432787,0.103],[432787,721314,0.113],[721314,S,0.123]],
      MARRIED_FILING_JOINTLY:[[0,21512,0.01],[21512,50998,0.02],[50998,80490,0.04],[80490,111732,0.06],[111732,141212,0.08],[141212,721318,0.093],[721318,865574,0.103],[865574,1000000,0.113],[1000000,S,0.123]],
      HEAD_OF_HOUSEHOLD:     [[0,21527,0.01],[21527,51000,0.02],[51000,65744,0.04],[65744,81364,0.06],[81364,96107,0.08],[96107,490493,0.093],[490493,588593,0.103],[588593,980987,0.113],[980987,S,0.123]],
      MARRIED_FILING_SEPARATELY:[[0,10756,0.01],[10756,25499,0.02],[25499,40245,0.04],[40245,55866,0.06],[55866,70606,0.08],[70606,360659,0.093],[360659,432787,0.103],[432787,500000,0.113],[500000,S,0.123]],
    },
    stdDeduction: { SINGLE: 5540, MARRIED_FILING_JOINTLY: 11080, HEAD_OF_HOUSEHOLD: 11080, MARRIED_FILING_SEPARATELY: 5540 },
    exemptionCredit: { SINGLE: 144, MARRIED_FILING_JOINTLY: 288, HEAD_OF_HOUSEHOLD: 433, MARRIED_FILING_SEPARATELY: 144 },
  },
  CT: {
    brackets: {
      SINGLE:                [[0,10000,0.02],[10000,50000,0.045],[50000,100000,0.055],[100000,200000,0.06],[200000,250000,0.065],[250000,500000,0.069],[500000,S,0.0699]],
      MARRIED_FILING_JOINTLY:[[0,20000,0.02],[20000,100000,0.045],[100000,200000,0.055],[200000,400000,0.06],[400000,500000,0.065],[500000,1000000,0.069],[1000000,S,0.0699]],
    },
    exemptionDeduction: { SINGLE: 15000, MARRIED_FILING_JOINTLY: 24000, HEAD_OF_HOUSEHOLD: 19000 },
  },
  DC: {
    brackets: {
      SINGLE:                [[0,10000,0.04],[10000,40000,0.06],[40000,60000,0.065],[60000,250000,0.085],[250000,500000,0.0925],[500000,1000000,0.0975],[1000000,S,0.1075]],
      MARRIED_FILING_JOINTLY:[[0,10000,0.04],[10000,40000,0.06],[40000,60000,0.065],[60000,250000,0.085],[250000,500000,0.0925],[500000,1000000,0.0975],[1000000,S,0.1075]],
    },
    stdDeduction: { SINGLE: 14600, MARRIED_FILING_JOINTLY: 29200, HEAD_OF_HOUSEHOLD: 14600 },
  },
  DE: {
    brackets: {
      SINGLE:                [[0,2000,0],[2000,5000,0.022],[5000,10000,0.039],[10000,20000,0.048],[20000,25000,0.052],[25000,60000,0.0555],[60000,S,0.066]],
      MARRIED_FILING_JOINTLY:[[0,2000,0],[2000,5000,0.022],[5000,10000,0.039],[10000,20000,0.048],[20000,25000,0.052],[25000,60000,0.0555],[60000,S,0.066]],
    },
    stdDeduction: { SINGLE: 3250, MARRIED_FILING_JOINTLY: 6500, HEAD_OF_HOUSEHOLD: 3250 },
    exemptionDeduction: { SINGLE: 110, MARRIED_FILING_JOINTLY: 220, HEAD_OF_HOUSEHOLD: 110 },
  },
  HI: {
    brackets: {
      SINGLE:                [[0,2400,0.014],[2400,4800,0.032],[4800,9600,0.055],[9600,14400,0.064],[14400,19200,0.068],[19200,24000,0.072],[24000,36000,0.076],[36000,48000,0.079],[48000,150000,0.0825],[150000,175000,0.09],[175000,200000,0.10],[200000,S,0.11]],
      MARRIED_FILING_JOINTLY:[[0,4800,0.014],[4800,9600,0.032],[9600,19200,0.055],[19200,28800,0.064],[28800,38400,0.068],[38400,48000,0.072],[48000,72000,0.076],[72000,96000,0.079],[96000,300000,0.0825],[300000,350000,0.09],[350000,400000,0.10],[400000,S,0.11]],
    },
    stdDeduction: { SINGLE: 2200, MARRIED_FILING_JOINTLY: 4400, HEAD_OF_HOUSEHOLD: 3212 },
    exemptionDeduction: { SINGLE: 1144, MARRIED_FILING_JOINTLY: 2288, HEAD_OF_HOUSEHOLD: 1144 },
  },
  KS: {
    brackets: {
      SINGLE:                [[0,15000,0.031],[15000,30000,0.0525],[30000,S,0.057]],
      MARRIED_FILING_JOINTLY:[[0,30000,0.031],[30000,60000,0.0525],[60000,S,0.057]],
    },
    stdDeduction: { SINGLE: 3500, MARRIED_FILING_JOINTLY: 8000, HEAD_OF_HOUSEHOLD: 6000 },
    exemptionDeduction: { SINGLE: 2250, MARRIED_FILING_JOINTLY: 4500, HEAD_OF_HOUSEHOLD: 2250 },
  },
  MD: {
    brackets: {
      SINGLE:                [[0,1000,0.02],[1000,2000,0.03],[2000,3000,0.04],[3000,100000,0.0475],[100000,125000,0.05],[125000,150000,0.0525],[150000,250000,0.055],[250000,S,0.0575]],
      MARRIED_FILING_JOINTLY:[[0,1000,0.02],[1000,2000,0.03],[2000,3000,0.04],[3000,150000,0.0475],[150000,175000,0.05],[175000,225000,0.0525],[225000,300000,0.055],[300000,S,0.0575]],
    },
    stdDeduction: { SINGLE: 2400, MARRIED_FILING_JOINTLY: 4850, HEAD_OF_HOUSEHOLD: 2400 },
    exemptionDeduction: { SINGLE: 3200, MARRIED_FILING_JOINTLY: 6400, HEAD_OF_HOUSEHOLD: 3200 },
  },
  ME: {
    brackets: {
      SINGLE:                [[0,24500,0.058],[24500,58050,0.0675],[58050,S,0.0715]],
      MARRIED_FILING_JOINTLY:[[0,49050,0.058],[49050,116100,0.0675],[116100,S,0.0715]],
    },
    stdDeduction: { SINGLE: 14600, MARRIED_FILING_JOINTLY: 29200, HEAD_OF_HOUSEHOLD: 14600 },
    exemptionDeduction: { SINGLE: 4700, MARRIED_FILING_JOINTLY: 9400, HEAD_OF_HOUSEHOLD: 4700 },
  },
  MN: {
    brackets: {
      SINGLE:                [[0,31690,0.0535],[31690,104090,0.068],[104090,193240,0.0785],[193240,S,0.0985]],
      MARRIED_FILING_JOINTLY:[[0,46330,0.0535],[46330,184040,0.068],[184040,321450,0.0785],[321450,S,0.0985]],
      HEAD_OF_HOUSEHOLD:     [[0,39630,0.0535],[39630,159140,0.068],[159140,268150,0.0785],[268150,S,0.0985]],
    },
    stdDeduction: { SINGLE: 14575, MARRIED_FILING_JOINTLY: 29150, HEAD_OF_HOUSEHOLD: 14575 },
  },
  MO: {
    brackets: {
      SINGLE:                [[0,1207,0.015],[1207,2414,0.02],[2414,3621,0.025],[3621,4828,0.03],[4828,6035,0.035],[6035,7242,0.04],[7242,8449,0.045],[8449,S,0.047]],
      MARRIED_FILING_JOINTLY:[[0,1207,0.015],[1207,2414,0.02],[2414,3621,0.025],[3621,4828,0.03],[4828,6035,0.035],[6035,7242,0.04],[7242,8449,0.045],[8449,S,0.047]],
    },
    stdDeduction: { SINGLE: 14600, MARRIED_FILING_JOINTLY: 29200, HEAD_OF_HOUSEHOLD: 14600 },
  },
  MT: {
    brackets: {
      SINGLE:                [[0,20500,0.047],[20500,S,0.059]],
      MARRIED_FILING_JOINTLY:[[0,41000,0.047],[41000,S,0.059]],
    },
    stdDeduction: { SINGLE: 5420, MARRIED_FILING_JOINTLY: 10840, HEAD_OF_HOUSEHOLD: 5420 },
    exemptionDeduction: { SINGLE: 2580, MARRIED_FILING_JOINTLY: 5160, HEAD_OF_HOUSEHOLD: 2580 },
  },
  NE: {
    brackets: {
      SINGLE:                [[0,3700,0.0246],[3700,22170,0.0351],[22170,35730,0.0501],[35730,S,0.0584]],
      MARRIED_FILING_JOINTLY:[[0,7390,0.0246],[7390,44350,0.0351],[44350,71460,0.0501],[71460,S,0.0584]],
    },
    stdDeduction: { SINGLE: 7900, MARRIED_FILING_JOINTLY: 15800, HEAD_OF_HOUSEHOLD: 7900 },
  },
  NJ: {
    brackets: {
      SINGLE:                [[0,20000,0.014],[20000,35000,0.0175],[35000,40000,0.035],[40000,75000,0.05525],[75000,500000,0.0637],[500000,1000000,0.0897],[1000000,S,0.1075]],
      MARRIED_FILING_JOINTLY:[[0,20000,0.014],[20000,50000,0.0175],[50000,70000,0.0245],[70000,80000,0.035],[80000,150000,0.05525],[150000,500000,0.0637],[500000,1000000,0.0897],[1000000,S,0.1075]],
    },
    exemptionDeduction: { SINGLE: 1000, MARRIED_FILING_JOINTLY: 2000, HEAD_OF_HOUSEHOLD: 1500 },
  },
  NM: {
    brackets: {
      SINGLE:                [[0,5500,0.017],[5500,11000,0.032],[11000,16000,0.047],[16000,210000,0.049],[210000,S,0.059]],
      MARRIED_FILING_JOINTLY:[[0,8000,0.017],[8000,16000,0.032],[16000,24000,0.047],[24000,315000,0.049],[315000,S,0.059]],
    },
    exemptionDeduction: { SINGLE: 4000, MARRIED_FILING_JOINTLY: 8000, HEAD_OF_HOUSEHOLD: 4000 },
  },
  NY: {
    brackets: {
      SINGLE:                [[0,8500,0.04],[8500,11700,0.045],[11700,13900,0.0525],[13900,80650,0.0585],[80650,215400,0.0625],[215400,1077550,0.0685],[1077550,5000000,0.0965],[5000000,25000000,0.103],[25000000,S,0.109]],
      MARRIED_FILING_JOINTLY:[[0,17150,0.04],[17150,23600,0.045],[23600,27900,0.0525],[27900,161550,0.0585],[161550,323200,0.0625],[323200,2155350,0.0685],[2155350,5000000,0.0965],[5000000,25000000,0.103],[25000000,S,0.109]],
      HEAD_OF_HOUSEHOLD:     [[0,12800,0.04],[12800,17650,0.045],[17650,20900,0.0525],[20900,107650,0.0585],[107650,269300,0.0625],[269300,1616450,0.0685],[1616450,5000000,0.0965],[5000000,25000000,0.103],[25000000,S,0.109]],
    },
    stdDeduction: { SINGLE: 8000, MARRIED_FILING_JOINTLY: 16050, HEAD_OF_HOUSEHOLD: 11200, MARRIED_FILING_SEPARATELY: 8000 },
  },
  OH: {
    brackets: {
      SINGLE:                [[0,26050,0],[26050,46100,0.02765],[46100,92150,0.03226],[92150,115300,0.03688],[115300,S,0.0399]],
      MARRIED_FILING_JOINTLY:[[0,26050,0],[26050,46100,0.02765],[46100,92150,0.03226],[92150,115300,0.03688],[115300,S,0.0399]],
    },
    exemptionDeduction: { SINGLE: 2400, MARRIED_FILING_JOINTLY: 4800, HEAD_OF_HOUSEHOLD: 2400 },
  },
  OK: {
    brackets: {
      SINGLE:                [[0,1000,0.005],[1000,2500,0.01],[2500,3750,0.02],[3750,4900,0.03],[4900,7200,0.04],[7200,S,0.0475]],
      MARRIED_FILING_JOINTLY:[[0,2000,0.005],[2000,5000,0.01],[5000,7500,0.02],[7500,9800,0.03],[9800,12200,0.04],[12200,S,0.0475]],
    },
    stdDeduction: { SINGLE: 6350, MARRIED_FILING_JOINTLY: 12700, HEAD_OF_HOUSEHOLD: 9350 },
    exemptionDeduction: { SINGLE: 1000, MARRIED_FILING_JOINTLY: 2000, HEAD_OF_HOUSEHOLD: 1000 },
  },
  OR: {
    brackets: {
      SINGLE:                [[0,18400,0.0475],[18400,250000,0.0675],[250000,400000,0.0875],[400000,S,0.099]],
      MARRIED_FILING_JOINTLY:[[0,18400,0.0475],[18400,250000,0.0675],[250000,400000,0.0875],[400000,S,0.099]],
    },
    stdDeduction: { SINGLE: 2745, MARRIED_FILING_JOINTLY: 5495, HEAD_OF_HOUSEHOLD: 2745 },
    exemptionCredit: { SINGLE: 236, MARRIED_FILING_JOINTLY: 472, HEAD_OF_HOUSEHOLD: 236 },
  },
  RI: {
    brackets: {
      SINGLE:                [[0,77450,0.0375],[77450,176050,0.0475],[176050,S,0.0599]],
      MARRIED_FILING_JOINTLY:[[0,154900,0.0375],[154900,352100,0.0475],[352100,S,0.0599]],
    },
    stdDeduction: { SINGLE: 10550, MARRIED_FILING_JOINTLY: 21100, HEAD_OF_HOUSEHOLD: 10550 },
    exemptionDeduction: { SINGLE: 4750, MARRIED_FILING_JOINTLY: 9500, HEAD_OF_HOUSEHOLD: 4750 },
  },
  SC: {
    brackets: {
      SINGLE:                [[0,3460,0],[3460,17330,0.03],[17330,S,0.064]],
      MARRIED_FILING_JOINTLY:[[0,3460,0],[3460,17330,0.03],[17330,S,0.064]],
    },
    stdDeduction: { SINGLE: 14600, MARRIED_FILING_JOINTLY: 29200, HEAD_OF_HOUSEHOLD: 14600 },
    exemptionDeduction: { SINGLE: 4610, MARRIED_FILING_JOINTLY: 9220, HEAD_OF_HOUSEHOLD: 4610 },
  },
  VA: {
    brackets: {
      SINGLE:                [[0,3000,0.02],[3000,5000,0.03],[5000,17000,0.05],[17000,S,0.0575]],
      MARRIED_FILING_JOINTLY:[[0,3000,0.02],[3000,5000,0.03],[5000,17000,0.05],[17000,S,0.0575]],
    },
    stdDeduction: { SINGLE: 8000, MARRIED_FILING_JOINTLY: 16000, HEAD_OF_HOUSEHOLD: 8000 },
    exemptionDeduction: { SINGLE: 930, MARRIED_FILING_JOINTLY: 1860, HEAD_OF_HOUSEHOLD: 930 },
  },
  VT: {
    brackets: {
      SINGLE:                [[0,45400,0.0335],[45400,110050,0.066],[110050,229550,0.076],[229550,S,0.0875]],
      MARRIED_FILING_JOINTLY:[[0,75850,0.0335],[75850,183400,0.066],[183400,236350,0.076],[236350,S,0.0875]],
    },
    stdDeduction: { SINGLE: 14600, MARRIED_FILING_JOINTLY: 29200, HEAD_OF_HOUSEHOLD: 14600 },
    exemptionDeduction: { SINGLE: 4600, MARRIED_FILING_JOINTLY: 9200, HEAD_OF_HOUSEHOLD: 4600 },
  },
  WI: {
    brackets: {
      SINGLE:                [[0,14320,0.035],[14320,28640,0.044],[28640,315310,0.053],[315310,S,0.0765]],
      MARRIED_FILING_JOINTLY:[[0,19090,0.035],[19090,38190,0.044],[38190,420420,0.053],[420420,S,0.0765]],
    },
    stdDeduction: { SINGLE: 12400, MARRIED_FILING_JOINTLY: 22270, HEAD_OF_HOUSEHOLD: 12400 },
  },
  WV: {
    brackets: {
      SINGLE:                [[0,10000,0.0236],[10000,25000,0.0315],[25000,40000,0.0354],[40000,60000,0.0472],[60000,S,0.0512]],
      MARRIED_FILING_JOINTLY:[[0,10000,0.0236],[10000,25000,0.0315],[25000,40000,0.0354],[40000,60000,0.0472],[60000,S,0.0512]],
    },
  },
};

function getByFs(obj: Partial<Record<string, number>> | undefined, fs: string): number {
  return obj?.[fs] ?? obj?.['SINGLE'] ?? 0;
}

function calcStateTax(annualWage: number, state: string, filingStatus: string): number {
  if (!state) return 0;
  const cfg = STATE_INCOME_TAX[state];
  if (!cfg) return 0;
  const fs = filingStatus === 'QUALIFYING_WIDOW' ? 'MARRIED_FILING_JOINTLY' : filingStatus;

  const stdDed = getByFs(cfg.stdDeduction, fs);
  const exemptDed = getByFs(cfg.exemptionDeduction, fs);
  const taxable = Math.max(0, annualWage - stdDed - exemptDed);

  let tax: number;
  if (cfg.brackets) {
    const bkts = (cfg.brackets[fs] ?? cfg.brackets['SINGLE'] ?? []) as Bracket[];
    tax = 0;
    for (const [min, max, rate] of bkts) {
      if (taxable <= min) break;
      tax += (Math.min(taxable, max) - min) * rate;
    }
  } else {
    tax = taxable * (cfg.flatRate ?? 0);
  }
  const exemptCredit = getByFs(cfg.exemptionCredit, fs);
  return Math.max(0, tax - exemptCredit);
}

// ─── State-level employee payroll taxes (SDI / TDI / PFL) — 2025 ─────────────
interface StateTax { label: string; rate: number; wageBase: number; }
const STATE_PAYROLL_TAXES: Record<string, StateTax> = {
  CA: { label: 'CA SDI',    rate: 0.011,  wageBase: Infinity }, // SB 951: no wage base cap
  HI: { label: 'HI TDI',   rate: 0.005,  wageBase: 73241 },
  MA: { label: 'MA PFML',  rate: 0.0046, wageBase: 176100 },
  NJ: { label: 'NJ DI+FLI',rate: 0.0056, wageBase: 161400 },
  NY: { label: 'NY PFL',   rate: 0.00373,wageBase: 89835 },
  OR: { label: 'OR PFML',  rate: 0.006,  wageBase: 176100 },
  RI: { label: 'RI TDI',   rate: 0.013,  wageBase: 87000 },
  WA: { label: 'WA PFML',  rate: 0.0046, wageBase: 176100 },
};

const PAY_PERIODS: Record<PayFrequency, number> = {
  [PayFrequency.WEEKLY]: 52,
  [PayFrequency.BIWEEKLY]: 26,
  [PayFrequency.SEMIMONTHLY]: 24,
  [PayFrequency.MONTHLY]: 12,
};

function calcFederalTax(annualWage: number, filingStatus: string): number {
  const brackets = BRACKETS[filingStatus] ?? BRACKETS.SINGLE;
  const stdDed = STD_DEDUCTION[filingStatus] ?? 15000;
  const taxable = Math.max(0, annualWage - stdDed);
  let tax = 0;
  for (const [min, max, rate] of brackets) {
    if (taxable <= min) break;
    tax += (Math.min(taxable, max) - min) * rate;
  }
  return tax;
}

interface CalcResult {
  grossPay: number;
  annualGross: number;
  preTaxDeductions: number;
  taxableWage: number;
  federalTax: number;
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  stateTax: number;
  statePayrollTax: number;
  statePayrollTaxLabel: string;
  totalTax: number;
  netPay: number;
  effectiveFederalRate: number;
}

function calculate(
  empType: EmployeeType,
  payFreq: PayFrequency,
  annualSalary: number,
  hourlyRate: number,
  hoursPerPeriod: number,
  filingStatus: string,
  state: string,
  preTaxDeductionsPerPeriod: number,
  additionalWithholding: number,
): CalcResult {
  const periods = PAY_PERIODS[payFreq] ?? 26;

  // For FTE: annualGross is the exact annual salary (no floating-point drift).
  // For HOURLY: annualGross is rate × hours × periods.
  const annualGross =
    empType === EmployeeType.FTE
      ? annualSalary
      : hourlyRate * hoursPerPeriod * periods;
  const grossPay = annualGross / periods;
  const annualPreTax = preTaxDeductionsPerPeriod * periods;
  const taxableWageAnnual = Math.max(0, annualGross - annualPreTax);

  const federalAnnual = calcFederalTax(taxableWageAnnual, filingStatus);
  const federalPerPeriod = federalAnnual / periods + additionalWithholding;

  const ssTaxable = Math.min(annualGross, SS_WAGE_BASE);
  const ssAnnual = ssTaxable * SS_RATE;
  const medicareAnnual = annualGross * MEDICARE_RATE;
  const addMedThreshold = ADDITIONAL_MEDICARE_THRESHOLD[filingStatus] ?? 200000;
  const addMedAnnual = Math.max(0, annualGross - addMedThreshold) * ADDITIONAL_MEDICARE_RATE;

  const stateAnnual = calcStateTax(taxableWageAnnual, state, filingStatus);

  // State payroll taxes (SDI/TDI/PFL) — applied to gross, not taxable wages
  const spt = STATE_PAYROLL_TAXES[state];
  const statePayrollTaxAnnual = spt
    ? Math.min(annualGross, spt.wageBase) * spt.rate
    : 0;
  const statePayrollTaxLabel = spt?.label ?? '';

  const totalTaxAnnual = federalAnnual + ssAnnual + medicareAnnual + addMedAnnual + stateAnnual + statePayrollTaxAnnual;
  const netPayAnnual = annualGross - annualPreTax - totalTaxAnnual;

  return {
    grossPay,
    annualGross,
    preTaxDeductions: preTaxDeductionsPerPeriod,
    taxableWage: taxableWageAnnual / periods,
    federalTax: federalPerPeriod,
    socialSecurity: ssAnnual / periods,
    medicare: medicareAnnual / periods,
    additionalMedicare: addMedAnnual / periods,
    stateTax: stateAnnual / periods,
    statePayrollTax: statePayrollTaxAnnual / periods,
    statePayrollTaxLabel,
    totalTax: totalTaxAnnual / periods,
    netPay: netPayAnnual / periods,
    effectiveFederalRate: annualGross > 0 ? federalAnnual / annualGross : 0,
  };
}

const filingStatusOptions = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED_FILING_JOINTLY', label: 'Married Filing Jointly' },
  { value: 'MARRIED_FILING_SEPARATELY', label: 'Married Filing Separately' },
  { value: 'HEAD_OF_HOUSEHOLD', label: 'Head of Household' },
];

const empTypeOptions = [
  { value: EmployeeType.FTE, label: 'Salaried (FTE)' },
  { value: EmployeeType.HOURLY, label: 'Hourly' },
];

const freqOptions = [
  { value: PayFrequency.WEEKLY, label: 'Weekly (52×)' },
  { value: PayFrequency.BIWEEKLY, label: 'Bi-weekly (26×)' },
  { value: PayFrequency.SEMIMONTHLY, label: 'Semi-monthly (24×)' },
  { value: PayFrequency.MONTHLY, label: 'Monthly (12×)' },
];

const stateOptions = [
  { value: '', label: 'No State Tax' },
  ...US_STATES.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` })),
];

export default function TaxCalculatorPage() {
  const [empType, setEmpType] = useState<EmployeeType>(EmployeeType.FTE);
  const [payFreq, setPayFreq] = useState<PayFrequency>(PayFrequency.BIWEEKLY);
  const [annualSalary, setAnnualSalary] = useState(75000);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [hoursPerPeriod, setHoursPerPeriod] = useState(80);
  const [filingStatus, setFilingStatus] = useState('SINGLE');
  const [state, setState] = useState('TX');
  const [preTaxDeductions, setPreTaxDeductions] = useState(0);
  const [additionalWithholding, setAdditionalWithholding] = useState(0);

  const isHourly = empType === EmployeeType.HOURLY;
  const periods = PAY_PERIODS[payFreq];

  const result = useMemo(() => calculate(
    empType, payFreq, annualSalary, hourlyRate, hoursPerPeriod,
    filingStatus, state, preTaxDeductions, additionalWithholding,
  ), [empType, payFreq, annualSalary, hourlyRate, hoursPerPeriod,
      filingStatus, state, preTaxDeductions, additionalWithholding]);

  const stateCfg = STATE_INCOME_TAX[state];
  const isProgressiveState = !!stateCfg?.brackets;
  const effectiveStateRate = result.annualGross > 0 ? (result.stateTax * PAY_PERIODS[payFreq]) / result.annualGross : 0;
  const stateTaxLabel = !state
    ? 'State Income Tax'
    : isProgressiveState
      ? `${state} Income Tax (~${(effectiveStateRate * 100).toFixed(2)}% eff.)`
      : `${state} Income Tax (${((stateCfg?.flatRate ?? 0) * 100).toFixed(2)}%)`;

  const rows = [
    { label: 'Gross Pay', value: result.grossPay, bold: true, color: '' },
    { label: 'Pre-Tax Deductions', value: -result.preTaxDeductions, color: 'text-slate-500' },
    { label: 'Taxable Wages', value: result.taxableWage, bold: true, color: 'text-slate-700', divider: true },
    { label: 'Federal Income Tax', value: -result.federalTax, color: 'text-primary-600' },
    { label: 'Social Security (6.2%)', value: -result.socialSecurity, color: 'text-warning-600' },
    { label: 'Medicare (1.45%)', value: -result.medicare, color: 'text-warning-600' },
    ...(result.additionalMedicare > 0 ? [{ label: 'Additional Medicare (0.9%)', value: -result.additionalMedicare, color: 'text-warning-600' }] : []),
    { label: stateTaxLabel, value: -result.stateTax, color: 'text-success-700' },
    ...(result.statePayrollTax > 0 ? [{ label: result.statePayrollTaxLabel, value: -result.statePayrollTax, color: 'text-success-700' }] : []),
    { label: 'Total Taxes', value: -result.totalTax, bold: true, color: 'text-slate-700', divider: true },
    { label: 'Net Pay', value: result.netPay, bold: true, color: 'text-success-700', large: true },
  ];

  return (
    <div>
      <PageHeader
        title="Tax Calculator"
        description="Estimate per-period taxes using 2025 IRS tables and state rates"
        breadcrumbs={[{ label: 'Tax Calculator' }]}
      />

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* ── Inputs Panel ── */}
          <div className="xl:col-span-2 space-y-5">
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                Employee & Pay
              </h3>
              <div className="space-y-4">
                <Select
                  label="Employee Type"
                  options={empTypeOptions}
                  value={empType}
                  onChange={(e) => setEmpType(e.target.value as EmployeeType)}
                />
                <Select
                  label="Pay Frequency"
                  options={freqOptions}
                  value={payFreq}
                  onChange={(e) => setPayFreq(e.target.value as PayFrequency)}
                />
                {isHourly ? (
                  <>
                    <Input
                      label="Hourly Rate ($)"
                      type="number"
                      step="0.01"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                    />
                    <Input
                      label={`Hours per Pay Period`}
                      type="number"
                      value={hoursPerPeriod}
                      onChange={(e) => setHoursPerPeriod(Number(e.target.value))}
                      hint={`${periods} periods/year = ${formatCurrency(hourlyRate * hoursPerPeriod * periods)}/yr`}
                    />
                  </>
                ) : (
                  <Input
                    label="Annual Salary ($)"
                    type="number"
                    step="1000"
                    value={annualSalary}
                    onChange={(e) => setAnnualSalary(Number(e.target.value))}
                    hint={`${formatCurrency(annualSalary / periods)}/period (${periods} periods)`}
                  />
                )}
              </div>
            </Card>

            <Card padding="lg">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                Tax Settings
              </h3>
              <div className="space-y-4">
                <Select
                  label="Filing Status (W-4)"
                  options={filingStatusOptions}
                  value={filingStatus}
                  onChange={(e) => setFilingStatus(e.target.value)}
                />
                <Select
                  label="Work State"
                  options={stateOptions}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  hint={(() => {
                    if (!state) return 'No state income tax';
                    const cfg = STATE_INCOME_TAX[state];
                    const spt = STATE_PAYROLL_TAXES[state];
                    const sptLabel = spt ? ` + ${spt.label}` : '';
                    if (!cfg) return 'No state income tax';
                    if (cfg.brackets) return `${state}: progressive brackets${sptLabel}`;
                    if (cfg.flatRate === 0) return 'No state income tax';
                    return `Flat ${((cfg.flatRate ?? 0) * 100).toFixed(2)}%${sptLabel}`;
                  })()}
                />
                <Input
                  label="Pre-Tax Deductions / Period ($)"
                  type="number"
                  step="10"
                  value={preTaxDeductions}
                  onChange={(e) => setPreTaxDeductions(Number(e.target.value))}
                  hint="401k, HSA, health insurance, etc."
                />
                <Input
                  label="Additional Federal Withholding ($)"
                  type="number"
                  step="10"
                  value={additionalWithholding}
                  onChange={(e) => setAdditionalWithholding(Number(e.target.value))}
                />
              </div>
            </Card>

            <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500 leading-relaxed">
                State rates are estimates. This calculator uses 2025 IRS tax tables for federal taxes.
                Actual withholding may differ based on W-4 elections and state-specific rules.
              </p>
            </div>
          </div>

          {/* ── Results Panel ── */}
          <div className="xl:col-span-3 space-y-5">
            {/* Summary Header */}
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Per-Period Net Pay</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(result.netPay)}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-slate-400">Annual Net</p>
                  <p className="text-lg font-semibold text-success-700">{formatCurrency(result.netPay * periods)}</p>
                </div>
              </div>

              {/* Breakdown rows */}
              <div className="space-y-1">
                {rows.map((row, i) => (
                  <div key={i}>
                    {row.divider && <div className="my-2 border-t border-slate-100" />}
                    <div className={`flex items-center justify-between py-1.5 ${row.large ? 'mt-2 pt-2 border-t-2 border-slate-200' : ''}`}>
                      <span className={`text-sm ${row.bold ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                        {row.label}
                      </span>
                      <span className={`font-mono text-sm ${row.bold ? 'font-bold' : ''} ${row.color}`}>
                        {row.value < 0
                          ? `(${formatCurrency(Math.abs(row.value))})`
                          : formatCurrency(row.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Annual Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card padding="md">
                <p className="text-xs text-slate-400 mb-1">Annual Gross</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(result.annualGross)}</p>
                <div className="mt-2"><Badge variant="default">{periods}× periods</Badge></div>
              </Card>
              <Card padding="md">
                <p className="text-xs text-slate-400 mb-1">Annual Net</p>
                <p className="text-lg font-bold text-success-700">{formatCurrency(result.netPay * periods)}</p>
                <div className="mt-2">
                  <Badge variant="success">
                    {((result.netPay / result.grossPay) * 100).toFixed(1)}% take-home
                  </Badge>
                </div>
              </Card>
              <Card padding="md">
                <p className="text-xs text-slate-400 mb-1">Annual Federal Tax</p>
                <p className="text-lg font-bold text-primary-700">{formatCurrency(result.federalTax * periods)}</p>
                <div className="mt-2">
                  <Badge variant="primary">
                    {(result.effectiveFederalRate * 100).toFixed(1)}% effective rate
                  </Badge>
                </div>
              </Card>
              <Card padding="md">
                <p className="text-xs text-slate-400 mb-1">Annual FICA</p>
                <p className="text-lg font-bold text-warning-700">
                  {formatCurrency((result.socialSecurity + result.medicare + result.additionalMedicare) * periods)}
                </p>
                <div className="mt-2"><Badge variant="warning">SS + Medicare</Badge></div>
              </Card>
            </div>

            {/* SS Wage Base Progress */}
            {result.annualGross > 0 && (
              <Card padding="md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-600">SS Wage Base Progress</p>
                  <p className="text-xs text-slate-400">
                    {formatCurrency(Math.min(result.annualGross, SS_WAGE_BASE))} / {formatCurrency(SS_WAGE_BASE)}
                  </p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (result.annualGross / SS_WAGE_BASE) * 100)}%` }}
                  />
                </div>
                {result.annualGross >= SS_WAGE_BASE && (
                  <p className="text-xs text-warning-600 mt-1.5 font-medium">
                    ✓ SS wage base reached — no further SS withholding after ${formatCurrency(SS_WAGE_BASE)}
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
