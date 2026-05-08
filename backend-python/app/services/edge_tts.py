from __future__ import annotations

import asyncio
import base64

import edge_tts

from ..config import settings
from .tts import TTSError


class EdgeTTSService:
    def synthesize(self, text: str) -> dict[str, str | None]:
        normalized_text = text.strip()
        if not normalized_text:
            raise TTSError("Text to speech text cannot be empty.")

        try:
            audio_bytes = asyncio.run(self._synthesize_audio(normalized_text))
        except TTSError:
            raise
        except Exception as exc:
            raise TTSError("Edge TTS request failed.") from exc

        if not audio_bytes:
            raise TTSError("Edge TTS response did not include audio data.")

        audio_base64 = base64.b64encode(audio_bytes).decode("ascii")
        return {
            "audioUrl": f"data:audio/mpeg;base64,{audio_base64}",
            "requestId": None,
            "voice": settings.edge_tts_voice,
            "model": "edge-tts",
            "provider": "edge",
        }

    async def _synthesize_audio(self, text: str) -> bytes:
        communicate = edge_tts.Communicate(
            text,
            settings.edge_tts_voice,
            rate=settings.edge_tts_rate,
            volume=settings.edge_tts_volume,
        )

        audio_chunks: list[bytes] = []
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio":
                audio_data = chunk.get("data")
                if isinstance(audio_data, bytes):
                    audio_chunks.append(audio_data)

        return b"".join(audio_chunks)


edge_tts_service = EdgeTTSService()