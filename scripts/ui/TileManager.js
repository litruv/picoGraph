import { TileSetBrowser } from "./TileSetBrowser.js";

/**
 * Manages the tile browser modal and provides access to tileset management.
 */
export class TileManager {
  constructor() {
    this.modal = null;
    this.browser = null;
    this.isOpen = false;
  }

  /**
   * Initializes the tile manager.
   */
  initialize() {
    this.modal = document.getElementById("tileModal");
    if (!this.modal) {
      console.error("Tile modal element not found");
      return;
    }

    const container = this.modal.querySelector(".tile-browser-container");
    if (!container) {
      console.error("Tile browser container not found");
      return;
    }

    this.browser = new TileSetBrowser(container);

    const closeBtn = this.modal.querySelector(".close-modal");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    const tileBtn = document.getElementById("tileManagerButton");
    if (tileBtn) {
      tileBtn.addEventListener("click", () => this.open());
    }

    this.#loadFromLocalStorage();
  }

  /**
   * Opens the tile manager modal.
   */
  open() {
    if (!this.modal) return;
    this.modal.style.display = "flex";
    this.isOpen = true;
  }

  /**
   * Closes the tile manager modal.
   */
  close() {
    if (!this.modal) return;
    this.modal.style.display = "none";
    this.isOpen = false;
    this.#saveToLocalStorage();
  }

  /**
   * Gets all tilesets.
   *
   * @returns {Array<TileSet>}
   */
  getTileSets() {
    return this.browser ? this.browser.getTileSets() : [];
  }

  /**
   * Saves tileset data to localStorage.
   */
  #saveToLocalStorage() {
    if (!this.browser) return;

    try {
      const data = this.browser.toJSON();
      localStorage.setItem("picograph_tilesets", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save tilesets:", error);
    }
  }

  /**
   * Loads tileset data from localStorage.
   */
  async #loadFromLocalStorage() {
    if (!this.browser) return;

    try {
      const stored = localStorage.getItem("picograph_tilesets");
      if (stored) {
        const data = JSON.parse(stored);
        await this.browser.fromJSON(data);
      }
    } catch (error) {
      console.error("Failed to load tilesets:", error);
    }
  }
}
