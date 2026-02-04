"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLoading } from "@/lib/loading-context";

export function usePageTransition() {
  const router = useRouter();
  const { startLoading, stopLoading } = useLoading();

  const navigateTo = (href: string) => {
    startLoading();
    // Brief delay to show loading state
    setTimeout(() => {
      router.push(href);
      // Stop loading after navigation
      setTimeout(() => stopLoading(), 500);
    }, 300);
  };

  return { navigateTo };
}
