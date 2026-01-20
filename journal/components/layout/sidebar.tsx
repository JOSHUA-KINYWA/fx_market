"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/trades", label: "Trades", icon: "💼" },
  { href: "/journal", label: "Journal", icon: "📝" },
  { href: "/import", label: "Import", icon: "📥" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/risk-management", label: "Risk Management", icon: "🛡️" },
  { href: "/strategies", label: "Strategies", icon: "🎯" },
  { href: "/accounts", label: "Accounts", icon: "🏦" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsMobileOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-slate-800 shadow-xl z-40 transform transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">FX Journal</h1>
                <p className="text-sm text-slate-300 mt-1">Trading Analytics</p>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden text-slate-300 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-700">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full bg-slate-700/50 text-white border-slate-600 hover:bg-slate-700 hover:border-slate-600"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
