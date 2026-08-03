from app.config import Settings


class FaceRecognizer:
    """InsightFace-ready recognizer boundary.

    The recognizer is a placeholder for future identity matching. It exposes the
    expected integration points without importing InsightFace or performing
    recognition during service startup.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def load_model(self) -> None:
        """Load InsightFace recognition model assets from the configured model directory."""
        raise NotImplementedError("InsightFace model loading is not implemented yet.")

    def recognize(self, image_bytes: bytes) -> list[dict[str, object]]:
        """Recognize enrolled students from a classroom image."""
        raise NotImplementedError("InsightFace recognition is not implemented yet.")

    def verify(self, embedding: list[float], candidate_embedding: list[float]) -> bool:
        """Compare two face embeddings using the configured recognition threshold."""
        raise NotImplementedError("Face verification is not implemented yet.")
