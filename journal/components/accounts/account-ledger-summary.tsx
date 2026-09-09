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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            Account Ledger
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {accountName}
          </h2>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current Balance
          </div>
          <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {currency || "USD"} {Number(currentBalance || 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Deposits</div>
          <div className="mt-2 text-2xl font-black text-emerald-900">
            {currency || "USD"} {depositTotal.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-rose-700">Withdrawals</div>
          <div className="mt-2 text-2xl font-black text-rose-900">
            {currency || "USD"} {withdrawalTotal.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-700">Completed</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{completedMovements}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Pending</div>
          <div className="mt-2 text-2xl font-black text-amber-900">{pendingMovements}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-6 pb-6">
        <Link
          href={`/accounts/${accountId}/cashflow`}
          className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          Add Deposit / Withdrawal
        </Link>
        <Link
          href={`/accounts/${accountId}/edit`}
          className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
        >
          Edit Account
        </Link>
        <Link
          href={`/analytics?accountId=${accountId}`}
          className="inline-flex items-center rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 hover:text-blue-900"
        >
          Open Analytics Dashboard
        </Link>
      </div>

      <div className="border-t border-slate-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Recent Ledger Activity
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {movements.length} {movements.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className="mt-4">
          {movements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No ledger movements yet.
            </div>
          ) : (
            <div className="space-y-3">
              {movements.slice(0, 5).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      {movement.type === "deposit" ? "Deposit" : "Withdrawal"}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {movement.created_at ? new Date(movement.created_at).toLocaleDateString() : "Pending date"}
                      {movement.status ? ` • ${movement.status}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-black ${movement.type === "deposit" ? "text-emerald-700" : "text-rose-700"}`}>
                      {movement.type === "deposit" ? "+" : "-"}
                      {currency || "USD"} {Number(movement.amount || 0).toFixed(2)}
                    </div>
                    {movement.note && (
                      <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
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
