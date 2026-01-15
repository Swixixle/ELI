import { CalcProof } from "@/lib/types";
import { Calculator, ChevronDown, Lock, ShieldCheck } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/Badge";

interface CalculationProofProps {
  proof: CalcProof;
}

export function CalculationProof({ proof }: CalculationProofProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 border rounded-md border-border bg-card overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verifiable Computation Proof</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-mono text-xs">{isOpen ? "Hide Steps" : "Show Math"}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 space-y-4">
            {/* Inputs Section */}
            <div className="bg-muted/30 rounded-md p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <Database className="w-3 h-3" /> Inputs
              </h4>
              <div className="space-y-1">
                {proof.inputs.map((input, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-foreground/80">{input.label}</span>
                    <div className="flex items-center gap-2">
                      {input.value.includes("SEALED") ? (
                         <Badge variant="sealed" className="h-5">
                           <Lock className="w-2 h-2 mr-1" /> IP SEALED
                         </Badge>
                      ) : (
                        <span className="font-mono text-foreground font-medium">{input.value}</span>
                      )}
                      {input.sourceRef && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">[{input.sourceRef.toUpperCase()}]</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps Section */}
            <div className="relative pl-2 ml-1 border-l-2 border-muted space-y-4">
              {proof.steps.map((step, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[13px] top-1.5 w-2 h-2 rounded-full bg-border group-hover:bg-primary transition-colors" />
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-foreground">{step.description}</span>
                    </div>
                    <div className="flex justify-between items-baseline font-mono text-xs bg-muted/50 p-2 rounded">
                      <span className="text-muted-foreground">{step.operation}</span>
                      <span className="font-bold text-primary ml-4">= {step.result}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Final Result & Sensitivity */}
            <div className="mt-4 pt-4 border-t border-dashed border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-foreground">Final Result</span>
                <span className="font-mono text-lg font-bold text-primary">{proof.finalResult}</span>
              </div>
              {proof.sensitivityNote && (
                 <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-blue-800 dark:text-blue-200">
                   <div className="mt-0.5"><Calculator className="w-3 h-3" /></div>
                   {proof.sensitivityNote}
                 </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

import { Database } from "lucide-react";
