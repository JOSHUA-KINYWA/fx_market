"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      const supabase = createClient();

      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          router.replace("/reset-password");
        } else {
          router.replace("/forgot-password");
        }
      });
      return;
    }

    router.replace("/login");
  }, [router, searchParams]);

  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
