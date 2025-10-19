/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 */

/**
 * Coordinates marquee-based selection gestures within the workspace.
 */
export class WorkspaceMarqueeManager {
  /** @type {BlueprintWorkspace} */
  #workspace;
  /** @type {HTMLDivElement | null} */
  #element;
  /** @type {{ pointerId: number, origin: { x: number, y: number }, current: { x: number, y: number }, hasDragged: boolean, moveHandler: (event: PointerEvent) => void, upHandler: (event: PointerEvent) => void } | null} */
  #state;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   */
  constructor(workspace) {
    this.#workspace = workspace;
    this.#element = null;
    this.#state = null;
  }

  /**
   * Ensures the marquee overlay element exists within the workspace DOM.
   */
  ensureElement() {
    if (this.#element) {
      return;
    }

    const marquee = document.createElement("div");
    marquee.className = "workspace-marquee";
    marquee.style.display = "none";
    marquee.setAttribute("role", "presentation");
    this.#workspace.workspaceElement.appendChild(marquee);
    this.#element = marquee;
  }

  /**
   * Indicates whether the provided element is the marquee overlay.
   *
   * @param {Element | null} target Potential marquee element.
   * @returns {boolean}
   */
  isMarqueeElement(target) {
    return Boolean(target && this.#element && target === this.#element);
  }

  /**
   * Initiates a marquee selection gesture at the supplied pointer event.
   *
   * @param {PointerEvent} event Pointer event initiating the marquee.
   */
  beginSelection(event) {
    this.ensureElement();
    if (!this.#element) {
      return;
    }

    const bounds = this.#workspace.workspaceElement.getBoundingClientRect();
    const origin = {
      x: Math.max(0, event.clientX - bounds.left),
      y: Math.max(0, event.clientY - bounds.top),
    };

    this.#element.style.display = "block";
    this.#element.style.left = `${origin.x}px`;
    this.#element.style.top = `${origin.y}px`;
    this.#element.style.width = "0px";
    this.#element.style.height = "0px";

    const handlePointerMove = (moveEvent) => {
      if (!this.#state || moveEvent.pointerId !== this.#state.pointerId) {
        return;
      }
      this.#updateSelection(moveEvent);
    };

    const handlePointerUp = (upEvent) => {
      if (!this.#state || upEvent.pointerId !== this.#state.pointerId) {
        return;
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      this.#finalizeSelection();
    };

    this.#state = {
      pointerId: event.pointerId,
      origin,
      current: { ...origin },
      hasDragged: false,
      moveHandler: handlePointerMove,
      upHandler: handlePointerUp,
    };

  window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    event.preventDefault();
  }

  /**
   * Clears any ongoing marquee gesture and hides the overlay.
   */
  clear() {
    if (this.#state) {
      window.removeEventListener("pointermove", this.#state.moveHandler);
      window.removeEventListener("pointerup", this.#state.upHandler);
      window.removeEventListener("pointercancel", this.#state.upHandler);
      this.#state = null;
    }

    if (this.#element) {
      this.#element.style.display = "none";
      this.#element.style.width = "0px";
      this.#element.style.height = "0px";
    }
  }

  /**
   * Updates the marquee overlay to reflect the latest pointer location.
   *
   * @param {PointerEvent} event Active pointer event.
   */
  #updateSelection(event) {
    if (!this.#state || !this.#element) {
      return;
    }

    const bounds = this.#workspace.workspaceElement.getBoundingClientRect();
    const clampedX = Math.min(
      Math.max(0, event.clientX - bounds.left),
      bounds.width
    );
    const clampedY = Math.min(
      Math.max(0, event.clientY - bounds.top),
      bounds.height
    );

    this.#state.current = { x: clampedX, y: clampedY };

    const { origin, current } = this.#state;
    const left = Math.min(origin.x, current.x);
    const top = Math.min(origin.y, current.y);
    const width = Math.abs(current.x - origin.x);
    const height = Math.abs(current.y - origin.y);

    if (!this.#state.hasDragged && (width > 2 || height > 2)) {
      this.#state.hasDragged = true;
    }

    this.#element.style.left = `${left}px`;
    this.#element.style.top = `${top}px`;
    this.#element.style.width = `${width}px`;
    this.#element.style.height = `${height}px`;
  }

  /**
   * Finishes the marquee gesture and updates the workspace selection.
   */
  #finalizeSelection() {
    if (!this.#state || !this.#element) {
      return;
    }

    const { origin, current, hasDragged } = this.#state;
    this.clear();

    if (!hasDragged) {
      return;
    }

    const bounds = this.#workspace.workspaceElement.getBoundingClientRect();
    const selectionBounds = {
      left: Math.min(origin.x, current.x) + bounds.left,
      top: Math.min(origin.y, current.y) + bounds.top,
      right: Math.max(origin.x, current.x) + bounds.left,
      bottom: Math.max(origin.y, current.y) + bounds.top,
    };

    this.#selectNodesWithinRect(selectionBounds);
  }

  /**
   * Selects nodes that intersect the provided screen-space bounds.
   *
   * @param {{ left: number, top: number, right: number, bottom: number }} bounds Selection bounds.
   */
  #selectNodesWithinRect(bounds) {
    /** @type {Array<string>} */
    const selected = [];
    this.#workspace.nodeElements.forEach((element, nodeId) => {
      const rect = element.getBoundingClientRect();
      if (this.#rectanglesOverlap(bounds, rect)) {
        selected.push(nodeId);
      }
    });

    if (selected.length) {
      const primary = selected[selected.length - 1];
      this.#workspace.setSelectionState(selected, primary);
    } else {
      this.#workspace.clearSelection();
    }
  }

  /**
   * Determines whether two rectangles overlap (inclusive of borders).
   *
   * @param {{ left: number, top: number, right: number, bottom: number }} a First rectangle.
   * @param {{ left: number, top: number, right: number, bottom: number }} b Second rectangle.
   * @returns {boolean}
   */
  #rectanglesOverlap(a, b) {
    return !(
      b.left > a.right ||
      b.right < a.left ||
      b.top > a.bottom ||
      b.bottom < a.top
    );
  }
}
