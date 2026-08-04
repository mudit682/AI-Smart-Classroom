from time import perf_counter

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dependencies import get_face_detector, get_image_service
from app.detection import FaceDetector
from app.schemas import DetectionResponse
from app.services.image_service import ImageService
from app.utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/detect", response_model=DetectionResponse)
async def detect_faces(
    file: UploadFile = File(...),
    face_detector: FaceDetector = Depends(get_face_detector),
    image_service: ImageService = Depends(get_image_service),
) -> DetectionResponse:
    started_at = perf_counter()
    logger.info("Face detection request received filename=%s content_type=%s", file.filename, file.content_type)

    try:
        image_bytes = await file.read()
        image_service.validate_image_payload(image_bytes, file.filename, file.content_type)
        image = image_service.preprocess_image(image_bytes)
        faces = face_detector.detect_faces(image)
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.info("Face detection completed faces=%s duration_ms=%s", len(faces), duration_ms)

        return DetectionResponse(facesDetected=len(faces), faces=faces)
    except Exception:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.exception("Face detection failed duration_ms=%s", duration_ms)
        raise
    finally:
        await file.close()
