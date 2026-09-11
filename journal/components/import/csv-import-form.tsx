"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import { Database } from "@/types/database.types";
import { tradeIdentityKey } from "@/lib/utils/account-ledger";
import {
  mapGenericTradeRow,
  parseBrokerStatement,
  reconcileStatementCashflows,
  type StatementCashflow,
} from "@/lib/utils/statement-import";

type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

interface CSVImportFormProps {
  accounts: Account[];
}

export function CSVImportForm({ accounts }: CSVImportFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, stage: "" });
  const [duplicateStats, setDuplicateStats] = useState({ total: 0, byTicket: 0, byProfile: 0, byPositionSize: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
      setSuccess("");
      setPreview([]);
      setShowPreview(false);
    }
  };

  const handlePreview = () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing errors: ${results.errors.map((e) => e.message).join(", ")}`);
          return;
        }
        setPreview(results.data.slice(0, 10));
        setShowPreview(true);
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const parseDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    try {
      // Try parsing various date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Try MT4 format: "2024.01.15 10:30:00"
        const mt4Match = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (mt4Match) {
          const [, year, month, day, hour, minute, second] = mt4Match;
          return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
        }
        return null;
      }
      return date.toISOString();
    } catch {
      return null;
    }
  };

  const mapMT4Row = (row: any): any => {
    const statementDeal = mapGenericTradeRow(
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "")]))
    );
    if (statementDeal) {
      return statementDeal;
    }

    const getValue = (possibleNames: string[]): string | null => {
      for (const name of possibleNames) {
        for (const header of Object.keys(row)) {
          if (header.toLowerCase().trim() === name.toLowerCase().trim()) {
            return row[header] || null;
          }
        }
      }
      return null;
    };

    const ticket = getValue(["Ticket", "ticket", "Order", "order"]);
    const symbol = getValue(["Symbol", "symbol", "Instrument", "instrument"]);
    const type = getValue(["Type", "type", "Trade Side", "trade side"]);
    const openTime = getValue(["Open Time", "OpenTime", "open time", "Entry Time", "entry time", "Time", "time"]);
    const volume = getValue(["Volume", "volume", "Lots", "lots", "Size", "size", "Closing Quantity"]);
    const sl = getValue(["S / L", "S/L", "Stop Loss", "stop loss", "SL", "sl"]);
    const tp = getValue(["T / P", "T/P", "Take Profit", "take profit", "TP", "tp"]);
    const closeTime = getValue(["Close Time", "CloseTime", "close time", "Exit Time", "exit time", "Closing Time"]);
    const profit = getValue(["Profit", "profit", "P&L", "pnl", "P/L", "pl", "Net USD"]);

    const currencyPair = symbol ? symbol.replace("/", "").replace("_", "").trim() : null;
    const direction = type ? (type.toLowerCase().includes("buy") ? "buy" : "sell") : "buy";
    const mapped = {
      ticket_id: ticket || null,
      currency_pair: currencyPair,
      direction,
      entry_time: parseDate(openTime) || parseDate(closeTime),
      position_size: volume ? Number.parseFloat(String(volume)) : 0,
      stop_loss: sl && sl !== "0" ? Number.parseFloat(String(sl)) : null,
      take_profit: tp && tp !== "0" ? Number.parseFloat(String(tp)) : null,
      exit_time: closeTime ? parseDate(closeTime) : null,
      profit_loss: profit ? Number.parseFloat(String(profit)) : null,
    };
    return {
      ...mapped,
      ticket_id: mapped.ticket_id || tradeIdentityKey(mapped),
    };
  };

  const handleImport = async () => {
    if (!file || !accountId) {
      setError("Please select a file and account");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    const fileText = await file.text();
    const statement = parseBrokerStatement(fileText);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const fallbackRows = Array.isArray(results.data) ? results.data : [];
          const statementDeals = statement.deals.length > 0
            ? statement.deals
            : fallbackRows
                .map((row: any) => mapMT4Row(row))
                .filter((deal: any) => deal && deal.currency_pair && deal.position_size > 0);

          if (statementDeals.length === 0 && statement.cashflows.length === 0 && statement.summaryDeposits == null && statement.summaryWithdrawals == null) {
            setError("No deals or cashflow rows found. Export the broker Deals and Transactions tables.");
            setLoading(false);
            return;
          }

          const brokerFormat = statement.deals.length > 0 ? "Broker statement" : "MT4/MT5";

          // Create import log
          const { data: importLog, error: logError } = await supabase
            .from("csv_import_logs")
            .insert({
              user_id: user.id,
              account_id: accountId,
              file_name: file.name,
              broker_format: brokerFormat,
              status: "processing",
              total_rows: statementDeals.length + statement.cashflows.length,
            })
            .select()
            .single();

          if (logError || !importLog) {
            setError(`Failed to create import log: ${logError?.message || "Unknown error"}`);
            setLoading(false);
            return;
          }

          const mappedTrades = statementDeals
            .map((mapped: any) => {
              const hasExitData = mapped.exit_time || (mapped.profit_loss !== null && mapped.profit_loss !== undefined);
              return {
                user_id: user.id,
                account_id: accountId,
                ticket_id: mapped.ticket_id || tradeIdentityKey(mapped),
                currency_pair: mapped.currency_pair,
                direction: mapped.direction,
                entry_time: mapped.entry_time,
                position_size: mapped.position_size,
                stop_loss: mapped.stop_loss ?? null,
                take_profit: mapped.take_profit ?? null,
                exit_time: mapped.exit_time || null,
                profit_loss: mapped.profit_loss ?? null,
                status: hasExitData ? "closed" : "open",
              };
            })
            .filter((t: any) => t && t.currency_pair && t.position_size > 0);

          if (mappedTrades.length === 0 && statement.cashflows.length === 0 && statement.summaryDeposits == null && statement.summaryWithdrawals == null) {
            await supabase
              .from("csv_import_logs")
              .update({
                status: "failed",
                error_details: { error: "No valid trades found after mapping" },
                completed_at: new Date().toISOString(),
              })
              .eq("id", importLog.id);
            setError("No valid trades found. Please check your CSV format.");
            setLoading(false);
            return;
          }

          const { data: existingTrades } = await supabase
            .from("trades")
            .select("id, ticket_id, entry_time, currency_pair, exit_time, position_size, status, profit_loss, direction")
            .eq("user_id", user.id)
            .eq("account_id", accountId);

          const existingKeys = new Set((existingTrades || []).map((trade) => tradeIdentityKey(trade)));
          let duplicatesByTicket = 0;
          let duplicatesByProfile = 0;

          const newTrades = mappedTrades.filter((newTrade: any) => {
            const key = tradeIdentityKey(newTrade);
            if (existingKeys.has(key)) {
              if (newTrade.ticket_id) duplicatesByTicket += 1;
              else duplicatesByProfile += 1;
              return false;
            }
            existingKeys.add(key);
            return true;
          });

          setDuplicateStats({
            total: mappedTrades.length - newTrades.length,
            byTicket: duplicatesByTicket,
            byProfile: duplicatesByProfile,
            byPositionSize: 0,
          });

          if (newTrades.length === 0 && statement.cashflows.length === 0 && statement.summaryDeposits == null && statement.summaryWithdrawals == null) {
            await supabase
              .from("csv_import_logs")
              .update({
                status: "completed",
                imported_rows: 0,
                skipped_rows: mappedTrades.length,
                error_rows: 0,
                completed_at: new Date().toISOString(),
              })
              .eq("id", importLog.id);
            setError(`All ${mappedTrades.length} trades already exist in the database. No new trades imported.`);
            setLoading(false);
            return;
          }

          const duplicatesSkipped = mappedTrades.length - newTrades.length;

          // Get account balance for risk calculations
          const { data: account } = await supabase
            .from("trading_accounts")
            .select("current_balance")
            .eq("id", accountId)
            .single();

          // Calculate all metrics for each trade before inserting
          const { calculateTradeMetrics } = await import("@/lib/utils/trade-calculations");
          const tradesWithMetrics = newTrades.map((trade: any) => {
            const metrics = calculateTradeMetrics({
              stop_loss: trade.stop_loss || null,
              take_profit: trade.take_profit || null,
              direction: trade.direction,
              currency_pair: trade.currency_pair,
              position_size: trade.position_size,
              profit_loss: trade.profit_loss || null,
              exit_time: trade.exit_time || null,
              current_balance: account?.current_balance || null,
            });
            // Ensure status is preserved and set correctly - if we have exit data, it should be closed
            const hasExitData = trade.exit_time || (trade.profit_loss !== null && trade.profit_loss !== undefined);
            const finalStatus = hasExitData ? "closed" : (trade.status || "open");
            return { ...trade, ...metrics, status: finalStatus };
          });

          let imported = 0;
          let cashflowImported = 0;
          let skipped = 0;
          const errors: string[] = [];

          if (tradesWithMetrics.length > 0) {
            for (let i = 0; i < tradesWithMetrics.length; i += 100) {
              const batch = tradesWithMetrics.slice(i, i + 100);
              const batchNum = Math.floor(i / 100) + 1;
              const totalBatches = Math.ceil(tradesWithMetrics.length / 100);

              setImportProgress({
                current: i,
                total: tradesWithMetrics.length,
                stage: `Importing batch ${batchNum}/${totalBatches}...`,
              });

              const { error: insertError } = await supabase.from("trades").insert(batch);

              if (insertError) {
                console.error("Insert error:", insertError);
                errors.push(`Batch ${batchNum}: ${insertError.message}`);
                skipped += batch.length;
              } else {
                imported += batch.length;
                setImportProgress({
                  current: Math.min(i + 100, tradesWithMetrics.length),
                  total: tradesWithMetrics.length,
                  stage: `Batch ${batchNum}/${totalBatches} completed`,
                });
              }
            }
          }

          const { data: existingCashflows } = await supabase
            .from("account_cashflows")
            .select("type, amount, posted_at, created_at, note, status")
            .eq("user_id", user.id)
            .eq("account_id", accountId);

          const existingMovements: StatementCashflow[] = (existingCashflows || []).map((item) => ({
            type: item.type as "deposit" | "withdrawal",
            amount: Number(item.amount || 0),
            posted_at: item.posted_at || item.created_at || new Date().toISOString(),
            note: item.note || "",
          }));

          const cashflowKey = (item: StatementCashflow) =>
            `${item.type}|${Number(item.amount).toFixed(2)}|${item.posted_at.slice(0, 10)}`;
          const existingCashflowKeys = new Set(existingMovements.map(cashflowKey));
          const reconciled = reconcileStatementCashflows(
            statement.cashflows,
            existingMovements,
            statement.summaryDeposits,
            statement.summaryWithdrawals
          ).filter((item) => {
            const key = cashflowKey(item);
            if (existingCashflowKeys.has(key)) return false;
            existingCashflowKeys.add(key);
            return true;
          });

          if (reconciled.length > 0) {
            const cashflowRows = reconciled.map((item) => ({
              user_id: user.id,
              account_id: accountId,
              type: item.type,
              amount: item.amount,
              status: "completed",
              note: item.note,
              reason: item.note,
              currency: "USD",
              posted_at: item.posted_at,
            }));
            const { error: cashflowError } = await supabase.from("account_cashflows").insert(cashflowRows);
            if (cashflowError) {
              errors.push(`Cashflow: ${cashflowError.message}`);
            } else {
              cashflowImported = cashflowRows.length;
            }
          }

          await supabase
            .from("csv_import_logs")
            .update({
              status: errors.length > 0 && imported === 0 && cashflowImported === 0 ? "failed" : "completed",
              imported_rows: imported + cashflowImported,
              skipped_rows: skipped + duplicatesSkipped,
              error_rows: errors.length,
              error_details: errors.length > 0 ? { errors } : null,
              completed_at: new Date().toISOString(),
            })
            .eq("id", importLog.id);

          setLoading(false);
          if (imported > 0 || cashflowImported > 0) {
            let message = `Imported ${imported} trade${imported !== 1 ? "s" : ""}`;
            if (cashflowImported > 0) {
              message += ` and ${cashflowImported} cashflow record${cashflowImported !== 1 ? "s" : ""}`;
            }
            message += ". Broker statement totals stay in place; new fills after the statement date add on top.";
            if (duplicatesSkipped > 0) {
              message += ` ${duplicatesSkipped} existing deal${duplicatesSkipped !== 1 ? "s" : ""} skipped.`;
            }
            setSuccess(message);
            setTimeout(() => {
              router.push("/dashboard");
              router.refresh();
            }, 2000);
          } else {
            setError(`Import failed. ${errors.length > 0 ? errors.join("; ") : "No trades were imported."}`);
          }
        } catch (err: any) {
          console.error("Import error:", err);
          setError(`Import failed: ${err.message || "Unknown error"}`);
          setLoading(false);
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
        setLoading(false);
      },
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
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

      {/* Import Progress Preloader */}
      {loading && importProgress.total > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-blue-900">Importing Trades...</h3>
            <span className="text-sm text-blue-700 font-medium">
              {importProgress.current} / {importProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
              }}
            ></div>
          </div>
          <p className="text-xs text-blue-700 mt-2">{importProgress.stage}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Trading Account *
          </label>
          <select
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={loading}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            CSV File *
          </label>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            disabled={loading}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-slate-500">
            Export the broker Deals table plus Transactions/Summary. The journal now keeps every same-day fill and rebuilds balance as starting capital + deposits − withdrawals + closed P&L.
          </p>
        </div>

        {file && (
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={handlePreview} disabled={loading}>
              Preview
            </Button>
            <Button type="button" onClick={handleImport} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                  </svg>
                  Importing...
                </span>
              ) : (
                "Import Trades"
              )}
            </Button>
          </div>
        )}

        {showPreview && preview.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              Preview (first 10 rows)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {Object.keys(preview[0]).map((key) => (
                      <th
                        key={key}
                        className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((value: any, i) => (
                        <td key={i} className="px-4 py-2 text-sm text-slate-500">
                          {String(value).substring(0, 50)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
