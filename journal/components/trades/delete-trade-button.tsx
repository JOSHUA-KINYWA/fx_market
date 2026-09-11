"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { applyBalanceDelta } from "@/lib/utils/broker-statement";

interface DeleteTradeButtonProps {
  tradeId: string;
  accountId: string;
}

export function DeleteTradeButton({ tradeId, accountId }: DeleteTradeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // Get trade to calculate balance adjustment
    const { data: trade } = await supabase
      .from("trades")
      .select("profit_loss, status")
      .eq("id", tradeId)
      .single();

    // Delete the trade
    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("id", tradeId);

    if (error) {
      alert(`Failed to delete trade: ${error.message}`);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await applyBalanceDelta(supabase, accountId, user.id, -Number(trade?.profit_loss || 0));
    }

    router.push("/trades");
    router.refresh();
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Are you sure?</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? "Deleting..." : "Delete Trade"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-2"
    >
      <Trash2 size={16} />
      Delete Trade
    </Button>
  );
}
