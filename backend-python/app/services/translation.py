from __future__ import annotations

import json
from datetime import datetime, timezone
from urllib import request
from urllib.error import HTTPError, URLError

from ..config import settings


class TranslationError(ValueError):
    def __init__(self, message: str, *, details: dict | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


class TranslationService:
    def translate(self, text: str, target_lang: str = "Chinese", debug: bool = False) -> str | tuple[str, dict]:
        text = text.strip()
        if not text:
            return ("", {"skipped": True}) if debug else ""

        translations, details = self.translate_batch([text], target_lang, debug=True)
        translated = translations.get(text, "")
        return (translated, details) if debug else translated

    def translate_batch(
        self,
        texts: list[str],
        target_lang: str = "Chinese",
        debug: bool = False,
    ) -> dict[str, str] | tuple[dict[str, str], dict]:
        normalized_texts = [text.strip() for text in texts if isinstance(text, str) and text.strip()]
        if not normalized_texts:
            empty_details = {"skipped": True, "textCount": 0}
            return ({}, empty_details) if debug else {}

        provider = settings.translation_provider
        if provider == "mock":
            translations = {text: f"[{target_lang}] {text}" for text in normalized_texts}
            details = {
                "provider": provider,
                "model": "mock",
                "textCount": len(normalized_texts),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            return (translations, details) if debug else translations

        if provider == "dashscope":
            print("apikey", settings.dashscope_api_key)
            result = self._translate_openai_compatible(
                base_url=settings.dashscope_base_url,
                api_key=settings.dashscope_api_key,
                model=settings.translation_model,
                texts=normalized_texts,
                target_lang=target_lang,
                provider=provider,
            )
            return result if debug else result[0]

        if provider == "openai-compatible":
            result = self._translate_openai_compatible(
                base_url=settings.translation_api_base_url,
                api_key=settings.translation_api_key,
                model=settings.translation_model,
                texts=normalized_texts,
                target_lang=target_lang,
                provider=provider,
            )
            return result if debug else result[0]

        raise TranslationError(f"Unsupported translation provider: {provider}")

    def _translate_openai_compatible(
        self,
        *,
        base_url: str,
        api_key: str,
        model: str,
        texts: list[str],
        target_lang: str,
        provider: str,
    ) -> tuple[dict[str, str], dict]:
        if not base_url or not api_key:
            raise TranslationError(
                "Translation provider credentials are missing.",
                details={
                    "provider": provider,
                    "baseUrlPresent": bool(base_url),
                    "apiKeyPresent": bool(api_key),
                },
            )

        url = f"{base_url.rstrip('/')}/chat/completions"
        request_payload = {
            "model": model,
            "enable_thinking": False,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Translate each English text into natural Simplified Chinese. "
                        "Return only JSON with a top-level object named translations "
                        "that maps the original English text to its Chinese translation."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "source_language": "English",
                            "target_language": target_lang,
                            "texts": texts,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
        }
        payload = json.dumps(request_payload, ensure_ascii=False).encode("utf-8")

        debug_context = {
            "provider": provider,
            "model": model,
            "url": url,
            "textCount": len(texts),
            "sampleTexts": texts[:3],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        req = request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "easy-reading-backend-python/0.1",
                "Accept": "application/json,text/plain,*/*",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=60) as response:
                raw_body = response.read().decode("utf-8")
                parsed_response = json.loads(raw_body)
        except HTTPError as exc:
            try:
                response_body = exc.read().decode("utf-8", errors="replace")
            except Exception:
                response_body = None
            raise TranslationError(
                f"Translation upstream returned HTTP {exc.code}.",
                details={
                    **debug_context,
                    "errorType": "HTTPError",
                    "statusCode": exc.code,
                    "reason": getattr(exc, "reason", None),
                    "responseBody": response_body,
                    "requestPayload": request_payload,
                },
            ) from exc
        except URLError as exc:
            raise TranslationError(
                f"Translation upstream is unreachable: {exc.reason}.",
                details={
                    **debug_context,
                    "errorType": "URLError",
                    "reason": str(exc.reason),
                    "requestPayload": request_payload,
                },
            ) from exc
        except Exception as exc:
            raise TranslationError(
                f"Translation request failed: {exc}",
                details={
                    **debug_context,
                    "errorType": type(exc).__name__,
                    "requestPayload": request_payload,
                },
            ) from exc

        content = parsed_response.get("choices", [{}])[0].get("message", {}).get("content")
        if not content:
            raise TranslationError(
                "Translation response did not include message content.",
                details={
                    **debug_context,
                    "responseBody": parsed_response,
                },
            )

        try:
            translations = json.loads(content).get("translations", {})
        except Exception as exc:
            raise TranslationError(
                "Translation response content was not valid JSON.",
                details={
                    **debug_context,
                    "responseContent": content,
                    "responseBody": parsed_response,
                },
            ) from exc

        return translations, {
            **debug_context,
            "usage": parsed_response.get("usage"),
            "responsePreview": content[:500],
        }


translation_service = TranslationService()
