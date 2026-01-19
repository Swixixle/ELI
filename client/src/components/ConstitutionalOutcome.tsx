import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldX, AlertTriangle } from "lucide-react";
import type { ConstitutionalOutcome, ConstitutionalRefusal, EvaluationData } from "@/lib/constitutionalFetch";

interface ConstitutionalOutcomeRendererProps {
  outcome: ConstitutionalOutcome;
  backHref?: string;
  children?: (data: EvaluationData) => React.ReactNode;
}

function RefusalCard({ refusal }: { refusal: ConstitutionalRefusal }) {
  return (
    <Card data-testid="constitutional-refusal-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ShieldX className="h-5 w-5" />
          Constitutional Refusal
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          {refusal.message || "Evaluation refused by constitutional gate."}
        </p>

        <div className="text-sm space-y-1 p-3 bg-muted rounded-lg">
          {refusal.code && (
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground">Code:</span>
              <code className="text-xs font-mono">{refusal.code}</code>
            </div>
          )}
          {(refusal.governingAxiom || refusal.axiom) && (
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground">Axiom:</span>
              <Badge variant="outline">{refusal.governingAxiom || refusal.axiom}</Badge>
            </div>
          )}
          {refusal.failed_gate && (
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground">Failed Gate:</span>
              <span>{refusal.failed_gate}</span>
            </div>
          )}
        </div>

        {refusal.hint && (
          <div className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Hint:</strong> {refusal.hint}
            </p>
          </div>
        )}

        {Array.isArray(refusal.required_inputs) && refusal.required_inputs.length > 0 && (
          <div className="text-sm">
            <strong className="text-muted-foreground">Required inputs:</strong>
            <ul className="list-disc list-inside mt-1">
              {refusal.required_inputs.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function M5Card({ message }: { message: string }) {
  return (
    <Card data-testid="m5-violation-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ShieldX className="h-5 w-5" />
          Constitutional Violation: M5
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function SystemErrorCard({ message }: { message: string }) {
  return (
    <Card data-testid="system-error-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          System Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-2">
          This is a server or network error, not a governance refusal.
        </p>
      </CardContent>
    </Card>
  );
}

export function ConstitutionalOutcomeRenderer({
  outcome,
  backHref = "/",
  children,
}: ConstitutionalOutcomeRendererProps) {
  if (outcome.kind === "permitted" && children) {
    return <>{children(outcome.data)}</>;
  }

  const renderCard = () => {
    switch (outcome.kind) {
      case "refusal":
        return <RefusalCard refusal={outcome.refusal} />;
      case "m5":
        return <M5Card message={outcome.message} />;
      case "system_error":
        return <SystemErrorCard message={outcome.message} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href={backHref}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>
      {renderCard()}
    </div>
  );
}

export { RefusalCard, M5Card, SystemErrorCard };
