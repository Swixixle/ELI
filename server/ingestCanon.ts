import { db } from "./db";
import { canonChunks } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const CANON_TEXT_DIR = "./canon_text";

interface CanonFile {
  filename: string;
  sourceFile: string;
  version?: string;
  date?: string;
  canonTier: string;
}

const CANON_FILES: CanonFile[] = [
  { filename: "Parrot_Box.txt", sourceFile: "Parrot Box.pdf", version: "v1.0", canonTier: "tier-0" },
  { filename: "PhdELI.txt", sourceFile: "PhdELI.pdf", version: "v1.0", canonTier: "tier-0" },
  { filename: "ELI_Consolidated_Master_Packet.txt", sourceFile: "ELI_Consolidated_Master_Packet_v1_2026-01-10.pdf", version: "v1.0", date: "2026-01-10", canonTier: "tier-0" },
  { filename: "REFUSALLIBRARY.txt", sourceFile: "REFUSALLIBRARY.pdf", version: "v1.0", canonTier: "tier-0" },
  { filename: "ELI_Gatekeeper_Substrate.txt", sourceFile: "ELI_Gatekeeper_Substrate_Final.pdf", version: "Final", canonTier: "tier-0" },
  { filename: "ELI_Five_Lens.txt", sourceFile: "ELI_Five_Lens_Evaluation_Framework.pdf", version: "v1.0", canonTier: "tier-0" },
  { filename: "ELI_Foolproofing_Safety.txt", sourceFile: "ELI_Foolproofing_and_Safety_Architecture.pdf", version: "v4.0", canonTier: "tier-0" },
  { filename: "ELI_Treatise_v2.txt", sourceFile: "ELI_Treatise_v2_Rigor_Rubric_and_WhyNot.pdf", version: "v2.0", canonTier: "tier-0" },
  { filename: "ELI_Gatekeeper_Blueprint.txt", sourceFile: "ELI_Gatekeeper_Blueprint_LOCKED.pdf", version: "LOCKED", canonTier: "tier-0" },
  { filename: "ELI_Cost_Value.txt", sourceFile: "ELI_Cost_and_Value_Brief.pdf", version: "v4.0", canonTier: "tier-0" },
];

function parseSection(text: string): string | null {
  const sectionMatch = text.match(/^(Chapter\s+[IVX\d]+|Section\s+[\d.]+|\d+\.\d+|\d+\))/i);
  return sectionMatch ? sectionMatch[0] : null;
}

function chunkContent(content: string, sourceFile: string): Array<{ section: string | null; content: string }> {
  const chunks: Array<{ section: string | null; content: string }> = [];
  
  const sectionDelimiters = /(?=(?:^|\n)(?:Chapter\s+[IVX\d]+|⸻|\n{3,}|\d+\.\d+\s+[A-Z]))/gm;
  const sections = content.split(sectionDelimiters).filter(s => s.trim().length > 50);
  
  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length < 50) continue;
    
    const maxChunkSize = 2000;
    if (trimmed.length <= maxChunkSize) {
      chunks.push({
        section: parseSection(trimmed),
        content: trimmed
      });
    } else {
      const paragraphs = trimmed.split(/\n{2,}/);
      let currentChunk = "";
      let currentSection: string | null = null;
      
      for (const para of paragraphs) {
        if (!currentSection) {
          currentSection = parseSection(para);
        }
        
        if (currentChunk.length + para.length > maxChunkSize && currentChunk.length > 100) {
          chunks.push({ section: currentSection, content: currentChunk.trim() });
          currentChunk = para;
          currentSection = parseSection(para);
        } else {
          currentChunk += "\n\n" + para;
        }
      }
      
      if (currentChunk.trim().length > 50) {
        chunks.push({ section: currentSection, content: currentChunk.trim() });
      }
    }
  }
  
  return chunks;
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").substring(0, 64);
}

export async function ingestCanon(): Promise<{ success: boolean; chunksIngested: number; errors: string[] }> {
  const errors: string[] = [];
  let chunksIngested = 0;
  
  console.log("Starting Canon ingestion...");
  
  for (const canonFile of CANON_FILES) {
    const filePath = path.join(CANON_TEXT_DIR, canonFile.filename);
    
    if (!fs.existsSync(filePath)) {
      errors.push(`File not found: ${filePath}`);
      continue;
    }
    
    console.log(`Processing: ${canonFile.sourceFile}`);
    const content = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkContent(content, canonFile.sourceFile);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const contentHash = hashContent(chunk.content);
      
      try {
        await db.insert(canonChunks).values({
          sourceFile: canonFile.sourceFile,
          section: chunk.section || `Section ${i + 1}`,
          version: canonFile.version,
          date: canonFile.date,
          canonTier: canonFile.canonTier,
          content: chunk.content,
          contentHash: contentHash
        });
        chunksIngested++;
      } catch (err: any) {
        errors.push(`Error inserting chunk from ${canonFile.sourceFile}: ${err.message}`);
      }
    }
    
    console.log(`  Ingested ${chunks.length} chunks from ${canonFile.sourceFile}`);
  }
  
  console.log(`Canon ingestion complete. Total chunks: ${chunksIngested}`);
  
  return { success: errors.length === 0, chunksIngested, errors };
}

const isMain = import.meta.url.endsWith(process.argv[1]?.replace(/^file:\/\//, "") || "");
if (process.argv[1]?.includes("ingestCanon")) {
  ingestCanon().then(result => {
    console.log("Result:", JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }).catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
