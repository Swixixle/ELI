import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Sidebar />
      <main className="pl-64 min-h-screen transition-all duration-200">
        {children}
      </main>
    </div>
  );
}
