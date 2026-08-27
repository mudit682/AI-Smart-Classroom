from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "VisionClass AI Service"
    service_version: str = "1.0.0"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:5000"

    upload_dir: Path = Path("uploads")
    model_dir: Path = Path("models")
    embedding_dir: Path = Path("embeddings")
    retinaface_onnx_model_path: Path = Path("models/retinaface.onnx")
    retinaface_input_size: str = "640,640"
    detection_confidence_threshold: float = Field(default=0.6, ge=0.0, le=1.0)
    detection_nms_threshold: float = Field(default=0.4, ge=0.0, le=1.0)
    face_preprocess_min_face_size: int = Field(default=80, ge=1)
    face_preprocess_output_size: int = Field(default=224, ge=32)

    insightface_model_name: str = "buffalo_l"
    insightface_model_root: Path = Path("models/insightface")
    insightface_recognition_model_path: Path | None = None
    insightface_providers: str = "CPUExecutionProvider"
    insightface_ctx_id: int = -1
    insightface_aligned_face_size: int = Field(default=224, ge=32)

    recognition_threshold: float = Field(default=0.65, ge=0.0, le=1.0)
    max_upload_size_mb: int = Field(default=10, ge=1)
    max_uploads: int = Field(default=10, ge=1)
    supported_image_formats: str = "jpeg,jpg,png,bmp,webp"

    log_level: str = "INFO"
    log_format: str = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def app_name(self) -> str:
        return self.service_name

    @field_validator("insightface_recognition_model_path", mode="before")
    @classmethod
    def empty_path_as_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None

        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def supported_image_format_set(self) -> set[str]:
        return {image_format.strip().lower() for image_format in self.supported_image_formats.split(",") if image_format.strip()}

    @property
    def retinaface_input_shape(self) -> tuple[int, int]:
        try:
            width, height = [int(value.strip()) for value in self.retinaface_input_size.split(",", maxsplit=1)]
        except ValueError as error:
            raise ValueError("RETINAFACE_INPUT_SIZE must use width,height format.") from error

        if width <= 0 or height <= 0:
            raise ValueError("RETINAFACE_INPUT_SIZE values must be positive integers.")

        return width, height

    @property
    def insightface_provider_list(self) -> list[str]:
        return [provider.strip() for provider in self.insightface_providers.split(",") if provider.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
