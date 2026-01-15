import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const canonDocuments = pgTable("canon_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  name: text("name").notNull(),
  size: text("size").notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  version: text("version").notNull(),
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type CanonDocument = typeof canonDocuments.$inferSelect;
export type InsertCanonDocument = z.infer<typeof insertCanonDocumentSchema>;
export type CanonChunk = typeof canonChunks.$inferSelect;
export type InsertCanonChunk = z.infer<typeof insertCanonChunkSchema>;
