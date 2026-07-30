import type { NextFunction, Request, Response } from "express";
import type { CreateTeacherRequest, UpdateTeacherRequest } from "../dtos/teacher.dto.js";
import { teacherService } from "../services/teacher.service.js";

export async function createTeacher(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherService.create(request.body as CreateTeacherRequest, request.user!.userId);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listTeachers(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherService.findAll();

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTeacherById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherService.findById(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateTeacher(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherService.update(request.params.id, request.body as UpdateTeacherRequest, request.user!.userId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteTeacher(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teacherService.delete(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

