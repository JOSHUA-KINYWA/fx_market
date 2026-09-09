"use client";

import Link from "next/link";
import { Database } from "@/types/database.types";

type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

interface AccountsListProps {
  accounts: Account[];
}

export function AccountsList({ accounts }: AccountsListProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {accounts.length === 0 ? (
        <div className="p-12 text-center">
          <p className="mb-4 text-slate-500">No trading accounts yet</p>
          <Link
            href="/accounts/new"
            className="inline-flex items-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Create Your First Account
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Account Name
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Broker
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {accounts.map((account) => (
                <tr key={account.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900">
                    {account.account_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                    {account.broker_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                    {account.account_type || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                    {account.currency || "USD"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900">
                    {account.currency || "USD"} {Number(account.current_balance || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                        account.is_active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {account.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/accounts/${account.id}/cashflow`}
                        className="rounded-lg px-3 py-2 text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-900"
                      >
                        Ledger
                      </Link>
                      <Link
                        href={`/analytics?accountId=${account.id}`}
                        className="rounded-lg px-3 py-2 text-blue-700 transition hover:bg-blue-50 hover:text-blue-900"
                      >
                        Analytics
                      </Link>
                      <Link
                        href={`/accounts/${account.id}/edit`}
                        className="rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

