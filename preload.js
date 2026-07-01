const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayApi", {
  loadChecklist: () => ipcRenderer.invoke("checklist:load"),
  saveChecklist: (data) => ipcRenderer.invoke("checklist:save", data),
  listRunes: () => ipcRenderer.invoke("runes:list"),
  listRumors: () => ipcRenderer.invoke("rumors:list"),
  openExternal: (url) => ipcRenderer.invoke("external:open", url),
  getWindowBounds: () => ipcRenderer.invoke("window:get-bounds"),
  setMenuOpen: (payload) => ipcRenderer.send("window:set-menu-open", payload),
  setCategoryBounds: (payload) => ipcRenderer.send("window:set-category-bounds", payload),
  resizeWindowTo: (point) => ipcRenderer.send("window:resize-to", point),
  getLock: () => ipcRenderer.invoke("overlay:get-lock"),
  setLock: (locked) => ipcRenderer.invoke("overlay:set-lock", locked),
  onLockChanged: (callback) => {
    ipcRenderer.on("overlay-lock-changed", (_event, locked) => callback(locked));
  }
});
