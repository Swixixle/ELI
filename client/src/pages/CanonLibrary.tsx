import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/shared/Badge";
import { FileText, Upload, Trash2, Calendar, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CanonDocument } from "@shared/schema";

export default function CanonLibrary() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  // Fetch all documents
  const { data: docs = [], isLoading } = useQuery<CanonDocument[]>({
    queryKey: ["/api/canon"],
  });

  // Create document mutation
  const createMutation = useMutation({
    mutationFn: async (doc: Omit<CanonDocument, "id" | "uploadedAt">) => {
      const response = await fetch("/api/canon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      if (!response.ok) throw new Error("Failed to create document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canon"] });
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/canon/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canon"] });
    },
  });

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      createMutation.mutate({
        name: "New Policy Document.pdf",
        size: "1.2 MB",
        type: "pdf",
        version: "v1.0",
        status: "active",
      });
      setIsUploading(false);
    }, 1000);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading canon library...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Canon Library</h1>
            <p className="text-muted-foreground mt-1">Manage the authoritative documents that ground the Expert System.</p>
          </div>
          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-all shadow-sm font-medium text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            data-testid="button-upload-document"
          >
            {isUploading ? (
              <>
                 <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                 <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </>
            )}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
             <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
               <FileText className="w-4 h-4" /> Total Documents
             </div>
             <div className="text-2xl font-mono font-bold" data-testid="text-total-documents">{docs.length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
             <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
               <Shield className="w-4 h-4" /> Verification Status
             </div>
             <div className="text-2xl font-mono font-bold text-emerald-600">Active</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
             <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
               <Calendar className="w-4 h-4" /> Last Update
             </div>
             <div className="text-2xl font-mono font-bold">Today</div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
           <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
             <span>Document Name</span>
             <span>Version</span>
             <span>Date Added</span>
             <span>Status</span>
             <span className="text-right">Actions</span>
           </div>
           
           <div className="divide-y divide-border">
             {docs.map(doc => (
               <div key={doc.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-muted/10 transition-colors group" data-testid={`row-document-${doc.id}`}>
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground" data-testid={`text-doc-name-${doc.id}`}>{doc.name}</div>
                      <div className="text-xs text-muted-foreground">{doc.size} • {doc.type.toUpperCase()}</div>
                    </div>
                 </div>
                 
                 <div className="font-mono text-xs text-muted-foreground">{doc.version}</div>
                 
                 <div className="text-sm text-muted-foreground">{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                 
                 <div>
                   <Badge variant={doc.status === "active" ? "default" : "secondary"} className={cn(
                     "text-[10px] uppercase",
                     doc.status === "active" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200" : ""
                   )}>
                     {doc.status}
                   </Badge>
                 </div>
                 
                 <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => handleDelete(doc.id)}
                     className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                     data-testid={`button-delete-${doc.id}`}
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               </div>
             ))}

             {docs.length === 0 && (
               <div className="p-12 text-center text-muted-foreground">
                 <Upload className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                 <h3 className="text-lg font-medium text-foreground mb-1">No documents found</h3>
                 <p className="text-sm">Upload your first canon document to get started.</p>
               </div>
             )}
           </div>
        </div>

      </div>
    </AppLayout>
  );
}
