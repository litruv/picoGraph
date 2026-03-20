/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 */

/**
 * Handles node-specific context menu interactions (right-click on nodes).
 */
export class WorkspaceNodeContextMenu {
  #workspace;
  /** @type {HTMLDivElement | null} */
  #container;
  /** @type {boolean} */
  #isVisible;
  /** @type {string | null} */
  #targetNodeId;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   */
  constructor(workspace) {
    this.#workspace = workspace;
    this.#container = null;
    this.#isVisible = false;
    this.#targetNodeId = null;
  }

  /**
   * Builds the node context menu DOM if it does not already exist.
   */
  initialize() {
    if (this.#container) {
      return;
    }

    const container = document.createElement("div");
    container.className = "node-context-menu";
    container.setAttribute("role", "menu");
    container.setAttribute("aria-label", "Node actions");

    const deleteItem = this.#createMenuItem("Delete", () => {
      this.#handleDelete();
    });
    deleteItem.dataset.action = "delete";
    container.appendChild(deleteItem);

    const copyItem = this.#createMenuItem("Copy", () => {
      this.#handleCopy();
    });
    copyItem.dataset.action = "copy";
    container.appendChild(copyItem);

    const refreshItem = this.#createMenuItem("Refresh", () => {
      this.#handleRefresh();
    });
    refreshItem.dataset.action = "refresh";
    container.appendChild(refreshItem);

    this.#workspace.workspaceElement.appendChild(container);

    document.addEventListener("pointerdown", (event) => {
      if (!this.#isVisible) {
        return;
      }
      if (!(event.target instanceof Node)) {
        this.hide();
        return;
      }
      if (!container.contains(event.target)) {
        this.hide();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!this.#isVisible) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        this.hide();
      }
    });

    this.#container = container;
  }

  /**
   * Creates a menu item button with the specified label and click handler.
   *
   * @param {string} label Menu item label.
   * @param {() => void} onClick Click handler.
   * @returns {HTMLButtonElement}
   */
  #createMenuItem(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node-context-menu-item";
    button.setAttribute("role", "menuitem");
    button.textContent = label;
    button.addEventListener("click", () => {
      onClick();
      this.hide();
    });
    return button;
  }

  /**
   * Determines whether the context menu is currently displayed.
   *
   * @returns {boolean}
   */
  isVisible() {
    return this.#isVisible;
  }

  /**
   * Checks whether the provided target node resides inside the context menu.
   *
   * @param {Node | null} target Target node.
   * @returns {boolean}
   */
  isTargetInside(target) {
    return Boolean(
      this.#container && target && this.#container.contains(target)
    );
  }

  /**
   * Displays the node context menu at the given viewport coordinates.
   *
   * @param {number} clientX Viewport X coordinate.
   * @param {number} clientY Viewport Y coordinate.
   * @param {string} nodeId Target node identifier.
   */
  show(clientX, clientY, nodeId) {
    this.initialize();

    if (!this.#container) {
      return;
    }

    const workspaceRect =
      this.#workspace.workspaceElement.getBoundingClientRect();
    const relativeX = Math.max(0, clientX - workspaceRect.left);
    const relativeY = Math.max(0, clientY - workspaceRect.top);

    this.#targetNodeId = nodeId;

    this.#container.classList.add("is-visible");
    this.#container.style.left = `${relativeX}px`;
    this.#container.style.top = `${relativeY}px`;
    this.#isVisible = true;

    requestAnimationFrame(() => {
      if (!this.#container) {
        return;
      }

      const menuRect = this.#container.getBoundingClientRect();
      let adjustedLeft = relativeX;
      let adjustedTop = relativeY;

      if (menuRect.right > workspaceRect.right) {
        adjustedLeft -= menuRect.right - workspaceRect.right;
      }
      if (menuRect.bottom > workspaceRect.bottom) {
        adjustedTop -= menuRect.bottom - workspaceRect.bottom;
      }

      adjustedLeft = Math.max(0, adjustedLeft);
      adjustedTop = Math.max(0, adjustedTop);

      this.#container.style.left = `${adjustedLeft}px`;
      this.#container.style.top = `${adjustedTop}px`;
    });
  }

  /**
   * Conceals the node context menu and clears its state.
   */
  hide() {
    if (!this.#container || !this.#isVisible) {
      return;
    }

    this.#container.classList.remove("is-visible");
    this.#isVisible = false;
    this.#targetNodeId = null;
  }

  /**
   * Handles the delete action for the target node.
   */
  #handleDelete() {
    if (!this.#targetNodeId) {
      return;
    }

    this.#workspace.removeNode(this.#targetNodeId);
  }

  /**
   * Handles the copy action for the target node.
   */
  #handleCopy() {
    if (!this.#targetNodeId) {
      return;
    }

    const wasSelected = this.#workspace.selectedNodeIds.has(this.#targetNodeId);
    if (!wasSelected) {
      this.#workspace.selectNode(this.#targetNodeId);
    }

    this.#workspace.clipboardManager.copySelection();
  }

  /**
   * Handles the refresh action for the target node.
   */
  #handleRefresh() {
    if (!this.#targetNodeId) {
      return;
    }

    this.#workspace.refreshNode(this.#targetNodeId);
  }
}
