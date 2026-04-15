import { useState } from "react";
import { calculateTransferTax } from "../calculations";
import { TRANSFER_TAX, TRANSFER_TAX_LABELS, type TransferTaxType } from "../taxRates";
import { ResultRow } from "./ResultRow";
import { fmt, fmtPct } from "../utils";

export function TransferTaxCalculator() {
  const [value, setValue] = useState("");
  const [taxType, setTaxType] = useState<TransferTaxType>("residential");

  const amount = parseFloat(value.replace(",", ".")) || 0;
  const result = amount > 0 ? calculateTransferTax(amount, taxType) : null;

  const exceedsCap =
    taxType === "first_time_buyer" && amount > TRANSFER_TAX.firstTimeBuyerMax;

  return (
    <div className="calculator">
      <div className="calculator__info">
        <p>
          <strong>Transfer Tax (Overdrachtsbelasting)</strong> is due when buying real
          estate in the Netherlands. First-time buyers under 35 pay 0% if the property is
          ≤ €{TRANSFER_TAX.firstTimeBuyerMax.toLocaleString("nl-NL")}. Owner-occupiers pay
          2%, and investors / non-residential buyers pay 10.4%.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="transfer-value">Property value (€)</label>
        <input
          id="transfer-value"
          type="number"
          min="0"
          placeholder="e.g. 400000"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="transfer-type">Buyer type</label>
        <select
          id="transfer-type"
          value={taxType}
          onChange={(e) => setTaxType(e.target.value as TransferTaxType)}
        >
          {(Object.keys(TRANSFER_TAX_LABELS) as TransferTaxType[]).map((k) => (
            <option key={k} value={k}>
              {TRANSFER_TAX_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {exceedsCap && (
        <div className="warning-notice">
          Property value exceeds the €{TRANSFER_TAX.firstTimeBuyerMax.toLocaleString("nl-NL")} cap
          for first-time buyers. The standard residential rate of 2% applies instead.
        </div>
      )}

      {result && (
        <div className="results">
          <h3>Results</h3>
          <ResultRow label="Property value" value={fmt(result.propertyValue)} />
          <ResultRow label="Applicable rate" value={fmtPct(result.rate)} />
          <ResultRow label="Transfer tax due" value={fmt(result.totalTax)} highlight />
        </div>
      )}
    </div>
  );
}
