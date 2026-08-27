from time import perf_counter

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dependencies import get_embedding_service, get_image_service
from app.embeddings import EmbeddingService
from app.schemas import EmbeddingResponse
from app.services.image_service import ImageService
from app.utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/generate", response_model=EmbeddingResponse)
async def generate_embedding(
    file: UploadFile = File(...),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    image_service: ImageService = Depends(get_image_service),
) -> EmbeddingResponse:
    started_at = perf_counter()
    logger.info("Face embedding request received filename=%s content_type=%s", file.filename, file.content_type)

    try:
        image_bytes = await file.read()
        image_service.validate_image_payload(image_bytes, file.filename, file.content_type)
        aligned_face = image_service.preprocess_image(image_bytes)
        embedding = embedding_service.generate_embedding(aligned_face)
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.info(
            "Face embedding completed model=%s dimension=%s duration_ms=%s",
            embedding_service.model_identifier,
            len(embedding),
            duration_ms,
        )

        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding),
            modelIdentifier=embedding_service.model_identifier,
        )
    except Exception:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.exception("Face embedding failed duration_ms=%s", duration_ms)
        raise
    finally:
        await file.close()
