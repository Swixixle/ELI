import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/shared/Badge";
import { FileText, Upload, Trash2, Calendar, Shield, FolderOpen, ArrowLeft, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Case, CanonDocument } from "@shared/schema";
import { useCases, useCaseDocuments, useCreateCaseDocument, useDeleteCaseDocument } from "@/lib/casesApi";
import { CaseSelector } from "@/components/cases/CaseSelector";
import { useSearch, Link, useLocation } from "wouter";

export default function CanonLibrary() {
  const [isUploading, setIsUploading] = useState(false);
  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<CanonDocument | null>(null);
  const [, navigate] = useLocation();
  
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const caseIdFromUrl = urlParams.get("caseId");
  
  const { data: cases } = useCases();
  const activeCaseId = selectedCase?.id || caseIdFromUrl;
  
  const { data: docs = [], isLoading } = useCaseDocuments(activeCaseId);
  const createDocMutation = useCreateCaseDocument(activeCaseId);
  const deleteDocMutation = useDeleteCaseDocument(activeCaseId);
  
  const activeCase = selectedCase || cases?.find(c => c.id === caseIdFromUrl);

  const handleUpload = () => {
    if (!activeCaseId) {
      setShowCaseSelector(true);
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    
    const timestamp = Date.now();
    createDocMutation.mutate({
      name: `Policy Document ${timestamp}.pdf`,
      size: "1.2 MB",
      type: "pdf",
      version: "v1.0",
      status: "active",
      contentHash: `hash_${timestamp}`,
    }, {
      onSuccess: (newDoc) => {
        setUploadSuccess(newDoc);
        setTimeout(() => {
          navigate(`/canon/document/${newDoc.id}?caseId=${activeCaseId}`);
        }, 1500);
      },
      onError: (error: any) => {
        if (error?.message?.includes("409") || error?.message?.includes("Duplicate")) {
          setUploadError("A document with the same name already exists in this case.");
        } else {
          setUploadError(error?.message || "Failed to upload document. Please try again.");
        }
      },
      onSettled: () => setIsUploading(false)
    });
  };

  const handleOpenDocument = (doc: CanonDocument) => {
    navigate(`/canon/document/${doc.id}?caseId=${activeCaseId}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeCaseId) return;
    deleteDocMutation.mutate(id);
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
      {/* Case Selector Modal */}
      {showCaseSelector && (
        <CaseSelector
          open={showCaseSelector}
          onOpenChange={setShowCaseSelector}
          onSelectCase={(c) => setSelectedCase(c)}
          currentCaseId={activeCaseId}
        />
      )}
      
      <div className="max-w-5xl mx-auto p-8">
        
        {/* No Case Selected State */}
        {!activeCaseId ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Select a Case</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Documents must be bound to a case. Select or create a case to view and upload documents.
            </p>
            <button
              onClick={() => setShowCaseSelector(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-all"
              data-testid="button-select-case"
            >
              <FolderOpen className="w-4 h-4" />
              Select Case
            </button>
          </div>
        ) : (
          <>
            {/* Header with Case Context */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => setShowCaseSelector(true)}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="button-change-case"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {activeCase?.name || "Case"}
                  </button>
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">Case Documents</h1>
                <p className="text-muted-foreground mt-1">Manage source materials for this case.</p>
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

        {/* Upload Status Feedback */}
        {(uploadError || uploadSuccess || isUploading) && (
          <div className="mb-6">
            {isUploading && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-300">Uploading to case: {activeCase?.name}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Processing document...</p>
                </div>
              </div>
            )}
            {uploadSuccess && !isUploading && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-300">Document uploaded successfully</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">Opening "{uploadSuccess.name}"...</p>
                </div>
              </div>
            )}
            {uploadError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-300">Upload failed</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                </div>
              </div>
            )}
          </div>
        )}

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
               <div 
                 key={doc.id} 
                 onClick={() => handleOpenDocument(doc)}
                 className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors group cursor-pointer" 
                 data-testid={`row-document-${doc.id}`}
               >
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground flex items-center gap-2" data-testid={`text-doc-name-${doc.id}`}>
                        {doc.name}
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
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
                     onClick={(e) => handleDelete(doc.id, e)}
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
                 <p className="text-sm">Upload your first document to get started.</p>
               </div>
             )}
           </div>
        </div>
          </>
        )}

      </div>
    </AppLayout>
  );
}
