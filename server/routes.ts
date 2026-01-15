import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCanonDocumentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all canon documents
  app.get("/api/canon", async (req, res) => {
    try {
      const documents = await storage.getAllCanonDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching canon documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Create a new canon document
  app.post("/api/canon", async (req, res) => {
    try {
      const validatedData = insertCanonDocumentSchema.parse(req.body);
      const newDoc = await storage.createCanonDocument(validatedData);
      res.status(201).json(newDoc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid document data", details: error.errors });
      } else {
        console.error("Error creating canon document:", error);
        res.status(500).json({ error: "Failed to create document" });
      }
    }
  });

  // Delete a canon document
  app.delete("/api/canon/:id", async (req, res) => {
    try {
      await storage.deleteCanonDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting canon document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  return httpServer;
}
