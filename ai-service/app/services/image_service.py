from app.config import Settings


class ImageService:
    """Image ingestion and preprocessing boundary.

    Upload handling is intentionally not implemented in this phase. This service
    centralizes future image validation, storage, and preprocessing behavior.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def validate_image_payload(self, image_bytes: bytes) -> None:
        """Validate image payload size and basic file constraints."""
        raise NotImplementedError("Image payload validation is not implemented yet.")

    def store_image(self, image_bytes: bytes, destination: str) -> str:
        """Store an uploaded image and return the saved path."""
        raise NotImplementedError("Image storage is not implemented yet.")

    def preprocess_image(self, image_bytes: bytes) -> object:
        """Prepare an image for future detection or recognition pipelines."""
        raise NotImplementedError("Image preprocessing is not implemented yet.")
