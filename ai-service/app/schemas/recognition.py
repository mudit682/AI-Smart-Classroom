from pydantic import BaseModel

from app.schemas.detection import BoundingBox


class ProcessedFaceEmbedding(BaseModel):
    faceIndex: int
    confidence: float
    boundingBox: BoundingBox
    embedding: list[float]
    embeddingDimension: int
    modelIdentifier: str


class RejectedFace(BaseModel):
    faceIndex: int
    confidence: float
    boundingBox: BoundingBox
    reason: str


class ProcessImageResponse(BaseModel):
    totalDetectedFaces: int
    processedFaces: int
    rejectedFaces: int
    faces: list[ProcessedFaceEmbedding]
    rejections: list[RejectedFace]
