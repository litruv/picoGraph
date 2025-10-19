import { VARIABLE_SORT_MIME } from "../BlueprintWorkspaceConstants.js";

/**
 * Renders the global variable summary list.
 *
 * @param {object} options Rendering options.
 * @param {HTMLUListElement | null} options.element Target list element.
 * @param {Array<string>} options.variableOrder Display order of variable identifiers.
 * @param {Map<string, import('../BlueprintWorkspace.js').WorkspaceVariable>} options.variables Registered variables.
 * @param {import('../../core/NodeGraph.js').NodeGraph} options.graph Active node graph.
 * @param {() => void} options.cancelVariableRename Callback to cancel an in-progress rename.
 * @param {() => void} options.closeVariableTypeDropdown Callback to close the variable type dropdown.
 * @param {(message: string) => void} options.renderEmpty Renders an empty-state message.
 * @param {(name: string) => string} options.normalizeVariableName Normalizes variable names for comparisons.
 * @param {(type: import('../BlueprintWorkspace.js').VariableType) => string} options.formatVariableType Creates a human-readable type label.
 * @param {(variableId: string) => void} options.selectVariable Activates a variable selection.
 * @param {(event: DragEvent, variableId: string) => void} options.handleVariableDragStart Prepares workspace drag metadata for a variable.
 * @param {() => void} options.handleVariableDragEnd Clears workspace drag feedback for variables.
 * @param {(variableId: string, targetIndex: number) => void} options.reorderVariable Reorders a variable in the list.
 * @param {(variableId: string, button: HTMLButtonElement, anchor: HTMLElement) => void} options.openVariableTypeDropdown Opens the variable type dropdown.
 * @param {(variableId: string) => void} options.deleteVariable Removes the selected variable.
 * @param {(variableId: string, label: HTMLElement) => void} options.startVariableRename Begins inline rename mode.
 * @param {() => void} options.highlightVariableSelection Refreshes selection highlight state.
 * @param {(variableId: string) => boolean} options.isVariableDropdownOpen Determines whether the dropdown is already open for a variable.
 */
export function renderVariableList({
  element,
  variableOrder,
  variables,
  graph,
  cancelVariableRename,
  closeVariableTypeDropdown,
  renderEmpty,
  normalizeVariableName,
  formatVariableType,
  selectVariable,
  handleVariableDragStart,
  handleVariableDragEnd,
  reorderVariable,
  openVariableTypeDropdown,
  deleteVariable,
  startVariableRename,
  highlightVariableSelection,
  isVariableDropdownOpen,
}) {
  if (!element) {
    return;
  }

  cancelVariableRename();
  closeVariableTypeDropdown();
  element.innerHTML = "";

  if (!variableOrder.length) {
    renderEmpty("No variables yet");
    return;
  }

  const SORT_MIME = VARIABLE_SORT_MIME;
  let draggedVariableId = null;

  /**
   * Determines whether a drag event carries the variable sort payload.
   *
   * @param {DragEvent} event Drag event payload.
   * @returns {boolean}
   */
  const hasSortPayload = (event) => {
    if (!event.dataTransfer) {
      return false;
    }
    const types = event.dataTransfer.types;
    if (!types) {
      return false;
    }
    return Array.from(types).includes(SORT_MIME);
  };

  const clearDropIndicators = () => {
    const rows = element.querySelectorAll(
      ".overview-item--variable.is-drop-before, .overview-item--variable.is-drop-after"
    );
    rows.forEach((node) => {
      node.classList.remove("is-drop-before", "is-drop-after");
    });
  };

  const clearDragState = () => {
    clearDropIndicators();
    const rows = element.querySelectorAll(
      ".overview-item--variable.is-dragging"
    );
    rows.forEach((node) => {
      node.classList.remove("is-dragging");
    });
    draggedVariableId = null;
  };

  const setDropIndicator = (row, position) => {
    clearDropIndicators();
    if (!row) {
      return;
    }
    if (position === "before") {
      row.classList.add("is-drop-before");
    } else if (position === "after") {
      row.classList.add("is-drop-after");
    }
  };

  element.addEventListener("dragover", (event) => {
    if (!draggedVariableId || !hasSortPayload(event)) {
      return;
    }
    const targetRow =
      event.target instanceof HTMLElement
        ? event.target.closest(".overview-item--variable")
        : null;
    if (targetRow) {
      return;
    }
    event.preventDefault();
    const lastRow = element.querySelector(
      ".overview-item--variable:last-of-type"
    );
    if (!lastRow) {
      return;
    }
    setDropIndicator(lastRow, "after");
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  });

  element.addEventListener("drop", (event) => {
    if (!draggedVariableId || !hasSortPayload(event)) {
      return;
    }
    const targetRow =
      event.target instanceof HTMLElement
        ? event.target.closest(".overview-item--variable")
        : null;
    if (targetRow) {
      return;
    }
    event.preventDefault();
    const sourceId =
      (event.dataTransfer && event.dataTransfer.getData(SORT_MIME)) ||
      draggedVariableId;
    const sourceIndex = variableOrder.indexOf(sourceId);
    if (sourceIndex === -1) {
      if (typeof handleVariableDragEnd === "function") {
        handleVariableDragEnd();
      }
      clearDragState();
      return;
    }
    let targetIndex = variableOrder.length;
    if (targetIndex > sourceIndex) {
      targetIndex -= 1;
    }
    if (targetIndex !== sourceIndex) {
      reorderVariable(sourceId, targetIndex);
    }
    if (typeof handleVariableDragEnd === "function") {
      handleVariableDragEnd();
    }
    clearDragState();
  });

  element.addEventListener("dragleave", (event) => {
    if (!draggedVariableId) {
      return;
    }
    const related = event.relatedTarget;
    if (related instanceof HTMLElement && element.contains(related)) {
      return;
    }
    clearDropIndicators();
  });

  /** @type {Map<string, { sets: number, gets: number }>} */
  const usageById = new Map();
  /** @type {Map<string, { sets: number, gets: number }>} */
  const usageByName = new Map();

  graph.nodes.forEach((node) => {
    if (node.type !== "set_var" && node.type !== "get_var") {
      return;
    }

    const nodeVariableId =
      typeof node.properties.variableId === "string" &&
      node.properties.variableId
        ? node.properties.variableId
        : "";
    const raw =
      typeof node.properties.name === "string" ? node.properties.name : "";
    const normalized = normalizeVariableName(raw) || "__blank__";
    const usageMap =
      nodeVariableId && variables.has(nodeVariableId) ? usageById : usageByName;
    const key =
      nodeVariableId && variables.has(nodeVariableId)
        ? nodeVariableId
        : normalized;
    const usage = usageMap.get(key) ?? { sets: 0, gets: 0 };
    if (node.type === "set_var") {
      usage.sets += 1;
    } else {
      usage.gets += 1;
    }
    usageMap.set(key, usage);
  });

  variableOrder.forEach((variableId) => {
    const variable = variables.get(variableId);
    if (!variable) {
      return;
    }

    const item = document.createElement("li");
    const row = document.createElement("div");
    row.className = "overview-item overview-item--variable";
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.dataset.variableId = variable.id;
    row.dataset.variableType = variable.type;
    row.draggable = true;
    row.setAttribute("aria-pressed", "false");

    const activate = () => {
      selectVariable(variable.id);
    };

    row.addEventListener("click", () => {
      activate();
    });

    row.addEventListener("dragstart", (event) => {
      activate();
      draggedVariableId = variable.id;
      row.classList.add("is-dragging");
      if (typeof handleVariableDragStart === "function") {
        handleVariableDragStart(event, variable.id);
      }
      if (event.dataTransfer) {
        event.dataTransfer.setData(SORT_MIME, variable.id);
        event.dataTransfer.effectAllowed = "copyMove";
      }
    });

    row.addEventListener("dragend", () => {
      if (typeof handleVariableDragEnd === "function") {
        handleVariableDragEnd();
      }
      clearDragState();
    });

    row.addEventListener("dragover", (event) => {
      if (!draggedVariableId || !hasSortPayload(event)) {
        return;
      }
      event.preventDefault();
      const rect = row.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = event.clientY <= midpoint ? "before" : "after";
      setDropIndicator(row, position);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });

    row.addEventListener("dragleave", (event) => {
      if (!draggedVariableId) {
        return;
      }
      const related = event.relatedTarget;
      if (related instanceof HTMLElement && row.contains(related)) {
        return;
      }
      clearDropIndicators();
    });

    row.addEventListener("drop", (event) => {
      if (!draggedVariableId || !hasSortPayload(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const sourceId =
        (event.dataTransfer && event.dataTransfer.getData(SORT_MIME)) ||
        draggedVariableId;
      const sourceIndex = variableOrder.indexOf(sourceId);
      const targetId = row.dataset.variableId || "";
      const targetIndexRaw = variableOrder.indexOf(targetId);
      if (sourceIndex === -1 || targetIndexRaw === -1) {
        if (typeof handleVariableDragEnd === "function") {
          handleVariableDragEnd();
        }
        clearDragState();
        return;
      }
      const rect = row.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const dropPosition = event.clientY <= midpoint ? "before" : "after";
      let targetIndex = targetIndexRaw;
      if (dropPosition === "after") {
        targetIndex += 1;
      }
      if (targetIndex > variableOrder.length) {
        targetIndex = variableOrder.length;
      }
      if (targetIndex > sourceIndex) {
        targetIndex -= 1;
      }
      if (targetIndex !== sourceIndex) {
        reorderVariable(sourceId, targetIndex);
      }
      if (typeof handleVariableDragEnd === "function") {
        handleVariableDragEnd();
      }
      clearDragState();
    });

    const layout = document.createElement("div");
    layout.className = "variable-overview-row";
    row.appendChild(layout);

    const typeButton = document.createElement("button");
    typeButton.type = "button";
    typeButton.className = "variable-type-button";
    typeButton.dataset.variableType = variable.type;
    typeButton.setAttribute("aria-haspopup", "menu");
    typeButton.setAttribute("aria-expanded", "false");
    typeButton.title = `Type: ${formatVariableType(variable.type)}`;
    typeButton.setAttribute(
      "aria-label",
      `Change type for ${
        variable.name || variable.id
      } (currently ${formatVariableType(variable.type)})`
    );
    typeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activate();
      const isOpen = isVariableDropdownOpen(variable.id);
      if (isOpen) {
        closeVariableTypeDropdown();
      } else {
        openVariableTypeDropdown(variable.id, typeButton, row);
      }
    });
    typeButton.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    typeButton.addEventListener("keydown", (event) => {
      const isToggleKey =
        event.key === "Enter" || event.key === " " || event.key === "Spacebar";
      if (isToggleKey || event.key === "ArrowDown") {
        event.preventDefault();
        activate();
        openVariableTypeDropdown(variable.id, typeButton, row);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeVariableTypeDropdown();
      }
    });
      layout.appendChild(typeButton);

    const label = document.createElement("span");
      label.className = "overview-item-label variable-name-display";
      label.tabIndex = 0;
    label.textContent = variable.name || "Unnamed";
    label.title = variable.name || "Unnamed";
    label.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activate();
      startVariableRename(variable.id, label);
    });
    label.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
        startVariableRename(variable.id, label);
      }
    });
      layout.appendChild(label);

    const meta = document.createElement("span");
    meta.className = "overview-item-meta";
    const fallbackKey = normalizeVariableName(variable.name) || "__blank__";
    const usage = usageById.get(variable.id) ?? usageByName.get(fallbackKey);
    const summary = [formatVariableType(variable.type)];
    if (usage) {
      if (usage.sets) {
        summary.push(`${usage.sets} set${usage.sets === 1 ? "" : "s"}`);
      }
      if (usage.gets) {
        summary.push(`${usage.gets} get${usage.gets === 1 ? "" : "s"}`);
      }
    }
    meta.textContent = summary.join(" • ");
    layout.appendChild(meta);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "overview-item-action overview-item-action--remove";
    const removeLabel = variable.name || variable.id;
    removeButton.setAttribute(
      "aria-label",
      `Delete variable ${removeLabel}`
    );
    removeButton.title = `Delete ${removeLabel}`;
    removeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteVariable(variable.id);
    });
    removeButton.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    layout.appendChild(removeButton);

    row.addEventListener("keydown", (event) => {
      const isSpace =
        event.key === " " || event.key === "Space" || event.key === "Spacebar";
      if (event.key === "Enter" || isSpace) {
        event.preventDefault();
        activate();
      } else if (event.key === "F2") {
        event.preventDefault();
        startVariableRename(variable.id, label);
      }
    });

    item.appendChild(row);
    element.appendChild(item);
  });

  highlightVariableSelection();
}
