"use client";

import { useState, useEffect } from "react";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { AnalyticsFilters } from "./analytics-filters";
import { Database } from "@/types/database.types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

interface AnalyticsDashboardWithFiltersProps {
  trades: Trade[];
  accounts: Account[];
}

export function AnalyticsDashboardWithFilters({ trades, accounts }: AnalyticsDashboardWithFiltersProps) {
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>(trades);

  useEffect(() => {
    setFilteredTrades(trades);
  }, [trades]);

  return (
    <>
      <AnalyticsFilters
        trades={trades}
        accounts={accounts}
        onFiltered={setFilteredTrades}
      />
      <AnalyticsDashboard trades={filteredTrades} />
    </>
  );
}



