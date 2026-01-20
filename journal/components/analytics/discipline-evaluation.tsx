"use client";

import { Database } from "@/types/database.types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

interface DisciplineEvaluationProps {
  readonly trades: Trade[];
}

export function DisciplineEvaluation({ trades }: DisciplineEvaluationProps) {
  const closedTrades = trades.filter((t) => t.status === "closed");

  // Calculate average discipline and risk management scores
  const avgDiscipline =
    closedTrades
      .filter((t) => t.discipline_score)
      .reduce((sum, t) => sum + (t.discipline_score || 0), 0) /
    closedTrades.filter((t) => t.discipline_score).length || 0;

  const avgRiskManagement =
    closedTrades
      .filter((t) => t.risk_management_score)
      .reduce((sum, t) => sum + (t.risk_management_score || 0), 0) /
    closedTrades.filter((t) => t.risk_management_score).length || 0;

  // Discipline by day of week
  const disciplineByDay = closedTrades.reduce((acc, trade) => {
    const day = format(new Date(trade.entry_time), "EEEE");
    if (!acc[day]) {
      acc[day] = { count: 0, total: 0, riskTotal: 0, riskCount: 0 };
    }
    acc[day].count++;
    if (trade.discipline_score) {
      acc[day].total += trade.discipline_score;
    }
    if (trade.risk_management_score) {
      acc[day].riskTotal += trade.risk_management_score;
      acc[day].riskCount++;
    }
    return acc;
  }, {} as Record<string, { count: number; total: number; riskTotal: number; riskCount: number }>);

  const dayData = Object.entries(disciplineByDay).map(([day, data]) => ({
    day,
    discipline: data.count > 0 ? data.total / data.count : 0,
    riskManagement: data.riskCount > 0 ? data.riskTotal / data.riskCount : 0,
    trades: data.count,
  }));

  // Discipline trend over time (by week)
  const disciplineByWeek = closedTrades.reduce((acc, trade) => {
    const weekStart = startOfWeek(new Date(trade.entry_time));
    const weekKey = format(weekStart, "yyyy-MM-dd");
    if (!acc[weekKey]) {
      acc[weekKey] = { count: 0, total: 0, riskTotal: 0, riskCount: 0 };
    }
    acc[weekKey].count++;
    if (trade.discipline_score) {
      acc[weekKey].total += trade.discipline_score;
    }
    if (trade.risk_management_score) {
      acc[weekKey].riskTotal += trade.risk_management_score;
      acc[weekKey].riskCount++;
    }
    return acc;
  }, {} as Record<string, { count: number; total: number; riskTotal: number; riskCount: number }>);

  const weekData = Object.entries(disciplineByWeek)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, data]) => ({
      week: format(new Date(week), "MMM dd"),
      discipline: data.count > 0 ? data.total / data.count : 0,
      riskManagement: data.riskCount > 0 ? data.riskTotal / data.riskCount : 0,
    }));

  // Risk management stats
  const tradesWithRisk = closedTrades.filter((t) => t.risk_percentage);
  const avgRiskPercentage =
    tradesWithRisk.reduce((sum, t) => sum + (t.risk_percentage || 0), 0) /
    tradesWithRisk.length || 0;

  const tradesWithRMultiple = closedTrades.filter((t) => t.r_multiple);
  const avgRMultiple =
    tradesWithRMultiple.reduce((sum, t) => sum + (t.r_multiple || 0), 0) /
    tradesWithRMultiple.length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-sm font-medium text-slate-600 mb-1">Avg Discipline</div>
          <div className="text-3xl font-bold text-slate-900">
            {avgDiscipline > 0 ? avgDiscipline.toFixed(1) : "-"}/10
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(avgDiscipline / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-sm font-medium text-slate-600 mb-1">Avg Risk Management</div>
          <div className="text-3xl font-bold text-slate-900">
            {avgRiskManagement > 0 ? avgRiskManagement.toFixed(1) : "-"}/10
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full"
                style={{ width: `${(avgRiskManagement / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-sm font-medium text-slate-600 mb-1">Avg Risk %</div>
          <div className="text-3xl font-bold text-slate-900">
            {avgRiskPercentage > 0 ? `${avgRiskPercentage.toFixed(2)}%` : "-"}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {tradesWithRisk.length} trades tracked
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-sm font-medium text-slate-600 mb-1">Avg R-Multiple</div>
          <div className="text-3xl font-bold text-slate-900">
            {avgRMultiple > 0 ? avgRMultiple.toFixed(2) : "-"}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {tradesWithRMultiple.length} trades tracked
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Discipline by Day of Week
          </h3>
          {dayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: "12px" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="discipline" fill="#3b82f6" name="Discipline" />
                <Bar dataKey="riskManagement" fill="#10b981" name="Risk Mgmt" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No data available
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Discipline Trend (Weekly)
          </h3>
          {weekData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" stroke="#64748b" style={{ fontSize: "12px" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="discipline"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Discipline"
                />
                <Line
                  type="monotone"
                  dataKey="riskManagement"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Risk Mgmt"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Missing Details Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Data Completeness</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Trades with Missing Details</div>
            <div className="text-2xl font-bold text-amber-600">
              {closedTrades.filter((t) => t.has_missing_details).length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              of {closedTrades.length} total trades
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Trades with Risk Data</div>
            <div className="text-2xl font-bold text-blue-600">{tradesWithRisk.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              {closedTrades.length > 0
                ? `${((tradesWithRisk.length / closedTrades.length) * 100).toFixed(1)}% coverage`
                : "0% coverage"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Trades with Discipline Scores</div>
            <div className="text-2xl font-bold text-emerald-600">
              {closedTrades.filter((t) => t.discipline_score).length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {closedTrades.length > 0
                ? `${((closedTrades.filter((t) => t.discipline_score).length / closedTrades.length) * 100).toFixed(1)}% coverage`
                : "0% coverage"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



