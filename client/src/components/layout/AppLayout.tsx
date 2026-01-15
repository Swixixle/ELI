import { Sidebar } from "./Sidebar";
import { DemoBanner } from "./DemoBanner";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <DemoBanner />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
