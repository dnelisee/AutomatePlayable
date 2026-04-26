import random

# ─── VALEURS DE BASE (référence équilibrée) ──────────────────────────────────
BASE = {
    "castleHp":       100,
    "castleSpeed":    15,
    "gravity":        420,
    "aimSensitivity": 1.8,
    "maxDragDist":    110,
    "enemyFireRate":  3200,
    "overviewDur":    0.8,
    "impactDur":      0.9,
    "ctaDelay":       20000,
    "unitDmg_cyclops":  30,
    "unitDmg_skeleton": 18,
    "unitDmg_orc":      45,
    "unitHp_cyclops":   60,
    "unitHp_skeleton":  40,
    "unitHp_orc":       80,
    "ctaText":        "PLAY NOW",
    "bgVariant":      "default",  # "default" | "night" | "snow" | "fire"
}

# ─── PROFILS FIXES ───────────────────────────────────────────────────────────

PROFILES = {

    "easy": {
        # Joueur se sent puissant, victoire rapide, frustration zéro
        "castleHp":       70,
        "castleSpeed":    10,
        "gravity":        380,
        "aimSensitivity": 2.2,    # plus facile à viser
        "maxDragDist":    130,
        "enemyFireRate":  5000,   # ennemi tire rarement
        "impactDur":      1.1,    # on savoure les impacts
        "unitDmg_cyclops":  40,   # unités plus puissantes
        "unitDmg_skeleton": 25,
        "unitDmg_orc":      60,
        "ctaText":        "Play Now — It Gets Harder!",
        "bgVariant":      "default",
    },

    "hard": {
        # Pression maximale, ennemi agressif
        "castleHp":       130,
        "castleSpeed":    22,     # châteaux se rapprochent vite
        "gravity":        480,
        "aimSensitivity": 1.4,   # moins de précision = plus difficile
        "maxDragDist":    90,
        "enemyFireRate":  1800,   # ennemi tire souvent
        "impactDur":      0.6,
        "unitDmg_cyclops":  22,
        "unitDmg_skeleton": 12,
        "unitDmg_orc":      35,
        "ctaText":        "Too Hard? Play the Real Game!",
        "bgVariant":      "night",
    },

    "speedrun": {
        # Tout va vite, durée totale < 12s, adrénaline
        "castleHp":       55,
        "castleSpeed":    35,
        "gravity":        600,    # projectiles tombent vite
        "aimSensitivity": 2.5,
        "maxDragDist":    100,
        "enemyFireRate":  1400,
        "overviewDur":    0.3,    # overview quasi-inexistant
        "impactDur":      0.4,
        "ctaDelay":       10000,  # CTA après 10s max
        "unitDmg_cyclops":  50,
        "unitDmg_skeleton": 30,
        "unitDmg_orc":      70,
        "ctaText":        "⚡ Play Now!",
        "bgVariant":      "fire",
    },

    "chaos": {
        # Physique déréglée, imprévisible, fun absurde
        "castleHp":       80,
        "castleSpeed":    28,
        "gravity":        180,    # gravité très faible → trajectoires folles
        "aimSensitivity": 3.2,   # hyper-sensible
        "maxDragDist":    150,
        "enemyFireRate":  2000,
        "impactDur":      0.7,
        "unitDmg_cyclops":  35,
        "unitDmg_skeleton": 20,
        "unitDmg_orc":      55,
        "ctaText":        "🌀 Embrace the Chaos — Play Now!",
        "bgVariant":      "fire",
    },

    "satisfaction": {
        # Chaque hit est satisfaisant : impacts lents, particules longues
        # Cible : joueurs qui aiment le "juicy feedback"
        "castleHp":       90,
        "castleSpeed":    12,
        "gravity":        350,
        "aimSensitivity": 1.9,
        "maxDragDist":    120,
        "enemyFireRate":  4000,
        "overviewDur":    1.0,   # on voit bien l'état du champ de bataille
        "impactDur":      1.4,   # longue pause post-impact pour savourer
        "unitDmg_cyclops":  38,
        "unitDmg_skeleton": 22,
        "unitDmg_orc":      55,
        "ctaText":        "Feel the Power — Play Now!",
        "bgVariant":      "default",
    },

    "urgence": {
        # Timer visible, pression psychologique, FOMO
        "castleHp":       85,
        "castleSpeed":    25,
        "gravity":        450,
        "aimSensitivity": 1.7,
        "maxDragDist":    100,
        "enemyFireRate":  2200,
        "impactDur":      0.5,
        "ctaDelay":       12000,  # CTA très tôt
        "unitDmg_cyclops":  28,
        "unitDmg_skeleton": 16,
        "unitDmg_orc":      42,
        "ctaText":        "⏰ Limited Time — Play Now!",
        "bgVariant":      "night",
    },

    "skill_based": {
        # Hitbox plus petites, visée précise récompensée, maxDragDist réduit
        # Cible : joueurs compétitifs
        "castleHp":       110,
        "castleSpeed":    18,
        "gravity":        500,    # trajectoires plus rapides = plus technique
        "aimSensitivity": 1.2,   # très faible = micro-ajustements requis
        "maxDragDist":    80,
        "enemyFireRate":  2800,
        "impactDur":      0.8,
        "unitDmg_cyclops":  25,
        "unitDmg_skeleton": 15,
        "unitDmg_orc":      40,
        "ctaText":        "Think You're Good? Prove It — Play Now!",
        "bgVariant":      "night",
    },
}

# ─── GÉNÉRATEUR ALÉATOIRE ────────────────────────────────────────────────────

def random_config(seed=None):
    """
    Génère un CONFIG aléatoire en interpolant entre deux profils
    ou en appliquant des mutations sur BASE.
    Garantit que les valeurs restent dans des plages jouables.
    """
    if seed is not None:
        random.seed(seed)

    RANGES = {
        "castleHp":       (50,  150),
        "castleSpeed":    (8,   40),
        "gravity":        (150, 650),
        "aimSensitivity": (1.0, 3.5),
        "maxDragDist":    (70,  160),
        "enemyFireRate":  (1200,5500),
        "overviewDur":    (0.3, 1.2),
        "impactDur":      (0.4, 1.5),
        "ctaDelay":       (8000,22000),
        "unitDmg_cyclops":  (15, 60),
        "unitDmg_skeleton": (10, 35),
        "unitDmg_orc":      (25, 80),
        "unitHp_cyclops":   (30, 100),
        "unitHp_skeleton":  (20, 70),
        "unitHp_orc":       (50, 130),
    }

    cfg = {}
    for key, (lo, hi) in RANGES.items():
        if isinstance(lo, float) or isinstance(hi, float):
            cfg[key] = round(random.uniform(lo, hi), 2)
        else:
            cfg[key] = random.randint(lo, hi)

    cfg["ctaText"]   = random.choice([
        "Play Now!", "Download Free!", "Try Now!",
        "Join the Battle!", "Play Castle Clashers!"
    ])
    cfg["bgVariant"] = random.choice(["default", "night", "snow", "fire"])

    return cfg


def interpolate_profiles(profile_a: str, profile_b: str, t: float) -> dict:
    """
    Interpole entre deux profils. t=0 → profile_a, t=1 → profile_b.
    Utile pour générer des variantes 'entre easy et hard'.
    """
    a = {**BASE, **PROFILES[profile_a]}
    b = {**BASE, **PROFILES[profile_b]}
    result = {}
    for key in BASE:
        va, vb = a[key], b[key]
        if isinstance(va, (int, float)) and isinstance(vb, (int, float)):
            result[key] = round(va + (vb - va) * t, 2)
        else:
            result[key] = va if t < 0.5 else vb
    return result