/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 * @typedef {import('../../nodes/nodeTypes.js').NodeDefinition} NodeDefinition
 * @typedef {import('../BlueprintWorkspace.js').PaletteNodeDefinition} PaletteNodeDefinition
 */

import { PALETTE_DRAG_MIME } from "../BlueprintWorkspaceConstants.js";

/**
 * Coordinates palette rendering, search handling, and palette drag state.
 */
export class WorkspacePaletteManager {
  #workspace;
  /** @type {Set<string>} */
  #collapsedCategories;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   */
  constructor(workspace) {
    this.#workspace = workspace;
    this.#collapsedCategories = new Set();
  }

  /**
   * Wires palette UI listeners and renders initial content.
   */
  initialize() {
    const search = this.#workspace.paletteSearch;
    search.addEventListener("input", () => {
      this.render(search.value);
    });

    this.render();
  }

  /**
   * Recreates palette DOM structure using the provided search filter.
   *
   * @param {string} [query] Optional search query.
   */
  render(query) {
    const searchValue = query ?? "";
    const baseDefinitions = this.#workspace.registry.search(searchValue);
    const filteredBase = baseDefinitions.filter(
      (definition) => definition.id !== "get_var" && definition.id !== "set_var"
    );
    const variableShortcuts =
      this.#buildVariableShortcutDefinitions(searchValue);
    const definitions = filteredBase.concat(variableShortcuts);

    const list = this.#workspace.paletteList;
    list.innerHTML = "";

    if (!definitions.length) {
      const empty = document.createElement("p");
      empty.className = "palette-empty";
      empty.textContent = "No matching nodes";
      list.appendChild(empty);
      return;
    }

    const grouped = new Map();
    definitions.forEach((definition) => {
      if (!grouped.has(definition.category)) {
        grouped.set(definition.category, []);
      }
      grouped.get(definition.category).push(definition);
    });

    const isSearchActive = Boolean(searchValue && searchValue.trim().length);
    const categories = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

    categories.forEach((category) => {
      const entries = grouped
        .get(category)
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title));

      const section = document.createElement("section");
      section.className = "palette-section";
      section.dataset.category = category;

      const header = document.createElement("button");
      header.type = "button";
      header.className = "palette-section-header";
      header.textContent = category;
      const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const headerId = `palette_section_${slug}`;
      const bodyId = `${headerId}_body`;
      header.id = headerId;
      header.setAttribute("aria-controls", bodyId);
      const collapsed =
        !isSearchActive && this.#collapsedCategories.has(category);
      header.setAttribute("aria-expanded", String(!collapsed));
      header.addEventListener("click", () => {
        if (this.#collapsedCategories.has(category)) {
          this.#collapsedCategories.delete(category);
        } else {
          this.#collapsedCategories.add(category);
        }
        this.render(this.#workspace.paletteSearch.value);
        requestAnimationFrame(() => {
          const refreshedSection = [
            ...this.#workspace.paletteList.querySelectorAll(".palette-section"),
          ].find((element) => element.dataset.category === category);
          const refreshedHeader = refreshedSection?.querySelector(
            ".palette-section-header"
          );
          if (refreshedHeader instanceof HTMLButtonElement) {
            refreshedHeader.focus();
          }
        });
      });
      section.appendChild(header);

      const body = document.createElement("div");
      body.className = "palette-section-body";
      body.setAttribute("role", "group");
      body.id = bodyId;
      body.setAttribute("aria-labelledby", headerId);
      body.dataset.category = category;
      if (collapsed) {
        body.hidden = true;
        section.classList.add("is-collapsed");
      }

      entries.forEach((definition) => {
        const isVariableShortcut = Boolean(
          definition.shortcut?.type === "variable"
        );
        const item = this.#createDefinitionButton(definition, {
          className: "palette-item",
          showCategory: false,
          draggable: !isVariableShortcut,
          onSelect: () => {
            this.#workspace.createNodeFromDefinition(definition);
          },
          onDragStart: isVariableShortcut
            ? undefined
            : (event) => {
                this.#handlePaletteDragStart(event, definition.id);
              },
          onDragEnd: isVariableShortcut
            ? undefined
            : () => {
                this.#handlePaletteDragEnd();
              },
        });
        body.appendChild(item);
      });

      section.appendChild(body);
      list.appendChild(section);
    });
  }

  /**
   * Allows external callers to cancel palette drag state.
   */
  handleDragEnd() {
    this.#handlePaletteDragEnd();
  }

  /**
   * Builds a button node for palette entries with attached drag/click handlers.
   *
   * @param {PaletteNodeDefinition} definition Target definition.
   * @param {{ className?: string, showCategory?: boolean, draggable?: boolean, onSelect: () => void, onDragStart?: (event: DragEvent) => void, onDragEnd?: (event: DragEvent) => void }} options Button configuration.
   * @returns {HTMLButtonElement}
   */
  #createDefinitionButton(definition, options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = options?.className ?? "palette-item";
    button.dataset.definitionId = definition.id;

    const showCategory = options?.showCategory ?? true;

    if (showCategory) {
      const category = document.createElement("span");
      category.className = "palette-item-category";
      category.textContent = definition.category;
      button.appendChild(category);
    }

    const title = document.createElement("span");
    title.className = "palette-item-name";
    title.textContent = definition.title;
    button.appendChild(title);

    if (definition.description) {
      button.title = definition.description;
    }

    button.addEventListener("click", () => {
      options.onSelect();
    });

    if (options?.draggable) {
      button.draggable = true;
      button.addEventListener("dragstart", (event) => {
        options.onDragStart?.(event);
      });
      button.addEventListener("dragend", (event) => {
        options.onDragEnd?.(event);
      });
    }

    return button;
  }

  /**
   * Prepares drag metadata when beginning a palette drag interaction.
   *
   * @param {DragEvent} event Drag event payload.
   * @param {string} definitionId Node definition identifier being dragged.
   */
  #handlePaletteDragStart(event, definitionId) {
    if (!event.dataTransfer) {
      return;
    }

    event.dataTransfer.setData(PALETTE_DRAG_MIME, definitionId);
    event.dataTransfer.setData("text/plain", definitionId);
    event.dataTransfer.effectAllowed = "copy";
    this.#workspace.workspaceDragDepth = 0;
    this.#workspace.workspaceElement.classList.add("is-palette-dragging");
    this.#workspace.activePaletteDefinitionId = definitionId;
  }

  /**
   * Cleans up workspace styling once a palette drag interaction ends.
   */
  #handlePaletteDragEnd() {
    this.#workspace.workspaceDragDepth = 0;
    this.#workspace.workspaceElement.classList.remove("is-palette-dragging");
    this.#workspace.workspaceElement.classList.remove("is-drag-target");
    this.#workspace.activePaletteDefinitionId = null;
    this.#workspace.dragManager.removePaletteGhost();
  }

  /**
   * Builds shortcut node definitions for existing workspace variables.
   *
   * @param {string} [query] Optional search filter.
   * @returns {Array<PaletteNodeDefinition>}
   */
  #buildVariableShortcutDefinitions(query) {
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
}
