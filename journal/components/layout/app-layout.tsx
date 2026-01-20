import { Sidebar } from "./sidebar";

export function AppLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
