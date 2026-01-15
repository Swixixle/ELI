import { Citation } from "@/lib/types";
import { Badge } from "@/components/shared/Badge";
import { FileText, Database, Calendar } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface CitationCardProps {
  citation: Citation;
}

export function CitationCard({ citation }: CitationCardProps) {
  const isCanon = citation.sourceType === "private_canon";

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="inline-flex items-center gap-1.5 px-2 py-0.5 ml-1 my-0.5 text-xs font-medium rounded-sm bg-accent/10 hover:bg-accent/20 text-accent-foreground border border-accent/20 transition-colors cursor-pointer select-none">
          {isCanon ? <FileText className="w-3 h-3" /> : <Database className="w-3 h-3" />}
          <span className="font-mono">[{citation.id.toUpperCase()}]</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 overflow-hidden shadow-xl border-accent/20">
        <div className="bg-accent/10 px-4 py-2 border-b border-accent/10 flex items-center justify-between">
          <Badge variant={isCanon ? "canon" : "dataset"} className="text-[10px] uppercase tracking-wider">
            {isCanon ? "Canon Verified" : "Public Source"}
          </Badge>
          {citation.version && <span className="text-xs text-muted-foreground font-mono">{citation.version}</span>}
        </div>
        <div className="p-4 space-y-3 bg-card">
          <div>
            <h4 className="font-display font-semibold text-sm leading-tight text-foreground mb-1">
              {citation.title}
            </h4>
            {citation.section && (
              <p className="text-xs text-muted-foreground">
                Section: <span className="font-medium text-foreground">{citation.section}</span>
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="font-mono">{citation.date}</span>
            {citation.url && (
              <a href={citation.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-primary hover:underline">
                View Source ↗
              </a>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
