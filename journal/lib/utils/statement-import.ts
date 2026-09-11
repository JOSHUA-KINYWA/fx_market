import { roundMoney, tradeIdentityKey } from "@/lib/utils/account-ledger";

export interface StatementDeal {
  ticket_id: string;
  currency_pair: string;
  direction: "buy" | "sell";
  entry_time: string;
  exit_time: string | null;
  position_size: number;
  profit_loss: number | null;
}

export interface StatementCashflow {
  type: "deposit" | "withdrawal";
  amount: number;
  posted_at: string;
  note: string;
}

export interface ParsedStatement {
  deals: StatementDeal[];
  cashflows: StatementCashflow[];
  summaryDeposits: number | null;
  summaryWithdrawals: number | null;
}

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function normalizeHeader(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/\(utc[+-]?\d+\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseMoney(value: string | null | undefined): number | null {
  if (value == null || String(value).trim() === "") return null;
  const cleaned = String(value).replace(/[^0-9+\-.]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "+" || cleaned === ".") return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? roundMoney(parsed) : null;
}

function parseLots(value: string | null | undefined): number {
  if (value == null) return 0;
  const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : 0;
}

export function parseStatementDate(value: string | null | undefined, utcOffsetHours = 3): string | null {
  if (!value) return null;
  const raw = String(value).replace(/\(utc[+-]?\d+\)/gi, "").trim();
  if (!raw) return null;

  const dayMonthYear = raw.match(
    /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?/
  );
  if (dayMonthYear) {
    const [, day, monthName, year, hour = "00", minute = "00", second = "00", fraction = "000"] = dayMonthYear;
    const month = MONTHS[monthName.toLowerCase()];
    if (!month) return null;
    const ms = fraction.padEnd(3, "0").slice(0, 3);
    const isoLocal = `${year}-${month}-${day.padStart(2, "0")}T${hour}:${minute}:${second}.${ms}`;
    const asUtc = new Date(`${isoLocal}Z`);
    if (Number.isNaN(asUtc.getTime())) return null;
    asUtc.setUTCHours(asUtc.getUTCHours() - utcOffsetHours);
    return asUtc.toISOString();
  }

  const mt4 = raw.match(/(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (mt4) {
    const [, year, month, day, hour, minute, second] = mt4;
    const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "," || char === "\t" || char === ";") && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, "").trim());
}

function getCell(row: Record<string, string>, names: string[]): string | null {
  for (const name of names) {
    const wanted = normalizeHeader(name);
    for (const [header, value] of Object.entries(row)) {
      if (normalizeHeader(header) === wanted && value) {
        return value;
      }
    }
  }
  return null;
}

function isDealHeader(headers: string[]): boolean {
  const joined = headers.map(normalizeHeader).join(" | ");
  return (
    joined.includes("symbol") &&
    (joined.includes("net usd") ||
      joined.includes("profit") ||
      joined.includes("closing quantity") ||
      joined.includes("opening direction"))
  );
}

function isTransactionHeader(headers: string[]): boolean {
  const joined = headers.map(normalizeHeader).join(" | ");
  return joined.includes("transaction type") || (joined.includes("payment type") && joined.includes("gross"));
}

function isSummaryLine(cells: string[]): boolean {
  const first = normalizeHeader(cells[0] || "");
  return first === "deposit" || first === "withdrawal" || first === "initial net" || first === "realised p l" || first === "realized p l";
}

function mapDealRow(row: Record<string, string>): StatementDeal | null {
  const symbolRaw = getCell(row, ["Symbol", "Instrument", "currency pair"]);
  if (!symbolRaw) return null;
  const symbol = symbolRaw.replace(/[/\s_]/g, "").toUpperCase();
  if (!symbol || symbol === "SYMBOL" || symbol === "TOTALS" || symbol === "TOTAL") return null;

  const directionRaw = (getCell(row, ["Opening Direction", "Type", "Trade Side", "Direction"]) || "buy").toLowerCase();
  const direction: "buy" | "sell" = directionRaw.includes("sell") ? "sell" : "buy";
  const closeTime =
    parseStatementDate(getCell(row, ["Closing Time", "Close Time", "Exit Time", "CloseTime"])) ||
    parseStatementDate(getCell(row, ["Open Time", "Opening Time", "Entry Time", "Time"]));
  const openTime =
    parseStatementDate(getCell(row, ["Open Time", "Opening Time", "Entry Time"])) || closeTime;
  const volume = parseLots(
    getCell(row, ["Closing Quantity", "Volume", "Lots", "Size", "Quantity"])
  );
  const profit = parseMoney(getCell(row, ["Net USD", "Profit", "P&L", "P/L", "Gross USD"]));

  if (!openTime || volume <= 0) return null;

  const deal: StatementDeal = {
    ticket_id: "",
    currency_pair: symbol,
    direction,
    entry_time: openTime,
    exit_time: closeTime,
    position_size: volume,
    profit_loss: profit,
  };
  deal.ticket_id = tradeIdentityKey(deal);
  return deal;
}

function mapTransactionRow(row: Record<string, string>): StatementCashflow | null {
  const typeRaw = (getCell(row, ["Transaction type", "Type", "Payment type"]) || "").toLowerCase();
  const amount = Math.abs(parseMoney(getCell(row, ["Gross USD", "Amount", "Net USD"])) || 0);
  if (amount <= 0) return null;

  let type: "deposit" | "withdrawal" | null = null;
  if (typeRaw.includes("withdraw")) type = "withdrawal";
  if (typeRaw.includes("deposit") || typeRaw.includes("transfer in")) type = "deposit";
  if (!type) return null;

  const postedAt =
    parseStatementDate(getCell(row, ["Time", "Date", "Posted At"])) || new Date().toISOString();
  const note = getCell(row, ["Note", "Comment", "ID"]) || `Statement ${type}`;

  return { type, amount, posted_at: postedAt, note };
}

function rowsFromSection(headerLine: string, bodyLines: string[]): Record<string, string>[] {
  const headers = splitCsvLine(headerLine);
  return bodyLines
    .map((line) => splitCsvLine(line))
    .filter((cells) => cells.some((cell) => cell))
    .map((cells) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] || "";
      });
      return row;
    });
}

export function parseBrokerStatement(text: string): ParsedStatement {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""));

  const deals: StatementDeal[] = [];
  const cashflows: StatementCashflow[] = [];
  let summaryDeposits: number | null = null;
  let summaryWithdrawals: number | null = null;

  let index = 0;
  while (index < lines.length) {
    const cells = splitCsvLine(lines[index]);
    const headers = cells.map(normalizeHeader);

    if (isDealHeader(cells)) {
      const headerLine = lines[index];
      const body: string[] = [];
      index += 1;
      while (index < lines.length) {
        const next = splitCsvLine(lines[index]);
        const first = normalizeHeader(next[0] || "");
        if (
          first === "positions" ||
          first === "orders" ||
          first === "transactions" ||
          first === "summary" ||
          first === "totals" ||
          isTransactionHeader(next)
        ) {
          break;
        }
        if (first !== "no positions" && first !== "no orders") {
          body.push(lines[index]);
        }
        index += 1;
      }
      rowsFromSection(headerLine, body).forEach((row) => {
        const deal = mapDealRow(row);
        if (deal) deals.push(deal);
      });
      continue;
    }

    if (isTransactionHeader(cells)) {
      const body: string[] = [];
      const headerLine = lines[index];
      index += 1;
      while (index < lines.length) {
        const next = splitCsvLine(lines[index]);
        const first = normalizeHeader(next[0] || "");
        if (first === "summary" || first === "deals" || first === "positions" || isDealHeader(next)) {
          break;
        }
        body.push(lines[index]);
        index += 1;
      }
      rowsFromSection(headerLine, body).forEach((row) => {
        const movement = mapTransactionRow(row);
        if (movement) cashflows.push(movement);
      });
      continue;
    }

    if (isSummaryLine(cells)) {
      const label = normalizeHeader(cells[0] || "");
      const amount = parseMoney(cells[1] || cells[cells.length - 1]);
      if (label === "deposit" && amount != null) summaryDeposits = Math.abs(amount);
      if (label === "withdrawal" && amount != null) summaryWithdrawals = Math.abs(amount);
    }

    index += 1;
  }

  if (deals.length === 0) {
    const firstLine = lines.find((line) => splitCsvLine(line).length > 1);
    if (firstLine) {
      const headerIndex = lines.indexOf(firstLine);
      const headerCells = splitCsvLine(firstLine);
      if (isDealHeader(headerCells) || headerCells.map(normalizeHeader).includes("symbol")) {
        rowsFromSection(firstLine, lines.slice(headerIndex + 1)).forEach((row) => {
          const deal = mapDealRow(row);
          if (deal) deals.push(deal);
        });
      }
      if (isTransactionHeader(headerCells)) {
        rowsFromSection(firstLine, lines.slice(headerIndex + 1)).forEach((row) => {
          const movement = mapTransactionRow(row);
          if (movement) cashflows.push(movement);
        });
      }
    }
  }

  return { deals, cashflows, summaryDeposits, summaryWithdrawals };
}

export function mapGenericTradeRow(row: Record<string, string>): StatementDeal | null {
  return mapDealRow(row);
}

export function reconcileStatementCashflows(
  imported: StatementCashflow[],
  existing: StatementCashflow[],
  summaryDeposits: number | null,
  summaryWithdrawals: number | null
): StatementCashflow[] {
  const combined = [...existing, ...imported];
  const totals = combined.reduce(
    (acc, item) => {
      if (item.type === "deposit") acc.deposits += item.amount;
      if (item.type === "withdrawal") acc.withdrawals += item.amount;
      return acc;
    },
    { deposits: 0, withdrawals: 0 }
  );

  const extras: StatementCashflow[] = [...imported];
  if (summaryDeposits != null) {
    const missing = roundMoney(summaryDeposits - totals.deposits);
    if (missing > 0.009) {
      extras.push({
        type: "deposit",
        amount: missing,
        posted_at: imported[0]?.posted_at || existing[0]?.posted_at || new Date().toISOString(),
        note: "Broker statement deposit remainder",
      });
    }
  }
  if (summaryWithdrawals != null) {
    const missing = roundMoney(summaryWithdrawals - totals.withdrawals);
    if (missing > 0.009) {
      extras.push({
        type: "withdrawal",
        amount: missing,
        posted_at: imported[0]?.posted_at || existing[0]?.posted_at || new Date().toISOString(),
        note: "Broker statement withdrawal remainder",
      });
    }
  }
  return extras;
}
