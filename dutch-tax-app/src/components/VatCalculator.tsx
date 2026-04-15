import { useState } from "react";
import { calculateVat } from "../calculations";
import { VAT_CATEGORY_LABELS, type VatCategory } from "../taxRates";
import { ResultRow } from "./ResultRow";
import { fmt, fmtPct } from "../utils";

export function VatCalculator() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<VatCategory>("standard");
  const [isInclusive, setIsInclusive] = useState(false);

  const value = parseFloat(amount.replace(",", ".")) || 0;
  const result = value > 0 ? calculateVat(value, category, isInclusive) : null;

  return (
    <div className="calculator">
      <div className="calculator__info">
        <p>
          <strong>VAT (BTW)</strong> – Belasting over de Toegevoegde Waarde. Three rates
          apply: 21% (standard), 9% (reduced), and 0% (exempt). Enter an amount and choose
          whether VAT is already included.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="vat-amount">Amount (€)</label>
        <input
          id="vat-amount"
          type="number"
          min="0"
          placeholder="e.g. 1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="vat-category">VAT category</label>
        <select
          id="vat-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as VatCategory)}
        >
          {(Object.keys(VAT_CATEGORY_LABELS) as VatCategory[]).map((k) => (
            <option key={k} value={k}>
              {VAT_CATEGORY_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group form-group--radio">
        <label>
          <input
            type="radio"
            name="vat-mode"
            checked={!isInclusive}
            onChange={() => setIsInclusive(false)}
          />
          Amount is exclusive of VAT (ex-BTW)
        </label>
        <label>
          <input
            type="radio"
            name="vat-mode"
            checked={isInclusive}
            onChange={() => setIsInclusive(true)}
          />
          Amount is inclusive of VAT (incl. BTW)
        </label>
      </div>

      {result && (
        <div className="results">
          <h3>Results</h3>
          <ResultRow label="Net amount (ex-BTW)" value={fmt(result.netAmount)} />
          <ResultRow label={`VAT amount (${fmtPct(result.rate)})`} value={fmt(result.vatAmount)} highlight />
          <ResultRow label="Gross amount (incl. BTW)" value={fmt(result.grossAmount)} highlight />
        </div>
      )}
    </div>
  );
}
