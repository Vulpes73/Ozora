import { useState } from "react";
import { Box1Calculator } from "./components/Box1Calculator";
import { Box2Calculator } from "./components/Box2Calculator";
import { Box3Calculator } from "./components/Box3Calculator";
import { VatCalculator } from "./components/VatCalculator";
import { CorporateTaxCalculator } from "./components/CorporateTaxCalculator";
import { TransferTaxCalculator } from "./components/TransferTaxCalculator";
import { DividendTaxCalculator } from "./components/DividendTaxCalculator";
import { TAX_YEAR } from "./taxRates";
import "./App.css";

type TabId =
  | "box1"
  | "box2"
  | "box3"
  | "vat"
  | "corporate"
  | "transfer"
  | "dividend";

interface Tab {
  id: TabId;
  label: string;
  shortLabel: string;
  component: React.FC;
}

const TABS: Tab[] = [
  {
    id: "box1",
    label: "Box 1 – Income & Work",
    shortLabel: "Box 1",
    component: Box1Calculator,
  },
  {
    id: "box2",
    label: "Box 2 – Substantial Interest",
    shortLabel: "Box 2",
    component: Box2Calculator,
  },
  {
    id: "box3",
    label: "Box 3 – Savings & Investments",
    shortLabel: "Box 3",
    component: Box3Calculator,
  },
  {
    id: "vat",
    label: "VAT / BTW",
    shortLabel: "VAT",
    component: VatCalculator,
  },
  {
    id: "corporate",
    label: "Corporate Tax (VPB)",
    shortLabel: "Corporate",
    component: CorporateTaxCalculator,
  },
  {
    id: "transfer",
    label: "Transfer Tax",
    shortLabel: "Transfer",
    component: TransferTaxCalculator,
  },
  {
    id: "dividend",
    label: "Dividend Tax",
    shortLabel: "Dividend",
    component: DividendTaxCalculator,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("box1");

  const ActiveComponent = TABS.find((t) => t.id === activeTab)!.component;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__logo">
            <span className="app-header__flag">🇳🇱</span>
            <div>
              <h1 className="app-header__title">Dutch Tax Calculator</h1>
              <p className="app-header__subtitle">
                Belastingdienst rates · Tax year {TAX_YEAR}
              </p>
            </div>
          </div>
          <div className="app-header__disclaimer">
            For indicative purposes only. Consult a tax advisor for personal advice.
          </div>
        </div>
      </header>

      <main className="app-main">
        <nav className="tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-btn${activeTab === tab.id ? " tab-btn--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-btn__long">{tab.label}</span>
              <span className="tab-btn__short">{tab.shortLabel}</span>
            </button>
          ))}
        </nav>

        <section className="tab-panel">
          <ActiveComponent />
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Rates based on <strong>Belastingdienst</strong> publications for {TAX_YEAR}.
          All amounts in EUR. Calculations are simplified and indicative.
        </p>
      </footer>
    </div>
  );
}
