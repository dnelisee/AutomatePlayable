# validate.py
import os, json
from pathlib import Path

OUTPUT_DIR = Path("output")
MAX_SIZE_KB = 5120

results = []

for html_file in sorted(OUTPUT_DIR.glob("*.html")):
    size_kb = html_file.stat().st_size / 1024
    content = html_file.read_text(encoding="utf-8")

    checks = {
        "size_ok":        size_kb < MAX_SIZE_KB,
        "has_canvas":     "<canvas" in content,
        "has_config":     "const CONFIG" in content,
        "has_cta":        "PLAY NOW" in content or "Play Now" in content,
        "has_touch":      "touchstart" in content,
        "no_cdn":         "cdn." not in content and "jsdelivr" not in content,
        "no_external":    'src="http' not in content,
        "has_gameloop":   "requestAnimationFrame" in content,
        "has_try_catch":  "try {" in content or "try{" in content,
        "has_fallback":   "setTimeout" in content,
    }

    passed = sum(checks.values())
    total  = len(checks)
    status = "✅" if passed == total else "⚠️ " if passed >= total-2 else "❌"

    results.append({
        "file":    html_file.name,
        "size_kb": round(size_kb, 1),
        "passed":  passed,
        "total":   total,
        "checks":  checks,
    })

    print(f"{status} {html_file.name}")
    print(f"   {size_kb:.0f} KB — {passed}/{total} checks")
    for k, v in checks.items():
        if not v:
            print(f"   ❌ FAIL: {k}")

# Résumé
ok = sum(1 for r in results if r["passed"] == r["total"])
print(f"\n{'='*50}")
print(f"✅ {ok}/{len(results)} fichiers passent tous les checks")

# Export JSON pour la démo
with open("validation_report.json", "w") as f:
    json.dump(results, f, indent=2)
print("📄 Rapport exporté → validation_report.json")