from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import numpy as np


def decode_image(image_bytes: bytes) -> "np.ndarray":
    import cv2
    import numpy as np

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Unable to decode image bytes.")

    return image


def resize_image(image: "np.ndarray", width: int, height: int) -> "np.ndarray":
    import cv2

    return cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)
