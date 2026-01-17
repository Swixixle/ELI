import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCases, useCreateCase, useArchiveCase } from "@/lib/casesApi";
import { Briefcase, Plus, Archive, Folder, ChevronRight, Loader2, Filter, AlertTriangle } from "lucide-react";
import type { Case } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type CaseStatusFilter = "active" | "archived" | "all";
type ArchiveReasonCode = "DUPLICATE" | "ENTERED_IN_ERROR" | "COMPLETED" | "CANCELLED" | "OTHER";

interface CaseSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCase: (caseData: Case) => void;
  currentCaseId?: string | null;
}

export function CaseSelector({ open, onOpenChange, onSelectCase, currentCaseId }: CaseSelectorProps) {
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseName, setNewCaseName] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatusFilter>("active");
  
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveCaseId, setArchiveCaseId] = useState<string | null>(null);
  const [archiveReasonCode, setArchiveReasonCode] = useState<ArchiveReasonCode | null>(null);
  const [archiveReasonNote, setArchiveReasonNote] = useState("");
  
  const { data: cases, isLoading } = useCases(statusFilter);
  const createCase = useCreateCase();
  const archiveCase = useArchiveCase();

  const handleCreateCase = async () => {
    if (!newCaseName.trim()) return;
    
    const newCase = await createCase.mutateAsync({
      name: newCaseName.trim(),
      description: newCaseDescription.trim() || null,
      status: "active"
    });
    
    setNewCaseName("");
    setNewCaseDescription("");
    setShowNewCase(false);
    onSelectCase(newCase);
    onOpenChange(false);
  };

  const handleArchiveClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setArchiveCaseId(id);
    setArchiveReasonCode(null);
    setArchiveReasonNote("");
    setArchiveModalOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveCaseId || !archiveReasonCode) return;
    
    if (archiveReasonCode === "OTHER" && !archiveReasonNote.trim()) {
      return;
    }
    
    try {
      await archiveCase.mutateAsync({
        id: archiveCaseId,
        params: {
          reasonCode: archiveReasonCode,
          reasonNote: archiveReasonNote.trim() || undefined
        }
      });
      setArchiveModalOpen(false);
      setArchiveCaseId(null);
      setArchiveReasonCode(null);
      setArchiveReasonNote("");
    } catch (error) {
      console.error("Archive failed:", error);
    }
  };

  const archivingCase = cases?.find(c => c.id === archiveCaseId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {showNewCase ? "Create New Case" : "Select Case"}
            </DialogTitle>
            <DialogDescription>
              {showNewCase 
                ? "Give your case a name to organize source documents and analysis."
                : "Choose an existing case or create a new one to begin analysis."
              }
            </DialogDescription>
          </DialogHeader>

          {showNewCase ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Case Name</label>
                <Input
                  placeholder="e.g., Q3 2024 Performance Review"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  data-testid="input-case-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  placeholder="Brief description of the case scope"
                  value={newCaseDescription}
                  onChange={(e) => setNewCaseDescription(e.target.value)}
                  data-testid="input-case-description"
                />
              </div>
            </div>
          ) : (
            <div className="py-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CaseStatusFilter)}>
                  <SelectTrigger className="w-[140px]" data-testid="select-case-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Cases</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="all">All Cases</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : cases && cases.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {cases.map((c) => {
                    const isArchived = c.status === "archived";
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectCase(c);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left group",
                          currentCaseId === c.id
                            ? "border-primary bg-primary/5"
                            : isArchived 
                              ? "border-border bg-muted/30 opacity-70"
                              : "border-border hover:border-primary/50 hover:bg-muted/30"
                        )}
                        data-testid={`button-case-${c.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-md flex items-center justify-center",
                            currentCaseId === c.id 
                              ? "bg-primary/20 text-primary" 
                              : isArchived
                                ? "bg-muted text-muted-foreground/50"
                                : "bg-muted text-muted-foreground"
                          )}>
                            <Folder className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {c.name}
                              {isArchived && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                  Archived
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isArchived && c.archivedAt
                                ? `Archived ${format(new Date(c.archivedAt), "MMM d, yyyy")}`
                                : c.description || `Created ${format(new Date(c.createdAt), "MMM d, yyyy")}`
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isArchived && (
                            <button
                              onClick={(e) => handleArchiveClick(e, c.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Archive case"
                              data-testid={`button-archive-case-${c.id}`}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {statusFilter === "archived" 
                      ? "No archived cases" 
                      : statusFilter === "all"
                        ? "No cases yet"
                        : "No active cases"
                    }
                  </p>
                  {statusFilter === "active" && (
                    <p className="text-xs mt-1">Create your first case to get started</p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {showNewCase ? (
              <>
                <Button variant="outline" onClick={() => setShowNewCase(false)}>
                  Back
                </Button>
                <Button 
                  onClick={handleCreateCase} 
                  disabled={!newCaseName.trim() || createCase.isPending}
                  data-testid="button-create-case"
                >
                  {createCase.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Case
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowNewCase(true)} data-testid="button-new-case">
                <Plus className="w-4 h-4 mr-2" />
                New Case
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveModalOpen} onOpenChange={setArchiveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Archive Case
            </DialogTitle>
            <DialogDescription>
              Archiving removes this case from active workflow. It does not delete records.
              All documents and printouts will be preserved and remain accessible.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {archivingCase && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="font-medium text-sm">{archivingCase.name}</div>
                {archivingCase.description && (
                  <div className="text-xs text-muted-foreground mt-1">{archivingCase.description}</div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for archiving</label>
              <Select value={archiveReasonCode || ""} onValueChange={(v) => setArchiveReasonCode(v as ArchiveReasonCode)}>
                <SelectTrigger data-testid="select-archive-reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETED">Completed - Case resolved</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled - No longer needed</SelectItem>
                  <SelectItem value="DUPLICATE">Duplicate - Merged with another case</SelectItem>
                  <SelectItem value="ENTERED_IN_ERROR">Entered in Error</SelectItem>
                  <SelectItem value="OTHER">Other reason</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {archiveReasonCode === "OTHER" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Please specify reason</label>
                <Input
                  placeholder="Enter reason for archiving..."
                  value={archiveReasonNote}
                  onChange={(e) => setArchiveReasonNote(e.target.value)}
                  data-testid="input-archive-note"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={handleArchiveConfirm}
              disabled={
                !archiveReasonCode || 
                (archiveReasonCode === "OTHER" && !archiveReasonNote.trim()) ||
                archiveCase.isPending
              }
              data-testid="button-confirm-archive"
            >
              {archiveCase.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              Archive Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
