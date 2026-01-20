import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { StrategyForm } from "@/components/strategies/strategy-form";

export default async function EditStrategyPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: strategy } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!strategy) {
    redirect("/strategies");
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Strategy</h1>
          <p className="mt-2 text-gray-600">
            Update strategy information
          </p>
        </div>

        <StrategyForm
          strategyId={params.id}
          initialData={{
            name: strategy.name,
            description: strategy.description,
            is_active: strategy.is_active,
          }}
        />
      </div>
    </AppLayout>
  );
}



