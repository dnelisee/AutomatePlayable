import json
import random
import argparse
from pathlib import Path
from config_profiles import BASE, PROFILES, random_config, interpolate_profiles

TEMPLATE_PATH = Path("template.html")
OUTPUT_DIR    = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)


def config_to_js(cfg: dict) -> str:
    """Convertit un dict Python en bloc JS CONFIG injectable."""
    lines = ["const CONFIG = {"]
    for k, v in cfg.items():
        if isinstance(v, str):
            lines.append(f'  {k}: "{v}",')
        elif isinstance(v, bool):
            lines.append(f'  {k}: {"true" if v else "false"},')
        else:
            lines.append(f'  {k}: {v},')
    lines.append("};")
    return "\n".join(lines)


def generate(profile_name: str, cfg: dict, index: int) -> Path:
    """Injecte le CONFIG dans le template et écrit le fichier."""
    template = TEMPLATE_PATH.read_text(encoding="utf-8")

    js_config = config_to_js(cfg)

    # Le template contient le placeholder {{CONFIG}}
    output = template.replace("{{CONFIG}}", js_config)

    # Injecter aussi le nom du profil dans le titre
    output = output.replace("{{PROFILE}}", profile_name)

    filename = f"variation_{profile_name}_{index:02d}.html"
    out_path = OUTPUT_DIR / filename
    out_path.write_text(output, encoding="utf-8")

    size_kb = out_path.stat().st_size / 1024
    status = "✅" if size_kb < 5120 else "❌ >5MB"
    print(f"  {status} {filename} — {size_kb:.0f} KB")
    return out_path


def main():
    parser = argparse.ArgumentParser(description="Castle Clashers variation generator")
    parser.add_argument("--profiles", nargs="+",
                        choices=list(PROFILES.keys()) + ["random", "all"],
                        default=["all"],
                        help="Profils à générer")
    parser.add_argument("--n-random", type=int, default=3,
                        help="Nombre de variations random à générer")
    parser.add_argument("--interpolate", nargs=3,
                        metavar=("PROFILE_A", "PROFILE_B", "STEPS"),
                        help="Interpoler entre deux profils en N étapes")
    parser.add_argument("--seed", type=int, default=None,
                        help="Seed pour reproductibilité du random")
    args = parser.parse_args()

    print("\n🎮 Castle Clashers — Variation Generator\n")

    # ── Profils fixes ──────────────────────────────────────────────────────
    profiles_to_gen = list(PROFILES.keys()) if "all" in args.profiles \
                      else [p for p in args.profiles if p != "random"]

    for i, name in enumerate(profiles_to_gen, 1):
        cfg = {**BASE, **PROFILES[name]}
        generate(name, cfg, i)

    # ── Variations random ──────────────────────────────────────────────────
    if "random" in args.profiles or "all" in args.profiles:
        print(f"\n🎲 {args.n_random} variations aléatoires :")
        for i in range(args.n_random):
            seed = (args.seed or 0) + i
            cfg  = random_config(seed=seed)
            generate(f"random_seed{seed}", cfg, i + 1)

    # ── Interpolation entre deux profils ───────────────────────────────────
    if args.interpolate:
        pa, pb, steps = args.interpolate[0], args.interpolate[1], int(args.interpolate[2])
        print(f"\n↔️  Interpolation {pa} → {pb} en {steps} étapes :")
        for i in range(steps):
            t   = i / (steps - 1) if steps > 1 else 0
            cfg = interpolate_profiles(pa, pb, t)
            name = f"interp_{pa}_{pb}_{i+1}of{steps}"
            generate(name, cfg, i + 1)

    print(f"\n✅ Fichiers générés dans ./{OUTPUT_DIR}/")


if __name__ == "__main__":
    main()