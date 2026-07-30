import type { NextFunction, Request, Response } from "express";
import type { CreateStudentRequest, UpdateStudentRequest } from "../dtos/student.dto.js";
import { studentService } from "../services/student.service.js";

export async function createStudent(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentService.create(request.body as CreateStudentRequest, request.user!.userId);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listStudents(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentService.findAll();

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getStudentById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentService.findById(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateStudent(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentService.update(request.params.id, request.body as UpdateStudentRequest, request.user!.userId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteStudent(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await studentService.delete(request.params.id);

    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

