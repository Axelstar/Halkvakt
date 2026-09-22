import hashlib, io, json, re, sys, time, urllib.request, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
# Kort #156 efter deployen: en live.json skriven EFTER deployen, med manifestets sha lika med filens, och vad filtret släpper in.
DEPLOY = sys.argv[1]  # t.ex. 2026-09-22T15:38:15Z
BAS = "https://raw.githubusercontent.com/Axelstar/halkvakt-karta/main/data/app/v1/"
def hamta(namn):
    return urllib.request.urlopen(urllib.request.Request(BAS + namn + f"?t={int(time.time())}", headers={"User-Agent": "halkvakt-claude"}), timeout=30).read()
t0 = time.time()
while True:
    live = hamta("live.json"); m = json.loads(hamta("manifest.json"))
    d = json.loads(live.decode("utf-8"))
    if d["generated_at"] > DEPLOY: break
    if time.time() - t0 > 25 * 60: print("TIMEOUT: ingen live.json efter deployen"); sys.exit(2)
    time.sleep(45)
sha = hashlib.sha256(live).hexdigest()
segs = d.get("segments", [])
ord_ = re.compile(r"(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)|snö|frost", re.I)
kod1 = [s for s in segs if s.get("code") == 1]
mb = [s for s in segs if any(re.search("mycket besvärligt", i, re.I) for i in s.get("info", []))]
print("live.json generated_at", d["generated_at"], "(deploy", DEPLOY + ")")
print("manifestets sha", "STÄMMER" if m["files"]["live"]["sha256"] == sha else "MISMATCH", "·", m["files"]["live"]["sha256"][:12])
print(f"segment {len(segs)} · varav kod 1 {len(kod1)} (släppta på ett halkord) · med 'mycket besvärligt' {len(mb)} (kod: {sorted(set(s.get('code') for s in mb))})")
print("kod 1-segment utan halkord (ska vara 0):", sum(1 for s in kod1 if not any(ord_.search(i) for i in s.get("info", []))))
