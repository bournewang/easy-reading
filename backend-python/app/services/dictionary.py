from __future__ import annotations

import copy
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
    def __init__(self) -> None:
        self._lemma_map: dict[str, str] | None = None

    def _cache_path(self, word: str) -> Path:
        return Path(settings.dictionary_cache_dir) / f"{word}.json"

    def list_words(self) -> list[str]:
        return sorted(path.stem for path in Path(settings.dictionary_cache_dir).glob("*.json"))

    def _record_debug(self, debug_trace: list[dict] | None, step: str, **data: object) -> None:
        if debug_trace is None:
            return
        debug_trace.append({"step": step, **data})

    def _print_debug_trace(self, debug_trace: list[dict] | None) -> None:
        if not debug_trace:
            return

        for item in debug_trace:
            details = ", ".join(
                f"{key}={json.dumps(value, ensure_ascii=False)}"
                for key, value in item.items()
                if key != "step"
            )
            if details:
                print(f"[dictionary][debug] {item['step']}: {details}")
            else:
                print(f"[dictionary][debug] {item['step']}")

    def get_entry(self, word: str, *, debug_trace: list[dict] | None = None, lookup_kind: str = "exact") -> dict | None:
        cache_path = self._cache_path(word)
        self._record_debug(
            debug_trace,
            "exact_word_check" if lookup_kind == "exact" else "lemma_word_check",
            word=word,
            lookupKind=lookup_kind,
            cachePath=str(cache_path),
        )
        if cache_path.exists():
            self._record_debug(
                debug_trace,
                "cache_hit",
                word=word,
                lookupKind=lookup_kind,
                path=str(cache_path),
            )
            with cache_path.open("r", encoding="utf-8") as handle:
                return json.load(handle)

        self._record_debug(
            debug_trace,
            "cache_miss",
            word=word,
            lookupKind=lookup_kind,
            path=str(cache_path),
        )

        legacy = self._get_legacy_entry(word)
        if legacy:
            self._record_debug(
                debug_trace,
                "legacy_hit",
                word=word,
                lookupKind=lookup_kind,
            )
            self.save_entry(word, legacy)
            return legacy

        self._record_debug(
            debug_trace,
            "legacy_miss",
            word=word,
            lookupKind=lookup_kind,
        )
        return None

    def save_entry(self, word: str, payload: dict) -> None:
        cache_path = self._cache_path(word)
        with cache_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)

    def sync_word(self, word: str, force: bool = False, debug: bool = False) -> DictionaryEntryModel:
        normalized_word = (word or "").strip().lower()
        if not normalized_word:
            raise ValueError("Word is required.")

        debug_trace: list[dict] | None = [] if debug else None
        self._record_debug(debug_trace, "lookup_start", requestedWord=normalized_word, force=force)

        try:
            entry = self._resolve_word_entry(
                normalized_word,
                force=force,
                debug=debug,
                debug_trace=debug_trace,
                lookup_kind="exact",
            )
        except DictionaryFetchError as exc:
            self._record_debug(
                debug_trace,
                "exact_lookup_failed",
                word=normalized_word,
                error=str(exc),
            )
            if debug_trace is not None:
                exc.details = {
                    **(exc.details or {}),
                    "lookupTrace": debug_trace,
                }
                self._print_debug_trace(debug_trace)
            raise

        if debug_trace is not None:
            self._print_debug_trace(debug_trace)

        return DictionaryEntryModel.model_validate(entry)

    def _resolve_word_entry(
        self,
        word: str,
        force: bool = False,
        debug: bool = False,
        *,
        debug_trace: list[dict] | None = None,
        lookup_kind: str = "exact",
    ) -> dict:
        if not force:
            existing = self.get_entry(word, debug_trace=debug_trace, lookup_kind=lookup_kind)
            if existing:
                return existing
        else:
            self._record_debug(
                debug_trace,
                "skip_exact_word_check" if lookup_kind == "exact" else "skip_lemma_word_check",
                word=word,
                lookupKind=lookup_kind,
                reason="force=true",
            )

        if lookup_kind == "exact":
            lemma = self._lemma_for(word, debug_trace=debug_trace)
            if lemma and lemma != word:
                self._record_debug(
                    debug_trace,
                    "lemma_lookup_start",
                    requestedWord=word,
                    lemma=lemma,
                )
                lemma_entry = self.get_entry(lemma, debug_trace=debug_trace, lookup_kind="lemma")
                if lemma_entry:
                    self._record_debug(
                        debug_trace,
                        "lemma_lookup_hit",
                        requestedWord=word,
                        lemma=lemma,
                    )
                    return self._with_lemma_fallback(word, lemma, lemma_entry)
                self._record_debug(
                    debug_trace,
                    "lemma_lookup_miss",
                    requestedWord=word,
                    lemma=lemma,
                )

        self._record_debug(
            debug_trace,
            "dictionaryapi_lookup",
            word=word,
            lookupKind=lookup_kind,
            url=f"{settings.dictionary_api_base_url.rstrip('/')}/{word}",
        )
        source_entries = self._fetch_dictionary_entries(
            word,
            debug=debug,
            debug_trace=debug_trace,
            lookup_kind=lookup_kind,
        )
        self._record_debug(
            debug_trace,
            "dictionaryapi_success",
            word=word,
            lookupKind=lookup_kind,
            entries=len(source_entries),
        )
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
        self.save_entry(word, bilingual_entry)
        return bilingual_entry

    def _fetch_dictionary_entries(
        self,
        word: str,
        debug: bool = False,
        *,
        debug_trace: list[dict] | None = None,
        lookup_kind: str = "exact",
    ) -> list[dict]:
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
            self._record_debug(
                debug_trace,
                "dictionaryapi_error",
                word=word,
                lookupKind=lookup_kind,
                statusCode=exc.code,
                reason=getattr(exc, "reason", None),
            )
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
            self._record_debug(
                debug_trace,
                "dictionaryapi_error",
                word=word,
                lookupKind=lookup_kind,
                reason=str(exc.reason),
            )
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

    def _lemma_for(self, word: str, *, debug_trace: list[dict] | None = None) -> str | None:
        lemma_map = self._load_lemma_map()
        lemma = lemma_map.get(word)
        self._record_debug(
            debug_trace,
            "lemma_check",
            word=word,
            lemma=lemma,
            found=bool(lemma),
            lemmatizationPath=str(settings.lemmatization_path),
        )
        return lemma

    def _load_lemma_map(self) -> dict[str, str]:
        if self._lemma_map is not None:
            return self._lemma_map

        lemma_map: dict[str, str] = {}
        lemmatization_path = Path(settings.lemmatization_path)
        if not lemmatization_path.exists():
            self._lemma_map = lemma_map
            return lemma_map

        with lemmatization_path.open("r", encoding="utf-8") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line:
                    continue

                parts = line.split()
                if len(parts) < 2:
                    continue

                lemma = parts[0].strip().lower()
                inflected = parts[1].strip().lower()
                if lemma and inflected and inflected not in lemma_map:
                    lemma_map[inflected] = lemma

        self._lemma_map = lemma_map
        return lemma_map

    def _with_lemma_fallback(self, requested_word: str, lemma: str, entry: dict) -> dict:
        payload = copy.deepcopy(entry)
        payload["meta"] = {
            **(payload.get("meta") or {}),
            "requestedWord": requested_word,
            "lemmaFallback": lemma,
        }
        return payload

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
