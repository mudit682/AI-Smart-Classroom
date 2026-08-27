from pydantic import BaseModel, Field


class EmbeddingRequest(BaseModel):
    filename: str = Field(..., description="Uploaded aligned face image filename.")
    content_type: str = Field(..., description="Uploaded aligned face image content type.")


class EmbeddingResponse(BaseModel):
    embedding: list[float]
    dimension: int
    modelIdentifier: str
