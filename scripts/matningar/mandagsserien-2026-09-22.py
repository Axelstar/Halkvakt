import io, json, subprocess, sys, urllib.request, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
# Kort #160: startade måndagsseriens sju pulsjobb i tid 21/9? Bara läsande (GitHub-API:t), inga körningar startas.
REPO = "Axelstar/Halkvakt"
ut = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n", capture_output=True, text=True, check=True).stdout
TOKEN = next(r.split("=", 1)[1] for r in ut.splitlines() if r.startswith("password="))
H = {"Authorization": "Bearer " + TOKEN, "Accept": "application/vnd.github+json", "User-Agent": "halkvakt-claude"}
def api(v): return json.loads(urllib.request.urlopen(urllib.request.Request("https://api.github.com" + v, headers=H)).read())
SERIE = [("grind-a.yml", "05:40"), ("smhi-prov.yml", "06:00"), ("cell-matning-v3.yml", "06:20"), ("trv-bevakning.yml", "06:40"),
         ("hojd-prov.yml", "07:00"), ("grind-v-a.yml", "07:20"), ("grind-v-b.yml", "07:40")]
t = lambda s: datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
print(f"{'flöde':22} {'bokad':6} {'skapad':9} {'start':9} {'sen':>6}  {'händelse':18} {'utfall':8} körning")
maxsen = 0
for fil, bokad in SERIE:
    rs = api(f"/repos/{REPO}/actions/workflows/{fil}/runs?created=2026-09-21&per_page=20")["workflow_runs"]
    if not rs: print(f"{fil:22} {bokad:6} INGEN KÖRNING 21/9"); continue
    for r in sorted(rs, key=lambda r: r["created_at"]):
        b = t(f"2026-09-21T{bokad}:00Z"); sk = t(r["created_at"]); st = t(r.get("run_started_at") or r["created_at"])
        sen = (sk - b).total_seconds(); maxsen = max(maxsen, sen)
        print(f"{fil:22} {bokad:6} {r['created_at'][11:19]:9} {st.isoformat()[11:19]:9} {sen:5.0f}s  {r['event']:18} {str(r['conclusion']):8} {r['id']}")
print(f"\nstörsta försening från bokad minut till skapad körning: {maxsen:.0f} s")
