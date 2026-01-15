import { type User, type InsertUser, type CanonDocument, type InsertCanonDocument, type CanonChunk, users, canonDocuments, canonChunks } from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllCanonDocuments(): Promise<CanonDocument[]>;
  getCanonDocument(id: string): Promise<CanonDocument | undefined>;
  createCanonDocument(doc: InsertCanonDocument): Promise<CanonDocument>;
  deleteCanonDocument(id: string): Promise<void>;
  
  searchCanonChunks(query: string, limit?: number): Promise<CanonChunk[]>;
  getAllCanonChunks(): Promise<CanonChunk[]>;
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

  async getAllCanonDocuments(): Promise<CanonDocument[]> {
    return await db.select().from(canonDocuments).orderBy(desc(canonDocuments.uploadedAt));
  }

  async getCanonDocument(id: string): Promise<CanonDocument | undefined> {
    const [doc] = await db.select().from(canonDocuments).where(eq(canonDocuments.id, id));
    return doc;
  }

  async createCanonDocument(doc: InsertCanonDocument): Promise<CanonDocument> {
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
}

export const storage = new DatabaseStorage();
