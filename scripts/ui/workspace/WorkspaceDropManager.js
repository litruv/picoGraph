/**
 * @typedef {import('../BlueprintWorkspace.js').BlueprintWorkspace} BlueprintWorkspace
 * @typedef {import('../../nodes/nodeTypes.js').NodeDefinition} NodeDefinition
 */

import { WorkspaceGeometry } from "./WorkspaceGeometry.js";
import {
  PALETTE_DRAG_MIME,
  VARIABLE_DRAG_MIME,
} from "../BlueprintWorkspaceConstants.js";

/**
 * Manages drag-and-drop interactions for palette and variable entries.
 */
export class WorkspaceDropManager {
  #workspace;

  /**
   * @param {BlueprintWorkspace} workspace Owning workspace instance.
   */
  constructor(workspace) {
    this.#workspace = workspace;
  }

  /**
   * Hooks workspace-level drag events.
   */
  initialize() {
    const element = this.#workspace.workspaceElement;
    element.addEventListener("dragenter", (event) => {
      this.#handleDragEnter(event);
    });
    element.addEventListener("dragover", (event) => {
      this.#handleDragOver(event);
    });
    element.addEventListener("dragleave", (event) => {
      this.#handleDragLeave(event);
    });
    element.addEventListener("drop", (event) => {
      this.#handleDrop(event);
    });
  }

  /**
   * Begins a variable drag gesture from the overview panel.
   *
   * @param {DragEvent} event Drag event payload.
   * @param {string} variableId Variable identifier being dragged.
   */
  handleVariableDragStart(event, variableId) {
    if (!event.dataTransfer) {
      return;
    }

    event.dataTransfer.setData(VARIABLE_DRAG_MIME, variableId);
    event.dataTransfer.setData("text/plain", variableId);
    event.dataTransfer.effectAllowed = "copy";

    this.#workspace.workspaceDragDepth = 0;
    const element = this.#workspace.workspaceElement;
    element.classList.add("is-variable-dragging");
    element.classList.remove("is-palette-dragging");
  }

  /**
   * Clears workspace drag styling for variable gestures.
   */
  handleVariableDragEnd() {
    this.#workspace.workspaceDragDepth = 0;
    const element = this.#workspace.workspaceElement;
    element.classList.remove("is-variable-dragging");
    element.classList.remove("is-drag-target");
    this.#workspace.dragManager.removePaletteGhost();
  }

  /**
   * Responds to dragenter events and prepares drop feedback.
   *
   * @param {DragEvent} event Drag enter event.
   */
  #handleDragEnter(event) {
    const isPalette = this.#isPaletteDrag(event);
    const isVariable = this.#isVariableDrag(event);
    if (!isPalette && !isVariable) {
      return;
    }

    event.preventDefault();
    this.#workspace.workspaceDragDepth += 1;
    const element = this.#workspace.workspaceElement;
    element.classList.add("is-drag-target");

    if (isPalette) {
      const definitionId = this.#resolvePaletteDefinitionId(event);
      this.#workspace.dragManager.ensurePaletteGhost(definitionId ?? null);
      const point = WorkspaceGeometry.snapPositionToGrid(
        this.#workspace,
        WorkspaceGeometry.eventToWorkspacePoint(this.#workspace, event)
      );
      this.#workspace.dragManager.updatePaletteGhost(point);
    } else {
      this.#workspace.dragManager.removePaletteGhost();
    }
  }

  /**
   * Keeps drop feedback active while objects move across the workspace.
   *
   * @param {DragEvent} event Drag over event.
   */
  #handleDragOver(event) {
    const isPalette = this.#isPaletteDrag(event);
    const isVariable = this.#isVariableDrag(event);
    if (!isPalette && !isVariable) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }

    if (isPalette) {
      const definitionId = this.#resolvePaletteDefinitionId(event);
      this.#workspace.dragManager.ensurePaletteGhost(definitionId ?? null);
      const point = WorkspaceGeometry.snapPositionToGrid(
        this.#workspace,
        WorkspaceGeometry.eventToWorkspacePoint(this.#workspace, event)
      );
      this.#workspace.dragManager.updatePaletteGhost(point);
    } else {
      this.#workspace.dragManager.removePaletteGhost();
    }
  }

  /**
   * Clears drop feedback once the drag leaves workspace bounds.
   *
   * @param {DragEvent} event Drag leave event.
   */
  #handleDragLeave(event) {
    const isPalette = this.#isPaletteDrag(event);
    const isVariable = this.#isVariableDrag(event);
    if (!isPalette && !isVariable) {
      return;
    }

    this.#workspace.workspaceDragDepth = Math.max(
      0,
      this.#workspace.workspaceDragDepth - 1
    );
    if (this.#workspace.workspaceDragDepth === 0) {
      const element = this.#workspace.workspaceElement;
      element.classList.remove("is-drag-target");
      this.#workspace.dragManager.removePaletteGhost();
    }
  }

  /**
   * Handles finalized drops for palette nodes and variables.
   *
   * @param {DragEvent} event Drop event containing pointer details.
   */
  #handleDrop(event) {
    const isPalette = this.#isPaletteDrag(event);
    const isVariable = this.#isVariableDrag(event);
    if (!isPalette && !isVariable) {
      return;
    }

    event.preventDefault();
    const transfer = event.dataTransfer;
    if (!transfer) {
      return;
    }

    if (isVariable) {
      this.handleVariableDragEnd();
      this.#handleVariableDrop(event, transfer);
      return;
    }

    const definitionId =
      transfer.getData(PALETTE_DRAG_MIME) || transfer.getData("text/plain");
    if (!definitionId) {
      return;
    }

    this.#workspace.paletteManager.handleDragEnd();

    const spawn = WorkspaceGeometry.snapPositionToGrid(
      this.#workspace,
      WorkspaceGeometry.eventToWorkspacePoint(this.#workspace, event)
    );

    this.#workspace.addNode(definitionId, spawn);
  }

  /**
   * Prompts for node selection when a variable is dropped onto the workspace.
   *
   * @param {DragEvent} event Drop event payload.
   * @param {DataTransfer} transfer Drag data transfer object.
   */
  #handleVariableDrop(event, transfer) {
    const variableId =
      transfer.getData(VARIABLE_DRAG_MIME) || transfer.getData("text/plain");
    const variable = variableId
      ? this.#workspace.variables.get(variableId)
      : undefined;
    if (!variableId || !variable) {
      return;
    }

    const definitions = this.#getVariableSpawnDefinitions(variableId);
    if (!definitions.length) {
      const spawn = WorkspaceGeometry.snapPositionToGrid(
        this.#workspace,
        WorkspaceGeometry.eventToWorkspacePoint(this.#workspace, event)
      );
      const fallback = this.#workspace.addNode("get_var", spawn);
      if (fallback) {
        const nodeName = variable.name || variable.id;
        this.#workspace.graph.setNodeProperty(fallback.id, "name", nodeName);
        this.#workspace.graph.setNodeProperty(
          fallback.id,
          "variableId",
          variable.id
        );
      }
      return;
    }

    this.#workspace.pendingVariableSpawn = { variableId };
    const placeholderName = variable.name || "variable";
    this.#workspace.contextMenuManager.show(event.clientX, event.clientY, {
      definitions,
      mode: "variable",
      placeholder: `Create node for ${placeholderName}`,
    });
  }

  /**
   * Resolves potential variable spawn definitions from the registry.
   *
   * @param {string} variableId Variable identifier.
   * @returns {Array<NodeDefinition>}
   */
  #getVariableSpawnDefinitions(_variableId) {
    const definitions = [];
    const getDefinition = this.#workspace.registry.get("get_var");
    const setDefinition = this.#workspace.registry.get("set_var");
    if (getDefinition) {
      definitions.push(getDefinition);
    }
    if (setDefinition) {
      definitions.push(setDefinition);
    }
    return definitions;
  }

  /**
   * Determines whether the drag originates from the palette interface.
   *
   * @param {DragEvent} event Drag event to inspect.
   * @returns {boolean}
   */
  #isPaletteDrag(event) {
    const transfer = event.dataTransfer;
    if (!transfer) {
      return false;
    }

    const types = Array.from(transfer.types ?? []);
    if (types.includes(PALETTE_DRAG_MIME)) {
      return true;
    }

    return this.#workspace.workspaceElement.classList.contains(
      "is-palette-dragging"
    );
  }

  /**
   * Determines whether the drag originates from the variable overview.
   *
   * @param {DragEvent} event Drag event to inspect.
   * @returns {boolean}
   */
  #isVariableDrag(event) {
    const transfer = event.dataTransfer;
    if (!transfer) {
      return false;
    }

    const types = Array.from(transfer.types ?? []);
    if (types.includes(VARIABLE_DRAG_MIME)) {
      return true;
    }

    return this.#workspace.workspaceElement.classList.contains(
      "is-variable-dragging"
    );
  }

  /**
   * Resolves the palette definition identifier associated with the active drag.
   *
   * @param {DragEvent} event Drag event payload.
   * @returns {string | null}
   */
  #resolvePaletteDefinitionId(event) {
    if (this.#workspace.activePaletteDefinitionId) {
      return this.#workspace.activePaletteDefinitionId;
    }

    const transfer = event.dataTransfer;
    if (!transfer) {
      return null;
    }

    const identifier =
      transfer.getData(PALETTE_DRAG_MIME) || transfer.getData("text/plain");
    return identifier || null;
  }
}
