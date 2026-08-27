from fastapi import APIRouter

from app.api.v1.routes.detection import router as detection_router
from app.api.v1.routes.embeddings import router as embeddings_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.preprocessing import router as preprocessing_router

api_router = APIRouter()
api_router.include_router(detection_router, prefix="/detection", tags=["detection"])
api_router.include_router(embeddings_router, prefix="/embeddings", tags=["embeddings"])
api_router.include_router(health_router, prefix="/health", tags=["health"])
api_router.include_router(preprocessing_router, prefix="/preprocessing", tags=["preprocessing"])
