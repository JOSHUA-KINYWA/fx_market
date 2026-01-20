"use client";

import { Database } from "@/types/database.types";
import { format } from "date-fns";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];
type Strategy = Database["public"]["Tables"]["strategies"]["Row"];
type Setup = Database["public"]["Tables"]["trade_setups"]["Row"];

interface TradeDetailProps {
  readonly trade: Trade;
  readonly account: Account | null;
  readonly strategy: Strategy | null;
  readonly setup: Setup | null;
}

export function TradeDetail({
  trade,
  account,
  strategy,
  setup,
}: TradeDetailProps) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "closed":
        return "bg-green-100 text-green-800";
      case "open":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProfitColor = (profit: number | null) => {
    if (!profit) return "text-gray-500";
    return profit >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold";
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Trade Information</h2>
          {trade.has_missing_details && (
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
              ⚠️ Missing Details
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-500">Currency Pair</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{trade.currency_pair}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500">Direction</label>
            <p className="mt-1">
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  trade.direction === "buy"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {trade.direction.toUpperCase()}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500">Entry Time</label>
            <p className="mt-1 text-slate-900">
              {format(new Date(trade.entry_time), "MMM dd, yyyy HH:mm")}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500">Entry Price</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {Number(trade.entry_price).toFixed(5)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500">Position Size</label>
            <p className="mt-1 text-slate-900">{Number(trade.position_size).toFixed(2)} lots</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500">Status</label>
            <p className="mt-1">
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                  trade.status
                )}`}
              >
                {trade.status || "open"}
              </span>
            </p>
          </div>
          {trade.exit_time && (
            <div>
              <label className="block text-sm font-medium text-slate-500">Exit Time</label>
              <p className="mt-1 text-slate-900">
                {format(new Date(trade.exit_time), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
          )}
          {trade.exit_price && (
            <div>
              <label className="block text-sm font-medium text-slate-500">Exit Price</label>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {Number(trade.exit_price).toFixed(5)}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-500">Profit & Loss</label>
            <p className={`mt-1 text-2xl font-bold ${getProfitColor(trade.profit_loss)}`}>
              {trade.profit_loss ? `$${Number(trade.profit_loss).toFixed(2)}` : "-"}
            </p>
          </div>
          {trade.stop_loss && (
            <div>
              <label className="block text-sm font-medium text-slate-500">Stop Loss</label>
              <p className="mt-1 text-slate-900">{Number(trade.stop_loss).toFixed(5)}</p>
            </div>
          )}
          {trade.take_profit && (
            <div>
              <label className="block text-sm font-medium text-slate-500">Take Profit</label>
              <p className="mt-1 text-slate-900">{Number(trade.take_profit).toFixed(5)}</p>
            </div>
          )}
        </div>
      </div>

      {(account || strategy || setup || trade.notes || trade.has_missing_details) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Additional Information</h2>
          {trade.has_missing_details && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium">
                ⚠️ This trade has missing details. Please complete the trade information.
              </p>
            </div>
          )}
          <div className="space-y-4">
            {account && (
              <div>
                <label className="block text-sm font-medium text-slate-500">Account</label>
                <p className="mt-1 text-slate-900">{account.account_name}</p>
              </div>
            )}
            {strategy && (
              <div>
                <label className="block text-sm font-medium text-slate-500">Strategy</label>
                <p className="mt-1 text-slate-900">{strategy.name}</p>
              </div>
            )}
            {setup && (
              <div>
                <label className="block text-sm font-medium text-slate-500">Setup</label>
                <p className="mt-1 text-slate-900">{setup.name}</p>
              </div>
            )}
            {(trade.risk_percentage || trade.r_multiple || trade.discipline_score) && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Risk & Discipline</h3>
                <div className="grid grid-cols-2 gap-4">
                  {trade.risk_percentage && (
                    <div>
                      <label className="block text-xs text-slate-500">Risk %</label>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {trade.risk_percentage}%
                      </p>
                    </div>
                  )}
                  {trade.r_multiple && (
                    <div>
                      <label className="block text-xs text-slate-500">R-Multiple</label>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {Number(trade.r_multiple).toFixed(2)}R
                      </p>
                    </div>
                  )}
                  {trade.discipline_score && (
                    <div>
                      <label className="block text-xs text-slate-500">Discipline</label>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {trade.discipline_score}/10
                      </p>
                    </div>
                  )}
                  {trade.risk_management_score && (
                    <div>
                      <label className="block text-xs text-slate-500">Risk Mgmt</label>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {trade.risk_management_score}/10
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {trade.notes && (
              <div>
                <label className="block text-sm font-medium text-slate-500">Notes</label>
                <p className="mt-1 text-slate-900 whitespace-pre-wrap">{trade.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

