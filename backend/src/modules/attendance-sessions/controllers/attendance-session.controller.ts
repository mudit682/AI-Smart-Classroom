import type { NextFunction, Request, Response } from "express";
import type { StartAttendanceSessionRequest } from "../dtos/attendance-session.dto.js";
import { attendanceSessionService } from "../services/attendance-session.service.js";

export async function startAttendanceSession(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await attendanceSessionService.start(request.body as StartAttendanceSessionRequest, request.user!.userId);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function endAttendanceSession(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await attendanceSessionService.end(request.params.id, request.user!.userId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function cancelAttendanceSession(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await attendanceSessionService.cancel(request.params.id, request.user!.userId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listAttendanceSessions(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await attendanceSessionService.findAll();

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceSessionById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await attendanceSessionService.findById(request.params.id);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

