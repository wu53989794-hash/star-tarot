import os, json, httpx, logging
from pathlib import Path

logger = logging.getLogger(__name__)

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
if not _KEY:
    _env_path = Path(__file__).parent.parent / ".env"
    if _env_path.exists():
        for _line in _env_path.read_text(encoding="utf-8").splitlines():
            _line = _line.strip()
            if _line.startswith("DEEPSEEK_API_KEY="):
                _KEY = _line.split("=", 1)[1].strip().strip('"').strip("'")
                if _KEY:
                    os.environ["DEEPSEEK_API_KEY"] = _KEY
                    logger.info("Loaded DeepSeek API key from .env (module-level fallback)")
                break

def build_prompt(cards_data, category, question=""):
    from app.prompt import build_reading_prompt
    return build_reading_prompt(cards_data, category, question)

def get_reading_sync(cards_data, category, question="", api_key=None):
    """???? AI ???Flask ??"""
    if api_key is None:
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        return {"error": "DeepSeek API Key ???"}
    prompt = build_prompt(cards_data, category, question)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "?????????????????????????????????????????????????????????????????????????????????"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.8,
        "max_tokens": 3072
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(DEEPSEEK_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            return {"reading": content}
    except httpx.TimeoutException:
        logger.error("DeepSeek API ????")
        return {"error": "????????????"}
    except httpx.HTTPStatusError as e:
        logger.error(f"DeepSeek API HTTP ??: {e.response.status_code}")
        return {"error": f"API ???? (HTTP {e.response.status_code})"}
    except Exception as e:
        logger.error(f"DeepSeek API ????: {str(e)}")
        return {"error": f"??????: {str(e)}"}

def get_reading_stream_sync(cards_data, category, question="", api_key=None):
    """?????? AI ???Flask ????????"""
    if api_key is None:
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        yield f"data: {json.dumps({'error': 'DeepSeek API Key ???'})}\n\n"
        return
    from app.prompt import build_reading_prompt_stream
    prompt = build_reading_prompt_stream(cards_data, category, question)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "?????????????????????????????????????????????????????????????????????????????????"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.8,
        "max_tokens": 3072,
        "stream": True
    }
    try:
        with httpx.Client(timeout=120.0) as client:
            with client.stream("POST", DEEPSEEK_API_URL, headers=headers, json=payload) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                        except json.JSONDecodeError:
                            continue
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"??????: {str(e)}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
