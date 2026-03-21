/**
 * Represents a single tileset with 8x8 tiles (128x128px total, 16x16 grid).
 */
export class TileSet {
  /**
   * @param {Object} options Configuration options.
   * @param {string} options.id Unique identifier.
   * @param {string} options.name Display name.
   * @param {string} options.filePath Path or URL to PNG file (file:// or blob:).
   * @param {string} [options.nativePath] Native file system path (for Electron).
   * @param {number} [options.tileWidth=8] Tile width in pixels.
   * @param {number} [options.tileHeight=8] Tile height in pixels.
   * @param {number} [options.columns=16] Number of tiles per row (128px / 8px = 16).
   * @param {number} [options.rows=16] Number of tile rows (128px / 8px = 16).
   */
  constructor(options) {
    this.id = options.id || this.#generateId();
    this.name = options.name || "Untitled Tileset";
    this.filePath = options.filePath || "";
    this.nativePath = options.nativePath || "";
    this.tileWidth = options.tileWidth || 8;
    this.tileHeight = options.tileHeight || 8;
    this.columns = options.columns || 16;
    this.rows = options.rows || 16;
    
    /** @type {HTMLImageElement | null} */
    this.image = null;
    
    /** @type {boolean} */
    this.isLoaded = false;
  }

  /**
   * Generates a unique identifier.
   *
   * @returns {string}
   */
  #generateId() {
    return `tileset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gets the total number of tiles.
   *
   * @returns {number}
   */
  getTileCount() {
    return this.columns * this.rows;
  }

  /**
   * Gets the total width of the tileset image.
   *
   * @returns {number}
   */
  getWidth() {
    return this.columns * this.tileWidth;
  }

  /**
   * Gets the total height of the tileset image.
   *
   * @returns {number}
   */
  getHeight() {
    return this.rows * this.tileHeight;
  }

  /**
   * Loads the tileset image from file path.
   *
   * @returns {Promise<void>}
   */
  async load() {
    if (!this.filePath) {
      throw new Error("No file path specified");
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Validate image is exactly 128x128px
        if (img.width !== 128 || img.height !== 128) {
          reject(new Error(`Tileset must be exactly 128x128px (found ${img.width}x${img.height}px)`));
          return;
        }
        
        this.image = img;
        this.isLoaded = true;
        
        // Fixed grid: 16x16 tiles for 128x128 image with 8x8 tiles
        this.columns = 16;
        this.rows = 16;
        
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${this.filePath}`));
      };
      
      // Add cache-busting for file:// URLs to ensure reload works
      const cacheBuster = this.filePath.startsWith("file://") 
        ? `?t=${Date.now()}` 
        : "";
      img.src = this.filePath + cacheBuster;
    });
  }

  /**
   * Reloads the tileset image.
   *
   * @returns {Promise<void>}
   */
  async reload() {
    this.isLoaded = false;
    this.image = null;
    return this.load();
  }

  /**
   * Gets tile coordinates for a specific tile index.
   *
   * @param {number} tileIndex Tile index (0-based).
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getTileRect(tileIndex) {
    const col = tileIndex % this.columns;
    const row = Math.floor(tileIndex / this.columns);
    
    return {
      x: col * this.tileWidth,
      y: row * this.tileHeight,
      width: this.tileWidth,
      height: this.tileHeight
    };
  }

  /**
   * Serializes tileset to JSON.
   *
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      filePath: this.filePath,
      nativePath: this.nativePath,
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight,
      columns: this.columns,
      rows: this.rows
    };
  }

  /**
   * Creates tileset from JSON data.
   *
   * @param {Object} data Serialized tileset.
   * @returns {TileSet}
   */
  static fromJSON(data) {
    return new TileSet(data);
  }
}
