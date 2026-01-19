import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EpistemicTerrainSheet } from "@/components/EpistemicTerrainSheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle, ShieldX, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createEpistemicTerrainSheet,
  validateTerrainSheetInput,
  type TerrainSheetInput,
  type SanitizedSummaryReason,
  type MeasurementEnvelopeInput,
} from "../../../shared/visualSpec";

interface EvaluationResponse {
  measurement?: {
    value: number;
    envelope: MeasurementEnvelopeInput;
  };
  summary?: {
    status: string;
    reason: SanitizedSummaryReason;
  };
  error?: string;
  message?: string;
}

interface AckCheckResponse {
  acknowledged: boolean;
  ack_id?: string;
  intended_use?: string;
  created_at?: string;
  required_intended_use?: string;
  message?: string;
}

interface AckCreateResponse {
  status: string;
  ack_id: string;
  response_id: string;
  measurement_id: string;
  intended_use: string;
  created_at: string;
}

function computeEnvelopeHash(envelope: MeasurementEnvelopeInput): string {
  const serialized = JSON.stringify(envelope);
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

export default function TerrainSheet() {
  const { caseId } = useParams<{ caseId: string }>();
  const queryClient = useQueryClient();
  const [responseId] = useState(() => `resp_${Date.now()}`);

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

  const measurementId = data?.measurement?.envelope?.measurement_id;
  const intendedUse = "constraint_visualization";

  const { data: ackCheck, isLoading: ackCheckLoading } = useQuery<AckCheckResponse>({
    queryKey: ["ack-check", caseId, measurementId, intendedUse],
    queryFn: async () => {
      const res = await fetch(
        `/api/cases/${caseId}/acks/check?measurement_id=${measurementId}&intended_use=${intendedUse}`
      );
      return res.json();
    },
    enabled: !!caseId && !!measurementId,
  });

  const createAck = useMutation({
    mutationFn: async () => {
      if (!data?.measurement?.envelope) throw new Error("No envelope");
      
      const envelopeHash = computeEnvelopeHash(data.measurement.envelope);
      
      const res = await fetch("/api/acks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: responseId,
          measurement_id: measurementId,
          case_id: caseId,
          acknowledged_envelope_hash: envelopeHash,
          intended_use: intendedUse,
          no_prohibited_use_attestation: true,
          acknowledger_agent_id: "terrain_sheet_ui",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create acknowledgment");
      }

      return res.json() as Promise<AckCreateResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ack-check", caseId, measurementId, intendedUse] });
    },
  });

  if (isLoading || ackCheckLoading) {
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

  if (!ackCheck?.acknowledged) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Card data-testid="ack-required-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Acknowledgment Required
            </CardTitle>
            <CardDescription>
              EFX Protocol v0.1 requires explicit acknowledgment before visualization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Measurement ID:</span>
                <code className="text-xs font-mono">{measurementId}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Intended Use:</span>
                <Badge variant="outline">{intendedUse}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Authorized Uses:</span>
                <div className="flex gap-1 flex-wrap">
                  {data.measurement.envelope.authorized_uses.map((use) => (
                    <Badge key={use} variant="secondary" className="text-xs">
                      {use}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                By acknowledging, you attest that you will use this measurement only for 
                <strong> {intendedUse}</strong> and will not use it for any prohibited purposes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Prohibited Uses:</span>
              <div className="flex gap-1 flex-wrap">
                {data.measurement.envelope.prohibited_uses.map((use) => (
                  <Badge key={use} variant="destructive" className="text-xs">
                    {use.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={() => createAck.mutate()}
              disabled={createAck.isPending}
              className="w-full"
              data-testid="acknowledge-button"
            >
              {createAck.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Acknowledgment...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Acknowledge & Proceed
                </>
              )}
            </Button>

            {createAck.isError && (
              <p className="text-sm text-destructive">
                {createAck.error instanceof Error ? createAck.error.message : "Failed to create acknowledgment"}
              </p>
            )}
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
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cases
            </Button>
          </Link>
          <Badge variant="outline" className="text-xs font-mono" data-testid="ack-badge">
            ACK: {ackCheck.ack_id?.slice(0, 8)}...
          </Badge>
        </div>
        <EpistemicTerrainSheet
          data={terrainSheet}
          sanitizedSummary={data.summary}
        />
      </div>
    </div>
  );
}
