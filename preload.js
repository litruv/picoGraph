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
};

contextBridge.exposeInMainWorld("electronAPI", api);
