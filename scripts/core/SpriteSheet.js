/**
 * Manages PICO-8 sprite sheet data with 256 8x8 sprites.
 * Total sheet size: 128x128 pixels, 16-color palette.
 */
export class SpriteSheet {
  /**
   * @param {Object} [options={}] Configuration options.
   */
  constructor(options = {}) {
    /** @type {Uint8Array} Pixel data (128x128, each byte is a palette index 0-15) */
    this.pixels = new Uint8Array(128 * 128);
    
    /** @type {Uint8Array} Sprite flags (256 sprites, 8 flags each) */
    this.flags = new Uint8Array(256);
    
    /** @type {Array<string>} PICO-8 default 16-color palette */
    this.palette = [
      "#000000", "#1D2B53", "#7E2553", "#008751",
      "#AB5236", "#5F574F", "#C2C3C7", "#FFF1E8",
      "#FF004D", "#FFA300", "#FFEC27", "#00E436",
      "#29ADFF", "#83769C", "#FF77A8", "#FFCCAA"
    ];
    
    this.#initialize(options);
  }

  /**
   * Initializes sprite sheet data.
   *
   * @param {Object} options Configuration options.
   */
  #initialize(options) {
    if (options.pixels instanceof Uint8Array && options.pixels.length === 128 * 128) {
      this.pixels.set(options.pixels);
    }
    
    if (options.flags instanceof Uint8Array && options.flags.length === 256) {
      this.flags.set(options.flags);
    }
  }

  /**
   * Gets pixel color at coordinates.
   *
   * @param {number} x X coordinate (0-127).
   * @param {number} y Y coordinate (0-127).
   * @returns {number} Palette index (0-15).
   */
  getPixel(x, y) {
    if (x < 0 || x >= 128 || y < 0 || y >= 128) return 0;
    return this.pixels[y * 128 + x];
  }

  /**
   * Sets pixel color at coordinates.
   *
   * @param {number} x X coordinate (0-127).
   * @param {number} y Y coordinate (0-127).
   * @param {number} color Palette index (0-15).
   */
  setPixel(x, y, color) {
    if (x < 0 || x >= 128 || y < 0 || y >= 128) return;
    this.pixels[y * 128 + x] = Math.max(0, Math.min(15, color));
  }

  /**
   * Gets all pixels for a specific sprite.
   *
   * @param {number} spriteIndex Sprite number (0-255).
   * @returns {Uint8Array} 8x8 pixel array.
   */
  getSprite(spriteIndex) {
    const spriteData = new Uint8Array(8 * 8);
    const sx = (spriteIndex % 16) * 8;
    const sy = Math.floor(spriteIndex / 16) * 8;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        spriteData[y * 8 + x] = this.getPixel(sx + x, sy + y);
      }
    }
    
    return spriteData;
  }

  /**
   * Sets all pixels for a specific sprite.
   *
   * @param {number} spriteIndex Sprite number (0-255).
   * @param {Uint8Array} data 8x8 pixel array.
   */
  setSprite(spriteIndex, data) {
    if (data.length !== 64) return;
    
    const sx = (spriteIndex % 16) * 8;
    const sy = Math.floor(spriteIndex / 16) * 8;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        this.setPixel(sx + x, sy + y, data[y * 8 + x]);
      }
    }
  }

  /**
   * Gets flags for a sprite.
   *
   * @param {number} spriteIndex Sprite number (0-255).
   * @returns {number} 8-bit flag value.
   */
  getFlags(spriteIndex) {
    if (spriteIndex < 0 || spriteIndex >= 256) return 0;
    return this.flags[spriteIndex];
  }

  /**
   * Sets flags for a sprite.
   *
   * @param {number} spriteIndex Sprite number (0-255).
   * @param {number} flagValue 8-bit flag value.
   */
  setFlags(spriteIndex, flagValue) {
    if (spriteIndex < 0 || spriteIndex >= 256) return;
    this.flags[spriteIndex] = flagValue & 0xFF;
  }

  /**
   * Checks if a specific flag is set.
   *
   * @param {number} spriteIndex Sprite number (0-255).
   * @param {number} flagBit Flag bit (0-7).
   * @returns {boolean}
   */
  hasFlag(spriteIndex, flagBit) {
    if (flagBit < 0 || flagBit > 7) return false;
    return (this.getFlags(spriteIndex) & (1 << flagBit)) !== 0;
  }

  /**
   * Sets a specific flag.
   *
   * @param {number} spriteIndex Sprite number (0-255).
   * @param {number} flagBit Flag bit (0-7).
   * @param {boolean} value Flag state.
   */
  setFlag(spriteIndex, flagBit, value) {
    if (flagBit < 0 || flagBit > 7) return;
    
    const currentFlags = this.getFlags(spriteIndex);
    const mask = 1 << flagBit;
    
    if (value) {
      this.setFlags(spriteIndex, currentFlags | mask);
    } else {
      this.setFlags(spriteIndex, currentFlags & ~mask);
    }
  }

  /**
   * Clears all sprite data.
   */
  clear() {
    this.pixels.fill(0);
    this.flags.fill(0);
  }

  /**
   * Serializes sprite sheet to JSON.
   *
   * @returns {Object}
   */
  toJSON() {
    return {
      pixels: Array.from(this.pixels),
      flags: Array.from(this.flags)
    };
  }

  /**
   * Creates sprite sheet from JSON data.
   *
   * @param {Object} data Serialized sprite data.
   * @returns {SpriteSheet}
   */
  static fromJSON(data) {
    return new SpriteSheet({
      pixels: new Uint8Array(data.pixels || []),
      flags: new Uint8Array(data.flags || [])
    });
  }

  /**
   * Exports to PICO-8 .p8 format gfx section.
   *
   * @returns {string} Hex string for __gfx__ section.
   */
  toP8Gfx() {
    const lines = [];
    
    for (let row = 0; row < 128; row++) {
      let line = "";
      for (let col = 0; col < 128; col += 2) {
        const p1 = this.getPixel(col, row);
        const p2 = this.getPixel(col + 1, row);
        line += p1.toString(16) + p2.toString(16);
      }
      lines.push(line);
    }
    
    return lines.join("\n");
  }

  /**
   * Imports from PICO-8 .p8 format gfx section.
   *
   * @param {string} gfxData Hex string from __gfx__ section.
   */
  fromP8Gfx(gfxData) {
    const lines = gfxData.trim().split("\n");
    
    for (let row = 0; row < 128 && row < lines.length; row++) {
      const line = lines[row].trim();
      for (let col = 0; col < 128; col += 2) {
        const hexPair = line.substring(col, col + 2);
        if (hexPair.length === 2) {
          this.setPixel(col, row, parseInt(hexPair[0], 16));
          this.setPixel(col + 1, row, parseInt(hexPair[1], 16));
        }
      }
    }
  }

  /**
   * Exports sprite flags to PICO-8 .p8 format.
   *
   * @returns {string} Hex string for __gff__ section.
   */
  toP8Flags() {
    const lines = [];
    
    for (let i = 0; i < 256; i += 2) {
      const f1 = this.getFlags(i).toString(16).padStart(2, "0");
      const f2 = this.getFlags(i + 1).toString(16).padStart(2, "0");
      lines.push(f1 + f2);
    }
    
    return lines.join("\n");
  }

  /**
   * Imports sprite flags from PICO-8 .p8 format.
   *
   * @param {string} flagData Hex string from __gff__ section.
   */
  fromP8Flags(flagData) {
    const lines = flagData.trim().split("\n");
    
    for (let i = 0; i < 128 && i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length >= 2) {
        this.setFlags(i * 2, parseInt(line.substring(0, 2), 16));
      }
      if (line.length >= 4) {
        this.setFlags(i * 2 + 1, parseInt(line.substring(2, 4), 16));
      }
    }
  }
}
