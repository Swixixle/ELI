import { Message, Citation, IPSafetyFlag } from "@/lib/types";
import { CitationCard } from "./CitationCard";
import { CalculationProof } from "./CalculationProof";
import { AlertTriangle, ShieldAlert, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/Badge";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasParrotBox = message.ipFlags?.some(f => f.type === "parrot_box");

  return (
    <div className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%]", isUser ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm" : "w-full")}>
        
        {/* Assistant Header */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">ELI Expert</span>
            <span className="text-[10px] text-muted-foreground/50 font-mono">v4.0.1</span>
          </div>
        )}

        {/* Content Body */}
        <div className={cn("prose prose-sm max-w-none break-words", isUser ? "text-primary-foreground prose-invert" : "text-foreground")}>
          {hasParrotBox ? (
             <div className="border-l-4 border-destructive bg-destructive/5 p-4 rounded-r-md">
               <div className="flex items-center gap-2 text-destructive font-bold mb-2">
                 <ShieldAlert className="w-5 h-5" />
                 <span>Epistemic Refusal</span>
               </div>
               <p className="text-destructive-foreground text-sm font-medium whitespace-pre-wrap leading-relaxed">
                 {message.content}
               </p>
             </div>
          ) : (
            <div className="whitespace-pre-wrap leading-relaxed">
              {message.content.split(/(\[CITATION:[^\]]+\])/).map((part, i) => {
                 // Simple parser to inject citation cards if we were using raw text tags, 
                 // but currently we just append citations at the end or assume the text is clean.
                 // For this mock, we'll just render the text.
                 return part;
              })}
            </div>
          )}
        </div>

        {/* Citations Footer */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-1">Sources:</span>
            {message.citations.map((c) => (
              <CitationCard key={c.id} citation={c} />
            ))}
          </div>
        )}

        {/* Calculation Proof */}
        {!isUser && message.calcProof && (
          <CalculationProof proof={message.calcProof} />
        )}

        {/* IP Safety Flags (Visual Indicators) */}
        {!isUser && message.ipFlags && message.ipFlags.length > 0 && !hasParrotBox && (
          <div className="mt-3 flex gap-2">
            {message.ipFlags.map((flag, idx) => (
              <div key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-orange-50 text-orange-800 text-xs border border-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800">
                <AlertTriangle className="w-3 h-3" />
                <span>{flag.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Visual Spec Placeholder (e.g. Table/Slider) */}
        {!isUser && message.visualSpec && (
          <div className="mt-4 p-4 border rounded bg-card shadow-sm">
             <div className="text-xs font-semibold text-muted-foreground uppercase mb-3 border-b pb-2">
               {message.visualSpec.type === "cfo_table" ? "Comparative Analysis" : "Sensitivity Model"}
             </div>
             {/* Mock rendering of visuals */}
             {message.visualSpec.type === "cfo_table" && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left">
                      {message.visualSpec.data.headers.map((h: string) => <th key={h} className="pb-2 font-medium text-muted-foreground">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {message.visualSpec.data.rows.map((row: string[], idx: number) => (
                      <tr key={idx} className="border-b border-border/50 last:border-0">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className={cn("py-2", cIdx === 0 ? "font-medium text-foreground" : "font-mono text-muted-foreground")}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
             
             {message.visualSpec.type === "sensitivity_slider" && (
               <div className="py-4">
                 <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
                   <span>{message.visualSpec.data.min.toLocaleString()}</span>
                   <span>{message.visualSpec.data.max.toLocaleString()}</span>
                 </div>
                 <div className="h-2 bg-muted rounded-full relative overflow-hidden">
                   {/* Target Zone */}
                   <div 
                      className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/50"
                      style={{ 
                        left: "20%", 
                        width: "60%" 
                      }} 
                   />
                   {/* Indicator */}
                   <div 
                      className="absolute top-0 bottom-0 w-1 bg-primary z-10" 
                      style={{ left: "50%" }}
                   />
                 </div>
                 <div className="mt-2 text-center">
                   <span className="text-sm font-bold text-foreground">{message.visualSpec.data.current.toLocaleString()}</span>
                   <p className="text-xs text-muted-foreground">{message.visualSpec.data.label}</p>
                 </div>
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
}
