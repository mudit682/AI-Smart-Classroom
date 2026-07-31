import type { NextFunction, Request, Response } from "express";
import type {
  CreateTeacherAssignmentRequest,
  UpdateTeacherAssignmentRequest
} from "../dtos/teacher-assignment.dto.js";
import { teacherAssignmentService } from "../services/teacher-assignment.service.js";

export async function createTeacherAssignment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherAssignmentService.create(
      request.body as CreateTeacherAssignmentRequest,
      request.user!.userId
    );

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listTeacherAssignments(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherAssignmentService.findAll();

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTeacherAssignmentById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherAssignmentService.findById(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateTeacherAssignment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherAssignmentService.update(
      request.params.id,
      request.body as UpdateTeacherAssignmentRequest,
      request.user!.userId
    );

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteTeacherAssignment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherAssignmentService.delete(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

