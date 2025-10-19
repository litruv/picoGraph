import { WorkspaceGeometry } from "./WorkspaceGeometry.js";

/**
 * Handles drag interactions, ghost previews, and drag-induced transforms.
 */
export class WorkspaceDragManager {
  /**
   * @param {import('../BlueprintWorkspace.js').BlueprintWorkspace} workspace Owning workspace instance.
   */
  constructor(workspace) {
    this.workspace = workspace;
  }

  /**
   * Ensures a ghost preview element exists for palette drags.
   *
   * @param {string | null} definitionId Dragged node definition identifier.
   */
  ensurePaletteGhost(definitionId) {
    const { workspace } = this;
    const existing = workspace.paletteDragGhost;
    if (existing && existing.element.isConnected) {
      if (existing.definitionId === definitionId) {
        return;
      }
      this.removePaletteGhost();
    }

    const element = document.createElement("div");
    element.className = "workspace-drop-ghost";
    element.setAttribute("role", "presentation");

    const label = document.createElement("span");
    label.className = "workspace-drop-ghost__label";
    const definition = definitionId
      ? workspace.registry.get(definitionId)
      : null;
    label.textContent = definition?.title ?? "Node Preview";
    element.appendChild(label);

    workspace.nodeLayer.appendChild(element);
    workspace.paletteDragGhost = {
      element,
      width: element.offsetWidth,
      height: element.offsetHeight,
      definitionId: definitionId ?? null,
    };
  }

  /**
   * Updates the palette ghost transform to match the supplied position.
   *
   * @param {{ x: number, y: number }} position Snapped workspace position.
   */
  updatePaletteGhost(position) {
    const { paletteDragGhost } = this.workspace;
    if (!paletteDragGhost) {
      return;
    }
    paletteDragGhost.element.style.transform =
      WorkspaceGeometry.positionToTransform(position);
  }

  /**
   * Removes the active palette drag ghost.
   */
  removePaletteGhost() {
    const { workspace } = this;
    if (
      workspace.paletteDragGhost?.element &&
      workspace.paletteDragGhost.element.isConnected
    ) {
      workspace.paletteDragGhost.element.remove();
    }
    workspace.paletteDragGhost = null;
  }

  /**
   * Ensures a ghost preview exists for node drag operations.
   *
   * @param {string} nodeId Active node identifier.
   */
  ensureNodeGhost(nodeId) {
    const { workspace } = this;
    const nodeElement = workspace.nodeElements.get(nodeId);
    if (!nodeElement) {
      return;
    }

    const existing = workspace.nodeDragGhost;
    if (
      existing &&
      existing.nodeId === nodeId &&
      existing.element.isConnected
    ) {
      return;
    }

    this.removeNodeGhost();

    const ghost = document.createElement("div");
    ghost.className = "workspace-node-ghost";
    const zoom = this.workspace.zoomLevel || 1;
    const rect = nodeElement.getBoundingClientRect();
    const unscaledWidth = rect.width || nodeElement.offsetWidth;
    const unscaledHeight = rect.height || nodeElement.offsetHeight;
    const width = Math.max(1, unscaledWidth / zoom);
    const height = Math.max(1, unscaledHeight / zoom);
    ghost.style.width = `${width}px`;
    ghost.style.height = `${height}px`;
    ghost.setAttribute("role", "presentation");

    if (nodeElement.parentElement) {
      nodeElement.parentElement.insertBefore(ghost, nodeElement);
    } else {
      workspace.nodeLayer.appendChild(ghost);
    }

    workspace.nodeDragGhost = {
      element: ghost,
      width,
      height,
      nodeId,
    };
  }

  /**
   * Updates the node drag ghost to the provided position.
   *
   * @param {{ x: number, y: number }} position Snapped workspace position.
   */
  updateNodeGhost(position) {
    const ghost = this.workspace.nodeDragGhost;
    if (!ghost) {
      return;
    }
    ghost.element.style.transform =
      WorkspaceGeometry.positionToTransform(position);
  }

  /**
   * Removes the node drag ghost preview if active.
   */
  removeNodeGhost() {
    const { workspace } = this;
    if (
      workspace.nodeDragGhost?.element &&
      workspace.nodeDragGhost.element.isConnected
    ) {
      workspace.nodeDragGhost.element.remove();
    }
    workspace.nodeDragGhost = null;
  }

  /**
   * Adjusts active drag offsets when the workspace shifts.
   *
   * @param {{ x: number, y: number }} delta Workspace-space translation applied externally.
   */
  applyActiveDragShift(delta) {
    if (!delta || (!delta.x && !delta.y)) {
      return;
    }

    const context = this.workspace.activeNodeDragContext;
    if (!context) {
      return;
    }

    if (context.lastPointerWorld) {
      context.lastPointerWorld = {
        x: context.lastPointerWorld.x + delta.x,
        y: context.lastPointerWorld.y + delta.y,
      };
    }

    if (!context.multiDrag) {
      const ghost = this.workspace.nodeDragGhost;
      const pointer = context.lastPointerWorld;
      if (ghost?.nodeId && pointer) {
        const anchor = context.anchors.get(ghost.nodeId);
        if (anchor) {
          this.updateNodeGhost({
            x: pointer.x - anchor.ratioX * anchor.width,
            y: pointer.y - anchor.ratioY * anchor.height,
          });
        }
      }
    }
  }

  /**
   * Updates the cached pointer state used during drag operations.
   *
   * @param {{ clientX?: number, clientY?: number } | null | undefined} pointer Pointer-like payload.
   */
  rebaseActiveDragPointer(pointer) {
    if (!pointer) {
      return;
    }

    const context = this.workspace.activeNodeDragContext;
    if (!context) {
      return;
    }

    const hasClientX = Number.isFinite(pointer.clientX);
    const hasClientY = Number.isFinite(pointer.clientY);
    if (!hasClientX && !hasClientY) {
      return;
    }

    const pointerWorld = this.#clientToWorkspace(
      hasClientX ? pointer.clientX : context.previousClientX,
      hasClientY ? pointer.clientY : context.previousClientY
    );
    context.lastPointerWorld = pointerWorld;
    if (hasClientX) {
      context.previousClientX = pointer.clientX;
    }
    if (hasClientY) {
      context.previousClientY = pointer.clientY;
    }

    if (!context.multiDrag) {
      const ghost = this.workspace.nodeDragGhost;
      if (ghost?.nodeId) {
        const anchor = context.anchors.get(ghost.nodeId);
        if (anchor) {
          this.updateNodeGhost({
            x: pointerWorld.x - anchor.ratioX * anchor.width,
            y: pointerWorld.y - anchor.ratioY * anchor.height,
          });
        }
      }
    }
  }

  /**
   * Applies a snapped position to a node with a subtle easing transition.
   *
   * @param {string} nodeId Node identifier.
   * @param {{ x: number, y: number }} position Target snapped position.
   */
  applyNodeSnapPosition(nodeId, position) {
    const { workspace } = this;
    const element = workspace.nodeElements.get(nodeId);
    if (element) {
      element.style.transition =
        "transform 140ms cubic-bezier(0.22, 0.61, 0.36, 1)";
      const handleTransitionEnd = () => {
        element.style.transition = "";
        workspace.flushConnectionRefresh();
        if (workspace.nodeDragGhost?.nodeId === nodeId) {
          this.removeNodeGhost();
        }
      };
      element.addEventListener("transitionend", handleTransitionEnd, {
        once: true,
      });
      window.setTimeout(() => {
        element.removeEventListener("transitionend", handleTransitionEnd);
        element.style.transition = "";
        workspace.flushConnectionRefresh();
        if (workspace.nodeDragGhost?.nodeId === nodeId) {
          this.removeNodeGhost();
        }
      }, 200);
    }

    this.updateNodeDomPosition(nodeId, position);
    workspace.graph.setNodePosition(nodeId, position);
    workspace.scheduleConnectionRefresh();
  }

  /**
   * Updates the DOM transform for a node element.
   *
   * @param {string} nodeId Node identifier.
   * @param {{x:number,y:number}} position Coordinates.
   */
  updateNodeDomPosition(nodeId, position) {
    const { workspace } = this;
    const element = workspace.nodeElements.get(nodeId);
    if (!element) {
      return;
    }
    const rotation = workspace.nodeDragRotation.get(nodeId) ?? 0;
    element.style.transform = WorkspaceGeometry.positionToTransform(
      position,
      rotation
    );
  }

  /**
   * Initiates a node drag operation.
   *
   * @param {PointerEvent} event Pointer event.
   * @param {string} nodeId Dragged node identifier.
   */
  startNodeDrag(event, nodeId) {
    const { workspace } = this;
    const node = workspace.graph.nodes.get(nodeId);
    if (!node) {
      return;
    }

    const isMouse = event.pointerType === "mouse" || event.pointerType === "";
    if (isMouse && event.button !== 0) {
      return;
    }
    if (
      !isMouse &&
      event.pointerType !== "touch" &&
      event.pointerType !== "pen"
    ) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    const selectedIds = workspace.selectedNodeIds.has(nodeId)
      ? [...workspace.selectedNodeIds]
      : [nodeId];

    const pointerWorld = this.#eventToWorkspacePoint(event);
    const anchors = new Map();
    selectedIds.forEach((id) => {
      const target = workspace.graph.nodes.get(id);
      if (!target) {
        return;
      }
      const element = workspace.nodeElements.get(id) ?? null;
      const { width, height } = this.#measureNodeSize(element);
      const ratioX = width > 0 ? (pointerWorld.x - target.position.x) / width : 0;
      const ratioY = height > 0 ? (pointerWorld.y - target.position.y) / height : 0;
      anchors.set(id, {
        ratioX,
        ratioY,
        width,
        height,
      });
    });

    if (!anchors.has(nodeId)) {
      const element = workspace.nodeElements.get(nodeId) ?? null;
      const { width, height } = this.#measureNodeSize(element);
      const ratioX = width > 0 ? (pointerWorld.x - node.position.x) / width : 0;
      const ratioY = height > 0 ? (pointerWorld.y - node.position.y) / height : 0;
      anchors.set(nodeId, {
        ratioX,
        ratioY,
        width,
        height,
      });
    }

    const multiDrag = anchors.size > 1;
    workspace.draggingNode = {
      nodeId,
      pointerId: event.pointerId,
      selection: new Set(anchors.keys()),
    };
    workspace.isDraggingNodes = true;
    workspace.activeNodeDragContext = {
      anchors,
      multiDrag,
      lastPointerWorld: pointerWorld,
      previousClientX: event.clientX,
      previousClientY: event.clientY,
    };

    if (multiDrag) {
      this.removeNodeGhost();
    } else {
      this.ensureNodeGhost(nodeId);
      const anchor = anchors.get(nodeId);
      if (anchor) {
        const initialPosition = {
          x: pointerWorld.x - anchor.ratioX * anchor.width,
          y: pointerWorld.y - anchor.ratioY * anchor.height,
        };
        this.updateNodeGhost(WorkspaceGeometry.snapPositionToGrid(workspace, initialPosition));
      }
    }

    const draggedElement = workspace.nodeElements.get(nodeId);
    if (draggedElement) {
      draggedElement.style.transition = "";
    }

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) {
        return;
      }
      const context = workspace.activeNodeDragContext;
      if (!context) {
        return;
      }
      const pointer = this.#eventToWorkspacePoint(moveEvent);
      context.lastPointerWorld = pointer;

      const pendingPositions = new Map();
      context.anchors.forEach((anchor, id) => {
        const width = anchor.width || 1;
        const height = anchor.height || 1;
        const updated = {
          x: pointer.x - anchor.ratioX * width,
          y: pointer.y - anchor.ratioY * height,
        };
        this.updateNodeDomPosition(id, updated);
        pendingPositions.set(id, updated);
        if (!context.multiDrag && id === nodeId) {
          this.updateNodeGhost(WorkspaceGeometry.snapPositionToGrid(workspace, updated));
        }
      });

      pendingPositions.forEach((position, id) => {
        workspace.graph.setNodePosition(id, position);
      });

      const screenDeltaX = Number.isFinite(moveEvent.movementX)
        ? moveEvent.movementX
        : moveEvent.clientX - context.previousClientX;
      const velocityX = Number.isFinite(moveEvent.movementX)
        ? moveEvent.movementX
        : screenDeltaX;
      pendingPositions.forEach((_, id) => {
        this.nudgeNodeDragRotation(id, velocityX);
      });

      context.previousClientX = moveEvent.clientX;
      context.previousClientY = moveEvent.clientY;
    };

    const finalizeSelection = (pointer) => {
      const context = workspace.activeNodeDragContext;
      if (!context) {
        return;
      }
      const targetPointer = pointer ?? context.lastPointerWorld;
      if (!targetPointer) {
        return;
      }

      context.anchors.forEach((anchor, id) => {
        const width = anchor.width || 1;
        const height = anchor.height || 1;
        const raw = {
          x: targetPointer.x - anchor.ratioX * width,
          y: targetPointer.y - anchor.ratioY * height,
        };
        const snapped = WorkspaceGeometry.snapPositionToGrid(workspace, raw);
        this.applyNodeSnapPosition(id, snapped);
        this.setNodeDragRotation(id, 0);
        if (!context.multiDrag && id === nodeId) {
          this.updateNodeGhost(snapped);
        }
      });

      if (context.multiDrag) {
        this.removeNodeGhost();
      } else {
        window.setTimeout(() => {
          this.removeNodeGhost();
        }, 160);
      }

      workspace.isDraggingNodes = false;
      workspace.activeNodeDragContext = null;
      workspace.flushConnectionRefresh();
    };

    const handlePointerFinish = (finishEvent) => {
      if (finishEvent.pointerId !== event.pointerId) {
        return;
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerFinish);
      window.removeEventListener("pointercancel", handlePointerFinish);

      const context = workspace.activeNodeDragContext;
      let pointer = null;
      if (context) {
        const hasClient = Number.isFinite(finishEvent.clientX);
        const hasClientY = Number.isFinite(finishEvent.clientY);
        if (hasClient || hasClientY) {
          pointer = this.#eventToWorkspacePoint(finishEvent);
        }
      }

      finalizeSelection(pointer);

      workspace.draggingNode = null;
      workspace.activeNodeDragContext = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerFinish);
    window.addEventListener("pointercancel", handlePointerFinish);
  }

  /**
   * Applies a momentum impulse into the current drag rotation state.
   *
   * @param {string} nodeId Node identifier.
   * @param {number} horizontalVelocity Horizontal pointer velocity.
   */
  nudgeNodeDragRotation(nodeId, horizontalVelocity) {
    if (!Number.isFinite(horizontalVelocity)) {
      return;
    }

    const { workspace } = this;
    const existing = workspace.nodeDragRotation.get(nodeId) ?? 0;
    const impulse = horizontalVelocity * 0.9;
    const blended = existing * 0.75 + impulse;
    const clamped = Math.max(-12, Math.min(12, blended));
    this.setNodeDragRotation(nodeId, clamped);
  }

  /**
   * Converts pointer event coordinates into workspace-space values without clamping.
   *
   * @param {PointerEvent} event Pointer event reference.
   * @returns {{ x: number, y: number }}
   */
  #eventToWorkspacePoint(event) {
    return this.#clientToWorkspace(event.clientX, event.clientY);
  }

  /**
   * Measures a node element and returns its workspace-space dimensions.
   *
   * @param {HTMLElement | null} element Node DOM element.
   * @returns {{ width: number, height: number }}
   */
  #measureNodeSize(element) {
    const zoom = this.workspace.zoomLevel || 1;
    if (!element) {
      return { width: 1, height: 1 };
    }

    const rect = element.getBoundingClientRect();
    const rawWidth = rect.width / zoom;
    const rawHeight = rect.height / zoom;
    const fallbackWidth = element.offsetWidth || rawWidth;
    const fallbackHeight = element.offsetHeight || rawHeight;

    return {
      width: Math.max(1, Number.isFinite(rawWidth) ? rawWidth : fallbackWidth || 1),
      height: Math.max(1, Number.isFinite(rawHeight) ? rawHeight : fallbackHeight || 1),
    };
  }

  /**
   * Converts client coordinates to workspace-space units.
   *
   * @param {number | undefined} clientX Viewport X coordinate.
   * @param {number | undefined} clientY Viewport Y coordinate.
   * @returns {{ x: number, y: number }}
   */
  #clientToWorkspace(clientX, clientY) {
    const rect = this.workspace.workspaceElement.getBoundingClientRect();
    const zoom = this.workspace.zoomLevel || 1;
    const safeX = Number.isFinite(clientX) ? clientX : rect.left;
    const safeY = Number.isFinite(clientY) ? clientY : rect.top;
    return {
      x: (safeX - rect.left) / zoom,
      y: (safeY - rect.top) / zoom,
    };
  }

  /**
   * Applies a temporary rotation used during drag interactions.
   *
   * @param {string} nodeId Node identifier.
   * @param {number} angle Rotation in degrees.
   */
  setNodeDragRotation(nodeId, angle) {
    const { workspace } = this;
    const sanitized = Number.isFinite(angle) ? angle : 0;
    const clamped = Math.max(-12, Math.min(12, sanitized));
    if (Math.abs(clamped) < 0.01) {
      workspace.nodeDragRotation.delete(nodeId);
    } else {
      workspace.nodeDragRotation.set(nodeId, clamped);
    }

    const node = workspace.graph.nodes.get(nodeId);
    if (node) {
      this.updateNodeDomPosition(nodeId, node.position);
    }

    if (workspace.nodeDragRotation.size > 0) {
      this.ensureNodeRotationDecay();
    } else {
      this.stopNodeRotationDecay();
    }
  }

  /**
   * Ensures the drag rotation damping loop is active.
   */
  ensureNodeRotationDecay() {
    const { workspace } = this;
    if (workspace.nodeDragRotationDecayFrame !== null) {
      return;
    }

    const step = () => {
      let hasActive = false;
      workspace.nodeDragRotation.forEach((angle, id) => {
        const node = workspace.graph.nodes.get(id);
        if (!node) {
          workspace.nodeDragRotation.delete(id);
          return;
        }

        const damped = angle * 0.85;
        if (Math.abs(damped) < 0.05) {
          workspace.nodeDragRotation.delete(id);
        } else {
          workspace.nodeDragRotation.set(id, damped);
          hasActive = true;
        }

        this.updateNodeDomPosition(id, node.position);
      });

      if (hasActive) {
        workspace.nodeDragRotationDecayFrame =
          window.requestAnimationFrame(step);
      } else {
        workspace.nodeDragRotationDecayFrame = null;
      }
    };

    workspace.nodeDragRotationDecayFrame = window.requestAnimationFrame(step);
  }

  /**
   * Stops the drag rotation damping loop if one is queued.
   */
  stopNodeRotationDecay() {
    const { workspace } = this;
    if (workspace.nodeDragRotationDecayFrame !== null) {
      window.cancelAnimationFrame(workspace.nodeDragRotationDecayFrame);
      workspace.nodeDragRotationDecayFrame = null;
    }
  }
}
