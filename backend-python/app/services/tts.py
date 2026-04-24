from __future__ import annotations

from http import HTTPStatus

from dashscope import MultiModalConversation

from ..config import settings


class TTSError(ValueError):
    def __init__(self, message: str, *, details: dict | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


class TTSService:
    def synthesize(self, text: str) -> dict[str, str | None]:
        normalized_text = text.strip()
        if not normalized_text:
            raise TTSError("Text to speech text cannot be empty.")

        if not settings.dashscope_api_key:
            raise TTSError(
                "DashScope TTS credentials are missing.",
                details={"apiKeyPresent": False},
            )

        response = MultiModalConversation.call(
            model=settings.tts_model,
            api_key=settings.dashscope_api_key,
            text=normalized_text,
            voice=settings.tts_voice,
            language_type=settings.tts_language_type,
            stream=False,
        )

        if response.status_code != HTTPStatus.OK:
            raise TTSError(
                response.message or "DashScope TTS request failed.",
                details={
                    "statusCode": int(response.status_code),
                    "code": response.code,
                    "requestId": response.request_id,
                },
            )

        audio_url = response.output.audio.url if response.output and response.output.audio else None
        if not audio_url:
            raise TTSError(
                "DashScope TTS response did not include an audio URL.",
                details={
                    "requestId": response.request_id,
                    "output": response.output,
                },
            )

        return {
            "audioUrl": audio_url,
            "requestId": response.request_id,
            "voice": settings.tts_voice,
            "model": settings.tts_model,
        }


tts_service = TTSService()