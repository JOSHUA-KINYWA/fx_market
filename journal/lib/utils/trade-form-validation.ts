export interface TradeFormValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateTradeForm(values: {
  account_id: string;
  currency_pair: string;
  position_size: string;
  stop_loss: string;
  take_profit: string;
  entry_time: string;
}): TradeFormValidationResult {
  if (!values.account_id.trim()) {
    return { isValid: false, error: "Please select a trading account." };
  }

  if (!values.currency_pair.trim()) {
    return { isValid: false, error: "Please enter a currency pair." };
  }

  const positionSize = Number(values.position_size);
  if (!Number.isFinite(positionSize) || positionSize <= 0) {
    return { isValid: false, error: "Position size must be greater than zero." };
  }

  const entryTime = new Date(values.entry_time);
  if (Number.isNaN(entryTime.getTime())) {
    return { isValid: false, error: "Please enter a valid entry time." };
  }

  if (values.stop_loss) {
    const stopLoss = Number(values.stop_loss);
    if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
      return { isValid: false, error: "Stop loss amount must be greater than zero." };
    }
  }

  if (values.take_profit) {
    const takeProfit = Number(values.take_profit);
    if (!Number.isFinite(takeProfit) || takeProfit <= 0) {
      return { isValid: false, error: "Take profit amount must be greater than zero." };
    }
  }

  return { isValid: true };
}

export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("fetch") || message.includes("network")) {
      return "We could not reach the server. Please check your connection and try again.";
    }

    if (message.includes("jwt") || message.includes("session") || message.includes("token")) {
      return "Your session has expired. Please sign in again and retry.";
    }

    if (message.includes("permission") || message.includes("policy")) {
      return "You do not have permission to complete this action.";
    }

    if (message.includes("duplicate") || message.includes("unique")) {
      return "This record already exists. Please review the values and try again.";
    }

    if (message.includes("not-null") || message.includes("violates")) {
      return "The server rejected the submission because a required field is missing.";
    }

    return error.message;
  }

  return "Something went wrong while saving the trade. Please try again.";
}
