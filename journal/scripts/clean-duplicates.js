const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gkwcdjxrthlamgtpbcjf.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "YOUR_SERVICE_KEY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCleanDuplicates() {
  try {
    console.log("🔍 Fetching all trades...");

    // Get all trades
    const { data: trades, error: fetchError } = await supabase
      .from("trades")
      .select("*")
      .order("entry_time", { ascending: true });

    if (fetchError) {
      console.error("❌ Error fetching trades:", fetchError);
      return;
    }

    console.log(`📊 Total trades found: ${trades.length}`);

    // Group by user and account
    const userAccounts = {};
    trades.forEach((trade) => {
      const key = `${trade.user_id}_${trade.account_id}`;
      if (!userAccounts[key]) {
        userAccounts[key] = {
          user_id: trade.user_id,
          account_id: trade.account_id,
          trades: [],
        };
      }
      userAccounts[key].trades.push(trade);
    });

    // For each account, find and remove duplicates
    for (const key in userAccounts) {
      const account = userAccounts[key];
      console.log(`\n🔎 Checking account ${key} with ${account.trades.length} trades...`);

      const duplicateMap = new Map();

      account.trades.forEach((trade) => {
        let groupKey = "";

        if (trade.ticket_id && String(trade.ticket_id).trim() !== "") {
          groupKey = `ticket_${trade.ticket_id}`;
        } else {
          const entryDate = trade.entry_time ? new Date(trade.entry_time).toISOString().split("T")[0] : "null";
          groupKey = `profile_${entryDate}_${trade.currency_pair}_${trade.entry_price}`;
        }

        if (!duplicateMap.has(groupKey)) {
          duplicateMap.set(groupKey, []);
        }
        duplicateMap.get(groupKey).push(trade);
      });

      // Find and delete duplicates
      const toDelete = [];
      duplicateMap.forEach((trades, groupKey) => {
        if (trades.length > 1) {
          const sorted = trades.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const keep = sorted[0];
          const deleteCopies = sorted.slice(1);

          console.log(
            `  📌 Group "${groupKey}" has ${trades.length} copies:`,
          );
          console.log(`    ✓ KEEP: ${keep.currency_pair} @ ${keep.entry_price} (${keep.id.substring(0, 8)}...)`);
          deleteCopies.forEach((copy) => {
            console.log(`    ✕ DELETE: ${copy.currency_pair} @ ${copy.entry_price} (${copy.id.substring(0, 8)}...)`);
            toDelete.push(copy.id);
          });
        }
      });

      if (toDelete.length > 0) {
        console.log(`\n🗑️  Deleting ${toDelete.length} duplicate trades...`);

        for (let i = 0; i < toDelete.length; i += 100) {
          const batch = toDelete.slice(i, i + 100);
          const { error: deleteError } = await supabase.from("trades").delete().in("id", batch);

          if (deleteError) {
            console.error(`❌ Error deleting batch: ${deleteError.message}`);
            return;
          }
          console.log(`  ✓ Deleted ${Math.min(batch.length, toDelete.length - i)} trades`);
        }

        console.log(`✅ Successfully deleted ${toDelete.length} duplicate trades!`);
      } else {
        console.log(`✓ No duplicates found in this account`);
      }
    }

    console.log("\n📈 Checking floating loss before recalculation...");
    const { data: accountsData } = await supabase
      .from("trading_accounts")
      .select("id, floating_loss, current_balance, total_profit_loss");

    console.log("Current account metrics:");
    accountsData.forEach((acc) => {
      console.log(
        `  Account ${acc.id.substring(0, 8)}...: Floating Loss = ${acc.floating_loss}, Balance = ${acc.current_balance}, Total P/L = ${acc.total_profit_loss}`,
      );
    });
  } catch (error) {
    console.error("❌ Fatal error:", error);
  }
}

checkAndCleanDuplicates();
