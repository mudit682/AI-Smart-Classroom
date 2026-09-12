import { env } from "../../../config/env.js";
import { AppError, ValidationError } from "../../../shared/errors/index.js";
import type { FaceRecognitionBoundingBox } from "../dtos/face-recognition.dto.js";

export interface AiProcessedFaceEmbedding {
  faceIndex: number;
  confidence: number;
  boundingBox: FaceRecognitionBoundingBox;
  embedding: number[];
  embeddingDimension: number;
  modelIdentifier: string;
}

export interface AiRejectedFace {
  faceIndex: number;
  confidence: number;
  boundingBox: FaceRecognitionBoundingBox;
  reason: string;
}

export interface AiProcessImageResponse {
  totalDetectedFaces: number;
  processedFaces: number;
  rejectedFaces: number;
  faces: AiProcessedFaceEmbedding[];
  rejections: AiRejectedFace[];
}

export class FaceRecognitionAiClient {
  async processImage(file: Express.Multer.File): Promise<AiProcessImageResponse> {
    const formData = new FormData();
    const imageBlob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });

    formData.append("file", imageBlob, file.originalname);

    let response: Response;

    try {
      response = await fetch(`${env.AI_SERVICE_BASE_URL}/api/v1/recognition/process-image`, {
        method: "POST",
        body: formData
      });
    } catch (error) {
      throw new AppError("AI recognition service is unavailable.", 502, {
        code: "AI_SERVICE_UNAVAILABLE",
        details: error instanceof Error ? error.message : undefined
      });
    }

    const payload = await this.parseResponse(response);

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        throw new ValidationError("Classroom image is invalid for recognition.", payload);
      }

      throw new AppError("AI recognition service failed.", 502, {
        code: "AI_RECOGNITION_PROCESSING_FAILED",
        details: payload
      });
    }

    return this.parseProcessImagePayload(payload);
  }

  private async parseResponse(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  private parseProcessImagePayload(payload: unknown): AiProcessImageResponse {
    if (!payload || typeof payload !== "object") {
      throw new AppError("AI recognition service returned an invalid response.", 502, {
        code: "AI_RECOGNITION_INVALID_RESPONSE"
      });
    }

    const response = payload as Partial<AiProcessImageResponse>;

    if (!Array.isArray(response.faces) || !Array.isArray(response.rejections)) {
      throw new AppError("AI recognition service returned an invalid response.", 502, {
        code: "AI_RECOGNITION_INVALID_RESPONSE"
      });
    }

    return {
      totalDetectedFaces: Number(response.totalDetectedFaces ?? 0),
      processedFaces: Number(response.processedFaces ?? response.faces.length),
      rejectedFaces: Number(response.rejectedFaces ?? response.rejections.length),
      faces: response.faces,
      rejections: response.rejections
    };
  }
}

export const faceRecognitionAiClient = new FaceRecognitionAiClient();
