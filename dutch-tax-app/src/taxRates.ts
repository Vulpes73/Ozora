// Dutch Tax Rates for 2024/2025
// Source: Belastingdienst (Dutch Tax Authority)

export const TAX_YEAR = 2024;

// ─── Box 1: Income from Work and Home Ownership ───────────────────────────────
export const BOX1_BRACKETS = [
  { upTo: 75518, rate: 0.3697 },
  { upTo: Infinity, rate: 0.495 },
];

// General tax credit (algemene heffingskorting) – simplified
export const GENERAL_TAX_CREDIT = {
  maxCredit: 3362,
  phaseOutStart: 24813,
  phaseOutRate: 0.06095,
};

// Labour tax credit (arbeidskorting) – simplified
export const LABOUR_TAX_CREDIT = {
  maxCredit: 5158,
  phaseOutStart: 39958,
  phaseOutRate: 0.06510,
};

// ─── Box 2: Income from Substantial Interest ──────────────────────────────────
export const BOX2_BRACKETS = [
  { upTo: 67000, rate: 0.245 },
  { upTo: Infinity, rate: 0.33 },
];

// ─── Box 3: Savings and Investments ───────────────────────────────────────────
export const BOX3_TAX_FREE_ALLOWANCE = 57000; // heffingvrij vermogen (per person)
export const BOX3_TAX_RATE = 0.36;

// Fictitious return percentages (2024)
export const BOX3_FICTITIOUS_RETURNS = {
  savings: 0.0103,       // bank spaargeld
  investments: 0.0604,   // beleggingen / overig vermogen
};

// Asset category thresholds for mixed allocation (simplified)
export const BOX3_BRACKETS = [
  { upTo: 57000,   savingsFraction: 1.00 },
  { upTo: 978000,  savingsFraction: 0.67 },
  { upTo: Infinity, savingsFraction: 0.21 },
];

// ─── VAT / BTW ────────────────────────────────────────────────────────────────
export const VAT_RATES = {
  standard: 0.21,
  reduced: 0.09,
  zero: 0,
} as const;

export type VatCategory = keyof typeof VAT_RATES;

export const VAT_CATEGORY_LABELS: Record<VatCategory, string> = {
  standard: "Standard (21%) – electronics, clothing, etc.",
  reduced: "Reduced (9%) – food, books, medicines, etc.",
  zero: "Zero (0%) – exports, certain financial services",
};

// ─── Corporate Tax (Vennootschapsbelasting) ───────────────────────────────────
export const CORPORATE_TAX_BRACKETS = [
  { upTo: 200000, rate: 0.19 },
  { upTo: Infinity, rate: 0.258 },
];

// ─── Transfer Tax (Overdrachtsbelasting) ──────────────────────────────────────
export const TRANSFER_TAX = {
  firstTimeBuyerMax: 510000, // property value cap for 0% rate
  residentialRate: 0.02,
  nonResidentialRate: 0.104,
};

export type TransferTaxType = "first_time_buyer" | "residential" | "non_residential";

export const TRANSFER_TAX_LABELS: Record<TransferTaxType, string> = {
  first_time_buyer:
    "First-time buyer (under 35, property ≤ €510,000) – 0%",
  residential: "Residential owner-occupier – 2%",
  non_residential: "Investment / non-residential – 10.4%",
};

// ─── Dividend Tax (Dividendbelasting) ─────────────────────────────────────────
export const DIVIDEND_TAX_RATE = 0.15;
