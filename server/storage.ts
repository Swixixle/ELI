import { type User, type InsertUser, type CanonDocument, type InsertCanonDocument, users, canonDocuments } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllCanonDocuments(): Promise<CanonDocument[]>;
  getCanonDocument(id: string): Promise<CanonDocument | undefined>;
  createCanonDocument(doc: InsertCanonDocument): Promise<CanonDocument>;
  deleteCanonDocument(id: string): Promise<void>;
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
}

export const storage = new DatabaseStorage();
