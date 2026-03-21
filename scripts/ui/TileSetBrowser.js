import { TileSet } from "../core/TileSet.js";

/**
 * Manages multiple tilesets (8x8 tiles in 128x128px sheets) and provides UI for browsing and editing externally.
 */
export class TileSetBrowser {
  /**
   * @param {HTMLElement} container Parent element for the browser.
   */
  constructor(container) {
    this.container = container;
    
    /** @type {Map<string, TileSet>} */
    this.tileSets = new Map();
    
    /** @type {string | null} */
    this.selectedTileSetId = null;
    
    /** @type {number | null} */
    this.selectedTileIndex = null;
    
    this.#createUI();
    this.#attachEvents();
  }

  /**
   * Creates the UI structure.
   */
  #createUI() {
    this.container.innerHTML = "";
    this.container.className = "tileset-browser";
    
    // Header with actions
    const header = document.createElement("div");
    header.className = "tileset-header";
    
    const title = document.createElement("div");
    title.className = "tileset-title";
    title.textContent = "Tilesets";
    header.appendChild(title);
    
    const actions = document.createElement("div");
    actions.className = "tileset-actions";
    
    const addBtn = document.createElement("button");
    addBtn.className = "tileset-action-btn";
    addBtn.textContent = "+ Add Tileset";
    addBtn.dataset.action = "add";
    actions.appendChild(addBtn);
    
    header.appendChild(actions);
    this.container.appendChild(header);
    
    // Tileset list
    this.tileSetList = document.createElement("div");
    this.tileSetList.className = "tileset-list";
    this.container.appendChild(this.tileSetList);
    
    // Tile preview panel
    this.previewPanel = document.createElement("div");
    this.previewPanel.className = "tileset-preview-panel";
    this.previewPanel.innerHTML = `
      <div class="tileset-preview-header">
        <span class="tileset-preview-title">Tile Preview</span>
      </div>
      <div class="tileset-preview-content">
        <canvas class="tileset-preview-canvas"></canvas>
        <div class="tileset-preview-info">Select a tileset to preview</div>
      </div>
    `;
    this.container.appendChild(this.previewPanel);
    
    this.previewCanvas = this.previewPanel.querySelector(".tileset-preview-canvas");
    this.previewCtx = this.previewCanvas.getContext("2d", { alpha: false });
    this.previewInfo = this.previewPanel.querySelector(".tileset-preview-info");
    
    this.#renderEmpty();
  }

  /**
   * Attaches event listeners.
   */
  #attachEvents() {
    // Add tileset button
    this.container.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      
      const actionBtn = target.closest("[data-action]");
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        
        if (action === "add") {
          this.#addTileSet();
        } else if (action === "open") {
          const id = actionBtn.dataset.id;
          if (id) this.#openExternal(id);
        } else if (action === "reload") {
          const id = actionBtn.dataset.id;
          if (id) this.#reloadTileSet(id);
        } else if (action === "remove") {
          const id = actionBtn.dataset.id;
          if (id) this.#removeTileSet(id);
        } else if (action === "edit-settings") {
          const id = actionBtn.dataset.id;
          if (id) this.#editTileSetSettings(id);
        }
      }
      
      // Tileset selection
      const tilesetItem = target.closest(".tileset-item");
      if (tilesetItem && tilesetItem.dataset.id) {
        this.#selectTileSet(tilesetItem.dataset.id);
      }
    });
    
    // Canvas tile selection
    this.previewCanvas.addEventListener("click", (e) => {
      if (!this.selectedTileSetId) return;
      
      const tileSet = this.tileSets.get(this.selectedTileSetId);
      if (!tileSet || !tileSet.isLoaded) return;
      
      const rect = this.previewCanvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / (this.previewCanvas.width / tileSet.columns));
      const y = Math.floor((e.clientY - rect.top) / (this.previewCanvas.height / tileSet.rows));
      
      this.selectedTileIndex = y * tileSet.columns + x;
      this.#renderPreview();
    });
  }

  /**
   * Adds a new tileset.
   */
  async #addTileSet() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png";
    
    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const name = file.name.replace(/\.[^/.]+$/, "");
        
        let filePath;
        let nativePath = "";
        
        // If running in Electron, save the file to app data
        if (window.electronAPI?.saveTileset) {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const result = await window.electronAPI.saveTileset(uint8Array, file.name);
          nativePath = result.filePath;
          // Convert to file:// URL for loading in Image element
          filePath = `file:///${result.filePath.replace(/\\/g, "/")}`;
        } else {
          // Fallback for non-Electron environments (dev/testing)
          filePath = URL.createObjectURL(file);
        }
        
        const tileSet = new TileSet({
          name,
          filePath,
          nativePath,
          tileWidth: 8,
          tileHeight: 8
        });
        
        await tileSet.load();
        
        this.tileSets.set(tileSet.id, tileSet);
        this.#render();
        this.#selectTileSet(tileSet.id);
        
      } catch (error) {
        console.error("Failed to add tileset:", error);
        alert(`Failed to load tileset:\n${error.message || error}`);
      }
    });
    
    input.click();
  }

  /**
   * Opens tileset in external editor.
   *
   * @param {string} id Tileset ID.
   */
  #openExternal(id) {
    const tileSet = this.tileSets.get(id);
    if (!tileSet) return;
    
    // In Electron, show the file in explorer so user can open with their preferred editor
    if (window.electronAPI?.showTilesetInFolder && tileSet.nativePath) {
      window.electronAPI.showTilesetInFolder(tileSet.nativePath);
    } else {
      // Fallback: show message
      const pathToShow = tileSet.nativePath || tileSet.filePath;
      alert(`To edit this tileset, open:\n${pathToShow}\n\nIn your image editor of choice.`);
    }
  }

  /**
   * Reloads a tileset from disk.
   *
   * @param {string} id Tileset ID.
   */
  async #reloadTileSet(id) {
    const tileSet = this.tileSets.get(id);
    if (!tileSet) return;
    
    try {
      await tileSet.reload();
      this.#render();
      if (this.selectedTileSetId === id) {
        this.#renderPreview();
      }
    } catch (error) {
      console.error("Failed to reload tileset:", error);
      alert(`Failed to reload tileset:\n${error.message || error}`);
    }
  }

  /**
   * Removes a tileset.
   *
   * @param {string} id Tileset ID.
   */
  #removeTileSet(id) {
    if (!confirm("Remove this tileset?")) return;
    
    this.tileSets.delete(id);
    
    if (this.selectedTileSetId === id) {
      this.selectedTileSetId = null;
      this.selectedTileIndex = null;
    }
    
    this.#render();
    this.#renderPreview();
  }

  /**
   * Edits tileset settings.
   *
   * @param {string} id Tileset ID.
   */
  #editTileSetSettings(id) {
    const tileSet = this.tileSets.get(id);
    if (!tileSet) return;
    
    const name = prompt("Tileset name:", tileSet.name);
    if (!name) return;
    
    tileSet.name = name;
    this.#render();
  }

  /**
   * Selects a tileset.
   *
   * @param {string} id Tileset ID.
   */
  #selectTileSet(id) {
    this.selectedTileSetId = id;
    this.selectedTileIndex = null;
    this.#render();
    this.#renderPreview();
  }

  /**
   * Renders the tileset list.
   */
  #render() {
    if (this.tileSets.size === 0) {
      this.#renderEmpty();
      return;
    }
    
    this.tileSetList.innerHTML = "";
    
    this.tileSets.forEach((tileSet) => {
      const item = document.createElement("div");
      item.className = "tileset-item";
      item.dataset.id = tileSet.id;
      
      if (this.selectedTileSetId === tileSet.id) {
        item.classList.add("selected");
      }
      
      const preview = document.createElement("div");
      preview.className = "tileset-item-preview";
      
      if (tileSet.isLoaded && tileSet.image) {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        
        // Draw scaled down version
        const scale = Math.min(64 / tileSet.image.width, 64 / tileSet.image.height);
        const w = tileSet.image.width * scale;
        const h = tileSet.image.height * scale;
        ctx.drawImage(tileSet.image, 0, 0, w, h);
        
        preview.appendChild(canvas);
      } else {
        preview.textContent = "?";
      }
      
      item.appendChild(preview);
      
      const info = document.createElement("div");
      info.className = "tileset-item-info";
      
      const nameEl = document.createElement("div");
      nameEl.className = "tileset-item-name";
      nameEl.textContent = tileSet.name;
      info.appendChild(nameEl);
      
      const meta = document.createElement("div");
      meta.className = "tileset-item-meta";
      meta.textContent = `128×128px • ${tileSet.getTileCount()} tiles (${tileSet.tileWidth}×${tileSet.tileHeight}px each)`;
      info.appendChild(meta);
      
      item.appendChild(info);
      
      const actions = document.createElement("div");
      actions.className = "tileset-item-actions";
      
      const openBtn = document.createElement("button");
      openBtn.className = "tileset-item-btn";
      openBtn.title = "Open in external editor";
      openBtn.dataset.action = "open";
      openBtn.dataset.id = tileSet.id;
      openBtn.textContent = "✏️";
      actions.appendChild(openBtn);
      
      const reloadBtn = document.createElement("button");
      reloadBtn.className = "tileset-item-btn";
      reloadBtn.title = "Reload from disk";
      reloadBtn.dataset.action = "reload";
      reloadBtn.dataset.id = tileSet.id;
      reloadBtn.textContent = "🔄";
      actions.appendChild(reloadBtn);
      
      const settingsBtn = document.createElement("button");
      settingsBtn.className = "tileset-item-btn";
      settingsBtn.title = "Settings";
      settingsBtn.dataset.action = "edit-settings";
      settingsBtn.dataset.id = tileSet.id;
      settingsBtn.textContent = "⚙️";
      actions.appendChild(settingsBtn);
      
      const removeBtn = document.createElement("button");
      removeBtn.className = "tileset-item-btn tileset-item-btn--danger";
      removeBtn.title = "Remove tileset";
      removeBtn.dataset.action = "remove";
      removeBtn.dataset.id = tileSet.id;
      removeBtn.textContent = "🗑️";
      actions.appendChild(removeBtn);
      
      item.appendChild(actions);
      
      this.tileSetList.appendChild(item);
    });
  }

  /**
   * Renders the preview panel.
   */
  #renderPreview() {
    if (!this.selectedTileSetId) {
      this.previewInfo.textContent = "Select a tileset to preview";
      this.previewInfo.style.display = "block";
      this.previewCanvas.style.display = "none";
      return;
    }
    
    const tileSet = this.tileSets.get(this.selectedTileSetId);
    if (!tileSet || !tileSet.isLoaded || !tileSet.image) {
      this.previewInfo.textContent = "Tileset not loaded";
      this.previewInfo.style.display = "block";
      this.previewCanvas.style.display = "none";
      return;
    }
    
    this.previewInfo.style.display = "none";
    this.previewCanvas.style.display = "block";
    
    // Set canvas size
    const scale = 2;
    this.previewCanvas.width = tileSet.getWidth() * scale;
    this.previewCanvas.height = tileSet.getHeight() * scale;
    
    this.previewCtx.imageSmoothingEnabled = false;
    
    // Draw tileset
    this.previewCtx.drawImage(
      tileSet.image,
      0, 0,
      tileSet.image.width, tileSet.image.height,
      0, 0,
      this.previewCanvas.width, this.previewCanvas.height
    );
    
    // Draw grid
    this.previewCtx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.previewCtx.lineWidth = 1;
    
    for (let x = 0; x <= tileSet.columns; x++) {
      const px = x * tileSet.tileWidth * scale;
      this.previewCtx.beginPath();
      this.previewCtx.moveTo(px, 0);
      this.previewCtx.lineTo(px, this.previewCanvas.height);
      this.previewCtx.stroke();
    }
    
    for (let y = 0; y <= tileSet.rows; y++) {
      const py = y * tileSet.tileHeight * scale;
      this.previewCtx.beginPath();
      this.previewCtx.moveTo(0, py);
      this.previewCtx.lineTo(this.previewCanvas.width, py);
      this.previewCtx.stroke();
    }
    
    // Highlight selected tile
    if (this.selectedTileIndex !== null) {
      const rect = tileSet.getTileRect(this.selectedTileIndex);
      this.previewCtx.strokeStyle = "rgba(255, 127, 17, 1)";
      this.previewCtx.lineWidth = 2;
      this.previewCtx.strokeRect(
        rect.x * scale,
        rect.y * scale,
        rect.width * scale,
        rect.height * scale
      );
    }
  }

  /**
   * Renders empty state.
   */
  #renderEmpty() {
    this.tileSetList.innerHTML = `
      <div class="tileset-empty">
        <div class="tileset-empty-icon">🎨</div>
        <div class="tileset-empty-text">No tilesets added</div>
        <div class="tileset-empty-hint">Click "+ Add Tileset" to import a 128x128px PNG</div>
      </div>
    `;
    this.#renderPreview();
  }

  /**
   * Gets all tilesets.
   *
   * @returns {Array<TileSet>}
   */
  getTileSets() {
    return Array.from(this.tileSets.values());
  }

  /**
   * Adds a tileset programmatically.
   *
   * @param {TileSet} tileSet Tileset to add.
   */
  addTileSet(tileSet) {
    this.tileSets.set(tileSet.id, tileSet);
    this.#render();
  }

  /**
   * Serializes all tilesets to JSON.
   *
   * @returns {Object}
   */
  toJSON() {
    return {
      tileSets: Array.from(this.tileSets.values()).map((ts) => ts.toJSON())
    };
  }

  /**
   * Loads tilesets from JSON.
   *
   * @param {Object} data Serialized data.
   */
  async fromJSON(data) {
    if (!data.tileSets) return;
    
    this.tileSets.clear();
    
    for (const tsData of data.tileSets) {
      try {
        const tileSet = TileSet.fromJSON(tsData);
        await tileSet.load();
        this.tileSets.set(tileSet.id, tileSet);
      } catch (error) {
        console.error("Failed to load tileset:", error);
      }
    }
    
    this.#render();
  }
}
