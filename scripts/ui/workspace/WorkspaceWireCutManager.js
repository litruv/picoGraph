/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 */

/**
 * @typedef {{ x: number, y: number }} Point
 */

/**
 * @typedef {{
 *   pointerId: number,
 *   startClient: Point,
 *   currentClient: Point,
 *   cutLine: SVGLineElement,
 *   hasMoved: boolean,
 * }} CutState
 */

/**
 * Drives the middle-mouse wire-cut gesture.
 * Hold middle mouse and drag a line across wires to disconnect them.
 */
export class WorkspaceWireCutManager {
  /** @type {BlueprintWorkspace} */
  #workspace;
  /** @type {CutState | null} */
  #state;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   */
  constructor(workspace) {
    this.#workspace = workspace;
    this.#state = null;

    this.handleMove = this.handleMove.bind(this);
    this.handleUp = this.handleUp.bind(this);
  }

  /**
   * Starts a cut gesture from a middle-mouse pointerdown event.
   *
   * @param {PointerEvent} event Middle-mouse pointerdown event.
   */
  beginCut(event) {
    if (this.#state) {
      return;
    }

    event.preventDefault();

    const cutLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    cutLine.classList.add("wire-cut-line");

    const svgPos = this.#clientToSvg(event.clientX, event.clientY);
    cutLine.setAttribute("x1", String(svgPos.x));
    cutLine.setAttribute("y1", String(svgPos.y));
    cutLine.setAttribute("x2", String(svgPos.x));
    cutLine.setAttribute("y2", String(svgPos.y));
    this.#workspace.connectionLayer.appendChild(cutLine);

    this.#state = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      currentClient: { x: event.clientX, y: event.clientY },
      cutLine,
      hasMoved: false,
    };

    window.addEventListener("pointermove", this.handleMove);
    window.addEventListener("pointerup", this.handleUp);
    window.addEventListener("pointercancel", this.handleUp);
  }

  /**
   * Returns whether a cut gesture is currently active.
   *
   * @returns {boolean}
   */
  isCutting() {
    return this.#state !== null;
  }

  /**
   * Converts viewport client coordinates to SVG-layer space.
   *
   * @param {number} clientX
   * @param {number} clientY
   * @returns {Point}
   */
  #clientToSvg(clientX, clientY) {
    const zoom = this.#workspace.zoomLevel || 1;
    const offset = this.#workspace.navigationManager?.getEffectiveOffset() ?? 
                   this.#workspace.workspaceBackgroundOffset ?? { x: 0, y: 0 };
    const rect = this.#workspace.workspaceElement.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom - offset.x,
      y: (clientY - rect.top) / zoom - offset.y,
    };
  }

  /**
   * @param {PointerEvent} event
   */
  handleMove(event) {
    if (!this.#state || event.pointerId !== this.#state.pointerId) {
      return;
    }

    this.#state.currentClient = { x: event.clientX, y: event.clientY };

    const dx = event.clientX - this.#state.startClient.x;
    const dy = event.clientY - this.#state.startClient.y;
    if (!this.#state.hasMoved && Math.hypot(dx, dy) >= 4) {
      this.#state.hasMoved = true;
    }

    const start = this.#clientToSvg(this.#state.startClient.x, this.#state.startClient.y);
    const end = this.#clientToSvg(event.clientX, event.clientY);

    this.#state.cutLine.setAttribute("x1", String(start.x));
    this.#state.cutLine.setAttribute("y1", String(start.y));
    this.#state.cutLine.setAttribute("x2", String(end.x));
    this.#state.cutLine.setAttribute("y2", String(end.y));
  }

  /**
   * @param {PointerEvent} event
   */
  handleUp(event) {
    if (!this.#state || event.pointerId !== this.#state.pointerId) {
      return;
    }

    window.removeEventListener("pointermove", this.handleMove);
    window.removeEventListener("pointerup", this.handleUp);
    window.removeEventListener("pointercancel", this.handleUp);

    const state = this.#state;
    this.#state = null;
    state.cutLine.remove();

    if (!state.hasMoved) {
      return;
    }

    const p1 = this.#clientToSvg(state.startClient.x, state.startClient.y);
    const p2 = this.#clientToSvg(state.currentClient.x, state.currentClient.y);
    this.#cutIntersecting(p1, p2);
  }

  /**
   * Removes all connections whose bezier curves intersect the given line segment.
   *
   * @param {Point} p1 Start of cut segment in SVG space.
   * @param {Point} p2 End of cut segment in SVG space.
   */
  #cutIntersecting(p1, p2) {
    const { connectionElements, graph, historyManager } = this.#workspace;
    /** @type {string[]} */
    const toRemove = [];

    connectionElements.forEach((pathEl, connectionId) => {
      const d = pathEl.getAttribute("d");
      if (!d) {
        return;
      }
      if (this.#bezierIntersectsSegment(d, p1, p2)) {
        toRemove.push(connectionId);
      }
    });

    if (!toRemove.length) {
      return;
    }

    // Batch all removals into a single undo step.
    historyManager?.withSuspended(() => {
      toRemove.forEach((id) => graph.removeConnection(id));
    });
  }

  /**
   * Returns true if the cubic bezier described by a path `d` attribute crosses the segment p1→p2.
   *
   * @param {string} d SVG path `d` attribute value.
   * @param {Point} p1
   * @param {Point} p2
   * @returns {boolean}
   */
  #bezierIntersectsSegment(d, p1, p2) {
    const m = d.match(
      /M\s*([\d.\-e]+)\s+([\d.\-e]+)\s+C\s*([\d.\-e]+)\s+([\d.\-e]+)\s+([\d.\-e]+)\s+([\d.\-e]+)\s+([\d.\-e]+)\s+([\d.\-e]+)/i
    );
    if (!m) {
      return false;
    }

    const bp0 = { x: parseFloat(m[1]), y: parseFloat(m[2]) };
    const bc1 = { x: parseFloat(m[3]), y: parseFloat(m[4]) };
    const bc2 = { x: parseFloat(m[5]), y: parseFloat(m[6]) };
    const bp3 = { x: parseFloat(m[7]), y: parseFloat(m[8]) };

    const SAMPLES = 32;
    let prev = bp0;
    for (let i = 1; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const curr = this.#cubicBezierPoint(bp0, bc1, bc2, bp3, t);
      if (this.#segmentsIntersect(prev, curr, p1, p2)) {
        return true;
      }
      prev = curr;
    }
    return false;
  }

  /**
   * Evaluates a cubic bezier at parameter t.
   *
   * @param {Point} p0
   * @param {Point} c1
   * @param {Point} c2
   * @param {Point} p3
   * @param {number} t
   * @returns {Point}
   */
  #cubicBezierPoint(p0, c1, c2, p3, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p3.y,
    };
  }

  /**
   * Returns true if line segments a1→a2 and b1→b2 cross each other.
   *
   * @param {Point} a1
   * @param {Point} a2
   * @param {Point} b1
   * @param {Point} b2
   * @returns {boolean}
   */
  #segmentsIntersect(a1, a2, b1, b2) {
    const dx1 = a2.x - a1.x;
    const dy1 = a2.y - a1.y;
    const dx2 = b2.x - b1.x;
    const dy2 = b2.y - b1.y;
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-10) {
      return false;
    }
    const dx3 = b1.x - a1.x;
    const dy3 = b1.y - a1.y;
    const t = (dx3 * dy2 - dy3 * dx2) / denom;
    const u = (dx3 * dy1 - dy3 * dx1) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }
}
