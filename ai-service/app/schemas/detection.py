from pydantic import BaseModel, Field


class DetectionRequest(BaseModel):
    filename: str = Field(..., description="Uploaded image filename.")
    content_type: str = Field(..., description="Uploaded image content type.")


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class Landmarks(BaseModel):
    leftEye: list[float]
    rightEye: list[float]
    nose: list[float]
    mouthLeft: list[float]
    mouthRight: list[float]


class DetectedFace(BaseModel):
    confidence: float
    boundingBox: BoundingBox
    landmarks: Landmarks


class DetectionResponse(BaseModel):
    facesDetected: int
    faces: list[DetectedFace]
