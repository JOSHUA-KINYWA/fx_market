"use client";

import { useState, useEffect } from "react";
import { Database } from "@/types/database.types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

interface TradeFiltersProps {
  trades: Trade[];
  accounts: Account[];
  onFiltered: (filtered: Trade[]) => void;
}

export function TradeFilters({ trades, accounts, onFiltered }: TradeFiltersProps) {
  const [filters, setFilters] = useState({
    accountId: "",
    status: "",
    currencyPair: "",
    direction: "", // buy, sell
    dateRange: "all", // all, today, week, month, custom
    startDate: "",
    endDate: "",
    hasMissingDetails: false,
    profitLossType: "", // all, profit, loss
    minProfit: "",
    maxProfit: "",
  });

  useEffect(() => {
    let filtered = [...trades];

    // Account filter
    if (filters.accountId) {
      filtered = filtered.filter((t) => t.account_id === filters.accountId);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    // Currency pair filter
    if (filters.currencyPair) {
      filtered = filtered.filter((t) =>
        t.currency_pair.toLowerCase().includes(filters.currencyPair.toLowerCase())
      );
    }

    // Direction filter
    if (filters.direction) {
      filtered = filtered.filter((t) => t.direction === filters.direction);
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

    // Missing details filter
    if (filters.hasMissingDetails) {
      filtered = filtered.filter((t) => t.has_missing_details === true);
    }

    // Profit/Loss type filter
    if (filters.profitLossType === "profit") {
      filtered = filtered.filter((t) => (t.profit_loss || 0) > 0);
    } else if (filters.profitLossType === "loss") {
      filtered = filtered.filter((t) => (t.profit_loss || 0) < 0);
    }

    // Profit range filter
    if (filters.minProfit) {
      const min = Number.parseFloat(filters.minProfit);
      filtered = filtered.filter((t) => (t.profit_loss || 0) >= min);
    }
    if (filters.maxProfit) {
      const max = Number.parseFloat(filters.maxProfit);
      filtered = filtered.filter((t) => (t.profit_loss || 0) <= max);
    }

    onFiltered(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, trades]);

  const resetFilters = () => {
    setFilters({
      accountId: "",
      status: "",
      currencyPair: "",
      direction: "",
      dateRange: "all",
      startDate: "",
      endDate: "",
      hasMissingDetails: false,
      profitLossType: "",
      minProfit: "",
      maxProfit: "",
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
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
            onChange={(e) => {
              setFilters({ ...filters, accountId: e.target.value });
            }}
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
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => {
              setFilters({ ...filters, dateRange: e.target.value });
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
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
            onChange={(e) => {
              setFilters({ ...filters, currencyPair: e.target.value });
            }}
            placeholder="e.g., EURUSD"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Direction
          </label>
          <select
            value={filters.direction}
            onChange={(e) => {
              setFilters({ ...filters, direction: e.target.value });
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Directions</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Profit/Loss
          </label>
          <select
            value={filters.profitLossType}
            onChange={(e) => {
              setFilters({ ...filters, profitLossType: e.target.value });
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            <option value="profit">Profit Only</option>
            <option value="loss">Loss Only</option>
          </select>
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
                onChange={(e) => {
                  setFilters({ ...filters, startDate: e.target.value });
                }}
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
                onChange={(e) => {
                  setFilters({ ...filters, endDate: e.target.value });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}

        <div className="flex items-center">
          <input
            type="checkbox"
            id="missingDetails"
            checked={filters.hasMissingDetails}
            onChange={(e) => {
              setFilters({ ...filters, hasMissingDetails: e.target.checked });
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
          />
          <label htmlFor="missingDetails" className="ml-2 text-sm text-slate-700">
            Missing Details Only
          </label>
        </div>

        {filters.profitLossType === "" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Min Profit ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={filters.minProfit}
                onChange={(e) => {
                  setFilters({ ...filters, minProfit: e.target.value });
                }}
                placeholder="e.g., 100"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Profit ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={filters.maxProfit}
                onChange={(e) => {
                  setFilters({ ...filters, maxProfit: e.target.value });
                }}
                placeholder="e.g., 1000"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

