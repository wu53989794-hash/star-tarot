import sys, pathlib
js = pathlib.Path("static/script.js").read_text(encoding="utf-8")

# 1. Revert confirmQuestion to show step-browse
cq_idx = js.find("function confirmQuestion()")
if cq_idx < 0: print("ERROR: confirmQuestion not found"); exit()
brace = js.index("{", cq_idx)
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
new_cq = 'function confirmQuestion() {\n    const question = document.getElementById("question-text").value.trim();\n    state.question = question || "";\n    closeQuestionModal();\n    showStep("step-browse");\n    document.getElementById("browse-desc").textContent = "\u5360\u535c\uff1a" + CATEGORY_NAMES[state.selectedCategory] + " \u2014\u2014 \u6ed1\u52a8\u6d4f\u89c8\uff0c\u7136\u540e\u62bd\u724c";\n    loadBrowseCards();\n}'
js = js[:cq_idx] + new_cq + js[pos:]
print("confirmQuestion reverted to browse view")

# 2. Modify _doDrawAndRead to always use random (ignore selected card positions)
ddr_idx = js.find("function _doDrawAndRead")
if ddr_idx < 0: print("ERROR: _doDrawAndRead not found"); exit()
brace = js.index("{", ddr_idx)
# Track to find the fetchBody line
fetch_idx = js.find('var fetchBody', ddr_idx)
if fetch_idx < 0: print("ERROR: fetchBody not found"); exit()
semi_idx = js.find(';', fetch_idx)
if semi_idx < 0: print("ERROR: semicolon not found"); exit()
# Replace the entire var fetchBody = ... ; line
old_line = js[fetch_idx:semi_idx+1]
new_line = 'var fetchBody = JSON.stringify({ count: 3 })'
js = js[:fetch_idx] + new_line + js[semi_idx+1:]
if old_line.find('fetchBody') >= 0:
    print("_doDrawAndRead: always uses random now")
else:
    print("WARNING: _doDrawAndRead pattern not matched")

pathlib.Path("static/script.js").write_text(js, encoding="utf-8")
print("Done, braces:", js.count("{"), "vs", js.count("}"))
