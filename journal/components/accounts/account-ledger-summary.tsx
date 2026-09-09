"use client";

import Link from "next/link";

interface LedgerMovement {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  created_at: string | null;
  note: string | null;
  status: "pending" | "completed" | "review";
}

interface AccountLedgerSummaryProps {
  accountId: string;
  accountName: string;
  currency: string;
  currentBalance: number;
  movements: LedgerMovement[];
}

export function AccountLedgerSummary({
  accountId,
  accountName,
  currency,
  currentBalance,
  movements,
}: AccountLedgerSummaryProps) {
  const depositTotal = movements
    .filter((m) => m.type === "deposit")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const withdrawalTotal = movements
    .filter((m) => m.type === "withdrawal")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const completedMovements = movements.filter((m) => m.status === "completed").length;
  const pendingMovements = movements.filter((m) => m.status === "pending").length;

  return (
    <section className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Account Ledger
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">
            {accountName}
          </h2>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Current Balance
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {currency || "USD"} {Number(currentBalance || 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <div className="text-xs font-semibold uppercase text-emerald-700">Deposits</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">
            {currency || "USD"} {depositTotal.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
          <div className="text-xs font-semibold uppercase text-rose-700">Withdrawals</div>
          <div className="text-xl font-bold text-rose-900 mt-1">
            {currency || "USD"} {withdrawalTotal.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase text-slate-700">Completed</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{completedMovements}</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase text-amber-700">Pending</div>
          <div className="text-xl font-bold text-amber-900 mt-1">{pendingMovements}</div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/accounts/${accountId}/cashflow`}
          className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Add Deposit / Withdrawal
        </Link>
        <Link
          href={`/accounts/${accountId}/edit`}
          className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Edit Account
        </Link>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Recent Ledger Activity
          </h3>
          <span className="text-xs text-slate-500">
            {movements.length} records
          </span>
        </div>
        <div className="mt-3">
          {movements.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No ledger movements yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {movements.slice(0, 5).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {movement.type === "deposit" ? "Deposit" : "Withdrawal"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {movement.created_at ? new Date(movement.created_at).toLocaleDateString() : "Pending date"}
                      {movement.status ? ` • ${movement.status}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${movement.type === "deposit" ? "text-emerald-600" : "text-rose-600"}`}>
                      {movement.type === "deposit" ? "+" : "-"}
                      {currency || "USD"} {Number(movement.amount || 0).toFixed(2)}
                    </div>
                    {movement.note && (
                      <div className="text-xs text-slate-500 max-w-xs truncate">
                        {movement.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
