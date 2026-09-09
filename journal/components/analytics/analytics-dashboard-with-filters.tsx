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
  initialAccountId?: string;
}

export function AnalyticsDashboardWithFilters({ trades, accounts, initialAccountId }: AnalyticsDashboardWithFiltersProps) {
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>(trades);

  useEffect(() => {
    setFilteredTrades(trades);
  }, [trades]);

  return (
    <>
      <AnalyticsFilters
        trades={trades}
        accounts={accounts}
        initialAccountId={initialAccountId}
        onFiltered={setFilteredTrades}
      />
      <AnalyticsDashboard trades={filteredTrades} accounts={accounts} />
    </>
  );
}



