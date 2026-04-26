# applovin_test.py
# Ouvre chaque variation dans un onglet pour tester rapidement

import webbrowser, time
from pathlib import Path

files = sorted(Path("output").glob("*.html"))
print(f"🚀 Ouverture de {len(files)} fichiers dans le navigateur")
print("   Va sur https://p.applov.in/playablePreview?create=1")
print("   et uploade chaque fichier\n")

for f in files:
    abs_path = f.resolve()
    print(f"  → {f.name} ({abs_path.stat().st_size//1024} KB)")