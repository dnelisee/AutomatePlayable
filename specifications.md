# Instructions Système pour la Création des Playables Ads (Voodoo Hackathon)

## 🎯 OBJECTIF
Générer un **Playable Ad** (publicité jouable) dans le fichier "index.html" du dossier "src", sous forme de prototype HTML interactif pour le jeu *Castle Clasher*, en te basant sur l'analyse d'une ou des vidéos présentes dans le dossier "videos" et les ressources présente dans le dossier "assets".

Clairifions ce que j'appelle analyse des vidéos. il s'agit d'extraire les caractéristiques (physique du jeu, personnages, effets, couleurs, etc etc). Le résultat de l'analyse est déjà faite et présente dans le fichier "game_analysis.json" présent dans le dossier "src". 

Ce prototype doit être extrêmement léger, performant sur mobile et très engageant ("juicy").

Pour cela, inspire toi des exemples d'autres playables models présents dans le dossier "CodeModels" qui respectent les contraintes techniques ci-dessous : 


## 🛑 CONTRAINTES TECHNIQUES STRICTES (CRITIQUE)
- **Format de Sortie :** Un **UNIQUE fichier HTML** contenant absolument tout (HTML, CSS, JS).
- **Zéro Dépendance Externe :** AUCUN lien CDN (vers des polices ou librairies externes), AUCUNE librairie lourde, AUCUN iframe. L'utilisation de JavaScript natif (Vanilla JS) ou de micro-moteurs intégrés directement au code est imposée.
- **Gestion des Assets :** TOUS les assets visuels et sonores (images, sprites, sons) doivent obligatoirement être :
  1. Soit encodés en **Base64** et intégrés ("inlinés") directement en dur dans le fichier HTML.
  2. Soit générés procéduralement à l'exécution (Canvas API, Web Audio API, SVG).
- **Poids Maximum :** **< 5 Mo** au total (HTML + scripts + CSS + assets inlinés). Le temps de chargement doit être quasi instantané.
- **Compatibilité :** Le code doit s'exécuter de manière fluide sur les navigateurs mobiles standards (Safari iOS, Chrome Android) et passer avec succès la validation officielle [AppLovin Playable Preview](https://p.applov.in/playablePreview?create=1).

---

## 🎮 CONCEPTION DU GAMEPLAY ET QUALITÉ ("JUICINESS")
- **Focus sur l'interaction cœur :** Ne t'éparpille pas. Isole la mécanique la plus "fun" et caractéristique de la vidéo fournie et recrée-la. Un seul niveau très court, parfaitement exécuté, vaut mieux qu'un jeu complet buggé.
- **Performances & Fluidité :** Le jeu doit cibler les 60 FPS constants. Évite les calculs lourds dans la boucle de rendu (`requestAnimationFrame`).
- **Polish :** Intègre un maximum de feedback pour le joueur ("juiciness"). Ajoute des micro-animations, des effets de particules simples, des tremblements d'écran (screen shake) et un retour sonore, même basique.

---

## ⚙️ ROBUSTESSE ET ARCHITECTURE DU PIPELINE (LE CŒUR DU DÉFI)
L'objectif final n'est pas seulement de pondre un fichier HTML, mais de démontrer la viabilité d'un **pipeline de production automatisé et modulaire**.

- **Génération de Variations :** L'architecture de ton code doit s'articuler autour d'une **configuration centralisée**. Tous les éléments modifiables (vitesse d'apparition, nombre d'ennemis, difficulté, palettes de couleurs, PV) doivent être paramétrés dans un objet de configuration unique en haut du script.
- **Itération rapide :** On doit pouvoir générer de multiples variations du jeu en changeant simplement ces paramètres, prouvant ainsi que l'outil permet d'effectuer de l'A/B testing facilement.
- **Séparation logique :** Même dans un seul fichier, sépare bien (via des classes ou modules internes) : le Moteur/Boucle principale, les Entités, la Logique d'affichage, et la Configuration.

---
