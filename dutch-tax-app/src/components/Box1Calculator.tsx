import { useState } from "react";
import { calculateBox1 } from "../calculations";
import { ResultRow } from "./ResultRow";
import { fmt, fmtPct } from "../utils";

export function Box1Calculator() {
  const [income, setIncome] = useState("");
  const [hasLabour, setHasLabour] = useState(true);

  const gross = parseFloat(income.replace(",", ".")) || 0;
  const result = gross > 0 ? calculateBox1(gross, hasLabour) : null;

  return (
    <div className="calculator">
      <div className="calculator__info">
        <p>
          <strong>Box 1</strong> covers income from employment, business profits, and home
          ownership (imputed rent). Two tax brackets apply in 2024.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="box1-income">Gross income (€)</label>
        <input
          id="box1-income"
          type="number"
          min="0"
          placeholder="e.g. 60000"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
      </div>

      <div className="form-group form-group--check">
        <input
          id="box1-labour"
          type="checkbox"
          checked={hasLabour}
          onChange={(e) => setHasLabour(e.target.checked)}
        />
        <label htmlFor="box1-labour">Include labour tax credit (arbeidskorting)</label>
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

          <ResultRow label="Tax before credits" value={fmt(result.taxBeforeCredits)} />
          <ResultRow label="General tax credit (heffingskorting)" value={`−${fmt(result.generalTaxCredit)}`} sub />
          {hasLabour && (
            <ResultRow label="Labour tax credit (arbeidskorting)" value={`−${fmt(result.labourTaxCredit)}`} sub />
          )}
          <ResultRow label="Total income tax" value={fmt(result.totalTax)} highlight />
          <ResultRow label="Net income" value={fmt(result.netIncome)} highlight />
          <ResultRow label="Effective tax rate" value={fmtPct(result.effectiveRate)} />
        </div>
      )}
    </div>
  );
}
