import type { Express, Request, Response } from "express";
import { interpretUserInput } from "./interpreter";
import { evaluateClaim, prepareGovernorInput } from "./governor";
import { explainDetermination } from "./explainer";
import { processUserQuery } from "./index";

export function registerELIRoutes(app: Express): void {
  app.post("/api/intake", async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory = [] } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const interpreterOutput = await interpretUserInput(message, conversationHistory);

      res.json({
        extracted: interpreterOutput,
        needsClarification: (interpreterOutput.clarifyingQuestions?.length ?? 0) > 0,
      });
    } catch (error) {
      console.error("Intake error:", error);
      res.status(500).json({ error: "Failed to process intake" });
    }
  });

  app.post("/api/govern", async (req: Request, res: Response) => {
    try {
      const { interpreterOutput, policyVersion = "v4.0" } = req.body;

      if (!interpreterOutput) {
        return res.status(400).json({ error: "Interpreter output is required" });
      }

      const governorInput = prepareGovernorInput(interpreterOutput, policyVersion);
      const governorOutput = await evaluateClaim(governorInput);

      res.json(governorOutput);
    } catch (error) {
      console.error("Governor error:", error);
      res.status(500).json({ error: "Failed to evaluate claim" });
    }
  });

  app.post("/api/explain", async (req: Request, res: Response) => {
    try {
      const { interpreterOutput, governorOutput } = req.body;

      if (!interpreterOutput || !governorOutput) {
        return res.status(400).json({ error: "Both interpreter and governor outputs required" });
      }

      const explanation = await explainDetermination(interpreterOutput, governorOutput);

      res.json(explanation);
    } catch (error) {
      console.error("Explainer error:", error);
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });

  app.post("/api/eli/query", async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory = [], policyVersion = "v4.0" } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const result = await processUserQuery(message, conversationHistory, policyVersion);

      res.json(result);
    } catch (error) {
      console.error("ELI query error:", error);
      res.status(500).json({ error: "Failed to process query" });
    }
  });
}
