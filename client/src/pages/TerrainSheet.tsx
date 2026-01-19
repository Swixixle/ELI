import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { EpistemicTerrainSheet } from "@/components/EpistemicTerrainSheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle, ShieldX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createEpistemicTerrainSheet,
  validateTerrainSheetInput,
  type TerrainSheetInput,
  type SanitizedSummary,
  type MeasurementEnvelopeInput,
} from "../../../shared/visualSpec";

interface EvaluationResponse {
  measurement?: {
    value: number;
    envelope: MeasurementEnvelopeInput;
  };
  summary?: SanitizedSummary;
  error?: string;
  message?: string;
}

export default function TerrainSheet() {
  const { caseId } = useParams<{ caseId: string }>();

  const { data, isLoading, error } = useQuery<EvaluationResponse>({
    queryKey: ["terrain-sheet", caseId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constraints: {
            timePressure: "moderate",
            workload: "normal",
            guidelineCoherence: "clear",
            irreversibility: "moderate",
          },
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || responseData.error || "Evaluation failed");
      }

      return responseData;
    },
    enabled: !!caseId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Constitutional Refusal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Unable to generate terrain sheet. Gate refused evaluation."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.measurement?.envelope || !data?.summary) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldX className="h-5 w-5" />
              Constitutional Violation: M5
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No measurement envelope present. Rendering refused per AXIOM M5: measurements cannot exist without their envelope.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const terrainInput: TerrainSheetInput = {
    envelope: data.measurement.envelope,
    value: data.measurement.value,
    summary: data.summary,
  };

  const validation = validateTerrainSheetInput(terrainInput);
  if (!validation.valid) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldX className="h-5 w-5" />
              Constitutional Validation Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground">
              The measurement data failed constitutional validation. Rendering refused.
            </p>
            <ul className="list-disc list-inside text-sm text-destructive">
              {validation.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  const terrainSheet = createEpistemicTerrainSheet(terrainInput);
  if (!terrainSheet) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldX className="h-5 w-5" />
              Terrain Sheet Creation Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Failed to create epistemic terrain sheet from validated input.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cases
          </Button>
        </Link>
        <EpistemicTerrainSheet
          data={terrainSheet}
          sanitizedSummary={data.summary}
        />
      </div>
    </div>
  );
}
