from fastapi import status


class AiServiceError(Exception):
    def __init__(self, message: str, status_code: int, code: str) -> None:
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


class InvalidImageError(AiServiceError):
    def __init__(self, message: str = "Invalid image file.") -> None:
        super().__init__(message, status.HTTP_400_BAD_REQUEST, "INVALID_IMAGE")


class NoFaceDetectedError(AiServiceError):
    def __init__(self, message: str = "No face detected in the image.") -> None:
        super().__init__(message, status.HTTP_404_NOT_FOUND, "NO_FACE_DETECTED")


class InferenceError(AiServiceError):
    def __init__(self, message: str = "Face detection inference failed.") -> None:
        super().__init__(message, status.HTTP_502_BAD_GATEWAY, "RETINAFACE_INFERENCE_ERROR")
