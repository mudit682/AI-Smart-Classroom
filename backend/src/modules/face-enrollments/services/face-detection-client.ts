import { env } from "../../../config/env.js";
import { AppError, ValidationError } from "../../../shared/errors/index.js";

export interface ProcessedFaceImage {
  buffer: Buffer;
  mimeType: "image/jpeg";
}

export class FaceDetectionClient {
  async preprocessFace(file: Express.Multer.File): Promise<ProcessedFaceImage> {
    const formData = new FormData();
    const imageBlob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });

    formData.append("file", imageBlob, file.originalname);

    let response: Response;

    try {
      response = await fetch(`${env.AI_SERVICE_BASE_URL}/api/v1/preprocessing/face`, {
        method: "POST",
        body: formData
      });
    } catch (error) {
      throw new AppError("AI detection service is unavailable.", 502, {
        code: "AI_SERVICE_UNAVAILABLE",
        details: error instanceof Error ? error.message : undefined
      });
    }

    const payload = await this.parseResponse(response);

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        throw new ValidationError("Face enrollment image is invalid.", payload);
      }

      throw new AppError("AI detection service failed.", 502, {
        code: "AI_DETECTION_FAILED",
        details: payload
      });
    }

    const processedImage = Buffer.from(await response.arrayBuffer());

    if (processedImage.length === 0 || !response.headers.get("content-type")?.includes("image/jpeg")) {
      throw new AppError("AI detection service returned an invalid response.", 502, {
        code: "AI_DETECTION_INVALID_RESPONSE"
      });
    }

    return {
      buffer: processedImage,
      mimeType: "image/jpeg"
    };
  }

  private async parseResponse(response: Response): Promise<unknown> {
    if (response.ok) {
      return undefined;
    }

    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }
}

export const faceDetectionClient = new FaceDetectionClient();
