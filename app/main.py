import random

import json

import os

import logging

from pathlib import Path

from fastapi import FastAPI, Request

from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse

from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel



from app.cards import ALL_CARDS

from dotenv import load_dotenv



# 启动时加载 .env 文件到环境变量，确保所有模块都能读到

_env_path = Path(__file__).parent.parent / ".env"

if _env_path.exists():

    load_dotenv(_env_path)

    logging.info(f"Loaded environment from {_env_path}")

else:

    logging.warning(f".env file not found at {_env_path}")



from app.deepseek import get_reading, get_reading_stream



from starlette.middleware.base import BaseHTTPMiddleware



class CharsetMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request, call_next):

        response = await call_next(request)

        ct = response.headers.get("content-type", "")

        if ct.startswith("text/javascript") or ct.startswith("application/javascript"):

            if "; charset=" not in ct:

                response.headers["content-type"] = ct + "; charset=utf-8"

        return response



logging.basicConfig(level=logging.INFO)

logging.getLogger().addHandler(logging.FileHandler(Path(__file__).parent.parent / "server.log"))

logger = logging.getLogger(__name__)



app = FastAPI(title="星语塔罗", description="塔罗占卜 AI 深度解读")

app.add_middleware(CharsetMiddleware)



# 请求模型

class DrawRequest(BaseModel):

    count: int = 3

    card_ids: list = None



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

    if req.card_ids:

        drawn = [card for card in ALL_CARDS if card["id"] in req.card_ids]

        random.shuffle(drawn)

    else:

        drawn = random.sample(ALL_CARDS, count)



    result = []

    for card in drawn:

        card_copy = dict(card)

        card_copy["orientation"] = random.choice(["正位", "逆位"])

        result.append(card_copy)



    return {"cards": result}



class CreateCheckoutRequest(BaseModel):

    plan: str

    base_url: str = ""

    category: str = ""

    question: str = ""



class VerifyPaymentRequest(BaseModel):

    session_id: str

    plan: str



class CheckUsageRequest(BaseModel):

    purchase_id: str



class CheckPaymentRequest(BaseModel):

    intent_id: str



class UseReadingRequest(BaseModel):

    purchase_id: str



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

    """获取所有塔罗牌完整数据"""

    return {"cards": ALL_CARDS}





# Stripe payment endpoints

from app.payment import PLANS, use_one, remaining as get_remaining



@app.post("/api/check-usage")

async def check_usage(req: CheckUsageRequest):

    r = get_remaining(req.purchase_id)

    return {"remaining": r}



@app.post("/api/use-reading")

async def use_reading(req: UseReadingRequest):

    ok, r = use_one(req.purchase_id)

    return {"success": ok, "remaining": r}







# ===== Admin & Trust-based Payment =====

from app.payment import manual_grant, list_purchases, is_banned, ban_device, unban_device, mark_csv_verified, get_device_summary, deduct_device_credits, mark_bulk_csv_verified



@app.get("/admin")

async def admin_page():

    admin_path = Path(__file__).parent.parent / "static" / "admin.html"

    if admin_path.exists():

        return HTMLResponse(content=admin_path.read_text(encoding="utf-8"))

    return HTMLResponse(content="<h1>管理后台</h1><p>admin.html not found</p>")



@app.get("/api/admin/purchases")

async def admin_list_purchases():

    return {"purchases": list_purchases()}



@app.get("/api/admin/devices")

async def admin_list_devices():

    return {"devices": get_device_summary()}



class GrantRequest(BaseModel):

    plan: str



@app.post("/api/admin/grant")

async def admin_grant(req: GrantRequest):

    plan_info = PLANS.get(req.plan)

    if not plan_info:

        return JSONResponse({"error": "invalid plan"}, status_code=400)

    pid = manual_grant(req.plan)

    return {"success": True, "purchase_id": pid, "plan": req.plan, "readings": plan_info["readings"]}



@app.post("/api/admin/ban")

async def admin_ban_device(req: Request):

    body = await req.json()

    device_id = body.get("device_id", "")

    ip = body.get("ip", "")

    ban_device(device_id, ip)

    return {"success": True}



@app.post("/api/admin/unban")

async def admin_unban_device(req: Request):

    body = await req.json()

    device_id = body.get("device_id", "")

    unban_device(device_id)

    return {"success": True}



@app.post("/api/admin/verify-csv")

async def admin_verify_csv(req: Request):

    body = await req.json()

    device_id = body.get("device_id", "")

    mark_csv_verified(device_id)

    return {"success": True}



@app.post("/api/trust-payment")

async def trust_payment(request: Request):

    body = await request.json()

    plan = body.get("plan", "")

    device_id = body.get("device_id", "")

    category = body.get("category", "")

    question = body.get("question", "")

    plan_info = PLANS.get(plan)

    if not plan_info:

        return JSONResponse({"error": "invalid plan"}, status_code=400)

    ip = request.client.host if request.client else ""

    if is_banned(device_id, ip):

        return JSONResponse({"error": "banned", "message": "该设备已被禁止使用"}, status_code=403)

    pid = manual_grant(plan, device_id, ip)

    return {"success": True, "purchase_id": pid, "remaining": plan_info["readings"], "plan": plan, "readings": plan_info["readings"]}




class DeductRequest(BaseModel):
    device_id: str

@app.post("/api/admin/deduct")
async def admin_deduct(req: DeductRequest):
    changed = deduct_device_credits(req.device_id)
    return {"success": changed}

class UploadCsvRequest(BaseModel):
    device_ids: list

@app.post("/api/admin/verify-csv-bulk")
async def admin_verify_csv_bulk(req: UploadCsvRequest):
    result = mark_bulk_csv_verified(req.device_ids)
    return {"success": True, **result}


# ===== WSGI entry point for PythonAnywhere =====
from a2wsgi import ASGIMiddleware

application = ASGIMiddleware(app)





