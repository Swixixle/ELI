import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Clock, 
  Users, 
  BookOpen, 
  Gauge,
  ArrowRight,
  Scale,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProceduralEquationProps {
  satisfied?: number;
  className?: string;
  compact?: boolean;
}

const PREREQUISITES = [
  { id: "DT", name: "Decision Target", icon: Target, question: "What ruling is requested?" },
  { id: "TV", name: "Temporal Verification", icon: Clock, question: "When was the decision made?" },
  { id: "IV", name: "Independent Verification", icon: Users, question: "Is there third-party corroboration?" },
  { id: "PA", name: "Policy Application", icon: BookOpen, question: "How was policy applied?" },
  { id: "CC", name: "Contextual Constraints", icon: Gauge, question: "What constraints existed?" },
];

const THRESHOLDS = [
  { min: 0, max: 2, label: "Advisory Only", risk: "unsafe", color: "text-red-600 bg-red-50 border-red-200" },
  { min: 3, max: 3, label: "Permitted", risk: "high", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { min: 4, max: 4, label: "Defensible", risk: "medium", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { min: 5, max: 5, label: "Regulator-Ready", risk: "low", color: "text-green-600 bg-green-50 border-green-200" },
];

export function ProceduralEquation({ satisfied = 0, className, compact = false }: ProceduralEquationProps) {
  const currentThreshold = THRESHOLDS.find(t => satisfied >= t.min && satisfied <= t.max) || THRESHOLDS[0];

  if (compact) {
    return (
      <div className={cn("p-4 bg-muted/30 rounded-lg border", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">ELI Procedural Equation</span>
        </div>
        <div className="font-mono text-xs bg-background p-3 rounded border mb-3 text-center">
          Jurisdiction = DT + TV + IV + PA + CC
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center mb-3">
          {PREREQUISITES.map((p, i) => (
            <Badge 
              key={p.id} 
              variant="outline" 
              className={cn(
                "text-xs",
                i < satisfied ? "bg-green-50 border-green-300 text-green-700" : ""
              )}
            >
              {p.id}
            </Badge>
          ))}
        </div>
        <div className="text-center">
          <span className={cn("text-xs font-medium px-2 py-1 rounded border", currentThreshold.color)}>
            {satisfied}/5 → {currentThreshold.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">ELI Procedural Equation</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          The minimum structural basis for defensible procedural evaluation
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">
            Jurisdiction Formula
          </p>
          <div className="font-mono text-lg font-semibold text-foreground">
            J = DT + TV + IV + PA + CC
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Where J ≥ 3 permits procedural review
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            5 Procedural Prerequisites
          </p>
          <div className="grid gap-2">
            {PREREQUISITES.map((prereq, index) => {
              const Icon = prereq.icon;
              const isSatisfied = index < satisfied;
              return (
                <div 
                  key={prereq.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
                    isSatisfied 
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" 
                      : "bg-muted/30 border-border"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded font-mono text-xs font-bold",
                    isSatisfied 
                      ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {prereq.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className={cn(
                        "w-4 h-4",
                        isSatisfied ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      )} />
                      <span className="text-sm font-medium">{prereq.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{prereq.question}</p>
                  </div>
                  {isSatisfied && (
                    <Badge variant="default" className="bg-green-500 text-xs">✓</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Threshold Policy
          </p>
          <div className="grid gap-2">
            {THRESHOLDS.map((threshold) => {
              const range = threshold.min === threshold.max 
                ? threshold.min.toString() 
                : `${threshold.min}-${threshold.max}`;
              const isActive = satisfied >= threshold.min && satisfied <= threshold.max;
              return (
                <div 
                  key={threshold.label}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border transition-all",
                    isActive ? threshold.color + " ring-2 ring-offset-1" : "bg-muted/20 border-border opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold w-8">{range}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{threshold.label}</span>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", isActive ? "" : "opacity-50")}>
                    {threshold.risk} risk
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <p className="font-medium">This is jurisdiction, not judgment.</p>
              <p>Like a court determining "we can hear this case" — not "we've ruled."</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
