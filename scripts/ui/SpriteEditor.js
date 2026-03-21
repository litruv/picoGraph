import { SpriteSheet } from "../core/SpriteSheet.js";

/**
 * Interactive sprite sheet editor for PICO-8.
 */
export class SpriteEditor {
  /**
   * @param {HTMLElement} container Parent element for the editor.
   * @param {SpriteSheet} [spriteSheet] Existing sprite sheet or creates new one.
   */
  constructor(container, spriteSheet = null) {
    this.container = container;
    this.spriteSheet = spriteSheet || new SpriteSheet();
    
    /** @type {number} Currently selected color (0-15) */
    this.selectedColor = 7;
    
    /** @type {number} Currently selected sprite (0-255) */
    this.selectedSprite = 0;
    
    /** @type {string} Current tool: "pen", "fill", "line", "rect", "circle", "erase" */
    this.currentTool = "pen";
    
    /** @type {number} Zoom level for sprite sheet canvas */
    this.sheetZoom = 2;
    
    /** @type {number} Zoom level for sprite preview */
    this.previewZoom = 8;
    
    /** @type {Object|null} Drawing state for line/rect tools */
    this.drawStart = null;
    
    this.#createUI();
    this.#attachEvents();
    this.#render();
  }

  /**
   * Creates the UI structure.
   */
  #createUI() {
    this.container.innerHTML = "";
    this.container.className = "sprite-editor";
    
    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "sprite-toolbar";
    
    const tools = [
      { id: "pen", label: "Pen", icon: "✏️" },
      { id: "fill", label: "Fill", icon: "🪣" },
      { id: "line", label: "Line", icon: "📏" },
      { id: "rect", label: "Rect", icon: "⬜" },
      { id: "circle", label: "Circle", icon: "⭕" },
      { id: "erase", label: "Erase", icon: "🧹" }
    ];
    
    tools.forEach((tool) => {
      const btn = document.createElement("button");
      btn.className = "sprite-tool-btn";
      btn.dataset.tool = tool.id;
      btn.title = tool.label;
      btn.textContent = tool.icon;
      if (tool.id === this.currentTool) {
        btn.classList.add("active");
      }
      toolbar.appendChild(btn);
    });
    
    this.container.appendChild(toolbar);
    
    // Main content area
    const content = document.createElement("div");
    content.className = "sprite-content";
    
    // Left panel: Sprite sheet
    const leftPanel = document.createElement("div");
    leftPanel.className = "sprite-panel sprite-sheet-panel";
    
    const sheetLabel = document.createElement("div");
    sheetLabel.className = "sprite-panel-label";
    sheetLabel.textContent = "Sprite Sheet (128x128)";
    leftPanel.appendChild(sheetLabel);
    
    this.sheetCanvas = document.createElement("canvas");
    this.sheetCanvas.className = "sprite-sheet-canvas";
    this.sheetCanvas.width = 128 * this.sheetZoom;
    this.sheetCanvas.height = 128 * this.sheetZoom;
    this.sheetCtx = this.sheetCanvas.getContext("2d", { alpha: false });
    this.sheetCtx.imageSmoothingEnabled = false;
    leftPanel.appendChild(this.sheetCanvas);
    
    content.appendChild(leftPanel);
    
    // Right panel: Preview and palette
    const rightPanel = document.createElement("div");
    rightPanel.className = "sprite-panel sprite-controls-panel";
    
    // Sprite preview
    const previewContainer = document.createElement("div");
    previewContainer.className = "sprite-preview-container";
    
    const previewLabel = document.createElement("div");
    previewLabel.className = "sprite-panel-label";
    previewLabel.textContent = "Sprite Preview";
    previewContainer.appendChild(previewLabel);
    
    this.previewCanvas = document.createElement("canvas");
    this.previewCanvas.className = "sprite-preview-canvas";
    this.previewCanvas.width = 8 * this.previewZoom;
    this.previewCanvas.height = 8 * this.previewZoom;
    this.previewCtx = this.previewCanvas.getContext("2d", { alpha: false });
    this.previewCtx.imageSmoothingEnabled = false;
    previewContainer.appendChild(this.previewCanvas);
    
    this.spriteIndexLabel = document.createElement("div");
    this.spriteIndexLabel.className = "sprite-index-label";
    this.spriteIndexLabel.textContent = `Sprite: ${this.selectedSprite}`;
    previewContainer.appendChild(this.spriteIndexLabel);
    
    rightPanel.appendChild(previewContainer);
    
    // Color palette
    const paletteContainer = document.createElement("div");
    paletteContainer.className = "sprite-palette-container";
    
    const paletteLabel = document.createElement("div");
    paletteLabel.className = "sprite-panel-label";
    paletteLabel.textContent = "Palette";
    paletteContainer.appendChild(paletteLabel);
    
    this.paletteElement = document.createElement("div");
    this.paletteElement.className = "sprite-palette";
    
    this.spriteSheet.palette.forEach((color, index) => {
      const swatch = document.createElement("div");
      swatch.className = "sprite-palette-swatch";
      swatch.style.backgroundColor = color;
      swatch.dataset.color = index;
      swatch.title = `Color ${index}`;
      if (index === this.selectedColor) {
        swatch.classList.add("selected");
      }
      this.paletteElement.appendChild(swatch);
    });
    
    paletteContainer.appendChild(this.paletteElement);
    rightPanel.appendChild(paletteContainer);
    
    // Actions
    const actionsContainer = document.createElement("div");
    actionsContainer.className = "sprite-actions";
    
    const clearBtn = document.createElement("button");
    clearBtn.className = "sprite-action-btn";
    clearBtn.textContent = "Clear Sprite";
    clearBtn.dataset.action = "clear-sprite";
    actionsContainer.appendChild(clearBtn);
    
    const clearAllBtn = document.createElement("button");
    clearAllBtn.className = "sprite-action-btn";
    clearAllBtn.textContent = "Clear All";
    clearAllBtn.dataset.action = "clear-all";
    actionsContainer.appendChild(clearAllBtn);
    
    rightPanel.appendChild(actionsContainer);
    
    content.appendChild(rightPanel);
    this.container.appendChild(content);
  }

  /**
   * Attaches event listeners.
   */
  #attachEvents() {
    // Tool selection
    this.container.querySelectorAll(".sprite-tool-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.currentTool = btn.dataset.tool;
        this.container.querySelectorAll(".sprite-tool-btn").forEach((b) => {
          b.classList.remove("active");
        });
        btn.classList.add("active");
      });
    });
    
    // Color palette
    this.paletteElement.querySelectorAll(".sprite-palette-swatch").forEach((swatch) => {
      swatch.addEventListener("click", (e) => {
        this.selectedColor = parseInt(swatch.dataset.color);
        this.paletteElement.querySelectorAll(".sprite-palette-swatch").forEach((s) => {
          s.classList.remove("selected");
        });
        swatch.classList.add("selected");
      });
    });
    
    // Actions
    this.container.querySelectorAll(".sprite-action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = btn.dataset.action;
        if (action === "clear-sprite") {
          this.#clearCurrentSprite();
        } else if (action === "clear-all") {
          if (confirm("Clear all sprites? This cannot be undone.")) {
            this.spriteSheet.clear();
            this.#render();
          }
        }
      });
    });
    
    // Sheet canvas interactions
    let isDrawing = false;
    
    this.sheetCanvas.addEventListener("mousedown", (e) => {
      isDrawing = true;
      const coords = this.#getSheetCoords(e);
      this.#handleToolStart(coords);
    });
    
    this.sheetCanvas.addEventListener("mousemove", (e) => {
      if (!isDrawing) return;
      const coords = this.#getSheetCoords(e);
      this.#handleToolMove(coords);
    });
    
    this.sheetCanvas.addEventListener("mouseup", (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      const coords = this.#getSheetCoords(e);
      this.#handleToolEnd(coords);
    });
    
    this.sheetCanvas.addEventListener("mouseleave", () => {
      isDrawing = false;
      this.drawStart = null;
    });
    
    // Sprite selection
    this.sheetCanvas.addEventListener("click", (e) => {
      const coords = this.#getSheetCoords(e);
      const spriteX = Math.floor(coords.x / 8);
      const spriteY = Math.floor(coords.y / 8);
      this.selectedSprite = spriteY * 16 + spriteX;
      this.spriteIndexLabel.textContent = `Sprite: ${this.selectedSprite}`;
      this.#renderPreview();
    });
    
    // Preview canvas editing
    let isDrawingPreview = false;
    
    this.previewCanvas.addEventListener("mousedown", (e) => {
      isDrawingPreview = true;
      const coords = this.#getPreviewCoords(e);
      this.#drawPixelInPreview(coords);
    });
    
    this.previewCanvas.addEventListener("mousemove", (e) => {
      if (!isDrawingPreview) return;
      const coords = this.#getPreviewCoords(e);
      this.#drawPixelInPreview(coords);
    });
    
    this.previewCanvas.addEventListener("mouseup", () => {
      isDrawingPreview = false;
    });
    
    this.previewCanvas.addEventListener("mouseleave", () => {
      isDrawingPreview = false;
    });
  }

  /**
   * Gets sheet coordinates from mouse event.
   *
   * @param {MouseEvent} e Mouse event.
   * @returns {{x: number, y: number}}
   */
  #getSheetCoords(e) {
    const rect = this.sheetCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.sheetZoom);
    const y = Math.floor((e.clientY - rect.top) / this.sheetZoom);
    return { x, y };
  }

  /**
   * Gets preview coordinates from mouse event.
   *
   * @param {MouseEvent} e Mouse event.
   * @returns {{x: number, y: number}}
   */
  #getPreviewCoords(e) {
    const rect = this.previewCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.previewZoom);
    const y = Math.floor((e.clientY - rect.top) / this.previewZoom);
    return { x, y };
  }

  /**
   * Handles tool start.
   *
   * @param {{x: number, y: number}} coords Coordinates.
   */
  #handleToolStart(coords) {
    if (this.currentTool === "pen") {
      this.#drawPixel(coords);
    } else if (this.currentTool === "erase") {
      this.#erasePixel(coords);
    } else if (this.currentTool === "fill") {
      this.#floodFill(coords);
    } else if (["line", "rect", "circle"].includes(this.currentTool)) {
      this.drawStart = coords;
    }
  }

  /**
   * Handles tool move.
   *
   * @param {{x: number, y: number}} coords Coordinates.
   */
  #handleToolMove(coords) {
    if (this.currentTool === "pen") {
      this.#drawPixel(coords);
    } else if (this.currentTool === "erase") {
      this.#erasePixel(coords);
    }
  }

  /**
   * Handles tool end.
   *
   * @param {{x: number, y: number}} coords Coordinates.
   */
  #handleToolEnd(coords) {
    if (!this.drawStart) return;
    
    if (this.currentTool === "line") {
      this.#drawLine(this.drawStart, coords);
    } else if (this.currentTool === "rect") {
      this.#drawRect(this.drawStart, coords);
    } else if (this.currentTool === "circle") {
      this.#drawCircle(this.drawStart, coords);
    }
    
    this.drawStart = null;
  }

  /**
   * Draws a pixel.
   *
   * @param {{x: number, y: number}} coords Coordinates.
   */
  #drawPixel(coords) {
    this.spriteSheet.setPixel(coords.x, coords.y, this.selectedColor);
    this.#render();
  }

  /**
   * Erases a pixel.
   *
   * @param {{x: number, y: number}} coords Coordinates.
   */
  #erasePixel(coords) {
    this.spriteSheet.setPixel(coords.x, coords.y, 0);
    this.#render();
  }

  /**
   * Flood fill from a point.
   *
   * @param {{x: number, y: number}} coords Starting coordinates.
   */
  #floodFill(coords) {
    const targetColor = this.spriteSheet.getPixel(coords.x, coords.y);
    if (targetColor === this.selectedColor) return;
    
    const stack = [coords];
    const visited = new Set();
    
    while (stack.length > 0) {
      const { x, y } = stack.pop();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= 128 || y < 0 || y >= 128) continue;
      if (this.spriteSheet.getPixel(x, y) !== targetColor) continue;
      
      visited.add(key);
      this.spriteSheet.setPixel(x, y, this.selectedColor);
      
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }
    
    this.#render();
  }

  /**
   * Draws a line.
   *
   * @param {{x: number, y: number}} start Start coordinates.
   * @param {{x: number, y: number}} end End coordinates.
   */
  #drawLine(start, end) {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const sx = start.x < end.x ? 1 : -1;
    const sy = start.y < end.y ? 1 : -1;
    let err = dx - dy;
    
    let x = start.x;
    let y = start.y;
    
    while (true) {
      this.spriteSheet.setPixel(x, y, this.selectedColor);
      
      if (x === end.x && y === end.y) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    this.#render();
  }

  /**
   * Draws a rectangle.
   *
   * @param {{x: number, y: number}} start Start coordinates.
   * @param {{x: number, y: number}} end End coordinates.
   */
  #drawRect(start, end) {
    const x1 = Math.min(start.x, end.x);
    const y1 = Math.min(start.y, end.y);
    const x2 = Math.max(start.x, end.x);
    const y2 = Math.max(start.y, end.y);
    
    for (let x = x1; x <= x2; x++) {
      this.spriteSheet.setPixel(x, y1, this.selectedColor);
      this.spriteSheet.setPixel(x, y2, this.selectedColor);
    }
    
    for (let y = y1; y <= y2; y++) {
      this.spriteSheet.setPixel(x1, y, this.selectedColor);
      this.spriteSheet.setPixel(x2, y, this.selectedColor);
    }
    
    this.#render();
  }

  /**
   * Draws a circle.
   *
   * @param {{x: number, y: number}} center Center coordinates.
   * @param {{x: number, y: number}} edge Edge point.
   */
  #drawCircle(center, edge) {
    const radius = Math.round(
      Math.sqrt((edge.x - center.x) ** 2 + (edge.y - center.y) ** 2)
    );
    
    let x = radius;
    let y = 0;
    let err = 0;
    
    while (x >= y) {
      this.spriteSheet.setPixel(center.x + x, center.y + y, this.selectedColor);
      this.spriteSheet.setPixel(center.x + y, center.y + x, this.selectedColor);
      this.spriteSheet.setPixel(center.x - y, center.y + x, this.selectedColor);
      this.spriteSheet.setPixel(center.x - x, center.y + y, this.selectedColor);
      this.spriteSheet.setPixel(center.x - x, center.y - y, this.selectedColor);
      this.spriteSheet.setPixel(center.x - y, center.y - x, this.selectedColor);
      this.spriteSheet.setPixel(center.x + y, center.y - x, this.selectedColor);
      this.spriteSheet.setPixel(center.x + x, center.y - y, this.selectedColor);
      
      y += 1;
      err += 1 + 2 * y;
      if (2 * (err - x) + 1 > 0) {
        x -= 1;
        err += 1 - 2 * x;
      }
    }
    
    this.#render();
  }

  /**
   * Draws a pixel in the preview canvas.
   *
   * @param {{x: number, y: number}} coords Coordinates (0-7).
   */
  #drawPixelInPreview(coords) {
    if (coords.x < 0 || coords.x >= 8 || coords.y < 0 || coords.y >= 8) return;
    
    const sx = (this.selectedSprite % 16) * 8;
    const sy = Math.floor(this.selectedSprite / 16) * 8;
    
    const color = this.currentTool === "erase" ? 0 : this.selectedColor;
    this.spriteSheet.setPixel(sx + coords.x, sy + coords.y, color);
    
    this.#render();
  }

  /**
   * Clears the currently selected sprite.
   */
  #clearCurrentSprite() {
    const clearData = new Uint8Array(64);
    this.spriteSheet.setSprite(this.selectedSprite, clearData);
    this.#render();
  }

  /**
   * Renders all canvases.
   */
  #render() {
    this.#renderSheet();
    this.#renderPreview();
  }

  /**
   * Renders the sprite sheet canvas.
   */
  #renderSheet() {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const color = this.spriteSheet.getPixel(x, y);
        this.sheetCtx.fillStyle = this.spriteSheet.palette[color];
        this.sheetCtx.fillRect(
          x * this.sheetZoom,
          y * this.sheetZoom,
          this.sheetZoom,
          this.sheetZoom
        );
      }
    }
    
    // Draw grid
    this.sheetCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.sheetCtx.lineWidth = 1;
    
    for (let i = 0; i <= 16; i++) {
      const pos = i * 8 * this.sheetZoom;
      this.sheetCtx.beginPath();
      this.sheetCtx.moveTo(pos, 0);
      this.sheetCtx.lineTo(pos, 128 * this.sheetZoom);
      this.sheetCtx.stroke();
      
      this.sheetCtx.beginPath();
      this.sheetCtx.moveTo(0, pos);
      this.sheetCtx.lineTo(128 * this.sheetZoom, pos);
      this.sheetCtx.stroke();
    }
  }

  /**
   * Renders the sprite preview canvas.
   */
  #renderPreview() {
    const sx = (this.selectedSprite % 16) * 8;
    const sy = Math.floor(this.selectedSprite / 16) * 8;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const color = this.spriteSheet.getPixel(sx + x, sy + y);
        this.previewCtx.fillStyle = this.spriteSheet.palette[color];
        this.previewCtx.fillRect(
          x * this.previewZoom,
          y * this.previewZoom,
          this.previewZoom,
          this.previewZoom
        );
      }
    }
    
    // Draw grid
    this.previewCtx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.previewCtx.lineWidth = 1;
    
    for (let i = 0; i <= 8; i++) {
      const pos = i * this.previewZoom;
      this.previewCtx.beginPath();
      this.previewCtx.moveTo(pos, 0);
      this.previewCtx.lineTo(pos, 8 * this.previewZoom);
      this.previewCtx.stroke();
      
      this.previewCtx.beginPath();
      this.previewCtx.moveTo(0, pos);
      this.previewCtx.lineTo(8 * this.previewZoom, pos);
      this.previewCtx.stroke();
    }
  }

  /**
   * Gets the sprite sheet data.
   *
   * @returns {SpriteSheet}
   */
  getSpriteSheet() {
    return this.spriteSheet;
  }

  /**
   * Sets sprite sheet data.
   *
   * @param {SpriteSheet} spriteSheet New sprite sheet.
   */
  setSpriteSheet(spriteSheet) {
    this.spriteSheet = spriteSheet;
    this.#render();
  }
}
