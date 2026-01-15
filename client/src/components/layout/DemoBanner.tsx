import { Shield, Lock } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="bg-slate-900 text-white px-4 py-2.5 text-center border-b border-slate-700">
      <div className="flex items-center justify-center gap-3 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium">
            Proof-of-Process Demonstration
          </span>
        </div>
        <span className="text-slate-400 hidden sm:inline">|</span>
        <span className="text-xs text-slate-400 hidden sm:inline">
          This is an operational demonstration of a procedural evaluation standard — not a consumer product.
        </span>
        <div className="flex items-center gap-1.5 ml-2">
          <Lock className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-slate-500">Access by invitation</span>
        </div>
      </div>
    </div>
  );
}
