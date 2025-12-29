import json
import json
from types import SimpleNamespace

import pytest

import services.ai_service as ai_module
from config import settings


@pytest.mark.asyncio
async def test_generate_grok_response(monkeypatch):
    # Ensure API key is present to avoid configuration error
    settings.xai_api_key = "test-key"

    messages = [SimpleNamespace(role="user", content="Hello")]

    expected = {"choices": [{"message": {"content": "hello from grok"}}]}

    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return expected

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, *args, **kwargs):
            return DummyResponse()

    # Patch httpx AsyncClient used inside the ai_service module
    monkeypatch.setattr(ai_module.httpx, "AsyncClient", DummyClient)

    svc = ai_module.AIService()
    result = await svc._generate_grok_response(messages, None, 100)

    assert result == "hello from grok"


@pytest.mark.asyncio
async def test_stream_grok_response(monkeypatch):
    settings.xai_api_key = "test-key"

    messages = [SimpleNamespace(role="user", content="Hello")]

    lines = [
        "data: " + json.dumps({"choices": [{"delta": {"content": "hello "}}]}),
        "data: " + json.dumps({"choices": [{"delta": {"content": "world"}}]}),
        "data: [DONE]",
    ]

    class DummyStreamResponse:
        def raise_for_status(self):
            return None

        async def aiter_lines(self):
            for l in lines:
                yield l

    class DummyStreamCtx:
        async def __aenter__(self):
            return DummyStreamResponse()

        async def __aexit__(self, exc_type, exc, tb):
            return None

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        def stream(self, *args, **kwargs):
            return DummyStreamCtx()

    monkeypatch.setattr(ai_module.httpx, "AsyncClient", DummyClient)

    svc = ai_module.AIService()
    collected = ""
    async for chunk in svc.stream_grok_response(messages, None, 100):
        collected += chunk

    assert collected == "hello world"
