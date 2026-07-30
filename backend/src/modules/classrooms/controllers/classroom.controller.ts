import type { NextFunction, Request, Response } from "express";
import type { CreateClassroomRequest, UpdateClassroomRequest } from "../dtos/classroom.dto.js";
import { classroomService } from "../services/classroom.service.js";

export async function createClassroom(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await classroomService.create(request.body as CreateClassroomRequest, request.user!.userId);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listClassrooms(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await classroomService.findAll();

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getClassroomById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await classroomService.findById(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateClassroom(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await classroomService.update(request.params.id, request.body as UpdateClassroomRequest, request.user!.userId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteClassroom(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await classroomService.delete(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

