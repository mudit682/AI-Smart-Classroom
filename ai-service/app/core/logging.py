import logging

from app.config import Settings

DEFAULT_LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def configure_logging(settings: Settings) -> None:
    log_format = settings.log_format

    if log_format.lower() == "json":
        log_format = DEFAULT_LOG_FORMAT

    logging.basicConfig(level=settings.log_level.upper(), format=log_format)
