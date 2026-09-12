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
