import { type User, type InsertUser, type CanonDocument, type InsertCanonDocument, type CanonChunk, type Case, type InsertCase, type CaseEvent, type InsertCaseEvent, type DecisionTarget, type InsertDecisionTarget, type Determination, type InsertDetermination, users, canonDocuments, canonChunks, cases, caseEvents, decisionTargets, determinations } from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, sql, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<InsertCase>): Promise<Case | undefined>;
  deleteCase(id: string): Promise<void>;
  
  getAllCanonDocuments(): Promise<CanonDocument[]>;
  getDocumentsByCase(caseId: string): Promise<CanonDocument[]>;
  getCanonDocument(id: string): Promise<CanonDocument | undefined>;
  getDocumentByHash(caseId: string, contentHash: string): Promise<CanonDocument | undefined>;
  createCanonDocument(doc: InsertCanonDocument): Promise<CanonDocument>;
  deleteCanonDocument(id: string): Promise<void>;
  
  searchCanonChunks(query: string, limit?: number): Promise<CanonChunk[]>;
  getAllCanonChunks(): Promise<CanonChunk[]>;
  
  getCaseEvents(caseId: string): Promise<CaseEvent[]>;
  createCaseEvent(event: InsertCaseEvent): Promise<CaseEvent>;
  
  getActiveDecisionTarget(caseId: string): Promise<DecisionTarget | null>;
  setDecisionTarget(caseId: string, text: string, setBy?: string): Promise<DecisionTarget>;
  lockDecisionTarget(id: string): Promise<DecisionTarget | undefined>;
  
  createDetermination(determination: InsertDetermination): Promise<Determination>;
  getLatestDetermination(caseId: string): Promise<Determination | null>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllCases(): Promise<Case[]> {
    return await db.select().from(cases).orderBy(desc(cases.updatedAt));
  }

  async getCase(id: string): Promise<Case | undefined> {
    const [caseData] = await db.select().from(cases).where(eq(cases.id, id));
    return caseData;
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const [newCase] = await db.insert(cases).values(caseData).returning();
    return newCase;
  }

  async updateCase(id: string, updates: Partial<InsertCase>): Promise<Case | undefined> {
    const [updatedCase] = await db.update(cases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return updatedCase;
  }

  async deleteCase(id: string): Promise<void> {
    await db.delete(determinations).where(eq(determinations.caseId, id));
    await db.delete(caseEvents).where(eq(caseEvents.caseId, id));
    await db.delete(decisionTargets).where(eq(decisionTargets.caseId, id));
    await db.delete(canonDocuments).where(eq(canonDocuments.caseId, id));
    await db.delete(cases).where(eq(cases.id, id));
  }

  async getAllCanonDocuments(): Promise<CanonDocument[]> {
    return await db.select().from(canonDocuments).orderBy(desc(canonDocuments.uploadedAt));
  }

  async getCanonDocument(id: string): Promise<CanonDocument | undefined> {
    const [doc] = await db.select().from(canonDocuments).where(eq(canonDocuments.id, id));
    return doc;
  }

  async getDocumentsByCase(caseId: string): Promise<CanonDocument[]> {
    return await db.select().from(canonDocuments)
      .where(eq(canonDocuments.caseId, caseId))
      .orderBy(desc(canonDocuments.uploadedAt));
  }

  async getDocumentByHash(caseId: string, contentHash: string): Promise<CanonDocument | undefined> {
    const [doc] = await db.select().from(canonDocuments)
      .where(sql`${canonDocuments.caseId} = ${caseId} AND ${canonDocuments.contentHash} = ${contentHash}`);
    return doc;
  }

  async createCanonDocument(doc: InsertCanonDocument): Promise<CanonDocument> {
    // Validate case existence before insert (defense-in-depth)
    const [caseExists] = await db.select({ id: cases.id }).from(cases).where(eq(cases.id, doc.caseId));
    if (!caseExists) {
      throw new Error(`Case ${doc.caseId} does not exist. Documents must be bound to a valid case.`);
    }
    
    const [newDoc] = await db.insert(canonDocuments).values(doc).returning();
    return newDoc;
  }

  async deleteCanonDocument(id: string): Promise<void> {
    await db.delete(canonDocuments).where(eq(canonDocuments.id, id));
  }

  async searchCanonChunks(query: string, limit: number = 10): Promise<CanonChunk[]> {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    if (searchTerms.length === 0) {
      return [];
    }
    
    const conditions = searchTerms.map(term => 
      ilike(canonChunks.content, `%${term}%`)
    );
    
    const whereClause = conditions.length === 1 
      ? conditions[0] 
      : or(...conditions);
    
    return await db.select()
      .from(canonChunks)
      .where(whereClause)
      .limit(limit);
  }

  async getAllCanonChunks(): Promise<CanonChunk[]> {
    return await db.select().from(canonChunks);
  }

  async getCaseEvents(caseId: string): Promise<CaseEvent[]> {
    return await db.select().from(caseEvents)
      .where(eq(caseEvents.caseId, caseId))
      .orderBy(caseEvents.eventTime);
  }

  async createCaseEvent(event: InsertCaseEvent): Promise<CaseEvent> {
    const [newEvent] = await db.insert(caseEvents).values(event).returning();
    return newEvent;
  }

  async getActiveDecisionTarget(caseId: string): Promise<DecisionTarget | null> {
    const [target] = await db.select().from(decisionTargets)
      .where(and(eq(decisionTargets.caseId, caseId), eq(decisionTargets.isActive, true)))
      .orderBy(desc(decisionTargets.setAt))
      .limit(1);
    return target ?? null;
  }

  async setDecisionTarget(caseId: string, text: string, setBy?: string): Promise<DecisionTarget> {
    await db.update(decisionTargets)
      .set({ isActive: false })
      .where(eq(decisionTargets.caseId, caseId));
    
    const [newTarget] = await db.insert(decisionTargets).values({
      caseId,
      text,
      setBy: setBy ?? null,
      isActive: true,
    }).returning();
    
    await db.update(cases)
      .set({ decisionTarget: text, updatedAt: new Date() })
      .where(eq(cases.id, caseId));
    
    return newTarget;
  }

  async lockDecisionTarget(id: string): Promise<DecisionTarget | undefined> {
    const [locked] = await db.update(decisionTargets)
      .set({ lockedAt: new Date() })
      .where(eq(decisionTargets.id, id))
      .returning();
    return locked;
  }

  async createDetermination(determination: InsertDetermination): Promise<Determination> {
    const [newDetermination] = await db.insert(determinations).values(determination).returning();
    return newDetermination;
  }

  async getLatestDetermination(caseId: string): Promise<Determination | null> {
    const [det] = await db.select().from(determinations)
      .where(eq(determinations.caseId, caseId))
      .orderBy(desc(determinations.createdAt))
      .limit(1);
    return det ?? null;
  }
}

export const storage = new DatabaseStorage();
