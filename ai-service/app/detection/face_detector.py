from pathlib import Path
from typing import Any

from app.config import Settings
from app.core.exceptions import InferenceError, NoFaceDetectedError
from app.schemas import BoundingBox, DetectedFace, Landmarks
from app.utils.logging import get_logger

logger = get_logger(__name__)


class FaceDetector:
    """ONNX Runtime RetinaFace detector.

    The detector maintains the existing service interface while loading the ONNX
    model once and reusing the same InferenceSession for all detection requests.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._session: Any | None = None
        self._input_name: str | None = None
        self._input_width, self._input_height = settings.retinaface_input_shape
        self._load_error: Exception | None = None

    def load_model(self) -> None:
        """Load the RetinaFace ONNX model into a reusable ONNX Runtime session."""
        if self._session is not None:
            return

        model_path = self._resolve_model_path(self.settings.retinaface_onnx_model_path)

        if not model_path.exists():
            self._load_error = FileNotFoundError(f"RetinaFace ONNX model was not found at {model_path}.")
            logger.warning("%s", self._load_error)
            return

        try:
            import onnxruntime as ort

            self._session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
            self._input_name = self._session.get_inputs()[0].name
            self._load_error = None
            logger.info("RetinaFace ONNX model loaded path=%s provider=CPUExecutionProvider", model_path)
        except Exception as error:
            self._load_error = error
            raise InferenceError("Unable to initialize RetinaFace ONNX model.") from error

    def detect_faces(self, image: object) -> list[DetectedFace]:
        """Detect faces in an image and return bounding boxes, confidence, and landmarks."""
        if self._session is None:
            self.load_model()

        if self._session is None or self._input_name is None:
            raise InferenceError("RetinaFace ONNX model is not available.") from self._load_error

        try:
            original_shape, input_tensor = self._preprocess(image)
            outputs = self._session.run(None, {self._input_name: input_tensor})
            faces = self._postprocess(outputs, original_shape)
        except (InferenceError, NoFaceDetectedError):
            raise
        except Exception as error:
            raise InferenceError("RetinaFace ONNX inference failed.") from error

        if not faces:
            raise NoFaceDetectedError()

        return faces

    def _preprocess(self, image: object) -> tuple[tuple[int, int], Any]:
        import cv2
        import numpy as np

        if not isinstance(image, np.ndarray) or image.size == 0:
            raise InferenceError("Detector received an invalid image array.")

        original_height, original_width = image.shape[:2]
        resized_image = cv2.resize(image, (self._input_width, self._input_height), interpolation=cv2.INTER_LINEAR)
        input_tensor = resized_image.astype(np.float32)
        input_tensor -= np.array([104.0, 117.0, 123.0], dtype=np.float32)
        input_tensor = np.transpose(input_tensor, (2, 0, 1))
        input_tensor = np.expand_dims(input_tensor, axis=0)

        return (original_width, original_height), input_tensor

    def _postprocess(self, outputs: list[Any], original_shape: tuple[int, int]) -> list[DetectedFace]:
        import numpy as np

        if len(outputs) < 3:
            return self._postprocess_direct_outputs(outputs, original_shape)

        loc, conf, landms = [np.squeeze(output, axis=0) if getattr(output, "ndim", 0) == 3 else output for output in outputs[:3]]

        priors = self._generate_priors()
        boxes = self._decode_boxes(loc, priors)
        landmarks = self._decode_landmarks(landms, priors)
        scores = self._extract_scores(conf)

        keep_mask = scores >= self.settings.detection_confidence_threshold
        boxes = boxes[keep_mask]
        landmarks = landmarks[keep_mask]
        scores = scores[keep_mask]

        if boxes.size == 0:
            raise NoFaceDetectedError()

        boxes = self._scale_boxes(boxes, original_shape)
        landmarks = self._scale_landmarks(landmarks, original_shape)
        keep_indices = self._nms(boxes, scores)

        return [
            self._to_detected_face(boxes[index], landmarks[index], float(scores[index]))
            for index in keep_indices
        ]

    def _postprocess_direct_outputs(self, outputs: list[Any], original_shape: tuple[int, int]) -> list[DetectedFace]:
        import numpy as np

        if len(outputs) < 2:
            raise InferenceError("Unexpected RetinaFace ONNX output shape.")

        boxes = np.asarray(outputs[0]).reshape(-1, 4)
        scores = np.asarray(outputs[1]).reshape(-1)
        landmarks = np.asarray(outputs[2]).reshape(-1, 10) if len(outputs) > 2 else np.zeros((boxes.shape[0], 10))

        keep_mask = scores >= self.settings.detection_confidence_threshold
        boxes = boxes[keep_mask]
        landmarks = landmarks[keep_mask]
        scores = scores[keep_mask]

        if boxes.size == 0:
            raise NoFaceDetectedError()

        if boxes.max(initial=0) <= 1.5:
            boxes = self._scale_boxes(boxes, original_shape)
            landmarks = self._scale_landmarks(landmarks, original_shape)

        keep_indices = self._nms(boxes, scores)

        return [
            self._to_detected_face(boxes[index], landmarks[index], float(scores[index]))
            for index in keep_indices
        ]

    def _generate_priors(self) -> Any:
        import numpy as np

        min_sizes = ((16, 32), (64, 128), (256, 512))
        steps = (8, 16, 32)
        priors: list[list[float]] = []

        for min_size_group, step in zip(min_sizes, steps, strict=True):
            feature_map_height = int((self._input_height + step - 1) // step)
            feature_map_width = int((self._input_width + step - 1) // step)

            for y in range(feature_map_height):
                for x in range(feature_map_width):
                    for min_size in min_size_group:
                        priors.append(
                            [
                                (x + 0.5) * step / self._input_width,
                                (y + 0.5) * step / self._input_height,
                                min_size / self._input_width,
                                min_size / self._input_height,
                            ]
                        )

        return np.asarray(priors, dtype=np.float32)

    def _decode_boxes(self, loc: Any, priors: Any) -> Any:
        import numpy as np

        variances = (0.1, 0.2)
        boxes = np.concatenate(
            (
                priors[:, :2] + loc[:, :2] * variances[0] * priors[:, 2:],
                priors[:, 2:] * np.exp(loc[:, 2:] * variances[1]),
            ),
            axis=1,
        )
        boxes[:, :2] -= boxes[:, 2:] / 2
        boxes[:, 2:] += boxes[:, :2]

        return boxes

    def _decode_landmarks(self, landms: Any, priors: Any) -> Any:
        import numpy as np

        variances = (0.1, 0.2)

        return np.concatenate(
            (
                priors[:, :2] + landms[:, 0:2] * variances[0] * priors[:, 2:],
                priors[:, :2] + landms[:, 2:4] * variances[0] * priors[:, 2:],
                priors[:, :2] + landms[:, 4:6] * variances[0] * priors[:, 2:],
                priors[:, :2] + landms[:, 6:8] * variances[0] * priors[:, 2:],
                priors[:, :2] + landms[:, 8:10] * variances[0] * priors[:, 2:],
            ),
            axis=1,
        )

    def _extract_scores(self, conf: Any) -> Any:
        if len(conf.shape) == 2 and conf.shape[1] > 1:
            return conf[:, 1]

        return conf.reshape(-1)

    def _scale_boxes(self, boxes: Any, original_shape: tuple[int, int]) -> Any:
        import numpy as np

        original_width, original_height = original_shape
        scale = np.asarray([original_width, original_height, original_width, original_height], dtype=np.float32)

        return boxes * scale

    def _scale_landmarks(self, landmarks: Any, original_shape: tuple[int, int]) -> Any:
        import numpy as np

        original_width, original_height = original_shape
        scale = np.asarray(
            [
                original_width,
                original_height,
                original_width,
                original_height,
                original_width,
                original_height,
                original_width,
                original_height,
                original_width,
                original_height,
            ],
            dtype=np.float32,
        )

        return landmarks * scale

    def _nms(self, boxes: Any, scores: Any) -> list[int]:
        import numpy as np

        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = boxes[:, 2]
        y2 = boxes[:, 3]
        areas = np.maximum(0, x2 - x1 + 1) * np.maximum(0, y2 - y1 + 1)
        order = scores.argsort()[::-1]
        keep: list[int] = []

        while order.size > 0:
            index = int(order[0])
            keep.append(index)

            xx1 = np.maximum(x1[index], x1[order[1:]])
            yy1 = np.maximum(y1[index], y1[order[1:]])
            xx2 = np.minimum(x2[index], x2[order[1:]])
            yy2 = np.minimum(y2[index], y2[order[1:]])

            width = np.maximum(0.0, xx2 - xx1 + 1)
            height = np.maximum(0.0, yy2 - yy1 + 1)
            intersection = width * height
            overlap = intersection / (areas[index] + areas[order[1:]] - intersection)
            remaining = np.where(overlap <= self.settings.detection_nms_threshold)[0]
            order = order[remaining + 1]

        return keep

    def _to_detected_face(self, box: Any, landmarks: Any, confidence: float) -> DetectedFace:
        x1, y1, x2, y2 = [int(round(float(value))) for value in box]

        return DetectedFace(
            confidence=round(confidence, 6),
            boundingBox=BoundingBox(x=x1, y=y1, width=max(x2 - x1, 0), height=max(y2 - y1, 0)),
            landmarks=Landmarks(
                leftEye=self._point(landmarks[0:2]),
                rightEye=self._point(landmarks[2:4]),
                nose=self._point(landmarks[4:6]),
                mouthLeft=self._point(landmarks[6:8]),
                mouthRight=self._point(landmarks[8:10]),
            ),
        )

    def _point(self, values: Any) -> list[float]:
        return [round(float(values[0]), 3), round(float(values[1]), 3)]

    def _resolve_model_path(self, model_path: Path) -> Path:
        if model_path.is_absolute():
            return model_path

        return Path.cwd() / model_path
