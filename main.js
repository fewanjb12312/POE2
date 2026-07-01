const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("fs");
const path = require("path");

let mainWindow;
let locked = false;
let overlayShown = false;

const bundledDataDir = path.join(__dirname, "data");
const bundledChecklistPath = path.join(bundledDataDir, "checklist.json");
const rumorsPath = path.join(bundledDataDir, "rumors.json");
const runesDir = path.join(__dirname, "assets", "runes");

function settingsPath() {
  return path.join(app.getPath("userData"), "checklist.json");
}

function defaultChecklist() {
  return {
    opacity: 0.8,
    category: "runes",
    selectedRunes: [],
    runeWidth: null,
    windowBounds: null,
    items: [],
    memo: ""
  };
}

function ensureDataFile() {
  const userDataDir = app.getPath("userData");
  const targetPath = settingsPath();

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  if (!fs.existsSync(targetPath)) {
    if (fs.existsSync(bundledChecklistPath)) {
      fs.copyFileSync(bundledChecklistPath, targetPath);
      return;
    }

    fs.writeFileSync(targetPath, JSON.stringify(defaultChecklist(), null, 2), "utf8");
  }
}

function readChecklist() {
  ensureDataFile();

  try {
    return { ...defaultChecklist(), ...JSON.parse(fs.readFileSync(settingsPath(), "utf8")) };
  } catch {
    return defaultChecklist();
  }
}

function writeChecklist(data) {
  ensureDataFile();
  let current = {};

  try {
    current = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
  } catch {
    current = {};
  }

  fs.writeFileSync(settingsPath(), JSON.stringify({ ...defaultChecklist(), ...current, ...data }, null, 2), "utf8");
}

function saveWindowBounds() {
  if (!mainWindow) return;

  const data = readChecklist();
  data.windowBounds = mainWindow.getBounds();
  writeChecklist(data);
}

function listRunes() {
  if (!fs.existsSync(runesDir)) return [];

  const priority = [
    "\uD48D\uC694\uB8EC",
    "\uC2DC\uAC04\uB8EC",
    "\uBD80\uD65C\uB8EC",
    "\uC720\uB300\uB8EC",
    "\uC11C\uC57D\uB8EC",
    "\uC8FD\uC74C\uB8EC",
    "\uC0DD\uBA85\uB8EC",
    "\uC601\uD63C\uB8EC",
    "\uAD8C\uB2A5\uB8EC"
  ];

  return fs
    .readdirSync(runesDir)
    .filter((file) => file.toLowerCase().endsWith(".webp"))
    .map((file) => ({
      file,
      name: path.basename(file, path.extname(file))
    }))
    .filter((rune) => priority.includes(rune.name))
    .sort((left, right) => priority.indexOf(left.name) - priority.indexOf(right.name));
}

function listRumors() {
  if (!fs.existsSync(rumorsPath)) return { headers: [], items: [] };

  const data = JSON.parse(fs.readFileSync(rumorsPath, "utf8"));
  return {
    headers: Array.isArray(data.headers) ? data.headers : [],
    items: Array.isArray(data.items) ? data.items : []
  };
}

function setLocked(nextLocked) {
  locked = nextLocked;

  if (!mainWindow) return;

  mainWindow.setIgnoreMouseEvents(locked, { forward: true });
  mainWindow.webContents.send("overlay-lock-changed", locked);
}

function createWindow() {
  const savedBounds = readChecklist().windowBounds;

  mainWindow = new BrowserWindow({
    width: savedBounds?.width || 2000,
    height: savedBounds?.height || 72,
    x: Number.isFinite(savedBounds?.x) ? savedBounds.x : undefined,
    y: Number.isFinite(savedBounds?.y) ? savedBounds.y : undefined,
    minWidth: 360,
    minHeight: 72,
    frame: false,
    show: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.loadFile("index.html");

  mainWindow.on("move", saveWindowBounds);
  mainWindow.on("resize", saveWindowBounds);
  mainWindow.on("close", saveWindowBounds);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function showOverlay() {
  if (!mainWindow || overlayShown) return;

  overlayShown = true;
  mainWindow.show();
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    showOverlay();
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-not-available", showOverlay);
  autoUpdater.on("error", (error) => {
    console.error("Update check failed:", error);
    showOverlay();
  });
  autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall(true, true);
  });
  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error("Update check failed:", error);
    showOverlay();
  });
}

function ensureDesktopShortcut() {
  if (process.platform !== "win32" || !app.isPackaged) return;

  const shortcutPath = path.join(app.getPath("desktop"), "POE2 Checklist Overlay.lnk");

  shell.writeShortcutLink(shortcutPath, "create", {
    target: process.execPath,
    cwd: path.dirname(process.execPath),
    description: "POE2 Checklist Overlay",
    icon: process.execPath,
    iconIndex: 0,
    appUserModelId: "com.local.poe2-checklist-overlay"
  });
}

app.whenReady().then(() => {
  ensureDataFile();
  createWindow();
  ensureDesktopShortcut();
  setupAutoUpdater();

  globalShortcut.register("CommandOrControl+Shift+O", () => {
    if (!mainWindow) return;
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });

  globalShortcut.register("CommandOrControl+Shift+L", () => {
    setLocked(!locked);
  });

  ipcMain.handle("checklist:load", () => readChecklist());
  ipcMain.handle("checklist:save", (_event, data) => {
    writeChecklist(data);
    return true;
  });
  ipcMain.handle("runes:list", () => listRunes());
  ipcMain.handle("rumors:list", () => listRumors());
  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("external:open", (_event, url) => shell.openExternal(url));
  ipcMain.handle("window:get-bounds", () => mainWindow.getBounds());
  ipcMain.on("app:quit", () => app.quit());
  ipcMain.on("window:set-menu-open", (_event, payload) => {
    if (!mainWindow) return;

    const bounds = mainWindow.getBounds();
    const compactHeight = Math.max(72, Math.round(payload.compactHeight || bounds.height));

    if (payload.open) {
      mainWindow.setBounds({ ...bounds, height: Math.max(bounds.height, 230) });
      return;
    }

    mainWindow.setBounds({ ...bounds, height: compactHeight });
  });
  ipcMain.on("window:set-category-bounds", (_event, payload) => {
    if (!mainWindow) return;

    const bounds = mainWindow.getBounds();
    const width = Math.max(360, Math.round(payload.width || bounds.width));
    const height = Math.max(72, Math.round(payload.height || bounds.height));

    mainWindow.setBounds({ ...bounds, width, height });
  });
  ipcMain.on("window:resize-to", (_event, point) => {
    if (!mainWindow) return;

    const bounds = mainWindow.getBounds();
    const width = Math.max(360, Math.round(point.screenX - bounds.x));

    mainWindow.setBounds({ ...bounds, width });
  });
  ipcMain.handle("overlay:get-lock", () => locked);
  ipcMain.handle("overlay:set-lock", (_event, nextLocked) => {
    setLocked(Boolean(nextLocked));
    return locked;
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
