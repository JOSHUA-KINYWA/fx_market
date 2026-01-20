"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";
import { TradingPsychologyQuotes } from "./trading-psychology-quotes";
import { calculateTradeMetrics, updateAccountBalance } from "@/lib/utils/trade-calculations";

type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];
type Strategy = Database["public"]["Tables"]["strategies"]["Row"];
type Setup = Database["public"]["Tables"]["trade_setups"]["Row"];

interface TradeFormProps {
  accounts: Account[];
  strategies: Strategy[];
  setups: Setup[];
  tradeId?: string;
  initialData?: Partial<Database["public"]["Tables"]["trades"]["Row"]>;
}

export function TradeForm({
  accounts,
  strategies,
  setups,
  tradeId,
  initialData,
}: TradeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Find ICT SILVER BULLET STRATEGY
  const ictStrategy = strategies.find(
    (s) => s.name.toLowerCase().includes("ict silver bullet") || s.name.toLowerCase().includes("silver bullet")
  );

  // Parse SET IS FVG from market_conditions
  const parseSetIsFvg = (marketConditions: string | null): string => {
    if (!marketConditions) return "";
    if (marketConditions.includes("CHOCH")) return "CHOCH";
    if (marketConditions.includes("BOS")) return "BOS";
    return "";
  };

  const [formData, setFormData] = useState({
    account_id: initialData?.account_id || accounts[0]?.id || "",
    currency_pair: initialData?.currency_pair || "",
    direction: initialData?.direction || "buy",
    entry_time: initialData?.entry_time
      ? new Date(initialData.entry_time).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    entry_price: initialData?.entry_price?.toString() || "",
    position_size: initialData?.position_size?.toString() || "",
    stop_loss: initialData?.stop_loss?.toString() || "",
    take_profit: initialData?.take_profit?.toString() || "",
    exit_time: initialData?.exit_time
      ? new Date(initialData.exit_time).toISOString().slice(0, 16)
      : "",
    exit_price: initialData?.exit_price?.toString() || "",
    profit_loss: initialData?.profit_loss?.toString() || "",
    strategy_id: initialData?.strategy_id || ictStrategy?.id || "",
    setup_id: initialData?.setup_id || "",
    set_is_fvg: initialData?.market_conditions ? parseSetIsFvg(initialData.market_conditions) : "",
    notes: initialData?.notes || "",
    status: initialData?.status || "open",
  });


  // Validate session-based trading rules
  const validateSessionRules = (entryTime: string, direction: string, stopLoss: string, takeProfit: string, entryPrice: string) => {
    const entryDate = new Date(entryTime);
    const entryHour = entryDate.getUTCHours(); // Using UTC for NY session
    const nyHour = (entryHour - 5 + 24) % 24; // Convert UTC to NY time (UTC-5)

    // 10-11 AM NY Session: No sell setups allowed (only bullish)
    if (nyHour >= 10 && nyHour < 11 && direction === "sell") {
      return "⚠️ Session Rule: No sell setups allowed during 10-11 AM NY session. Only bullish (buy) setups allowed.";
    }

    // 2-3 PM NY Session: Only sell setups allowed (14-15 in 24hr format)
    if (direction === "sell" && (nyHour < 14 || nyHour >= 15)) {
      return "⚠️ Session Rule: Sell setups only allowed during 2-3 PM (14:00-15:00) NY session.";
    }

    if (!stopLoss || !takeProfit || !entryPrice) {
      return null; // Skip R:R validation if SL/TP not set
    }

    const entry = Number.parseFloat(entryPrice);
    const sl = Number.parseFloat(stopLoss);
    const tp = Number.parseFloat(takeProfit);

    let risk: number;
    let reward: number;

    if (direction === "buy") {
      risk = entry - sl;
      reward = tp - entry;
    } else {
      risk = sl - entry;
      reward = entry - tp;
    }

    if (risk <= 0) {
      return "Invalid stop loss. Risk must be positive.";
    }

    const riskRewardRatio = reward / risk;

    // 10-13 NY Session: Risk 1:3 (minimum 150 pips reward for 45 pips risk)
    if (nyHour >= 10 && nyHour < 13) {
      if (riskRewardRatio < 3) {
        return `⚠️ Session Rule: 10-13 NY session requires minimum 1:3 R:R (150 pips reward for 45 pips risk). Current: ${riskRewardRatio.toFixed(2)}:1`;
      }
    }

    // 2-3 PM NY Session: Risk 1:2 (50-100 pips reward for 45 pips risk)
    if (nyHour >= 14 && nyHour < 15) {
      if (riskRewardRatio < 2) {
        return `⚠️ Session Rule: 2-3 PM (14:00-15:00) NY session requires minimum 1:2 R:R (50-100 pips reward for 45 pips risk). Current: ${riskRewardRatio.toFixed(2)}:1`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    // Validate session rules
    const sessionError = validateSessionRules(
      formData.entry_time,
      formData.direction,
      formData.stop_loss,
      formData.take_profit,
      formData.entry_price
    );

    if (sessionError) {
      setError(sessionError);
      setLoading(false);
      return;
    }

    // Get account balance for risk calculations
    const { data: account } = await supabase
      .from("trading_accounts")
      .select("current_balance")
      .eq("id", formData.account_id)
      .single();

    // Calculate ALL metrics dynamically
    const metrics = calculateTradeMetrics({
      entry_price: Number.parseFloat(formData.entry_price),
      exit_price: formData.exit_price ? Number.parseFloat(formData.exit_price) : null,
      stop_loss: formData.stop_loss ? Number.parseFloat(formData.stop_loss) : null,
      take_profit: formData.take_profit ? Number.parseFloat(formData.take_profit) : null,
      direction: formData.direction,
      currency_pair: formData.currency_pair.toUpperCase(),
      position_size: Number.parseFloat(formData.position_size),
      profit_loss: formData.profit_loss ? Number.parseFloat(formData.profit_loss) : null,
      exit_time: formData.exit_time || null,
      current_balance: account?.current_balance || null,
    });

    const tradeData = {
      user_id: user.id,
      account_id: formData.account_id,
      currency_pair: formData.currency_pair.toUpperCase(),
      direction: formData.direction,
      entry_time: new Date(formData.entry_time).toISOString(),
      entry_price: Number.parseFloat(formData.entry_price),
      position_size: Number.parseFloat(formData.position_size),
      stop_loss: formData.stop_loss ? Number.parseFloat(formData.stop_loss) : null,
      take_profit: formData.take_profit ? Number.parseFloat(formData.take_profit) : null,
      exit_time: formData.exit_time ? new Date(formData.exit_time).toISOString() : null,
      exit_price: formData.exit_price ? Number.parseFloat(formData.exit_price) : null,
      profit_loss: formData.profit_loss ? Number.parseFloat(formData.profit_loss) : null,
      strategy_id: formData.strategy_id || null,
      setup_id: formData.setup_id || null,
      market_conditions: formData.set_is_fvg ? `FVG: ${formData.set_is_fvg}` : null,
      notes: formData.notes || null,
      status: formData.status,
      // Add all calculated metrics - these will update dynamically
      pips: metrics.pips,
      risk_reward_ratio: metrics.risk_reward_ratio,
      r_multiple: metrics.r_multiple,
      risk_amount: metrics.risk_amount,
    };

    if (tradeId) {
      // Get old trade to track account changes
      const { data: oldTrade } = await supabase
        .from("trades")
        .select("profit_loss, status, account_id")
        .eq("id", tradeId)
        .single();

      const { error } = await supabase
        .from("trades")
        .update(tradeData)
        .eq("id", tradeId);

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Always update account balance after trade update (in case status changed or P&L changed)
        if (formData.account_id) {
          await updateAccountBalance(supabase, formData.account_id);
        }
        router.push(`/trades/${tradeId}`);
        router.refresh();
      }
    } else {
      const { error } = await supabase.from("trades").insert(tradeData);

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Update account balance if trade is closed
        if (formData.account_id) {
          await updateAccountBalance(supabase, formData.account_id);
        }
        // Redirect to dashboard and force refresh
        router.push("/dashboard");
        setTimeout(() => router.refresh(), 200);
      }
    }
  };

  return (
    <div className="space-y-6">
      <TradingPsychologyQuotes />
      
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Session Trading Rules</h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• <strong>10-13 NY Session:</strong> Risk 1:3 (150 pips reward for 45 pips risk) - No sell setups during 10-11am (bullish only)</li>
          <li>• <strong>2-3 PM NY Session:</strong> Risk 1:2 (50-100 pips reward for 45 pips risk) - Only sell setups allowed</li>
          <li>• Trading window is 1hr - Can hold after window closes if setup is valid (risk 0)</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Trading Account *
          </label>
          {accounts.length === 0 ? (
            <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                No active accounts found.{" "}
                <Link href="/accounts/new" className="underline font-medium">
                  Create an account first
                </Link>
              </p>
            </div>
          ) : (
            <select
              required
              value={formData.account_id}
              onChange={(e) =>
                setFormData({ ...formData, account_id: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name} {account.account_number ? `(${account.account_number})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Currency Pair *
          </label>
          <input
            type="text"
            required
            value={formData.currency_pair}
            onChange={(e) =>
              setFormData({ ...formData, currency_pair: e.target.value.toUpperCase() })
            }
            placeholder="US30 or NAS100"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Recommended: US30 or NAS100</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Direction *
          </label>
          <select
            required
            value={formData.direction}
            onChange={(e) =>
              setFormData({ ...formData, direction: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Entry Time *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.entry_time}
            onChange={(e) =>
              setFormData({ ...formData, entry_time: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Entry Price *
          </label>
          <input
            type="number"
            step="0.00001"
            required
            value={formData.entry_price}
            onChange={(e) =>
              setFormData({ ...formData, entry_price: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Position Size (Lots) *
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.position_size}
            onChange={(e) =>
              setFormData({ ...formData, position_size: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stop Loss
          </label>
          <input
            type="number"
            step="0.00001"
            value={formData.stop_loss}
            onChange={(e) =>
              setFormData({ ...formData, stop_loss: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Take Profit
          </label>
          <input
            type="number"
            step="0.00001"
            value={formData.take_profit}
            onChange={(e) =>
              setFormData({ ...formData, take_profit: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Exit Time
          </label>
          <input
            type="datetime-local"
            value={formData.exit_time}
            onChange={(e) =>
              setFormData({ ...formData, exit_time: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Exit Price
          </label>
          <input
            type="number"
            step="0.00001"
            value={formData.exit_price}
            onChange={(e) =>
              setFormData({ ...formData, exit_price: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            P&L
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.profit_loss}
            onChange={(e) =>
              setFormData({ ...formData, profit_loss: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Strategy
          </label>
          <select
            value={formData.strategy_id}
            onChange={(e) =>
              setFormData({ ...formData, strategy_id: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">None</option>
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Setup
          </label>
          <select
            value={formData.setup_id}
            onChange={(e) =>
              setFormData({ ...formData, setup_id: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">None</option>
            {setups.map((setup) => (
              <option key={setup.id} value={setup.id}>
                {setup.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            SET IS FVG
          </label>
          <select
            value={formData.set_is_fvg}
            onChange={(e) =>
              setFormData({ ...formData, set_is_fvg: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">None</option>
            <option value="CHOCH">CHOCH</option>
            <option value="BOS">BOS</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            rows={4}
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : tradeId ? "Update Trade" : "Create Trade"}
        </Button>
      </div>
    </form>
    </div>
  );
}

