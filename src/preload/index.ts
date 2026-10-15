import { contextBridge, ipcRenderer } from "electron";
import type { GameStats, OffliApi } from "../shared/types";

const api: OffliApi = {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (patch) => ipcRenderer.invoke("settings:save", patch),
  pickFolder: () => ipcRenderer.invoke("dialog:folder"),
  pickFile: (kind) => ipcRenderer.invoke("dialog:file", kind),
  getLibrary: () => ipcRenderer.invoke("library:get"),
  scan: () => ipcRenderer.invoke("library:scan"),
  getStats: () => ipcRenderer.invoke("stats:get"),
  toggleFavorite: (id) => ipcRenderer.invoke("stats:favorite", id),
  resolveCover: (id) => ipcRenderer.invoke("cover:resolve", id),
  setCover: (id, path) => ipcRenderer.invoke("cover:set", id, path),
  renameGame: (id, name) => ipcRenderer.invoke("game:rename", id, name),
  launch: (id) => ipcRenderer.invoke("game:launch", id),
  openFolder: (id) => ipcRenderer.invoke("game:folder", id),
  setFullScreen: (on) => ipcRenderer.invoke("window:fullscreen", on),
  sgdbSearch: (term) => ipcRenderer.invoke("sgdb:search", term),
  sgdbGrids: (gameId, page) => ipcRenderer.invoke("sgdb:grids", gameId, page),
  sgdbPick: (id, imageId) => ipcRenderer.invoke("sgdb:pick", id, imageId),
  onToggleView: (cb) => {
    const listener = (): void => cb();
    ipcRenderer.on("view:toggle", listener);
    return () => ipcRenderer.removeListener("view:toggle", listener);
  },
  updateState: () => ipcRenderer.invoke("update:state"),
  updateCheck: () => ipcRenderer.invoke("update:check"),
  updateDownload: () => ipcRenderer.invoke("update:download"),
  updateInstall: () => ipcRenderer.invoke("update:install"),
  updateOpenPage: () => ipcRenderer.invoke("update:open-page"),
  onUpdateStatus: (cb) => {
    const listener = (_e: unknown, status: Parameters<typeof cb>[0]): void => cb(status);
    ipcRenderer.on("update:status", listener);
    return () => ipcRenderer.removeListener("update:status", listener);
  },
  onStatsChanged: (cb) => {
    const listener = (_e: unknown, stats: Record<string, GameStats>): void =>
      cb(stats);
    ipcRenderer.on("stats:changed", listener);
    return () => ipcRenderer.removeListener("stats:changed", listener);
  },
};

contextBridge.exposeInMainWorld("offli", api);
