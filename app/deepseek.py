import os
import json
import httpx
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 启动时尝试从 .env 加载密钥到环境变量（双保险）
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

async def get_reading(cards_data, category, question="", api_key=None):
    """调用 DeepSeek API 获取塔罗解读"""
    if api_key is None:
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        return {"error": "DeepSeek API Key 未配置"}

    from app.prompt import build_reading_prompt
    prompt = build_reading_prompt(cards_data, category, question)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "你是一位很有共情力的塔罗解读师。你的解读亲切有温度，用第二人称'你'直接与读者对话，善于描述具体的情感场景、内心矛盾与现实对应，语言生动接地气，让读者有阅读下去的欲望。"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.8,
        "max_tokens": 3072
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(DEEPSEEK_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            return {"reading": content}
    except httpx.TimeoutException:
        logger.error("DeepSeek API 请求超时")
        return {"error": "解读请求超时，请稍后再试"}
    except httpx.HTTPStatusError as e:
        logger.error(f"DeepSeek API HTTP 错误: {e.response.status_code}")
        return {"error": f"API 请求失败 (HTTP {e.response.status_code})"}
    except Exception as e:
        logger.error(f"DeepSeek API 调用异常: {str(e)}")
        return {"error": f"解读生成失败: {str(e)}"}


async def get_reading_stream(cards_data, category, question="", api_key=None):
    """流式调用 DeepSeek API 获取塔罗解读"""
    if api_key is None:
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        yield f"data: {json.dumps({'error': 'DeepSeek API Key 未配置'})}\n\n"
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
            {"role": "system", "content": "你是一位很有共情力的塔罗解读师。你的解读亲切有温度，用第二人称'你'直接与读者对话，善于描述具体的情感场景、内心矛盾与现实对应，语言生动接地气，让读者有阅读下去的欲望。"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.8,
        "max_tokens": 3072,
        "stream": True
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", DEEPSEEK_API_URL, headers=headers, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
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
        logger.error(f"流式调用异常: {str(e)}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


