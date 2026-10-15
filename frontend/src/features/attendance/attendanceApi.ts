import { isAxiosError } from "axios";
import { apiClient } from "../../lib/http/apiClient";

export type ClassroomView = "left" | "center" | "right";

interface AttendanceSession {
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
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  recognitionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}

interface AttendanceSessionListResponse {
  attendanceSessions: AttendanceSession[];
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

export async function processAttendanceCapture(
  attendanceSessionId: string,
  files: AttendanceCaptureFiles
): Promise<void> {
  const formData = new FormData();

  formData.append("attendanceSessionId", attendanceSessionId);
  formData.append("left", files.left);
  formData.append("center", files.center);
  formData.append("right", files.right);

  await apiClient.post("/face-recognition/attendance-session/process-classroom", formData);
}

export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return error instanceof Error ? error.message : "Attendance processing could not be completed.";
}
