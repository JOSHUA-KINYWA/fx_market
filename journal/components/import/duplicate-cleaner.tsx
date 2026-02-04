"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";

type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];
type Trade = Database["public"]["Tables"]["trades"]["Row"];

interface DuplicateCleanerProps {
  accounts: Account[];
}

interface DuplicateGroup {
  key: string;
  trades: Trade[];
  keepId: string;
  deleteIds: string[];
}

export function DuplicateCleaner({ accounts }: DuplicateCleanerProps) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [duplicates, setDuplicates] = useState<Trade[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pairGroups, setPairGroups] = useState<Map<string, Trade[]>>(new Map());
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const scanForDuplicates = async () => {
    if (!accountId) {
      setError("Please select an account");
      return;
    }

    setScanning(true);
    setError("");
    setSuccess("");
    setDuplicates([]);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in");
        setScanning(false);
        return;
      }

      // Get all trades for this account
      const { data: allTrades, error: fetchError } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .eq("account_id", accountId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError(`Failed to fetch trades: ${fetchError.message}`);
        setScanning(false);
        return;
      }

      if (!allTrades || allTrades.length === 0) {
        setSuccess("No trades found for this account");
        setScanning(false);
        return;
      }

      // Group trades by currency pair
      const pairs = new Map<string, Trade[]>();
      allTrades.forEach((trade: Trade) => {
        const pair = trade.currency_pair;
        if (!pairs.has(pair)) {
          pairs.set(pair, []);
        }
        pairs.get(pair)!.push(trade);
      });

      // Sort pairs by count (descending)
      const sortedPairs = Array.from(pairs.entries()).sort((a, b) => b[1].length - a[1].length);

      setPairGroups(new Map(sortedPairs));

      // Find pairs with more than 1 trade
      const pairsWithMultiples = sortedPairs.filter(([, trades]) => trades.length > 1);

      if (pairsWithMultiples.length === 0) {
        setSuccess(`✓ No duplicates found! Scanned ${allTrades.length} trades in this account.`);
        setShowDuplicates(false);
        setScanning(false);
        return;
      }

      setSuccess(
        `Found ${pairsWithMultiples.length} currency pair${pairsWithMultiples.length !== 1 ? "s" : ""} with multiple trades. Select pairs to clean up.`,
      );
      setShowDuplicates(true);
    } catch (err: unknown) {
      const error = err as Error;
      setError(`Error scanning: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  const deleteDuplicates = async () => {
    if (selectedPairs.size === 0) {
      setError("Select at least one pair to clean up");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();
      const duplicateIds: string[] = [];

      // For each selected pair, delete all but the first (oldest)
      selectedPairs.forEach((pair) => {
        const trades = pairGroups.get(pair) || [];
        if (trades.length > 1) {
          const sorted = trades.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
          // Keep the first one, delete the rest
          duplicateIds.push(...sorted.slice(1).map((t) => t.id));
        }
      });

      if (duplicateIds.length === 0) {
        setError("No trades to delete");
        setLoading(false);
        return;
      }

      // Delete in batches
      for (let i = 0; i < duplicateIds.length; i += 100) {
        const batch = duplicateIds.slice(i, i + 100);
        const { error: deleteError } = await supabase.from("trades").delete().in("id", batch);

        if (deleteError) {
          setError(`Failed to delete trades: ${deleteError.message}`);
          setLoading(false);
          return;
        }
      }

      setSuccess(`Successfully deleted ${duplicateIds.length} trades! Kept 1 of each selected pair.`);
      setDuplicates([]);
      setShowDuplicates(false);
      setSelectedPairs(new Set());
      setPairGroups(new Map());

      setTimeout(() => {
        router.push("/trades");
        router.refresh();
      }, 2000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(`Error deleting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllTrades = async () => {
    if (!confirmDeleteAll) {
      setError("Please confirm deletion");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in");
        setLoading(false);
        return;
      }

      if (!accountId) {
        setError("Select an account first");
        setLoading(false);
        return;
      }

      // Delete all trades for this user and account
      const { error: deleteError } = await supabase
        .from("trades")
        .delete()
        .eq("user_id", user.id)
        .eq("account_id", accountId);

      if (deleteError) {
        setError(`Failed to delete all trades: ${deleteError.message}`);
        setLoading(false);
        return;
      }

      setSuccess("✓ All trades deleted! Redirecting...");
      setConfirmDeleteAll(false);

      setTimeout(() => {
        router.push("/trades");
        router.refresh();
      }, 2000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Clean Up Duplicates</h2>
      <p className="text-slate-600 text-sm mb-6">
        Scan your account for duplicate trades and remove them. Keeps the first occurrence of each duplicate.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {!showDuplicates ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={scanning}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={scanForDuplicates} disabled={scanning || !accountId}>
            {scanning ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
                Scanning...
              </span>
            ) : (
              "Scan for Duplicates"
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium">Select pairs to clean up</p>
            <p className="text-xs text-blue-700 mt-1">
              For each selected pair, all copies except the oldest will be deleted
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
            {Array.from(pairGroups.entries()).map(([pair, trades]) => {
              const isSelected = selectedPairs.has(pair);
              return (
                <label key={pair} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const newSelected = new Set(selectedPairs);
                      if (e.target.checked) {
                        newSelected.add(pair);
                      } else {
                        newSelected.delete(pair);
                      }
                      setSelectedPairs(newSelected);
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-slate-900">{pair}</span>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {trades.length} trades
                    </span>
                    <span className="ml-1 text-xs text-red-600 font-semibold">
                      (delete {trades.length - 1}, keep 1)
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {selectedPairs.size > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              💡 You will delete{" "}
              {Array.from(selectedPairs).reduce((sum, pair) => {
                const trades = pairGroups.get(pair) || [];
                return sum + (trades.length - 1);
              }, 0)}{" "}
              trades from {selectedPairs.size} pair{selectedPairs.size !== 1 ? "s" : ""}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowDuplicates(false);
                setDuplicates([]);
                setSelectedPairs(new Set());
                setPairGroups(new Map());
              }}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={deleteDuplicates}
              disabled={loading || selectedPairs.size === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                    />
                  </svg>
                  Deleting...
                </span>
              ) : (
                `Delete ${Array.from(selectedPairs).reduce((sum, pair) => sum + ((pairGroups.get(pair) || []).length - 1), 0)} Trades`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-8 border-t-2 border-red-200 pt-6">
        <h3 className="text-lg font-bold text-red-700 mb-2">⚠️ Danger Zone</h3>
        <p className="text-sm text-slate-600 mb-4">Permanently delete all trades in this account</p>

        {!confirmDeleteAll ? (
          <Button
            onClick={() => setConfirmDeleteAll(true)}
            disabled={loading}
            className="bg-red-700 hover:bg-red-800 text-white"
          >
            Delete All Trades in Account
          </Button>
        ) : (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-3">
            <div className="text-sm text-red-900 font-semibold">
              ⚠️ This will permanently delete ALL trades in this account!
            </div>
            <p className="text-xs text-red-700">
              This action cannot be undone. All trade history, balances, and statistics will be lost.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setConfirmDeleteAll(false)}
                variant="outline"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={deleteAllTrades}
                disabled={loading}
                className="bg-red-700 hover:bg-red-800"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    </svg>
                    Deleting all trades...
                  </span>
                ) : (
                  "Yes, Delete Everything"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
