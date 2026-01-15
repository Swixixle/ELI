import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCases, useCreateCase, useDeleteCase } from "@/lib/casesApi";
import { Briefcase, Plus, Trash2, Folder, ChevronRight, Loader2 } from "lucide-react";
import type { Case } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  
  const { data: cases, isLoading } = useCases();
  const createCase = useCreateCase();
  const deleteCase = useDeleteCase();

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

  const handleDeleteCase = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this case and all associated documents?")) {
      deleteCase.mutate(id);
    }
  };

  return (
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : cases && cases.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cases.map((c) => (
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
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    )}
                    data-testid={`button-case-${c.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-md flex items-center justify-center",
                        currentCaseId === c.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <Folder className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.description || `Created ${format(new Date(c.createdAt), "MMM d, yyyy")}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteCase(e, c.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-delete-case-${c.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No cases yet</p>
                <p className="text-xs mt-1">Create your first case to get started</p>
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
  );
}
