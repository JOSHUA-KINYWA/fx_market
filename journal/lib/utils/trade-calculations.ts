import { Database } from "@/types/database.types";

export interface TradeMetrics {
  pips: number | null;
  risk_reward_ratio: number | null;
  r_multiple: number | null;
  risk_amount: number | null;
}

export function calculateTradeMetrics(trade: {
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

  // Pips are intentionally not calculated here because the requested trade contract
  // stores only the session/timeframe/position/risk fields and the resulting P/L signal.
  // The trade file does not supply entry/exit prices anymore.

  // Calculate risk_reward_ratio and r_multiple if we have SL and TP dollar amounts
  if (trade.stop_loss && trade.take_profit) {
    const riskAmount = Number.parseFloat(trade.stop_loss.toString());
    const rewardAmount = Number.parseFloat(trade.take_profit.toString());

    if (riskAmount > 0) {
      metrics.risk_reward_ratio = rewardAmount / riskAmount;

      // R-multiple: if trade is closed with actual P&L, use actual vs risk amount.
      // Otherwise, use planned R:R. The exit price must not be required anymore.
      if (trade.exit_time && trade.profit_loss !== null && trade.profit_loss !== undefined) {
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

