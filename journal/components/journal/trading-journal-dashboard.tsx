"use client";

import { useState, useEffect } from "react";
import { Download, Plus, Trash2, TrendingUp, DollarSign, Target, BarChart3, RefreshCw } from "lucide-react";
import { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

interface TradingJournalDashboardProps {
  trades: Trade[];
  accounts: Account[];
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  activeAccount?: Account | null;
}

interface AccountSettings {
  startingCapital: number;
  currentCapital: number;
  riskPerTrade: number;
  maxDailyLoss: number;
  leverage: number;
  maxLossTarget: number;
  profitTarget: number;
  dailyLossTarget: number;
}

export function TradingJournalDashboard({
  trades,
  accounts,
  profile,
  activeAccount,
}: TradingJournalDashboardProps) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(activeAccount?.id || null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(activeAccount || null);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>(trades);
  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    startingCapital: activeAccount?.initial_balance || 10000,
    currentCapital: activeAccount?.current_balance || 10000,
    riskPerTrade: 2,
    maxDailyLoss: 100,
    leverage: 50,
    maxLossTarget: 800,
    profitTarget: 0,
    dailyLossTarget: 392.72,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "goals" | "trades">("overview");
  const [timeUntilReset, setTimeUntilReset] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const supabase = createClient();

  // Filter trades based on selected account
  useEffect(() => {
    if (selectedAccountId) {
      const filtered = trades.filter((t) => t.account_id === selectedAccountId);
      setFilteredTrades(filtered);
      const account = accounts.find((a) => a.id === selectedAccountId);
      setSelectedAccount(account || null);
      if (account) {
        setAccountSettings((prev) => ({
          ...prev,
          startingCapital: account.initial_balance || prev.startingCapital,
          currentCapital: account.current_balance || prev.currentCapital,
        }));
      }
    } else {
      setFilteredTrades(trades);
      setSelectedAccount(null);
    }
  }, [selectedAccountId, trades, accounts]);

  // Refresh data from database
  const refreshData = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (filteredTrades.length > 0) {
      const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const calculatedCapital = accountSettings.startingCapital + totalPnL;
      
      if (Math.abs(calculatedCapital - accountSettings.currentCapital) > 0.01) {
        setAccountSettings((prev) => ({ ...prev, currentCapital: calculatedCapital }));
      }
    }
  }, [filteredTrades, accountSettings.startingCapital]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilReset(getTimeUntilReset());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimeUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const loadSettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      // If error is not "not found" type, log it
      if (error && error.code !== "PGRST116") {
        console.error("Failed to load settings:", error.message || error);
      }

      if (data?.preferences) {
        const prefs = data.preferences as Record<string, any>;
        if (prefs.accountSettings) {
          setAccountSettings({
            ...accountSettings,
            ...prefs.accountSettings,
            startingCapital: activeAccount?.initial_balance || prefs.accountSettings.startingCapital || 10000,
            currentCapital: activeAccount?.current_balance || prefs.accountSettings.currentCapital || 10000,
          });
        }
      } else {
        // Initialize with defaults - don't auto-save to avoid infinite loop
        const defaultSettings = {
          ...accountSettings,
          startingCapital: activeAccount?.initial_balance || 10000,
          currentCapital: activeAccount?.current_balance || 10000,
        };
        setAccountSettings(defaultSettings);
        // Only save if user explicitly sets settings
      }
    } catch (error: any) {
      // Silently fail for settings - they're optional
      console.error("Failed to load settings:", error?.message || error);
    }
  };

  const saveSettings = async (settings: AccountSettings) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if settings exist first
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const settingsData = {
        user_id: user.id,
        preferences: { accountSettings: settings },
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        // Update existing record
        const result = await supabase
          .from("user_settings")
          .update(settingsData)
          .eq("user_id", user.id);
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from("user_settings")
          .insert(settingsData);
        error = result.error;
      }

      if (error) {
        console.error("Failed to save settings:", error.message || error);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error("Failed to save settings:", error?.message || error);
      return false;
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Time",
      "Symbol",
      "Side",
      "Entry",
      "Exit",
      "Position Size",
      "SL",
      "TP",
      "Result",
      "P/L",
      "Notes",
    ];
    const rows = filteredTrades.map((t) => [
      format(new Date(t.entry_time), "yyyy-MM-dd"),
      format(new Date(t.entry_time), "HH:mm"),
      t.currency_pair,
      t.direction.toUpperCase(),
      t.entry_price.toString(),
      t.exit_price?.toString() || "",
      t.position_size.toString(),
      t.stop_loss?.toString() || "",
      t.take_profit?.toString() || "",
      t.status || "",
      t.profit_loss?.toString() || "0",
      t.notes || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trading_journal_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Calculate statistics based on filtered trades
  const closedTrades = filteredTrades.filter((t) => t.status === "closed");
  const wins = closedTrades.filter((t) => (t.profit_loss || 0) > 0);
  const losses = closedTrades.filter((t) => (t.profit_loss || 0) < 0);
  const breakeven = closedTrades.filter((t) => (t.profit_loss || 0) === 0);

  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const avgWin =
    wins.length > 0
      ? wins.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / wins.length
      : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / losses.length)
      : 0;

  const winRate =
    closedTrades.length > 0
      ? ((wins.length / closedTrades.length) * 100).toFixed(1)
      : "0.0";

  const planCompliance =
    closedTrades.length > 0
      ? (
          (closedTrades.filter((t) => t.rule_followed === true).length /
            closedTrades.length) *
          100
        ).toFixed(1)
      : "0.0";

  const rrTrades = closedTrades.filter(
    (t) => t.risk_reward_ratio && parseFloat(t.risk_reward_ratio.toString()) > 0
  );
  const avgRR =
    rrTrades.length > 0
      ? (
          rrTrades.reduce(
            (sum, t) => sum + parseFloat(t.risk_reward_ratio?.toString() || "0"),
            0
          ) / rrTrades.length
        ).toFixed(2)
      : "0.00";

  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentStreak = 0;
  let lastResult = "";

  [...closedTrades].reverse().forEach((trade) => {
    const isProfitable = (trade.profit_loss || 0) > 0;
    if (lastResult === (isProfitable ? "win" : "loss") || lastResult === "") {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    lastResult = isProfitable ? "win" : "loss";

    if (isProfitable && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
    if (!isProfitable && currentStreak > maxLossStreak) maxLossStreak = currentStreak;
  });

  const largestWin =
    wins.length > 0
      ? Math.max(...wins.map((t) => t.profit_loss || 0))
      : 0;
  const largestLoss =
    losses.length > 0
      ? Math.min(...losses.map((t) => t.profit_loss || 0))
      : 0;

  const profitFactor =
    avgLoss > 0
      ? ((avgWin * wins.length) / (avgLoss * losses.length)).toFixed(2)
      : "0.00";

  const totalReturn =
    accountSettings.startingCapital > 0
      ? (
          ((accountSettings.currentCapital - accountSettings.startingCapital) /
            accountSettings.startingCapital) *
          100
        ).toFixed(2)
      : "0.00";

  const uniqueDays = [...new Set(closedTrades.map((t) => format(new Date(t.exit_time || t.entry_time), "yyyy-MM-dd")))].length;
  const dailyAvg = uniqueDays > 0 ? (totalPnL / uniqueDays).toFixed(2) : "0.00";

  // Today's trades
  const today = new Date().toISOString().split("T")[0];
  const todayTrades = closedTrades.filter(
    (t) => format(new Date(t.exit_time || t.entry_time), "yyyy-MM-dd") === today
  );
  const todayPnL = todayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);

  const stats = {
    totalTrades: filteredTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    totalPnL,
    avgWin,
    avgLoss,
    winRate,
    planCompliance,
    profitFactor,
    avgRR,
    largestWin,
    largestLoss,
    consecutiveWins: maxWinStreak,
    consecutiveLosses: maxLossStreak,
    totalReturn,
    dailyAvg,
  };

  const accountName = activeAccount?.account_name || "Default Account";
  const accountNumber = activeAccount?.account_number || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800 rounded-lg shadow-xl p-6 mb-6 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Trading Journal - {selectedAccount?.account_name || "All Accounts"}
              </h1>
              <p className="text-slate-400">
                Account: {selectedAccount?.account_number || "All Accounts"} | {profile?.full_name || "User"}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                Settings
              </button>
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
                title="Refresh data from database"
              >
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
                disabled={filteredTrades.length === 0}
                title="Export filtered trades to CSV"
              >
                <Download size={18} />
                Export
              </button>
              <Link
                href="/trades/new"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={18} />
                New Trade
              </Link>
            </div>
          </div>

          {/* Account Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Account
            </label>
            <select
              value={selectedAccountId || ""}
              onChange={(e) => setSelectedAccountId(e.target.value || null)}
              className="w-full md:w-auto px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name} {account.account_number ? `(${account.account_number})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-2 rounded-lg transition ${
                activeTab === "overview"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("goals")}
              className={`px-6 py-2 rounded-lg transition ${
                activeTab === "goals"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Goals
            </button>
            <button
              onClick={() => setActiveTab("trades")}
              className={`px-6 py-2 rounded-lg transition ${
                activeTab === "trades"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Trades
            </button>
          </div>

          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-700 rounded-lg p-4">
                  <span className="text-slate-400 text-sm">Starting Capital</span>
                  <p className="text-2xl font-bold text-white">
                    ${accountSettings.startingCapital.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <span className="text-slate-400 text-sm">Current Capital</span>
                  <p className="text-2xl font-bold text-white">
                    ${accountSettings.currentCapital.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <span className="text-slate-400 text-sm">Total Return</span>
                  <p
                    className={`text-2xl font-bold ${
                      parseFloat(stats.totalReturn) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {stats.totalReturn}%
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <span className="text-slate-400 text-sm">Daily Average</span>
                  <p
                    className={`text-2xl font-bold ${
                      parseFloat(stats.dailyAvg) >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ${stats.dailyAvg}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={20} className="text-blue-400" />
                    <span className="text-slate-400 text-sm">Total Trades</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.totalTrades}</p>
                </div>

                <div className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={20} className="text-green-400" />
                    <span className="text-slate-400 text-sm">Win Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.winRate}%</p>
                  <p className="text-xs text-slate-400">
                    {stats.wins}W / {stats.losses}L
                  </p>
                </div>

                <div className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign
                      size={20}
                      className={stats.totalPnL >= 0 ? "text-green-400" : "text-red-400"}
                    />
                    <span className="text-slate-400 text-sm">Total P/L</span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      stats.totalPnL >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ${stats.totalPnL.toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={20} className="text-purple-400" />
                    <span className="text-slate-400 text-sm">Plan Compliance</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.planCompliance}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-slate-700 rounded-lg p-3">
                  <span className="text-slate-400 text-sm">Avg Win</span>
                  <p className="text-lg font-semibold text-green-400">
                    ${stats.avgWin.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <span className="text-slate-400 text-sm">Avg Loss</span>
                  <p className="text-lg font-semibold text-red-400">
                    ${stats.avgLoss.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <span className="text-slate-400 text-sm">Profit Factor</span>
                  <p className="text-lg font-semibold text-white">
                    {stats.profitFactor || "N/A"}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <span className="text-slate-400 text-sm">Avg R:R</span>
                  <p className="text-lg font-semibold text-white">{stats.avgRR || "N/A"}</p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <span className="text-slate-400 text-sm">Largest Win</span>
                  <p className="text-lg font-semibold text-green-400">
                    ${stats.largestWin.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <span className="text-slate-400 text-sm">Largest Loss</span>
                  <p className="text-lg font-semibold text-red-400">
                    ${stats.largestLoss.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <span className="text-slate-400 text-sm">Max Win Streak</span>
                  <p className="text-lg font-semibold text-white">{stats.consecutiveWins}</p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <span className="text-slate-400 text-sm">Max Loss Streak</span>
                  <p className="text-lg font-semibold text-white">{stats.consecutiveLosses}</p>
                </div>
              </div>
            </>
          )}

          {activeTab === "goals" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-6 border border-red-900/30">
                <h3 className="text-2xl font-bold text-white mb-4">Max Loss</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Max Loss Target</p>
                    <p className="text-2xl font-bold text-white">
                      ${accountSettings.maxLossTarget.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Max Loss Remaining</p>
                    <p className="text-2xl font-bold text-white">
                      ${(accountSettings.maxLossTarget + stats.totalPnL).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Max Loss Threshold</p>
                    <p className="text-2xl font-bold text-white">
                      ${
                        (accountSettings.startingCapital - accountSettings.maxLossTarget).toFixed(
                          2
                        )
                      }
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>$0.00</span>
                    <span className="font-semibold text-red-400">
                      ${stats.totalPnL.toFixed(2)}
                    </span>
                    <span>${accountSettings.maxLossTarget.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-full transition-all duration-500 flex items-center justify-end px-2"
                      style={{
                        width: `${
                          Math.min(
                            (Math.abs(stats.totalPnL) / accountSettings.maxLossTarget) * 100,
                            100
                          )
                        }%`,
                      }}
                    >
                      <span className="text-xs font-bold text-white">
                        {(
                          (Math.abs(stats.totalPnL) / accountSettings.maxLossTarget) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-6 border border-green-900/30">
                <h3 className="text-2xl font-bold text-white mb-4">Profit</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Profit Target</p>
                    <p className="text-2xl font-bold text-white">
                      ${accountSettings.profitTarget.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Profit Remaining</p>
                    <p className="text-2xl font-bold text-white">
                      ${accountSettings.profitTarget.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>$0.00</span>
                    <span className="font-semibold text-green-400">
                      {stats.totalPnL > 0 ? `$${stats.totalPnL.toFixed(2)}` : "$0.00"}
                    </span>
                    <span>
                      ${accountSettings.profitTarget.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-6 overflow-hidden">
                    {accountSettings.profitTarget > 0 && stats.totalPnL > 0 && (
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-500 flex items-center justify-end px-2"
                        style={{
                          width: `${
                            Math.min(
                              (stats.totalPnL / accountSettings.profitTarget) * 100,
                              100
                            )
                          }%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {((stats.totalPnL / accountSettings.profitTarget) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-6 border border-orange-900/30">
                <h3 className="text-2xl font-bold text-white mb-4">Daily Loss</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Daily Loss Target</p>
                    <p className="text-2xl font-bold text-white">
                      ${accountSettings.dailyLossTarget.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Daily Loss Remaining</p>
                    <p className="text-2xl font-bold text-white">
                      ${(accountSettings.dailyLossTarget + todayPnL).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Daily Loss Threshold</p>
                    <p className="text-2xl font-bold text-white">
                      ${
                        (accountSettings.currentCapital - accountSettings.dailyLossTarget).toFixed(
                          2
                        )
                      }
                    </p>
                  </div>
                </div>

                <p className="text-slate-300 mb-4">
                  Timer Reset In:{" "}
                  <span className="font-mono font-bold text-white">{timeUntilReset}</span>
                </p>

                <div className="relative">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>$0.00</span>
                    <span className="font-semibold text-orange-400">${todayPnL.toFixed(2)}</span>
                    <span>${accountSettings.dailyLossTarget.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-full transition-all duration-500 flex items-center justify-end px-2"
                      style={{
                        width: `${
                          Math.min(
                            (Math.abs(todayPnL) / accountSettings.dailyLossTarget) * 100,
                            100
                          )
                        }%`,
                      }}
                    >
                      <span className="text-xs font-bold text-white">
                        {((Math.abs(todayPnL) / accountSettings.dailyLossTarget) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {todayPnL < 0 &&
                  Math.abs(todayPnL) > accountSettings.dailyLossTarget * 0.7 && (
                    <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-3">
                      <p className="text-red-300 text-sm font-semibold">
                        ⚠️ Warning: You've used{" "}
                        {((Math.abs(todayPnL) / accountSettings.dailyLossTarget) * 100).toFixed(1)}%
                        of your daily loss limit. Consider stopping for today.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {activeTab === "trades" && (
            <div className="space-y-4">
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <h3 className="text-xl font-bold text-white mb-4">
                  Trade History ({filteredTrades.length} trades)
                </h3>
                {filteredTrades.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No trades found for selected account.</p>
                    <Link
                      href="/trades/new"
                      className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Add Your First Trade
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="bg-slate-800 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded ${
                                  trade.direction === "buy"
                                    ? "bg-green-500/20 text-green-300"
                                    : "bg-red-500/20 text-red-300"
                                }`}
                              >
                                {trade.direction.toUpperCase()}
                              </span>
                              <span className="font-semibold text-white">{trade.currency_pair}</span>
                              <span className="text-sm text-slate-400">
                                {format(new Date(trade.entry_time), "MMM dd, yyyy HH:mm")}
                              </span>
                              {trade.status && (
                                <span className="px-2 py-1 text-xs rounded bg-slate-600 text-slate-300">
                                  {trade.status}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-slate-400">Entry:</span>{" "}
                                <span className="text-white">{trade.entry_price}</span>
                              </div>
                              {trade.exit_price && (
                                <div>
                                  <span className="text-slate-400">Exit:</span>{" "}
                                  <span className="text-white">{trade.exit_price}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-slate-400">Size:</span>{" "}
                                <span className="text-white">{trade.position_size}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">P/L:</span>{" "}
                                <span
                                  className={`font-semibold ${
                                    (trade.profit_loss || 0) >= 0
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  ${(trade.profit_loss || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            {trade.notes && (
                              <div className="mt-3 pt-3 border-t border-slate-600">
                                <p className="text-sm font-medium text-slate-300 mb-1">Notes:</p>
                                <p className="text-sm text-slate-400 whitespace-pre-wrap">
                                  {trade.notes}
                                </p>
                              </div>
                            )}
                            {trade.lessons_learned && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-slate-300 mb-1">
                                  Lessons Learned:
                                </p>
                                <p className="text-sm text-slate-400 whitespace-pre-wrap">
                                  {trade.lessons_learned}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Link
                              href={`/trades/${trade.id}`}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {showSettings && (
            <div className="mt-6 bg-slate-700 rounded-lg p-6 border border-slate-600">
              <h3 className="text-xl font-bold text-white mb-4">Account Settings</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Risk Per Trade (%)</label>
                  <input
                    type="number"
                    value={accountSettings.riskPerTrade}
                    onChange={(e) =>
                      setAccountSettings({
                        ...accountSettings,
                        riskPerTrade: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Max Daily Loss ($)</label>
                  <input
                    type="number"
                    value={accountSettings.maxDailyLoss}
                    onChange={(e) =>
                      setAccountSettings({
                        ...accountSettings,
                        maxDailyLoss: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Max Loss Target ($)</label>
                  <input
                    type="number"
                    value={accountSettings.maxLossTarget}
                    onChange={(e) =>
                      setAccountSettings({
                        ...accountSettings,
                        maxLossTarget: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Profit Target ($)</label>
                  <input
                    type="number"
                    value={accountSettings.profitTarget}
                    onChange={(e) =>
                      setAccountSettings({
                        ...accountSettings,
                        profitTarget: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Daily Loss Target ($)</label>
                  <input
                    type="number"
                    value={accountSettings.dailyLossTarget}
                    onChange={(e) =>
                      setAccountSettings({
                        ...accountSettings,
                        dailyLossTarget: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Leverage</label>
                  <input
                    type="number"
                    value={accountSettings.leverage}
                    onChange={(e) =>
                      setAccountSettings({
                        ...accountSettings,
                        leverage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={async () => {
                    await saveSettings(accountSettings);
                    setShowSettings(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
