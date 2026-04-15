import { useState } from "react";
import { calculateDividendTax } from "../calculations";
import { DIVIDEND_TAX_RATE } from "../taxRates";
import { ResultRow } from "./ResultRow";
import { fmt, fmtPct } from "../utils";

export function DividendTaxCalculator() {
  const [dividend, setDividend] = useState("");

  const amount = parseFloat(dividend.replace(",", ".")) || 0;
  const result = amount > 0 ? calculateDividendTax(amount) : null;

  return (
    <div className="calculator">
      <div className="calculator__info">
        <p>
          <strong>Dividend Tax (Dividendbelasting)</strong> is withheld at source at a
          flat rate of {fmtPct(DIVIDEND_TAX_RATE)}. Dutch residents can offset this
          against their income tax. Non-residents may be eligible for a reduced rate under
          a tax treaty.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="div-amount">Gross dividend (€)</label>
        <input
          id="div-amount"
          type="number"
          min="0"
          placeholder="e.g. 20000"
          value={dividend}
          onChange={(e) => setDividend(e.target.value)}
        />
      </div>

      {result && (
        <div className="results">
          <h3>Results</h3>
          <ResultRow label="Gross dividend" value={fmt(result.grossDividend)} />
          <ResultRow label={`Dividend tax withheld (${fmtPct(DIVIDEND_TAX_RATE)})`} value={`−${fmt(result.withheldTax)}`} highlight />
          <ResultRow label="Net dividend received" value={fmt(result.netDividend)} highlight />
        </div>
      )}
    </div>
  );
}
