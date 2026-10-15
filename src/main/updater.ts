import { app, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import type { UpdateStatus } from "../shared/types";
import { RELEASES_URL, detectUpdateSupport } from "./updateSupport";

/**
 * Mises à jour depuis l'application (electron-updater, releases GitHub publiées de
 * Menthx/Offli-launcher ; les brouillons et préversions sont ignorés).
 * Rien n'est téléchargé ni installé sans un clic : seule la vérification est automatique,
 * une fois au démarrage de l'appli empaquetée.
 */
export function setupUpdater(send: (status: UpdateStatus) => void): void {
  const support = detectUpdateSupport({ isPackaged: app.isPackaged, platform: process.platform, env: process.env });
  let status: UpdateStatus = support.mode === "off" ? { state: "unsupported", reason: support.reason } : { state: "idle" };
  const set = (next: UpdateStatus): void => {
    status = next;
    send(status);
  };

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  // Pas de journal dans la console du joueur
  autoUpdater.logger = null;

  autoUpdater.on("checking-for-update", () => set({ state: "checking" }));
  autoUpdater.on("update-available", (info) =>
    set(
      support.mode === "manual"
        ? { state: "unsupported", reason: support.reason, version: info.version }
        : { state: "available", version: info.version },
    ),
  );
  autoUpdater.on("update-not-available", () => set({ state: "not-available" }));
  autoUpdater.on("download-progress", (p) => set({ state: "downloading", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", (info) => set({ state: "downloaded", version: info.version }));
  autoUpdater.on("error", (err) => set({ state: "error", message: shortError(err) }));

  const check = async (): Promise<void> => {
    if (support.mode === "off") return;
    try {
      const result = await autoUpdater.checkForUpdates();
      // Plateforme où electron-updater ne s'active pas (ex. paquet .deb) : on renvoie vers GitHub
      if (!result && support.mode === "manual") set({ state: "unsupported", reason: support.reason });
    } catch (err) {
      set({ state: "error", message: shortError(err) });
    }
  };

  ipcMain.handle("update:state", () => ({ status, version: app.getVersion() }));
  ipcMain.handle("update:check", () => check());
  ipcMain.handle("update:download", async () => {
    if (support.mode !== "auto" || status.state !== "available") return;
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      set({ state: "error", message: shortError(err) });
    }
  });
  ipcMain.handle("update:install", () => {
    if (status.state === "downloaded") autoUpdater.quitAndInstall();
  });
  ipcMain.handle("update:open-page", () => shell.openExternal(RELEASES_URL));

  // Vérification silencieuse au démarrage, seulement pour l'appli empaquetée
  if (support.mode !== "off") void check();
}

function shortError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|net::|network/i.test(msg)) return "Pas de connexion à GitHub";
  if (/404|latest.*\.yml/i.test(msg)) return "Aucune version publiée trouvée";
  return "Vérification impossible";
}
