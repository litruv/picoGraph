/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 * @typedef {import('./WorkspaceHistoryManager.js').SerializedWorkspace} SerializedWorkspace
 */

import { WORKSPACE_STORAGE_KEY } from "../BlueprintWorkspaceConstants.js";

/**
 * Handles saving and restoring workspace state using localStorage.
 */
export class WorkspacePersistenceManager {
  #workspace;
  #timerId;
  #storageAvailable;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   */
  constructor(workspace) {
    this.#workspace = workspace;
    this.#timerId = null;
    this.#storageAvailable = this.#detectLocalStorage();
  }

  /**
   * Indicates whether localStorage is available for persistence.
   *
   * @returns {boolean}
   */
  get isStorageAvailable() {
    return this.#storageAvailable;
  }

  /**
   * Clears any pending persist timer.
   */
  cancelScheduledPersist() {
    if (this.#timerId !== null && typeof window !== "undefined") {
      window.clearTimeout(this.#timerId);
      this.#timerId = null;
    }
  }

  /**
   * Persists workspace state after a small debounce to reduce write frequency.
   */
  schedulePersist() {
    if (
      !this.#storageAvailable ||
      this.#workspace.isRestoring ||
      typeof window === "undefined"
    ) {
      return;
    }

    this.cancelScheduledPersist();
    this.#timerId = window.setTimeout(() => {
      this.#timerId = null;
      this.persistImmediately();
    }, 200);
  }

  /**
   * Serializes current workspace state and writes it to localStorage immediately.
   */
  persistImmediately() {
    if (!this.#storageAvailable || typeof window === "undefined") {
      return;
    }

    try {
      const payload = this.serializeWorkspace();
      window.localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify(payload)
      );
    } catch (error) {
      console.error("Failed to persist workspace state", error);
    }
  }

  /**
   * Creates a serializable snapshot of the workspace.
   *
   * @returns {SerializedWorkspace}
   */
  serializeWorkspace() {
    const variableEntries = this.#workspace.variableOrder
      .map((variableId) => this.#workspace.variables.get(variableId))
      .filter((entry) => Boolean(entry))
      .map((entry) => {
        const variable =
          /** @type {{ id: string, name: string, type: 'any'|'number'|'string'|'boolean'|'table', defaultValue: import('../BlueprintWorkspace.js').VariableDefaultValue }} */ (
            entry
          );
        return {
          id: variable.id,
          name: variable.name,
          type: variable.type,
          defaultValue:
            variable.defaultValue === undefined
              ? null
              : this.#cloneVariableDefault(variable.defaultValue),
        };
      });

    return {
      version: 4,
      projectSettings: { ...this.#workspace.projectSettings },
      graph: this.#workspace.graph.toJSON(),
      variables: {
        entries: variableEntries,
        counter: this.#workspace.variableCounter,
      },
      spawnIndex: this.#workspace.spawnIndex,
      ui: {
        paletteVisible: Boolean(this.#workspace.isPaletteVisible),
      },
    };
  }

  /**
   * Attempts to load workspace state from localStorage.
   *
   * @returns {boolean} Whether a valid payload was applied.
   */
  restoreFromStorage() {
    if (!this.#storageAvailable || typeof window === "undefined") {
      return false;
    }

    let raw = null;
    try {
      raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to access stored workspace state", error);
      return false;
    }

    if (!raw) {
      return false;
    }

    try {
      const payload = JSON.parse(raw);
      const hasGraph =
        payload &&
        typeof payload === "object" &&
        payload.graph &&
        typeof payload.graph === "object" &&
        Array.isArray(payload.graph.nodes) &&
        Array.isArray(payload.graph.connections);
      if (!hasGraph) {
        return false;
      }

      this.#workspace.applySerializedWorkspace(payload);
      return true;
    } catch (error) {
      console.error("Failed to restore workspace state", error);
      return false;
    }
  }

  /**
   * Detects whether localStorage is available in the execution environment.
   *
   * @returns {boolean}
   */
  #detectLocalStorage() {
    try {
      if (typeof window === "undefined" || !("localStorage" in window)) {
        return false;
      }
      const probeKey = "__picograph_probe__";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Produces a JSON-safe clone of a variable default value.
   *
   * @param {import('../BlueprintWorkspace.js').VariableDefaultValue} value Default value to clone.
   * @returns {import('../BlueprintWorkspace.js').VariableDefaultValue}
   */
  #cloneVariableDefault(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => ({
        id: typeof entry?.id === "string" ? entry.id : "",
        key: typeof entry?.key === "string" ? entry.key : "",
        value: typeof entry?.value === "string" ? entry.value : "",
      }));
    }

    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === "object") {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (_error) {
        return null;
      }
    }

    return value;
  }
}
