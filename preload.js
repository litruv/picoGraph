const { contextBridge, ipcRenderer } = require("electron");

/**
 * Provides renderer processes with limited access to Electron IPC bridges.
 */
const api = {
  /**
   * Requests that the main process compile the supplied Lua source to disk.
   *
   * @param {string} source Lua program text emitted from the workspace.
   * @returns {Promise<{ filePath: string }>}
   */
  compileLua(source) {
    if (typeof source !== "string") {
      return Promise.reject(new TypeError("Lua source must be a string"));
    }

    return ipcRenderer.invoke("lua:compile", source);
  },

  /**
   * Creates a temporary .p8 cart file for preview
   *
   * @param {string} cartContent Complete .p8 cart file content
   * @returns {Promise<{ filePath: string }>}
   */
  previewCart(cartContent) {
    if (typeof cartContent !== "string") {
      return Promise.reject(new TypeError("Cart content must be a string"));
    }

    return ipcRenderer.invoke("cart:preview", cartContent);
  },

  /**
   * Writes the PICO-8 player HTML to disk and returns the file path
   *
   * @param {string} htmlContent The player HTML content
   * @returns {Promise<{ filePath: string }>}
   */
  writePlayerHtml(htmlContent) {
    if (typeof htmlContent !== "string") {
      return Promise.reject(new TypeError("HTML content must be a string"));
    }

    return ipcRenderer.invoke("player:writeHtml", htmlContent);
  },

  /**
   * Writes the cart .p8 file to the public directory for the player to load
   *
   * @param {string} cartContent The .p8 cart content
   * @returns {Promise<{ filePath: string }>}
   */
  writePlayerCart(cartContent) {
    if (typeof cartContent !== "string") {
      return Promise.reject(new TypeError("Cart content must be a string"));
    }

    return ipcRenderer.invoke("player:writeCart", cartContent);
  },

  /**
   * Minimizes the current window.
   *
   * @returns {Promise<void>}
   */
  minimizeWindow() {
    return ipcRenderer.invoke("window:minimize");
  },

  /**
   * Toggles the current window maximize state.
   *
   * @returns {Promise<boolean>}
   */
  toggleMaximizeWindow() {
    return ipcRenderer.invoke("window:toggle-maximize");
  },

  /**
   * Closes the current window.
   *
   * @returns {Promise<void>}
   */
  closeWindow() {
    return ipcRenderer.invoke("window:close");
  },

  /**
   * Reads the current maximize state for the window.
   *
   * @returns {Promise<boolean>}
   */
  getWindowMaximized() {
    return ipcRenderer.invoke("window:is-maximized");
  },

  /**
   * Subscribes to maximize state changes.
   *
   * @param {(isMaximized: boolean) => void} callback
   * @returns {() => void}
   */
  onWindowMaximizedChanged(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    const listener = (_event, isMaximized) => {
      callback(Boolean(isMaximized));
    };
    ipcRenderer.on("window:maximized-changed", listener);
    return () => {
      ipcRenderer.removeListener("window:maximized-changed", listener);
    };
  },

  /**
   * Saves a tileset image file to the application data directory.
   *
   * @param {Uint8Array} fileBuffer The PNG file data
   * @param {string} suggestedName Suggested filename
   * @returns {Promise<{ filePath: string, fileName: string }>}
   */
  saveTileset(fileBuffer, suggestedName) {
    if (!(fileBuffer instanceof Uint8Array)) {
      return Promise.reject(new TypeError("File buffer must be a Uint8Array"));
    }
    if (typeof suggestedName !== "string") {
      return Promise.reject(new TypeError("Suggested name must be a string"));
    }

    return ipcRenderer.invoke("tileset:save", fileBuffer, suggestedName);
  },

  /**
   * Shows a tileset file in the system file explorer.
   *
   * @param {string} filePath Path to the tileset file
   * @returns {Promise<void>}
   */
  showTilesetInFolder(filePath) {
    if (typeof filePath !== "string") {
      return Promise.reject(new TypeError("File path must be a string"));
    }

    return ipcRenderer.invoke("tileset:show-in-folder", filePath);
  },

  /**
   * Reloads a tileset image from disk.
   *
   * @param {string} filePath Path to the tileset file
   * @returns {Promise<{ buffer: number[] }>}
   */
  reloadTileset(filePath) {
    if (typeof filePath !== "string") {
      return Promise.reject(new TypeError("File path must be a string"));
    }

    return ipcRenderer.invoke("tileset:reload", filePath);
  },

  /**
   * Gets PICO-8 cart statistics using p8tool stats command.
   *
   * @param {string} cartContent Complete .p8 cart file content
   * @returns {Promise<{ tokens: number, lines: number, chars: number, rawOutput: string }>}
   */
  getCartStats(cartContent) {
    if (typeof cartContent !== "string") {
      return Promise.reject(new TypeError("Cart content must be a string"));
    }

    return ipcRenderer.invoke("cart:get-stats", cartContent);
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
