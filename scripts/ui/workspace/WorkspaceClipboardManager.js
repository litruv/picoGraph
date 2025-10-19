/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 * @typedef {import('./WorkspaceHistoryManager.js').WorkspaceHistoryManager} WorkspaceHistoryManager
 * @typedef {ReturnType<import('../../core/NodeGraph.js').NodeGraph['toJSON']>} GraphSnapshot
 */

const CLIPBOARD_OFFSET_STEP = 32;

/**
 * Manages copy and paste operations for selected nodes.
 */
export class WorkspaceClipboardManager {
  #workspace;
  #history;
  /** @type {{ nodes: Array<GraphSnapshot['nodes'][number]>, connections: Array<GraphSnapshot['connections'][number]>, pasteCount: number, bounds: { minX: number, maxX: number, minY: number, maxY: number } | null } | null} */
  #payload;
  /** @type {{ x: number, y: number } | null} */
  #lastPointerPosition;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   * @param {WorkspaceHistoryManager} history History manager for undo integration.
   */
  constructor(workspace, history) {
    this.#workspace = workspace;
    this.#history = history;
    this.#payload = null;
    /** @type {{ x: number, y: number } | null} */
    this.#lastPointerPosition = null;
  }

  /**
   * Clears the clipboard payload.
   */
  reset() {
    this.#payload = null;
    this.#lastPointerPosition = null;
  }

  /**
   * Copies the current node selection into the clipboard payload.
   *
   * @returns {boolean} Whether a payload was captured.
   */
  copySelection() {
    if (!this.#workspace.selectedNodeIds.size) {
      return false;
    }

    /** @type {Array<GraphSnapshot['nodes'][number]>} */
    const nodes = [];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let hasBounds = false;

    this.#workspace.selectedNodeIds.forEach((id) => {
      const node = this.#workspace.graph.nodes.get(id);
      if (!node) {
        return;
      }

      nodes.push(node.toJSON());

      const pos = node.position;
      if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
        return;
      }

      const element = this.#workspace.nodeElements.get(id) ?? null;
      const size = this.#measureNodeSize(element);
      hasBounds = true;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + size.width);
      maxY = Math.max(maxY, pos.y + size.height);
    });

    if (!nodes.length) {
      return false;
    }

    const selectedIds = new Set(nodes.map((node) => node.id));
    const connections = this.#workspace.graph
      .getConnections()
      .filter(
        (connection) =>
          selectedIds.has(connection.from.nodeId) &&
          selectedIds.has(connection.to.nodeId)
      )
      .map((connection) => connection.toJSON());

    const bounds = hasBounds ? { minX, maxX, minY, maxY } : null;

    this.#payload = { nodes, connections, pasteCount: 0, bounds };
    return true;
  }

  /**
   * Captures the latest pointer position within the workspace.
   *
   * @param {{ x: number, y: number } | null} position Workspace-space pointer coordinates.
   */
  updatePointerPosition(position) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      this.#lastPointerPosition = null;
      return;
    }

    this.#lastPointerPosition = { x: position.x, y: position.y };
  }

  /**
   * Clears any stored pointer position hints.
   */
  clearPointerPosition() {
    this.#lastPointerPosition = null;
  }

  /**
   * Cuts the current node selection: copies it to the clipboard and removes the originals.
   *
   * @returns {boolean} Whether any nodes were cut.
   */
  cutSelection() {
    const copied = this.copySelection();
    if (!copied) {
      return false;
    }

    const targets = Array.from(this.#workspace.selectedNodeIds);
    if (!targets.length) {
      return false;
    }

    this.#history.withSuspended(
      () => {
        targets.forEach((id) => this.#workspace.removeNode(id));
      },
      { suppressAutoCommit: true }
    );

    this.#history.commitCheckpoint("cut");
    return true;
  }

  /**
   * Pastes the clipboard payload, centering at the pointer when available.
   */
  paste() {
    if (!this.#payload || !this.#payload.nodes.length) {
      return;
    }

  const clipboard = this.#payload;
  const bounds = clipboard.bounds ?? this.#calculatePayloadBounds(clipboard.nodes);
    const anchor = this.#lastPointerPosition;
    let delta;

    if (anchor && bounds) {
      const center = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      };
      delta = {
        x: anchor.x - center.x,
        y: anchor.y - center.y,
      };
    } else {
      const offsetMultiplier = CLIPBOARD_OFFSET_STEP * (clipboard.pasteCount + 1);
      delta = { x: offsetMultiplier, y: offsetMultiplier };
    }

    /** @type {Array<string>} */
    const newNodeIds = [];
    const idMap = new Map();

    this.#history.withSuspended(
      () => {
        clipboard.nodes.forEach((nodeData) => {
          const definition = this.#workspace.registry.get(nodeData.type);
          if (!definition) {
            return;
          }

          const newId = this.#workspace.graph.createNodeId(nodeData.type);
          const position = {
            x: nodeData.position.x + delta.x,
            y: nodeData.position.y + delta.y,
          };

          const node = this.#workspace.registry.createNode(nodeData.type, {
            id: newId,
            position,
          });
          node.title = nodeData.title;
          node.properties = { ...nodeData.properties };
          node.inputs = nodeData.inputs.map((pin) => ({ ...pin }));
          node.outputs = nodeData.outputs.map((pin) => ({ ...pin }));

          this.#workspace.graph.addNode(node);
          this.#workspace.renderNode(node);
          idMap.set(nodeData.id, newId);
          newNodeIds.push(newId);
        });

        clipboard.connections.forEach((connection) => {
          const fromId = idMap.get(connection.from.nodeId);
          const toId = idMap.get(connection.to.nodeId);
          if (!fromId || !toId) {
            return;
          }
          this.#workspace.graph.connect(
            { nodeId: fromId, pinId: connection.from.pinId },
            { nodeId: toId, pinId: connection.to.pinId }
          );
        });
      },
      { suppressAutoCommit: true }
    );

    if (newNodeIds.length) {
      clipboard.pasteCount += 1;
      this.#workspace.setSelectionState(newNodeIds, newNodeIds[0]);
      this.#history.commitCheckpoint("paste");
    }
  }

  /**
   * Computes the bounding extents of nodes stored in the clipboard payload.
   *
   * @param {Array<GraphSnapshot['nodes'][number]>} nodes Clipboard node entries.
   * @returns {{ minX: number, maxX: number, minY: number, maxY: number } | null}
   */
  #calculatePayloadBounds(nodes) {
    if (!nodes.length) {
      return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let hasValid = false;

    nodes.forEach((node) => {
      const pos = node?.position;
      if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
        return;
      }
      hasValid = true;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    });

    if (!hasValid) {
      return null;
    }

    return { minX, maxX, minY, maxY };
  }

  /**
   * Measures a node element's size in workspace units.
   *
   * @param {HTMLElement | null} element Node DOM element reference.
   * @returns {{ width: number, height: number }}
   */
  #measureNodeSize(element) {
    if (!element) {
      return { width: 1, height: 1 };
    }

    const zoom = this.#workspace.zoomLevel || 1;
    const rect = element.getBoundingClientRect();
    const width = rect.width / zoom;
    const height = rect.height / zoom;
    const fallbackWidth = element.offsetWidth || width || 1;
    const fallbackHeight = element.offsetHeight || height || 1;

    return {
      width: Number.isFinite(width) && width > 0 ? width : Math.max(1, fallbackWidth),
      height: Number.isFinite(height) && height > 0 ? height : Math.max(1, fallbackHeight),
    };
  }
}
