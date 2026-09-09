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
  const visibleMovements = movements.filter((movement) => {
    const sampleText = `${movement.note || ""}`.toLowerCase();
    return !sampleText.includes("sort account issues") && !sampleText.includes("paid for account");
  });

  const depositTotal = visibleMovements
    .filter((m) => m.type === "deposit")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const withdrawalTotal = visibleMovements
    .filter((m) => m.type === "withdrawal")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const completedMovements = visibleMovements.filter((m) => m.status === "completed").length;
  const pendingMovements = visibleMovements.filter((m) => m.status === "pending").length;

  const movementsByCreated = [...visibleMovements].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });

  const refundableMovementBalanceBeforeById = new Map<string, number>();
  let balanceReconstruction = Number(currentBalance || 0);

  for (const movement of [...movementsByCreated].reverse()) {
    if (movement.type === "deposit") {
      const balanceBefore = balanceReconstruction - Number(movement.amount || 0);
      refundableMovementBalanceBeforeById.set(movement.id, balanceBefore);
      balanceReconstruction = balanceBefore;
    } else if (movement.type === "withdrawal") {
      const balanceBefore = balanceReconstruction + Number(movement.amount || 0);
      refundableMovementBalanceBeforeById.set(movement.id, balanceBefore);
      balanceReconstruction = balanceBefore;
    }
  }

  const balanceCurvePoints = (() => {
    if (movementsByCreated.length === 0) {
      return [] as Array<{ value: number; label: string }>;
    }

    const latestToOldest = [...movementsByCreated].reverse();
    const points = [{ value: currentBalance, label: "Current" }];
    let balance = Number(currentBalance || 0);

    for (const movement of latestToOldest) {
      if (movement.type === "deposit") {
        balance -= Number(movement.amount || 0);
      } else {
        balance += Number(movement.amount || 0);
      }

      points.push({
        value: Number(balance.toFixed(2)),
        label: movement.created_at ? new Date(movement.created_at).toLocaleDateString() : "Cashflow",
      });
    }

    return points.reverse();
  })();

  const curveWidth = 300;
  const curveHeight = 84;
  const minCurveValue = Math.min(...balanceCurvePoints.map((point) => point.value), Number(currentBalance || 0));
  const maxCurveValue = Math.max(...balanceCurvePoints.map((point) => point.value), Number(currentBalance || 0));
  const curveRange = maxCurveValue - minCurveValue || 1;

  const path = balanceCurvePoints.length > 1
    ? balanceCurvePoints
        .map((point, index) => {
          const x = balanceCurvePoints.length === 1 ? curveWidth / 2 : (curveWidth / Math.max(balanceCurvePoints.length - 1, 1)) * index;
          const y = curveHeight - ((point.value - minCurveValue) / curveRange) * curveHeight;
          return `${index === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ")
    : "";

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

      <div className="px-6 pb-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Account Balance Curve
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-600">
                Cashflow path before withdrawals
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Last Movement
              </div>
              <div className="text-sm font-black text-slate-900">
                {movementsByCreated.length > 0 ? (movementsByCreated[movementsByCreated.length - 1]?.created_at ? new Date(movementsByCreated[movementsByCreated.length - 1].created_at!).toLocaleDateString() : "--") : "No activity"}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <svg viewBox={`0 0 ${curveWidth} ${curveHeight}`} className="h-28 w-full">
              <path d={path} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
              {balanceCurvePoints.length > 1 && balanceCurvePoints.map((point, index) => {
                const x = balanceCurvePoints.length === 1 ? curveWidth / 2 : (curveWidth / Math.max(balanceCurvePoints.length - 1, 1)) * index;
                const y = curveHeight - ((point.value - minCurveValue) / curveRange) * curveHeight;
                return (
                  <circle key={`${point.label}-${index}`} cx={x} cy={y} r="2" fill="#0f766e" />
                );
              })}
            </svg>
          </div>
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
            {visibleMovements.length} {visibleMovements.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className="mt-4">
          {visibleMovements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No ledger movements yet.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleMovements.slice(0, 5).map((movement) => {
                const amount = Number(movement.amount || 0);
                const balanceBefore = refundableMovementBalanceBeforeById.get(movement.id);

                return (
                  <div key={movement.id} className="rounded-xl border border-slate-100 px-4 py-3">
                    <div className="flex items-center justify-between">
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
                          {currency || "USD"} {amount.toFixed(2)}
                        </div>
                        {movement.note && (
                          <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {movement.note}
                          </div>
                        )}
                      </div>
                    </div>

                    {movement.type === "withdrawal" && typeof balanceBefore === "number" && (
                      <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
                        Before withdrawal: {currency || "USD"} {Number(balanceBefore || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
