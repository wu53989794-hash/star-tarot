import re
content = open(r"static/script.js", "r", encoding="utf-8").read()
funcs = set(re.findall(r"function (\w+)\(", content))
af = set(re.findall(r"async function (\w+)\(", content))
all_f = funcs | af
print(f"Defined: {len(all_f)} functions")
important = ["revealCards","showPricingModal","updateRemainingBadge","useReading",
  "populateRevealedCards","showReadingResult","restartReading",
  "showPaymentQr","confirmTrustPayment","getOrCreateDeviceId","closePricingModal",
  "selectCategory","drawCards","_startReading","_doDrawAndRead","prepaidFlow"]
for f in important:
    print(f"  {f}: {'OK' if f in all_f else 'MISSING!'}")
print(f"File length: {len(content)} chars, {len(content.splitlines())} lines")
