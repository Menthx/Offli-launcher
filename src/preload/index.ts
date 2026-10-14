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
  onStatsChanged: (cb) => {
    const listener = (_e: unknown, stats: Record<string, GameStats>): void =>
      cb(stats);
    ipcRenderer.on("stats:changed", listener);
    return () => ipcRenderer.removeListener("stats:changed", listener);
  },
};

contextBridge.exposeInMainWorld("offli", api);
