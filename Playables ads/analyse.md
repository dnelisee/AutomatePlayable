# Analyse de l'Architecture de Castle Clasher (playable5.html)

Ce document détaille le fonctionnement interne de la Playable Ad "Castle Clasher". Le code source épuré de ses assets volumineux a été généré dans le fichier `playable5analyse.html`.

## 1. Philosophie et Architecture Globale
Le fichier a été pensé pour être **100% autonome** (Zéro dépendance externe). Tout est contenu dans un seul fichier HTML : le style CSS minimaliste, le moteur de jeu en Javascript natif (Vanilla JS) dessiné via l'API Canvas 2D, et les assets (images et sons) encodés en Base64.
La boucle de jeu (Gameloop) s'appuie sur `requestAnimationFrame` pour assurer une fluidité maximale (60 FPS). La logique est divisée en **états (State Machine)** pour gérer le tour par tour.

## 2. Dictionnaire de Configuration (`CONFIG` & `UNIT_STATS`)
Pour garantir que les développeurs ou Game Designers puissent équilibrer le jeu facilement sans chercher dans le code métier, une constante `CONFIG` centralise la physique (gravité, sensibilité de la visée, vitesse des châteaux, etc.).
`UNIT_STATS` définit les statistiques des personnages (PV, dégâts, position relative dans le château `relX` et `relY`).

## 3. La Boucle Principale (`update` et `render`)
La fonction `update(ts)` tourne en boucle à chaque rafraîchissement de l'écran. 
Le Delta Time (`dt`) est calculé pour rendre la physique indépendante du framerate (si le jeu lag, les objets bougent plus vite entre les frames pour compenser).
Elle appelle séquentiellement :
- `updatePhase(dt)` : Avance la machine à états.
- `updateCamera(dt)` : Gère les zooms et déplacements de caméra.
- `updateCastles(dt)` : Gère l'avancée et le "rebond" des châteaux sur le terrain.
- La physique des projectiles, particules et dégâts.
- Enfin, `render()` pour tout redessiner.

## 4. Machine à États (State Machine)
La variable `state` dicte ce qui se passe et ce qui est affiché. Les états sont les suivants :
- **S.OVERVIEW** : Phase d'attente (0.8s) où l'on voit l'ensemble du champ de bataille. Les façades sont affichées (`facadeAlpha = 1`).
- **S.FOCUS** : La caméra commence à zoomer vers le château de l'équipe active.
- **S.REVEAL** : Le fondu (alpha) de la façade de l'équipe active descend progressivement vers 0. On découvre l'intérieur.
- **S.AIM** : État où le joueur (ou l'IA) vise. Le jeu attend l'interaction du joueur. C'est ici que la logique d'étirement du slingshot se passe.
- **S.SHOOT** : Le projectile est lancé. Instantanément, les façades des deux châteaux repassent en opacité totale (1) pour masquer l'intérieur pendant l'action. La caméra suit le projectile.
- **S.IMPACT** : Temps d'arrêt post-impact pour observer l'explosion et les particules avant de changer de tour.

## 5. Logique de Facade et Masquage
C'est le changement majeur de la v5. Le système de masque n'est plus basé sur un découpage de grille mais sur une règle simple de visibilité d'interface dictée par la State Machine :
1. Dans `updatePhase`, lors du passage à l'état `REVEAL` / `AIM`, on met `facadeAlpha = 0` pour cacher le château.
2. La fonction `drawCastle()` dessine systématiquement les personnages et l'intérieur.
3. Ensuite, SI `facadeAlpha > 0`, l'image de la façade est dessinée par-dessus (masquant naturellement ce qui est derrière).
4. Par-dessus tout cela, on appelle `drawCracks()` qui trace des lignes noires (fissures) persistantes pour représenter les dégâts sans avoir à modifier l'image de la façade.

## 6. Logique de Collision et Fissures
Dans la boucle de mise à jour des projectiles, un projectile heurte un château si ses coordonnées `x` et `y` entrent dans le rectangle de la hitbox (`tgt.x`, `tgt.y`, `tgt.w`, `tgt.h`).
**Au moment de l'impact :**
- Les HP du château sont réduits.
- Une unité proche de l'impact encaisse également des dégâts de zone.
- De nouvelles coordonnées de **fissures** (`cracks`) sont générées aléatoirement *autour du point d'impact précis*. Elles sont stockées dans le tableau `c.cracks` du château et seront redessinées continuellement, accumulant les marques de dégâts.

## 7. Conditions de Victoire (`nextTurn()`)
La méthode `nextTurn()` est le cœur de la boucle logique. Elle s'exécute après la fin de la phase `IMPACT`.
Son rôle premier est de vérifier les conditions d'arrêt :
- Vérifie si les HP du château Bleu sont `<= 0` ou si tous ses personnages restants ont `<= 0` HP.
- Fait de même pour l'équipe Rouge.
Si l'une de ces conditions est vraie, elle passe le jeu à l'état `WIN` ou `LOSE`, ce qui coupe la boucle `update()` et affiche le CTA (Call to Action) final. *Il n'y a délibérément aucun timer caché forçant cette fin prématurément.*
S'il n'y a pas de gagnant, elle échange l'équipe active, remet l'état en `S.OVERVIEW`, et la boucle recommence.

## 8. Mécanique de Tir Inversé (Slingshot)
L'interaction passe par `onDown` (début du clic/touch), `onMove` (glissement) et `onUp` (relâchement).
Dans l'état `S.AIM` (et uniquement pour le joueur "blue"), on enregistre la position initiale (`dragStart`).
Pendant le déplacement, la distance entre le doigt actuel (`dragCurrent`) et le point de départ est calculée.
La prédiction de trajectoire (`drawTrajectory`) et la vitesse initiale du projectile (`vx`, `vy` dans `onUp`) utilisent la formule :
`v = (dragStart - dragCurrent) * constante`
Si le joueur tire son doigt en bas à gauche (Current < Start), le résultat de la soustraction sera **positif**, donc la force est orientée vers le haut à droite. C'est l'essence du "Drag to Shoot" à l'envers.

## 9. Le Rendu (`render`)
Le canvas est entièrement nettoyé à chaque frame (`ctx.clearRect`).
On applique d'abord les transformations de caméra (`translate` et `scale`). Le tremblement d'écran (`shakeAmt`) modifie très légèrement la traduction (translation) pour un effet dynamique d'impact.
L'ordre d'affichage suit strictement le "Painter's Algorithm" (ce qui est dessiné en dernier s'affiche devant) :
1. Background (Paysage)
2. Terrain (la colline courbe)
3. Châteaux (Intérieur -> Personnages -> Façade -> Fissures)
4. Projectiles et Particules (Explosions)
5. Chiffres de Dégâts (DmgNumbers)
6. HUD, Dock de sélection (en annulant la caméra pour rester fixé à l'écran).
