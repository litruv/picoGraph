/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 * @typedef {import('../../core/BlueprintNode.js').BlueprintNode} BlueprintNode
 * @typedef {import('../../core/BlueprintNode.js').PinDescriptor} PinDescriptor
 * @typedef {import('./WorkspaceInlineEditorManager.js').WorkspaceInlineEditorManager} WorkspaceInlineEditorManager
 */

import { WorkspaceGeometry } from "./WorkspaceGeometry.js";

/**
 * @typedef {"input"|"output"} PinDirection
 */

/**
 * Coordinates node DOM rendering, pin creation, and connection class updates.
 */
export class WorkspaceNodeRenderer {
  #workspace;
  #inlineEditors;
  #callbacks;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   * @param {{
   *   inlineEditorManager: WorkspaceInlineEditorManager,
   *   applySelectionState: () => void,
   *   selectNode: (nodeId: string) => void,
   *   startNodeDrag: (event: PointerEvent, nodeId: string) => void,
   *   refreshVariableNode: (nodeId: string) => boolean,
  *   refreshLocalVariableNode: (nodeId: string) => boolean,
   *   refreshCustomEventNode: (nodeId: string) => boolean,
   *   refreshCustomEventCallNode: (nodeId: string) => boolean,
   *   renderConnections: () => void,
   *   shouldHighlightPin: (nodeId: string, pinId: string, direction: PinDirection) => boolean,
   *   beginConnection: (event: PointerEvent, nodeId: string, pinId: string, direction: PinDirection) => void,
   *   finalizeConnection: (nodeId: string, pinId: string, direction: PinDirection) => void,
   *   getPinElement: (nodeId: string, pinId: string, direction: PinDirection) => HTMLElement | null,
   * }} options Manager dependencies.
   */
  constructor(workspace, options) {
    this.#workspace = workspace;
    this.#inlineEditors = options.inlineEditorManager;
    this.#callbacks = {
      applySelectionState: options.applySelectionState,
      selectNode: options.selectNode,
      startNodeDrag: options.startNodeDrag,
      refreshVariableNode: options.refreshVariableNode,
      refreshLocalVariableNode: options.refreshLocalVariableNode,
      refreshCustomEventNode: options.refreshCustomEventNode,
      refreshCustomEventCallNode: options.refreshCustomEventCallNode,
      renderConnections: options.renderConnections,
      shouldHighlightPin: options.shouldHighlightPin,
      beginConnection: options.beginConnection,
      finalizeConnection: options.finalizeConnection,
      getPinElement: options.getPinElement,
    };
  }

  /**
   * Renders a node article, wires pin events, and updates inline editors.
   *
   * @param {BlueprintNode} node Target node.
   */
  renderNode(node) {
    const fragment = this.#workspace.nodeTemplate.content.cloneNode(true);
    const article = /** @type {HTMLElement} */ (
      fragment.querySelector(".blueprint-node")
    );
    const title = /** @type {HTMLElement} */ (
      article.querySelector(".node-title")
    );
    const inputContainer = /** @type {HTMLElement} */ (
      article.querySelector(".node-inputs")
    );
    const outputContainer = /** @type {HTMLElement} */ (
      article.querySelector(".node-outputs")
    );

    title.textContent = node.title;
    article.dataset.nodeId = node.id;
    article.dataset.nodeType = node.type;
    article.style.transform = WorkspaceGeometry.positionToTransform(
      node.position
    );

    this.#inlineEditors.setupLiteralEditor(node, article, inputContainer);

    inputContainer.innerHTML = "";
    node.inputs.forEach((pin) => {
      const pinElement = this.#createPinElement(node, pin);
      pinElement.dataset.direction = "input";
      inputContainer.appendChild(pinElement);
      this.#inlineEditors.setupPinEditor(node, pin, pinElement);
    });

    outputContainer.innerHTML = "";
    node.outputs.forEach((pin) => {
      const pinElement = this.#createPinElement(node, pin);
      pinElement.dataset.direction = "output";
      outputContainer.appendChild(pinElement);
      this.#inlineEditors.setupPinEditor(node, pin, pinElement);
    });

    article.addEventListener("pointerdown", (event) => {
      const target = /** @type {EventTarget | null} */ (event.target);
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest(".pin-handle")) {
        return;
      }

      const selectedIds = this.#workspace.selectedNodeIds;
      if (selectedIds.has(node.id)) {
        if (this.#workspace.selectedNodeId !== node.id) {
          this.#workspace.selectedNodeId = node.id;
          this.#callbacks.applySelectionState();
        }
      } else {
        this.#callbacks.selectNode(node.id);
      }

      const isMouse =
        event.pointerType === "mouse" || event.pointerType === "";
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

      if (target.closest(".pin")) {
        return;
      }

      if (this.#isInteractiveElement(target)) {
        return;
      }

      this.#callbacks.startNodeDrag(event, node.id);
    });

    article.addEventListener("pointerenter", () => {
      article.classList.add("is-hovered");
    });

    article.addEventListener("pointerleave", () => {
      article.classList.remove("is-hovered");
    });

    this.#workspace.nodeLayer.appendChild(article);
    this.#workspace.nodeElements.set(node.id, article);
    this.#inlineEditors.syncNode(node.id);

    let connectionsMutated = false;
    connectionsMutated =
      this.#callbacks.refreshVariableNode(node.id) || connectionsMutated;
    if (this.#callbacks.refreshLocalVariableNode) {
      connectionsMutated =
        this.#callbacks.refreshLocalVariableNode(node.id) ||
        connectionsMutated;
    }
    if (node.type === "custom_event") {
      connectionsMutated =
        this.#callbacks.refreshCustomEventNode(node.id) || connectionsMutated;
    } else if (node.type === "call_custom_event") {
      connectionsMutated =
        this.#callbacks.refreshCustomEventCallNode(node.id) ||
        connectionsMutated;
    }
    if (connectionsMutated) {
      this.#callbacks.renderConnections();
    }

    this.updatePinConnectionsForNode(node.id);
  }

  /**
   * Rebuilds DOM pin containers for a node when its descriptors change.
   *
   * @param {BlueprintNode} node Target node.
   * @param {{ inputs?: boolean, outputs?: boolean }} [options] Pin refresh options.
   */
  rebuildNodePins(node, options = {}) {
    const { inputs = true, outputs = true } = options;
    const article = this.#workspace.nodeElements.get(node.id);
    if (!article) {
      return;
    }

    if (inputs) {
      const inputContainer = article.querySelector(".node-inputs");
      if (inputContainer instanceof HTMLElement) {
        inputContainer.innerHTML = "";
        node.inputs.forEach((pin) => {
          const pinElement = this.#createPinElement(node, pin);
          pinElement.dataset.direction = "input";
          inputContainer.appendChild(pinElement);
          this.#inlineEditors.setupPinEditor(node, pin, pinElement);
        });
      }
      this.#inlineEditors.prunePinEditors(node);
    }

    if (outputs) {
      const outputContainer = article.querySelector(".node-outputs");
      if (outputContainer instanceof HTMLElement) {
        outputContainer.innerHTML = "";
        node.outputs.forEach((pin) => {
          const pinElement = this.#createPinElement(node, pin);
          pinElement.dataset.direction = "output";
          outputContainer.appendChild(pinElement);
          this.#inlineEditors.setupPinEditor(node, pin, pinElement);
        });
      }
    }

    this.updatePinConnectionsForNode(node.id);
  }

  /**
   * Applies connection state classes to every pin associated with a node.
   *
   * @param {string} nodeId Node identifier.
   */
  updatePinConnectionsForNode(nodeId) {
    const node = this.#workspace.graph.nodes.get(nodeId);
    if (!node) {
      return;
    }

    node.inputs.forEach((pin) => {
      this.#applyPinConnectionState(nodeId, pin.id, "input");
    });
    node.outputs.forEach((pin) => {
      this.#applyPinConnectionState(nodeId, pin.id, "output");
    });
  }

  /**
   * Refreshes connection state classes for every pin in the workspace.
   */
  refreshAllPinConnections() {
    this.#workspace.graph.nodes.forEach((node) => {
      this.updatePinConnectionsForNode(node.id);
    });
  }

  /**
   * Creates and wires a pin element for the provided descriptor.
   *
   * @param {BlueprintNode} node Parent node reference.
   * @param {PinDescriptor} pin Pin descriptor.
   * @returns {HTMLElement}
   */
  #createPinElement(node, pin) {
    const fragment = this.#workspace.pinTemplate.content.cloneNode(true);
    const container = /** @type {HTMLElement} */ (fragment.firstElementChild);
    const label = /** @type {HTMLElement} */ (
      container.querySelector(".pin-label")
    );
    const handle = /** @type {HTMLElement} */ (
      container.querySelector(".pin-handle")
    );

    container.dataset.pinId = pin.id;
    container.dataset.nodeId = node.id;
    container.dataset.type = pin.kind;
    const isStandardExec =
      pin.kind === "exec" && (pin.id === "exec_in" || pin.id === "exec_out");
    if (isStandardExec) {
      label.textContent = "";
      label.classList.add("is-hidden");
    } else {
      label.textContent = pin.name;
    }

    const shouldIgnoreForConnection = (target) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      return Boolean(target.closest(".pin-inline-control"));
    };

    const handlePointerDown = (event) => {
      if (event.button !== 0) {
        return;
      }
      if (shouldIgnoreForConnection(event.target)) {
        return;
      }

      if (event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        this.#workspace.graph.removeConnectionsForPin({
          nodeId: node.id,
          pinId: pin.id,
        });
        return;
      }

      event.stopPropagation();
      event.preventDefault();
      this.#callbacks.beginConnection(event, node.id, pin.id, pin.direction);
    };

    const finalizeConnection = (event) => {
      if (shouldIgnoreForConnection(event.target)) {
        return;
      }
      if (!this.#workspace.pendingConnection) {
        return;
      }
      event.stopPropagation();
      this.#callbacks.finalizeConnection(node.id, pin.id, pin.direction);
    };

    handle.addEventListener("pointerdown", handlePointerDown);
    handle.addEventListener("pointerup", finalizeConnection);

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointerup", finalizeConnection);

    container.addEventListener("pointerenter", () => {
      container.classList.add("is-hovered");
      if (
        this.#callbacks.shouldHighlightPin(node.id, pin.id, pin.direction)
      ) {
        container.classList.add("is-drop-hover");
      }
    });

    container.addEventListener("pointerleave", () => {
      container.classList.remove("is-hovered");
      container.classList.remove("is-drop-hover");
    });

    const handleContextMenu = (event) => {
      if (shouldIgnoreForConnection(event.target)) {
        return;
      }
      event.preventDefault();
      this.#workspace.graph.removeConnectionsForPin({
        nodeId: node.id,
        pinId: pin.id,
      });
    };

    handle.addEventListener("contextmenu", handleContextMenu);
    container.addEventListener("contextmenu", handleContextMenu);

    this.#applyPinConnectionState(node.id, pin.id, pin.direction);
    return container;
  }

  /**
   * Applies connection state classes to the targeted pin element.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @param {PinDirection} direction Pin direction.
   */
  #applyPinConnectionState(nodeId, pinId, direction) {
    const element = this.#callbacks.getPinElement(nodeId, pinId, direction);
    if (!element) {
      return;
    }

    const connected = this.#hasConnection(nodeId, pinId);
    element.classList.toggle("is-disconnected", !connected);
    element.classList.toggle("is-connected", connected);
  }

  /**
   * Determines whether a pin currently participates in any connection.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @returns {boolean}
   */
  #hasConnection(nodeId, pinId) {
    return this.#workspace.graph
      .getConnectionsForNode(nodeId, pinId)
      .some((connection) => {
        const isTarget =
          connection.to.nodeId === nodeId && connection.to.pinId === pinId;
        const isSource =
          connection.from.nodeId === nodeId &&
          connection.from.pinId === pinId;
        return isTarget || isSource;
      });
  }

  /**
   * Determines whether a node event target should block drag initiation.
   *
   * @param {HTMLElement} element Candidate event target.
   * @returns {boolean}
   */
  #isInteractiveElement(element) {
    if (element.closest(".pin-inline-control")) {
      return true;
    }
    if (element.closest(".literal-inline-editor")) {
      return true;
    }
    if (element.closest('[contenteditable="true"]')) {
      return true;
    }
    if (element.closest("input, textarea, select, button")) {
      return true;
    }
    return false;
  }
}
