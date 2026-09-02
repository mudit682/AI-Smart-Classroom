import { env } from "../../../config/env.js";
import { AppError, ValidationError } from "../../../shared/errors/index.js";
import type { ProcessedFaceImage } from "./face-detection-client.js";

export interface GeneratedFaceEmbedding {
  embedding: number[];
  dimension: number;
  modelIdentifier: string;
}

export class FaceEmbeddingClient {
  async generateEmbedding(image: ProcessedFaceImage, filename = "aligned-face.jpg"): Promise<GeneratedFaceEmbedding> {
    const formData = new FormData();
    const imageBlob = new Blob([new Uint8Array(image.buffer)], { type: image.mimeType });

    formData.append("file", imageBlob, filename);

    let response: Response;

    try {
      response = await fetch(`${env.AI_SERVICE_BASE_URL}/api/v1/embeddings/generate`, {
        method: "POST",
        body: formData
      });
    } catch (error) {
      throw new AppError("AI embedding service is unavailable.", 502, {
        code: "AI_SERVICE_UNAVAILABLE",
        details: error instanceof Error ? error.message : undefined
      });
    }

    const payload = await this.parseResponse(response);

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        throw new ValidationError("Face embedding image is invalid.", payload);
      }

      throw new AppError("AI embedding service failed.", 502, {
        code: "AI_EMBEDDING_FAILED",
        details: payload
      });
    }

    if (!this.isGeneratedFaceEmbedding(payload)) {
      throw new AppError("AI embedding service returned an invalid response.", 502, {
        code: "AI_EMBEDDING_INVALID_RESPONSE",
        details: payload
      });
    }

    return payload;
  }

  private async parseResponse(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  private isGeneratedFaceEmbedding(payload: unknown): payload is GeneratedFaceEmbedding {
    if (typeof payload !== "object" || payload === null) {
      return false;
    }

    const candidate = payload as GeneratedFaceEmbedding;

    return (
      Array.isArray(candidate.embedding) &&
      candidate.embedding.every((value) => typeof value === "number") &&
      typeof candidate.dimension === "number" &&
      typeof candidate.modelIdentifier === "string"
    );
  }
}

export const faceEmbeddingClient = new FaceEmbeddingClient();
