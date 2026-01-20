import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { CSVImportForm } from "@/components/import/csv-import-form";

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Import Trades</h1>
          <p className="mt-2 text-gray-600">
            Upload CSV files from your trading platform
          </p>
        </div>

        <CSVImportForm accounts={accounts || []} />
      </div>
    </AppLayout>
  );
}



