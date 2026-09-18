import type { NextFunction, Request, Response } from "express";
import type {
  AttendanceSessionRecognitionRequest,
  ClassroomRecognitionView,
  FaceRecognitionMatchRequest
} from "../dtos/face-recognition.dto.js";
import { faceRecognitionService } from "../services/face-recognition.service.js";

export async function matchFace(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await faceRecognitionService.match(request.body as FaceRecognitionMatchRequest);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function processClassroomRecognition(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filesByView = request.files as Partial<Record<ClassroomRecognitionView, Express.Multer.File[]>>;
    const result = await faceRecognitionService.processClassroomImages([
      { view: "left", file: filesByView.left?.[0] as Express.Multer.File },
      { view: "center", file: filesByView.center?.[0] as Express.Multer.File },
      { view: "right", file: filesByView.right?.[0] as Express.Multer.File }
    ]);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function processAttendanceSessionRecognition(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filesByView = request.files as Partial<Record<ClassroomRecognitionView, Express.Multer.File[]>>;
    const result = await faceRecognitionService.processAttendanceSessionImages(
      request.body as AttendanceSessionRecognitionRequest,
      [
        { view: "left", file: filesByView.left?.[0] as Express.Multer.File },
        { view: "center", file: filesByView.center?.[0] as Express.Multer.File },
        { view: "right", file: filesByView.right?.[0] as Express.Multer.File }
      ],
      request.user!
    );

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
