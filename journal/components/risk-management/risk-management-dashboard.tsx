"use client";

import { useState } from "react";
import { Database } from "@/types/database.types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

// Extend the base Trade row type with optional analytics fields that are
// calculated/augmented in the app layer but not present in the generated
// Database types.
type AnalyticTrade = Trade & {
  risk_percentage?: number | null;
  discipline_score?: number | null;
  risk_management_score?: number | null;
};

interface RiskManagementDashboardProps {
  readonly trades: AnalyticTrade[];
  readonly accounts: Account[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function RiskManagementDashboard({ trades, accounts }: RiskManagementDashboardProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  const closedTrades = trades.filter((t) => t.status === "closed");
  const filteredTrades = selectedAccount
    ? closedTrades.filter((t) => t.account_id === selectedAccount)
    : closedTrades;

  // Risk Management Metrics
  const tradesWithRisk = filteredTrades.filter((t) => t.risk_percentage || t.risk_amount);
  const tradesWithRMultiple = filteredTrades.filter((t) => t.r_multiple);
  const tradesWithDiscipline = filteredTrades.filter((t) => t.discipline_score);
  const tradesWithRiskMgmt = filteredTrades.filter((t) => t.risk_management_score);

  // Average Risk Metrics
  const avgRiskPercentage =
    tradesWithRisk.reduce((sum, t) => sum + (t.risk_percentage || 0), 0) /
    tradesWithRisk.length || 0;

  const avgRMultiple =
    tradesWithRMultiple.reduce((sum, t) => sum + (Number(t.r_multiple) || 0), 0) /
    tradesWithRMultiple.length || 0;

  const avgDiscipline =
    tradesWithDiscipline.reduce((sum, t) => sum + (t.discipline_score || 0), 0) /
    tradesWithDiscipline.length || 0;

  const avgRiskMgmt =
    tradesWithRiskMgmt.reduce((sum, t) => sum + (t.risk_management_score || 0), 0) /
    tradesWithRiskMgmt.length || 0;

  // Risk Distribution
  const riskDistribution = [
    { name: "0-1%", count: tradesWithRisk.filter((t) => (t.risk_percentage || 0) <= 1).length },
    { name: "1-2%", count: tradesWithRisk.filter((t) => (t.risk_percentage || 0) > 1 && (t.risk_percentage || 0) <= 2).length },
    { name: "2-3%", count: tradesWithRisk.filter((t) => (t.risk_percentage || 0) > 2 && (t.risk_percentage || 0) <= 3).length },
    { name: "3-5%", count: tradesWithRisk.filter((t) => (t.risk_percentage || 0) > 3 && (t.risk_percentage || 0) <= 5).length },
    { name: "5%+", count: tradesWithRisk.filter((t) => (t.risk_percentage || 0) > 5).length },
  ];

  // R-Multiple Distribution
  const rMultipleDistribution = [
    { name: "< 1R", count: tradesWithRMultiple.filter((t) => (Number(t.r_multiple) || 0) < 1).length },
    { name: "1-2R", count: tradesWithRMultiple.filter((t) => (Number(t.r_multiple) || 0) >= 1 && (Number(t.r_multiple) || 0) < 2).length },
    { name: "2-3R", count: tradesWithRMultiple.filter((t) => (Number(t.r_multiple) || 0) >= 2 && (Number(t.r_multiple) || 0) < 3).length },
    { name: "3-5R", count: tradesWithRMultiple.filter((t) => (Number(t.r_multiple) || 0) >= 3 && (Number(t.r_multiple) || 0) < 5).length },
    { name: "5R+", count: tradesWithRMultiple.filter((t) => (Number(t.r_multiple) || 0) >= 5).length },
  ];

  // Performance by Risk Level
  const performanceByRisk = riskDistribution.map((risk) => {
    const riskTrades = tradesWithRisk.filter((t) => {
      const riskPct = t.risk_percentage || 0;
      if (risk.name === "0-1%") return riskPct <= 1;
      if (risk.name === "1-2%") return riskPct > 1 && riskPct <= 2;
      if (risk.name === "2-3%") return riskPct > 2 && riskPct <= 3;
      if (risk.name === "3-5%") return riskPct > 3 && riskPct <= 5;
      return riskPct > 5;
    });
    const totalPL = riskTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const winRate = riskTrades.length > 0
      ? (riskTrades.filter((t) => (t.profit_loss || 0) > 0).length / riskTrades.length) * 100
      : 0;
    return {
      risk: risk.name,
      trades: riskTrades.length,
      totalPL,
      winRate: Number(winRate.toFixed(1)),
    };
  });

  // Discipline vs Performance
  const disciplinePerformance = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
    const scoreTrades = tradesWithDiscipline.filter((t) => t.discipline_score === score);
    const avgPL = scoreTrades.length > 0
      ? scoreTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / scoreTrades.length
      : 0;
    return {
      discipline: score,
      avgPL: Number(avgPL.toFixed(2)),
      trades: scoreTrades.length,
    };
  }).filter((d) => d.trades > 0);

  // Generate Dynamic Recommendations
  const generateRecommendations = () => {
    const recommendations: Array<{ type: "warning" | "info" | "success"; message: string; priority: number }> = [];

    // Risk percentage recommendations
    if (avgRiskPercentage > 3) {
      recommendations.push({
        type: "warning",
        message: `Your average risk per trade is ${avgRiskPercentage.toFixed(2)}%, which is above the recommended 1-2%. Consider reducing position sizes to protect your capital.`,
        priority: 1,
      });
    } else if (avgRiskPercentage > 2) {
      recommendations.push({
        type: "info",
        message: `Your average risk per trade is ${avgRiskPercentage.toFixed(2)}%. Consider maintaining risk at 1-2% per trade for better capital preservation.`,
        priority: 2,
      });
    } else if (avgRiskPercentage > 0 && avgRiskPercentage <= 2) {
      recommendations.push({
        type: "success",
        message: `Excellent! Your average risk per trade is ${avgRiskPercentage.toFixed(2)}%, which is within the recommended 1-2% range.`,
        priority: 3,
      });
    }

    // R-multiple recommendations
    if (avgRMultiple > 0 && avgRMultiple < 1) {
      recommendations.push({
        type: "warning",
        message: `Your average R-multiple is ${avgRMultiple.toFixed(2)}R, meaning you're risking more than you're winning. Focus on improving risk:reward ratios (aim for minimum 1:2).`,
        priority: 1,
      });
    } else if (avgRMultiple >= 1 && avgRMultiple < 2) {
      recommendations.push({
        type: "info",
        message: `Your average R-multiple is ${avgRMultiple.toFixed(2)}R. While positive, consider targeting higher R:R ratios (2R+) for better long-term profitability.`,
        priority: 2,
      });
    } else if (avgRMultiple >= 2) {
      recommendations.push({
        type: "success",
        message: `Great work! Your average R-multiple is ${avgRMultiple.toFixed(2)}R, indicating strong risk management and reward potential.`,
        priority: 3,
      });
    }

    // Win rate vs R-multiple recommendations
    const winRate = filteredTrades.length > 0
      ? (filteredTrades.filter((t) => (t.profit_loss || 0) > 0).length / filteredTrades.length) * 100
      : 0;
    const totalWins = filteredTrades.filter((t) => (t.profit_loss || 0) > 0).reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const totalLosses = Math.abs(filteredTrades.filter((t) => (t.profit_loss || 0) < 0).reduce((sum, t) => sum + (t.profit_loss || 0), 0));
    const profitFactorValue = totalLosses > 0 ? totalWins / totalLosses : 0;

    if (winRate < 40 && avgRMultiple > 0 && avgRMultiple < 1) {
      recommendations.push({
        type: "warning",
        message: "Your win rate is below 40% and R-multiple is less than 1R. Consider refining your entry criteria and exit strategy to improve both metrics.",
        priority: 1,
      });
    }

    if (profitFactorValue > 0 && profitFactorValue < 1) {
      recommendations.push({
        type: "warning",
        message: `Your profit factor is ${profitFactorValue.toFixed(2)}, which is below 1.0. This means losses exceed wins. Focus on improving risk:reward ratios and entry quality.`,
        priority: 1,
      });
    } else if (profitFactorValue >= 1 && profitFactorValue < 1.5) {
      recommendations.push({
        type: "info",
        message: `Your profit factor is ${profitFactorValue.toFixed(2)}. While profitable, aim for 1.5+ for sustainable long-term trading.`,
        priority: 2,
      });
    }

    // Discipline score recommendations
    if (avgDiscipline > 0 && avgDiscipline < 6) {
      recommendations.push({
        type: "warning",
        message: `Your average discipline score is ${avgDiscipline.toFixed(1)}/10. Low discipline often leads to poor decision-making. Consider creating stricter trading rules and sticking to your plan.`,
        priority: 1,
      });
    } else if (avgDiscipline >= 6 && avgDiscipline < 8) {
      recommendations.push({
        type: "info",
        message: `Your average discipline score is ${avgDiscipline.toFixed(1)}/10. Continue improving consistency by following your trading plan more closely.`,
        priority: 2,
      });
    } else if (avgDiscipline >= 8) {
      recommendations.push({
        type: "success",
        message: `Excellent discipline! Your average score is ${avgDiscipline.toFixed(1)}/10. Keep maintaining this high level of consistency.`,
        priority: 3,
      });
    }

    // Risk distribution recommendations
    const highRiskTrades = tradesWithRisk.filter((t) => (t.risk_percentage || 0) > 3).length;
    if (highRiskTrades > 0) {
      recommendations.push({
        type: "warning",
        message: `You have ${highRiskTrades} trade(s) with risk above 3%. High-risk trades can quickly deplete your account. Aim to keep all trades under 2% risk.`,
        priority: 1,
      });
    }

    // Performance by risk level recommendations
    const optimalRiskLevel = performanceByRisk.find((p) => p.winRate > 50 && p.totalPL > 0);
    if (optimalRiskLevel) {
      recommendations.push({
        type: "info",
        message: `Your best performance occurs at the ${optimalRiskLevel.risk} risk level (${optimalRiskLevel.winRate.toFixed(1)}% win rate, $${optimalRiskLevel.totalPL.toFixed(2)} P&L). Consider focusing on this risk range.`,
        priority: 2,
      });
    }

    // Sort by priority (1 = highest, 3 = lowest)
    return recommendations.sort((a, b) => a.priority - b.priority);
  };

  const recommendations = generateRecommendations();

  return (
    <div className="space-y-6">
      {/* Account Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <label htmlFor="account-filter" className="block text-sm font-medium text-slate-700 mb-2">
          Filter by Account
        </label>
        <select
          id="account-filter"
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.account_name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-sm font-medium text-slate-600 mb-1">Avg Risk %</div>
          <div className="text-3xl font-bold text-slate-900">
            {avgRiskPercentage > 0 ? `${avgRiskPercentage.toFixed(2)}%` : "-"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {tradesWithRisk.length} trades tracked
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-sm font-medium text-slate-600 mb-1">Avg R-Multiple</div>
          <div className="text-3xl font-bold text-slate-900">
            {avgRMultiple > 0 ? `${avgRMultiple.toFixed(2)}R` : "-"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {tradesWithRMultiple.length} trades tracked
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-sm font-medium text-slate-600 mb-1">Avg Discipline</div>
          <div className="text-3xl font-bold text-slate-900">
            {avgDiscipline > 0 ? `${avgDiscipline.toFixed(1)}/10` : "-"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {tradesWithDiscipline.length} trades tracked
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-sm font-medium text-slate-600 mb-1">Avg Risk Mgmt</div>
          <div className="text-3xl font-bold text-slate-900">
            {avgRiskMgmt > 0 ? `${avgRiskMgmt.toFixed(1)}/10` : "-"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {tradesWithRiskMgmt.length} trades tracked
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Risk Percentage Distribution
          </h3>
          {riskDistribution.some((r) => r.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "12px" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" name="Trades" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No risk data available
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            R-Multiple Distribution
          </h3>
          {rMultipleDistribution.some((r) => r.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={rMultipleDistribution.filter((d) => d.count > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${percent ? (percent * 100).toFixed(0) : "0"}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {rMultipleDistribution.map((entry, index) => (
                    <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No R-multiple data available
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Performance by Risk Level
          </h3>
          {performanceByRisk.some((p) => p.trades > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceByRisk}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="risk" stroke="#64748b" style={{ fontSize: "12px" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="totalPL" fill="#10b981" name="Total P&L ($)" />
                <Bar dataKey="winRate" fill="#3b82f6" name="Win Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No performance data available
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Discipline vs Performance
          </h3>
          {disciplinePerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={disciplinePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="discipline" stroke="#64748b" style={{ fontSize: "12px" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgPL"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Avg P&L ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No discipline data available
            </div>
          )}
        </div>
      </div>

      {/* Data Completeness */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Data Completeness</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Risk % Tracked</div>
            <div className="text-2xl font-bold text-blue-600">{tradesWithRisk.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              {filteredTrades.length > 0
                ? `${((tradesWithRisk.length / filteredTrades.length) * 100).toFixed(1)}% coverage`
                : "0% coverage"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">R-Multiple Tracked</div>
            <div className="text-2xl font-bold text-emerald-600">{tradesWithRMultiple.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              {filteredTrades.length > 0
                ? `${((tradesWithRMultiple.length / filteredTrades.length) * 100).toFixed(1)}% coverage`
                : "0% coverage"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Discipline Scores</div>
            <div className="text-2xl font-bold text-indigo-600">{tradesWithDiscipline.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              {filteredTrades.length > 0
                ? `${((tradesWithDiscipline.length / filteredTrades.length) * 100).toFixed(1)}% coverage`
                : "0% coverage"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Risk Mgmt Scores</div>
            <div className="text-2xl font-bold text-purple-600">{tradesWithRiskMgmt.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              {filteredTrades.length > 0
                ? `${((tradesWithRiskMgmt.length / filteredTrades.length) * 100).toFixed(1)}% coverage`
                : "0% coverage"}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            💡 Risk Management Recommendations
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.type === "warning"
                    ? "bg-red-50 border-red-500"
                    : rec.type === "info"
                    ? "bg-blue-50 border-blue-500"
                    : "bg-green-50 border-green-500"
                }`}
              >
                <div className="flex items-start">
                  <span className="text-xl mr-3">
                    {rec.type === "warning" ? "⚠️" : rec.type === "info" ? "ℹ️" : "✅"}
                  </span>
                  <p
                    className={`text-sm ${
                      rec.type === "warning"
                        ? "text-red-800"
                        : rec.type === "info"
                        ? "text-blue-800"
                        : "text-green-800"
                    }`}
                  >
                    {rec.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

