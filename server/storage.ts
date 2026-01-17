import { type User, type InsertUser, type CanonDocument, type InsertCanonDocument, type CanonChunk, type Case, type InsertCase, type CaseEvent, type InsertCaseEvent, type DecisionTarget, type InsertDecisionTarget, type Determination, type InsertDetermination, type CasePrintout, type InsertCasePrintout, type ArchiveReasonCode, users, canonDocuments, canonChunks, cases, caseEvents, decisionTargets, determinations, casePrintouts } from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, sql, and, ne } from "drizzle-orm";

export interface ArchiveCaseParams {
  reasonCode: ArchiveReasonCode;
  reasonNote?: string;
  archivedBy?: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllCases(status?: "active" | "archived" | "all"): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<InsertCase>): Promise<Case | undefined>;
  archiveCase(id: string, params: ArchiveCaseParams): Promise<Case | undefined>;
  
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
  getDetermination(id: string): Promise<Determination | undefined>;
  
  createCasePrintout(printout: InsertCasePrintout): Promise<CasePrintout>;
  getCasePrintouts(caseId: string): Promise<CasePrintout[]>;
  getCasePrintout(id: string): Promise<CasePrintout | undefined>;
  getNextPrintoutNumber(caseId: string): Promise<number>;
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

  async getAllCases(status: "active" | "archived" | "all" = "active"): Promise<Case[]> {
    if (status === "all") {
      return await db.select().from(cases).orderBy(desc(cases.updatedAt));
    }
    return await db.select().from(cases)
      .where(eq(cases.status, status))
      .orderBy(desc(cases.updatedAt));
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
    // Defense-in-depth: Check if case is archived before updating
    const existing = await this.getCase(id);
    if (existing && existing.status === "archived") {
      throw new Error("Case is archived and cannot be modified.");
    }
    
    // Prevent unarchiving via status update (must use proper restore flow if implemented)
    if (updates.status && updates.status !== existing?.status) {
      throw new Error("Case status cannot be changed via update. Use archive/restore endpoints.");
    }
    
    const [updatedCase] = await db.update(cases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return updatedCase;
  }

  async archiveCase(id: string, params: ArchiveCaseParams): Promise<Case | undefined> {
    const [archivedCase] = await db.update(cases)
      .set({
        status: "archived",
        archivedAt: new Date(),
        archivedBy: params.archivedBy || "system",
        archiveReasonCode: params.reasonCode,
        archiveReasonNote: params.reasonNote || null,
        updatedAt: new Date()
      })
      .where(eq(cases.id, id))
      .returning();
    return archivedCase;
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
    // Validate case existence and status before insert (defense-in-depth)
    const [caseData] = await db.select({ id: cases.id, status: cases.status }).from(cases).where(eq(cases.id, doc.caseId));
    if (!caseData) {
      throw new Error(`Case ${doc.caseId} does not exist. Documents must be bound to a valid case.`);
    }
    if (caseData.status === "archived") {
      throw new Error(`Case ${doc.caseId} is archived. Documents cannot be added to archived cases.`);
    }
    
    const [newDoc] = await db.insert(canonDocuments).values(doc).returning();
    return newDoc;
  }

  async deleteCanonDocument(id: string): Promise<void> {
    // Defense-in-depth: Get document and check if parent case is archived
    const doc = await this.getCanonDocument(id);
    if (doc) {
      const [caseData] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, doc.caseId));
      if (caseData && caseData.status === "archived") {
        throw new Error(`Case ${doc.caseId} is archived. Documents cannot be deleted from archived cases.`);
      }
    }
    
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
    // Defense-in-depth: Check if case is archived before creating event
    const [caseData] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, event.caseId));
    if (caseData && caseData.status === "archived") {
      throw new Error(`Case ${event.caseId} is archived. Events cannot be added to archived cases.`);
    }
    
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
    // Defense-in-depth: Check if case is archived before setting decision target
    const [caseData] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId));
    if (caseData && caseData.status === "archived") {
      throw new Error(`Case ${caseId} is archived. Decision target cannot be modified.`);
    }
    
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
    // Defense-in-depth: Check if parent case is archived before locking
    const [target] = await db.select({ caseId: decisionTargets.caseId }).from(decisionTargets).where(eq(decisionTargets.id, id));
    if (target) {
      const [caseData] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, target.caseId));
      if (caseData && caseData.status === "archived") {
        throw new Error(`Case ${target.caseId} is archived. Decision targets cannot be modified.`);
      }
    }
    
    const [locked] = await db.update(decisionTargets)
      .set({ lockedAt: new Date() })
      .where(eq(decisionTargets.id, id))
      .returning();
    return locked;
  }

  async createDetermination(determination: InsertDetermination): Promise<Determination> {
    // Defense-in-depth: Check if case is archived before creating determination
    const [caseData] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, determination.caseId));
    if (caseData && caseData.status === "archived") {
      throw new Error(`Case ${determination.caseId} is archived. Determinations cannot be created for archived cases.`);
    }
    
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

  async getDetermination(id: string): Promise<Determination | undefined> {
    const [det] = await db.select().from(determinations).where(eq(determinations.id, id));
    return det;
  }

  async createCasePrintout(printout: InsertCasePrintout): Promise<CasePrintout> {
    // Defense-in-depth: Check if case is archived before creating printout
    const [caseData] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, printout.caseId));
    if (caseData && caseData.status === "archived") {
      throw new Error(`Case ${printout.caseId} is archived. Printouts cannot be issued for archived cases.`);
    }
    
    const [newPrintout] = await db.insert(casePrintouts).values(printout).returning();
    return newPrintout;
  }

  async getCasePrintouts(caseId: string): Promise<CasePrintout[]> {
    return await db.select().from(casePrintouts)
      .where(eq(casePrintouts.caseId, caseId))
      .orderBy(desc(casePrintouts.issuedAt));
  }

  async getCasePrintout(id: string): Promise<CasePrintout | undefined> {
    const [printout] = await db.select().from(casePrintouts).where(eq(casePrintouts.id, id));
    return printout;
  }

  async getNextPrintoutNumber(caseId: string): Promise<number> {
    const [result] = await db.select({ maxNum: sql<number>`COALESCE(MAX(${casePrintouts.printoutNumber}), 0)` })
      .from(casePrintouts)
      .where(eq(casePrintouts.caseId, caseId));
    return (result?.maxNum ?? 0) + 1;
  }
}

export const storage = new DatabaseStorage();
