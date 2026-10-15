/**
 * Ce que l'application peut faire pour se mettre à jour sur cette plateforme :
 * - auto : vérifier, télécharger puis installer au clic (installeur Windows, AppImage) ;
 * - manual : vérifier seulement ; une nouvelle version s'installe depuis la page GitHub
 *   (Windows portable, paquet .deb, macOS non signé : Squirrel.Mac exige une signature) ;
 * - off : en développement, rien n'est vérifié.
 */
export type UpdateSupport =
  | { mode: "auto" }
  | { mode: "manual"; reason: "portable" | "deb" | "mac" }
  | { mode: "off"; reason: "dev" };

export interface UpdateEnv {
  isPackaged: boolean;
  platform: NodeJS.Platform;
  env: Record<string, string | undefined>;
}

export function detectUpdateSupport({ isPackaged, platform, env }: UpdateEnv): UpdateSupport {
  if (!isPackaged) return { mode: "off", reason: "dev" };
  if (platform === "darwin") return { mode: "manual", reason: "mac" };
  // La version portable de Windows se décompresse dans un dossier temporaire : rien à remplacer
  if (platform === "win32") return env["PORTABLE_EXECUTABLE_DIR"] ? { mode: "manual", reason: "portable" } : { mode: "auto" };
  // Sous Linux, seule l'AppImage sait se remplacer elle-même
  return env["APPIMAGE"] ? { mode: "auto" } : { mode: "manual", reason: "deb" };
}

/** Page des versions, ouverte quand l'installation automatique n'est pas possible */
export const RELEASES_URL = "https://github.com/Menthx/Offli-launcher/releases/latest";
