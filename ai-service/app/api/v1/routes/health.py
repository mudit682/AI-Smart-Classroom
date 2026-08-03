from fastapi import APIRouter

from app.config import settings
from app.schemas import HealthResponse

router = APIRouter()


@router.get("", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="healthy", service=settings.service_name, version=settings.service_version)


@router.get("/", response_model=HealthResponse, include_in_schema=False)
def health_check_with_trailing_slash() -> HealthResponse:
    return health_check()
