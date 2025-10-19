/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 * @typedef {import('../../nodes/nodeTypes.js').NodeDefinition} NodeDefinition
 * @typedef {import('../../nodes/nodeTypes.js').NodeDefinition & {
 *   shortcut?: (
 *     { type: 'variable', action: 'get'|'set', variableId: string } |
 *     { type: 'custom_event_call', eventNodeId: string }
 *   )
 * }} PaletteNodeDefinition
 */

const DEFAULT_PLACEHOLDER = "Search nodes";

/**
 * Handles DOM management and interactions for the workspace context menu.
 */
export class WorkspaceContextMenuManager {
  #workspace;
  /** @type {HTMLDivElement | null} */
  #container;
  /** @type {HTMLInputElement | null} */
  #searchInput;
  /** @type {HTMLDivElement | null} */
  #list;
  /** @type {boolean} */
  #isVisible;
  /** @type {{ x: number, y: number }} */
  #spawnPosition;
  /** @type {Array<PaletteNodeDefinition>} */
  #results;
  /** @type {Array<PaletteNodeDefinition> | null} */
  #customResults;
  /** @type {string} */
  #preSearchNormalized;
  /** @type {'default'|'connection'|'variable'} */
  #mode;
  /** @type {number} */
  #selectedIndex;
  /** @type {string | null} */
  #selectedDefinitionId;
  /** @type {Array<HTMLButtonElement>} */
  #itemElements;
  /** @type {string} */
  #lastNormalizedQuery;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   */
  constructor(workspace) {
    this.#workspace = workspace;
    this.#container = null;
    this.#searchInput = null;
    this.#list = null;
    this.#isVisible = false;
    this.#spawnPosition = { x: 0, y: 0 };
    this.#results = [];
    this.#customResults = null;
    this.#preSearchNormalized = "";
    this.#mode = "default";
    this.#selectedIndex = -1;
    this.#selectedDefinitionId = null;
    this.#itemElements = [];
    this.#lastNormalizedQuery = "";
  }

  /**
   * Builds the context menu DOM if it does not already exist.
   */
  initialize() {
    if (this.#container) {
      return;
    }

    const container = document.createElement("div");
    container.className = "workspace-context-menu";
    container.setAttribute("role", "dialog");
    container.setAttribute("aria-label", "Add node");

    const search = document.createElement("input");
    search.type = "search";
    search.className = "context-menu-search";
    search.placeholder = DEFAULT_PLACEHOLDER;
    search.setAttribute("aria-label", "Search nodes");
    container.appendChild(search);

    const list = document.createElement("div");
    list.className = "context-menu-list";
    list.setAttribute("role", "listbox");
    container.appendChild(list);

    this.#workspace.workspaceElement.appendChild(container);

    search.addEventListener("input", () => {
      this.#renderResults(search.value);
    });

    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        this.hide();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.#moveSelection(1);
        this.#focusSelection();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        this.#moveSelection(-1);
        this.#focusSelection();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        this.#selectSelection();
      }
    });

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
    this.#searchInput = search;
    this.#list = list;
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
   * Displays the context menu at the given viewport coordinates.
   *
   * @param {number} clientX Viewport X coordinate.
   * @param {number} clientY Viewport Y coordinate.
   * @param {{ definitions?: Array<PaletteNodeDefinition>, placeholder?: string, query?: string, mode?: 'default'|'connection'|'variable' }} [options]
   */
  show(clientX, clientY, options = {}) {
    this.initialize();

    if (!this.#container || !this.#searchInput) {
      return;
    }

    const workspaceRect =
      this.#workspace.workspaceElement.getBoundingClientRect();
    const relativeX = Math.max(0, clientX - workspaceRect.left);
    const relativeY = Math.max(0, clientY - workspaceRect.top);

    this.#spawnPosition = { x: relativeX, y: relativeY };
    this.#customResults = options.definitions ?? null;
    this.#preSearchNormalized = (options.query ?? "").trim().toLowerCase();
    this.#mode = options.mode ?? "default";
    this.#selectedIndex = -1;
    this.#selectedDefinitionId = null;

    if (this.#mode !== "connection") {
      this.#workspace.pendingConnectionSpawn = null;
    }
    if (this.#mode !== "variable") {
      this.#workspace.pendingVariableSpawn = null;
    }

    const placeholder = options.placeholder ?? DEFAULT_PLACEHOLDER;
    if (this.#searchInput.placeholder !== placeholder) {
      this.#searchInput.placeholder = placeholder;
    }

    this.#searchInput.value = options.query ?? "";
    this.#renderResults(this.#searchInput.value);

    this.#container.classList.add("is-visible");
    this.#container.style.left = `${relativeX}px`;
    this.#container.style.top = `${relativeY}px`;
    this.#isVisible = true;

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

    requestAnimationFrame(() => {
      this.#searchInput?.focus();
      this.#searchInput?.select();
    });
  }

  /**
   * Conceals the context menu and clears its state.
   */
  hide() {
    if (!this.#container || !this.#isVisible) {
      return;
    }

    this.#container.classList.remove("is-visible");
    this.#isVisible = false;
    this.#customResults = null;
    this.#mode = "default";
    this.#preSearchNormalized = "";
    this.#selectedIndex = -1;
    this.#selectedDefinitionId = null;
    this.#itemElements = [];
    this.#results = [];
    this.#spawnPosition = { x: 0, y: 0 };
    if (this.#searchInput) {
      this.#searchInput.placeholder = DEFAULT_PLACEHOLDER;
      this.#searchInput.value = "";
    }
    this.#workspace.pendingConnectionSpawn = null;
  }

  /**
   * Renders context menu results using the supplied query.
   *
   * @param {string} query Search query.
   */
  #renderResults(query) {
    if (!this.#list) {
      return;
    }

    let effectiveQuery = query ?? "";
    const normalizedQuery = effectiveQuery.trim().toLowerCase();
    const queryChanged = normalizedQuery !== this.#lastNormalizedQuery;
    if (
      this.#customResults &&
      this.#preSearchNormalized &&
      normalizedQuery === this.#preSearchNormalized
    ) {
      effectiveQuery = "";
      this.#preSearchNormalized = "";
    }

    const results = this.#computeDefinitions(effectiveQuery);
    this.#results = results;
    this.#list.innerHTML = "";
  this.#list.scrollTop = 0;
    this.#itemElements = [];
    if (queryChanged) {
      this.#selectedDefinitionId = null;
    }
    this.#lastNormalizedQuery = normalizedQuery;

    if (!results.length) {
      this.#selectedIndex = -1;
      this.#selectedDefinitionId = null;
      const empty = document.createElement("p");
      empty.className = "context-menu-empty";
      empty.textContent = "No matching nodes";
      this.#list.appendChild(empty);
      return;
    }

    const section = document.createElement("div");
    section.className = "context-menu-section";

    const body = document.createElement("div");
    body.className = "context-menu-section-body";
    section.appendChild(body);

    results.forEach((definition) => {
      const index = this.#itemElements.length;
      const item = this.#createDefinitionButton(definition, () => {
        this.#updateSelection(index, { scrollIntoView: false });
        this.#selectSelection();
      });

      item.addEventListener("pointerenter", () => {
        this.#updateSelection(index, { scrollIntoView: false });
      });
      item.addEventListener("pointerdown", () => {
        this.#updateSelection(index, { scrollIntoView: false });
      });
      item.addEventListener("focus", () => {
        this.#updateSelection(index, { scrollIntoView: false });
      });
      item.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          this.#moveSelection(1);
          this.#focusSelection();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          this.#moveSelection(-1);
          this.#focusSelection();
        }
      });

      body.appendChild(item);
      this.#itemElements.push(item);
    });

    this.#list.appendChild(section);

    if (this.#selectedDefinitionId) {
      const index = results.findIndex(
        (definition) => definition.id === this.#selectedDefinitionId
      );
      if (index >= 0) {
        this.#updateSelection(index, { scrollIntoView: false });
        return;
      }
    }

    this.#updateSelection(results.length ? 0 : -1, { scrollIntoView: false });
  }

  /**
   * Computes palette definitions for the provided query, including shortcuts.
   *
   * @param {string} query Search query.
   * @returns {Array<PaletteNodeDefinition>}
   */
  #computeDefinitions(query) {
    const hasQuery = query.trim().length > 0;
    if (this.#customResults) {
      if (!hasQuery) {
        return this.#customResults.slice();
      }
      return this.#customResults.filter((definition) =>
        this.#workspace.registry.matchesDefinition(definition, query)
      );
    }

    const registryMatches = this.#workspace.registry.search(query);
    const filteredBase = registryMatches.filter(
      (definition) => definition.id !== "get_var" && definition.id !== "set_var"
    );
    const customEventShortcuts = this.#buildCustomEventShortcuts(query);
    const variableShortcuts = this.#buildVariableShortcuts(query);

    return filteredBase.concat(customEventShortcuts, variableShortcuts);
  }

  /**
   * Moves the highlighted selection by the provided offset.
   *
   * @param {number} offset Offset delta.
   */
  #moveSelection(offset) {
    const total = this.#results.length;
    if (!total || !Number.isFinite(offset) || offset === 0) {
      return;
    }

    let index = this.#selectedIndex;
    if (index < 0) {
      index = offset > 0 ? 0 : total - 1;
    } else {
      index = (index + offset + total) % total;
    }

    this.#updateSelection(index);
  }

  /**
   * Applies visual selection state for the supplied menu index.
   *
   * @param {number} index Target index.
   * @param {{ scrollIntoView?: boolean }} [options]
   */
  #updateSelection(index, options = {}) {
    const { scrollIntoView = true } = options;
    const previousIndex = this.#selectedIndex;
    const items = this.#itemElements;

    if (previousIndex >= 0 && items[previousIndex]) {
      items[previousIndex].classList.remove("is-selected");
      items[previousIndex].setAttribute("aria-selected", "false");
    }

    if (
      typeof index !== "number" ||
      index < 0 ||
      index >= this.#results.length
    ) {
      this.#selectedIndex = -1;
      this.#selectedDefinitionId = null;
      return;
    }

    this.#selectedIndex = index;
    this.#selectedDefinitionId = this.#results[index]?.id ?? null;
    const element = items[index];
    if (element) {
      element.classList.add("is-selected");
      element.setAttribute("aria-selected", "true");
      if (scrollIntoView) {
        element.scrollIntoView({ block: "nearest" });
      }
    }
  }

  /**
   * Attempts to focus the currently highlighted menu element.
   */
  #focusSelection() {
    const element = this.#itemElements[this.#selectedIndex];
    if (!element || typeof element.focus !== "function") {
      return;
    }
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  }

  /**
   * Spawns a node for the currently highlighted context menu result.
   */
  #selectSelection() {
    if (
      this.#selectedIndex < 0 ||
      this.#selectedIndex >= this.#results.length
    ) {
      return;
    }

    const definition = this.#results[this.#selectedIndex];
    const spawn = { ...this.#spawnPosition };
    const node = this.#workspace.spawnNodeFromContextMenu(definition, spawn);
    if (node) {
      this.hide();
    }
  }

  /**
   * Builds buttons for context menu rows with an attached selection handler.
   *
   * @param {PaletteNodeDefinition} definition Palette definition entry.
   * @param {() => void} onSelect Selection callback.
   * @returns {HTMLButtonElement}
   */
  #createDefinitionButton(definition, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "context-menu-item";
    button.dataset.definitionId = definition.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");

    const title = document.createElement("span");
    title.className = "context-menu-item-name";
    title.textContent = definition.title;
    button.appendChild(title);

    button.addEventListener("click", () => {
      onSelect();
    });

    return button;
  }

  /**
   * Generates variable shortcut entries matching the provided query.
   *
   * @param {string} query Search query.
   * @returns {Array<PaletteNodeDefinition>}
   */
  #buildVariableShortcuts(query) {
    const normalizedQuery = (query ?? "").trim().toLowerCase();
    const includeAll = normalizedQuery.length === 0;
    const entries = [];

    this.#workspace.variableOrder.forEach((variableId) => {
      const variable = this.#workspace.variables.get(variableId);
      if (!variable) {
        return;
      }

      const displayName = (variable.name ?? "").trim() || variable.id;
      const normalizedName = displayName.toLowerCase();
      const tokens = [
        normalizedName,
        variableId.toLowerCase(),
        `get ${normalizedName}`,
        `set ${normalizedName}`,
      ];

      if (
        !includeAll &&
        !tokens.some((token) => token.includes(normalizedQuery))
      ) {
        return;
      }

      entries.push({
        id: `variable_get_${variableId}`,
        title: `Get ${displayName}`,
        category: "Variables",
        description: `Get ${displayName}`,
        shortcut: { type: "variable", action: "get", variableId },
      });

      entries.push({
        id: `variable_set_${variableId}`,
        title: `Set ${displayName}`,
        category: "Variables",
        description: `Set ${displayName}`,
        shortcut: { type: "variable", action: "set", variableId },
      });
    });

    return entries;
  }

  /**
   * Generates custom event shortcut entries matching the provided query.
   *
   * @param {string} query Search query.
   * @returns {Array<PaletteNodeDefinition>}
   */
  #buildCustomEventShortcuts(query) {
    const normalizedQuery = (query ?? "").trim().toLowerCase();
    const includeAll = normalizedQuery.length === 0;

    const events = [...this.#workspace.graph.nodes.values()]
      .filter((node) => node.type === "custom_event")
      .sort((a, b) =>
        this.#resolveCustomEventLabel(a).localeCompare(
          this.#resolveCustomEventLabel(b)
        )
      );

    const entries = [];
    events.forEach((eventNode) => {
      const label = this.#resolveCustomEventLabel(eventNode);
      const normalizedName = label.toLowerCase();
      const tokens = [
        normalizedName,
        eventNode.id.toLowerCase(),
        `call ${normalizedName}`,
      ];

      if (
        !includeAll &&
        !tokens.some((token) => token.includes(normalizedQuery))
      ) {
        return;
      }

      entries.push({
        id: `custom_event_call_${eventNode.id}`,
        title: `Call ${label}`,
        category: "Custom Events",
        description: `Call ${label}`,
        shortcut: { type: "custom_event_call", eventNodeId: eventNode.id },
      });
    });

    return entries;
  }

  /**
   * Resolves a display label for the provided custom event node.
   *
   * @param {import('../../core/BlueprintNode.js').BlueprintNode} node Custom event node.
   * @returns {string}
   */
  #resolveCustomEventLabel(node) {
    const raw =
      typeof node.properties.name === "string"
        ? node.properties.name.trim()
        : "";
    return raw || "CustomEvent";
  }
}
