import { useState } from "react";
import { calculateBox3 } from "../calculations";
import { BOX3_TAX_FREE_ALLOWANCE, BOX3_TAX_RATE } from "../taxRates";
import { ResultRow } from "./ResultRow";
import { fmt, fmtPct } from "../utils";

export function Box3Calculator() {
  const [assets, setAssets] = useState("");
  const [isPartners, setIsPartners] = useState(false);

  const totalAssets = parseFloat(assets.replace(",", ".")) || 0;
  const result = totalAssets > 0 ? calculateBox3(totalAssets, isPartners) : null;
  const allowance = isPartners ? BOX3_TAX_FREE_ALLOWANCE * 2 : BOX3_TAX_FREE_ALLOWANCE;

  return (
    <div className="calculator">
      <div className="calculator__info">
        <p>
          <strong>Box 3</strong> taxes wealth from savings and investments using a{" "}
          <em>fictitious return</em> method. The first €{BOX3_TAX_FREE_ALLOWANCE.toLocaleString("nl-NL")}{" "}
          per person is exempt. Tax rate on the fictitious return is{" "}
          {fmtPct(BOX3_TAX_RATE)}.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="box3-assets">Total box 3 assets on 1 Jan (€)</label>
        <input
          id="box3-assets"
          type="number"
          min="0"
          placeholder="e.g. 150000"
          value={assets}
          onChange={(e) => setAssets(e.target.value)}
        />
      </div>

      <div className="form-group form-group--check">
        <input
          id="box3-partners"
          type="checkbox"
          checked={isPartners}
          onChange={(e) => setIsPartners(e.target.checked)}
        />
        <label htmlFor="box3-partners">
          Fiscal partners (double tax-free allowance: €{(allowance).toLocaleString("nl-NL")})
        </label>
      </div>

      {result && (
        <div className="results">
          <h3>Results</h3>

          <ResultRow label="Total assets" value={fmt(result.totalAssets)} />
          <ResultRow label="Tax-free allowance" value={`−${fmt(allowance)}`} sub />
          <ResultRow label="Taxable assets" value={fmt(result.taxableAssets)} />

          {result.taxableAssets > 0 && (
            <>
              <div className="bracket-table mt-sm">
                <div className="bracket-table__head">
                  <span>Category</span>
                  <span>Amount</span>
                  <span>Fictitious return %</span>
                  <span>Return amount</span>
                </div>
                {result.breakdown.map((b) => (
                  <div className="bracket-table__row" key={b.label}>
                    <span>{b.label}</span>
                    <span>{fmt(b.amount)}</span>
                    <span>{fmtPct(b.return)}</span>
                    <span>{fmt(b.returnAmount)}</span>
                  </div>
                ))}
              </div>

              <ResultRow label="Total fictitious return" value={fmt(result.fictitiousReturn)} />
              <ResultRow label={`Tax (${fmtPct(BOX3_TAX_RATE)} on return)`} value={fmt(result.totalTax)} highlight />
              <ResultRow label="Effective rate on total assets" value={fmtPct(result.effectiveRate)} />
            </>
          )}

          {result.taxableAssets === 0 && (
            <div className="no-tax-notice">
              No Box 3 tax — assets are within the tax-free allowance.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
