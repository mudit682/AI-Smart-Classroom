export interface FaceRecognitionMatchRequest {
  embedding: number[];
}

export type FaceRecognitionStatus = "MATCH" | "NO_MATCH";
export type FaceRecognitionImageStatus = FaceRecognitionStatus | "REJECTED";

export interface FaceRecognitionMatchResponse {
  matched: boolean;
  status: FaceRecognitionStatus;
  studentId: string | null;
  similarityScore: number;
  threshold: number;
}

export interface FaceRecognitionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceRecognitionImageResult {
  faceIndex: number;
  boundingBox: FaceRecognitionBoundingBox;
  detectionConfidence: number;
  studentId: string | null;
  similarityScore: number;
  status: FaceRecognitionImageStatus;
  rejectionReason?: string;
}

export interface FaceRecognitionProcessImageResponse {
  totalDetectedFaces: number;
  processedFaces: number;
  rejectedFaces: number;
  results: FaceRecognitionImageResult[];
}

export type ClassroomRecognitionView = "left" | "center" | "right";
export type ClassroomRecognitionProcessingStatus = "PROCESSED" | "NO_FACE_DETECTED" | "REJECTED";

export interface ClassroomRecognitionSource {
  view: ClassroomRecognitionView;
  faceIndex: number;
  boundingBox: FaceRecognitionBoundingBox;
  detectionConfidence: number;
}

export interface ClassroomRecognitionStudent {
  studentId: string;
  similarityScore: number;
  source: ClassroomRecognitionSource;
}

export interface ClassroomRecognitionFaceResult extends FaceRecognitionImageResult {
  view: ClassroomRecognitionView;
}

export interface ClassroomRecognitionImageResult {
  view: ClassroomRecognitionView;
  captured: boolean;
  processingStatus: ClassroomRecognitionProcessingStatus;
  totalDetectedFaces: number;
  processedFaces: number;
  rejectedFaces: number;
  results: ClassroomRecognitionFaceResult[];
}

export interface ClassroomRecognitionResponse {
  recognizedStudents: ClassroomRecognitionStudent[];
  recognizedStudentCount: number;
  totalDetectedFaces: number;
  processedFaces: number;
  rejectedFaces: number;
  images: ClassroomRecognitionImageResult[];
}

export interface AttendanceSessionRecognitionRequest {
  attendanceSessionId?: string;
  lectureScheduleId?: string;
  sessionDate?: string;
}

export interface AttendanceSessionRecognitionResponse {
  attendanceSessionId: string;
  totalRecognizedStudents: number;
  attendance: AttendanceMarkingResponse;
  recognition: ClassroomRecognitionResponse;
  capture: AttendanceRecognitionCaptureState;
}

export interface AttendanceRecognitionCaptureViewState {
  view: ClassroomRecognitionView;
  captured: boolean;
  processingStatus: ClassroomRecognitionProcessingStatus;
  totalDetectedFaces: number;
  processedFaces: number;
  rejectedFaces: number;
}

export interface AttendanceRecognitionCaptureState {
  capturedViews: ClassroomRecognitionView[];
  processedViews: ClassroomRecognitionView[];
  noFaceDetectedViews: ClassroomRecognitionView[];
  rejectedViews: ClassroomRecognitionView[];
  views: AttendanceRecognitionCaptureViewState[];
}

export type AttendanceMarkingStatus = "MARKED" | "ALREADY_MARKED" | "NOT_ENROLLED";

export interface AttendanceMarkingResult {
  studentId: string;
  status: AttendanceMarkingStatus;
  similarityScore: number;
  source: ClassroomRecognitionSource;
  attendanceRecordId?: string;
  reason?: string;
}

export interface AttendanceMarkingResponse {
  markedCount: number;
  alreadyMarkedCount: number;
  notEnrolledCount: number;
  results: AttendanceMarkingResult[];
}
