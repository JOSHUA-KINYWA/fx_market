"use client";

import { useState, useEffect } from "react";
import { TradesList } from "./trades-list";
import { TradeFilters } from "./trade-filters";
import { Database } from "@/types/database.types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

interface TradesListWithFiltersProps {
  trades: Trade[];
  accounts: Account[];
}

export function TradesListWithFilters({ trades, accounts }: TradesListWithFiltersProps) {
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>(trades);

  useEffect(() => {
    setFilteredTrades(trades);
  }, [trades]);

  const totalPnL = filteredTrades.reduce(
    (sum, trade) => sum + (trade.profit_loss || 0),
    0
  );

  return (
    <>
      <TradeFilters
        trades={trades}
        accounts={accounts}
        onFiltered={setFilteredTrades}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filteredTrades.length}</span>{" "}
          trade{filteredTrades.length === 1 ? "" : "s"} matching filters
        </p>
        <div className="inline-flex items-baseline rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <span className="mr-2 text-sm font-medium text-slate-600">
            Total P&L (filtered):
          </span>
          <span
            className={`text-lg font-semibold ${
              totalPnL > 0
                ? "text-emerald-600"
                : totalPnL < 0
                ? "text-red-600"
                : "text-slate-700"
            }`}
          >
            {totalPnL === 0 ? "$0.00" : `$${totalPnL.toFixed(2)}`}
          </span>
        </div>
      </div>

      <TradesList trades={filteredTrades} accounts={accounts} />
    </>
  );
}

