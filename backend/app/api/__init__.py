from .patients import router as patients_router
from .records import router as records_router
from .predictions import router as predictions_router

__all__ = ["patients_router", "records_router", "predictions_router"]
