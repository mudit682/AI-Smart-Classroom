from functools import lru_cache
from pathlib import Path

from pydantic import Field
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

    recognition_threshold: float = Field(default=0.65, ge=0.0, le=1.0)
    max_upload_size_mb: int = Field(default=10, ge=1)
    max_uploads: int = Field(default=10, ge=1)

    log_level: str = "INFO"
    log_format: str = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def app_name(self) -> str:
        return self.service_name

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
