# Easy Reading Python Backend

This service is a Python replacement target for the current Cloudflare workers (`worker/translate`, `worker/dict`) and the Node auth/payment backend (`backend-next`).

It keeps the API shape close to the existing frontend expectations so the website and Chrome extension can migrate incrementally.

## Included endpoints

- `GET /health`
- `POST /api/translate`
- `GET /api/entries`
- `GET /api/entries/{word}`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/subscription`
- `POST /api/payment/wechat/create`
- `POST /api/payment/alipay/create`
- `GET /api/payment/query-order`
- `POST /api/payment/wechat/notify`
- `POST /api/payment/alipay/notify`

## Run locally

```bash
cd backend-python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Frontend migration targets

Shared package:

```bash
NEXT_PUBLIC_DICT_API=http://127.0.0.1:8000/api/entries
NEXT_PUBLIC_TRANS_API=http://127.0.0.1:8000/api/translate
```

Website auth/payment:

- Development: point your `/api-proxy` rewrite to `http://127.0.0.1:8000/api`
- Production: point `NEXT_PUBLIC_API_URL` or your reverse proxy to this backend

## Environment variables

- `DATABASE_PATH`: SQLite file path. Default: `backend-python/data/easy_reading.db`
- `SESSION_COOKIE_NAME`: Default: `session`
- `SESSION_TTL_DAYS`: Default: `7`
- `TRANSLATION_PROVIDER`: `mock`, `dashscope`, or `openai-compatible`
- `TRANSLATION_API_BASE_URL`: OpenAI-compatible chat completions base URL
- `TRANSLATION_API_KEY`: API key for OpenAI-compatible mode
- `TRANSLATION_MODEL`: Default: `qwen3.6-plus`
- `DASHSCOPE_API_KEY`: Used for `dashscope` mode
- `DASHSCOPE_BASE_URL`: Default: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `DICTIONARY_API_BASE_URL`: Default: `https://api.dictionaryapi.dev/api/v2/entries/en`
- `APP_BASE_URL`: Used to build mock payment URLs

## Notes

- Payment creation is migration-ready but currently returns a generated payment URL / code URL instead of a full provider SDK integration.
- Notify routes can be used to mark an order as paid and extend the user subscription while the real WeChat Pay / Alipay signature verification is ported.
- TTS is still frontend-side today and can remain there until you decide to centralize audio generation.
