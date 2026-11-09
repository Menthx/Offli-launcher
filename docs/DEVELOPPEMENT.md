# Développer Offli-Launcher

Notes techniques pour contribuer. La présentation pour les joueurs est dans le [README](../README.md).

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
- **Temps de jeu** : compté toutes les minutes pendant la partie (`main/sessions.ts`), puis à la fermeture du jeu. Les parties en cours sont notées dans `sessions.json` : si Offli est fermé pendant une partie, il retrouve le jeu au démarrage suivant (même pid et même nom d'exécutable) et continue de compter.
- **Une seule instance** : rouvrir Offli ramène la fenêtre déjà ouverte. `--launch <id>` lance un jeu (raccourci bureau, liste de la barre des tâches Windows, `main/shortcuts.ts`).
- **Pendant une partie** : la fenêtre se réduit et revient au premier plan à la fermeture du jeu (réglage `minimizeOnLaunch`). La manette n'est lue que quand la fenêtre d'Offli a le focus.

## Images

Pour chaque jeu, la première source trouvée est utilisée, puis mise en cache :

1. l'image choisie dans Offli-Launcher (« Changer l'image ») ;
2. une image posée à côté du jeu : `cover.png` dans le dossier d'un fangame ; `cover.png` pour une ROM (les captures d'émulateur comme `<rom>-0.png` ne sont jamais utilisées) ;
3. pour un fangame, le logo ou l'écran titre dans `Graphics/Titles` : seules les images dont le nom contient « logo » ou « title » (ou « titulo », « titre », « titel ») sont candidates, hors crédits, splash, intro, invites et calques. Chacune est notée sur une copie de 48 px (part de pixels opaques × nombre de couleurs) : les contours, masques et silhouettes sont écartés, un logo passe devant un écran complet, une image en portrait a un petit bonus. Les écrans titre d'exemple de Pokémon Essentials sont ignorés (`main/cover/titles.ts`) ;
4. pour un fangame, l'icône de son `.exe` si elle fait au moins 48 px et n'est pas l'icône par défaut du moteur (Poké Ball d'Essentials, engrenage de Pokémon Studio), sinon `Icon.png`, `project_icon.png` ou `graphics/icons/game.png` (Pokémon Studio) ;
5. SteamGridDB, si activé avec une clé API ; avec une clé, « ⋯ > Choisir sur SteamGridDB… » permet aussi de choisir la jaquette soi-même (la clé reste dans le process principal) ;
6. pour un romhack, la jaquette du jeu de base, téléchargée depuis [libretro-thumbnails](https://github.com/libretro-thumbnails) ;
7. pour un fangame, son icône `.exe` même petite (une icône par défaut du moteur laisse la carte avec le nom), sinon l'icône système si elle fait au moins 48 px ; pour une ROM NDS, l'icône embarquée dans le fichier.

Sans image, la carte reste vide avec le nom du jeu.

## Thème

Les tokens viennent du pack DA « Thème sombre doux » : `src/renderer/src/theme/tokens.css` définit les surfaces (`--color-inset` < `--color-bg` < `--color-surface` < `--color-elevated`), le texte, l'accent, les états, les rayons, les espacements, les ombres et la typo (Inter, JetBrains Mono). Les styles sont rangés par zone dans `src/renderer/src/styles/` (base, contrôles, bibliothèque, fiche, paramètres, superpositions, Big Picture, tutoriel) et n'utilisent que ces tokens. Un thème ne redéfinit que les couleurs `--color-*` (et `--play-bg`, `--fav-on`, `--badge-*`, `--pad-*`) sous `:root[data-theme="<nom>"]`, importé dans `theme/index.ts`.

Cinq thèmes, au choix dans Paramètres > Affichage > Thème : **Doux** (`theme/tokens.css`), **Console** (`theme/console.css`), **Électrique** (`theme/electrique.css`), **Poké Ball** (par défaut, `theme/pokeball.css`) et **Émeraude** (`theme/emeraude.css`). Le bouton Jouer prend l'accent dans Doux et reste vert dans les quatre autres. Contrastes vérifiés (WCAG AA : 4,5:1 pour le texte, 3:1 pour les composants et le texte large).

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

## Publier une version

Les installeurs sont construits par GitHub Actions (`.github/workflows/release.yml`) pour Windows (installeur et portable `.exe`), Linux (AppImage, `.deb`) et macOS (`.dmg` x64 et arm64), puis déposés dans une release **en brouillon**.

1. Changer `version` dans `package.json` (ex. `0.2.0`) et commiter.
2. `git tag v0.2.0`
3. `git push origin main --tags`
4. Sur GitHub, onglet Releases : vérifier le brouillon créé par la CI, puis le publier.

Les builds ne sont pas signés :
- **Windows** : SmartScreen affiche « Windows a protégé votre ordinateur » ; cliquer sur « Informations complémentaires », puis « Exécuter quand même ».
- **macOS** : Gatekeeper bloque l'ouverture ; faire un clic droit sur l'appli, choisir « Ouvrir », puis confirmer (ou Réglages Système > Confidentialité et sécurité > « Ouvrir quand même »).

## Messages de commit

Les commits suivent [Conventional Commits](https://www.conventionalcommits.org/fr/) : `type(portée): description` à l'impératif, en minuscules, sans point final (ex. `feat(scanner): detect rpg maker fangames from ini files`). Types : `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `chore`, `ci`. Le corps explique le pourquoi ; un changement incompatible ajoute un pied `BREAKING CHANGE:`. Un commit par changement logique.

## Structure

```
src/main/       process Electron : scan, en-têtes ROM, images, lancement, stockage JSON
src/preload/    pont IPC exposé au rendu (window.offli)
src/renderer/   interface Vue 3 : Bibliothèque, page du jeu, Big Picture, paramètres, tutoriel
src/shared/     types partagés
tests/          tests Vitest
```

Les données (paramètres, statistiques, index, cache d'images) sont dans le dossier utilisateur d'Electron. `OFFLI_USER_DATA` permet d'en choisir un autre.

## Interface (Vue)

L'interface est en Vue 3 (`<script setup lang="ts">`, composants monofichiers `.vue`), compilée par `@vitejs/plugin-vue` dans electron-vite ; `npm run typecheck` passe les `.vue` à `vue-tsc`.

- `App.vue` tient l'état de l'appli (données, vue affichée, jeu ouvert) ; les données et leurs actions viennent de `composables/useLibraryData.ts`.
- Les composants reçoivent des props et remontent des événements (`emit`) ; `v-model` sert aux listes déroulantes, interrupteurs et champs de recherche.
- Les données venues du process principal sont gardées dans des `shallowRef` : ce sont des objets simples, renvoyés tels quels par IPC (un proxy Vue ne passe pas le pont).
- `i18n.ts` rend `t()` réactif : changer de langue redessine les textes sans recharger.
- La logique sans interface (`filters.ts`, `tour.ts`, `folders.ts`, `updateUi.ts`…) reste en TypeScript pur, testée par Vitest.
- `v-focus` (`directives/focus.ts`) donne le focus à un champ qui apparaît (l'attribut `autofocus` ne marche qu'au chargement de la page).

## Dépendances

Les paquets dépréciés tirés indirectement par `electron-builder` sont remplacés via `overrides` dans `package.json` :

- `@electron/asar` 4 (au lieu de 3, qui tirait `glob` 7 et `inflight`) ;
- `@electron/get` 5 (au lieu de 3, qui tirait `global-agent` et `boolean`) ;
- `rimraf` 2 (utilisé par `temp`) est remplacé par `tools/shims/rimraf`, une petite implémentation basée sur `fs.rm` natif.
- `lodash.isequal` (utilisé par `electron-updater`) est remplacé par `tools/shims/lodash.isequal`, basé sur `util.isDeepStrictEqual` natif.

## Mises à jour

`electron-updater` lit les releases GitHub **publiées** (pas les brouillons ni les préversions) grâce aux fichiers `latest*.yml` produits par `release.yml`. L'appli vérifie une fois au démarrage (version empaquetée seulement) ; télécharger et installer demandent un clic. Installation automatique : installeur Windows et AppImage. Windows portable, `.deb` et macOS (non signé) : la nouvelle version est signalée et le bouton ouvre la page de la release. Une version qui n'embarque pas encore l'updater (0.2.0 et avant) ne peut pas se mettre à jour seule.

## Langues (i18n)

L'interface est traduite en français, anglais et espagnol. Les textes sont dans `src/shared/i18n/` : un dossier par langue (`fr/`, `en/`, `es/`), chacun découpé en `app.ts` (bibliothèque, fiche, Big Picture, messages du process principal) et `setup.ts` (paramètres, tutoriel, mises à jour, SteamGridDB). Le français est la référence : TypeScript et `tests/i18n.test.ts` vérifient que chaque langue a exactement les mêmes clés et les mêmes paramètres `{nom}`.

Dans le code : `t('library.launching', { name })`. Une entrée `{ one, other }` choisit le singulier ou le pluriel d'après `{n}` (règles de `Intl.PluralRules`). Le réglage « Langue » (Paramètres > Affichage) vaut `auto` par défaut : la langue du système si elle est disponible, l'anglais sinon. Pour ajouter une langue : copier `en/`, traduire, l'ajouter à `LANGUAGES` et `DICTS` dans `i18n/index.ts` et à la liste acceptée par `mergeSettings` (`store.ts`).

## Règles du code

- **200 lignes au plus par fichier** (210 tolérées), découpé par thème. `npm run check:lines` le vérifie, en CI aussi.
- **Formatage** : Prettier (`npm run format`, vérifié en CI par `npm run format:check`). Les feuilles de style gardent l'écriture compacte du pack DA (une règle par ligne) et ne passent pas par Prettier.
- **Contrastes** : `tests/contrast.test.ts` mesure les couleurs des 5 thèmes (WCAG AA : 4,5:1 pour le texte, 3:1 pour les icônes et `--color-text-subtle`, réservé au décoratif).
