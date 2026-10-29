import { isAxiosError } from "axios";
import { apiClient } from "../../lib/http/apiClient";

export type ClassroomView = "left" | "center" | "right";

export interface AttendanceSession {
  id: string;
  lectureSchedule: {
    academicYear: string;
    semester: string;
    startTime: string;
    endTime: string;
  };
  classroom: {
    name: string;
    section: string;
  };
  subject: {
    name: string;
    subjectCode: string;
  };
  sessionDate: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  recognitionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  recognizedStudents: number;
  absentStudents: number;
  totalStudents: number;
}

interface AttendanceSessionListResponse {
  attendanceSessions: AttendanceSession[];
}

export interface AttendanceCaptureResponse {
  attendanceSessionId: string;
  totalRecognizedStudents: number;
  attendance: {
    markedCount: number;
    alreadyMarkedCount: number;
    notEnrolledCount: number;
  };
  capture: {
    capturedViews: ClassroomView[];
    processedViews: ClassroomView[];
    noFaceDetectedViews: ClassroomView[];
    rejectedViews: ClassroomView[];
  };
}

export interface AttendanceCaptureFiles {
  left: File;
  center: File;
  right: File;
}

export async function getAvailableAttendanceSessions(): Promise<AttendanceSession[]> {
  const response = await apiClient.get<AttendanceSessionListResponse>("/attendance-sessions");

  return response.data.attendanceSessions.filter(
    (session) =>
      session.status === "ACTIVE" &&
      (session.recognitionStatus === "PENDING" || session.recognitionStatus === "FAILED")
  );
}

export async function getTeacherAttendanceHistory(): Promise<AttendanceSession[]> {
  const response = await apiClient.get<AttendanceSessionListResponse>("/attendance-sessions/history");

  return response.data.attendanceSessions;
}

export async function processAttendanceCapture(
  attendanceSessionId: string,
  files: AttendanceCaptureFiles
): Promise<AttendanceCaptureResponse> {
  const formData = new FormData();

  formData.append("attendanceSessionId", attendanceSessionId);
  formData.append("left", files.left);
  formData.append("center", files.center);
  formData.append("right", files.right);

  const response = await apiClient.post<AttendanceCaptureResponse>("/face-recognition/attendance-session/process-classroom", formData);

  return response.data;
}

export async function getAttendanceSession(id: string): Promise<AttendanceSession> {
  const response = await apiClient.get<AttendanceSession>(`/attendance-sessions/${id}`);

  return response.data;
}

export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return error instanceof Error ? error.message : "Attendance processing could not be completed.";
}
