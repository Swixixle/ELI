import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const canonDocuments = pgTable("canon_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  size: text("size").notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  version: text("version").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCanonDocumentSchema = createInsertSchema(canonDocuments).omit({
  id: true,
  uploadedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CanonDocument = typeof canonDocuments.$inferSelect;
export type InsertCanonDocument = z.infer<typeof insertCanonDocumentSchema>;
