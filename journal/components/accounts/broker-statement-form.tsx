"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  applyBrokerStatement,
  BROKER_STATEMENT_10_SEP_2026,
  type BrokerStatementSnapshot,
} from "@/lib/utils/broker-statement";

interface BrokerStatementFormProps {
  accountId: string;
  currency?: string | null;
  snapshot?: BrokerStatementSnapshot | null;
}

export function BrokerStatementForm({ accountId, currency, snapshot }: BrokerStatementFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const defaults =
    snapshot?.source === BROKER_STATEMENT_10_SEP_2026.source
      ? snapshot
      : BROKER_STATEMENT_10_SEP_2026;
  const [balance, setBalance] = useState(String(defaults.balance));
  const [deposits, setDeposits] = useState(String(defaults.deposits));
  const [withdrawals, setWithdrawals] = useState(String(defaults.withdrawals));
  const [realisedPnl, setRealisedPnl] = useState(String(defaults.realisedPnl));
  const [closedTrades, setClosedTrades] = useState(String(defaults.closedTrades));

  const handleApply = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    try {
      const next: BrokerStatementSnapshot = {
        source: BROKER_STATEMENT_10_SEP_2026.source,
        asOf: BROKER_STATEMENT_10_SEP_2026.asOf,
        label: BROKER_STATEMENT_10_SEP_2026.label,
        balance: Number.parseFloat(balance) || 104.14,
        deposits: 0,
        withdrawals: 25,
        realisedPnl: Number.parseFloat(realisedPnl) || 73.65,
        closedTrades: Number.parseInt(closedTrades, 10) || 27,
      };

      await applyBrokerStatement(supabase, accountId, user.id, next);
      setSuccess("Broker statement applied. Dashboard now uses these totals, and new manual trades add on top.");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Unable to apply broker statement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <div className="mb-4">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
          Broker statement
        </div>
        <h2 className="mt-2 text-2xl font-black text-slate-900">Match live account totals</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use the listed broker figures only: balance 104.14, realised P/L 73.65, no deposits, and the single -$25 M-Pesa withdrawal from 09 Sep 2026.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm font-semibold text-slate-700">
          Balance ({currency || "USD"})
          <input
            type="number"
            step="0.01"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Realised P/L
          <input
            type="number"
            step="0.01"
            value={realisedPnl}
            onChange={(event) => setRealisedPnl(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Deposits
          <input
            type="number"
            step="0.01"
            value={deposits}
            onChange={(event) => setDeposits(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Withdrawals
          <input
            type="number"
            step="0.01"
            value={withdrawals}
            onChange={(event) => setWithdrawals(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Closed deals
          <input
            type="number"
            step="1"
            value={closedTrades}
            onChange={(event) => setClosedTrades(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-5">
        <Button type="button" onClick={handleApply} disabled={loading}>
          {loading ? "Applying..." : "Apply broker statement"}
        </Button>
      </div>
    </section>
  );
}
