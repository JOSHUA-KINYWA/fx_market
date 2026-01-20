"use client";

import { Database } from "@/types/database.types";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format } from "date-fns";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

interface DashboardChartsProps {
  readonly trades: Trade[];
}

export function DashboardCharts({ trades }: DashboardChartsProps) {
  const closedTrades = trades.filter((t) => t.status === "closed");
  
  // Calculate equity curve
  const equityData = closedTrades
    .sort((a, b) => 
      new Date(a.exit_time || a.entry_time).getTime() - 
      new Date(b.exit_time || b.entry_time).getTime()
    )
    .reduce((acc, trade, index) => {
      const previousEquity = acc.length > 0 ? acc[acc.length - 1].equity : 0;
      const newEquity = previousEquity + (trade.profit_loss || 0);
      acc.push({
        trade: index + 1,
        equity: newEquity,
        date: format(new Date(trade.exit_time || trade.entry_time), "MMM dd"),
      });
      return acc;
    }, [] as { trade: number; equity: number; date: string }[]);

  // Performance by currency pair (top 5)
  const pairPerformance = closedTrades.reduce((acc, trade) => {
    const pair = trade.currency_pair;
    if (!acc[pair]) {
      acc[pair] = { trades: 0, profit: 0, wins: 0 };
    }
    acc[pair].trades++;
    acc[pair].profit += trade.profit_loss || 0;
    if ((trade.profit_loss || 0) > 0) acc[pair].wins++;
    return acc;
  }, {} as Record<string, { trades: number; profit: number; wins: number }>);

  const pairData = Object.entries(pairPerformance)
    .map(([pair, data]) => ({
      pair,
      profit: data.profit,
      winRate: (data.wins / data.trades) * 100,
      trades: data.trades,
    }))
    .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Equity Curve</h3>
      {equityData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={equityData}>
            <defs>
              <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              style={{ fontSize: "12px" }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: "12px" }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEquity)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[300px] text-slate-500">
          <p>No closed trades to display</p>
        </div>
      )}

      {pairData.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">Top Performing Pairs</h4>
          <div className="space-y-3">
            {pairData.map((data) => (
              <div key={data.pair} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900">{data.pair}</span>
                    <span className={`text-sm font-semibold ${
                      data.profit >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}>
                      ${data.profit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{data.trades} trades</span>
                    <span>Win Rate: {data.winRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
