import { useState } from "react";
import { calculateBox2 } from "../calculations";
import { ResultRow } from "./ResultRow";
import { fmt, fmtPct } from "../utils";

export function Box2Calculator() {
  const [income, setIncome] = useState("");

  const amount = parseFloat(income.replace(",", ".")) || 0;
  const result = amount > 0 ? calculateBox2(amount) : null;

  return (
    <div className="calculator">
      <div className="calculator__info">
        <p>
          <strong>Box 2</strong> applies to dividends and capital gains from a{" "}
          <em>substantial interest</em> (≥5% shares in a company). Two brackets apply in
          2024: 24.5% up to €67,000 and 33% above.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="box2-income">Box 2 income (€)</label>
        <input
          id="box2-income"
          type="number"
          min="0"
          placeholder="e.g. 80000"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
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

          <ResultRow label="Total Box 2 tax" value={fmt(result.totalTax)} highlight />
          <ResultRow label="Net income after tax" value={fmt(result.netIncome)} highlight />
          <ResultRow label="Effective tax rate" value={fmtPct(result.effectiveRate)} />
        </div>
      )}
    </div>
  );
}
