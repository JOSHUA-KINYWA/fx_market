"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

interface RiskManagementFormProps {
  readonly trade: Trade;
  readonly account: Account | null;
}

export function RiskManagementForm({ trade, account }: RiskManagementFormProps) {
  const router = useRouter();
  const [riskPercentage, setRiskPercentage] = useState(
    trade.risk_percentage?.toString() || ""
  );
  const [riskAmount, setRiskAmount] = useState(trade.risk_amount?.toString() || "");
  const [rMultiple, setRMultiple] = useState(trade.r_multiple?.toString() || "");
  const [disciplineScore, setDisciplineScore] = useState(
    trade.discipline_score?.toString() || "5"
  );
  const [riskManagementScore, setRiskManagementScore] = useState(
    trade.risk_management_score?.toString() || "5"
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Calculate risk amount if percentage is provided
    if (riskPercentage && account?.current_balance) {
      const calculated = (Number.parseFloat(riskPercentage) / 100) * account.current_balance;
      setRiskAmount(calculated.toFixed(2));
    }

    // Calculate R-multiple if we have stop loss and take profit
    if (trade.stop_loss && trade.take_profit && trade.entry_price) {
      const entry = Number.parseFloat(trade.entry_price.toString());
      const sl = Number.parseFloat(trade.stop_loss.toString());
      const tp = Number.parseFloat(trade.take_profit.toString());
      
      if (trade.direction === "buy") {
        const risk = entry - sl;
        const reward = tp - entry;
        if (risk > 0) {
          setRMultiple((reward / risk).toFixed(2));
        }
      } else {
        const risk = sl - entry;
        const reward = entry - tp;
        if (risk > 0) {
          setRMultiple((reward / risk).toFixed(2));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskPercentage, account?.current_balance, trade.stop_loss, trade.take_profit, trade.entry_price, trade.direction]);

  const handleSave = async () => {
    setLoading(true);
    const supabase = createClient();

    await supabase
      .from("trades")
      .update({
        risk_percentage: riskPercentage ? Number.parseFloat(riskPercentage) : null,
        risk_amount: riskAmount ? Number.parseFloat(riskAmount) : null,
        r_multiple: rMultiple ? Number.parseFloat(rMultiple) : null,
        discipline_score: disciplineScore ? Number.parseInt(disciplineScore) : null,
        risk_management_score: riskManagementScore
          ? Number.parseInt(riskManagementScore)
          : null,
      })
      .eq("id", trade.id);

    setLoading(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.refresh();
    }, 1500);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Risk Management & Discipline</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Risk Percentage (% of account)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={riskPercentage}
            onChange={(e) => setRiskPercentage(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 2.0"
          />
          {account && riskPercentage && (
            <p className="mt-1 text-xs text-slate-500">
              Risk Amount: ${(
                (Number.parseFloat(riskPercentage) / 100) *
                account.current_balance
              ).toFixed(2)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Risk Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={riskAmount}
            onChange={(e) => setRiskAmount(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 100.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            R-Multiple (Risk:Reward)
          </label>
          <input
            type="number"
            step="0.01"
            value={rMultiple}
            onChange={(e) => setRMultiple(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Auto-calculated"
            readOnly
          />
          <p className="mt-1 text-xs text-slate-500">
            Calculated from Stop Loss and Take Profit
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Discipline Score: {disciplineScore}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={disciplineScore}
            onChange={(e) => setDisciplineScore(e.target.value)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Risk Management Score: {riskManagementScore}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={riskManagementScore}
            onChange={(e) => setRiskManagementScore(e.target.value)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : saved ? "Saved!" : "Save Risk Management"}
        </button>
      </div>
    </div>
  );
}

