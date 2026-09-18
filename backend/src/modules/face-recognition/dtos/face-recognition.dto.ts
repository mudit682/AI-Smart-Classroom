export interface FaceRecognitionMatchRequest {
  embedding: number[];
}

export type FaceRecognitionStatus = "MATCH" | "NO_MATCH";

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
  status: FaceRecognitionStatus;
  rejectionReason?: string;
}

export interface FaceRecognitionProcessImageResponse {
  totalDetectedFaces: number;
  processedFaces: number;
  rejectedFaces: number;
  results: FaceRecognitionImageResult[];
}

export type ClassroomRecognitionView = "left" | "center" | "right";

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
  recognition: ClassroomRecognitionResponse;
}
