import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Case, InsertCase, CanonDocument, CaseOverview } from "@shared/schema";

async function fetchCases(): Promise<Case[]> {
  const res = await fetch("/api/cases");
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

async function deleteCase(id: string): Promise<void> {
  const res = await fetch(`/api/cases/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete case");
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

export function useCases() {
  return useQuery({ queryKey: ["cases"], queryFn: fetchCases });
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

export function useDeleteCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCase,
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
