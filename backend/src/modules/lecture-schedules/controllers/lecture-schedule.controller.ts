import type { NextFunction, Request, Response } from "express";
import type { CreateLectureScheduleRequest, UpdateLectureScheduleRequest } from "../dtos/lecture-schedule.dto.js";
import { lectureScheduleService } from "../services/lecture-schedule.service.js";

export async function createLectureSchedule(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await lectureScheduleService.create(request.body as CreateLectureScheduleRequest, request.user!.userId);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listLectureSchedules(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await lectureScheduleService.findAll();

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getLectureScheduleById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await lectureScheduleService.findById(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateLectureSchedule(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await lectureScheduleService.update(
      request.params.id,
      request.body as UpdateLectureScheduleRequest,
      request.user!.userId
    );

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteLectureSchedule(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await lectureScheduleService.delete(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

