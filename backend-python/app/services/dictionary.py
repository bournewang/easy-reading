from __future__ import annotations

import json
import socket
from datetime import datetime, timezone
from pathlib import Path
from urllib import request
from urllib.error import HTTPError, URLError

from ..config import settings
from ..models import DictionaryEntryModel
from .translation import translation_service


def _pick_non_empty_strings(values: list[str] | None = None) -> list[str]:
    values = values or []
    seen: list[str] = []
    for value in values:
        if isinstance(value, str) and value.strip() and value not in seen:
            seen.append(value)
    return seen


class DictionaryFetchError(ValueError):
    def __init__(self, message: str, *, details: dict | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


class DictionaryService:
    def _cache_path(self, word: str) -> Path:
        return Path(settings.dictionary_cache_dir) / f"{word}.json"

    def list_words(self) -> list[str]:
        return sorted(path.stem for path in Path(settings.dictionary_cache_dir).glob("*.json"))

    def get_entry(self, word: str) -> dict | None:
        cache_path = self._cache_path(word)
        if cache_path.exists():
            with cache_path.open("r", encoding="utf-8") as handle:
                return json.load(handle)

        if not cache_path.exists():
            legacy = self._get_legacy_entry(word)
            if legacy:
                self.save_entry(word, legacy)
                return legacy
            return None
        return None

    def save_entry(self, word: str, payload: dict) -> None:
        cache_path = self._cache_path(word)
        with cache_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)

    def sync_word(self, word: str, force: bool = False, debug: bool = False) -> DictionaryEntryModel:
        normalized_word = (word or "").strip().lower()
        if not normalized_word:
            raise ValueError("Word is required.")

        if not force:
            existing = self.get_entry(normalized_word)
            if existing:
                return DictionaryEntryModel.model_validate(existing)

        source_entries = self._fetch_dictionary_entries(normalized_word, debug=debug)
        normalized_entry = self._normalize_entries(source_entries)
        texts = self._collect_translatable_texts(normalized_entry)
        try:
            translations = translation_service.translate_batch(texts, "Simplified Chinese")
            translation_provider = settings.translation_provider
        except Exception as exc:
            translations = {}
            translation_provider = f"{settings.translation_provider}:failed"
            normalized_entry.setdefault("meta", {})
            normalized_entry["meta"]["translationError"] = str(exc)
        bilingual_entry = self._apply_translations(normalized_entry, translations)
        bilingual_entry["meta"] = {
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
            "translationProvider": translation_provider,
            **(normalized_entry.get("meta") or {}),
        }
        self.save_entry(normalized_word, bilingual_entry)
        return DictionaryEntryModel.model_validate(bilingual_entry)

    def _fetch_dictionary_entries(self, word: str, debug: bool = False) -> list[dict]:
        upstream_url = f"{settings.dictionary_api_base_url.rstrip('/')}/{word}"
        debug_context = {
            "word": word,
            "upstreamUrl": upstream_url,
            "cachePath": str(self._cache_path(word)),
            "legacyPath": str(Path(settings.legacy_dictionary_dir) / f"{word}.json"),
            "dictionaryApiBaseUrl": settings.dictionary_api_base_url,
        }
        try:
            print(f"[dictionary] fetching word='{word}' url='{upstream_url}'")
            req = request.Request(
                upstream_url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                    "Accept": "application/json,text/plain,*/*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://dictionaryapi.dev/",
                    "Origin": "https://dictionaryapi.dev",
                },
                method="GET",
            )
            with request.urlopen(req, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            try:
                response_body = exc.read().decode("utf-8", errors="replace")
            except Exception:
                response_body = None
            details = {
                **debug_context,
                "errorType": "HTTPError",
                "statusCode": exc.code,
                "reason": getattr(exc, "reason", None),
                "responseBody": response_body,
            }
            print(f"[dictionary] http error: {json.dumps(details, ensure_ascii=False)}")
            raise DictionaryFetchError(
                f"Dictionary upstream returned HTTP {exc.code} for '{word}'.",
                details=details,
            ) from exc
        except URLError as exc:
            legacy = self._get_legacy_entry(word)
            if legacy:
                return [legacy]
            details = {
                **debug_context,
                "errorType": "URLError",
                "reason": str(exc.reason),
                "socketHostnameCheck": self._resolve_hostname(upstream_url),
            }
            print(f"[dictionary] url error: {json.dumps(details, ensure_ascii=False)}")
            raise DictionaryFetchError(
                f"Dictionary upstream is unreachable for '{word}': {exc.reason}.",
                details=details,
            ) from exc

    def _resolve_hostname(self, upstream_url: str) -> dict:
        try:
            host = upstream_url.split("://", 1)[-1].split("/", 1)[0]
            answers = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
            return {
                "host": host,
                "resolved": True,
                "addresses": sorted({item[4][0] for item in answers}),
            }
        except Exception as exc:
            return {
                "host": upstream_url.split("://", 1)[-1].split("/", 1)[0],
                "resolved": False,
                "error": str(exc),
            }

    def _get_legacy_entry(self, word: str) -> dict | None:
        legacy_path = Path(settings.legacy_dictionary_dir) / f"{word}.json"
        if not legacy_path.exists():
            return None

        with legacy_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _normalize_entries(self, entries: list[dict]) -> dict:
        if not entries:
            raise ValueError("Dictionary API returned no entries.")

        first_entry = entries[0]
        phonetics: list[dict] = []
        meanings: list[dict] = []
        source_urls = _pick_non_empty_strings(
            [url for entry in entries for url in entry.get("sourceUrls", [])]
        )

        for entry in entries:
            for phonetic in entry.get("phonetics", []):
                next_phonetic = {
                    "text": phonetic.get("text"),
                    "audio": phonetic.get("audio"),
                    "sourceUrl": phonetic.get("sourceUrl"),
                    "license": phonetic.get("license"),
                }
                if not any(
                    item.get("text") == next_phonetic.get("text") and item.get("audio") == next_phonetic.get("audio")
                    for item in phonetics
                ):
                    phonetics.append(next_phonetic)

            for meaning in entry.get("meanings", []):
                meanings.append(
                    {
                        "partOfSpeech": meaning.get("partOfSpeech"),
                        "synonyms": _pick_non_empty_strings(meaning.get("synonyms")),
                        "antonyms": _pick_non_empty_strings(meaning.get("antonyms")),
                        "definitions": [
                            {
                                "definition": definition.get("definition", ""),
                                "example": definition.get("example"),
                                "synonyms": _pick_non_empty_strings(definition.get("synonyms")),
                                "antonyms": _pick_non_empty_strings(definition.get("antonyms")),
                            }
                            for definition in meaning.get("definitions", [])
                        ],
                    }
                )

        return {
            "word": first_entry.get("word", ""),
            "phonetics": phonetics,
            "meanings": meanings,
            "sourceUrls": source_urls,
        }

    def _collect_translatable_texts(self, entry: dict) -> list[str]:
        seen: list[str] = []
        for meaning in entry["meanings"]:
            for definition in meaning["definitions"]:
                text = definition.get("definition", "").strip()
                if text and text not in seen:
                    seen.append(text)
        return seen

    def _apply_translations(self, entry: dict, translations: dict[str, str]) -> dict:
        for meaning in entry["meanings"]:
            for definition in meaning["definitions"]:
                source = definition.get("definition", "")
                translated = translations.get(source)
                definition["definition_zh"] = translated
                definition["translation"] = translated
        return entry


dictionary_service = DictionaryService()
