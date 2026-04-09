/**
 * Gemini Embedding 2 Provider
 *
 * 768 dimensions, L2 normalized, multimodal (text + images).
 * Used for semantic search across all memory types.
 */

import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-embedding-001";
const GENERATION_MODEL = "gemini-3.1-flash";
const DIMENSIONS = 768;

let client: GoogleGenAI | null = null;
let clientKey: string | null = null;

function getClient(apiKey: string): GoogleGenAI {
  if (!client || clientKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    clientKey = apiKey;
  }
  return client;
}

/**
 * Exponential backoff helper for Gemini API.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      // Retry on 429 (Rate Limit), 500+ (Internal Server Error), or Resource Exhausted
      const isRetryable =
        error?.status === 429 ||
        error?.status >= 500 ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("quota");

      if (!isRetryable || attempt === maxRetries) throw error;

      // Exponential delay: 1s, 2s, 4s... up to 10s
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

/**
 * L2 normalize a vector. Required for Gemini at 768d (not pre-normalized).
 */
function l2Normalize(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return magnitude > 0 ? vec.map((v) => v / magnitude) : vec;
}

/**
 * Generate text via Gemini Flash — used for memory consolidation and reflection.
 */
export async function generateText(
  apiKey: string,
  prompt: string
): Promise<string> {
  const ai = getClient(apiKey);
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
    })
  );
  return response.text || "";
}

/**
 * Generate a text embedding via Gemini Embedding 2.
 */
export async function getEmbedding(
  apiKey: string,
  text: string
): Promise<number[]> {
  const ai = getClient(apiKey);
  const response = await withRetry(() =>
    ai.models.embedContent({
      model: MODEL,
      contents: text,
      config: { outputDimensionality: DIMENSIONS },
    })
  );
  return l2Normalize(response.embeddings![0].values!);
}

/**
 * Generate a multimodal embedding via Gemini Embedding 2.
 * Combines image + contextual text for richer semantic meaning.
 */
export async function getImageEmbedding(
  apiKey: string,
  imageData: ArrayBuffer,
  mimeType: string,
  contextText?: string
): Promise<number[]> {
  const ai = getClient(apiKey);
  // Chunk-based base64 encoding (spread operator blows stack on large arrays)
  const bytes = new Uint8Array(imageData);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [];
  if (contextText) {
    parts.push({ text: contextText });
  }
  parts.push({ inlineData: { data: base64, mimeType } });

  const response = await withRetry(() =>
    ai.models.embedContent({
      model: MODEL,
      contents: [{ role: "user", parts }] as any,
      config: { outputDimensionality: DIMENSIONS },
    })
  );
  return l2Normalize(response.embeddings![0].values!);
}
