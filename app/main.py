import random, json, os, logging
from pathlib import Path
from flask import Flask, request, jsonify, Response, send_from_directory
from app.cards import ALL_CARDS
from dotenv import load_dotenv
from app.deepseek import get_reading_sync, get_reading_stream_sync
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
    logging.info(f"Loaded environment from {_env_path}")
logging.basicConfig(level=logging.INFO)
try: logging.getLogger().addHandler(logging.FileHandler(Path(__file__).parent.parent / "server.log"))
except: pass
logger = logging.getLogger(__name__)
app = Flask(__name__, static_folder=None)
static_dir = Path(__file__).parent.parent / "static"
@app.after_request
def add_charset(response):
    ct = response.headers.get("content-type", "")
    if ct.startswith("text/javascript") or ct.startswith("application/javascript"):
        if "; charset=" not in ct:
            response.headers["content-type"] = ct + "; charset=utf-8"
    return response
from app.payment import PLANS, use_one, remaining as get_remaining, manual_grant, list_purchases, is_banned
from app.payment import ban_device, unban_device, mark_csv_verified, get_device_summary, deduct_device_credits, mark_bulk_csv_verified
@app.route("/")
def root():
    idx = static_dir / "index.html"
    return (idx.read_text(encoding="utf-8"), 200, {"Content-Type": "text/html; charset=utf-8"}) if idx.exists() else ("<h1>星语塔罗</h1><p>正在加载...</p>", 200)
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "cards_count": len(ALL_CARDS)})
@app.route("/api/draw", methods=["POST"])
def draw_cards():
    data = request.get_json() or {}
    count = min(data.get("count", 3), 3)
    card_ids = data.get("card_ids")
    drawn = [c for c in ALL_CARDS if c["id"] in card_ids] if card_ids else random.sample(ALL_CARDS, count)
    random.shuffle(drawn)
    result = [dict(c) | {"orientation": random.choice(["正位", "逆位"])} for c in drawn]
    return jsonify({"cards": result})
@app.route("/api/reading", methods=["POST"])
def reading():
    d = request.get_json() or {}
    return jsonify(get_reading_sync(d.get("cards",[]), d.get("category",""), d.get("question","")))
@app.route("/api/reading/stream", methods=["POST"])
def reading_stream():
    def gen():
        d = request.get_json() or {}
        for c in get_reading_stream_sync(d.get("cards",[]), d.get("category",""), d.get("question","")):
            yield c
    return Response(gen(), mimetype="text/event-stream", headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})
@app.route("/api/cards")
def get_all_cards_api():
    return jsonify({"cards": ALL_CARDS})
@app.route("/api/check-usage", methods=["POST"])
def check_usage():
    return jsonify({"remaining": get_remaining((request.get_json() or {}).get("purchase_id",""))})
@app.route("/api/use-reading", methods=["POST"])
def use_reading():
    ok, r = use_one((request.get_json() or {}).get("purchase_id",""))
    return jsonify({"success": ok, "remaining": r})
@app.route("/admin")
def admin_page():
    ap = static_dir / "admin.html"
    return (ap.read_text(encoding="utf-8"), 200, {"Content-Type":"text/html; charset=utf-8"}) if ap.exists() else ("<h1>管理后台</h1><p>admin.html not found</p>", 200)
@app.route("/api/admin/purchases")
def admin_list_purchases():
    return jsonify({"purchases": list_purchases()})
@app.route("/api/admin/devices")
def admin_list_devices():
    return jsonify({"devices": get_device_summary()})
@app.route("/api/admin/grant", methods=["POST"])
def admin_grant():
    plan = (request.get_json() or {}).get("plan","")
    if plan not in PLANS: return jsonify({"error":"invalid plan"}), 400
    return jsonify({"success":True,"purchase_id":manual_grant(plan),"plan":plan,"readings":PLANS[plan]["readings"]})
@app.route("/api/admin/ban", methods=["POST"])
def admin_ban_device():
    d = request.get_json() or {}; ban_device(d.get("device_id",""), d.get("ip","")); return jsonify({"success":True})
@app.route("/api/admin/unban", methods=["POST"])
def admin_unban_device():
    unban_device((request.get_json() or {}).get("device_id","")); return jsonify({"success":True})
@app.route("/api/admin/verify-csv", methods=["POST"])
def admin_verify_csv():
    mark_csv_verified((request.get_json() or {}).get("device_id","")); return jsonify({"success":True})
@app.route("/api/trust-payment", methods=["POST"])
def trust_payment():
    d = request.get_json() or {}
    plan, dev = d.get("plan",""), d.get("device_id","")
    if plan not in PLANS: return jsonify({"error":"invalid plan"}), 400
    ip = request.remote_addr or ""
    if is_banned(dev, ip): return jsonify({"error":"banned","message":"该设备已被禁止使用"}), 403
    pid = manual_grant(plan, dev, ip)
    return jsonify({"success":True,"purchase_id":pid,"remaining":PLANS[plan]["readings"],"plan":plan,"readings":PLANS[plan]["readings"]})
@app.route("/api/admin/deduct", methods=["POST"])
def admin_deduct():
    return jsonify({"success":deduct_device_credits((request.get_json() or {}).get("device_id",""))})
@app.route("/api/admin/verify-csv-bulk", methods=["POST"])
def admin_verify_csv_bulk():
    r = mark_bulk_csv_verified((request.get_json() or {}).get("device_ids",[]))
    return jsonify({"success":True,**r})
@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(str(static_dir), filename)
application = app
