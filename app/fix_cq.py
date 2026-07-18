import sys, pathlib
js = pathlib.Path("static/script.js").read_text(encoding="utf-8")
idx = js.find("function confirmQuestion()")
if idx < 0: print("ERROR"); exit()
brace = js.index("{", idx)
depth, pos, instr, sc = 1, brace + 1, False, None
while pos < len(js) and depth > 0:
    ch = js[pos]
    if instr:
        if ch == "\\": pos += 2
        elif ch == sc: instr = False
        pos += 1; continue
    if ch in ("'", '"', "`"): instr, sc = True, ch; pos += 1; continue
    if ch == "{": depth += 1
    elif ch == "}": depth -= 1
    pos += 1
new_func = 'function confirmQuestion() {\n    const question = document.getElementById("question-text").value.trim();\n    state.question = question || "";\n    closeQuestionModal();\n    var pid = localStorage.getItem("tarot_purchase");\n    if (pid) {\n        fetch("/api/check-usage", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purchase_id:pid})})\n        .then(function(r){return r.json()}).then(function(d){\n            state.remaining = d.remaining;\n            state.purchaseId = pid;\n            updateRemainingBadge();\n            if (d.remaining > 0) { _doDrawAndRead(false); }\n            else { showPricingModal(); }\n        });\n    } else {\n        showPricingModal();\n    }\n}'
js = js[:idx] + new_func + js[pos:]
pathlib.Path("static/script.js").write_text(js, encoding="utf-8")
print("confirmQuestion updated to random draw, braces:", js.count("{"), "vs", js.count("}"))
