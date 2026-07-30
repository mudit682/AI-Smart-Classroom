import type { NextFunction, Request, Response } from "express";
import type { CreateSubjectRequest, UpdateSubjectRequest } from "../dtos/subject.dto.js";
import { subjectService } from "../services/subject.service.js";

export async function createSubject(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await subjectService.create(request.body as CreateSubjectRequest, request.user!.userId);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listSubjects(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await subjectService.findAll();

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getSubjectById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await subjectService.findById(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateSubject(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await subjectService.update(request.params.id, request.body as UpdateSubjectRequest, request.user!.userId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteSubject(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await subjectService.delete(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

