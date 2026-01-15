import { createHash, sign, verify, generateKeyPairSync, createPrivateKey, createPublicKey, KeyObject } from "crypto";

let cachedKeyPair: { publicKey: KeyObject; privateKey: KeyObject } | null = null;

export function getKeyPair(): { publicKey: KeyObject; privateKey: KeyObject } {
  if (!cachedKeyPair) {
    const privateKeyPem = process.env.ED25519_PRIVATE_KEY;
    const publicKeyPem = process.env.ED25519_PUBLIC_KEY;
    
    if (privateKeyPem && publicKeyPem) {
      cachedKeyPair = {
        privateKey: createPrivateKey(privateKeyPem),
        publicKey: createPublicKey(publicKeyPem),
      };
    } else {
      const newPair = generateKeyPairSync("ed25519");
      const privatePem = newPair.privateKey.export({ type: "pkcs8", format: "pem" }) as string;
      const publicPem = newPair.publicKey.export({ type: "spki", format: "pem" }) as string;
      console.warn("[crypto] No ED25519_PRIVATE_KEY/ED25519_PUBLIC_KEY found. Generated ephemeral keypair.");
      console.warn("[crypto] For production, set these environment variables:");
      console.warn("[crypto] ED25519_PRIVATE_KEY:", privatePem.replace(/\n/g, "\\n"));
      console.warn("[crypto] ED25519_PUBLIC_KEY:", publicPem.replace(/\n/g, "\\n"));
      cachedKeyPair = newPair;
    }
  }
  return cachedKeyPair;
}

export function getPublicKeyPem(): string {
  const { publicKey } = getKeyPair();
  return publicKey.export({ type: "spki", format: "pem" }) as string;
}

export function hashSHA256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

export function computeCaseStateHash(caseData: {
  caseId: string;
  decisionTarget: string;
  decisionTime: string;
  documentsConsidered: { docId: string; sha256: string }[];
  checklistSnapshot: Record<string, boolean>;
}): string {
  const canonicalData = JSON.stringify({
    caseId: caseData.caseId,
    decisionTarget: caseData.decisionTarget,
    decisionTime: caseData.decisionTime,
    documentsConsidered: caseData.documentsConsidered.map((d) => ({
      docId: d.docId,
      sha256: d.sha256,
    })).sort((a, b) => a.docId.localeCompare(b.docId)),
    checklistSnapshot: Object.keys(caseData.checklistSnapshot)
      .sort()
      .reduce((acc, key) => {
        acc[key] = caseData.checklistSnapshot[key];
        return acc;
      }, {} as Record<string, boolean>),
  });
  return hashSHA256(canonicalData);
}

export function signReceipt(receiptJson: string): {
  algorithm: string;
  publicKeyId: string;
  signatureB64: string;
} {
  const { publicKey, privateKey } = getKeyPair();
  const signature = sign(null, Buffer.from(receiptJson, "utf8"), privateKey);
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const publicKeyId = hashSHA256(publicKeyDer.toString("base64")).substring(0, 16);

  return {
    algorithm: "ed25519",
    publicKeyId,
    signatureB64: signature.toString("base64"),
  };
}

export function verifyReceiptSignature(
  receiptJson: string,
  signatureB64: string
): boolean {
  try {
    const { publicKey } = getKeyPair();
    return verify(
      null,
      Buffer.from(receiptJson, "utf8"),
      publicKey,
      Buffer.from(signatureB64, "base64")
    );
  } catch {
    return false;
  }
}
