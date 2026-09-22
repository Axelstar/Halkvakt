import io, json, subprocess, sys, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
# Kort #160 (b): finns issuen med etiketten matvakt sedan provet, och är den stängd av en senare grön timkörning? Bara läsande.
REPO = "Axelstar/Halkvakt"
ut = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n", capture_output=True, text=True, check=True).stdout
TOKEN = next(r.split("=", 1)[1] for r in ut.splitlines() if r.startswith("password="))
H = {"Authorization": "Bearer " + TOKEN, "Accept": "application/vnd.github+json", "User-Agent": "halkvakt-claude"}
since = sys.argv[1] if len(sys.argv) > 1 else "2026-09-22T14:16:00Z"
rs = json.loads(urllib.request.urlopen(urllib.request.Request(
    f"https://api.github.com/repos/{REPO}/issues?labels=matvakt&state=all&since={since}&per_page=10", headers=H)).read())
if not rs: print("inga matvakt-issuer sedan", since)
for i in rs:
    print(f"#{i['number']} {i['state']:6} skapad {i['created_at']} stängd {i['closed_at']} · {i['title'][:80]}")
    if "PROV" in (i.get("body") or ""): print("   bär provraden: ja")
