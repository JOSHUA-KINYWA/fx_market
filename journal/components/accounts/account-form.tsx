"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface AccountFormProps {
  accountId?: string;
  initialData?: {
    account_name: string;
    broker_name: string | null;
    account_number: string | null;
    account_type: string;
    currency: string;
    initial_balance: string;
    current_balance: string;
    is_active: boolean;
  };
}

export function AccountForm({ accountId, initialData }: AccountFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    account_name: initialData?.account_name || "",
    broker_name: initialData?.broker_name || "",
    account_number: initialData?.account_number || "",
    account_type: initialData?.account_type || "demo",
    currency: initialData?.currency || "USD",
    initial_balance: initialData?.initial_balance || "",
    current_balance: initialData?.current_balance || "",
    is_active: initialData?.is_active ?? true,
  });

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

    const accountData = {
      account_name: formData.account_name,
      broker_name: formData.broker_name || null,
      account_number: formData.account_number || null,
      account_type: formData.account_type,
      currency: formData.currency,
      initial_balance: Number.parseFloat(formData.initial_balance) || 0,
      // current_balance will be calculated by the database trigger
      current_balance: Number.parseFloat(formData.initial_balance) || 0,
      is_active: formData.is_active,
    };

    try {
      if (accountId) {
        const { error: updateError } = await supabase
          .from("trading_accounts")
          .update(accountData)
          .eq("id", accountId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        // Update balance using database function
        const { error: balanceError } = await supabase.rpc("update_account_balance", {
          account_id: accountId,
        });
        if (balanceError) console.error("Balance update error:", balanceError);
      } else {
        const { error: insertError } = await supabase
          .from("trading_accounts")
          .insert({
            user_id: user.id,
            ...accountData,
          });

        if (insertError) throw insertError;
      }

      router.push("/accounts");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save account");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Account Name *
          </label>
          <input
            type="text"
            required
            value={formData.account_name}
            onChange={(e) =>
              setFormData({ ...formData, account_name: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="My Trading Account"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Broker Name
          </label>
          <input
            type="text"
            value={formData.broker_name}
            onChange={(e) =>
              setFormData({ ...formData, broker_name: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., IC Markets"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Account Number
          </label>
          <input
            type="text"
            value={formData.account_number}
            onChange={(e) =>
              setFormData({ ...formData, account_number: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Account Type
          </label>
          <select
            value={formData.account_type}
            onChange={(e) =>
              setFormData({ ...formData, account_type: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="demo">Demo</option>
            <option value="live">Live</option>
            <option value="paper">Paper Trading</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Currency
          </label>
          <select
            value={formData.currency}
            onChange={(e) =>
              setFormData({ ...formData, currency: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Initial Balance
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.initial_balance}
            onChange={(e) =>
              setFormData({ ...formData, initial_balance: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
          />
        </div>

        {accountId && (
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Current Balance (Auto-calculated)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.current_balance}
              readOnly
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-slate-50 text-slate-600"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-slate-500">
              Calculated from initial balance + P&L from closed trades
            </p>
          </div>
        )}

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-slate-700">
            Active
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : accountId ? "Update Account" : "Create Account"}
        </Button>
      </div>
    </form>
  );
}
