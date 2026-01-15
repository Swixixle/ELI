import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Files, 
  Info, 
  LogOut,
  Shield,
  FolderOpen,
  ClipboardList
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { icon: FolderOpen, label: "Cases", href: "/" },
    { icon: Files, label: "Documents", href: "/canon" },
    { icon: ClipboardList, label: "Audit Log", href: "/audit", disabled: true },
    { icon: Info, label: "How It Works", href: "/about" },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
             <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-none tracking-tight">ELI Expert</h1>
            <span className="text-[10px] text-muted-foreground font-mono">SECURE • AUDITABLE</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => (
          item.disabled ? (
            <div
              key={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/40 cursor-not-allowed"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              <Badge variant="outline" className="ml-auto h-4 text-[8px] px-1 py-0 opacity-50">Soon</Badge>
            </div>
          ) : (
            <Link 
              key={item.href} 
              href={item.href} 
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                location === item.href 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        ))}
      </nav>

      {/* Mode Status */}
      <div className="px-4 pb-6">
        <div className="bg-sidebar-accent/50 rounded-lg p-4 border border-sidebar-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sidebar-foreground">System Status</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="space-y-2">
             <div className="flex justify-between text-[10px] text-muted-foreground">
               <span>Canon Version</span>
               <span className="font-mono text-sidebar-foreground">v4.0.1</span>
             </div>
             <div className="flex justify-between text-[10px] text-muted-foreground">
               <span>Boundaries</span>
               <Badge variant="outline" className="h-4 text-[9px] px-1 py-0">ACTIVE</Badge>
             </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <button className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
          <LogOut className="w-3 h-3" />
          <span>Secure Sign Out</span>
        </button>
      </div>
    </div>
  );
}
