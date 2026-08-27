from pathlib import Path
from typing import Any

import numpy as np

from app.config import Settings
from app.core.exceptions import EmbeddingInferenceError, InvalidImageError
from app.utils import ensure_directory
from app.utils.logging import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    """Generate normalized InsightFace embeddings from aligned face crops.

    Recognition, similarity matching, and persistence intentionally remain out
    of scope for this phase.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._recognition_model: Any | None = None
        self._embedding_dimension: int | None = None
        self._model_path: Path | None = None

    @property
    def model_identifier(self) -> str:
        model_name = self._model_path.name if self._model_path is not None else self.settings.insightface_model_name
        return f"insightface/{self.settings.insightface_model_name}/{model_name}"

    @property
    def embedding_dimension(self) -> int | None:
        return self._embedding_dimension

    def load_model(self) -> None:
        """Load the InsightFace recognition model once for application lifetime."""
        if self._recognition_model is not None:
            return

        ensure_directory(self.settings.insightface_model_root)

        try:
            recognition_model = self._load_recognition_model()

            if recognition_model is None:
                raise RuntimeError("InsightFace recognition model was not loaded.")

            self._recognition_model = recognition_model
            self._embedding_dimension = self._resolve_embedding_dimension(recognition_model)
            logger.info(
                "InsightFace embedding model loaded model=%s providers=%s dimension=%s",
                self.model_identifier,
                self.settings.insightface_provider_list,
                self._embedding_dimension,
            )
        except ImportError as error:
            raise EmbeddingInferenceError("InsightFace is not installed in the AI service environment.") from error
        except Exception as error:
            raise EmbeddingInferenceError("InsightFace embedding model failed to load.") from error

    def _load_recognition_model(self) -> Any:
        from insightface.model_zoo import model_zoo
        from insightface.utils import ensure_available

        model_path = self._resolve_configured_model_path()

        if model_path is not None:
            model = model_zoo.get_model(str(model_path), providers=self.settings.insightface_provider_list)
            self._model_path = model_path
        else:
            model_dir = Path(
                ensure_available(
                    "models",
                    self.settings.insightface_model_name,
                    root=str(self.settings.insightface_model_root),
                ),
            )
            model = self._find_recognition_model(model_zoo, model_dir)

        if getattr(model, "taskname", None) != "recognition":
            raise RuntimeError("Configured InsightFace model is not a recognition model.")

        model.prepare(self.settings.insightface_ctx_id)
        return model

    def _resolve_configured_model_path(self) -> Path | None:
        model_path = self.settings.insightface_recognition_model_path

        if model_path is None:
            self._model_path = None
            return None

        if not model_path.exists() or not model_path.is_file():
            raise FileNotFoundError(f"InsightFace recognition model not found: {model_path}")

        return model_path

    def _find_recognition_model(self, model_zoo: Any, model_dir: Path) -> Any:
        for onnx_file in sorted(model_dir.glob("*.onnx")):
            model = model_zoo.get_model(str(onnx_file), providers=self.settings.insightface_provider_list)

            if getattr(model, "taskname", None) == "recognition":
                self._model_path = onnx_file
                return model

        raise RuntimeError(f"No InsightFace recognition model found in {model_dir}.")

    def generate_embedding(self, aligned_face: np.ndarray) -> list[float]:
        """Generate an L2-normalized embedding from one aligned face image."""
        self._validate_aligned_face(aligned_face)
        self.load_model()

        try:
            embedding = self._recognition_model.get_feat(aligned_face)
            embedding_array = np.asarray(embedding, dtype=np.float32).reshape(-1)
            norm = np.linalg.norm(embedding_array)

            if embedding_array.size == 0 or not np.isfinite(embedding_array).all() or norm == 0:
                raise RuntimeError("InsightFace returned an invalid embedding.")

            normalized_embedding = embedding_array / norm
            self._embedding_dimension = int(normalized_embedding.size)

            return normalized_embedding.astype(float).tolist()
        except EmbeddingInferenceError:
            raise
        except Exception as error:
            raise EmbeddingInferenceError("InsightFace embedding generation failed.") from error

    def _validate_aligned_face(self, aligned_face: np.ndarray) -> None:
        if not isinstance(aligned_face, np.ndarray) or aligned_face.size == 0:
            raise InvalidImageError("Aligned face image is empty or unreadable.")

        if aligned_face.ndim != 3 or aligned_face.shape[2] != 3:
            raise InvalidImageError("Aligned face image must be a three-channel image.")

        expected_size = self.settings.insightface_aligned_face_size
        height, width = aligned_face.shape[:2]

        if width != expected_size or height != expected_size:
            raise InvalidImageError(f"Aligned face image must be {expected_size}x{expected_size}.")

    def _resolve_embedding_dimension(self, recognition_model: Any) -> int | None:
        output_shape = getattr(recognition_model, "output_shape", None)

        if isinstance(output_shape, (list, tuple)) and output_shape:
            last_dimension = output_shape[-1]

            if isinstance(last_dimension, int) and last_dimension > 0:
                return last_dimension

        return None

    def save_embedding(self, student_id: str, embedding: list[float], version: str) -> str:
        """Persist a generated embedding and return its storage path or identifier."""
        raise NotImplementedError("Embedding persistence is not implemented yet.")

    def load_embedding(self, student_id: str, version: str | None = None) -> list[float]:
        """Load a stored embedding for recognition workflows."""
        raise NotImplementedError("Embedding loading is not implemented yet.")
