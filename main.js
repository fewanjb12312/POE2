const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow;
let locked = false;

const dataDir = path.join(__dirname, "data");
const dataPath = path.join(dataDir, "checklist.json");
const rumorsPath = path.join(dataDir, "rumors.json");
const runesDir = path.join(__dirname, "assets", "runes");

function defaultChecklist() {
  return {
    opacity: 0.8,
    category: "runes",
    selectedRunes: [],
    items: [],
    memo: ""
  };
}

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(defaultChecklist(), null, 2), "utf8");
  }
}

function readChecklist() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeChecklist(data) {
  ensureDataFile();
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
}

function listRunes() {
  if (!fs.existsSync(runesDir)) return [];

  const priority = [
    "풍요룬",
    "시간룬",
    "부활룬",
    "유대룬",
    "서약룬",
    "죽음룬",
    "생명룬",
    "영혼룬",
    "권능룬"
  ];

  return fs
    .readdirSync(runesDir)
    .filter((file) => file.toLowerCase().endsWith(".webp"))
    .map((file) => ({
      file,
      name: path.basename(file, path.extname(file))
    }))
    .sort((left, right) => {
      const leftPriority = priority.indexOf(left.name);
      const rightPriority = priority.indexOf(right.name);

      if (leftPriority !== -1 || rightPriority !== -1) {
        if (leftPriority === -1) return 1;
        if (rightPriority === -1) return -1;
        return leftPriority - rightPriority;
      }

      return left.name.localeCompare(right.name, "ko");
    });
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
  mainWindow = new BrowserWindow({
    width: 2000,
    height: 72,
    minWidth: 360,
    minHeight: 72,
    frame: false,
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureDataFile();
  createWindow();

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
  ipcMain.handle("external:open", (_event, url) => shell.openExternal(url));
  ipcMain.handle("window:get-bounds", () => mainWindow.getBounds());
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
