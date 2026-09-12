from time import perf_counter

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dependencies import (
    get_embedding_service,
    get_face_detector,
    get_face_preprocessing_service,
    get_image_service,
)
from app.core.exceptions import AiServiceError, InvalidImageError
from app.detection import FaceDetector
from app.embeddings import EmbeddingService
from app.schemas import ProcessImageResponse, ProcessedFaceEmbedding, RejectedFace
from app.services.face_preprocessing_service import FacePreprocessingService
from app.services.image_service import ImageService
from app.utils.image_preprocessing import decode_image
from app.utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/process-image", response_model=ProcessImageResponse)
async def process_image(
    file: UploadFile = File(...),
    face_detector: FaceDetector = Depends(get_face_detector),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    image_service: ImageService = Depends(get_image_service),
    face_preprocessor: FacePreprocessingService = Depends(get_face_preprocessing_service),
) -> ProcessImageResponse:
    started_at = perf_counter()
    logger.info("Multi-face recognition processing request received filename=%s content_type=%s", file.filename, file.content_type)

    try:
        image_bytes = await file.read()
        image_service.validate_image_payload(image_bytes, file.filename, file.content_type)
        image = image_service.preprocess_image(image_bytes)
        detected_faces = face_detector.detect_faces(image)
        processed_faces: list[ProcessedFaceEmbedding] = []
        rejected_faces: list[RejectedFace] = []

        for face_index, detected_face in enumerate(detected_faces):
            try:
                processed_image = face_preprocessor.crop_align_and_encode(image, detected_face)
                aligned_face = decode_image(processed_image)
                embedding = embedding_service.generate_embedding(aligned_face)
                processed_faces.append(
                    ProcessedFaceEmbedding(
                        faceIndex=face_index,
                        confidence=detected_face.confidence,
                        boundingBox=detected_face.boundingBox,
                        embedding=embedding,
                        embeddingDimension=len(embedding),
                        modelIdentifier=embedding_service.model_identifier,
                    )
                )
            except AiServiceError as error:
                rejected_faces.append(
                    RejectedFace(
                        faceIndex=face_index,
                        confidence=detected_face.confidence,
                        boundingBox=detected_face.boundingBox,
                        reason=error.message,
                    )
                )
            except ValueError as error:
                rejected_faces.append(
                    RejectedFace(
                        faceIndex=face_index,
                        confidence=detected_face.confidence,
                        boundingBox=detected_face.boundingBox,
                        reason=str(error),
                    )
                )

        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.info(
            "Multi-face recognition processing completed detected=%s processed=%s rejected=%s duration_ms=%s",
            len(detected_faces),
            len(processed_faces),
            len(rejected_faces),
            duration_ms,
        )

        return ProcessImageResponse(
            totalDetectedFaces=len(detected_faces),
            processedFaces=len(processed_faces),
            rejectedFaces=len(rejected_faces),
            faces=processed_faces,
            rejections=rejected_faces,
        )
    except InvalidImageError:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.exception("Multi-face recognition processing rejected invalid image duration_ms=%s", duration_ms)
        raise
    except Exception:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.exception("Multi-face recognition processing failed duration_ms=%s", duration_ms)
        raise
    finally:
        await file.close()
