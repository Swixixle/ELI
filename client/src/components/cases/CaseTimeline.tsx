import { useState, useEffect } from "react";
import { format } from "date-fns";
import { FileText, FolderPlus, Clock, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Case, CanonDocument } from "@shared/schema";

interface TimelineEvent {
  id: string;
  type: "case_created" | "document_uploaded";
  timestamp: Date;
  label: string;
  detail?: string;
}

interface CaseTimelineProps {
  caseData: Case;
  className?: string;
}

export function CaseTimeline({ caseData, className }: CaseTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [documents, setDocuments] = useState<CanonDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch(`/api/cases/${caseData.id}/documents`);
        if (res.ok) {
          const docs = await res.json();
          setDocuments(docs);
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [caseData.id]);

  const caseCreatedEvent: TimelineEvent = {
    id: "case-created",
    type: "case_created",
    timestamp: new Date(caseData.createdAt),
    label: "Case created",
    detail: caseData.name
  };

  const documentEvents: TimelineEvent[] = documents.map((doc) => ({
    id: doc.id,
    type: "document_uploaded" as const,
    timestamp: new Date(doc.uploadedAt),
    label: "Document uploaded",
    detail: doc.name
  }));

  const events: TimelineEvent[] = [caseCreatedEvent, ...documentEvents]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const recentEvents = isExpanded ? events : events.slice(-3);

  return (
    <div className={cn("bg-muted/30 border border-border rounded-lg", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        data-testid="btn-toggle-timeline"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Case Timeline
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <div className={cn("px-3 pb-3", !isExpanded && "max-h-[120px] overflow-hidden")}>
        {loading ? (
          <div className="text-xs text-muted-foreground py-2">Loading timeline...</div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event, idx) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    event.type === "case_created" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  )}>
                    {event.type === "case_created" ? (
                      <FolderPlus className="w-3 h-3" />
                    ) : (
                      <FileText className="w-3 h-3" />
                    )}
                  </div>
                  {idx < recentEvents.length - 1 && (
                    <div className="w-px h-4 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-foreground truncate">
                      {event.label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                      {format(event.timestamp, "MMM d, HH:mm")}
                    </span>
                  </div>
                  {event.detail && (
                    <span className="text-[11px] text-muted-foreground truncate block">
                      {event.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isExpanded && events.length > 3 && (
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground">
              +{events.length - 3} more events
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface DocumentsConsideredProps {
  caseData: Case;
  className?: string;
}

export function DocumentsConsidered({ caseData, className }: DocumentsConsideredProps) {
  const [documents, setDocuments] = useState<CanonDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch(`/api/cases/${caseData.id}/documents`);
        if (res.ok) {
          const docs = await res.json();
          setDocuments(docs);
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [caseData.id]);

  if (loading) {
    return (
      <div className={cn("bg-muted/30 border border-border rounded-lg p-3", className)}>
        <span className="text-xs text-muted-foreground">Loading documents...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={cn("bg-muted/30 border border-border rounded-lg p-3", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Documents Considered</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          No documents uploaded yet. Upload documents to this case for the engine to consider.
        </p>
      </div>
    );
  }

  const displayDocs = isExpanded ? documents : documents.slice(0, 3);

  return (
    <div className={cn("bg-muted/30 border border-border rounded-lg", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        data-testid="btn-toggle-documents"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Documents Considered
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {documents.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <div className="px-3 pb-3">
        <div className="space-y-1.5">
          {displayDocs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 text-xs">
              <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-foreground truncate flex-1">{doc.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {doc.version}
              </span>
            </div>
          ))}
        </div>

        {!isExpanded && documents.length > 3 && (
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground">
              +{documents.length - 3} more documents
            </span>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground italic">
            The engine is grounded in these sources. It cannot reference documents outside this list.
          </p>
        </div>
      </div>
    </div>
  );
}
