"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";
import { TradingPsychologyQuotes } from "./trading-psychology-quotes";
import { calculateTradeMetrics, updateAccountBalance } from "@/lib/utils/trade-calculations";
import { getFriendlyErrorMessage, validateTradeForm } from "@/lib/utils/trade-form-validation";

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
    ny_session: initialData?.ny_session || "10-11 AM NY",
    timeframe: initialData?.timeframe || "3 min",
    entry_date: initialData?.entry_time
      ? new Date(initialData.entry_time).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    position_size: initialData?.position_size?.toString() || "",
    stop_loss: initialData?.stop_loss?.toString() || "",
    take_profit: initialData?.take_profit?.toString() || "",
    exit_time: initialData?.exit_time
      ? new Date(initialData.exit_time).toISOString().slice(0, 16)
      : "",
    profit_loss: initialData?.profit_loss?.toString() || "",
    strategy_id: initialData?.strategy_id || "",
    setup_id: initialData?.setup_id || "",
    set_is_fvg: initialData?.market_conditions ? parseSetIsFvg(initialData.market_conditions) : "",
    notes: initialData?.notes || "",
    status: initialData?.status || "open",
  });

  const selectedAccountId = formData.account_id;

  const accountStrategies: Strategy[] = strategies.filter(
    (s) => !s.account_id || s.account_id === selectedAccountId
  );

  const ictStrategy = accountStrategies.find(
    (s) => s.name.toLowerCase().includes("ict silver bullet") || s.name.toLowerCase().includes("silver bullet")
  );

  useEffect(() => {
    if (!formData.strategy_id && ictStrategy) {
      setFormData((prev) => ({ ...prev, strategy_id: ictStrategy.id }));
    }
  }, [formData.account_id, ictStrategy]);

  // Reset strategy/setup when account changes to avoid cross-account selections
  useEffect(() => {
    const currentAccountId = formData.account_id;
    const strategyStillValid = !formData.strategy_id || strategies.some(
      (s) => s.id === formData.strategy_id && (!s.account_id || s.account_id === currentAccountId)
    );
    const setupStillValid = !formData.setup_id || setups.some(
      (s) => s.id === formData.setup_id && (!s.account_id || s.account_id === currentAccountId)
    );

    if (!strategyStillValid || !setupStillValid) {
      setFormData((prev) => ({
        ...prev,
        strategy_id: strategyStillValid ? prev.strategy_id : "",
        setup_id: setupStillValid ? prev.setup_id : "",
      }));
    }
  }, [formData.account_id, strategies, setups]);


  // Basic trade validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Your session is no longer valid. Please sign in again.");
      }

      const validation = validateTradeForm({
        account_id: formData.account_id,
        currency_pair: formData.currency_pair,
        position_size: formData.position_size,
        stop_loss: formData.stop_loss,
        take_profit: formData.take_profit,
        entry_time: formData.entry_date,
      });

      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const { data: account, error: accountError } = await supabase
        .from("trading_accounts")
        .select("current_balance")
        .eq("id", formData.account_id)
        .single();

      if (accountError) {
        throw accountError;
      }

      const metrics = calculateTradeMetrics({
        entry_price: null,
        exit_price: null,
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
        entry_time: new Date(`${formData.entry_date}T12:00:00`).toISOString(),
        entry_price: initialData?.entry_price ?? 0,
        exit_price: initialData?.exit_price ?? null,
        position_size: Number.parseFloat(formData.position_size),
        stop_loss: formData.stop_loss ? Number.parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? Number.parseFloat(formData.take_profit) : null,
        exit_time: formData.exit_time ? new Date(formData.exit_time).toISOString() : null,
        ny_session: formData.ny_session,
        timeframe: formData.timeframe,
        profit_loss: formData.profit_loss ? Number.parseFloat(formData.profit_loss) : null,
        strategy_id: formData.strategy_id || null,
        setup_id: formData.setup_id || null,
        market_conditions: formData.set_is_fvg ? `FVG: ${formData.set_is_fvg}` : null,
        notes: formData.notes || null,
        status: formData.status,
        pips: metrics.pips,
        risk_reward_ratio: metrics.risk_reward_ratio,
        r_multiple: metrics.r_multiple,
        risk_amount: metrics.risk_amount,
      };

      if (tradeId) {
        const { error } = await supabase
          .from("trades")
          .update(tradeData)
          .eq("id", tradeId);

        if (error) {
          throw error;
        }

        if (formData.account_id) {
          await updateAccountBalance(supabase, formData.account_id);
        }
        router.push(`/trades/${tradeId}`);
        router.refresh();
      } else {
        const { error } = await supabase.from("trades").insert(tradeData);

        if (error) {
          throw error;
        }

        if (formData.account_id) {
          await updateAccountBalance(supabase, formData.account_id);
        }
        router.push("/dashboard");
        setTimeout(() => router.refresh(), 200);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
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
          <select
            required
            value={formData.currency_pair}
            onChange={(e) =>
              setFormData({ ...formData, currency_pair: e.target.value.toUpperCase() })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a pair</option>
            <option value="US500">US500</option>
            <option value="NAS100">NAS100</option>
            <option value="XAUUSD">XAUUSD</option>
          </select>
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
            NY Session *
          </label>
          <select
            required
            value={formData.ny_session}
            onChange={(e) =>
              setFormData({ ...formData, ny_session: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="10-11 AM NY">10-11 AM NY</option>
            <option value="2-3 PM NY">2-3 PM NY</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Trade Date *
          </label>
          <input
            type="date"
            required
            value={formData.entry_date}
            onChange={(e) =>
              setFormData({ ...formData, entry_date: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">The calendar date when the trade was taken.</p>
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
            Stop Loss Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.stop_loss}
            onChange={(e) =>
              setFormData({ ...formData, stop_loss: e.target.value })
            }
            placeholder="e.g. 100"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Enter the dollar amount you risk.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Take Profit Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.take_profit}
            onChange={(e) =>
              setFormData({ ...formData, take_profit: e.target.value })
            }
            placeholder="e.g. 300"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Enter the dollar target amount.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Entry Timeframe *
          </label>
          <select
            required
            value={formData.timeframe}
            onChange={(e) =>
              setFormData({ ...formData, timeframe: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1 min">1 min</option>
            <option value="3 min">3 min</option>
          </select>
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
            {accountStrategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Setup (Optional)
          </label>
          <select
            value={formData.setup_id}
            onChange={(e) =>
              setFormData({ ...formData, setup_id: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">None</option>
            {setups
              .filter((s) => !s.account_id || s.account_id === selectedAccountId)
              .map((setup) => (
                <option key={setup.id} value={setup.id}>
                  {setup.name}
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">You can leave this as None.</p>
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

