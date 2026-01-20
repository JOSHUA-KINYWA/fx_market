import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { TradeDetail } from "@/components/trades/trade-detail";
import { TradeEnrichment } from "@/components/trades/trade-enrichment";
import { TradeNotes } from "@/components/trades/trade-notes";
import { RiskManagementForm } from "@/components/trades/risk-management-form";
import { DeleteTradeButton } from "@/components/trades/delete-trade-button";
import { serializeData } from "@/lib/utils/serialize";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TradeDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: trade } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!trade) {
    redirect("/trades");
  }

  const { data: account } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("id", trade.account_id)
    .single();

  const { data: strategy } = trade.strategy_id
    ? await supabase
        .from("strategies")
        .select("*")
        .eq("id", trade.strategy_id)
        .single()
    : { data: null };

  const { data: setup } = trade.setup_id
    ? await supabase
        .from("trade_setups")
        .select("*")
        .eq("id", trade.setup_id)
        .single()
    : { data: null };

  // Convert to plain objects to avoid read-only issues with Supabase objects
  const tradeData = serializeData(trade);
  const accountData = account ? serializeData(account) : null;
  const strategyData = strategy ? serializeData(strategy) : null;
  const setupData = setup ? serializeData(setup) : null;

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trade Details</h1>
            <p className="mt-2 text-gray-600">
              {trade.currency_pair} - {trade.direction.toUpperCase()}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href="/trades">
              <Button variant="outline">Back to Trades</Button>
            </Link>
            <Link href={`/trades/${id}/edit`}>
              <Button>Edit</Button>
            </Link>
            <DeleteTradeButton tradeId={id} accountId={trade.account_id} />
          </div>
        </div>

        <TradeDetail
          trade={tradeData}
          account={accountData}
          strategy={strategyData}
          setup={setupData}
        />

        <div className="mt-6">
          <TradeEnrichment trade={tradeData} />
        </div>

        <div className="mt-6">
          <RiskManagementForm trade={tradeData} account={accountData} />
        </div>

        <div className="mt-6">
          <TradeNotes trade={tradeData} />
        </div>
      </div>
    </AppLayout>
  );
}

