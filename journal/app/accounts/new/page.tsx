import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { AccountForm } from "@/components/accounts/account-form";

export default async function NewAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Add Trading Account</h1>
          <p className="mt-2 text-gray-600">
            Create a new trading account
          </p>
        </div>

        <AccountForm />
      </div>
    </AppLayout>
  );
}



