import { AppLayout } from "@/components/layout/AppLayout";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Shield, FileText, CheckCircle, AlertTriangle, Clock, Hash, Lock, Printer, ArrowLeft, Calendar, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PrintoutData {
  id: string;
  caseId: string;
  determinationId: string;
  printoutNumber: number;
  title: string;
  renderedContent: {
    printoutVersion: string;
    printoutNumber: number;
    issuedAt: string;
    caseInfo: {
      id: string;
      name: string;
      description: string | null;
      phase: string;
      decisionTarget: string | null;
      decisionTime: string | null;
    };
    determination: {
      id: string;
      status: string;
      canonVersion: string;
      createdAt: string;
    };
    receipt: Record<string, unknown>;
    evidence: {
      documents: Array<{
        id: string;
        name: string;
        type: string;
        version: string;
        contentHash: string | null;
        uploadedAt: string;
      }>;
      events: Array<{
        id: string;
        type: string;
        description: string;
        eventTime: string;
      }>;
      documentCount: number;
      eventCount: number;
    };
    checklist: Record<string, { met: boolean; evidence?: string[] }>;
    summary: {
      status: string;
      conditionsMet: number;
      conditionsTotal: number;
      reviewPermitted: boolean;
      proceduralNote: string;
    };
  };
  summary: string;
  prerequisitesMet: number;
  prerequisitesTotal: number;
  admissibilityStatus: string;
  caseStateHash: string;
  contentHash: string;
  signatureB64: string;
  publicKeyId: string;
  issuedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    REVIEW_PERMITTED: { color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="w-3 h-3" />, label: "Review Permitted" },
    REVIEW_NOT_PERMITTED: { color: "bg-red-100 text-red-800 border-red-200", icon: <AlertTriangle className="w-3 h-3" />, label: "Review Not Permitted" },
    ADVISORY_ONLY: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: <AlertTriangle className="w-3 h-3" />, label: "Advisory Only" },
    PROCEDURAL_RISK_HIGH: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: <AlertTriangle className="w-3 h-3" />, label: "Procedural Risk High" },
  };
  
  const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800 border-gray-200", icon: <FileText className="w-3 h-3" />, label: status };
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border", config.color)}>
      {config.icon}
      {config.label}
    </span>
  );
}

function PrerequisiteRow({ name, met, evidence }: { name: string; met: boolean; evidence?: string[] }) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border",
      met ? "bg-green-50/50 border-green-200" : "bg-red-50/50 border-red-200"
    )}>
      <div className={cn(
        "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5",
        met ? "bg-green-500 text-white" : "bg-red-200 text-red-600"
      )}>
        {met ? <CheckCircle className="w-3 h-3" /> : <span className="text-xs font-bold">!</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", met ? "text-green-900" : "text-red-900")}>
          {name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
        </p>
        {evidence && evidence.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">{evidence.join(", ")}</p>
        )}
      </div>
    </div>
  );
}

export default function PrintoutView() {
  const { caseId, printoutId } = useParams<{ caseId: string; printoutId: string }>();
  const [, navigate] = useLocation();

  const { data: printout, isLoading, error } = useQuery<PrintoutData>({
    queryKey: ["printout", caseId, printoutId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/printouts/${printoutId}`);
      if (!res.ok) throw new Error("Failed to load printout");
      return res.json();
    },
    enabled: !!caseId && !!printoutId,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading printout...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !printout) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Printout Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested judgment record could not be loaded.</p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              data-testid="button-go-home"
            >
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const content = printout.renderedContent;
  const checklistEntries = Object.entries(content.checklist || {});

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            data-testid="button-print"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>

        <div className="bg-white dark:bg-card border rounded-xl shadow-sm print:shadow-none print:border-0">
          <div className="border-b p-6 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold font-display">{printout.title}</h1>
                    <p className="text-sm text-muted-foreground">
                      Judgment #{printout.printoutNumber} for {content.caseInfo.name}
                    </p>
                  </div>
                </div>
              </div>
              <StatusBadge status={printout.admissibilityStatus} />
            </div>

            <div className="flex items-center gap-1.5 mt-4 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Immutable Record — This judgment cannot be modified or deleted
              </span>
            </div>
          </div>

          <div className="p-6 space-y-8">
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Judgment Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Issued At</p>
                  <p className="font-mono text-sm">{format(new Date(printout.issuedAt), "PPpp")}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Canon Version</p>
                  <p className="font-mono text-sm">v{content.determination.canonVersion}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Decision Target</p>
                  <p className="text-sm">{content.caseInfo.decisionTarget || "Not specified"}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Decision Time</p>
                  <p className="font-mono text-sm">
                    {content.caseInfo.decisionTime ? format(new Date(content.caseInfo.decisionTime), "PPpp") : "Not set"}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Procedural Prerequisites ({printout.prerequisitesMet}/{printout.prerequisitesTotal})
              </h2>
              <div className="space-y-2">
                {checklistEntries.map(([key, value]) => (
                  <PrerequisiteRow
                    key={key}
                    name={key}
                    met={(value as { met: boolean }).met}
                    evidence={(value as { evidence?: string[] }).evidence}
                  />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Evidence Considered
              </h2>
              <div className="grid gap-2">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Documents</span>
                  <span className="text-sm font-mono">{content.evidence.documentCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Timeline Events</span>
                  <span className="text-sm font-mono">{content.evidence.eventCount}</span>
                </div>
              </div>
              {content.evidence.documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {content.evidence.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-2 text-xs font-mono bg-background border rounded">
                      <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate flex-1">{doc.name}</span>
                      {doc.contentHash && (
                        <span className="text-muted-foreground truncate max-w-[100px]" title={doc.contentHash}>
                          {doc.contentHash.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="border-t pt-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Cryptographic Verification
              </h2>
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-muted/30 rounded-lg overflow-x-auto">
                  <p className="text-muted-foreground mb-1">Case State Hash (SHA-256)</p>
                  <p className="break-all">{printout.caseStateHash}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg overflow-x-auto">
                  <p className="text-muted-foreground mb-1">Content Hash (SHA-256)</p>
                  <p className="break-all">{printout.contentHash}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg overflow-x-auto">
                  <p className="text-muted-foreground mb-1">Signature (Ed25519)</p>
                  <p className="break-all">{printout.signatureB64.substring(0, 64)}...</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground mb-1">Public Key ID</p>
                  <p>{printout.publicKeyId}</p>
                </div>
              </div>
            </section>

            <section className="border-t pt-6 text-center text-xs text-muted-foreground">
              <p>This is an official judgment record issued by ELI Imaging v{content.printoutVersion}</p>
              <p className="mt-1">Determination ID: {printout.determinationId}</p>
              <p className="mt-1">Printout ID: {printout.id}</p>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
