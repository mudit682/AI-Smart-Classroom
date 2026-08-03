from app.config import Settings


class EmbeddingService:
    """Embedding workflow boundary for future face enrollment and matching.

    Future phases can generate, persist, version, and compare embeddings here.
    The current implementation only defines the contract.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def generate_embedding(self, image_bytes: bytes) -> list[float]:
        """Generate a face embedding from an enrolled face image."""
        raise NotImplementedError("Embedding generation is not implemented yet.")

    def save_embedding(self, student_id: str, embedding: list[float], version: str) -> str:
        """Persist a generated embedding and return its storage path or identifier."""
        raise NotImplementedError("Embedding persistence is not implemented yet.")

    def load_embedding(self, student_id: str, version: str | None = None) -> list[float]:
        """Load a stored embedding for recognition workflows."""
        raise NotImplementedError("Embedding loading is not implemented yet.")
