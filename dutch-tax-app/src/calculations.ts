import {
  BOX1_BRACKETS,
  BOX2_BRACKETS,
  BOX3_BRACKETS,
  BOX3_FICTITIOUS_RETURNS,
  BOX3_TAX_FREE_ALLOWANCE,
  BOX3_TAX_RATE,
  CORPORATE_TAX_BRACKETS,
  DIVIDEND_TAX_RATE,
  GENERAL_TAX_CREDIT,
  LABOUR_TAX_CREDIT,
  TRANSFER_TAX,
  type TransferTaxType,
  VAT_RATES,
  type VatCategory,
} from "./taxRates";

function applyBrackets(
  income: number,
  brackets: { upTo: number; rate: number }[]
): { tax: number; breakdown: { bracket: string; taxable: number; rate: number; tax: number }[] } {
  let remaining = income;
  let prev = 0;
  let totalTax = 0;
  const breakdown = [];

  for (const { upTo, rate } of brackets) {
    if (remaining <= 0) break;
    const cap = Math.min(upTo, income) - prev;
    const taxable = Math.min(remaining, cap);
    const tax = taxable * rate;
    totalTax += tax;
    const label =
      upTo === Infinity
        ? `Above €${prev.toLocaleString("nl-NL")}`
        : `€${prev.toLocaleString("nl-NL")} – €${upTo.toLocaleString("nl-NL")}`;
    breakdown.push({ bracket: label, taxable, rate, tax });
    remaining -= taxable;
    prev = upTo;
  }

  return { tax: totalTax, breakdown };
}

// ─── Box 1 ────────────────────────────────────────────────────────────────────
export interface Box1Result {
  grossIncome: number;
  taxBeforeCredits: number;
  generalTaxCredit: number;
  labourTaxCredit: number;
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
  breakdown: { bracket: string; taxable: number; rate: number; tax: number }[];
}

export function calculateBox1(grossIncome: number, hasLabourIncome: boolean): Box1Result {
  const { tax, breakdown } = applyBrackets(grossIncome, BOX1_BRACKETS);

  // General tax credit (phases out above phaseOutStart)
  let generalTaxCredit = GENERAL_TAX_CREDIT.maxCredit;
  if (grossIncome > GENERAL_TAX_CREDIT.phaseOutStart) {
    const reduction =
      (grossIncome - GENERAL_TAX_CREDIT.phaseOutStart) * GENERAL_TAX_CREDIT.phaseOutRate;
    generalTaxCredit = Math.max(0, GENERAL_TAX_CREDIT.maxCredit - reduction);
  }

  // Labour tax credit (only for employment income, phases out above phaseOutStart)
  let labourTaxCredit = 0;
  if (hasLabourIncome) {
    labourTaxCredit = Math.min(grossIncome * 0.2812, LABOUR_TAX_CREDIT.maxCredit);
    if (grossIncome > LABOUR_TAX_CREDIT.phaseOutStart) {
      const reduction =
        (grossIncome - LABOUR_TAX_CREDIT.phaseOutStart) * LABOUR_TAX_CREDIT.phaseOutRate;
      labourTaxCredit = Math.max(0, labourTaxCredit - reduction);
    }
  }

  const totalTax = Math.max(0, tax - generalTaxCredit - labourTaxCredit);
  const netIncome = grossIncome - totalTax;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

  return {
    grossIncome,
    taxBeforeCredits: tax,
    generalTaxCredit,
    labourTaxCredit,
    totalTax,
    netIncome,
    effectiveRate,
    breakdown,
  };
}

// ─── Box 2 ────────────────────────────────────────────────────────────────────
export interface Box2Result {
  income: number;
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
  breakdown: { bracket: string; taxable: number; rate: number; tax: number }[];
}

export function calculateBox2(income: number): Box2Result {
  const { tax, breakdown } = applyBrackets(income, BOX2_BRACKETS);
  return {
    income,
    totalTax: tax,
    netIncome: income - tax,
    effectiveRate: income > 0 ? tax / income : 0,
    breakdown,
  };
}

// ─── Box 3 ────────────────────────────────────────────────────────────────────
export interface Box3Result {
  totalAssets: number;
  taxableAssets: number;
  fictitiousReturn: number;
  totalTax: number;
  effectiveRate: number;
  breakdown: { label: string; amount: number; return: number; returnAmount: number }[];
}

export function calculateBox3(totalAssets: number, isPartners: boolean): Box3Result {
  const allowance = isPartners ? BOX3_TAX_FREE_ALLOWANCE * 2 : BOX3_TAX_FREE_ALLOWANCE;
  const taxableAssets = Math.max(0, totalAssets - allowance);

  if (taxableAssets === 0) {
    return {
      totalAssets,
      taxableAssets: 0,
      fictitiousReturn: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [],
    };
  }

  // Determine savings/investment split based on bracket
  let savingsFraction = 0;
  for (const { upTo, savingsFraction: sf } of BOX3_BRACKETS) {
    if (taxableAssets <= upTo) {
      savingsFraction = sf;
      break;
    }
  }

  const savingsAmount = taxableAssets * savingsFraction;
  const investmentsAmount = taxableAssets * (1 - savingsFraction);

  const savingsReturn = savingsAmount * BOX3_FICTITIOUS_RETURNS.savings;
  const investmentsReturn = investmentsAmount * BOX3_FICTITIOUS_RETURNS.investments;
  const fictitiousReturn = savingsReturn + investmentsReturn;
  const totalTax = fictitiousReturn * BOX3_TAX_RATE;

  const breakdown = [
    {
      label: "Savings (bank deposits)",
      amount: savingsAmount,
      return: BOX3_FICTITIOUS_RETURNS.savings,
      returnAmount: savingsReturn,
    },
    {
      label: "Investments & other assets",
      amount: investmentsAmount,
      return: BOX3_FICTITIOUS_RETURNS.investments,
      returnAmount: investmentsReturn,
    },
  ];

  return {
    totalAssets,
    taxableAssets,
    fictitiousReturn,
    totalTax,
    effectiveRate: totalAssets > 0 ? totalTax / totalAssets : 0,
    breakdown,
  };
}

// ─── VAT ──────────────────────────────────────────────────────────────────────
export interface VatResult {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  rate: number;
  category: VatCategory;
}

export function calculateVat(amount: number, category: VatCategory, isInclusive: boolean): VatResult {
  const rate = VAT_RATES[category];
  let netAmount: number;
  let vatAmount: number;
  let grossAmount: number;

  if (isInclusive) {
    grossAmount = amount;
    netAmount = amount / (1 + rate);
    vatAmount = amount - netAmount;
  } else {
    netAmount = amount;
    vatAmount = amount * rate;
    grossAmount = amount + vatAmount;
  }

  return { netAmount, vatAmount, grossAmount, rate, category };
}

// ─── Corporate Tax ────────────────────────────────────────────────────────────
export interface CorporateTaxResult {
  profit: number;
  totalTax: number;
  netProfit: number;
  effectiveRate: number;
  breakdown: { bracket: string; taxable: number; rate: number; tax: number }[];
}

export function calculateCorporateTax(profit: number): CorporateTaxResult {
  const { tax, breakdown } = applyBrackets(profit, CORPORATE_TAX_BRACKETS);
  return {
    profit,
    totalTax: tax,
    netProfit: profit - tax,
    effectiveRate: profit > 0 ? tax / profit : 0,
    breakdown,
  };
}

// ─── Transfer Tax ─────────────────────────────────────────────────────────────
export interface TransferTaxResult {
  propertyValue: number;
  taxType: TransferTaxType;
  rate: number;
  totalTax: number;
}

export function calculateTransferTax(propertyValue: number, taxType: TransferTaxType): TransferTaxResult {
  let rate = 0;
  if (taxType === "first_time_buyer" && propertyValue <= TRANSFER_TAX.firstTimeBuyerMax) {
    rate = 0;
  } else if (taxType === "first_time_buyer" && propertyValue > TRANSFER_TAX.firstTimeBuyerMax) {
    // Exceeds cap → standard residential rate applies
    rate = TRANSFER_TAX.residentialRate;
  } else if (taxType === "residential") {
    rate = TRANSFER_TAX.residentialRate;
  } else {
    rate = TRANSFER_TAX.nonResidentialRate;
  }

  return {
    propertyValue,
    taxType,
    rate,
    totalTax: propertyValue * rate,
  };
}

// ─── Dividend Tax ─────────────────────────────────────────────────────────────
export interface DividendTaxResult {
  grossDividend: number;
  withheldTax: number;
  netDividend: number;
}

export function calculateDividendTax(grossDividend: number): DividendTaxResult {
  const withheldTax = grossDividend * DIVIDEND_TAX_RATE;
  return {
    grossDividend,
    withheldTax,
    netDividend: grossDividend - withheldTax,
  };
}
