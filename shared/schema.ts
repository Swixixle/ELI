import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, serial, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const CASE_PHASES = ["intake", "review", "decision", "closure"] as const;
export type CasePhase = typeof CASE_PHASES[number];

export const CASE_STATUSES = ["active", "archived"] as const;
export type CaseStatus = typeof CASE_STATUSES[number];

export const ARCHIVE_REASON_CODES = ["DUPLICATE", "ENTERED_IN_ERROR", "COMPLETED", "CANCELLED"] as const;
export type ArchiveReasonCode = typeof ARCHIVE_REASON_CODES[number];

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  decisionTarget: text("decision_target"),
  decisionTime: timestamp("decision_time"),
  decisionTimeMode: varchar("decision_time_mode", { length: 20 }),
  phase: varchar("phase", { length: 20 }).notNull().default("intake"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  policyThresholdMin: integer("policy_threshold_min").notNull().default(3),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by", { length: 255 }),
  archiveReasonCode: varchar("archive_reason_code", { length: 30 }),
  archiveReasonNote: text("archive_reason_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const canonDocuments = pgTable("canon_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  name: text("name").notNull(),
  size: text("size").notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  version: text("version").notNull(),
  content: text("content"),
  contentHash: varchar("content_hash", { length: 64 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const canonChunks = pgTable("canon_chunks", {
  id: serial("id").primaryKey(),
  sourceFile: text("source_file").notNull(),
  section: text("section"),
  page: integer("page"),
  version: text("version"),
  date: text("date"),
  canonTier: varchar("canon_tier", { length: 20 }).notNull().default("tier-0"),
  content: text("content").notNull(),
  contentHash: varchar("content_hash", { length: 64 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCanonDocumentSchema = createInsertSchema(canonDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertCanonChunkSchema = createInsertSchema(canonChunks).omit({
  id: true,
  createdAt: true,
});

// Decision Targets - tracks decision target history per case
export const decisionTargets = pgTable("decision_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  text: text("text").notNull(),
  setAt: timestamp("set_at").notNull().defaultNow(),
  setBy: varchar("set_by", { length: 255 }),
  lockedAt: timestamp("locked_at"),
  isActive: boolean("is_active").notNull().default(true),
});

// Case Events - timeline entries for temporal verification
export const caseEvents = pgTable("case_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  eventTime: timestamp("event_time").notNull(),
  sourceDocId: varchar("source_doc_id").references(() => canonDocuments.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Determinations - stores signed receipts
export const determinations = pgTable("determinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  canonVersion: varchar("canon_version", { length: 10 }).notNull().default("4.0"),
  status: varchar("status", { length: 30 }).notNull(),
  receiptJson: jsonb("receipt_json").notNull(),
  caseStateHash: varchar("case_state_hash", { length: 64 }).notNull(),
  signatureB64: text("signature_b64"),
  publicKeyId: varchar("public_key_id", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDecisionTargetSchema = createInsertSchema(decisionTargets).omit({
  id: true,
  setAt: true,
});

export const insertCaseEventSchema = createInsertSchema(caseEvents).omit({
  id: true,
  createdAt: true,
});

export const insertDeterminationSchema = createInsertSchema(determinations).omit({
  id: true,
  createdAt: true,
});

// Case Printouts - immutable judgment records (no update/delete allowed)
export const casePrintouts = pgTable("case_printouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  determinationId: varchar("determination_id").notNull().references(() => determinations.id),
  printoutNumber: integer("printout_number").notNull(),
  title: text("title").notNull(),
  renderedContent: jsonb("rendered_content").notNull(),
  summary: text("summary").notNull(),
  prerequisitesMet: integer("prerequisites_met").notNull(),
  prerequisitesTotal: integer("prerequisites_total").notNull().default(5),
  admissibilityStatus: varchar("admissibility_status", { length: 30 }).notNull(),
  caseStateHash: varchar("case_state_hash", { length: 64 }).notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  signatureB64: text("signature_b64").notNull(),
  publicKeyId: varchar("public_key_id", { length: 50 }).notNull(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
});

export const insertCasePrintoutSchema = createInsertSchema(casePrintouts).omit({
  id: true,
  issuedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type CanonDocument = typeof canonDocuments.$inferSelect;
export type InsertCanonDocument = z.infer<typeof insertCanonDocumentSchema>;
export type CanonChunk = typeof canonChunks.$inferSelect;
export type InsertCanonChunk = z.infer<typeof insertCanonChunkSchema>;
export type DecisionTarget = typeof decisionTargets.$inferSelect;
export type InsertDecisionTarget = z.infer<typeof insertDecisionTargetSchema>;
export type CaseEvent = typeof caseEvents.$inferSelect;
export type InsertCaseEvent = z.infer<typeof insertCaseEventSchema>;
export type Determination = typeof determinations.$inferSelect;
export type InsertDetermination = z.infer<typeof insertDeterminationSchema>;
export type CasePrintout = typeof casePrintouts.$inferSelect;
export type InsertCasePrintout = z.infer<typeof insertCasePrintoutSchema>;

// CaseOverview - derived, read-only object assembled from existing tables
export type PrerequisiteStatusValue = "met" | "partial" | "unmet";
export type RiskTier = "unsafe" | "high_risk" | "defensible" | "regulator_ready" | "unknown";

export interface CaseOverview {
  caseId: string;
  caseTitle: string;
  caseType: string;
  domain: string;
  phase: CasePhase;
  
  decisionTarget: string | null;
  decisionTime: Date | null;
  
  canonDocumentCount: number;
  evidenceItemCount: number;
  verifiedEvidenceCount: number;
  
  prerequisiteStatus: {
    decisionTarget: PrerequisiteStatusValue;
    temporalVerification: PrerequisiteStatusValue;
    independentVerification: PrerequisiteStatusValue;
    policyApplication: PrerequisiteStatusValue;
    contextualConstraints: PrerequisiteStatusValue;
  };
  prerequisitesMet: number;
  prerequisitesTotal: number;
  
  currentRiskTier: RiskTier;
  reviewPermission: "advisory_only" | "permitted";
  lastEvaluationAt: Date | null;
  lastPrintoutAt: Date | null;
  printoutCount: number;
  
  nextActionHint: string;
  whatWeKnow: string[];
  whatsMissing: string[];
}
