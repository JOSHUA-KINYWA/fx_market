"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import { Database } from "@/types/database.types";

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

  const mapMT4Row = (row: any, headers: string[]): any => {
    // Find column names (case-insensitive)
    const getValue = (possibleNames: string[]): string | null => {
      for (const name of possibleNames) {
        for (const header of headers) {
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
    const price = getValue(["Price", "price", "Open Price", "OpenPrice", "open price", "Entry Price", "entry price"]);
    const volume = getValue(["Volume", "volume", "Lots", "lots", "Size", "size"]);
    const sl = getValue(["S / L", "S/L", "Stop Loss", "stop loss", "SL", "sl"]);
    const tp = getValue(["T / P", "T/P", "Take Profit", "take profit", "TP", "tp"]);
    const closeTime = getValue(["Close Time", "CloseTime", "close time", "Exit Time", "exit time"]);
    const closePrice = getValue(["Close Price", "ClosePrice", "close price", "Exit Price", "exit price"]);
    const profit = getValue(["Profit", "profit", "P&L", "pnl", "P/L", "pl"]);

    const currencyPair = symbol ? symbol.replace("/", "").replace("_", "").trim() : null;
    const direction = type ? (type.toLowerCase().includes("buy") ? "buy" : "sell") : "buy";

    return {
      ticket_id: ticket || null,
      currency_pair: currencyPair,
      direction,
      entry_time: parseDate(openTime) || new Date().toISOString(),
      entry_price: price ? Number.parseFloat(String(price)) : 0,
      position_size: volume ? Number.parseFloat(String(volume)) : 0,
      stop_loss: sl && sl !== "0" ? Number.parseFloat(String(sl)) : null,
      take_profit: tp && tp !== "0" ? Number.parseFloat(String(tp)) : null,
      exit_time: closeTime ? parseDate(closeTime) : null,
      exit_price: closePrice ? Number.parseFloat(String(closePrice)) : null,
      profit_loss: profit ? Number.parseFloat(String(profit)) : null,
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

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (results.errors.length > 0 && results.data.length === 0) {
            setError(`CSV parsing errors: ${results.errors.map((e) => e.message).join(", ")}`);
            setLoading(false);
            return;
          }

          if (results.data.length === 0) {
            setError("No data found in CSV file");
            setLoading(false);
            return;
          }

          const headers = Object.keys(results.data[0] || {});
          const brokerFormat = headers.some((h) => h.toLowerCase().includes("ticket")) ? "MT4/MT5" : "Unknown";

          // Create import log
          const { data: importLog, error: logError } = await supabase
            .from("csv_import_logs")
            .insert({
              user_id: user.id,
              account_id: accountId,
              file_name: file.name,
              broker_format: brokerFormat,
              status: "processing",
              total_rows: results.data.length,
            })
            .select()
            .single();

          if (logError || !importLog) {
            setError(`Failed to create import log: ${logError?.message || "Unknown error"}`);
            setLoading(false);
            return;
          }

          // Map and filter trades
          const mappedTrades = results.data
            .map((row: any) => {
              try {
                const mapped = mapMT4Row(row, headers);
                // Set status to "closed" if trade has exit_time, exit_price, or profit_loss (historical trades)
                // Default to "closed" for CSV imports since they're usually completed trades
                const hasExitData = mapped.exit_time || mapped.exit_price || (mapped.profit_loss !== null && mapped.profit_loss !== undefined);
                return {
                  user_id: user.id,
                  account_id: accountId,
                  ...mapped,
                  status: hasExitData ? "closed" : "open",
                };
              } catch (err) {
                console.error("Error mapping row:", err, row);
                return null;
              }
            })
            .filter((t: any) => t && t.currency_pair && t.entry_price > 0);

          if (mappedTrades.length === 0) {
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

          // Check for existing trades and remove duplicates BEFORE importing
          const { data: existingTrades } = await supabase
            .from("trades")
            .select("ticket_id, entry_time, currency_pair, entry_price, exit_time, exit_price")
            .eq("user_id", user.id)
            .eq("account_id", accountId);

          // Filter out duplicates
          const newTrades = mappedTrades.filter((newTrade: any) => {
            if (!existingTrades || existingTrades.length === 0) return true;
            
            // Check by ticket_id first (most reliable)
            if (newTrade.ticket_id) {
              const existsByTicket = existingTrades.some(
                (existing) => existing.ticket_id === newTrade.ticket_id
              );
              if (existsByTicket) return false;
            }
            
            // Check by entry_time + currency_pair + entry_price + exit_time/exit_price
            const existsByMatch = existingTrades.some((existing) => {
              const sameEntry = 
                existing.entry_time === newTrade.entry_time &&
                existing.currency_pair === newTrade.currency_pair &&
                Math.abs((existing.entry_price || 0) - (newTrade.entry_price || 0)) < 0.00001;
            
              // If both have exits, also check exit time/price
              if (newTrade.exit_time && existing.exit_time) {
                return sameEntry &&
                  existing.exit_time === newTrade.exit_time &&
                  Math.abs((existing.exit_price || 0) - (newTrade.exit_price || 0)) < 0.00001;
              }
              
              // If new trade has exit but existing doesn't, or vice versa, it's different
              if ((newTrade.exit_time && !existing.exit_time) || (!newTrade.exit_time && existing.exit_time)) {
                return false;
              }
              
              return sameEntry;
            });
            
            return !existsByMatch;
          });

          if (newTrades.length === 0) {
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
              entry_price: trade.entry_price,
              exit_price: trade.exit_price || null,
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
            const hasExitData = trade.exit_time || trade.exit_price || (trade.profit_loss !== null && trade.profit_loss !== undefined);
            const finalStatus = hasExitData ? "closed" : (trade.status || "open");
            return { ...trade, ...metrics, status: finalStatus };
          });

          let imported = 0;
          let skipped = 0;
          const errors: string[] = [];

          // Insert trades in batches
          for (let i = 0; i < tradesWithMetrics.length; i += 100) {
            const batch = tradesWithMetrics.slice(i, i + 100);
            const { error: insertError } = await supabase.from("trades").insert(batch);

            if (insertError) {
              console.error("Insert error:", insertError);
              errors.push(`Batch ${Math.floor(i / 100) + 1}: ${insertError.message}`);
              skipped += batch.length;
            } else {
              imported += batch.length;
            }
          }

          // Update account balance after import
          if (imported > 0) {
            const { updateAccountBalance } = await import("@/lib/utils/trade-calculations");
            await updateAccountBalance(supabase, accountId);
          }

          // Update import log
          await supabase
            .from("csv_import_logs")
            .update({
              status: errors.length > 0 && imported === 0 ? "failed" : "completed",
              imported_rows: imported,
              skipped_rows: skipped + duplicatesSkipped,
              error_rows: errors.length,
              error_details: errors.length > 0 ? { errors } : null,
              completed_at: new Date().toISOString(),
            })
            .eq("id", importLog.id);

          setLoading(false);
          if (imported > 0) {
            const message = duplicatesSkipped > 0
              ? `Successfully imported ${imported} trade${imported !== 1 ? "s" : ""}! ${duplicatesSkipped} duplicate${duplicatesSkipped !== 1 ? "s" : ""} automatically removed.`
              : `Successfully imported ${imported} trade${imported !== 1 ? "s" : ""}!`;
            setSuccess(message);
            setTimeout(() => {
              router.push("/trades");
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

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Trading Account *
          </label>
          <select
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            Supported formats: MT4, MT5, cTrader
          </p>
        </div>

        {file && (
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={handlePreview} disabled={loading}>
              Preview
            </Button>
            <Button type="button" onClick={handleImport} disabled={loading}>
              {loading ? "Importing..." : "Import Trades"}
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
