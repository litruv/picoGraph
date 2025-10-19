import { WorkspaceGeometry } from "./WorkspaceGeometry.js";

/**
 * Coordinates workspace navigation behaviour including pan, zoom, and coordinate transforms.
 */
export class WorkspaceNavigationManager {
  #workspace;
  #renderConnections;
  #markViewDirty;
  #schedulePersist;
  #backgroundOffset;
  #zoomLevel;
  #zoomConfig;
  #panState;
  #lastPanTimestamp;

  /**
   * @param {import("../BlueprintWorkspace.js").BlueprintWorkspace} workspace Owning workspace instance.
   * @param {{ renderConnections?: () => void, markViewDirty?: (reason: string, delay?: number) => void, schedulePersist?: () => void }} [callbacks]
   *        Hook callbacks invoked during navigation changes.
   */
  constructor(workspace, callbacks = {}) {
    this.#workspace = workspace;
    this.#renderConnections =
      typeof callbacks.renderConnections === "function"
        ? callbacks.renderConnections
        : () => {};
    this.#markViewDirty =
      typeof callbacks.markViewDirty === "function"
        ? callbacks.markViewDirty
        : () => {};
    this.#schedulePersist =
      typeof callbacks.schedulePersist === "function"
        ? callbacks.schedulePersist
        : () => {};

    this.#backgroundOffset = { x: 0, y: 0 };
    this.#zoomLevel = 1;
    this.#zoomConfig = { min: 0.25, max: 2.5, step: 0.1 };
    this.#panState = null;
    this.#lastPanTimestamp = 0;
  }

  /**
   * @returns {number} Active zoom multiplier.
   */
  getZoomLevel() {
    return this.#zoomLevel;
  }

  /**
   * Adjusts the zoom level within configured bounds.
   *
   * @param {number} nextZoom Requested zoom multiplier.
   * @param {{ silent?: boolean }} [options] Behaviour overrides.
   * @returns {boolean} Whether the zoom value changed.
   */
  setZoomLevel(nextZoom, options = {}) {
    if (!Number.isFinite(nextZoom)) {
      return false;
    }
    const { silent = false } = options;
    const clamped = Math.max(
      this.#zoomConfig.min,
      Math.min(this.#zoomConfig.max, nextZoom)
    );
    if (Math.abs(clamped - this.#zoomLevel) < 0.0001) {
      return false;
    }

    this.#zoomLevel = clamped;
    this.updateZoomDisplay();
    if (!silent) {
      this.#markViewDirty("view", 200);
      this.#schedulePersist();
    }
    return true;
  }

  /**
   * @returns {{ min: number, max: number, step: number }} Current zoom configuration.
   */
  getZoomConfig() {
    return { ...this.#zoomConfig };
  }

  /**
   * Updates workspace transforms to match the stored zoom level.
   */
  updateZoomDisplay() {
    const zoom = this.#zoomLevel || 1;
    const { nodeLayer, connectionLayer, workspaceElement } = this.#workspace;

    if (nodeLayer) {
      nodeLayer.style.transformOrigin = "0 0";
      nodeLayer.style.transform = `scale(${zoom})`;
    }

    if (connectionLayer) {
      connectionLayer.style.transformOrigin = "0 0";
      connectionLayer.style.transform = `scale(${zoom})`;
    }

    workspaceElement.style.setProperty("--workspace-zoom", `${zoom}`);
    this.#applyBackgroundOffset();
    this.#renderConnections();
  }

  /**
   * Converts a screen-space point to workspace coordinates.
   *
   * @param {{ x: number, y: number }} point Screen-space point relative to the workspace element.
   * @returns {{ x: number, y: number }}
   */
  screenPointToWorld(point) {
    const zoom = this.#zoomLevel || 1;
    return {
      x: point.x / zoom,
      y: point.y / zoom,
    };
  }

  /**
   * Converts a screen-space delta to workspace-space respecting the active zoom.
   *
   * @param {{ x: number, y: number }} delta Screen-space delta.
   * @returns {{ x: number, y: number }}
   */
  screenDeltaToWorld(delta) {
    const zoom = this.#zoomLevel || 1;
    return {
      x: delta.x / zoom,
      y: delta.y / zoom,
    };
  }

  /**
   * Applies zoom centred at a screen-space location.
   *
   * @param {{ x: number, y: number }} screenPoint Screen coordinates inside the workspace.
   * @param {number} direction Positive to zoom in, negative to zoom out.
   * @param {{ clientX?: number, clientY?: number }} [pointer] Optional pointer coordinates relative to the viewport.
   */
  zoomAt(screenPoint, direction, pointer = {}) {
    if (!direction) {
      return;
    }

    const previousZoom = this.#zoomLevel || 1;
    const worldPoint = this.screenPointToWorld(screenPoint);
    const nextZoom = previousZoom + direction * this.#zoomConfig.step;
    const changed = this.setZoomLevel(nextZoom);
    if (!changed) {
      return;
    }

    const currentZoom = this.#zoomLevel || 1;
    if (Math.abs(currentZoom - previousZoom) < 0.0001) {
      return;
    }

    const scale = previousZoom / currentZoom;
    const shift = {
      x: worldPoint.x * (scale - 1),
      y: worldPoint.y * (scale - 1),
    };

    if (Math.abs(shift.x) > 0.0001 || Math.abs(shift.y) > 0.0001) {
      this.translateWorkspace(shift);
      const { dragManager } = this.#workspace;
      if (dragManager?.rebaseActiveDragPointer) {
        dragManager.rebaseActiveDragPointer(pointer);
      }
      this.#rebasePanGestureAfterZoom(pointer);
      this.#renderConnections();
    }
  }

  /**
   * Updates the persisted background offset and re-renders the tiled background.
   *
   * @param {{ x: number, y: number }} offset Workspace-space offset.
   */
  setBackgroundOffset(offset) {
    const next = offset ?? { x: 0, y: 0 };
    this.#backgroundOffset = {
      x: Number.isFinite(next.x) ? next.x : 0,
      y: Number.isFinite(next.y) ? next.y : 0,
    };
    this.#applyBackgroundOffset();
  }

  /**
   * @returns {{ x: number, y: number }} Current background offset reference.
   */
  getBackgroundOffset() {
    return this.#backgroundOffset;
  }

  /**
   * Applies a workspace translation to all nodes and the background.
   *
   * @param {{ x: number, y: number }} delta Translation amount in workspace units.
   */
  translateWorkspace(delta) {
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      return;
    }

    this.setBackgroundOffset({
      x: this.#backgroundOffset.x + delta.x,
      y: this.#backgroundOffset.y + delta.y,
    });

    const { graph, dragManager } = this.#workspace;
    const panState = this.#panState;
    const panDelta = panState ? panState.lastDelta : null;

    graph.nodes.forEach((node) => {
      const origin = panState?.nodeOrigins.get(node.id) ?? node.position;
      const baseDelta = panDelta ?? { x: 0, y: 0 };
      const next = {
        x: origin.x + baseDelta.x + delta.x,
        y: origin.y + baseDelta.y + delta.y,
      };
      graph.setNodePosition(node.id, next);
      if (dragManager?.updateNodeDomPosition) {
        dragManager.updateNodeDomPosition(node.id, next);
      }
    });

    if (dragManager?.applyActiveDragShift) {
      dragManager.applyActiveDragShift(delta);
    }

    this.#syncPanStateAfterShift(delta);
  }

  /**
   * Recentres the viewport on the supplied node if available.
   *
   * @param {string} nodeId Target node identifier.
   */
  focusNode(nodeId) {
    const element = this.#workspace.nodeElements.get(nodeId);
    if (!element) {
      return;
    }

    const workspaceRect = this.#workspace.workspaceElement.getBoundingClientRect();
    const nodeRect = element.getBoundingClientRect();
    if (!workspaceRect.width || !workspaceRect.height) {
      this.#workspace.selectNode(nodeId);
      return;
    }

    const workspaceCenterX = workspaceRect.left + workspaceRect.width / 2;
    const workspaceCenterY = workspaceRect.top + workspaceRect.height / 2;
    const nodeCenterX = nodeRect.left + nodeRect.width / 2;
    const nodeCenterY = nodeRect.top + nodeRect.height / 2;

    const deltaXScreen = workspaceCenterX - nodeCenterX;
    const deltaYScreen = workspaceCenterY - nodeCenterY;

    if (Math.abs(deltaXScreen) < 1 && Math.abs(deltaYScreen) < 1) {
      this.#workspace.selectNode(nodeId);
      return;
    }

    const delta = this.screenDeltaToWorld({
      x: deltaXScreen,
      y: deltaYScreen,
    });

    this.translateWorkspace(delta);
    this.#workspace.selectNode(nodeId);
  }

  /**
   * Frames the supplied node identifiers within the viewport.
   *
   * @param {Array<string>} nodeIds Node identifiers to include when framing.
   */
  frameNodes(nodeIds) {
    const { workspaceElement, nodeElements, graph } = this.#workspace;
    const rect = workspaceElement.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    /** @type {Array<{ id: string, x: number, y: number, width: number, height: number }>} */
    const targets = [];
    const collect = (id) => {
      const node = graph.nodes.get(id);
      const element = nodeElements.get(id);
      if (!node || !element || !element.isConnected) {
        return;
      }
      const width = Math.max(1, element.offsetWidth);
      const height = Math.max(1, element.offsetHeight);
      targets.push({
        id,
        x: node.position.x,
        y: node.position.y,
        width,
        height,
      });
    };

    if (Array.isArray(nodeIds) && nodeIds.length) {
      nodeIds.forEach((id) => collect(id));
    } else {
      nodeElements.forEach((_, id) => collect(id));
    }

    if (!targets.length) {
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    targets.forEach((entry) => {
      minX = Math.min(minX, entry.x);
      minY = Math.min(minY, entry.y);
      maxX = Math.max(maxX, entry.x + entry.width);
      maxY = Math.max(maxY, entry.y + entry.height);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      return;
    }

    const boundsWidth = Math.max(1, maxX - minX);
    const boundsHeight = Math.max(1, maxY - minY);
    const viewportPadding = 200;
    const availableWidth = Math.max(120, rect.width - viewportPadding);
    const availableHeight = Math.max(120, rect.height - viewportPadding);
    let targetZoom = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight);

    if (!Number.isFinite(targetZoom) || targetZoom <= 0) {
      targetZoom = this.#zoomLevel || 1;
    }

    targetZoom = Math.max(this.#zoomConfig.min, Math.min(this.#zoomConfig.max, targetZoom));
    this.setZoomLevel(targetZoom);

    const contentCenter = {
      x: minX + boundsWidth / 2,
      y: minY + boundsHeight / 2,
    };

    const viewportCenter = this.screenPointToWorld({
      x: rect.width / 2,
      y: rect.height / 2,
    });

    const delta = {
      x: viewportCenter.x - contentCenter.x,
      y: viewportCenter.y - contentCenter.y,
    };

    if (Math.abs(delta.x) > 0.0001 || Math.abs(delta.y) > 0.0001) {
      this.translateWorkspace(delta);
      this.#renderConnections();
    }

    this.#markViewDirty("view", 200);
    this.#schedulePersist();
  }

  /**
   * Begins a pan gesture driven by the supplied pointer event.
   *
   * @param {PointerEvent} event Pointer event initiating the pan.
   */
  beginPan(event) {
    if (this.#panState) {
      return;
    }

    const { dragManager, contextMenuManager, graph, nodeElements } =
      this.#workspace;

    dragManager?.removeNodeGhost();
    dragManager?.removePaletteGhost();

    const nodeOrigins = new Map();
    graph.nodes.forEach((node) => {
      nodeOrigins.set(node.id, { x: node.position.x, y: node.position.y });
    });

    const state = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastDelta: { x: 0, y: 0 },
      hasMoved: false,
      nodeOrigins,
      backgroundOrigin: { ...this.#backgroundOffset },
    };

    const handlePointerMove = (moveEvent) => {
      if (!this.#panState || moveEvent.pointerId !== this.#panState.pointerId) {
        return;
      }

      const deltaXScreen = moveEvent.clientX - this.#panState.startX;
      const deltaYScreen = moveEvent.clientY - this.#panState.startY;
      const worldDelta = this.screenDeltaToWorld({
        x: deltaXScreen,
        y: deltaYScreen,
      });
      this.#panState.lastDelta = worldDelta;

      if (!this.#panState.hasMoved) {
        const distance = Math.hypot(deltaXScreen, deltaYScreen);
        if (distance < 3) {
          return;
        }
        moveEvent.preventDefault();
        this.#panState.hasMoved = true;
  contextMenuManager?.hide();
      }

      if (!this.#panState.hasMoved) {
        return;
      }

      const backgroundOffset = {
        x: this.#panState.backgroundOrigin.x + worldDelta.x,
        y: this.#panState.backgroundOrigin.y + worldDelta.y,
      };
      this.setBackgroundOffset(backgroundOffset);

      this.#panState.nodeOrigins.forEach((origin, nodeId) => {
        const element = nodeElements.get(nodeId);
        if (!element) {
          return;
        }
        const next = {
          x: origin.x + worldDelta.x,
          y: origin.y + worldDelta.y,
        };
        element.style.transform = WorkspaceGeometry.positionToTransform(next);
      });

      this.#renderConnections();
    };

    const handlePointerUp = (upEvent) => {
      if (!this.#panState || upEvent.pointerId !== this.#panState.pointerId) {
        return;
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      const finalState = this.#panState;
      this.#panState = null;

      if (!finalState.hasMoved) {
        return;
      }

      this.#lastPanTimestamp = this.#timestamp();
      const delta = finalState.lastDelta;
      this.setBackgroundOffset({
        x: finalState.backgroundOrigin.x + delta.x,
        y: finalState.backgroundOrigin.y + delta.y,
      });
      finalState.nodeOrigins.forEach((origin, nodeId) => {
        graph.setNodePosition(nodeId, {
          x: origin.x + delta.x,
          y: origin.y + delta.y,
        });
      });
    };

    this.#panState = state;

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  /**
   * Applies persisted view state values.
   *
   * @param {{ backgroundOffset?: { x: number, y: number }, zoom?: number } | null | undefined} view View state payload.
   */
  applyViewState(view) {
    const offset = view?.backgroundOffset ?? { x: 0, y: 0 };
    this.setBackgroundOffset(offset);
    if (typeof view?.zoom === "number" && Number.isFinite(view.zoom)) {
      this.setZoomLevel(view.zoom, { silent: true });
    } else {
      this.updateZoomDisplay();
    }
  }

  /**
   * Determines whether a pan gesture concluded recently.
   *
   * @param {number} thresholdMs Time window in milliseconds.
   * @returns {boolean}
   */
  isPanRecent(thresholdMs) {
    if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
      return false;
    }
    return this.#timestamp() - this.#lastPanTimestamp < thresholdMs;
  }

  /**
   * @returns {number} Timestamp of the most recent completed pan gesture.
   */
  getLastPanTimestamp() {
    return this.#lastPanTimestamp;
  }

  /**
   * Applies the current background offset to the workspace element styles.
   */
  #applyBackgroundOffset() {
    const zoom = this.#zoomLevel || 1;
    const scaledX = this.#backgroundOffset.x * zoom;
    const scaledY = this.#backgroundOffset.y * zoom;
    const position = `${scaledX}px ${scaledY}px`;
    this.#workspace.workspaceElement.style.backgroundPosition = `${position}, ${position}, ${position}, ${position}`;
  }

  /**
   * Aligns any active pan state with a programmatic workspace translation.
   *
   * @param {{ x: number, y: number }} shift Workspace-space delta applied externally.
   */
  #syncPanStateAfterShift(shift) {
    if (!this.#panState) {
      return;
    }

    if (!shift || (shift.x === 0 && shift.y === 0)) {
      return;
    }

    this.#panState.backgroundOrigin = {
      x: this.#panState.backgroundOrigin.x + shift.x,
      y: this.#panState.backgroundOrigin.y + shift.y,
    };

    this.#panState.nodeOrigins.forEach((origin, nodeId, map) => {
      map.set(nodeId, {
        x: origin.x + shift.x,
        y: origin.y + shift.y,
      });
    });
  }

  /**
   * Rebases the active pan gesture to keep world deltas stable after zoom changes.
   *
   * @param {{ clientX?: number, clientY?: number }} [pointer] Pointer coordinates supplied by the zoom trigger.
   */
  #rebasePanGestureAfterZoom(pointer) {
    if (!this.#panState) {
      return;
    }

    const zoom = this.#zoomLevel || 1;
    const { clientX, clientY } = pointer ?? {};

    if (Number.isFinite(clientX)) {
      this.#panState.startX = clientX - this.#panState.lastDelta.x * zoom;
    }

    if (Number.isFinite(clientY)) {
      this.#panState.startY = clientY - this.#panState.lastDelta.y * zoom;
    }
  }

  /**
   * @returns {number} High-resolution timestamp when available.
   */
  #timestamp() {
    if (
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
    ) {
      return performance.now();
    }
    return Date.now();
  }
}
