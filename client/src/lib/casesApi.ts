import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Case, InsertCase, CanonDocument, CaseOverview } from "@shared/schema";

type CaseStatusFilter = "active" | "archived" | "all";
type CaseOriginFilter = "UPLOADED_BY_USER" | "SAMPLE_LIBRARY" | "IMPORTED";

async function fetchCases(status: CaseStatusFilter = "active", origin?: CaseOriginFilter): Promise<Case[]> {
  const params = new URLSearchParams({ status });
  if (origin) params.append("origin", origin);
  const res = await fetch(`/api/cases?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
}

async function fetchCase(id: string): Promise<Case> {
  const res = await fetch(`/api/cases/${id}`);
  if (!res.ok) throw new Error("Failed to fetch case");
  return res.json();
}

async function createCase(data: InsertCase): Promise<Case> {
  const res = await fetch("/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to create case");
  return res.json();
}

async function updateCase(id: string, data: Partial<InsertCase>): Promise<Case> {
  const res = await fetch(`/api/cases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to update case");
  return res.json();
}

interface ArchiveCaseParams {
  reasonCode: "DUPLICATE" | "ENTERED_IN_ERROR" | "COMPLETED" | "CANCELLED";
}

interface ArchiveCaseResult {
  id: string;
  status: string;
  archivedAt: string;
  archivedBy: string;
  archiveReasonCode: string;
}

async function archiveCase(id: string, params: ArchiveCaseParams): Promise<ArchiveCaseResult> {
  const res = await fetch(`/api/cases/${id}/archive`, { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to archive case" }));
    throw new Error(error.error || "Failed to archive case");
  }
  return res.json();
}

async function fetchCaseDocuments(caseId: string): Promise<CanonDocument[]> {
  const res = await fetch(`/api/cases/${caseId}/documents`);
  if (!res.ok) throw new Error("Failed to fetch case documents");
  return res.json();
}

async function fetchCaseOverview(caseId: string): Promise<CaseOverview> {
  const res = await fetch(`/api/cases/${caseId}/overview`);
  if (!res.ok) throw new Error("Failed to fetch case overview");
  return res.json();
}

export function useCases(status: CaseStatusFilter = "active", origin?: CaseOriginFilter) {
  return useQuery({ 
    queryKey: ["cases", status, origin], 
    queryFn: () => fetchCases(status, origin) 
  });
}

export function useCase(id: string | null) {
  return useQuery({
    queryKey: ["cases", id],
    queryFn: () => fetchCase(id!),
    enabled: !!id
  });
}

export function useCaseDocuments(caseId: string | null) {
  return useQuery({
    queryKey: ["cases", caseId, "documents"],
    queryFn: () => fetchCaseDocuments(caseId!),
    enabled: !!caseId
  });
}

export function useCaseOverview(caseId: string | null) {
  return useQuery({
    queryKey: ["cases", caseId, "overview"],
    queryFn: () => fetchCaseOverview(caseId!),
    enabled: !!caseId
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cases"] })
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertCase> }) => updateCase(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cases"] })
  });
}

export function useArchiveCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: ArchiveCaseParams }) => archiveCase(id, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cases"] })
  });
}

type CreateDocumentData = { 
  name: string; 
  size: string; 
  type: string; 
  version: string; 
  status?: string;
  content?: string;
  contentHash?: string;
};

async function createCaseDocument(caseId: string, doc: CreateDocumentData): Promise<CanonDocument> {
  const res = await fetch(`/api/cases/${caseId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new Error(`409: ${errorData.message || "Duplicate document detected"}`);
    }
    throw new Error(errorData.error || "Failed to create document");
  }
  return res.json();
}

export function useCreateCaseDocument(caseId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (doc: CreateDocumentData) => 
      createCaseDocument(caseId!, doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases", caseId, "documents"] });
    }
  });
}

async function deleteCaseDocument(caseId: string, docId: string): Promise<void> {
  const res = await fetch(`/api/cases/${caseId}/documents/${docId}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export function useDeleteCaseDocument(caseId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deleteCaseDocument(caseId!, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases", caseId, "documents"] });
    }
  });
}

interface EvaluationResult {
  status: string;
  canonVersion: string;
  prerequisites: Record<string, boolean>;
  prerequisitesMet: number;
  prerequisitesTotal: number;
  riskTier: string;
  reviewPermission: string;
  evaluatedAt: string;
}

async function evaluateCase(caseId: string): Promise<EvaluationResult> {
  const res = await fetch(`/api/cases/${caseId}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Evaluation failed");
  }
  return res.json();
}

export function useEvaluateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => evaluateCase(caseId),
    onSuccess: (_data, caseId) => {
      queryClient.invalidateQueries({ queryKey: ["cases", caseId, "overview"] });
    }
  });
}
