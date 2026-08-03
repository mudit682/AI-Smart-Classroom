from pathlib import Path
from uuid import uuid4


def build_unique_filename(original_filename: str) -> str:
    suffix = Path(original_filename).suffix.lower()
    return f"{uuid4().hex}{suffix}"


def resolve_storage_path(base_dir: Path, filename: str) -> Path:
    return base_dir / filename
