# Offli-Launcher

Launcher hors ligne pour fangames et romhacks Pokémon, sur Windows, Linux et macOS.

Offli-Launcher parcourt un ou plusieurs dossiers (Paramètres > Bibliothèque), repère les fangames RPG Maker (`Game.exe`) et les ROMs (`.gb`, `.gbc`, `.gba`, `.nds`, `.3ds`), et les lance en un clic avec le bon émulateur.

## Démarrer

```bash
npm install        # dépendances + binaire Electron (téléchargé par le postinstall)
npm run dev        # appli en mode développement
npm test           # tests unitaires
npm run typecheck
npm run dist:win   # installeur Windows (aussi dist:linux, dist:mac)
```

## Fonctionnement

- **Bibliothèque** : grille, filtres par plateforme, recherche (Ctrl+K) et fiche détaillée du jeu sélectionné. « Tous les jeux » est rangé en sections (Favoris, puis Fangames, Romhacks GBA, NDS, GB / GBC, 3DS) ; un clic sur le titre d'une section applique le filtre correspondant.
- **Scan** : l'index du dernier scan s'affiche tout de suite au démarrage, puis le dossier est rescanné en arrière-plan.
- **Jeu de base des romhacks** : lu dans l'en-tête de la ROM (code `BPRE` = Rouge Feu, `BPEE` = Émeraude, titre `PM_CRYSTAL` = Cristal, `IREO` = Noir 2…).
- **Lancement** : `Game.exe` directement sous Windows, via Wine sous Linux et macOS. Les ROMs passent par l'émulateur configuré pour leur plateforme (`{rom}` dans les arguments est remplacé par le chemin du fichier).
- **ROMs de base** : une ROM officielle non modifiée (reconnue par son empreinte SHA-1, d'après No-Intro) n'est pas un romhack ; elle est rangée dans « ROMs de base ». Les empreintes sont gardées en cache (chemin, taille, date) pour que les rescans restent rapides.
- **Versions** : plusieurs dossiers du même fangame (même titre) donnent une seule carte, la version la plus récente d'après le nom du dossier (« Fr 1.1.3 ») ; les autres se choisissent dans la fiche.
- **Renommer un jeu** : clic sur son nom dans la fiche. Le nom choisi est gardé d'un scan à l'autre ; « Rétablir » revient au nom détecté.
- **Temps de jeu** et dernière session sont mesurés à la fermeture du jeu.

## Images

Pour chaque jeu, la première source trouvée est utilisée, puis mise en cache :

1. l'image choisie dans Offli-Launcher (« Changer l'image ») ;
2. une image posée à côté du jeu : `cover.png` dans le dossier d'un fangame ; `cover.png` pour une ROM (les captures d'émulateur comme `<rom>-0.png` ne sont jamais utilisées) ;
3. pour un fangame, l'écran titre dans `Graphics/Titles` (`title.png`, sinon la plus grande image hors crédits, splash, intro, fonds et calques d’effet), sinon `Icon.png` ou `project_icon.png` ;
4. SteamGridDB, si activé avec une clé API ;
5. pour un romhack, la jaquette du jeu de base, téléchargée depuis [libretro-thumbnails](https://github.com/libretro-thumbnails) ;
6. pour une ROM NDS, l'icône embarquée dans le fichier.

Sans image, la carte reste vide avec le nom du jeu.

## Thème

Toutes les couleurs sont dans `src/renderer/src/theme/` : un fichier par thème, qui définit des variables sémantiques (`--bg`, `--surface`, `--text`, `--accent`, `--play`, `--focus`…). Pour ajouter un thème, il suffit d'ajouter un fichier sous `:root[data-theme="<nom>"]` et de l'importer dans `theme/index.ts`.

Le thème Offli utilise la palette #18534F, #226D68, #ECF8F6, #FEEAA1 et #D6955B. Contrastes vérifiés (WCAG AA : 4,5:1 pour le texte, 3:1 pour les composants et le texte large) :

| Premier plan | Fond | Usage | Ratio |
| --- | --- | --- | --- |
| #ECF8F6 texte | #0D2E2C fond | texte de la grille | 13,38 |
| #ECF8F6 texte | #18534F surface | barres, fiche, paramètres | 8,09 |
| #ECF8F6 texte | #226D68 surface 2 | boutons, champs | 5,59 |
| #ECF8F6 texte | filtre actif (#D6955B à 20 % sur #18534F) | barre latérale | 6,45 |
| #CBE8E4 texte secondaire | #0D2E2C / #18534F / #226D68 | compteurs, métadonnées | 11,22 / 6,78 / 4,69 |
| #FEEAA1 liens, accent | #18534F / #226D68 | liens de la fiche | 7,32 / 5,06 |
| #D6955B titres de section | #0D2E2C | liens de section, badges fangame | 5,75 |
| #FEEAA1 anneau de focus | #0D2E2C / #18534F / #226D68 | focus clavier | 12,12 / 7,32 / 5,06 |
| #D6955B barre du filtre actif | #18534F | indicateur | 3,48 |
| #5FA8A2 bordures | #18534F / #0D2E2C | contour des champs | 3,19 / 5,27 |
| #FF9C8F erreur | #226D68 | bordure du message d'erreur | 3,01 |

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
