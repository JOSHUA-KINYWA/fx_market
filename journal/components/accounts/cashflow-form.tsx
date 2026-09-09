"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface CashflowAccount {
  id: string;
  account_name: string;
  current_balance?: number | null;
  currency?: string | null;
}

interface CashflowFormProps {
  account: CashflowAccount;
}

export function CashflowForm({ account }: CashflowFormProps) {
  const router = useRouter();
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to update account cash flow.");
      return;
    }

    const currentBalance = Number(account.current_balance || 0);
    const updatedBalance = type === "deposit"
      ? currentBalance + parsedAmount
      : currentBalance - parsedAmount;

    if (type === "withdrawal" && updatedBalance < 0) {
      setError("Withdrawal exceeds the available account balance.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("trading_accounts")
        .update({
          current_balance: updatedBalance,
        })
        .eq("id", account.id)
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      router.push("/accounts");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Unable to save cash flow record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Account Ledger
          </span>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">
            {type === "deposit" ? "Add Deposit" : "Add Withdrawal"}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {account.account_name}
          </div>
          <div className="text-lg font-semibold text-slate-900">
            {account.currency || "USD"} {Number(account.current_balance || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Cash Flow Type
          </label>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as "deposit" | "withdrawal")}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Amount
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="100.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional memo"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end space-x-3">
        <Button type="button" variant="outline" onClick={() => router.push("/accounts")}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : type === "deposit" ? "Save Deposit" : "Save Withdrawal"}
        </Button>
      </div>
    </form>
  );
}
