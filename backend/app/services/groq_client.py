from __future__ import annotations

from typing import Any

import httpx

from backend.app.config import get_settings


class GroqClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    @property
    def configured(self) -> bool:
        return bool(self.settings.groq_api_key)

    async def complete(self, messages: list[dict[str, str]], fallback: str, temperature: float = 0.3) -> dict[str, Any]:
        if not self.configured:
            return {
                "content": fallback,
                "provider": "local",
                "model": "local-guidance",
                "mocked": True,
            }

        payload = {
            "model": self.settings.groq_model,
            "messages": messages,
            "temperature": temperature,
            "max_completion_tokens": 700,
        }
        headers = {
            "Authorization": f"Bearer {self.settings.groq_api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=25) as client:
                response = await client.post(self.base_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
        except Exception as exc:  # Keep local workflows usable even if the API quota/network fails.
            return {
                "content": f"{fallback}\n\nLive AI was unavailable, so the system prepared this local guidance. Reason: {exc}",
                "provider": "local",
                "model": self.settings.groq_model,
                "mocked": True,
            }

        return {
            "content": data["choices"][0]["message"]["content"],
            "provider": "groq",
            "model": self.settings.groq_model,
            "mocked": False,
            "usage": data.get("usage", {}),
        }


groq_client = GroqClient()
