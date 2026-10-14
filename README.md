# Offli-Launcher

Launcher hors ligne pour fangames et romhacks Pokémon, sur Windows, Linux et macOS.

Offli-Launcher parcourt un dossier, repère les fangames RPG Maker (`Game.exe`) et les ROMs (`.gb`, `.gbc`, `.gba`, `.nds`, `.3ds`), et les lance en un clic avec le bon émulateur.

## Démarrer

```bash
npm install        # dépendances + binaire Electron (téléchargé par le postinstall)
npm run dev        # appli en mode développement
npm test           # tests unitaires
npm run typecheck
npm run dist:win   # installeur Windows (aussi dist:linux, dist:mac)
```

## Fonctionnement

- **Bibliothèque** : grille, filtres par plateforme, recherche (Ctrl+K) et fiche détaillée du jeu sélectionné.
- **Scan** : l'index du dernier scan s'affiche tout de suite au démarrage, puis le dossier est rescanné en arrière-plan.
- **Jeu de base des romhacks** : lu dans l'en-tête de la ROM (code `BPRE` = Rouge Feu, `BPEE` = Émeraude, titre `PM_CRYSTAL` = Cristal, `IREO` = Noir 2…).
- **Lancement** : `Game.exe` directement sous Windows, via Wine sous Linux et macOS. Les ROMs passent par l'émulateur configuré pour leur plateforme (`{rom}` dans les arguments est remplacé par le chemin du fichier).
- **Temps de jeu** et dernière session sont mesurés à la fermeture du jeu.

## Images

Pour chaque jeu, la première source trouvée est utilisée, puis mise en cache :

1. l'image choisie dans Offli-Launcher (« Changer l'image ») ;
2. une image posée à côté du jeu : `cover.png` dans le dossier d'un fangame, `<nom de la rom>.png` ou `cover.png` pour une ROM ;
3. pour un fangame, l'écran titre dans `Graphics/Titles` ;
4. SteamGridDB, si activé avec une clé API ;
5. pour un romhack, la jaquette du jeu de base, téléchargée depuis [libretro-thumbnails](https://github.com/libretro-thumbnails) ;
6. pour une ROM NDS, l'icône embarquée dans le fichier.

Sans image, la carte reste vide avec le nom du jeu.

## Structure

```
src/main/       process Electron : scan, en-têtes ROM, images, lancement, stockage JSON
src/preload/    pont IPC exposé au rendu (window.offli)
src/renderer/   interface React : vue Bibliothèque, paramètres
src/shared/     types partagés
tests/          tests Vitest
```

Les données (paramètres, statistiques, index, cache d'images) sont dans le dossier utilisateur d'Electron. `OFFLI_USER_DATA` permet d'en choisir un autre.

## Dépendances

Les paquets dépréciés tirés indirectement par `electron-builder` sont remplacés via `overrides` dans `package.json` :

- `@electron/asar` 4 (au lieu de 3, qui tirait `glob` 7 et `inflight`) ;
- `@electron/get` 5 (au lieu de 3, qui tirait `global-agent` et `boolean`) ;
- `rimraf` 2 (utilisé par `temp`) est remplacé par `tools/shims/rimraf`, une petite implémentation basée sur `fs.rm` natif.
