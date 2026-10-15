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

- **Paramètres** : quatre onglets (Bibliothèque, Affichage, Émulateurs, Images), navigables aux flèches ; le dernier onglet ouvert est retenu pendant la session.
- **Big Picture** : affichage pour le clavier ou la manette, dans la fenêtre (plein écran si « Plein écran en Big Picture » est coché dans les paramètres) (bouton écran en bas de la barre latérale, ou F11). Flèches ou croix directionnelle pour choisir, Entrée ou A pour jouer, F ou X pour les favoris, Échap ou B pour revenir à la bibliothèque. « Ouvrir au démarrage » dans les paramètres choisit l'affichage de départ.
- **Bibliothèque** : grille, filtres par plateforme, recherche (Ctrl+K) et fiche détaillée du jeu sélectionné. « Tous les jeux » est rangé en sections (Favoris, puis Fangames, Romhacks GBA, NDS, GB / GBC, 3DS) ; un clic sur le titre d'une section applique le filtre correspondant.
- **Scan** : l'index du dernier scan s'affiche tout de suite au démarrage, puis le dossier est rescanné en arrière-plan.
- **Jeu de base des romhacks** : lu dans l'en-tête de la ROM (code `BPRE` = Rouge Feu, `BPEE` = Émeraude, titre `PM_CRYSTAL` = Cristal, `IREO` = Noir 2…).
- **Lancement** : `Game.exe` directement sous Windows, via Wine sous Linux et macOS. Les ROMs passent par l'émulateur configuré pour leur plateforme, ou, s'il n'y en a pas, par l'application associée au fichier (ex. mGBA pour les .gba). Sous Windows, l'exécutable associé est lancé directement (temps de jeu suivi) ; macOS passe par `open -W` ; sous Linux `xdg-open` rend la main tout de suite, donc pas de temps de jeu. Une session de moins de 15 s par l'application par défaut n'est pas comptée. Un émulateur configuré reçoit la ROM comme seul argument.
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

Quatre thèmes, au choix dans Paramètres > Affichage > Thème : **Console** (par défaut, `theme/console.css`), **Électrique** (`theme/electrique.css`), **Poké Ball** (`theme/pokeball.css`) et **Émeraude** (`theme/emeraude.css`). Le bouton JOUER reste vert dans tous. Contrastes vérifiés (WCAG AA : 4,5:1 pour le texte, 3:1 pour les composants et le texte large).

### Console

Palette #16122B, #241D47, #342A66, #F2EFFF, #C3BBEA, #FFCB05 et #9FB4FF.

| Premier plan | Fond | Usage | Ratio |
| --- | --- | --- | --- |
| #F2EFFF texte | #16122B fond / #241D47 panneau / #342A66 surface | texte | 16,07 / 13,84 / 11,12 |
| #F2EFFF texte | filtre actif (#FFCB05 à 20 % sur #241D47) | barre latérale | 8,79 |
| #C3BBEA texte secondaire | #16122B / #241D47 / #342A66 | compteurs, métadonnées | 10,05 / 8,66 / 6,96 |
| #C3BBEA texte secondaire | filtre actif | compteur du filtre actif | 5,50 |
| #FFCB05 accent | #16122B / #241D47 / #342A66 | titres de section, badges fangame, étoile favori | 11,94 / 10,28 / 8,27 |
| #9FB4FF liens, focus | #16122B / #241D47 / #342A66 | liens, anneau de focus, badges ROM | 9,04 / 7,79 / 6,26 |
| #7D71C2 bordures | #241D47 / #16122B | contour des champs et menus | 3,74 / 4,34 |
| #FFCB05 barre du filtre actif | #241D47 | indicateur | 10,28 |
| #FFFFFF texte du bouton Jouer | dégradé #4A8419 → #3D6E13 | JOUER | 4,56 → 6,11 |
| #16122B texte et icône | #FFCB05 (survol #FFD63D) | « Choisir le dossier », bouton Paramètres | 11,94 / 12,93 |
| #FF7A6E bouton « Fermer la fiche » | #241D47 | contour du bouton | 6,16 |
| #16122B croix | #FF7A6E | icône du bouton | 7,15 |
| #FF9C8F erreur | #342A66 | bordure du message d'erreur | 6,23 |

La maquette proposait #6E62B0 pour les bordures : 3,01:1 sur le panneau, trop juste, d'où #7D71C2.

### Électrique

Palette #0E1729, #172440, #22355C, #EEF3FF, #B6C4E2, #FFD23F et #6FA8F0.

| Premier plan | Fond | Usage | Ratio |
| --- | --- | --- | --- |
| #EEF3FF texte | #0E1729 / #172440 / #22355C | texte | 16,11 / 13,87 / 10,91 |
| #B6C4E2 texte secondaire | #0E1729 / #172440 / #22355C | compteurs, métadonnées | 10,21 / 8,79 / 6,92 |
| #FFD23F accent | #0E1729 / #172440 / #22355C | titres de section, filtre actif, étoile favori | 12,39 / 10,67 / 8,40 |
| #6FA8F0 liens, focus | #0E1729 / #172440 / #22355C | liens, anneau de focus, badges ROM | 7,27 / 6,26 / 4,93 |
| #6A84B6 bordures | #172440 / #0E1729 | contour des champs et menus | 4,10 / 4,76 |
| #0E1729 icône et texte | #FFD23F | bouton Paramètres, « Choisir le dossier » | 12,39 |
| #FF7A6E bouton « Fermer la fiche » | #172440 | contour du bouton | 6,06 |
| #0E1729 croix | #FF7A6E | icône du bouton | 7,04 |
| #FF9C8F erreur | #22355C | bordure du message d'erreur | 6,01 |

### Poké Ball

Palette #141518, #1F2126, #2C2F36, #F7F7F5, #BFC3CC, rouge et #FFFFFF. Le rouge #FF5C4D de la maquette ne fait que 4,40:1 sur la surface #2C2F36 : il passe à #FF6E60.

| Premier plan | Fond | Usage | Ratio |
| --- | --- | --- | --- |
| #F7F7F5 texte | #141518 / #1F2126 / #2C2F36 | texte | 17,02 / 15,02 / 12,49 |
| #BFC3CC texte secondaire | #141518 / #1F2126 / #2C2F36 | compteurs, métadonnées | 10,34 / 9,12 / 7,59 |
| #FF6E60 accent rouge | #2C2F36 / #1F2126 / #141518 | titres de section, filtre actif, étoile favori | 4,88 / 5,87 / 6,65 |
| #FFFFFF liens, focus | #141518 / #2C2F36 | liens, anneau de focus | 18,26 / 13,40 |
| #767B87 bordures | #1F2126 / #141518 | contour des champs et menus | 3,80 / 4,31 |
| #141518 icône et texte | #FF6E60 | bouton Paramètres, « Choisir le dossier » | 6,65 |
| #FF7A6E bouton « Fermer la fiche » | #1F2126 | contour du bouton | 6,34 |
| #141518 croix | #FF7A6E | icône du bouton | 7,18 |
| #FF9C8F erreur | #2C2F36 | bordure du message d'erreur | 6,64 |

### Émeraude

Palette #18534F, #226D68, #ECF8F6, #FEEAA1 et #D6955B.

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
| #FFFFFF texte du bouton Jouer | dégradé #4A8419 → #3D6E13 | JOUER | 4,56 → 6,11 |
| #0D2E2C texte | #D6955B | bouton « Choisir le dossier » | 5,75 |
| #0D2E2C icône Paramètres | #D6955B | bouton Paramètres | 5,75 |
| #D6955B fond du bouton Paramètres | #18534F barre latérale | contour du bouton | 3,48 |
| #FF7A6E bouton « Fermer la fiche » | #18534F fiche | contour du bouton | 3,46 |
| #0D2E2C croix | #FF7A6E | icône du bouton | 5,72 |
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
