from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DICT_CACHE_DIR = ROOT_DIR / "data" / "dictionary"
DEFAULT_LEGACY_DICT_DIR = ROOT_DIR.parent / "worker" / "dict" / "data" / "entries"
DEFAULT_LEMMATIZATION_PATH = ROOT_DIR / "lemmatization-en.txt"
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
    session_cookie_name: str = os.getenv("SESSION_COOKIE_NAME", "session")
    session_ttl_days: int = int(os.getenv("SESSION_TTL_DAYS", "7"))
    app_base_url: str = os.getenv("APP_BASE_URL", "http://127.0.0.1:8000")
    website_base_url: str = os.getenv(
        "WEBSITE_BASE_URL",
        os.getenv("NEXT_PUBLIC_SITE_URL", os.getenv("APP_BASE_URL", "http://127.0.0.1:3000")),
    )
    payment_signing_secret: str = os.getenv("PAYMENT_SIGNING_SECRET", "easy-reading-dev-secret")
    alipay_app_id: str = os.getenv("ALIPAY_APP_ID", "")
    alipay_private_key: str = os.getenv("ALIPAY_PRIVATE_KEY", "")
    alipay_public_key: str = os.getenv("ALIPAY_PUBLIC_KEY", "")
    alipay_gateway_url: str = os.getenv("ALIPAY_GATEWAY_URL", "https://openapi.alipay.com/gateway.do")
    alipay_notify_url: str = os.getenv("ALIPAY_NOTIFY_URL", "")
    alipay_return_url: str = os.getenv("ALIPAY_RETURN_URL", "")
    cors_allow_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "CORS_ALLOW_ORIGINS",
            "http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:3001,http://localhost:3001",
        ).split(",")
        if origin.strip()
    )
    cors_allow_origin_regex: str | None = os.getenv("CORS_ALLOW_ORIGIN_REGEX", r"chrome-extension://.*")
    anonymous_translation_daily_limit: int = int(os.getenv("ANONYMOUS_TRANSLATION_DAILY_LIMIT", "20"))
    anonymous_tts_daily_limit: int = int(os.getenv("ANONYMOUS_TTS_DAILY_LIMIT", "10"))
    anonymous_wordbook_limit: int = int(os.getenv("ANONYMOUS_WORDBOOK_LIMIT", "100"))
    anonymous_history_limit: int = int(os.getenv("ANONYMOUS_HISTORY_LIMIT", "10"))
    free_translation_daily_limit: int = int(os.getenv("FREE_TRANSLATION_DAILY_LIMIT", "20"))
    free_tts_daily_limit: int = int(os.getenv("FREE_TTS_DAILY_LIMIT", "10"))

    translation_provider: str = os.getenv("TRANSLATION_PROVIDER", "mock")
    translation_api_base_url: str = os.getenv("TRANSLATION_API_BASE_URL", "")
    translation_api_key: str = os.getenv("TRANSLATION_API_KEY", "")
    translation_model: str = os.getenv("TRANSLATION_MODEL", "qwen3.6-plus")
    dashscope_api_key: str = os.getenv("DASHSCOPE_API_KEY", "")
    dashscope_base_url: str = os.getenv(
        "DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
    )
    tts_model: str = os.getenv("TTS_MODEL", "qwen3-tts-flash")
    tts_voice: str = os.getenv("TTS_VOICE", "Cherry")
    tts_language_type: str = os.getenv("TTS_LANGUAGE_TYPE", "auto")
    dictionary_api_base_url: str = os.getenv(
        "DICTIONARY_API_BASE_URL", "https://api.dictionaryapi.dev/api/v2/entries/en"
    )
    news_feed_url: str = os.getenv("NEWS_FEED_URL", "https://fetch-articles.englishreader.org/articles")
    news_sync_timeout_seconds: int = int(os.getenv("NEWS_SYNC_TIMEOUT_SECONDS", "20"))
    article_extractor_url: str = os.getenv(
        "ARTICLE_EXTRACTOR_URL",
        os.getenv("NEXT_PUBLIC_ARTICLE_EXTRACTOR_URL", ""),
    )
    dictionary_cache_dir: Path = Path(os.getenv("DICTIONARY_CACHE_DIR", DEFAULT_DICT_CACHE_DIR))
    legacy_dictionary_dir: Path = Path(os.getenv("LEGACY_DICTIONARY_DIR", DEFAULT_LEGACY_DICT_DIR))
    lemmatization_path: Path = Path(os.getenv("LEMMATIZATION_PATH", DEFAULT_LEMMATIZATION_PATH))


settings = Settings()
settings.dictionary_cache_dir.mkdir(parents=True, exist_ok=True)
