"use client";

import { useState, useEffect } from "react";
import { Database } from "@/types/database.types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

interface AnalyticsFiltersProps {
  trades: Trade[];
  accounts: Account[];
  onFiltered: (filtered: Trade[]) => void;
}

export function AnalyticsFilters({ trades, accounts, onFiltered }: AnalyticsFiltersProps) {
  const [filters, setFilters] = useState({
    accountId: "",
    dateRange: "all", // all, today, week, month, year
    startDate: "",
    endDate: "",
    currencyPair: "",
  });

  useEffect(() => {
    let filtered = [...trades];

    // Account filter
    if (filters.accountId) {
      filtered = filtered.filter((t) => t.account_id === filters.accountId);
    }

    // Currency pair filter
    if (filters.currencyPair) {
      filtered = filtered.filter((t) =>
        t.currency_pair.toLowerCase().includes(filters.currencyPair.toLowerCase())
      );
    }

    // Date range filter
    const now = new Date();
    if (filters.dateRange === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter((t) => new Date(t.entry_time) >= today);
    } else if (filters.dateRange === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((t) => new Date(t.entry_time) >= weekAgo);
    } else if (filters.dateRange === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((t) => new Date(t.entry_time) >= monthAgo);
    } else if (filters.dateRange === "year") {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((t) => new Date(t.entry_time) >= yearAgo);
    } else if (filters.dateRange === "custom") {
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        filtered = filtered.filter((t) => new Date(t.entry_time) >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter((t) => new Date(t.entry_time) <= end);
      }
    }

    onFiltered(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, trades]);

  const resetFilters = () => {
    setFilters({
      accountId: "",
      dateRange: "all",
      startDate: "",
      endDate: "",
      currencyPair: "",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Analytics Filters</h3>
        <button
          onClick={resetFilters}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Account
          </label>
          <select
            value={filters.accountId}
            onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Currency Pair
          </label>
          <input
            type="text"
            value={filters.currencyPair}
            onChange={(e) => setFilters({ ...filters, currencyPair: e.target.value })}
            placeholder="e.g., EURUSD"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {filters.dateRange === "custom" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}



