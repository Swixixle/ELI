import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/shared/Badge";
import { FileText, ArrowLeft, Calendar, FolderOpen, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearch } from "wouter";
import type { CanonDocument, Case } from "@shared/schema";

export default function DocumentViewer() {
  const params = useParams<{ documentId: string }>();
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const caseId = urlParams.get("caseId");
  
  const { data: document, isLoading: docLoading, error: docError } = useQuery<CanonDocument>({
    queryKey: ["/api/cases", caseId, "documents", params.documentId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/documents/${params.documentId}`);
      if (!res.ok) throw new Error("Document not found");
      return res.json();
    },
    enabled: !!caseId && !!params.documentId,
  });

  const { data: caseData } = useQuery<Case>({
    queryKey: ["/api/cases", caseId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error("Case not found");
      return res.json();
    },
    enabled: !!caseId,
  });

  if (!caseId) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Case Context Required</h2>
            <p className="text-muted-foreground mb-6">This document must be accessed within its case context.</p>
            <Link 
              href="/canon"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to Case Documents
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (docLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (docError || !document) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground mb-6">The requested document could not be loaded.</p>
            <Link 
              href={`/canon?caseId=${caseId}`}
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Case Documents
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link 
            href={`/canon?caseId=${caseId}`}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            data-testid="link-back-to-case"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="w-4 h-4" />
            <span>{caseData?.name || "Case"}</span>
            <span>/</span>
            <span className="text-foreground font-medium">{document.name}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-display font-bold text-foreground" data-testid="text-document-title">
                    {document.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{document.size}</span>
                    <span>•</span>
                    <span>{document.type.toUpperCase()}</span>
                    <span>•</span>
                    <span className="font-mono">{document.version}</span>
                  </div>
                </div>
              </div>
              <Badge 
                variant={document.status === "active" ? "default" : "secondary"}
                className={document.status === "active" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {document.status}
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Case Binding
                </div>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <span className="font-medium">{caseData?.name || caseId}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Uploaded
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(document.uploadedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {document.contentHash && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Content Hash
                </div>
                <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {document.contentHash}
                </code>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Document Content
              </div>
              {document.content ? (
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-[500px] overflow-auto" data-testid="text-document-content">
                  {document.content}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Document content not available for preview.
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    This document has been registered but raw content is not stored.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
