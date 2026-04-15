from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = ROOT_DIR / "data" / "easy_reading.db"
DEFAULT_DICT_CACHE_DIR = ROOT_DIR / "data" / "dictionary"
DEFAULT_LEGACY_DICT_DIR = ROOT_DIR.parent / "worker" / "dict" / "data" / "entries"
DEFAULT_ENV_PATH = ROOT_DIR / ".env"


def load_dotenv_file(env_path: Path, *, override: bool = True) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if not key:
            continue

        if value and len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]

        if override or key not in os.environ:
            os.environ[key] = value


load_dotenv_file(DEFAULT_ENV_PATH, override=True)


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "")
    database_path: Path = Path(os.getenv("DATABASE_PATH", DEFAULT_DB_PATH))
    session_cookie_name: str = os.getenv("SESSION_COOKIE_NAME", "session")
    session_ttl_days: int = int(os.getenv("SESSION_TTL_DAYS", "7"))
    app_base_url: str = os.getenv("APP_BASE_URL", "http://127.0.0.1:8000")
    cors_allow_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "CORS_ALLOW_ORIGINS",
            "http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:3001,http://localhost:3001",
        ).split(",")
        if origin.strip()
    )
    cors_allow_origin_regex: str | None = os.getenv("CORS_ALLOW_ORIGIN_REGEX", r"chrome-extension://.*")

    translation_provider: str = os.getenv("TRANSLATION_PROVIDER", "mock")
    translation_api_base_url: str = os.getenv("TRANSLATION_API_BASE_URL", "")
    translation_api_key: str = os.getenv("TRANSLATION_API_KEY", "")
    translation_model: str = os.getenv("TRANSLATION_MODEL", "qwen3.6-plus")
    dashscope_api_key: str = os.getenv("DASHSCOPE_API_KEY", "")
    dashscope_base_url: str = os.getenv(
        "DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
    )
    dictionary_api_base_url: str = os.getenv(
        "DICTIONARY_API_BASE_URL", "https://api.dictionaryapi.dev/api/v2/entries/en"
    )
    dictionary_cache_dir: Path = Path(os.getenv("DICTIONARY_CACHE_DIR", DEFAULT_DICT_CACHE_DIR))
    legacy_dictionary_dir: Path = Path(os.getenv("LEGACY_DICTIONARY_DIR", DEFAULT_LEGACY_DICT_DIR))


settings = Settings()
if not settings.database_url:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
settings.dictionary_cache_dir.mkdir(parents=True, exist_ok=True)
