import type { NextFunction, Request, Response } from "express";
import type {
  CreateFaceEnrollmentRequest,
  FaceEnrollmentActor,
  UpdateFaceEnrollmentRequest
} from "../dtos/face-enrollment.dto.js";
import { faceEnrollmentService } from "../services/face-enrollment.service.js";

export async function createFaceEnrollment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await faceEnrollmentService.create(
      request.body as CreateFaceEnrollmentRequest,
      getActor(request)
    );

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listFaceEnrollments(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await faceEnrollmentService.findAll(getActor(request));

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getFaceEnrollmentById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await faceEnrollmentService.findById(request.params.id, getActor(request));

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateFaceEnrollment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await faceEnrollmentService.update(
      request.params.id,
      request.body as UpdateFaceEnrollmentRequest,
      getActor(request)
    );

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteFaceEnrollment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await faceEnrollmentService.delete(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function uploadFaceEnrollmentImages(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await faceEnrollmentService.uploadImages(
      request.params.studentId,
      getUploadedFiles(request),
      getActor(request)
    );

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

function getActor(request: Request): FaceEnrollmentActor {
  return {
    userId: request.user!.userId,
    email: request.user!.email,
    role: request.user!.role
  };
}

function getUploadedFiles(request: Request): Express.Multer.File[] {
  if (Array.isArray(request.files)) {
    return request.files;
  }

  if (!request.files) {
    return [];
  }

  return Object.values(request.files).flat();
}
