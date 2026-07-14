import { Database } from "@/types/database.types";

export interface TradeMetrics {
  pips: number | null;
  risk_reward_ratio: number | null;
  r_multiple: number | null;
  risk_amount: number | null;
}

export function calculateTradeMetrics(trade: {
  entry_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  direction: string;
  currency_pair: string;
  position_size: number;
  profit_loss: number | null;
  exit_time?: string | null;
  current_balance?: number | null;
}): TradeMetrics {
  const metrics: TradeMetrics = {
    pips: null,
    risk_reward_ratio: null,
    r_multiple: null,
    risk_amount: null,
  };

  // Calculate pips if we have entry and exit prices
  if (trade.entry_price !== null && trade.entry_price !== undefined && trade.exit_price !== null && trade.exit_price !== undefined && trade.currency_pair) {
    const pair = trade.currency_pair.toUpperCase();
    const pipValue = pair.includes("JPY") ? 0.01 : 0.0001;
    
    if (trade.direction === "buy") {
      metrics.pips = (trade.exit_price - trade.entry_price) / pipValue;
    } else {
      metrics.pips = (trade.entry_price - trade.exit_price) / pipValue;
    }
  }

  // Calculate risk_reward_ratio and r_multiple if we have SL and TP dollar amounts
  if (trade.stop_loss && trade.take_profit) {
    const riskAmount = Number.parseFloat(trade.stop_loss.toString());
    const rewardAmount = Number.parseFloat(trade.take_profit.toString());

    if (riskAmount > 0) {
      metrics.risk_reward_ratio = rewardAmount / riskAmount;

      // R-multiple: if trade is closed with actual P&L, use actual vs risk amount
      // Otherwise, use planned R:R
      if (trade.exit_price && trade.exit_time && trade.profit_loss !== null && trade.profit_loss !== undefined) {
        if (riskAmount > 0) {
          metrics.r_multiple = trade.profit_loss / riskAmount;
        } else {
          metrics.r_multiple = metrics.risk_reward_ratio;
        }
      } else {
        // For open trades, use planned R:R
        metrics.r_multiple = metrics.risk_reward_ratio;
      }
    }
  }

  // Calculate risk_amount (dollar amount at risk)
  if (trade.stop_loss) {
    const riskAmount = Number.parseFloat(trade.stop_loss.toString());

    if (riskAmount > 0) {
      metrics.risk_amount = riskAmount;
    }
  }

  return metrics;
}

export async function updateAccountBalance(
  supabase: any,
  accountId: string
): Promise<void> {
  // Get account
  const { data: account } = await supabase
    .from("trading_accounts")
    .select("initial_balance")
    .eq("id", accountId)
    .single();

  if (!account) return;

  // Get all closed trades for this account
  const { data: allTrades } = await supabase
    .from("trades")
    .select("profit_loss")
    .eq("account_id", accountId)
    .eq("status", "closed");

  const totalPnL =
    allTrades?.reduce(
      (sum: number, t: { profit_loss: number | null }) => sum + (t.profit_loss ?? 0),
      0
    ) ?? 0;
  const newBalance = (account.initial_balance || 0) + totalPnL;

  // Update account balance
  await supabase
    .from("trading_accounts")
    .update({ current_balance: newBalance })
    .eq("id", accountId);
}
