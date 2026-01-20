"use client";

import { Database } from "@/types/database.types";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Strategy = Database["public"]["Tables"]["strategies"]["Row"];

interface StrategiesListProps {
  strategies: Strategy[];
}

export function StrategiesList({ strategies }: StrategiesListProps) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {strategies.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-500 mb-4">No strategies yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timeframes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {strategies.map((strategy) => (
                <tr key={strategy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {strategy.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {strategy.description || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {strategy.timeframes?.join(", ") || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        strategy.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {strategy.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(strategy.created_at || ""), "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link href={`/strategies/${strategy.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

