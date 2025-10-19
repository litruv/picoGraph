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
};

contextBridge.exposeInMainWorld("electronAPI", api);
