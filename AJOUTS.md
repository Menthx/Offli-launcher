# Ajouts à Offli-Launcher

Ce document résume tout ce qui a été ajouté ou modifié par rapport à la version 0.3.1 : la nouvelle direction artistique, les nouvelles fonctions, le découpage du code et les outils de contrôle. Il sert de point d'entrée pour relire les changements.

## En bref

| Domaine | Ce qui change |
| --- | --- |
| Apparence | Thème **Doux** (pack DA « Thème sombre doux »), police Inter, nouveaux composants (liste déroulante, infobulles, rail Jouer) |
| Bibliothèque | Tri, état « En cours », miniatures des jaquettes, icônes des `.exe`, noms des jeux de base traduits |
| Big Picture | Refait : le jeu courant reste en place, fond adapté à l'image, sections LB / RB, tri avec Y |
| Langues | Interface en français, anglais et espagnol |
| Données | Export / import d'une sauvegarde JSON |
| Code | Aucun fichier au-delà de 200 lignes, commentaires en anglais sur une ligne, Prettier, contrôles en CI |

## Apparence : le pack DA

- **Tokens** : `src/renderer/src/theme/tokens.css` reprend les tokens du pack (surfaces `inset < bg < surface < elevated`, texte, accent, états, rayons, espacements, ombres, typo). Tous les styles passent par ces tokens.
- **Thèmes** : Poké Ball devient le thème par défaut. Doux, Console, Électrique et Émeraude restent disponibles et ne redéfinissent que les couleurs (`theme/<nom>.css`). Un réglage déjà enregistré est conservé.
- **Styles** : l'ancien `styles.css` (1 576 lignes) est découpé par zone dans `src/renderer/src/styles/` : base, contrôles, bibliothèque, fiche, paramètres, superpositions, Big Picture, tutoriel, liste déroulante, infobulle.
- **Police** : Inter et JetBrains Mono, embarquées avec fontsource (l'appli reste hors ligne).
- **Composants du pack** :
  - liste déroulante `components/Select.tsx` (langue, tri, version d'un fangame, choix SteamGridDB), utilisable entièrement au clavier ;
  - infobulles `tooltip.ts` sur tout élément `data-tooltip="Texte|Raccourci"` et sur les boutons-icônes ;
  - paramètres en deux colonnes (navigation à gauche, groupes en cartes à droite) ;
  - rail Jouer de la fiche : Jouer surélevé avec le raccourci Entrée, favori et menu ☰ à plat.
  - page du jeu façon Steam à la place de la grille (bouton « ← Bibliothèque » ou Échap pour revenir, la grille reprend où on l'était) : grande bannière avec le nom, barre Jouer avec dernière session et temps de jeu, puis les infos.

## Bibliothèque

- **Tri** : par nom, par jeux joués récemment ou par temps de jeu, en haut à droite de la grille. Le choix est enregistré (`librarySort`).
- **Jeu en cours** : le process principal suit les jeux lancés. Le bouton affiche « En cours · 23 min » et un jeu déjà ouvert ne peut pas être relancé.
- **Entrée** lance le jeu de la fiche (la version choisie), sauf quand un champ ou un autre bouton a le focus.
- **Miniatures** : les cartes chargent une miniature de 360 px, gardée en cache dans `covers/thumbs`. La pleine taille ne sert qu'à la fiche et à Big Picture (`main/cover/thumbs.ts`).
- **Images des fangames** : le logo ou l'écran titre de `Graphics/Titles` est choisi d'après son contenu, pas sa taille de fichier (`main/cover/titles.ts`). Viennent ensuite l'icône de l'exécutable, lue directement dans le fichier (`main/cover/exeIcon.ts`, jusqu'à 256 px, sans lire les données ajoutées après les ressources), puis `Icon.png`. Les icônes par défaut du moteur et les icônes de moins de 48 px ne servent qu'en dernier recours. Si la lecture échoue, l'icône système n'est utilisée que si elle fait au moins 48 px.
- **Images carrées** (Icon.png, icônes) : centrées sur un fond flou d'elles-mêmes au lieu d'être recadrées.
- **Journal** : chaque jeu a son journal sur sa page. Entrée enregistre une note, Maj+Entrée va à la ligne. Les notes se modifient ou se suppriment au survol. Elles sont communes à toutes les versions d'un fangame, gardées dans `journal.json` et incluses dans la sauvegarde.
- **Communauté** : encart de liens à côté du journal (serveur Discord du créateur, salon du jeu, wiki, autre site). Les liens Discord et wiki écrits dans les fichiers texte du dossier du jeu sont repérés tout seuls, avec le fichier d'origine (`main/journal/detect.ts`). Pour une ROM, seuls les fichiers qui portent son nom sont lus. Un fangame peut aussi fournir un fichier `offli.md` à côté de `Game.exe` (modèle dans `docs/offli.md`) : chaque ligne de sa section « Liens » (`- Nom : adresse`) devient un lien nommé. `| icône` en fin de ligne choisit l'icône (`discord`, `salon`, `wiki`, `site`, `youtube`, `code`, `tableur`, `telechargement`, ou une image du dossier du jeu de 128 Ko au plus) ; sinon le nom et l'adresse décident. Les raccourcis Internet `.url` du dossier sont lus aussi, nommés d'après le fichier. On peut ajouter ses propres liens, les modifier (crayon au survol) ou retirer un lien repéré, et seuls les liens http(s) s'ouvrent, dans le navigateur ou l'appli Discord.
- **Tutoriel** : une étape « Ouvre la page d'un jeu » précède la page du jeu. Elle met en valeur la première carte, laisse cliquer dans la bibliothèque et passe toute seule à l'étape suivante dès qu'un jeu est ouvert. Suivant ouvre le premier jeu, et Retour revient à la grille. Le tutoriel compte maintenant sept étapes.
- **Jeux de base** : leur nom suit la langue, d'après le code de la ROM (Rouge Feu, FireRed, Rojo Fuego).

## Big Picture

- **Navigation** : le jeu courant reste toujours au même endroit, c'est le rail qui glisse. La page ne défile plus jamais (`overflow: clip`).
- **Fond** : un écran titre large remplit le fond ; une jaquette ou une icône donne un fond flou avec l'image entière à droite. Passage en fondu d'un jeu à l'autre.
- **Sections** : onglets en haut (Tous, Favoris, Fangames, GBA…), avec LB / RB à la manette ou Q / E au clavier.
- **Tri** : Y à la manette ou S au clavier.
- **Code** : `views/BigPictureView.tsx`, `views/bigpicture/` (fond, onglets, commandes clavier et manette).

## Langues (i18n)

- Français, anglais et espagnol. Réglage dans Paramètres > Affichage ; « Langue du système » par défaut, l'anglais si elle n'est pas disponible.
- Textes dans `src/shared/i18n/<langue>/` (`app.ts` et `setup.ts`), partagés par le rendu et le process principal (erreurs de lancement, boîtes de dialogue).
- Utilisation : `t('library.launching', { name })`. Une entrée `{ one, other }` gère le singulier et le pluriel.
- Le français est la référence : TypeScript et `tests/i18n.test.ts` vérifient que chaque langue a les mêmes clés et les mêmes paramètres.

## Sauvegarde

- Paramètres > Bibliothèque > Sauvegarde : **Exporter…** et **Importer…** un fichier JSON avec les favoris, le temps de jeu, les noms, les images choisies et les réglages.
- La clé API SteamGridDB n'est jamais exportée ; l'import garde celle déjà présente sur le PC. Un fichier invalide est refusé avec un message.
- Code : `main/backup.ts` (format et validation) et `main/ipc/data.ts` (boîtes de dialogue).

## Mises à jour

- Le système d'origine est conservé. Seule différence : les erreurs sont envoyées sous forme de code (`network`, `no-release`, `unknown`) et traduites par l'interface.
- Rappel : les versions créées par la CI sont des brouillons ; le launcher ne les voit qu'une fois publiées à la main.

## Organisation du code

- **Process principal** : `main/index.ts` ne fait plus que démarrer l'appli. L'état partagé est dans `context.ts`, les échanges avec l'interface dans `ipc/` (bibliothèque, jaquettes, sauvegarde), la fenêtre dans `window.ts`. Le scanner est découpé dans `scan/`, les jaquettes dans `cover/`.
- **Interface** : les données et leurs actions sont dans `hooks/useLibraryData.ts`. La bibliothèque est découpée dans `views/library/`, les paramètres dans `components/settings/`, le tutoriel dans `components/tour/`. Les icônes sont regroupées dans `components/icons.tsx`.
- **Commentaires** : en anglais, sur une ligne, seulement là où ils apportent quelque chose.

## Contrôles

| Commande | Rôle |
| --- | --- |
| `npm run check:lines` | Échoue si un fichier dépasse 210 lignes (règle des 200 lignes, quelques-unes tolérées) |
| `npm run format` / `format:check` | Prettier (sans point-virgule, guillemets simples, 120 colonnes) ; les CSS gardent l'écriture compacte du pack |
| `npm run typecheck` | Types des deux process |
| `npm test` | 211 tests, dont les nouveaux : contrastes des 5 thèmes, i18n, icônes `.exe`, sauvegarde, tri |

Les deux premiers tournent aussi dans la CI et dans le workflow de publication.

**Contrastes** : `tests/contrast.test.ts` lit les couleurs directement dans les fichiers CSS des thèmes et vérifie le niveau WCAG AA (4,5:1 pour le texte, 3:1 pour les icônes). Il a permis de corriger 10 cas trop faibles.

## À vérifier sur une vraie machine

Ces points n'ont pas pu être testés en dehors d'un vrai PC Windows :

- l'icône extraite d'un vrai `.exe` de fangame ;
- Big Picture avec une manette (LB / RB / Y) ;
- un export puis un import de sauvegarde ;
- une mise à jour de bout en bout (installer la 0.3.1, publier une 0.3.2).
