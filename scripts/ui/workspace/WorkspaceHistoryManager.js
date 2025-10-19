/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 * @typedef {ReturnType<import('../../core/NodeGraph.js').NodeGraph['toJSON']>} GraphSnapshot
 */

/**
 * @typedef {Object} WorkspaceSnapshotSelection
 * @property {Array<string>} nodes
 * @property {string | null} primary
 * @property {string | null} variable
 */

/**
 * @typedef {Object} WorkspaceSnapshotView
 * @property {{ x: number, y: number }} backgroundOffset
 * @property {number} zoom
 */

/**
 * @typedef {Object} SerializedWorkspace
 * @property {number} version
 * @property {{ use60Fps: boolean }} projectSettings
 * @property {GraphSnapshot} graph
 * @property {{ entries: Array<{ id: string, name: string, type: import('../BlueprintWorkspace.js').VariableType, defaultValue: import('../BlueprintWorkspace.js').VariableDefaultValue | null }>, counter: number }} variables
 * @property {number} spawnIndex
 * @property {{ paletteVisible: boolean }} [ui]
 */

/**
 * @typedef {Object} WorkspaceSnapshot
 * @property {SerializedWorkspace} workspace
 * @property {WorkspaceSnapshotSelection} selection
 * @property {WorkspaceSnapshotView} view
 */

const HISTORY_MAX_ENTRIES = 200;
const HISTORY_DEBOUNCE_MS = 200;

/**
 * Coordinates undo/redo history for the blueprint workspace.
 */
export class WorkspaceHistoryManager {
  #workspace;
  #timerId;
  #lastSerialized;
  #pendingDirty;
  #pendingReason;
  #suspendDepth;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   */
  constructor(workspace) {
    this.#workspace = workspace;
    /** @type {Array<WorkspaceSnapshot>} */
    this.undoStack = [];
    /** @type {Array<WorkspaceSnapshot>} */
    this.redoStack = [];
    this.isReady = false;
    this.#timerId = null;
    this.#lastSerialized = null;
    this.#pendingDirty = false;
    this.#pendingReason = null;
    this.#suspendDepth = 0;
  }

  /**
   * Resets undo/redo buffers and records the current workspace state.
   */
  initialize() {
    this.#clearTimer();
    this.undoStack = [];
    this.redoStack = [];
    this.#pendingDirty = false;
    this.#pendingReason = null;
    this.#suspendDepth = 0;

    const snapshot = this.#captureSnapshot();
    this.undoStack.push(snapshot);
    this.#lastSerialized = JSON.stringify(snapshot);
    this.isReady = true;
  }

  /**
   * Clears undo/redo buffers without recording a snapshot. Used when the workspace is about to be rebuilt entirely.
   */
  handleReset() {
    this.isReady = false;
    this.#clearTimer();
    this.undoStack = [];
    this.redoStack = [];
    this.#pendingDirty = false;
    this.#pendingReason = null;
    this.#lastSerialized = null;
    this.#suspendDepth = 0;
  }

  /**
   * Records a mutation for undo/redo bookkeeping.
   *
   * @param {'nodeschanged'|'nodepropertychanged'|'connectionschanged'|'nodepositionchanged'} kind Mutation descriptor.
   */
  registerMutation(kind) {
    if (!this.isReady || this.#workspace.isRestoring) {
      return;
    }

    if (kind === "nodepositionchanged") {
      this.markDirty(kind, HISTORY_DEBOUNCE_MS);
      return;
    }

    if (kind === "nodeschanged") {
      this.markDirty(kind, 0);
      return;
    }

    this.commitCheckpoint(kind);
  }

  /**
   * Schedules a deferred history checkpoint to coalesce rapid mutations.
   *
   * @param {string} reason Descriptive label for the mutation.
   * @param {number} [delay=HISTORY_DEBOUNCE_MS] Debounce duration.
   */
  markDirty(reason, delay = HISTORY_DEBOUNCE_MS) {
    if (!this.isReady || this.#workspace.isRestoring) {
      return;
    }

    if (this.#suspendDepth > 0) {
      this.#pendingDirty = true;
      this.#pendingReason = reason;
      return;
    }

    if (delay <= 0 || typeof window === "undefined") {
      this.commitCheckpoint(reason);
      return;
    }

    this.#clearTimer();
    this.#pendingDirty = true;
    this.#pendingReason = reason;
    this.#timerId = window.setTimeout(() => {
      this.#timerId = null;
      const pendingReason = this.#pendingReason ?? reason;
      this.#pendingDirty = false;
      this.#pendingReason = null;
      this.commitCheckpoint(pendingReason);
    }, delay);
  }

  /**
   * Captures and stores a new undo checkpoint immediately.
   *
   * @param {string} reason Descriptive label for the mutation.
   */
  commitCheckpoint(reason) {
    if (!this.isReady || this.#workspace.isRestoring) {
      return;
    }

    if (this.#suspendDepth > 0) {
      this.#pendingDirty = true;
      this.#pendingReason = reason;
      return;
    }

    this.#clearTimer();
    const snapshot = this.#captureSnapshot();
    const serialized = JSON.stringify(snapshot);
    if (serialized === this.#lastSerialized) {
      return;
    }

    this.undoStack.push(snapshot);
    if (this.undoStack.length > HISTORY_MAX_ENTRIES + 1) {
      this.undoStack.shift();
    }
    this.#lastSerialized = serialized;
    this.redoStack = [];
    this.#pendingDirty = false;
    this.#pendingReason = null;
  }

  /**
   * Executes a callback while temporarily suppressing automatic history commits.
   *
   * @template T
   * @param {() => T} callback Callback executed while suspended.
   * @param {{ suppressAutoCommit?: boolean }} [options] Behaviour overrides.
   * @returns {T}
   */
  withSuspended(callback, options = {}) {
    const suppressAutoCommit = Boolean(options.suppressAutoCommit);
    this.#suspendDepth += 1;
    try {
      return callback();
    } finally {
      this.#suspendDepth = Math.max(0, this.#suspendDepth - 1);
      if (this.#suspendDepth === 0 && this.#pendingDirty) {
        if (suppressAutoCommit) {
          this.#pendingDirty = false;
          this.#pendingReason = null;
        } else {
          const reason = this.#pendingReason ?? "batched";
          this.#pendingDirty = false;
          this.#pendingReason = null;
          this.markDirty(reason, 0);
        }
      }
    }
  }

  /**
   * Reverts the workspace to the previous history entry, if available.
   */
  undo() {
    if (!this.isReady || this.undoStack.length <= 1) {
      return;
    }

    this.#clearTimer();
    const current = this.undoStack.pop();
    if (!current) {
      return;
    }

    this.redoStack.push(current);
    const previous = this.undoStack[this.undoStack.length - 1];
    if (!previous) {
      return;
    }

    this.#restoreSnapshot(previous);
    this.#lastSerialized = JSON.stringify(previous);
  }

  /**
   * Re-applies the most recently undone history entry, if available.
   */
  redo() {
    if (!this.isReady || !this.redoStack.length) {
      return;
    }

    this.#clearTimer();
    const snapshot = this.redoStack.pop();
    if (!snapshot) {
      return;
    }

    this.undoStack.push(snapshot);
    this.#restoreSnapshot(snapshot);
    this.#lastSerialized = JSON.stringify(snapshot);
  }

  /**
   * Cancels any pending history timers.
   */
  #clearTimer() {
    if (this.#timerId !== null && typeof window !== "undefined") {
      window.clearTimeout(this.#timerId);
      this.#timerId = null;
    }
  }

  /**
   * Captures a complete workspace snapshot, including selection and view state.
   *
   * @returns {WorkspaceSnapshot}
   */
  #captureSnapshot() {
    const workspacePayload = /** @type {SerializedWorkspace} */ (
      this.#workspace.serializeWorkspace()
    );
    const selection = {
      nodes: [...this.#workspace.selectedNodeIds],
      primary: this.#workspace.selectedNodeId ?? null,
      variable: this.#workspace.selectedVariableId ?? null,
    };
    const view = {
      backgroundOffset: { ...this.#workspace.workspaceBackgroundOffset },
      zoom: this.#workspace.zoomLevel,
    };

    return { workspace: workspacePayload, selection, view };
  }

  /**
   * Restores the workspace to a previously captured snapshot.
   *
   * @param {WorkspaceSnapshot} snapshot Snapshot to restore.
   */
  #restoreSnapshot(snapshot) {
    this.#clearTimer();
    const wasReady = this.isReady;
    this.isReady = false;
    this.#pendingDirty = false;
    this.#pendingReason = null;

    this.#workspace.applySerializedWorkspace(snapshot.workspace);
    this.#workspace.applyHistoryView(snapshot.view);
    this.#workspace.applyHistorySelection(snapshot.selection);

    this.isReady = wasReady;
  }
}
