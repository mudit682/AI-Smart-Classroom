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
        aligned_image, transform = self._align_eyes(image, face)
        crop = self._crop_transformed_face(aligned_image, face, transform)

        if crop.size == 0:
            raise InvalidImageError("Processed face crop is invalid.")

        crop_height, crop_width = crop.shape[:2]

        if crop_width < self.settings.face_preprocess_min_face_size or crop_height < self.settings.face_preprocess_min_face_size:
            raise InvalidImageError("Processed face crop is too small.")

        output_size = self.settings.face_preprocess_output_size
        processed_face = cv2.resize(crop, (output_size, output_size), interpolation=cv2.INTER_AREA)
        success, encoded = cv2.imencode(".jpg", processed_face, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

        if not success or encoded.size == 0:
            raise InvalidImageError("Processed face image could not be encoded.")

        return encoded.tobytes()

    def _validate_face_size(self, face: DetectedFace) -> None:
        box = face.boundingBox

        if box.width < self.settings.face_preprocess_min_face_size or box.height < self.settings.face_preprocess_min_face_size:
            raise InvalidImageError("Detected face is too small for enrollment.")

    def _align_eyes(self, image: object, face: DetectedFace):
        import cv2
        import numpy as np

        left_eye = np.asarray(face.landmarks.leftEye, dtype=np.float32)
        right_eye = np.asarray(face.landmarks.rightEye, dtype=np.float32)
        eye_center = ((left_eye + right_eye) / 2).astype(float)
        delta = right_eye - left_eye
        angle = float(np.degrees(np.arctan2(delta[1], delta[0])))
        transform = cv2.getRotationMatrix2D(tuple(eye_center), angle, 1.0)
        height, width = image.shape[:2]
        aligned = cv2.warpAffine(image, transform, (width, height), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

        return aligned, transform

    def _crop_transformed_face(self, image: object, face: DetectedFace, transform):
        import cv2
        import numpy as np

        box = face.boundingBox
        x1 = float(box.x)
        y1 = float(box.y)
        x2 = float(box.x + box.width)
        y2 = float(box.y + box.height)
        corners = np.asarray([[[x1, y1]], [[x2, y1]], [[x2, y2]], [[x1, y2]]], dtype=np.float32)
        transformed_corners = cv2.transform(corners, transform).reshape(4, 2)
        min_x, min_y = transformed_corners.min(axis=0)
        max_x, max_y = transformed_corners.max(axis=0)
        margin = 0.2 * max(max_x - min_x, max_y - min_y)
        height, width = image.shape[:2]
        crop_x1 = max(int(np.floor(min_x - margin)), 0)
        crop_y1 = max(int(np.floor(min_y - margin)), 0)
        crop_x2 = min(int(np.ceil(max_x + margin)), width)
        crop_y2 = min(int(np.ceil(max_y + margin)), height)

        if crop_x2 <= crop_x1 or crop_y2 <= crop_y1:
            raise InvalidImageError("Processed face crop bounds are invalid.")

        return image[crop_y1:crop_y2, crop_x1:crop_x2]
