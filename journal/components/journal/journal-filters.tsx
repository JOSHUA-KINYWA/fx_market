"use client";

import { useState, useEffect } from "react";
import { Database } from "@/types/database.types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

interface JournalFiltersProps {
  readonly trades: Trade[];
  readonly onFiltered: (filtered: Trade[]) => void;
}

export function JournalFilters({ trades, onFiltered }: JournalFiltersProps) {
  const [filters, setFilters] = useState({
    dateRange: "all", // all, today, week, month, custom
    startDate: "",
    endDate: "",
    direction: "", // buy, sell
    profitLossType: "", // all, profit, loss
    currencyPair: "",
  });

  useEffect(() => {
    let filtered = [...trades];

    // Date range
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

    // Direction
    if (filters.direction) {
      filtered = filtered.filter((t) => t.direction === filters.direction);
    }

    // Profit/Loss type
    if (filters.profitLossType === "profit") {
      filtered = filtered.filter((t) => (t.profit_loss || 0) > 0);
    } else if (filters.profitLossType === "loss") {
      filtered = filtered.filter((t) => (t.profit_loss || 0) < 0);
    }

    // Currency pair
    if (filters.currencyPair) {
      filtered = filtered.filter((t) =>
        t.currency_pair.toLowerCase().includes(filters.currencyPair.toLowerCase())
      );
    }

    onFiltered(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, trades]);

  const resetFilters = () => {
    setFilters({
      dateRange: "all",
      startDate: "",
      endDate: "",
      direction: "",
      profitLossType: "",
      currencyPair: "",
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Journal Filters</h3>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="w-full px-2 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {filters.dateRange === "custom" && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-2 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-2 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Direction
          </label>
          <select
            value={filters.direction}
            onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
            className="w-full px-2 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Profit/Loss
          </label>
          <select
            value={filters.profitLossType}
            onChange={(e) => setFilters({ ...filters, profitLossType: e.target.value })}
            className="w-full px-2 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            <option value="profit">Profit Only</option>
            <option value="loss">Loss Only</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Currency Pair
          </label>
          <input
            type="text"
            value={filters.currencyPair}
            onChange={(e) => setFilters({ ...filters, currencyPair: e.target.value })}
            placeholder="e.g., EURUSD"
            className="w-full px-2 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
