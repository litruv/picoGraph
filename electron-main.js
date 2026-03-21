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

const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

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

/**
 * Resolves the absolute directory where tileset images are stored.
 *
 * @returns {string}
 */
function getTilesetsDirectory() {
  const applicationData = app.getPath("appData");
  return path.join(applicationData, "pico-8", "carts", "picograph", "tilesets");
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
    frame: false,
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

  const emitMaximizedState = () => {
    window.webContents.send("window:maximized-changed", window.isMaximized());
  };

  window.on("maximize", emitMaximizedState);
  window.on("unmaximize", emitMaximizedState);

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

  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
  });

  ipcMain.handle("window:toggle-maximize", () => {
    if (!mainWindow) {
      return false;
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }

    return mainWindow.isMaximized();
  });

  ipcMain.handle("window:close", () => {
    mainWindow?.close();
  });

  ipcMain.handle("window:is-maximized", () => {
    return mainWindow?.isMaximized() ?? false;
  });

  ipcMain.handle("tileset:save", async (_event, fileBuffer, suggestedName) => {
    if (!(fileBuffer instanceof Uint8Array)) {
      throw new TypeError("File buffer must be a Uint8Array");
    }
    if (typeof suggestedName !== "string") {
      throw new TypeError("Suggested name must be a string");
    }

    const tilesetsDir = getTilesetsDirectory();
    await fs.mkdir(tilesetsDir, { recursive: true });

    // Ensure unique filename
    let fileName = suggestedName.endsWith(".png") ? suggestedName : `${suggestedName}.png`;
    let filePath = path.join(tilesetsDir, fileName);
    let counter = 1;

    while (await fs.access(filePath).then(() => true).catch(() => false)) {
      const nameWithoutExt = suggestedName.replace(/\.png$/i, "");
      fileName = `${nameWithoutExt}_${counter}.png`;
      filePath = path.join(tilesetsDir, fileName);
      counter++;
    }

    await fs.writeFile(filePath, Buffer.from(fileBuffer));

    return { filePath, fileName };
  });

  ipcMain.handle("tileset:show-in-folder", async (_event, filePath) => {
    if (typeof filePath !== "string") {
      throw new TypeError("File path must be a string");
    }

    shell.showItemInFolder(filePath);
  });

  ipcMain.handle("tileset:reload", async (_event, filePath) => {
    if (typeof filePath !== "string") {
      throw new TypeError("File path must be a string");
    }

    const buffer = await fs.readFile(filePath);
    return { buffer: Array.from(buffer) };
  });

  ipcMain.handle("cart:get-stats", async (_event, cartContent) => {
    if (typeof cartContent !== "string") {
      throw new TypeError("Cart content must be a string");
    }

    // Write cart to a temporary file
    const tempDir = app.getPath("temp");
    const tempCartPath = path.join(tempDir, `stats_${Date.now()}.p8`);
    
    try {
      await fs.writeFile(tempCartPath, cartContent, "utf8");

      // Run p8tool stats command
      const picotoolPath = path.join(__dirname, "picotool");
      
      return new Promise((resolve, reject) => {
        const p8tool = spawn("p8tool", ["stats", tempCartPath], {
          cwd: __dirname,
          shell: true
        });

        let stdout = "";
        let stderr = "";

        p8tool.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        p8tool.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        p8tool.on("close", async (code) => {
          // Clean up temp file
          try {
            await fs.unlink(tempCartPath);
          } catch (cleanupError) {
            console.warn("Failed to delete temp cart:", cleanupError);
          }

          if (code !== 0) {
            reject(new Error(`p8tool stats exited with code ${code}: ${stderr}`));
            return;
          }

          // Parse the output to extract token count
          // Expected format: "version: 0  lines: 48  chars: 419  tokens: 134"
          const tokenMatch = stdout.match(/tokens:\s*(\d+)/);
          const linesMatch = stdout.match(/lines:\s*(\d+)/);
          const charsMatch = stdout.match(/chars:\s*(\d+)/);

          resolve({
            tokens: tokenMatch ? parseInt(tokenMatch[1], 10) : 0,
            lines: linesMatch ? parseInt(linesMatch[1], 10) : 0,
            chars: charsMatch ? parseInt(charsMatch[1], 10) : 0,
            rawOutput: stdout
          });
        });

        p8tool.on("error", (error) => {
          reject(new Error(`Failed to run p8tool: ${error.message}`));
        });
      });
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempCartPath);
      } catch (_) {
        // Ignore cleanup errors
      }
      throw error;
    }
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
