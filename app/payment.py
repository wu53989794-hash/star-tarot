import json
import uuid
from datetime import datetime
from pathlib import Path
import stripe

import os
from pathlib import Path

# Read Stripe key from env or .env
_stripe_key = os.environ.get("STRIPE_SECRET_KEY", "")
if not _stripe_key:
    _env_path = Path(__file__).parent.parent / ".env"
    if _env_path.exists():
        for _line in _env_path.read_text(encoding="utf-8").splitlines():
            _line = _line.strip()
            if _line.startswith("STRIPE_SECRET_KEY="):
                _stripe_key = _line.split("=", 1)[1].strip().strip('"').strip("'")
                break
stripe.api_key = _stripe_key

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
PURCHASES_FILE = DATA_DIR / "purchases.json"

PLANS = {
    "2_readings": {"name": "两次占卜", "amount_cny": 1499, "readings": 2},
    "3_readings": {"name": "三次占卜", "amount_cny": 1999, "readings": 3},
}

def _load():
    if PURCHASES_FILE.exists():
        return json.loads(PURCHASES_FILE.read_text(encoding="utf-8"))
    return {}

def _save(data):
    PURCHASES_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def remaining(purchase_id):
    d = _load()
    p = d.get(purchase_id)
    return p["remaining"] if p else 0

def _find_existing(session_id):
    d = _load()
    for pid, info in d.items():
        if info.get("session_id") == session_id:
            return pid
    return None

def record(session_id, plan, category="", question=""):
    existing = _find_existing(session_id)
    if existing:
        return existing
    d = _load()
    pid = uuid.uuid4().hex[:12]
    info = PLANS[plan]
    d[pid] = {"session_id": session_id, "plan": plan, "readings": info["readings"], "remaining": info["readings"], "created": datetime.now().isoformat(), "category": category, "question": question}
    _save(d)
    return pid

def use_one(purchase_id):
    d = _load()
    p = d.get(purchase_id)
    if not p or p["remaining"] <= 0:
        return False, 0
    p["remaining"] -= 1
    _save(d)
    return True, p["remaining"]


def store_session(intent_id, category, question):
    """Store session data (category, question) associated with a PaymentIntent ID."""
    import json, os
    from pathlib import Path
    BASE_DIR = Path(__file__).parent.parent
    DATA_DIR = BASE_DIR / "data"
    DATA_DIR.mkdir(exist_ok=True)
    SESSIONS_FILE = DATA_DIR / "sessions.json"
    if SESSIONS_FILE.exists():
        data = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
    else:
        data = {}
    data[intent_id] = {"category": category, "question": question}
    SESSIONS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def get_session(intent_id):
    """Retrieve session data for a PaymentIntent ID."""
    import json
    from pathlib import Path
    BASE_DIR = Path(__file__).parent.parent
    SESSIONS_FILE = BASE_DIR / "data" / "sessions.json"
    if SESSIONS_FILE.exists():
        data = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
        return data.get(intent_id, {})
    return {}





# ===== Trust-based payment & admin =====

def manual_grant(plan, device_id="", ip=""):
    """Manually grant a purchase record (used when admin confirms payment)."""
    d = _load()
    pid = uuid.uuid4().hex[:12]
    info = PLANS[plan]
    d[pid] = {
        "session_id": "trust_" + pid,
        "plan": plan,
        "readings": info["readings"],
        "remaining": info["readings"],
        "created": datetime.now().isoformat(),
        "category": "", "question": "",
        "manual": True,
        "device_id": device_id,
        "ip": ip,
        "csv_verified": False,
        "banned": False
    }
    _save(d)
    return pid

def list_purchases():
    """List all purchases for admin view."""
    d = _load()
    result = []
    for pid, info in d.items():
        result.append({
            "id": pid,
            "plan": info.get("plan", ""),
            "readings": info.get("readings", 0),
            "remaining": info.get("remaining", 0),
            "created": info.get("created", ""),
            "manual": info.get("manual", False),
            "csv_verified": info.get("csv_verified", False),
            "banned": info.get("banned", False),
            "device_id": info.get("device_id", ""),
            "ip": info.get("ip", ""),
        })
    result.sort(key=lambda x: x.get("created", ""), reverse=True)
    return result

BANNED_FILE = DATA_DIR / "banned.json"

def is_banned(device_id, ip):
    if BANNED_FILE.exists():
        bdata = json.loads(BANNED_FILE.read_text(encoding="utf-8"))
        if device_id and device_id in bdata.get("devices", []):
            return True
        if ip and ip in bdata.get("ips", []):
            return True
    return False

def ban_device(device_id, ip=""):
    bdata = {"devices": [], "ips": []}
    if BANNED_FILE.exists():
        bdata = json.loads(BANNED_FILE.read_text(encoding="utf-8"))
    if device_id and device_id not in bdata["devices"]:
        bdata["devices"].append(device_id)
    if ip and ip not in bdata["ips"]:
        bdata["ips"].append(ip)
    BANNED_FILE.write_text(json.dumps(bdata, ensure_ascii=False, indent=2), encoding="utf-8")
    d = _load()
    changed = False
    for pid, info in d.items():
        if info.get("device_id") == device_id:
            info["banned"] = True
            changed = True
    if changed:
        _save(d)

def unban_device(device_id):
    if BANNED_FILE.exists():
        bdata = json.loads(BANNED_FILE.read_text(encoding="utf-8"))
        if device_id in bdata["devices"]:
            bdata["devices"].remove(device_id)
            BANNED_FILE.write_text(json.dumps(bdata, ensure_ascii=False, indent=2), encoding="utf-8")
    d = _load()
    changed = False
    for pid, info in d.items():
        if info.get("device_id") == device_id:
            info["banned"] = False
            changed = True
    if changed:
        _save(d)

def mark_csv_verified(device_id):
    d = _load()
    changed = False
    for pid, info in d.items():
        if info.get("device_id") == device_id:
            info["csv_verified"] = True
            changed = True
    if changed:
        _save(d)

def get_device_summary():
    d = _load()
    devices = {}
    for pid, info in d.items():
        dev = info.get("device_id", "")
        if not dev:
            continue
        if dev not in devices:
            devices[dev] = {"device_id": dev, "total_readings": 0, "used": 0, "csv_verified": True, "banned": False, "ip": info.get("ip", ""), "purchases": []}
        devices[dev]["total_readings"] += info.get("readings", 0)
        devices[dev]["used"] += info.get("readings", 0) - info.get("remaining", 0)
        if not info.get("csv_verified", False):
            devices[dev]["csv_verified"] = False
        if info.get("banned", False):
            devices[dev]["banned"] = True
        devices[dev]["purchases"].append(pid)
    return list(devices.values())
