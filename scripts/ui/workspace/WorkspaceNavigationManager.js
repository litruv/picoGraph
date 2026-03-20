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
  #targetZoomLevel;
  #smoothZoomFocus;
  #smoothZoomRafId;
  #pendingLayerOffset;

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
    this.#targetZoomLevel = 1;
    this.#smoothZoomFocus = null;
    this.#smoothZoomRafId = null;
    this.#pendingLayerOffset = { x: 0, y: 0 };
  }

  /**
   * @returns {number} Active zoom multiplier.
   */
  getZoomLevel() {
    return this.#zoomLevel;
  }

  /**
   * Returns the accumulated node-layer translate offset that is pending commit
   * during a smooth zoom animation. This must be accounted for when converting
   * screen/client coordinates to world coordinates mid-lerp.
   *
   * @returns {{ x: number, y: number }}
   */
  getPendingLayerOffset() {
    return { x: this.#pendingLayerOffset.x, y: this.#pendingLayerOffset.y };
  }

  /**
   * Adjusts the zoom level within configured bounds.
   *
   * @param {number} nextZoom Requested zoom multiplier.
   * @param {{ silent?: boolean, skipConnectionRender?: boolean }} [options] Behaviour overrides.
   * @returns {boolean} Whether the zoom value changed.
   */
  setZoomLevel(nextZoom, options = {}) {
    if (!Number.isFinite(nextZoom)) {
      return false;
    }
    const { silent = false, skipConnectionRender = false } = options;
    const clamped = Math.max(
      this.#zoomConfig.min,
      Math.min(this.#zoomConfig.max, nextZoom)
    );
    if (Math.abs(clamped - this.#zoomLevel) < 0.0001) {
      return false;
    }

    // Cancel any running smooth zoom so programmatic calls take immediate effect.
    if (this.#smoothZoomRafId !== null) {
      cancelAnimationFrame(this.#smoothZoomRafId);
      this.#smoothZoomRafId = null;
      this.#smoothZoomFocus = null;
      // Commit any pending layer offset before the snap.
      const pending = this.#pendingLayerOffset;
      this.#pendingLayerOffset = { x: 0, y: 0 };
      if (Math.abs(pending.x) > 0.0001 || Math.abs(pending.y) > 0.0001) {
        this.setBackgroundOffset({
          x: this.#backgroundOffset.x - pending.x,
          y: this.#backgroundOffset.y - pending.y,
        });
        this.translateWorkspace(pending);
      }
    }
    this.#targetZoomLevel = clamped;
    this.#zoomLevel = clamped;
    this.updateZoomDisplay(skipConnectionRender);
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
   *
   * @param {boolean} [skipConnectionRender] When true, skips the connection re-render pass.
   */
  updateZoomDisplay(skipConnectionRender = false) {
    const zoom = this.#zoomLevel || 1;
    const { nodeLayer, connectionLayer, workspaceElement } = this.#workspace;

    const tx = (this.#backgroundOffset.x + this.#pendingLayerOffset.x) * zoom;
    const ty = (this.#backgroundOffset.y + this.#pendingLayerOffset.y) * zoom;

    if (nodeLayer) {
      nodeLayer.style.transformOrigin = "0 0";
      nodeLayer.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
    }

    if (connectionLayer) {
      connectionLayer.style.transformOrigin = "0 0";
      connectionLayer.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
    }

    workspaceElement.style.setProperty("--workspace-zoom", `${zoom}`);
    this.#applyBackgroundOffset();
    if (!skipConnectionRender) {
      this.#renderConnections();
    }
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
   * Queues a smooth animated zoom step centred on a screen-space point.
   * Subsequent calls before the animation settles accumulate the target zoom.
   *
   * @param {{ x: number, y: number }} screenPoint Focus point in workspace-relative screen coordinates.
   * @param {number} direction Positive to zoom in, negative to zoom out.
   * @param {{ clientX?: number, clientY?: number }} [pointer] Pointer coordinates relative to the viewport.
   */
  pushSmoothZoom(screenPoint, direction, pointer = {}) {
    if (!direction) {
      return;
    }

    const step = direction * this.#zoomConfig.step;
    this.#targetZoomLevel = Math.max(
      this.#zoomConfig.min,
      Math.min(this.#zoomConfig.max, this.#targetZoomLevel + step)
    );
    this.#smoothZoomFocus = { screenPoint, pointer };

    if (this.#smoothZoomRafId === null) {
      this.#smoothZoomRafId = requestAnimationFrame(() => this.#tickSmoothZoom());
    }
  }

  /**
   * Advances one frame of the smooth zoom animation, easing toward the target.
   */
  #tickSmoothZoom() {
    this.#smoothZoomRafId = null;

    if (!this.#smoothZoomFocus) {
      return;
    }

    const target = this.#targetZoomLevel;
    const current = this.#zoomLevel;
    const diff = target - current;
    const settled = Math.abs(diff) < 0.001;
    const newZoom = settled
      ? target
      : Math.max(this.#zoomConfig.min, Math.min(this.#zoomConfig.max, current + diff * 0.25));

    const { screenPoint, pointer } = this.#smoothZoomFocus;
    const previousZoom = current;

    // screenPointToWorld still uses the old zoom at this point, which is correct.
    const worldPoint = this.screenPointToWorld(screenPoint);
    this.#zoomLevel = newZoom;

    const scale = previousZoom / newZoom;
    const shift = {
      x: worldPoint.x * (scale - 1),
      y: worldPoint.y * (scale - 1),
    };

    // Accumulate into a pending layer offset — O(1), no per-node work each frame.
    this.#pendingLayerOffset.x += shift.x;
    this.#pendingLayerOffset.y += shift.y;

    // Rebase active interactions if needed.
    if (Math.abs(shift.x) > 0.0001 || Math.abs(shift.y) > 0.0001) {
      const { dragManager } = this.#workspace;
      if (dragManager?.rebaseActiveDragPointer) {
        dragManager.rebaseActiveDragPointer(pointer);
      }
      this.#rebasePanGestureAfterZoom(pointer);
    }

    // Apply zoom + pending pivot as a single CSS transform on the node layer — O(1).
    // Combined with background offset for pan.
    const { nodeLayer, connectionLayer, workspaceElement } = this.#workspace;
    const ox = (this.#backgroundOffset.x + this.#pendingLayerOffset.x) * newZoom;
    const oy = (this.#backgroundOffset.y + this.#pendingLayerOffset.y) * newZoom;
    if (nodeLayer) {
      nodeLayer.style.transformOrigin = "0 0";
      nodeLayer.style.transform = `translate(${ox}px, ${oy}px) scale(${newZoom})`;
    }
    if (connectionLayer) {
      connectionLayer.style.transformOrigin = "0 0";
      connectionLayer.style.transform = `translate(${ox}px, ${oy}px) scale(${newZoom})`;
    }
    workspaceElement.style.setProperty("--workspace-zoom", `${newZoom}`);
    this.#applyBackgroundOffset();
    this.#renderConnections();

    if (settled) {
      this.#smoothZoomFocus = null;
      // Commit accumulated pivot to node positions in one pass, then restore clean transforms.
      const finalOffset = this.#pendingLayerOffset;
      this.#pendingLayerOffset = { x: 0, y: 0 };
      if (Math.abs(finalOffset.x) > 0.0001 || Math.abs(finalOffset.y) > 0.0001) {
        this.translateWorkspace(finalOffset);
      }
      // Restore clean scale-only transform now that node positions are committed.
      this.updateZoomDisplay(false);
      this.#markViewDirty("view", 0);
      this.#schedulePersist();
    } else {
      this.#smoothZoomRafId = requestAnimationFrame(() => this.#tickSmoothZoom());
    }
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
    const changed = this.setZoomLevel(nextZoom, { skipConnectionRender: true });
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
    }

    this.#renderConnections();
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
   * Returns the total effective viewport offset, including any pending zoom pivot.
   *
   * @returns {{ x: number, y: number }}
   */
  getEffectiveOffset() {
    return {
      x: this.#backgroundOffset.x + this.#pendingLayerOffset.x,
      y: this.#backgroundOffset.y + this.#pendingLayerOffset.y,
    };
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

    const { dragManager } = this.#workspace;

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

    const { dragManager, contextMenuManager } = this.#workspace;

    dragManager?.removeNodeGhost();
    dragManager?.removePaletteGhost();

    const state = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      hasMoved: false,
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
      this.updateZoomDisplay();
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
    const scaledX = (this.#backgroundOffset.x + this.#pendingLayerOffset.x) * zoom;
    const scaledY = (this.#backgroundOffset.y + this.#pendingLayerOffset.y) * zoom;
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
