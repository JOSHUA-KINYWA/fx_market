"use client";

import Link from "next/link";
import { Database } from "@/types/database.types";
import { format } from "date-fns";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

interface RecentTradesProps {
  readonly trades: Trade[];
}

export function RecentTrades({ trades }: RecentTradesProps) {
  const recentTrades = trades.slice(0, 10);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "closed":
        return "bg-emerald-100 text-emerald-800";
      case "open":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getProfitColor = (profit: number | null) => {
    if (!profit) return "text-slate-500";
    return profit >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Recent Trades</h3>
          <Link
            href="/trades"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View all →
          </Link>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {recentTrades.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 mb-4">No trades yet.</p>
            <Link
              href="/trades/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add your first trade
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Pair
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Entry Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  P&L
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">
                      {trade.currency_pair}
                    </div>
                    <div className="text-xs text-slate-500">
                      {Number(trade.position_size).toFixed(2)} lots
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                        trade.direction === "buy"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {format(new Date(trade.entry_time), "MMM dd")}
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(trade.entry_time), "HH:mm")}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${getProfitColor(trade.profit_loss)}`}>
                    {trade.profit_loss
                      ? `${trade.profit_loss >= 0 ? "+" : ""}$${Number(trade.profit_loss).toFixed(2)}`
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        trade.status
                      )}`}
                    >
                      {trade.status || "open"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
