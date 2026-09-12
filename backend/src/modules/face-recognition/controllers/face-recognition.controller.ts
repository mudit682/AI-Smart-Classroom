import type { NextFunction, Request, Response } from "express";
import type { FaceRecognitionMatchRequest } from "../dtos/face-recognition.dto.js";
import { faceRecognitionService } from "../services/face-recognition.service.js";

export async function matchFace(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await faceRecognitionService.match(request.body as FaceRecognitionMatchRequest);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function processRecognitionImage(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await faceRecognitionService.processImage(request.file as Express.Multer.File);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
