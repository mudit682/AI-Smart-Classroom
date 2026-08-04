import { env } from "../../../config/env.js";
import { AppError, ValidationError } from "../../../shared/errors/index.js";

interface DetectionResponse {
  facesDetected: number;
}

export class FaceDetectionClient {
  async detectFaces(file: Express.Multer.File): Promise<number> {
    const formData = new FormData();
    const imageBlob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });

    formData.append("file", imageBlob, file.originalname);

    let response: Response;

    try {
      response = await fetch(`${env.AI_SERVICE_BASE_URL}/api/v1/detection/detect`, {
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
      if (response.status === 404) {
        return 0;
      }

      if (response.status === 400) {
        throw new ValidationError("Face enrollment image is invalid.", payload);
      }

      throw new AppError("AI detection service failed.", 502, {
        code: "AI_DETECTION_FAILED",
        details: payload
      });
    }

    if (!this.isDetectionResponse(payload)) {
      throw new AppError("AI detection service returned an invalid response.", 502, {
        code: "AI_DETECTION_INVALID_RESPONSE"
      });
    }

    return payload.facesDetected;
  }

  private async parseResponse(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  private isDetectionResponse(payload: unknown): payload is DetectionResponse {
    return (
      typeof payload === "object" &&
      payload !== null &&
      "facesDetected" in payload &&
      typeof payload.facesDetected === "number"
    );
  }
}

export const faceDetectionClient = new FaceDetectionClient();
