from time import perf_counter

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import Response

from app.api.dependencies import get_face_detector, get_face_preprocessing_service, get_image_service
from app.core.exceptions import InvalidImageError
from app.detection import FaceDetector
from app.services.face_preprocessing_service import FacePreprocessingService
from app.services.image_service import ImageService
from app.utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/face", response_class=Response)
async def preprocess_face(
    file: UploadFile = File(...),
    face_detector: FaceDetector = Depends(get_face_detector),
    image_service: ImageService = Depends(get_image_service),
    face_preprocessor: FacePreprocessingService = Depends(get_face_preprocessing_service),
) -> Response:
    started_at = perf_counter()
    logger.info("Face preprocessing request received filename=%s content_type=%s", file.filename, file.content_type)

    try:
        image_bytes = await file.read()
        image_service.validate_image_payload(image_bytes, file.filename, file.content_type)
        image = image_service.preprocess_image(image_bytes)
        faces = face_detector.detect_faces(image)

        if len(faces) != 1:
            raise InvalidImageError("Enrollment image must contain exactly one face.")

        processed_image = face_preprocessor.crop_align_and_encode(image, faces[0])
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.info("Face preprocessing completed duration_ms=%s", duration_ms)

        return Response(
            content=processed_image,
            media_type="image/jpeg",
            headers={
                "X-Faces-Detected": "1",
                "X-Processed-Image-Format": "jpeg",
            },
        )
    except Exception:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.exception("Face preprocessing failed duration_ms=%s", duration_ms)
        raise
    finally:
        await file.close()
