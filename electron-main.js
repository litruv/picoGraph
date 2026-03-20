// Enable hot-reload during development
try {
  require('electron-reloader')(module, {
    debug: false,
    watchRenderer: true,
    ignore: [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /pico8-temp-player\.html$/
    ]
  });
} catch (_) { 
  // Ignore errors in production (when electron-reloader isn't installed)
}

const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const OUTPUT_FILENAME = "compiled.lua";

/**
 * Resolves the absolute directory where compiled Lua output is stored.
 *
 * @returns {string}
 */
function getOutputDirectory() {
  const applicationData = app.getPath("appData");
  return path.join(applicationData, "pico-8", "carts", "picograph");
}

/**
 * Resolves the absolute path to the generated Lua file.
 *
 * @returns {string}
 */
function getOutputPath() {
  return path.join(getOutputDirectory(), OUTPUT_FILENAME);
}

/** @type {import("electron").BrowserWindow | null} */
let mainWindow = null;

/**
 * Creates the primary application window and loads the web UI.
 *
 * @returns {void}
 */
function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
        preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  window.loadFile(path.join(__dirname, "index.html"));

  // Open DevTools in development
  window.webContents.openDevTools();

  // Register F12 to toggle DevTools
  window.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      window.webContents.toggleDevTools();
    }
  });

  window.on("closed", () => {
    mainWindow = null;
  });

  mainWindow = window;
}

/**
 * Registers IPC handlers used by renderer processes.
 *
 * @returns {void}
 */
function registerIpcHandlers() {
  ipcMain.handle("lua:compile", async (_event, source) => {
    if (typeof source !== "string") {
      throw new TypeError("Lua source must be a string");
    }

    const outputPath = getOutputPath();
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, source, "utf8");

    return { filePath: outputPath };
  });

  ipcMain.handle("cart:preview", async (_event, cartContent) => {
    if (typeof cartContent !== "string") {
      throw new TypeError("Cart content must be a string");
    }

    const tempCartPath = path.join(app.getPath("temp"), `preview_${Date.now()}.p8`);
    await fs.writeFile(tempCartPath, cartContent, "utf8");

    return { filePath: tempCartPath };
  });

  ipcMain.handle("player:writeHtml", async (_event, htmlContent) => {
    if (typeof htmlContent !== "string") {
      throw new TypeError("HTML content must be a string");
    }

    const playerPath = path.join(__dirname, "public", "pico8-temp-player.html");
    await fs.writeFile(playerPath, htmlContent, "utf8");

    return { filePath: playerPath };
  });

  ipcMain.handle("player:writeCart", async (_event, cartContent) => {
    if (typeof cartContent !== "string") {
      throw new TypeError("Cart content must be a string");
    }

    const cartPath = path.join(__dirname, "public", "pico8-cart.p8");
    await fs.writeFile(cartPath, cartContent, "utf8");

    return { filePath: cartPath };
  });
}

/**
 * Wires core Electron lifecycle events for the application.
 *
 * @returns {void}
 */
function registerAppLifecycle() {
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createMainWindow();
    registerIpcHandlers();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

registerAppLifecycle();
