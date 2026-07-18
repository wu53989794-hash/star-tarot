import re, os

os.chdir(r"C:\Users\wu539\Documents\塔罗")

# Read original script (pre-changes)
content = open("static/script_orig2.js", "r", encoding="utf-8").read()
print(f"Original: {len(content)} chars")

# Remove 7 Stripe functions
stripe_funcs = [
    "async function processPayment",
    "function closePaymentModal",
    "function pollPaymentStatus",
    "function verifyPi",
    "function startPiPolling",
    "function startCheckout",
    "function verifyPayment",
]

for func in stripe_funcs:
    idx = content.find(func)
    if idx < 0:
        print(f"  NOT FOUND: {func}")
        continue
    brace = content.index("{", idx)
    depth, pos, in_str, sc = 1, brace + 1, False, None
    while pos < len(content) and depth > 0:
        ch = content[pos]
        if in_str:
            if ch == "\\": pos += 2; continue
            if ch == sc: in_str = False
            pos += 1; continue
        if ch in ("'", '"', "`"): in_str, sc = True, ch; pos += 1; continue
        if ch == "{": depth += 1
        elif ch == "}": depth -= 1
        pos += 1
    content = content[:idx] + content[pos:]
    print(f"  REMOVED: {func}")

# Replace IIFE - remove Stripe redirect code
old = 'var sid = p.get("session_id");'
pos = content.find(old)
if pos >= 0:
    start_rm = pos
    after = content.find('var pid = localStorage.getItem("tarot_purchase");')
    if after > start_rm:
        content = content[:start_rm] + content[after:]
        print("  IIFE Stripe redirect removed")
    else:
        print("  IIFE target not found")

print(f"\nFinal: {len(content)} chars")
print(f"Braces: {{: {content.count('{')}, }}: {content.count('}')}")
print(f"Has showPaymentQr: {'showPaymentQr' in content}")
print(f"Has stripe: {'stripe' in content.lower()}")

open("static/script.js", "w", encoding="utf-8").write(content)
print("Written to static/script.js")
