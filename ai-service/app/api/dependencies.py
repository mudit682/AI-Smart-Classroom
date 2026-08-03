from functools import lru_cache

from app.config import Settings, get_settings
from app.detection import FaceDetector
from app.embeddings import EmbeddingService
from app.recognition import FaceRecognizer
from app.services.image_service import ImageService


def get_app_settings() -> Settings:
    return get_settings()


@lru_cache
def get_face_detector() -> FaceDetector:
    return FaceDetector(get_app_settings())


@lru_cache
def get_face_recognizer() -> FaceRecognizer:
    return FaceRecognizer(get_app_settings())


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService(get_app_settings())


@lru_cache
def get_image_service() -> ImageService:
    return ImageService(get_app_settings())
