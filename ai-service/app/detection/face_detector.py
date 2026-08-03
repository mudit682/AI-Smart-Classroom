from app.config import Settings


class FaceDetector:
    """RetinaFace-ready detector boundary.

    This class intentionally does not load RetinaFace models or run inference yet.
    Future phases can add model loading, face bounding box extraction, and
    confidence filtering behind this interface.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def load_model(self) -> None:
        """Load RetinaFace model assets from the configured model directory."""
        raise NotImplementedError("RetinaFace model loading is not implemented yet.")

    def detect_faces(self, image_bytes: bytes) -> list[dict[str, object]]:
        """Detect faces in an image and return bounding boxes and confidence metadata."""
        raise NotImplementedError("RetinaFace inference is not implemented yet.")
