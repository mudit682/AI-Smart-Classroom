import type { NextFunction, Request, Response } from "express";
import type {
  CreateStudentEnrollmentRequest,
  UpdateStudentEnrollmentRequest
} from "../dtos/student-enrollment.dto.js";
import { studentEnrollmentService } from "../services/student-enrollment.service.js";

export async function createStudentEnrollment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentEnrollmentService.create(
      request.body as CreateStudentEnrollmentRequest,
      request.user!.userId
    );

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listStudentEnrollments(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentEnrollmentService.findAll();

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getStudentEnrollmentById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentEnrollmentService.findById(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateStudentEnrollment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentEnrollmentService.update(
      request.params.id,
      request.body as UpdateStudentEnrollmentRequest,
      request.user!.userId
    );

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteStudentEnrollment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentEnrollmentService.delete(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

