from app.config import Settings
from app.core.exceptions import InvalidImageError
from app.schemas import DetectedFace


class FacePreprocessingService:
    """Reusable crop, alignment, and quality validation for enrollment faces."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def crop_align_and_encode(self, image: object, face: DetectedFace) -> bytes:
        import cv2
        import numpy as np

        if not isinstance(image, np.ndarray) or image.size == 0:
            raise InvalidImageError("Image is invalid or empty.")

        self._validate_face_size(face)
        crop, crop_origin = self._crop_face_region(image, face)
        source_landmarks = self._get_crop_relative_landmarks(face, crop_origin)
        target_landmarks = self._get_target_landmarks()
        transform = self._estimate_similarity_transform(source_landmarks, target_landmarks)
        output_size = self.settings.face_preprocess_output_size
        processed_face = cv2.warpAffine(
            crop,
            transform,
            (output_size, output_size),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE,
        )

        if processed_face.size == 0:
            raise InvalidImageError("Processed face crop is invalid.")

        self._validate_processed_image(processed_face)
        success, encoded = cv2.imencode(".jpg", processed_face, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

        if not success or encoded.size == 0:
            raise InvalidImageError("Processed face image could not be encoded.")

        return encoded.tobytes()

    def _validate_face_size(self, face: DetectedFace) -> None:
        box = face.boundingBox

        if box.width < self.settings.face_preprocess_min_face_size or box.height < self.settings.face_preprocess_min_face_size:
            raise InvalidImageError("Detected face is too small for enrollment.")

    def _crop_face_region(self, image: object, face: DetectedFace):
        import numpy as np

        box = face.boundingBox
        x1 = float(box.x)
        y1 = float(box.y)
        x2 = float(box.x + box.width)
        y2 = float(box.y + box.height)
        margin = 0.25 * max(box.width, box.height)
        height, width = image.shape[:2]
        crop_x1 = max(int(np.floor(x1 - margin)), 0)
        crop_y1 = max(int(np.floor(y1 - margin)), 0)
        crop_x2 = min(int(np.ceil(x2 + margin)), width)
        crop_y2 = min(int(np.ceil(y2 + margin)), height)

        if crop_x2 <= crop_x1 or crop_y2 <= crop_y1:
            raise InvalidImageError("Processed face crop bounds are invalid.")

        crop = image[crop_y1:crop_y2, crop_x1:crop_x2]

        if crop.size == 0:
            raise InvalidImageError("Processed face crop is invalid.")

        crop_height, crop_width = crop.shape[:2]

        if crop_width < self.settings.face_preprocess_min_face_size or crop_height < self.settings.face_preprocess_min_face_size:
            raise InvalidImageError("Processed face crop is too small.")

        return crop, np.asarray([crop_x1, crop_y1], dtype=np.float32)

    def _get_crop_relative_landmarks(self, face: DetectedFace, crop_origin: object):
        import numpy as np

        landmarks = np.asarray(
            [
                face.landmarks.leftEye,
                face.landmarks.rightEye,
                face.landmarks.nose,
                face.landmarks.mouthLeft,
                face.landmarks.mouthRight,
            ],
            dtype=np.float32,
        )

        return landmarks - crop_origin

    def _get_target_landmarks(self):
        import numpy as np

        output_size = float(self.settings.face_preprocess_output_size)
        scale = output_size / 112.0

        return np.asarray(
            [
                [38.2946, 51.6963],
                [73.5318, 51.5014],
                [56.0252, 71.7366],
                [41.5493, 92.3655],
                [70.7299, 92.2041],
            ],
            dtype=np.float32,
        ) * scale

    def _estimate_similarity_transform(self, source_landmarks: object, target_landmarks: object):
        import cv2

        transform, _inliers = cv2.estimateAffinePartial2D(
            source_landmarks,
            target_landmarks,
            method=cv2.LMEDS,
        )

        if transform is None:
            raise InvalidImageError("Face alignment transform could not be estimated.")

        return transform

    def _validate_processed_image(self, processed_face: object) -> None:
        import numpy as np

        if not isinstance(processed_face, np.ndarray) or processed_face.size == 0:
            raise InvalidImageError("Processed face image is invalid.")

        output_size = self.settings.face_preprocess_output_size
        height, width = processed_face.shape[:2]

        if width != output_size or height != output_size:
            raise InvalidImageError("Processed face image has invalid dimensions.")

        if not np.isfinite(processed_face).all():
            raise InvalidImageError("Processed face image contains invalid pixel values.")
