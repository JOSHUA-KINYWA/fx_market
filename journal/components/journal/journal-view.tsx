"use client";

import { Database } from "@/types/database.types";
import { format } from "date-fns";
import Link from "next/link";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

interface JournalViewProps {
  trades: Trade[];
}

export function JournalView({ trades }: JournalViewProps) {
  const groupedByDate = trades.reduce((acc, trade) => {
    const date = format(new Date(trade.entry_time), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const getProfitColor = (profit: number | null) => {
    if (!profit) return "text-gray-500";
    return profit >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold";
  };

  return (
    <div className="space-y-8">
      {sortedDates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No trades found. Start by adding a trade or importing CSV.</p>
        </div>
      ) : (
        sortedDates.map((date) => {
          const dayTrades = groupedByDate[date];
          const dayProfit = dayTrades.reduce(
            (sum, t) => sum + (t.profit_loss || 0),
            0
          );
          const winCount = dayTrades.filter((t) => (t.profit_loss || 0) > 0).length;

          return (
            <div key={date} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {format(new Date(date), "EEEE, MMMM dd, yyyy")}
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      {dayTrades.length} trade{dayTrades.length !== 1 ? "s" : ""}
                    </div>
                    <div className={`text-lg font-semibold ${getProfitColor(dayProfit)}`}>
                      {dayProfit >= 0 ? "+" : ""}${dayProfit.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {winCount}/{dayTrades.length} wins
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {dayTrades.map((trade) => (
                  <Link
                    key={trade.id}
                    href={`/trades/${trade.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                              trade.direction === "buy"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {trade.direction.toUpperCase()}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {trade.currency_pair}
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(trade.entry_time), "HH:mm")}
                          </span>
                        </div>
                        {trade.notes && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {trade.notes}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <div className={`text-lg font-semibold ${getProfitColor(trade.profit_loss)}`}>
                          {trade.profit_loss
                            ? `${trade.profit_loss >= 0 ? "+" : ""}$${Number(trade.profit_loss).toFixed(2)}`
                            : "-"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {trade.status || "open"}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}



