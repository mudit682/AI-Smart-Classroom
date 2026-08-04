from io import BytesIO
from pathlib import Path

from app.config import Settings
from app.core.exceptions import InvalidImageError
from app.utils.image_preprocessing import decode_image


class ImageService:
    """Image ingestion and preprocessing boundary.

    Upload handling is intentionally not implemented in this phase. This service
    centralizes future image validation, storage, and preprocessing behavior.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def validate_image_payload(
        self,
        image_bytes: bytes,
        filename: str | None = None,
        content_type: str | None = None,
    ) -> None:
        """Validate image payload size, format, and readability before inference."""
        if not image_bytes:
            raise InvalidImageError("Image file is empty.")

        if len(image_bytes) > self.settings.max_upload_size_bytes:
            raise InvalidImageError("Image exceeds the configured maximum upload size.")

        if filename:
            suffix = Path(filename).suffix.lower().lstrip(".")

            if suffix and suffix not in self.settings.supported_image_format_set:
                raise InvalidImageError("Unsupported image format.")

        if content_type and not content_type.startswith("image/"):
            raise InvalidImageError("Uploaded file must be an image.")

        self.validate_image_format(image_bytes)

    def store_image(self, image_bytes: bytes, destination: str) -> str:
        """Store an uploaded image and return the saved path."""
        raise NotImplementedError("Image storage is not implemented yet.")

    def preprocess_image(self, image_bytes: bytes) -> object:
        """Prepare an image for future detection or recognition pipelines."""
        try:
            return decode_image(image_bytes)
        except ValueError as error:
            raise InvalidImageError("Image file is corrupted or unreadable.") from error

    def validate_image_format(self, image_bytes: bytes) -> None:
        try:
            from PIL import Image, UnidentifiedImageError

            with Image.open(BytesIO(image_bytes)) as image:
                image.verify()
                image_format = (image.format or "").lower()

            if image_format not in self.settings.supported_image_format_set:
                raise InvalidImageError("Unsupported image format.")
        except InvalidImageError:
            raise
        except (OSError, UnidentifiedImageError) as error:
            raise InvalidImageError("Image file is corrupted or unreadable.") from error
