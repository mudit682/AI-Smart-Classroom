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
