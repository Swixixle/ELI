import type { MeasurementEnvelopeInput, SanitizedSummaryReason } from "../../../shared/visualSpec";

export interface ConstitutionalRefusal {
  error: string;
  code?: string;
  axiom?: string;
  governingAxiom?: string;
  message?: string;
  hint?: string;
  failed_gate?: string;
  required_inputs?: string[];
  evaluationBlocked?: boolean;
}

export interface EvaluationData {
  measurement?: {
    value: number;
    envelope: MeasurementEnvelopeInput;
  };
  summary?: {
    status: string;
    reason: SanitizedSummaryReason;
  };
}

export type ConstitutionalOutcome =
  | { kind: "permitted"; data: EvaluationData }
  | { kind: "refusal"; refusal: ConstitutionalRefusal }
  | { kind: "m5"; message: string }
  | { kind: "system_error"; message: string };

export async function constitutionalFetchEvaluate(
  caseId: string,
  constraints?: Record<string, string>
): Promise<ConstitutionalOutcome> {
  try {
    const res = await fetch(`/api/cases/${caseId}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        constraints: constraints ?? {
          timePressure: "moderate",
          workload: "normal",
          guidelineCoherence: "clear",
          irreversibility: "moderate",
        },
      }),
    });

    let responseData: any;
    try {
      responseData = await res.json();
    } catch {
      return {
        kind: "system_error",
        message: "Server returned invalid response format",
      };
    }

    if (!res.ok) {
      if (
        res.status === 403 &&
        (responseData.error === "CONSTITUTIONAL_REFUSAL" ||
          responseData.code ||
          responseData.axiom ||
          responseData.governingAxiom ||
          responseData.evaluationBlocked)
      ) {
        return {
          kind: "refusal",
          refusal: responseData as ConstitutionalRefusal,
        };
      }

      return {
        kind: "system_error",
        message: responseData.message || responseData.error || `Request failed (${res.status})`,
      };
    }

    if (!responseData.measurement?.envelope) {
      return {
        kind: "m5",
        message: "No measurement envelope present. Rendering refused per AXIOM M5: measurements cannot exist without their envelope.",
      };
    }

    if (!responseData.summary) {
      return {
        kind: "m5",
        message: "No sanitized summary present. Envelope integrity cannot be verified.",
      };
    }

    return {
      kind: "permitted",
      data: responseData as EvaluationData,
    };
  } catch (err) {
    return {
      kind: "system_error",
      message: err instanceof Error ? err.message : "Network error occurred",
    };
  }
}
