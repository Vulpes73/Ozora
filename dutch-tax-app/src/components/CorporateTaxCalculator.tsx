import { useState } from "react";
import { calculateCorporateTax } from "../calculations";
import { ResultRow } from "./ResultRow";
import { fmt, fmtPct } from "../utils";

export function CorporateTaxCalculator() {
  const [profit, setProfit] = useState("");

  const amount = parseFloat(profit.replace(",", ".")) || 0;
  const result = amount > 0 ? calculateCorporateTax(amount) : null;

  return (
    <div className="calculator">
      <div className="calculator__info">
        <p>
          <strong>Corporate Tax (Vennootschapsbelasting)</strong> applies to BV, NV and
          other corporate entities. In 2024 the rate is 19% on profits up to €200,000 and
          25.8% above that threshold.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="corp-profit">Taxable profit (€)</label>
        <input
          id="corp-profit"
          type="number"
          min="0"
          placeholder="e.g. 300000"
          value={profit}
          onChange={(e) => setProfit(e.target.value)}
        />
      </div>

      {result && (
        <div className="results">
          <h3>Results</h3>

          <div className="bracket-table">
            <div className="bracket-table__head">
              <span>Bracket</span>
              <span>Taxable amount</span>
              <span>Rate</span>
              <span>Tax</span>
            </div>
            {result.breakdown.map((b) => (
              <div className="bracket-table__row" key={b.bracket}>
                <span>{b.bracket}</span>
                <span>{fmt(b.taxable)}</span>
                <span>{fmtPct(b.rate)}</span>
                <span>{fmt(b.tax)}</span>
              </div>
            ))}
          </div>

          <ResultRow label="Total corporate tax" value={fmt(result.totalTax)} highlight />
          <ResultRow label="Net profit after tax" value={fmt(result.netProfit)} highlight />
          <ResultRow label="Effective tax rate" value={fmtPct(result.effectiveRate)} />
        </div>
      )}
    </div>
  );
}
