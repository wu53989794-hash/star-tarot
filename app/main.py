import random
import json
import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.cards import ALL_CARDS
from app.deepseek import get_reading, get_reading_stream

logging.basicConfig(level=logging.INFO)
logging.getLogger().addHandler(logging.FileHandler(Path(__file__).parent.parent / "server.log"))
logger = logging.getLogger(__name__)

app = FastAPI(title="星语塔罗", description="塔罗占卜 AI 深度解读")

# 请求模型
class DrawRequest(BaseModel):
    count: int = 3

class ReadingRequest(BaseModel):
    cards: list
    category: str
    question: str = ""

# 静态文件服务
static_dir = Path(__file__).parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    index_path = static_dir / "index.html"
    if index_path.exists():
        return HTMLResponse(content=index_path.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>星语塔罗</h1><p>正在加载...</p>")

@app.get("/api/health")
async def health():
    return {"status": "ok", "cards_count": len(ALL_CARDS)}

@app.post("/api/draw")
async def draw_cards(req: DrawRequest):
    """随机抽取三张牌，每张牌随机正位或逆位"""
    count = min(req.count, 3)
    drawn = random.sample(ALL_CARDS, count)

    result = []
    for card in drawn:
        card_copy = dict(card)
        card_copy["orientation"] = random.choice(["正位", "逆位"])
        result.append(card_copy)

    return {"cards": result}

class ReadingStreamRequest(BaseModel):
    cards: list
    category: str
    question: str = ""

@app.post("/api/reading/stream")
async def reading_stream(req: ReadingStreamRequest):
    """流式获取 AI 解读"""
    cards_data = req.cards
    category = req.category
    question = req.question

    return StreamingResponse(
        get_reading_stream(cards_data, category, question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/reading")
async def reading(req: ReadingRequest):
    """一次性获取 AI 解读"""
    cards_data = req.cards
    category = req.category
    question = req.question
    logger.info(f"Reading request: category={category}, cards={len(cards_data)}, question='{question[:50]}...'")

    result = await get_reading(cards_data, category, question)
    logger.info(f"Reading result: {'success' if 'reading' in result else 'error: ' + result.get('error', 'unknown')}")
    return result

@app.get("/api/cards")
async def get_all_cards_api():
    """获取所有塔罗牌数据（不含正逆位，仅基本信息）"""
    cards = []
    for card in ALL_CARDS:
        cards.append({
            "id": card["id"],
            "name": card["name"],
            "name_en": card["name_en"],
            "keywords": card["keywords"],
            "element": card["element"]
        })
    return {"cards": cards}

# WSGI wrapper for PythonAnywhere
try:
    from a2wsgi import ASGIMiddleware
    wsgi = ASGIMiddleware(app)
except ImportError:
    wsgi = None
application = wsgi
