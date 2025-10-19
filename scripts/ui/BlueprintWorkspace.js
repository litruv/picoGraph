import { NodeGraph } from "../core/NodeGraph.js";
import { WorkspaceGeometry } from "./workspace/WorkspaceGeometry.js";
import { WorkspaceDragManager } from "./workspace/WorkspaceDragManager.js";
import { WorkspaceHistoryManager } from "./workspace/WorkspaceHistoryManager.js";
import { WorkspaceClipboardManager } from "./workspace/WorkspaceClipboardManager.js";
import { WorkspacePersistenceManager } from "./workspace/WorkspacePersistenceManager.js";
import { WorkspaceMarqueeManager } from "./workspace/WorkspaceMarqueeManager.js";
import { WorkspaceContextMenuManager } from "./workspace/WorkspaceContextMenuManager.js";
import { WorkspacePaletteManager } from "./workspace/WorkspacePaletteManager.js";
import { WorkspaceDropManager } from "./workspace/WorkspaceDropManager.js";
import { WorkspaceInlineEditorManager } from "./workspace/WorkspaceInlineEditorManager.js";
import { WorkspaceNodeRenderer } from "./workspace/WorkspaceNodeRenderer.js";
import { WorkspaceNavigationManager } from "./workspace/WorkspaceNavigationManager.js";
import { renderEventList } from "./workspace/renderEventList.js";
import { renderVariableList } from "./workspace/renderVariableList.js";
import {
  WORKSPACE_SHORTCUTS,
} from "./WorkspaceSpawnShortcuts.js";

/**
 * @typedef {'any'|'number'|'string'|'boolean'|'table'} VariableType
 */

/** @type {Array<{ value: VariableType, label: string }>} */
const VARIABLE_TYPE_DEFINITIONS = [
  { value: "any", label: "Any" },
  { value: "number", label: "Number" },
  { value: "string", label: "String" },
  { value: "boolean", label: "Boolean" },
  { value: "table", label: "Table" },
];

const SUPPORTED_VARIABLE_TYPES = new Set(
  VARIABLE_TYPE_DEFINITIONS.map((entry) => entry.value)
);

/** @typedef {import('./WorkspaceSpawnShortcuts.js').WorkspaceShortcut} WorkspaceShortcut */
/** @typedef {import('./WorkspaceSpawnShortcuts.js').WorkspaceShortcutModifier} WorkspaceShortcutModifier */

/**
 * @typedef {{ kind: 'variable', variableId: string } | { kind: 'custom_event_parameter', nodeId: string, parameterId: string } | { kind: 'local_variable', nodeId: string }} TypeDropdownContext
 */

/**
 * @typedef {{ id: string, key: string, value: string }} TableDefaultEntry
 */

/**
 * @typedef {string | number | boolean | null | Array<TableDefaultEntry>} VariableDefaultValue
 */

/**
 * @typedef {{ id: string, name: string, type: VariableType, defaultValue: VariableDefaultValue }} WorkspaceVariable
 */

/**
 * @typedef {{ id: string, name: string, type: VariableType, optional: boolean }} CustomEventParameter
 */

/**
 * @typedef {'default'|'project'} InspectorView
 */

/**
 * @typedef {{ key: string, definitionId: string, button: number, modifiers: Set<WorkspaceShortcutModifier> }} NormalizedSpawnShortcut
 */

/**
 * @typedef {{ key: string, command: string, modifiers: Set<WorkspaceShortcutModifier> }} NormalizedCommandShortcut
 */

/**
 * @typedef {Object} WorkspaceOptions
 * @property {HTMLElement} workspaceElement Root workspace container.
 * @property {HTMLElement} nodeLayer DOM node layer container.
 * @property {SVGElement} connectionLayer SVG connection layer.
 * @property {HTMLElement} paletteList Palette list element.
 * @property {HTMLInputElement} paletteSearch Palette search input element.
  * @property {HTMLElement} paletteElement Palette container element.
 * @property {HTMLElement} inspectorContent Inspector root element.
 * @property {HTMLButtonElement} duplicateNodeButton Duplicate action button.
 * @property {HTMLButtonElement} deleteNodeButton Delete action button.
 * @property {LuaGenerator} generator Lua generator responsible for code output.
 * @property {NodeRegistry} registry Registry containing available node definitions.
 * @property {HTMLUListElement} eventList Event summary list element.
 * @property {HTMLUListElement} variableList Variable summary list element.
 * @property {HTMLButtonElement} addVariableButton Global variable creation button.
 * @property {HTMLButtonElement} projectSettingsButton Project settings toggle.
  * @property {HTMLButtonElement} paletteToggleButton Palette toggle control.
  * @property {HTMLElement} appBodyElement Layout container hosting the workspace panes.
  * @property {HTMLButtonElement} frameSelectionButton Frame selection control.
 */

/**
 * @typedef {{ type: 'variable', action: 'get'|'set', variableId: string }} VariablePaletteShortcut
 */

/**
 * @typedef {{ type: 'custom_event_call', eventNodeId: string }} CustomEventCallPaletteShortcut
 */

/**
 * @typedef {import('../nodes/nodeTypes.js').NodeDefinition & {
 *   shortcut?: VariablePaletteShortcut | CustomEventCallPaletteShortcut
 * }} PaletteNodeDefinition
 */

/** @typedef {import('./workspace/WorkspaceHistoryManager.js').SerializedWorkspace} SerializedWorkspace */
/** @typedef {import('./workspace/WorkspaceHistoryManager.js').WorkspaceSnapshot} WorkspaceSnapshot */

const AUTO_CONNECT_DISTANCE = 300;
const DEFAULT_SEQUENCE_BRANCHES = 3;

/**
 * Manages blueprint workspace interactions and DOM rendering.
 */
export class BlueprintWorkspace {
  /**
   * @param {WorkspaceOptions} options Workspace setup options.
   */
  constructor(options) {
    this.workspaceElement = options.workspaceElement;
    if (
      this.workspaceElement instanceof HTMLElement &&
      !this.workspaceElement.hasAttribute("tabindex")
    ) {
      this.workspaceElement.setAttribute("tabindex", "-1");
    }
    this.nodeLayer = options.nodeLayer;
    this.connectionLayer = options.connectionLayer;
    this.paletteList = options.paletteList;
    this.paletteSearch = options.paletteSearch;
    /** @type {HTMLElement} */
    this.paletteElement = options.paletteElement;
    this.inspectorContent = options.inspectorContent;
    this.duplicateNodeButton = options.duplicateNodeButton;
    this.deleteNodeButton = options.deleteNodeButton;
    this.generator = options.generator;
    this.registry = options.registry;
    /** @type {HTMLUListElement} */
    this.eventListElement = options.eventList;
    /** @type {HTMLUListElement} */
    this.variableListElement = options.variableList;
    this.addVariableButton = options.addVariableButton;
    /** @type {HTMLButtonElement} */
    this.projectSettingsButton = options.projectSettingsButton;
    /** @type {HTMLButtonElement} */
    this.frameSelectionButton = options.frameSelectionButton;
    /** @type {HTMLButtonElement} */
    this.paletteToggleButton = options.paletteToggleButton;
    /** @type {HTMLElement} */
    this.appBodyElement = options.appBodyElement;
    /** @type {Set<string>} */
    this.activeShortcutKeys = new Set();
    /** @type {Map<'background', Array<NormalizedSpawnShortcut>>} */
    this.spawnShortcutLookup = this.#normalizeSpawnShortcuts(
      WORKSPACE_SHORTCUTS
    );
    /** @type {Array<NormalizedCommandShortcut>} */
    this.commandShortcuts = this.#normalizeCommandShortcuts(
      WORKSPACE_SHORTCUTS
    );

    /** @type {number} */
    this.gridSize = WorkspaceGeometry.resolveGridSize(this);
    /** @type {{ element: HTMLElement, width: number, height: number, definitionId: string | null } | null} */
    this.paletteDragGhost = null;
    /** @type {{ element: HTMLElement, width: number, height: number, nodeId: string | null } | null} */
    this.nodeDragGhost = null;
    /** @type {string | null} */
    this.activePaletteDefinitionId = null;
    /** @type {Map<string, number>} */
    this.nodeDragRotation = new Map();
    /** @type {number | null} */
    this.nodeDragRotationDecayFrame = null;
    /** @type {number | null} */
    this.connectionRefreshFrame = null;

    this.graph = new NodeGraph();
    /** @type {Map<string, WorkspaceVariable>} */
    this.variables = new Map();
    /** @type {Array<string>} */
    this.variableOrder = [];
    this.variableCounter = 0;
    /** @type {Map<string, HTMLElement>} */
    this.nodeElements = new Map();
    /** @type {Map<string, SVGPathElement>} */
    this.connectionElements = new Map();
    /** @type {{ container: HTMLElement | null, trigger: HTMLButtonElement | null, context: TypeDropdownContext | null, onSelect: ((type: VariableType) => void) | null }} */
    this.typeDropdown = {
      container: null,
      trigger: null,
      context: null,
      onSelect: null,
    };
    /** @type {Set<HTMLElement>} */
    this.highlightedPins = new Set();
    this.pendingConnection = null;
    /**
     * @type {{ startRef: { nodeId: string, pinId: string }, direction: 'input'|'output', kind: string } | null}
     */
    this.pendingConnectionSpawn = null;
    /** @type {{ variableId: string } | null} */
    this.pendingVariableSpawn = null;
    /** @type {Set<string>} */
    this.selectedNodeIds = new Set();
    /** @type {string | undefined} */
    this.selectedNodeId = undefined;
    /** @type {string | null} */
    this.selectedVariableId = null;
    /** @type {{ variableId: string, input: HTMLInputElement, label: HTMLElement, container: HTMLElement, wasDraggable: boolean } | null} */
    this.activeVariableRename = null;
    /** @type {{ nodeId: string, property: string } | null} */
    this.pendingInspectorFocus = null;
  /** @type {{ variableId: string, entryId: string, target: 'key' | 'value' } | null} */
  this.pendingVariableInspectorFocus = null;
    /** @type {{ use60Fps: boolean }} */
    this.projectSettings = { use60Fps: false };
    /** @type {boolean} */
    this.isPaletteVisible = true;
    /** @type {InspectorView} */
    this.inspectorView = "default";
    /** @type {boolean} */
    this.isDraggingNodes = false;
    /** @type {boolean} */
    this.isRestoring = false;
    /** @type {number} */
    this.workspaceDragDepth = 0;
    /** @type {number} */
    this.spawnIndex = 0;
    /** @type {string} */
    this.luaOutput = "";
    /** @type {WorkspaceHistoryManager | null} */
    this.historyManager = null;
    /** @type {WorkspaceClipboardManager | null} */
    this.clipboardManager = null;
    /** @type {WorkspacePersistenceManager | null} */
    this.persistenceManager = null;
    /** @type {WorkspacePaletteManager | null} */
    this.paletteManager = null;
    /** @type {WorkspaceContextMenuManager | null} */
    this.contextMenuManager = null;
    /** @type {WorkspaceDropManager | null} */
    this.dropManager = null;
    /** @type {WorkspaceMarqueeManager | null} */
    this.marqueeManager = null;
    /** @type {WorkspaceInlineEditorManager | null} */
    this.inlineEditorManager = null;
    /** @type {WorkspaceNodeRenderer | null} */
    this.nodeRenderer = null;
    /** @type {WorkspaceNavigationManager | null} */
    this.navigationManager = null;
    /** @type {WorkspaceDragManager | null} */
    this.dragManager = null;
    /** @type {HTMLTemplateElement} */
    this.nodeTemplate = BlueprintWorkspace.#requireTemplate(
      "nodeTemplate",
      HTMLTemplateElement
    );
    /** @type {HTMLTemplateElement} */
    this.pinTemplate = BlueprintWorkspace.#requireTemplate(
      "pinTemplate",
      HTMLTemplateElement
    );
    /** @type {boolean} */
    this.isInitialized = false;

    Object.defineProperty(this, "zoomLevel", {
      configurable: true,
      enumerable: false,
      get: () => this.navigationManager?.getZoomLevel() ?? 1,
      set: (value) => {
        if (this.navigationManager) {
          this.navigationManager.setZoomLevel(value, { silent: true });
          this.navigationManager.updateZoomDisplay();
        }
      },
    });

    Object.defineProperty(this, "workspaceBackgroundOffset", {
      configurable: true,
      enumerable: false,
      get: () =>
        this.navigationManager?.getBackgroundOffset?.() ?? { x: 0, y: 0 },
      set: (value) => {
        if (this.navigationManager) {
          this.navigationManager.setBackgroundOffset(value ?? { x: 0, y: 0 });
        }
      },
    });
  }

  /**
   * Ensures a DOM template with the requested identifier exists.
   *
   * @template T
   * @param {string} id Element identifier.
   * @param {new (...args: Array<any>) => T} ctor Expected constructor.
   * @returns {T}
   */
  static #requireTemplate(id, ctor) {
    const element = document.getElementById(id);
    if (!(element instanceof ctor)) {
      throw new Error(`Missing required template: ${id}`);
    }
    return element;
  }

  /**
   * Initializes manager instances, event bindings, and persisted state.
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    this.dragManager = new WorkspaceDragManager(this);
    this.historyManager = new WorkspaceHistoryManager(this);
    this.persistenceManager = new WorkspacePersistenceManager(this);
    this.clipboardManager = new WorkspaceClipboardManager(
      this,
      this.historyManager
    );
    this.inlineEditorManager = new WorkspaceInlineEditorManager({
      getGraph: () => this.graph,
      registry: this.registry,
      formatVariableType: (type) => this.#formatVariableType(type),
      openLocalVariableTypeDropdown: (
        nodeId,
        trigger,
        anchor,
        currentType,
        onSelect
      ) => {
        const typeOptions = this.#getVariableTypeOptions().filter(
          (entry) => entry.value !== "any"
        );
        this.#openTypeDropdown({
          context: { kind: "local_variable", nodeId },
          trigger,
          anchor,
          currentType,
          onSelect,
          placement: "top",
          options: typeOptions,
        });
      },
      closeTypeDropdown: () => this.#closeTypeDropdown(),
      isTypeDropdownOpen: (context) => this.#isTypeDropdownOpen(context),
    });
    this.contextMenuManager = new WorkspaceContextMenuManager(this);
    this.paletteManager = new WorkspacePaletteManager(this);
    this.dropManager = new WorkspaceDropManager(this);
    this.marqueeManager = new WorkspaceMarqueeManager(this);
    this.navigationManager = new WorkspaceNavigationManager(this, {
      renderConnections: () => this.#renderConnections(),
      schedulePersist: () => this.persistenceManager.schedulePersist(),
    });
    this.nodeRenderer = new WorkspaceNodeRenderer(this, {
      inlineEditorManager: this.inlineEditorManager,
      applySelectionState: () => this.#applySelectionState(),
      selectNode: (nodeId) => this.selectNode(nodeId),
      startNodeDrag: (event, nodeId) =>
        this.dragManager?.startNodeDrag(event, nodeId),
      refreshVariableNode: (nodeId) => this.#refreshVariableNode(nodeId),
      refreshLocalVariableNode: (nodeId) =>
        this.#refreshLocalVariableNode(nodeId),
      refreshCustomEventNode: (nodeId) => this.#refreshCustomEventNode(nodeId),
      refreshCustomEventCallNode: (nodeId) =>
        this.#refreshCustomEventCallNode(nodeId),
      renderConnections: () => this.#renderConnections(),
      shouldHighlightPin: (nodeId, pinId, direction) =>
        this.#shouldHighlightHover(nodeId, pinId, direction),
      beginConnection: (event, nodeId, pinId, direction) =>
        this.#beginConnection(event, nodeId, pinId, direction),
      finalizeConnection: (nodeId, pinId, direction) =>
        this.#finalizeConnection(nodeId, pinId, direction),
      getPinElement: (nodeId, pinId, direction) =>
        this.#getPinElement(nodeId, pinId, direction),
    });

    this.contextMenuManager.initialize();
    this.paletteManager.initialize();
    this.dropManager.initialize();
    this.marqueeManager.ensureElement();

    this.navigationManager.updateZoomDisplay();
    this.navigationManager.setBackgroundOffset({ x: 0, y: 0 });

    if (typeof this.generator.setProjectSettings === "function") {
      this.generator.setProjectSettings({ ...this.projectSettings });
    }

    this.#bindGraphEvents();
    this.#bindUiEvents();
    this.#applyPaletteVisibility(this.isPaletteVisible);

    const restored = this.persistenceManager.restoreFromStorage();
    if (!restored) {
      this.#renderOverview();
      this.#renderInspectorState();
      this.#refreshLuaOutput();
      this.navigationManager.updateZoomDisplay();
    }

    this.historyManager.initialize();
    this.isInitialized = true;
  }

  /**
   * Reverts the most recent checkpoint.
   */
  undo() {
    this.historyManager.undo();
  }

  /**
   * Re-applies the most recently undone checkpoint.
   */
  redo() {
    this.historyManager.redo();
  }

  /**
   * Produces Lua output using the current generator and graph state.
   */
  exportLua() {
    return this.#refreshLuaOutput();
  }

  /**
   * Subscribes to graph lifecycle changes.
   */
  #bindGraphEvents() {
    this.graph.addEventListener("nodeschanged", (event) => {
      const customEvent = /** @type {CustomEvent} */ (event);
      const detail = customEvent.detail;
      if (detail?.type === "add" && detail.node) {
        if (detail.node.type === "custom_event") {
          const currentName =
            typeof detail.node.properties.name === "string"
              ? detail.node.properties.name
              : "";
          const uniqueName = this.#generateUniqueCustomEventName(
            currentName || "CustomEvent",
            detail.node.id
          );
          if (uniqueName !== currentName) {
            this.graph.setNodeProperty(detail.node.id, "name", uniqueName);
          } else {
            this.#refreshCustomEventNode(detail.node.id);
          }
          if (
            !this.pendingInspectorFocus ||
            this.pendingInspectorFocus.nodeId !== detail.node.id
          ) {
            this.pendingInspectorFocus = {
              nodeId: detail.node.id,
              property: "name",
            };
          }
          if (
            this.selectedNodeId &&
            this.graph.nodes.get(this.selectedNodeId)?.type ===
              "call_custom_event"
          ) {
            this.#refreshInspectorIfActive(this.selectedNodeId, "eventId");
          }
        } else if (detail.node.type === "call_custom_event") {
          this.#refreshCustomEventCallNode(detail.node.id);
          if (
            !this.pendingInspectorFocus ||
            this.pendingInspectorFocus.nodeId !== detail.node.id
          ) {
            this.pendingInspectorFocus = {
              nodeId: detail.node.id,
              property: "eventId",
            };
          }
        } else if (detail.node.type === "sequence") {
          this.#refreshSequenceNode(detail.node.id);
        }
      } else if (detail?.type === "remove" && detail.nodeId) {
        this.#handleCustomEventRemoval(detail.nodeId);
      }

      this.#renderConnections();
      this.#refreshLuaOutput();
      this.#renderOverview();
      this.nodeRenderer.refreshAllPinConnections();
      this.historyManager.registerMutation("nodeschanged");
      this.persistenceManager.schedulePersist();
    });

    this.graph.addEventListener("nodepositionchanged", () => {
      if (this.isDraggingNodes) {
        this.#scheduleConnectionRefresh();
      } else {
        this.#flushConnectionRefresh();
      }
      this.#refreshLuaOutput();
      this.historyManager.registerMutation("nodepositionchanged");
      this.persistenceManager.schedulePersist();
    });

    this.graph.addEventListener("nodepropertychanged", (event) => {
      const customEvent = /** @type {CustomEvent} */ (event);
      const detail = customEvent.detail ?? {};
      const nodeId = detail.nodeId;
      const key = detail.key;
      const value = detail.value;

      let connectionsMutated = false;
      const nodesToRefreshConnections = new Set();

      if (nodeId) {
        this.inlineEditorManager.syncNode(nodeId);
        const node = this.graph.nodes.get(nodeId);

        if (node?.type === "custom_event") {
          if (key === "name") {
            const input = typeof value === "string" ? value : "";
            const trimmed = input.trim();
            if (trimmed !== input) {
              this.graph.setNodeProperty(nodeId, "name", trimmed);
              return;
            }

            const ensured = trimmed || "CustomEvent";
            const uniqueName = this.#generateUniqueCustomEventName(
              ensured,
              nodeId
            );
            if (uniqueName !== ensured) {
              this.graph.setNodeProperty(nodeId, "name", uniqueName);
              return;
            }

            const mutated = this.#refreshCustomEventNode(nodeId);
            connectionsMutated = mutated || connectionsMutated;
            this.#refreshInspectorIfActive(nodeId, "name");
          } else if (key === "parameters") {
            const mutated = this.#refreshCustomEventNode(nodeId);
            connectionsMutated = mutated || connectionsMutated;
            this.#refreshInspectorIfActive(nodeId);
          } else if (key === "parameterCounter") {
            // Counter adjustments are handled indirectly by parameter updates.
          } else {
            const mutated = this.#refreshCustomEventNode(nodeId);
            connectionsMutated = mutated || connectionsMutated;
          }
        } else if (node?.type === "call_custom_event") {
          if (key === "eventId") {
            const eventId = typeof value === "string" ? value : "";
            const eventNode = eventId ? this.graph.nodes.get(eventId) : null;

            if (eventId && (!eventNode || eventNode.type !== "custom_event")) {
              if (eventId !== "") {
                this.graph.setNodeProperty(nodeId, "eventId", "");
              }
              return;
            }

            const mutated = this.#refreshCustomEventCallNode(nodeId);
            connectionsMutated = mutated || connectionsMutated;
            this.#refreshInspectorIfActive(nodeId, "eventId");
          } else if (key === "arguments") {
            const mutated = this.#refreshCustomEventCallNode(nodeId);
            connectionsMutated = mutated || connectionsMutated;
            this.#refreshInspectorIfActive(nodeId, "arguments");
          } else {
            const mutated = this.#refreshCustomEventCallNode(nodeId);
            connectionsMutated = mutated || connectionsMutated;
          }
        } else if (node?.type === "sequence") {
          const mutated = this.#refreshSequenceNode(nodeId);
          if (mutated) {
            connectionsMutated = true;
            nodesToRefreshConnections.add(nodeId);
          }
          if (key === "branches") {
            this.#refreshInspectorIfActive(nodeId);
          }
        } else {
          const variableMutated = this.#refreshVariableNode(nodeId);
          if (variableMutated) {
            connectionsMutated = true;
            nodesToRefreshConnections.add(nodeId);
          }
          const localMutated = this.#refreshLocalVariableNode(nodeId);
          if (localMutated) {
            connectionsMutated = true;
            nodesToRefreshConnections.add(nodeId);
          }
        }
      }

      this.#refreshLuaOutput();
      this.#renderOverview();
      if (connectionsMutated) {
        this.#renderConnections();
        nodesToRefreshConnections.forEach((id) =>
          this.nodeRenderer.updatePinConnectionsForNode(id)
        );
      }
      this.historyManager.registerMutation("nodepropertychanged");
      this.persistenceManager.schedulePersist();
    });

    this.graph.addEventListener("connectionschanged", (event) => {
      const customEvent = /** @type {CustomEvent} */ (event);
      const detail = customEvent.detail;
      /** @type {Set<string>} */
      const nodesToRefresh = new Set();

      const addNode = (nodeId) => {
        if (typeof nodeId === "string" && nodeId.length) {
          nodesToRefresh.add(nodeId);
        }
      };

      if (detail?.connection) {
        addNode(detail.connection.from.nodeId);
        addNode(detail.connection.to.nodeId);
      }

      if (detail?.ref) {
        addNode(detail.ref.nodeId);
      }

      if (Array.isArray(detail?.nodes)) {
        detail.nodes.forEach(addNode);
      }

      if (detail?.nodeId) {
        addNode(detail.nodeId);
      }

      if (nodesToRefresh.size) {
        nodesToRefresh.forEach((nodeId) => {
          if (this.graph.nodes.has(nodeId)) {
            this.inlineEditorManager.syncNode(nodeId);
          }
        });
      } else {
        this.inlineEditorManager.syncAll();
        this.graph.nodes.forEach((node) => nodesToRefresh.add(node.id));
      }

      this.#renderConnections();
      nodesToRefresh.forEach((nodeId) =>
        this.nodeRenderer.updatePinConnectionsForNode(nodeId)
      );
      this.#refreshLuaOutput();
      this.historyManager.registerMutation("connectionschanged");
      this.persistenceManager.schedulePersist();
    });
  }

  /**
   * Registers DOM event listeners for interactivity.
   */
  #bindUiEvents() {
    if (this.paletteToggleButton) {
      this.paletteToggleButton.addEventListener("click", () => {
        this.#togglePaletteVisibility();
      });
    }

    if (this.frameSelectionButton) {
      this.frameSelectionButton.addEventListener("click", () => {
        this.#frameSelection();
      });
    }

    if (this.projectSettingsButton) {
      this.projectSettingsButton.addEventListener("click", () => {
        const wasProjectView = this.inspectorView === "project";
        if (wasProjectView) {
          this.#setInspectorView("default");
          this.clearSelection();
          this.#renderInspectorState();
          return;
        }

        this.clearSelection();
        this.#setInspectorView("project");
        this.#renderInspectorState();
      });
    }

    if (this.addVariableButton) {
      this.addVariableButton.addEventListener("click", () => {
        this.#createGlobalVariable();
      });
    }

    this.workspaceElement.addEventListener(
      "wheel",
      (event) => {
        if (event.defaultPrevented) {
          return;
        }

        const rawTarget = /** @type {EventTarget | null} */ (event.target);
        if (
          rawTarget instanceof Node &&
          this.contextMenuManager?.isTargetInside(rawTarget)
        ) {
          return;
        }

        if (!Number.isFinite(event.deltaY) || event.deltaY === 0) {
          return;
        }

        const rect = this.workspaceElement.getBoundingClientRect();
        const pointer = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };

        if (pointer.x < 0 || pointer.y < 0 || pointer.x > rect.width || pointer.y > rect.height) {
          return;
        }

        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        this.navigationManager.zoomAt(pointer, direction, {
          clientX: event.clientX,
          clientY: event.clientY,
        });
      },
      { passive: false }
    );

    this.workspaceElement.addEventListener("pointerdown", (event) => {
      const rawTarget = /** @type {EventTarget | null} */ (event.target);
      if (rawTarget instanceof Element) {
        const interactive = rawTarget.closest(
          "input, textarea, select, button, [contenteditable='true']"
        );
        if (!interactive) {
          this.#focusWorkspaceSurface({ force: true });
        }
      }

      if (this.contextMenuManager.isVisible()) {
        if (
          !(rawTarget instanceof Node) ||
          !this.contextMenuManager.isTargetInside(rawTarget)
        ) {
          this.contextMenuManager.hide();
        }
      }

      if (!(rawTarget instanceof Element)) {
        return;
      }

      if (!this.#isWorkspaceBackgroundTarget(rawTarget)) {
        return;
      }

      if (event.button === 0) {
        const shortcut = this.#matchBackgroundSpawnShortcut(event);
        if (shortcut) {
          event.preventDefault();
          event.stopPropagation();
          const spawned = this.#spawnShortcutNodeAtPointer(shortcut, event);
          if (spawned) {
            this.#focusWorkspaceSurface({ force: true });
          }
          return;
        }
        this.clearSelection();
        this.marqueeManager?.beginSelection(event);
      } else if (event.button === 2) {
        this.navigationManager?.beginPan(event);
      }
    });

    this.workspaceElement.addEventListener("contextmenu", (event) => {
      if (event.defaultPrevented) {
        return;
      }
  if (this.navigationManager.isPanRecent(200)) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      this.contextMenuManager.show(event.clientX, event.clientY);
    });

    this.duplicateNodeButton.addEventListener("click", () => {
      if (this.selectedNodeIds.size !== 1 || !this.selectedNodeId) {
        return;
      }
      const node = this.graph.nodes.get(this.selectedNodeId);
      if (!node) {
        return;
      }

      const duplicated = this.registry.createNode(node.type, {
        id: this.graph.createNodeId(node.type),
        position: { x: node.position.x + 40, y: node.position.y + 40 },
      });
      duplicated.properties = { ...node.properties };
      this.graph.addNode(duplicated);
  this.nodeRenderer.renderNode(duplicated);
      this.selectNode(duplicated.id);
    });

    this.deleteNodeButton.addEventListener("click", () => {
      if (!this.selectedNodeIds.size) {
        return;
      }
      const targets = [...this.selectedNodeIds];
      targets.forEach((id) => {
        this.removeNode(id);
      });
    });

    document.addEventListener("keydown", (event) => {
      const key = event.key;
      const normalizedKey = typeof key === "string" ? key.toLowerCase() : "";
      const isModifier = event.ctrlKey || event.metaKey;

      if (normalizedKey && normalizedKey.length === 1) {
        this.activeShortcutKeys.add(normalizedKey);
      }

      const target = /** @type {EventTarget | null} */ (event.target);
      if (target instanceof HTMLElement) {
        const tagName = target.tagName;
        if (
          target.isContentEditable ||
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT"
        ) {
          return;
        }
      }

      if (isModifier) {
        const handled = this.#dispatchCommandShortcut(event, normalizedKey);
        if (handled) {
          return;
        }
      }

      if (key !== "Delete" && normalizedKey !== "q") {
        return;
      }

      if (key === "Delete") {
        const handled = this.#dispatchCommandShortcut(event, "delete");
        if (!handled) {
          if (!this.selectedNodeIds.size) {
            return;
          }
          event.preventDefault();
          const ids = [...this.selectedNodeIds];
          ids.forEach((id) => this.removeNode(id));
        }
        return;
      }

      if (normalizedKey === "q") {
        const connected = this.#tryAutoConnectSelectedNode();
        if (connected) {
          event.preventDefault();
        }
      }
    });

    document.addEventListener("keyup", (event) => {
      const key = event.key;
      const normalizedKey = typeof key === "string" ? key.toLowerCase() : "";
      if (normalizedKey && normalizedKey.length === 1) {
        this.activeShortcutKeys.delete(normalizedKey);
      }
    });

    window.addEventListener("blur", () => {
      this.activeShortcutKeys.clear();
    });

    document.addEventListener("pointerdown", (event) => {
      const state = this.typeDropdown;
      if (!state.container || !state.trigger) {
        return;
      }

      const target = /** @type {EventTarget | null} */ (event.target);
      if (!(target instanceof Node)) {
        this.#closeTypeDropdown();
        return;
      }

      if (state.container.contains(target) || state.trigger.contains(target)) {
        return;
      }

      this.#closeTypeDropdown();
    });

    const updateClipboardPointer = (event) => {
      if (!this.clipboardManager) {
        return;
      }
      const point = WorkspaceGeometry.eventToWorkspacePoint(this, event);
      this.clipboardManager.updatePointerPosition(point);
    };

    this.workspaceElement.addEventListener("pointermove", updateClipboardPointer);
    this.workspaceElement.addEventListener("pointerdown", updateClipboardPointer);
    this.workspaceElement.addEventListener("pointerenter", updateClipboardPointer);
    this.workspaceElement.addEventListener("pointerleave", () => {
      this.clipboardManager?.clearPointerPosition();
    });

    this.connectionLayer.addEventListener("pointerdown", (event) => {
      this.#handleConnectionPointerDown(event);
    });
  }

  /**
   * Creates and renders a node of the requested definition.
   *
   * @param {string} definitionId Node definition identifier.
   * @param {{ x: number, y: number }} [position] Optional workspace position.
   * @returns {import('../core/BlueprintNode.js').BlueprintNode | null}
   */
  addNode(definitionId, position) {
    const definition = this.registry.get(definitionId);
    if (!definition) {
      return null;
    }

    if (definition.unique) {
      const existing = [...this.graph.nodes.values()].find(
        (candidate) => candidate.type === definitionId
      );
      if (existing) {
        this.setSelectionState([existing.id], existing.id);
        const navigator = this.navigationManager;
        if (navigator) {
          window.requestAnimationFrame(() => {
            navigator.frameNodes([existing.id]);
          });
        }
        return existing;
      }
    }

    const hasPosition =
      position &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y);
    const spawnIndex = this.spawnIndex;
    const spawnPosition = hasPosition
      ? WorkspaceGeometry.snapPositionToGrid(this, position)
      : this.#computeSpawnPosition(definitionId, spawnIndex);

    let node;
    try {
      node = this.registry.createNode(definitionId, {
        id: this.graph.createNodeId(definitionId),
        position: spawnPosition,
      });
    } catch {
      return null;
    }

    this.spawnIndex = spawnIndex + 1;

    this.graph.addNode(node);
    this.renderNode(node);
    if (node.type === "sequence") {
      this.#refreshSequenceNode(node.id);
    }
    this.setSelectionState([node.id], node.id);
    return node;
  }

  /**
   * Renders a node within the workspace node layer.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode | null | undefined} node Node to render.
   */
  renderNode(node) {
    if (!node) {
      return;
    }
    this.nodeRenderer.renderNode(node);
  }

  /**
   * Removes a specific node from the workspace.
   *
   * @param {string} nodeId Target node identifier.
   */
  removeNode(nodeId) {
    if (this.nodeDragGhost?.nodeId === nodeId) {
      this.dragManager.removeNodeGhost();
    }
    const element = this.nodeElements.get(nodeId);
    if (element) {
      element.remove();
      this.nodeElements.delete(nodeId);
    }
    this.inlineEditorManager.removeNode(nodeId);
    if (
      this.pendingConnection &&
      ((this.pendingConnection.source &&
        this.pendingConnection.source.nodeId === nodeId) ||
        (this.pendingConnection.target &&
          this.pendingConnection.target.nodeId === nodeId))
    ) {
      this.#cancelPendingConnection();
    }
    this.graph.removeNode(nodeId);
    if (this.selectedNodeIds.delete(nodeId)) {
      if (this.selectedNodeId === nodeId) {
        const iterator = this.selectedNodeIds.values().next();
        this.selectedNodeId = iterator.done ? undefined : iterator.value;
      }
      this.#applySelectionState();
    }
  }

  /**
   * Clears the current node selection.
   */
  clearSelection() {
    this.#cancelVariableRename({ commit: true });
    const hadVariable = Boolean(this.selectedVariableId);
    if (hadVariable) {
      this.selectedVariableId = null;
    }

    if (!this.selectedNodeIds.size) {
      if (hadVariable) {
        this.#highlightVariableSelection();
        this.#renderInspectorState();
      }
      return;
    }

    this.#setSelection([], undefined);
  }

  /**
   * Selects a node, updates UI affordances, and renders inspector controls.
   *
   * @param {string} nodeId Node identifier.
   */
  selectNode(nodeId) {
    if (!nodeId) {
      this.clearSelection();
      return;
    }

    if (this.selectedNodeIds.size === 1 && this.selectedNodeId === nodeId) {
      return;
    }

    const element = this.nodeElements.get(nodeId);
    if (!element) {
      this.clearSelection();
      return;
    }

    this.#setSelection([nodeId], nodeId);
  }

  /**
   * Applies the supplied selection state and optional primary node designation.
   *
   * @param {Array<string>} nodeIds Node identifiers to select.
   * @param {string | undefined} primaryId Preferred primary selection identifier.
   */
  setSelectionState(nodeIds, primaryId) {
    this.#setSelection(Array.isArray(nodeIds) ? nodeIds : [], primaryId);
  }

  /**
   * Frames the active selection or all nodes when nothing is selected.
   */
  #frameSelection() {
    if (!this.navigationManager) {
      return;
    }

    const selected = [...this.selectedNodeIds];
    if (selected.length) {
      this.navigationManager.frameNodes(selected);
      return;
    }

    const allIds = [];
    this.graph.nodes.forEach((node) => {
      allIds.push(node.id);
    });

    if (!allIds.length) {
      return;
    }

    this.navigationManager.frameNodes(allIds);
  }

  /**
   * Toggles the palette visibility state.
   */
  #togglePaletteVisibility() {
    this.#setPaletteVisibility(!this.isPaletteVisible);
  }

  /**
   * Updates internal palette visibility tracking and applies side effects.
   *
   * @param {boolean} visible Target palette visibility flag.
   */
  #setPaletteVisibility(visible) {
    const next = Boolean(visible);
    if (this.isPaletteVisible === next) {
      this.#applyPaletteVisibility(next);
      return;
    }

    const shouldFocus = !this.isPaletteVisible && next;
    this.isPaletteVisible = next;
    this.#applyPaletteVisibility(next, { focusSearch: shouldFocus });
    this.persistenceManager.schedulePersist();
  }

  /**
   * Applies palette visibility-related DOM updates.
   *
   * @param {boolean} visible Whether the palette should be visible.
   * @param {{ focusSearch?: boolean }} [options] Behaviour overrides.
   */
  #applyPaletteVisibility(visible, options = {}) {
    const palette = this.paletteElement;
    const button = this.paletteToggleButton;
    const appBody = this.appBodyElement;
    const { focusSearch = false } = options;

    if (appBody) {
      appBody.classList.toggle("app-body--palette-hidden", !visible);
    }

    if (palette) {
      palette.setAttribute("aria-hidden", visible ? "false" : "true");
    }

    if (button) {
      button.classList.toggle("is-active", visible);
      button.setAttribute("aria-pressed", visible ? "true" : "false");
      const label = visible ? "Hide palette" : "Show palette";
      button.setAttribute("aria-label", label);
      button.title = label;
    }

    if (focusSearch && this.paletteSearch) {
      window.requestAnimationFrame(() => {
        if (this.isPaletteVisible && this.paletteSearch) {
          this.paletteSearch.focus();
          this.paletteSearch.select();
        }
      });
    }
  }

  /**
   * Focuses the workspace surface when appropriate.
   *
   * @param {{ force?: boolean }} [options] Behaviour overrides.
   */
  #focusWorkspaceSurface(options = {}) {
    const element = this.workspaceElement;
    if (!(element instanceof HTMLElement) || typeof element.focus !== "function") {
      return;
    }

    const { force = false } = options;
    const activeElement = /** @type {Element | null} */ (document.activeElement);
    if (!force && activeElement && activeElement !== document.body) {
      return;
    }

    try {
      element.focus({ preventScroll: true });
    } catch (_error) {
      element.focus();
    }
  }

  /**
   * Selects a global variable and opens the inspector for editing.
   *
   * @param {string} variableId Variable identifier.
   */
  #selectVariable(variableId) {
    this.#cancelVariableRename({ commit: true });
    this.#setInspectorView("default");
    if (!this.variables.has(variableId)) {
      return;
    }

    if (this.selectedVariableId === variableId && !this.selectedNodeIds.size) {
      this.#renderInspectorState();
      return;
    }

    this.selectedVariableId = variableId;
    this.#setSelection([], undefined);
    this.#highlightVariableSelection();
    this.#renderInspectorState();
  }

  /**
   * Synchronizes inspector content and overview highlighting for variable selection.
   */
  #renderInspectorState() {
    if (this.inspectorView === "project") {
      this.selectedVariableId = null;
      this.inspectorContent.innerHTML = "";
      this.#highlightVariableSelection();
      this.#renderProjectSettingsInspector();
      return;
    }

    if (this.selectedNodeIds.size) {
      if (this.selectedVariableId) {
        this.selectedVariableId = null;
        this.#highlightVariableSelection();
      }
      return;
    }

    if (!this.selectedVariableId) {
      this.inspectorContent.innerHTML = "";
      const empty = document.createElement("p");
      empty.className = "inspector-empty";
      empty.textContent = "Select a node or variable to edit.";
      this.inspectorContent.appendChild(empty);
      this.#highlightVariableSelection();
      return;
    }

    const variable = this.variables.get(this.selectedVariableId);
    if (!variable) {
      this.selectedVariableId = null;
      this.#highlightVariableSelection();
      this.inspectorContent.innerHTML = "";
      const empty = document.createElement("p");
      empty.className = "inspector-empty";
      empty.textContent = "Select a node or variable to edit.";
      this.inspectorContent.appendChild(empty);
      return;
    }

    this.#highlightVariableSelection();
    this.#renderVariableInspector(variable);
  }

  /**
   * Adds viewport-aware positioning and lifecycle management to an inspector tooltip element.
   *
   * @param {HTMLElement} tooltipElement Tooltip root element containing trigger and content.
   */
  #enhanceInspectorTooltip(tooltipElement) {
    const trigger = tooltipElement.querySelector(".inspector-tooltip__trigger");
    const content = tooltipElement.querySelector(".inspector-tooltip__content");

    if (
      !(trigger instanceof HTMLElement) ||
      !(content instanceof HTMLElement)
    ) {
      return;
    }

    const margin = 12;
    const offset = 12;
    const arrowPadding = 14;
    let rafId = null;

    const clearRaf = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const schedulePosition = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(position);
    };

    const handleScroll = () => {
      if (!tooltipElement.classList.contains("is-active")) {
        close();
        return;
      }
      schedulePosition();
    };

    const handleResize = () => {
      if (!tooltipElement.classList.contains("is-active")) {
        return;
      }
      schedulePosition();
    };

    const handleDocumentPointerDown = (event) => {
      const target = event.target;
      if (target instanceof Node && tooltipElement.contains(target)) {
        return;
      }
      close();
    };

    const close = () => {
      if (!tooltipElement.classList.contains("is-active")) {
        clearRaf();
        trigger.setAttribute("aria-expanded", "false");
        return;
      }
      tooltipElement.classList.remove("is-active");
      tooltipElement.dataset.placement = "bottom";
      trigger.setAttribute("aria-expanded", "false");
      clearRaf();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true
      );
    };

    const position = () => {
      rafId = null;
      if (
        !tooltipElement.isConnected ||
        !trigger.isConnected ||
        !content.isConnected
      ) {
        close();
        return;
      }

      const previousTransition = content.style.transition;
      const previousTransform = content.style.transform;
      content.style.transition = "none";
      content.style.transform = "translate3d(0, 0, 0)";
      const contentRect = content.getBoundingClientRect();
      content.style.transition = previousTransition;
      content.style.transform = previousTransform;

      const triggerRect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const availableTop = triggerRect.top - margin;
      const availableBottom = viewportHeight - triggerRect.bottom - margin;
      let placement = "bottom";

      if (
        availableBottom < contentRect.height + offset &&
        availableTop > availableBottom
      ) {
        placement = "top";
      }

      const minLeft = margin;
      let maxLeft = viewportWidth - margin - contentRect.width;
      if (maxLeft < minLeft) {
        maxLeft = minLeft;
      }

      let left =
        triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
      left = Math.min(Math.max(left, minLeft), maxLeft);

      const minTop = margin;
      let maxTop = viewportHeight - margin - contentRect.height;
      if (maxTop < minTop) {
        maxTop = minTop;
      }

      let top =
        placement === "top"
          ? triggerRect.top - offset - contentRect.height
          : triggerRect.bottom + offset;

      top = Math.min(Math.max(top, minTop), maxTop);

      const triggerCenter = triggerRect.left + triggerRect.width / 2;
      let arrowOffset = triggerCenter - left;
      const arrowMin = arrowPadding;
      const arrowMax = Math.max(arrowPadding, contentRect.width - arrowPadding);
      arrowOffset = Math.min(Math.max(arrowOffset, arrowMin), arrowMax);

      content.style.setProperty("--tooltip-left", `${Math.round(left)}px`);
      content.style.setProperty("--tooltip-top", `${Math.round(top)}px`);
      content.style.setProperty(
        "--tooltip-arrow-offset",
        `${Math.round(arrowOffset)}px`
      );
      tooltipElement.dataset.placement = placement;
    };

    const open = () => {
      if (tooltipElement.classList.contains("is-active")) {
        schedulePosition();
        return;
      }
      tooltipElement.classList.add("is-active");
      trigger.setAttribute("aria-expanded", "true");
      schedulePosition();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, true);
      document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    };

    const handlePointerLeave = () => {
      close();
    };

    const handleFocusOut = (event) => {
      const focusEvent = /** @type {FocusEvent} */ (event);
      const next = focusEvent.relatedTarget;
      if (!(next instanceof Node) || !tooltipElement.contains(next)) {
        close();
      }
    };

    const handleKeyDown = (event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }
      if (event.key === "Escape") {
        close();
        if (typeof trigger.focus === "function") {
          trigger.focus();
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (tooltipElement.classList.contains("is-active")) {
          close();
        } else {
          open();
        }
      }
    };

    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("focus", open);
    tooltipElement.addEventListener("pointerenter", open);
    tooltipElement.addEventListener("pointerleave", handlePointerLeave);
    tooltipElement.addEventListener("focusout", handleFocusOut);
    tooltipElement.addEventListener("keydown", handleKeyDown);
  }

  /**
   * Renders the project settings inspector view.
   */
  #renderProjectSettingsInspector() {
    const heading = document.createElement("h3");
    heading.className = "inspector-section-title";
    heading.textContent = "Project Settings";
    this.inspectorContent.appendChild(heading);

    const fpsField = document.createElement("div");
    fpsField.className = "inspector-field inspector-field--checkbox";

    const fpsLabel = document.createElement("label");
    const fieldId = "projectSetting_fps60";
    fpsLabel.setAttribute("for", fieldId);

    const tooltip = document.createElement("span");
    tooltip.className = "inspector-tooltip";

    const labelText = document.createElement("span");
    labelText.className = "inspector-tooltip__trigger";
    labelText.textContent = "Run at 60 FPS (_UPDATE60)";
    labelText.setAttribute("tabindex", "0");
    labelText.setAttribute("role", "button");
    tooltip.appendChild(labelText);

    const tooltipContent = document.createElement("div");
    tooltipContent.className = "inspector-tooltip__content";
    tooltipContent.setAttribute("role", "tooltip");
    const tooltipId = `${fieldId}_tooltip`;
    tooltipContent.id = tooltipId;
    labelText.setAttribute("aria-describedby", tooltipId);

    const tooltipIntro = document.createElement("p");
    tooltipIntro.append("When ");
    const tooltipUpdate60 = document.createElement("code");
    tooltipUpdate60.textContent = "_UPDATE60()";
    tooltipIntro.append(tooltipUpdate60, " is defined instead of ");
    const tooltipUpdate = document.createElement("code");
    tooltipUpdate.textContent = "_UPDATE()";
    tooltipIntro.append(tooltipUpdate, ", PICO-8 will run in 60fps mode:");
    tooltipContent.appendChild(tooltipIntro);

    const tooltipList = document.createElement("ul");
    tooltipList.className = "inspector-tooltip__list";
    const listItemA = document.createElement("li");
    listItemA.append("both ");
    const listCodeA = document.createElement("code");
    listCodeA.textContent = "_UPDATE60()";
    listItemA.append(listCodeA, " and ");
    const listCodeB = document.createElement("code");
    listCodeB.textContent = "_DRAW()";
    listItemA.append(listCodeB, " are called at 60fps");
    tooltipList.appendChild(listItemA);
    const listItemB = document.createElement("li");
    listItemB.textContent =
      "half the PICO-8 CPU is available per frame before dropping down to 30fps";
    tooltipList.appendChild(listItemB);
    tooltipContent.appendChild(tooltipList);

    const tooltipNote = document.createElement("p");
    tooltipNote.className = "inspector-tooltip__note";
    tooltipNote.append(
      "Note that not all host machines are capable of running at 60fps. Older machines, and / or web versions might also request PICO-8 to run at 30 fps (or 15 fps), even when the PICO-8 CPU is not over capacity. In this case, multiple "
    );
    const noteCode = document.createElement("code");
    noteCode.textContent = "_UPDATE60";
    tooltipNote.append(noteCode, " calls are made for every ");
    const noteDrawCode = document.createElement("code");
    noteDrawCode.textContent = "_DRAW";
    tooltipNote.append(noteDrawCode, " call in the same way.");
    tooltipContent.appendChild(tooltipNote);

    tooltip.appendChild(tooltipContent);
    this.#enhanceInspectorTooltip(tooltip);
    fpsLabel.appendChild(tooltip);
    fpsField.appendChild(fpsLabel);

    const fpsToggle = document.createElement("input");
    fpsToggle.type = "checkbox";
    fpsToggle.id = fieldId;
    fpsToggle.checked = Boolean(this.projectSettings.use60Fps);
    fpsToggle.addEventListener("change", () => {
      this.projectSettings.use60Fps = fpsToggle.checked;
      this.#handleProjectSettingsChanged();
    });
    fpsField.appendChild(fpsToggle);

    this.inspectorContent.appendChild(fpsField);
  }

  /**
   * Updates the active inspector view flag.
   *
   * @param {InspectorView} view Target inspector view.
   */
  #setInspectorView(view) {
    if (this.inspectorView === view) {
      return;
    }
    this.inspectorView = view;
    this.#updateProjectSettingsToggle();
  }

  /**
   * Synchronizes the project settings toggle button appearance/state.
   */
  #updateProjectSettingsToggle() {
    if (!this.projectSettingsButton) {
      return;
    }
    const isActive = this.inspectorView === "project";
    this.projectSettingsButton.classList.toggle("is-active", isActive);
    this.projectSettingsButton.setAttribute(
      "aria-pressed",
      isActive ? "true" : "false"
    );
  }

  /**
   * Handles updates to project-level configuration values.
   */
  #handleProjectSettingsChanged() {
    if (typeof this.generator.setProjectSettings === "function") {
      this.generator.setProjectSettings({ ...this.projectSettings });
    }
    this.#refreshLuaOutput();
    this.persistenceManager.schedulePersist();
  }

  /**
   * Updates the stored default value for a variable and refreshes the inspector.
   *
   * @param {string} variableId Variable identifier.
   * @param {unknown} nextValue Candidate default value.
   */
  #setVariableDefault(variableId, nextValue) {
    const variable = this.variables.get(variableId);
    if (!variable) {
      return;
    }

    const normalized = this.#normalizeVariableDefault(
      variable.type,
      nextValue
    );
    if (this.#areVariableDefaultsEqual(variable.defaultValue, normalized)) {
      return;
    }

    variable.defaultValue = normalized;
    this.selectedVariableId = variableId;
    this.#renderInspectorState();
    this.#refreshLuaOutput();
    this.persistenceManager.schedulePersist();
  }

  /**
   * Provides the initial default value for the supplied variable type.
   *
   * @param {VariableType} type Variable type descriptor.
   * @returns {VariableDefaultValue}
   */
  #defaultVariableValue(type) {
    switch (type) {
      case "number":
        return 0;
      case "string":
        return "";
      case "table":
        return [];
      case "boolean":
        return false;
      default:
        return null;
    }
  }

  /**
   * Normalizes an arbitrary value so it is valid for the requested variable type.
   *
   * @param {VariableType} type Variable type descriptor.
   * @param {unknown} value Candidate default value.
   * @returns {VariableDefaultValue}
   */
  #normalizeVariableDefault(type, value) {
    const numericPattern =
      /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/;

    switch (type) {
      case "number": {
        if (typeof value === "number" && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            return 0;
          }
          if (numericPattern.test(trimmed)) {
            return Number.parseFloat(trimmed);
          }
        }
        return 0;
      }
      case "boolean": {
        if (typeof value === "boolean") {
          return value;
        }
        if (typeof value === "number") {
          return value !== 0;
        }
        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase();
          if (!normalized) {
            return false;
          }
          if (["true", "1", "yes", "y"].includes(normalized)) {
            return true;
          }
          if (["false", "0", "no", "n"].includes(normalized)) {
            return false;
          }
        }
        return Boolean(value);
      }
      case "string": {
        if (value == null) {
          return "";
        }
        if (Array.isArray(value)) {
          return value
            .map((entry) =>
              typeof entry?.value === "string" ? entry.value : ""
            )
            .filter((entry) => entry.length)
            .join(", ");
        }
        return String(value);
      }
      case "table": {
        const entries = [];
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            const normalized = this.#normalizeTableDefaultEntry(entry);
            if (normalized) {
              entries.push(normalized);
            }
          });
        } else if (
          value &&
          typeof value === "object" &&
          Array.isArray(/** @type {{ entries?: Array<unknown> }} */ (value).entries)
        ) {
          const payload = /** @type {{ entries: Array<unknown> }} */ (value);
          payload.entries.forEach((entry) => {
            const normalized = this.#normalizeTableDefaultEntry(entry);
            if (normalized) {
              entries.push(normalized);
            }
          });
        } else if (value != null && value !== "") {
          const normalized = this.#normalizeTableDefaultEntry({ value });
          if (normalized) {
            entries.push(normalized);
          }
        }
        return entries;
      }
      default: {
        if (value == null) {
          return null;
        }
        if (Array.isArray(value)) {
          return value.length ? value[0]?.value ?? null : null;
        }
        if (typeof value === "boolean" || typeof value === "number") {
          return value;
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            return null;
          }
          const lowered = trimmed.toLowerCase();
          if (lowered === "true") {
            return true;
          }
          if (lowered === "false") {
            return false;
          }
          if (numericPattern.test(trimmed)) {
            return Number.parseFloat(trimmed);
          }
          return trimmed;
        }
        return String(value);
      }
    }
  }

  /**
   * Normalizes a raw table default entry descriptor.
   *
   * @param {unknown} entry Candidate entry value.
   * @returns {TableDefaultEntry | null}
   */
  #normalizeTableDefaultEntry(entry) {
    if (entry == null) {
      return null;
    }

    if (typeof entry === "string") {
      return {
        id: this.#allocateTableDefaultEntryId(),
        key: "",
        value: entry.trim(),
      };
    }

    if (typeof entry === "number" || typeof entry === "boolean") {
      return {
        id: this.#allocateTableDefaultEntryId(),
        key: "",
        value: String(entry),
      };
    }

    if (typeof entry === "object" && !Array.isArray(entry)) {
      const record = /** @type {{ id?: unknown, key?: unknown, value?: unknown }} */ (
        entry
      );
      const id =
        typeof record.id === "string" && record.id.trim().length
          ? record.id.trim()
          : this.#allocateTableDefaultEntryId();
      const key =
        typeof record.key === "string" ? record.key.trim() : "";
      let rawValue = record.value;
      if (rawValue == null && typeof record.entry === "string") {
        rawValue = record.entry;
      }
      const value =
        rawValue == null ? "" : String(rawValue).trim();
      return { id, key, value };
    }

    return null;
  }

  /**
   * Allocates a unique identifier for a table default entry.
   *
   * @returns {string}
   */
  #allocateTableDefaultEntryId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return `tbl_${crypto.randomUUID()}`;
    }
    return `tbl_${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Produces a string representation of a variable default for inspector inputs.
   *
   * @param {WorkspaceVariable} variable Variable descriptor.
   * @returns {string}
   */
  #formatVariableDefaultForDisplay(variable) {
    if (variable.type === "number") {
      return typeof variable.defaultValue === "number"
        ? String(variable.defaultValue)
        : "0";
    }

    if (variable.defaultValue == null) {
      return "";
    }

    if (Array.isArray(variable.defaultValue)) {
      return variable.defaultValue
        .map((entry) => (typeof entry?.value === "string" ? entry.value : ""))
        .filter((text) => text.length)
        .join(", ");
    }

    return String(variable.defaultValue);
  }

  /**
   * Determines whether two variable defaults are equivalent.
   *
   * @param {VariableDefaultValue} a Existing value.
   * @param {VariableDefaultValue} b Candidate value.
   * @returns {boolean}
   */
  #areVariableDefaultsEqual(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let index = 0; index < a.length; index += 1) {
        const left = a[index];
        const right = b[index];
        if (!right) {
          return false;
        }
        if (left.id !== right.id) {
          return false;
        }
        if (left.key !== right.key) {
          return false;
        }
        if (left.value !== right.value) {
          return false;
        }
      }
      return true;
    }
    return Object.is(a, b);
  }

  /**
   * Collects variable metadata for Lua generation.
   *
   * @returns {Array<{ id: string, name: string, type: VariableType, defaultValue: VariableDefaultValue }>}
   */
  #getGeneratorVariableMetadata() {
    return this.variableOrder
      .map((variableId) => this.variables.get(variableId))
      .filter((entry) => Boolean(entry))
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        type: entry.type,
        defaultValue: entry.defaultValue,
      }));
  }

  /**
   * Highlights the active variable in the overview sidebar.
   */
  #highlightVariableSelection() {
    if (!this.variableListElement) {
      return;
    }

    const rows = this.variableListElement.querySelectorAll(".overview-item");
    rows.forEach((element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }
      const variableId = element.dataset.variableId ?? "";
      const isSelected = Boolean(
        this.selectedVariableId && variableId === this.selectedVariableId
      );
      element.classList.toggle("is-selected", isSelected);
      if (isSelected) {
        element.setAttribute("aria-current", "true");
        element.setAttribute("aria-pressed", "true");
      } else {
        element.removeAttribute("aria-current");
        element.setAttribute("aria-pressed", "false");
      }
    });
  }

  /**
   * Renders inspector controls for the supplied variable entry.
   *
   * @param {WorkspaceVariable} variable Variable to display in the inspector.
   */
  #renderVariableInspector(variable) {
    this.inspectorContent.innerHTML = "";

    const nameField = document.createElement("div");
    nameField.className = "inspector-field";
    const nameLabel = document.createElement("label");
    const nameId = `${variable.id}_name`;
    nameLabel.setAttribute("for", nameId);
    nameLabel.textContent = "Variable Name";
    nameField.appendChild(nameLabel);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = nameId;
    nameInput.value = variable.name;
    nameInput.placeholder = "Variable";
    nameInput.addEventListener("change", () => {
      this.#setVariableName(variable.id, nameInput.value);
    });
    nameField.appendChild(nameInput);
    this.inspectorContent.appendChild(nameField);

    const typeField = document.createElement("div");
    typeField.className = "inspector-field";
    const typeLabel = document.createElement("label");
    const typeId = `${variable.id}_type`;
    typeLabel.setAttribute("for", typeId);
    typeLabel.textContent = "Variable Type";
    typeField.appendChild(typeLabel);

    const typeSelect = document.createElement("select");
    typeSelect.id = typeId;
    this.#getVariableTypeOptions().forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      typeSelect.appendChild(opt);
    });
    typeSelect.value = variable.type;
    typeSelect.addEventListener("change", () => {
      const next = this.#normalizeVariableType(typeSelect.value);
      this.#setVariableType(variable.id, next);
      typeSelect.value = next;
    });
    typeField.appendChild(typeSelect);
    this.inspectorContent.appendChild(typeField);

    const defaultField = document.createElement("div");
    defaultField.className = "inspector-field";
    const defaultLabel = document.createElement("label");
    const defaultId = `${variable.id}_default`;
    defaultLabel.setAttribute("for", defaultId);
    defaultLabel.textContent = "Default Value";
    defaultField.appendChild(defaultLabel);

    if (variable.type === "boolean") {
      const defaultToggle = document.createElement("input");
      defaultToggle.type = "checkbox";
      defaultToggle.id = defaultId;
      defaultToggle.checked = Boolean(variable.defaultValue);
      defaultToggle.addEventListener("change", () => {
        this.#setVariableDefault(variable.id, defaultToggle.checked);
      });
      defaultField.appendChild(defaultToggle);
    } else if (variable.type === "number") {
      const defaultInput = document.createElement("input");
      defaultInput.type = "number";
      defaultInput.id = defaultId;
      defaultInput.value = this.#formatVariableDefaultForDisplay(variable);
      defaultInput.addEventListener("change", () => {
        this.#setVariableDefault(variable.id, defaultInput.value);
      });
      defaultField.appendChild(defaultInput);
    } else if (variable.type === "table") {
      const editor = this.#buildTableDefaultEditor(variable);
      defaultField.appendChild(editor);
    } else {
      const defaultInput = document.createElement("input");
      defaultInput.type = "text";
      defaultInput.id = defaultId;
      defaultInput.value = this.#formatVariableDefaultForDisplay(variable);
      defaultInput.placeholder = "No default";
      defaultInput.addEventListener("change", () => {
        this.#setVariableDefault(variable.id, defaultInput.value);
      });
      defaultField.appendChild(defaultInput);
    }

    this.inspectorContent.appendChild(defaultField);
  }

  /**
   * Builds the editable UI for table variable defaults.
   *
   * @param {WorkspaceVariable} variable Variable descriptor.
   * @returns {HTMLElement}
   */
  #buildTableDefaultEditor(variable) {
    const editor = document.createElement("div");
    editor.className = "table-default-editor";

    const toolbar = document.createElement("div");
    toolbar.className = "table-default-toolbar";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "table-default-add";
    addButton.textContent = "+";
    addButton.setAttribute("aria-label", "Add entry");
    addButton.title = "Add entry";
    addButton.addEventListener("click", () => {
      this.#addTableDefaultEntry(variable.id);
    });
    toolbar.appendChild(addButton);

    editor.appendChild(toolbar);

    const list = document.createElement("div");
    list.className = "table-default-list";

    const entries = Array.isArray(variable.defaultValue)
      ? variable.defaultValue
      : [];

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "table-default-empty";
      empty.textContent = "No entries yet";
      list.appendChild(empty);
    }

    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "table-default-row";
      row.dataset.entryId = entry.id;

      const keyInput = document.createElement("input");
      keyInput.type = "text";
      keyInput.placeholder = "Key (optional)";
      keyInput.value = entry.key;
      keyInput.dataset.field = "key";
      keyInput.addEventListener("change", () => {
        this.#updateTableDefaultEntry(variable.id, entry.id, {
          key: keyInput.value,
        });
      });
      row.appendChild(keyInput);

      const valueInput = document.createElement("input");
      valueInput.type = "text";
      valueInput.placeholder = "Value";
      valueInput.value = entry.value;
      valueInput.dataset.field = "value";
      valueInput.addEventListener("change", () => {
        this.#updateTableDefaultEntry(variable.id, entry.id, {
          value: valueInput.value,
        });
      });
      row.appendChild(valueInput);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className =
        "overview-item-action overview-item-action--remove";
      removeButton.title = `Delete ${entry.key || entry.value || "entry"}`;
      removeButton.setAttribute(
        "aria-label",
        `Delete ${entry.key || entry.value || "entry"}`
      );
      removeButton.addEventListener("click", () => {
        this.#removeTableDefaultEntry(variable.id, entry.id);
      });
      removeButton.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      row.appendChild(removeButton);

      list.appendChild(row);
    });

    editor.appendChild(list);

    const focusRequest = this.pendingVariableInspectorFocus;
    this.pendingVariableInspectorFocus = null;
    if (focusRequest && focusRequest.variableId === variable.id) {
      requestAnimationFrame(() => {
        const selector = `.table-default-row[data-entry-id="${focusRequest.entryId}"] input[data-field="${focusRequest.target}"]`;
        const target = editor.querySelector(selector);
        if (target instanceof HTMLInputElement) {
          target.focus();
          if (typeof target.select === "function") {
            target.select();
          }
        }
      });
    }

    return editor;
  }

  /**
   * Appends a new table default entry for the supplied variable.
   *
   * @param {string} variableId Target variable identifier.
   */
  #addTableDefaultEntry(variableId) {
    const variable = this.variables.get(variableId);
    if (!variable || variable.type !== "table") {
      return;
    }

    const existing = Array.isArray(variable.defaultValue)
      ? variable.defaultValue.slice()
      : [];
    const entry = {
      id: this.#allocateTableDefaultEntryId(),
      key: "",
      value: "",
    };
    existing.push(entry);

    this.pendingVariableInspectorFocus = {
      variableId,
      entryId: entry.id,
      target: "value",
    };

    this.#setVariableDefault(variableId, existing);
  }

  /**
   * Updates a table default entry for the supplied variable.
   *
   * @param {string} variableId Target variable identifier.
   * @param {string} entryId Entry identifier to update.
   * @param {{ key?: string, value?: string }} updates Field overrides.
   */
  #updateTableDefaultEntry(variableId, entryId, updates) {
    const variable = this.variables.get(variableId);
    if (!variable || variable.type !== "table") {
      return;
    }

    const current = Array.isArray(variable.defaultValue)
      ? variable.defaultValue
      : [];
    const next = current.map((entry) => {
      if (entry.id !== entryId) {
        return entry;
      }
      const nextKey =
        updates.key !== undefined ? String(updates.key) : entry.key;
      const nextValue =
        updates.value !== undefined ? String(updates.value) : entry.value;
      return { ...entry, key: nextKey, value: nextValue };
    });

    this.#setVariableDefault(variableId, next);
  }

  /**
   * Removes a table default entry from the supplied variable.
   *
   * @param {string} variableId Target variable identifier.
   * @param {string} entryId Entry identifier slated for removal.
   */
  #removeTableDefaultEntry(variableId, entryId) {
    const variable = this.variables.get(variableId);
    if (!variable || variable.type !== "table") {
      return;
    }

    const current = Array.isArray(variable.defaultValue)
      ? variable.defaultValue
      : [];
    const next = current.filter((entry) => entry.id !== entryId);
    if (next.length === current.length) {
      return;
    }

    this.pendingVariableInspectorFocus = null;
    this.#setVariableDefault(variableId, next);
  }

  /**
   * Updates the stored name for a variable and refreshes the overview.
   *
   * @param {string} variableId Variable identifier.
   * @param {string} nextName Requested variable name.
   */
  #setVariableName(variableId, nextName) {
    const variable = this.variables.get(variableId);
    if (!variable) {
      return;
    }

    const previousName = variable.name;
    const trimmed = nextName.trim();
    if (variable.name === trimmed) {
      return;
    }

    variable.name = trimmed;
    this.selectedVariableId = variableId;

    const previousNormalized = previousName.trim();
    this.graph.nodes.forEach((node) => {
      if (node.type !== "set_var" && node.type !== "get_var") {
        return;
      }

      const nodeVariableId =
        typeof node.properties.variableId === "string"
          ? node.properties.variableId
          : "";
      if (nodeVariableId === variableId) {
        this.graph.setNodeProperty(node.id, "name", trimmed);
        return;
      }

      const nodeName =
        typeof node.properties.name === "string"
          ? node.properties.name.trim()
          : "";
      if (
        !nodeVariableId &&
        previousNormalized &&
        nodeName === previousNormalized
      ) {
        this.graph.setNodeProperty(node.id, "name", trimmed);
        this.graph.setNodeProperty(node.id, "variableId", variableId);
      }
    });

    this.#renderOverview();
    this.#highlightVariableSelection();
    this.#renderInspectorState();
    this.#refreshLuaOutput();
    this.persistenceManager.schedulePersist();
  }

  /**
   * Updates the stored type for a variable and refreshes dependent UI.
   *
   * @param {string} variableId Variable identifier.
   * @param {VariableType} nextType Next variable type.
   */
  #setVariableType(variableId, nextType) {
    const variable = this.variables.get(variableId);
    const normalizedType = this.#normalizeVariableType(nextType);
    if (!variable || variable.type === normalizedType) {
      return;
    }

    variable.type = normalizedType;
    variable.defaultValue = this.#normalizeVariableDefault(
      normalizedType,
      variable.defaultValue
    );
    this.selectedVariableId = variableId;
    this.#renderOverview();
    this.#highlightVariableSelection();
    this.#renderInspectorState();

    const normalizedName = this.#normalizeVariableName(variable.name);
    let connectionsMutated = false;
    this.graph.nodes.forEach((node) => {
      if (!this.#nodeReferencesVariable(node, variableId, normalizedName)) {
        return;
      }
      const mutated = this.#refreshVariableNode(node.id);
      connectionsMutated = connectionsMutated || mutated;
    });
    if (connectionsMutated) {
      this.#renderConnections();
    }
    this.#refreshLuaOutput();
    this.persistenceManager.schedulePersist();
  }

  /**
   * Removes a global variable from the workspace and clears dependent references.
   *
   * @param {string} variableId Variable identifier slated for removal.
   */
  #deleteVariable(variableId) {
    const variable = this.variables.get(variableId);
    if (!variable) {
      return;
    }

    this.#closeTypeDropdown();
    this.#cancelVariableRename({ commit: false });

    this.variables.delete(variableId);
    const orderIndex = this.variableOrder.indexOf(variableId);
    if (orderIndex !== -1) {
      this.variableOrder.splice(orderIndex, 1);
    }

    const fallbackName = variable.name || variable.id;
    const normalizedName = this.#normalizeVariableName(variable.name);
    this.graph.nodes.forEach((node) => {
      if (node.type !== "set_var" && node.type !== "get_var") {
        return;
      }
      const nodeVariableId =
        typeof node.properties.variableId === "string"
          ? node.properties.variableId
          : "";
      if (nodeVariableId === variableId) {
        this.graph.setNodeProperty(node.id, "variableId", "");
        this.graph.setNodeProperty(node.id, "name", fallbackName);
        return;
      }

      if (!nodeVariableId && normalizedName) {
        const nodeName =
          typeof node.properties.name === "string"
            ? node.properties.name.trim()
            : "";
        if (nodeName && nodeName === normalizedName) {
          this.graph.setNodeProperty(node.id, "name", nodeName);
        }
      }
    });

    if (this.selectedVariableId === variableId) {
      this.selectedVariableId = null;
    }

    this.#renderOverview();
    this.#renderInspectorState();
    this.#refreshLuaOutput();
    this.persistenceManager.schedulePersist();
  }

  /**
   * Reorders variables within the overview panel based on drag gestures.
   *
   * @param {string} variableId Variable identifier being repositioned.
   * @param {number} targetIndex Desired zero-based insertion index.
   */
  #reorderVariable(variableId, targetIndex) {
    const currentIndex = this.variableOrder.indexOf(variableId);
    if (currentIndex === -1) {
      return;
    }

    if (this.variableOrder.length <= 1) {
      return;
    }

    const normalizedIndex = Number.isFinite(targetIndex)
      ? Math.max(0, Math.floor(targetIndex))
      : 0;
    if (normalizedIndex === currentIndex) {
      return;
    }

    const [entry] = this.variableOrder.splice(currentIndex, 1);
    const insertionIndex = Math.max(
      0,
      Math.min(normalizedIndex, this.variableOrder.length)
    );
    this.variableOrder.splice(insertionIndex, 0, entry);
    this.#renderVariableList();
    this.#highlightVariableSelection();
    this.persistenceManager.schedulePersist();
  }

  /**
   * Presents a dropdown menu for updating a variable type.
   *
   * @param {string} variableId Target variable identifier.
   * @param {HTMLButtonElement} trigger Trigger button opening the menu.
   * @param {HTMLElement} anchor Element used to anchor the dropdown position.
   */
  #openVariableTypeDropdown(variableId, trigger, anchor) {
    const variable = this.variables.get(variableId);
    if (!variable) {
      return;
    }
    this.#openTypeDropdown({
      context: { kind: "variable", variableId },
      trigger,
      anchor,
      currentType: variable.type,
      onSelect: (nextType) => {
        if (nextType !== variable.type) {
          this.#setVariableType(variable.id, nextType);
        }
      },
    });
  }

  /**
   * Presents the shared type dropdown with the supplied configuration.
   *
   * @param {{
   *   context: TypeDropdownContext,
   *   trigger: HTMLButtonElement,
   *   anchor: HTMLElement,
   *   currentType: VariableType,
   *   onSelect: (type: VariableType) => void,
   *   options?: Array<{ value: VariableType, label: string }>,
   *   placement?: 'bottom' | 'top',
   * }} options Dropdown configuration.
   */
  #openTypeDropdown({
    context,
    trigger,
    anchor,
    currentType,
    onSelect,
    options,
    placement = "bottom",
  }) {
    this.#closeTypeDropdown();

    const dropdown = document.createElement("div");
    dropdown.className = "variable-type-dropdown";
    dropdown.setAttribute("role", "menu");
    dropdown.tabIndex = -1;

    /** @type {Array<HTMLButtonElement>} */
    const buttons = [];

    const entries =
      Array.isArray(options) && options.length
        ? options
        : this.#getVariableTypeOptions();

    entries.forEach((entry) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "variable-type-option";
      option.dataset.variableType = entry.value;
      option.textContent = entry.label;
      option.setAttribute("role", "menuitemradio");
      option.setAttribute(
        "aria-checked",
        entry.value === currentType ? "true" : "false"
      );
      option.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (entry.value !== currentType) {
          onSelect(entry.value);
        }
        this.#closeTypeDropdown();
      });
      option.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const index = buttons.indexOf(option);
          if (index === -1) {
            return;
          }
          const delta = event.key === "ArrowDown" ? 1 : -1;
          const nextIndex = (index + delta + buttons.length) % buttons.length;
          const next = buttons[nextIndex];
          next.focus();
        } else if (event.key === "Escape") {
          event.preventDefault();
          this.#closeTypeDropdown({ restoreFocus: true });
        }
      });
      buttons.push(option);
      dropdown.appendChild(option);
    });

    dropdown.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    if (placement === "top") {
      dropdown.classList.add("is-above");
    }

    anchor.appendChild(dropdown);
    trigger.setAttribute("aria-expanded", "true");
    this.typeDropdown = { container: dropdown, trigger, context, onSelect };

    requestAnimationFrame(() => {
      const target = dropdown.querySelector('button[aria-checked="true"]');
      if (target instanceof HTMLButtonElement) {
        target.focus();
      } else if (buttons[0]) {
        buttons[0].focus();
      }
    });
  }

  /**
   * Presents the type dropdown for a custom event parameter row.
   *
   * @param {string} nodeId Custom event node identifier.
   * @param {string} parameterId Parameter identifier.
   * @param {HTMLButtonElement} trigger Trigger button opening the menu.
   * @param {HTMLElement} anchor Element used to anchor the dropdown position.
   * @param {(type: VariableType) => void} [afterSelect] Callback fired after a selection is applied.
   */
  #openCustomEventParameterTypeDropdown(
    nodeId,
    parameterId,
    trigger,
    anchor,
    afterSelect
  ) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "custom_event") {
      return;
    }
    const { parameters } = this.#sanitizeCustomEventParameters(node);
    const parameter = parameters.find((entry) => entry.id === parameterId);
    if (!parameter) {
      return;
    }
    this.#openTypeDropdown({
      context: { kind: "custom_event_parameter", nodeId, parameterId },
      trigger,
      anchor,
      currentType: parameter.type,
      onSelect: (nextType) => {
        this.#setCustomEventParameterType(nodeId, parameterId, nextType);
        afterSelect?.(nextType);
      },
    });
  }

  /**
   * Closes the active type dropdown if present.
   *
   * @param {{ restoreFocus?: boolean }} [options] Behaviour overrides.
   */
  #closeTypeDropdown(options = {}) {
    const state = this.typeDropdown;
    const container = state.container;
    const trigger = state.trigger;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
    if (container && container.isConnected) {
      container.remove();
    }
    if (options.restoreFocus && trigger) {
      trigger.focus();
    }
    this.typeDropdown = {
      container: null,
      trigger: null,
      context: null,
      onSelect: null,
    };
  }

  /**
   * Begins inline rename mode for a variable list entry.
   *
   * @param {string} variableId Target variable identifier.
   * @param {HTMLElement} labelElement Label element that was clicked.
   */
  #startVariableRename(variableId, labelElement) {
    this.#closeTypeDropdown();
    const variable = this.variables.get(variableId);
    if (!variable) {
      return;
    }

    const row = labelElement.closest(".overview-item--variable");
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const parent = labelElement.parentElement;
    if (!(parent instanceof HTMLElement)) {
      return;
    }

    this.#cancelVariableRename({ commit: true });

    const wasDraggable = Boolean(row.draggable);
    row.draggable = false;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "overview-item-rename";
    input.value = variable.name;
    input.setAttribute(
      "aria-label",
      `Rename variable ${variable.name || variable.id}`
    );
    input.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    input.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    const finish = (commit) => {
      if (
        !this.activeVariableRename ||
        this.activeVariableRename.input !== input
      ) {
        return;
      }
      const value = input.value;
      this.#cancelVariableRename({ commit, value });
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("blur", () => {
      finish(true);
    });

    labelElement.hidden = true;
    parent.insertBefore(input, labelElement);

    this.activeVariableRename = {
      variableId,
      input,
      label: labelElement,
      container: row,
      wasDraggable,
    };

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  /**
   * Cancels the active inline variable rename, optionally committing the value.
   *
   * @param {{ commit?: boolean, value?: string }} [options] Behaviour overrides.
   */
  #cancelVariableRename(options = {}) {
    if (!this.activeVariableRename) {
      return;
    }

    const { input, label, variableId, container, wasDraggable } =
      this.activeVariableRename;
    const value =
      typeof options.value === "string" ? options.value : input.value;

    if (input.isConnected) {
      input.remove();
    }
    label.hidden = false;
    if (container.isConnected) {
      container.draggable = wasDraggable;
    }

    this.activeVariableRename = null;

    if (options.commit) {
      this.#setVariableName(variableId, value);
    }
  }

  /**
   * Applies the provided selection set and designates a primary node.
   *
   * @param {Array<string>} nodeIds Collection of node identifiers to select.
   * @param {string | undefined} primaryId Preferred primary selection identifier.
   */
  #setSelection(nodeIds, primaryId) {
    this.#cancelVariableRename({ commit: true });
    this.#setInspectorView("default");
  this.contextMenuManager?.hide();
    if (nodeIds.length) {
      this.selectedVariableId = null;
    }

    this.selectedNodeIds.clear();
    nodeIds.forEach((id) => {
      if (this.graph.nodes.has(id)) {
        this.selectedNodeIds.add(id);
      }
    });

    if (primaryId && this.selectedNodeIds.has(primaryId)) {
      this.selectedNodeId = primaryId;
    } else {
      const iterator = this.selectedNodeIds.values().next();
      this.selectedNodeId = iterator.done ? undefined : iterator.value;
    }

    this.#applySelectionState();
  }

  /**
   * Synchronizes DOM affordances and inspector content with the active selection.
   */
  #applySelectionState() {
    this.nodeElements.forEach((element, id) => {
      const isSelected = this.selectedNodeIds.has(id);
      const isPrimary = isSelected && this.selectedNodeId === id;
      element.classList.toggle("is-selected", isSelected);
      element.classList.toggle("is-selection-primary", isPrimary);
    });

    this.#raiseSelectedNodes();

    const selectionCount = this.selectedNodeIds.size;
    this.duplicateNodeButton.disabled = selectionCount !== 1;
    this.deleteNodeButton.disabled = selectionCount === 0;

    if (
      selectionCount === 1 &&
      this.selectedNodeId &&
      this.inspectorView === "default"
    ) {
      this.#renderInspector(this.selectedNodeId);
    } else {
      this.inspectorContent.innerHTML = "";
      if (selectionCount > 1) {
        const message = document.createElement("p");
        message.className = "inspector-empty";
        message.textContent = "Multiple nodes selected.";
        this.inspectorContent.appendChild(message);
      }
    }

    this.#renderInspectorState();
  }

  /**
   * Raises selected nodes above unselected nodes to ensure they render on top.
   *
   * @returns {void}
   */
  #raiseSelectedNodes() {
    if (!(this.nodeLayer instanceof HTMLElement)) {
      return;
    }

    if (!this.selectedNodeIds.size) {
      return;
    }

    const primaryId = this.selectedNodeId;

    this.selectedNodeIds.forEach((id) => {
      if (id === primaryId) {
        return;
      }
      const element = this.nodeElements.get(id);
      if (
        element &&
        element.parentElement === this.nodeLayer &&
        element.isConnected
      ) {
        this.nodeLayer.appendChild(element);
      }
    });

    if (primaryId && this.selectedNodeIds.has(primaryId)) {
      const primaryElement = this.nodeElements.get(primaryId);
      if (
        primaryElement &&
        primaryElement.parentElement === this.nodeLayer &&
        primaryElement.isConnected
      ) {
        this.nodeLayer.appendChild(primaryElement);
      }
    }
  }

  /**
   * Determines whether the supplied target represents empty workspace space.
   *
   * @param {Element} target Candidate event target.
   * @returns {boolean}
   */
  #isWorkspaceBackgroundTarget(target) {
    if (
      target === this.workspaceElement ||
      target === this.nodeLayer ||
      target === this.connectionLayer ||
      this.marqueeManager?.isMarqueeElement(target)
    ) {
      return true;
    }

    if (target.closest(".blueprint-node")) {
      return false;
    }

    if (this.contextMenuManager?.isTargetInside(target)) {
      return false;
    }

    return this.workspaceElement.contains(target);
  }

  /**
   * Attempts to match a configured background spawn shortcut for the current pointer event.
   *
   * @param {PointerEvent} event Pointer event payload.
   * @returns {NormalizedSpawnShortcut | null}
   */
  #matchBackgroundSpawnShortcut(event) {
    const shortcuts = this.spawnShortcutLookup.get("background");
    if (!shortcuts || !shortcuts.length) {
      return null;
    }

    for (const shortcut of shortcuts) {
      if (event.button !== shortcut.button) {
        continue;
      }

      if (!this.activeShortcutKeys.has(shortcut.key)) {
        continue;
      }

      if (!this.#validateShortcutModifiers(shortcut.modifiers, event)) {
        continue;
      }

      return shortcut;
    }

    return null;
  }

  /**
   * Spawns a node tied to a shortcut at the pointer location.
   *
   * @param {NormalizedSpawnShortcut} shortcut Normalized shortcut configuration.
   * @param {PointerEvent} event Pointer event payload.
   * @returns {import('../core/BlueprintNode.js').BlueprintNode | null}
   */
  #spawnShortcutNodeAtPointer(shortcut, event) {
    const workspaceElement = this.workspaceElement;
    if (!(workspaceElement instanceof HTMLElement)) {
      return null;
    }

    const navigator = this.navigationManager;
    if (!navigator) {
      return null;
    }

    const rect = workspaceElement.getBoundingClientRect();
    const screenPoint = {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    };
    const worldPoint = navigator.screenPointToWorld(screenPoint);
    return this.addNode(shortcut.definitionId, worldPoint);
  }

  /**
   * Normalizes configured spawn shortcuts into an indexed map keyed by context.
   *
   * @param {Array<WorkspaceSpawnShortcut>} shortcuts Raw workspace spawn shortcut configuration entries.
   * @returns {Map<'background', Array<NormalizedSpawnShortcut>>}
   */
  #normalizeSpawnShortcuts(shortcuts) {
    /** @type {Map<'background', Array<NormalizedSpawnShortcut>>} */
    const lookup = new Map();
    const allowedModifiers = new Set([
      "shift",
      "ctrl",
      "alt",
      "meta",
    ]);

    shortcuts.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }

      const rawKey =
        typeof entry.key === "string" ? entry.key.trim().toLowerCase() : "";
      if (!rawKey) {
        return;
      }

      const context = entry.context || "background";
      if (context !== "background") {
        return;
      }

      const definitionId =
        typeof entry.definitionId === "string"
          ? entry.definitionId.trim()
          : "";
      if (!definitionId) {
        return;
      }

      const button =
        typeof entry.button === "number" && Number.isFinite(entry.button)
          ? entry.button
          : 0;

      /** @type {Set<WorkspaceShortcutModifier>} */
      const modifiers = new Set();
      if (Array.isArray(entry.modifiers)) {
        entry.modifiers.forEach((modifier) => {
          if (typeof modifier !== "string") {
            return;
          }
          const normalizedModifier = modifier.trim().toLowerCase();
          if (allowedModifiers.has(normalizedModifier)) {
            modifiers.add(
              /** @type {WorkspaceShortcutModifier} */ (normalizedModifier)
            );
          }
        });
      }

      const shortcut = {
        key: rawKey,
        definitionId,
        button,
        modifiers,
      };
      const bucket = lookup.get("background");
      if (bucket) {
        bucket.push(shortcut);
      } else {
        lookup.set("background", [shortcut]);
      }
    });

    return lookup;
  }

  /**
   * Checks whether the supplied pointer event satisfies the expected modifier state.
   *
   * @param {Set<WorkspaceShortcutModifier>} required Required modifier keys.
   * @param {PointerEvent} event Pointer event payload.
   * @returns {boolean}
   */
  #validateShortcutModifiers(required, event) {
    return this.#validateKeyboardModifiers(required, event);
  }

  /**
   * Attempts to execute a command shortcut bound to the provided key event.
   *
   * @param {KeyboardEvent} event Keyboard event payload.
   * @param {string} normalizedKey Lowercase key identifier from the event.
   * @returns {boolean}
   */
  #dispatchCommandShortcut(event, normalizedKey) {
    if (!this.commandShortcuts.length) {
      return false;
    }

    const handlers = {
      copy: () => this.clipboardManager.copySelection(),
      cut: () => this.clipboardManager.cutSelection(),
      paste: () => {
        this.clipboardManager.paste();
        return true;
      },
      undo: () => {
        this.undo();
        return true;
      },
      redo: () => {
        this.redo();
        return true;
      },
      delete: () => {
        if (!this.selectedNodeIds.size) {
          return false;
        }
        const ids = [...this.selectedNodeIds];
        ids.forEach((id) => this.removeNode(id));
        return true;
      },
    };

    for (const shortcut of this.commandShortcuts) {
      if (shortcut.key !== normalizedKey) {
        continue;
      }

      if (!this.#validateKeyboardModifiers(shortcut.modifiers, event)) {
        continue;
      }

      const handler = handlers[shortcut.command];
      if (!handler) {
        continue;
      }

      const handled = handler();
      if (handled) {
        event.preventDefault();
        return true;
      }
    }

    return false;
  }

  /**
   * Normalizes command shortcuts from configuration.
   *
   * @param {Array<WorkspaceShortcut>} shortcuts Raw shortcut configuration entries.
   * @returns {Array<NormalizedCommandShortcut>}
   */
  #normalizeCommandShortcuts(shortcuts) {
    /** @type {Array<NormalizedCommandShortcut>} */
    const result = [];
    const allowedCommands = new Set([
      "copy",
      "cut",
      "paste",
      "undo",
      "redo",
      "delete",
    ]);

    shortcuts.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }

      if (entry.action !== "command") {
        return;
      }

      const rawKey =
        typeof entry.key === "string" ? entry.key.trim().toLowerCase() : "";
      if (!rawKey) {
        return;
      }

      const context = entry.context || "workspace";
      if (context !== "workspace") {
        return;
      }

      const command =
        typeof entry.command === "string"
          ? entry.command.trim().toLowerCase()
          : "";
      if (!command || !allowedCommands.has(command)) {
        return;
      }

      /** @type {Set<WorkspaceShortcutModifier>} */
      const modifiers = new Set();
      if (Array.isArray(entry.modifiers)) {
        entry.modifiers.forEach((modifier) => {
          if (typeof modifier !== "string") {
            return;
          }
          const normalizedModifier = modifier.trim().toLowerCase();
          switch (normalizedModifier) {
            case "shift":
            case "ctrl":
            case "alt":
            case "meta":
              modifiers.add(
                /** @type {WorkspaceShortcutModifier} */ (normalizedModifier)
              );
              break;
            default:
              break;
          }
        });
      }

      result.push({
        key: rawKey,
        command,
        modifiers,
      });
    });

    return result;
  }

  /**
   * Validates modifier keys for keyboard-driven shortcuts.
   *
   * @param {Set<WorkspaceShortcutModifier>} required Required modifier keys.
   * @param {KeyboardEvent | PointerEvent} event Native event payload.
   * @returns {boolean}
   */
  #validateKeyboardModifiers(required, event) {
    const modifierState = {
      shift: Boolean(event.shiftKey),
      ctrl: Boolean(event.ctrlKey),
      alt: Boolean(event.altKey),
      meta: Boolean(event.metaKey),
    };

    /** @type {Array<WorkspaceShortcutModifier>} */
    const modifierKeys = ["shift", "ctrl", "alt", "meta"];

    for (const modifier of modifierKeys) {
      const expected = required.has(modifier);
      const actual = modifierState[modifier];
      if (expected !== actual) {
        return false;
      }
    }

    return true;
  }

  /**
   * Renders the overview sidebar lists for events and variables.
   */
  #renderOverview() {
    this.#renderEventList();
    this.#renderVariableList();
    if (this.paletteManager) {
      this.paletteManager.render(this.paletteSearch.value);
    }
  }

  /**
   * Creates a new global variable node and focuses it.
   */
  #createGlobalVariable() {
    const variable = this.#registerVariable();
    this.selectedVariableId = variable.id;
    this.#renderOverview();
    this.#highlightVariableSelection();
    this.#renderInspectorState();
    this.#refreshLuaOutput();

    if (this.variableListElement) {
      const target = this.variableListElement.querySelector(
        `button.overview-item[data-variable-id="${variable.id}"]`
      );
      if (target instanceof HTMLButtonElement) {
        target.focus();
      }
    }
  }

  /**
   * Registers a new global variable entry.
   *
   * @param {{ name?: string, type?: VariableType }} [options] Optional variable overrides.
   * @returns {WorkspaceVariable}
   */
  #registerVariable(options = {}) {
    const providedName =
      typeof options.name === "string" ? options.name.trim() : "";
    const name = providedName || this.#suggestVariableName();
    const type = this.#normalizeVariableType(options.type ?? "any");
    this.variableCounter += 1;
    const id = `var_${this.variableCounter}`;
  const defaultValue = this.#defaultVariableValue(type);
  const entry = { id, name, type, defaultValue };
    this.variables.set(id, entry);
    this.variableOrder.push(id);
    this.persistenceManager.schedulePersist();
    return entry;
  }

  /**
   * Suggests a unique variable name.
   *
   * @returns {string}
   */
  #suggestVariableName() {
    const base = "var";
    const existing = new Set();
    this.variableOrder.forEach((variableId) => {
      const variable = this.variables.get(variableId);
      if (!variable) {
        return;
      }
      const raw = variable.name.trim();
      if (raw) {
        existing.add(raw.toLowerCase());
      }
    });
    this.graph.nodes.forEach((node) => {
      if (node.type === "set_var" || node.type === "get_var") {
        const raw =
          typeof node.properties.name === "string"
            ? node.properties.name.trim()
            : "";
        if (raw) {
          existing.add(raw.toLowerCase());
        }
      }
    });

    if (!existing.has(base)) {
      return base;
    }

    let index = 1;
    while (existing.has(`${base}${index}`)) {
      index += 1;
    }
    return `${base}${index}`;
  }

  /**
   * Normalizes a variable name for lookups.
   *
   * @param {string} name Raw variable name.
   * @returns {string}
   */
  #normalizeVariableName(name) {
    return name.trim().toLowerCase();
  }

  /**
   * Converts a variable type to a human-readable label.
   *
   * @param {VariableType} type Variable type identifier.
   * @returns {string}
   */
  #formatVariableType(type) {
    const entry = VARIABLE_TYPE_DEFINITIONS.find(
      (definition) => definition.value === type
    );
    return entry ? entry.label : "Any";
  }

  /**
   * Normalizes a raw variable type value to a supported type identifier.
   *
   * @param {unknown} value Candidate type value.
   * @returns {VariableType}
   */
  #normalizeVariableType(value) {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (
        SUPPORTED_VARIABLE_TYPES.has(
          /** @type {VariableType} */ (normalized)
        )
      ) {
        return /** @type {VariableType} */ (normalized);
      }
    }
    return "any";
  }

  /**
   * Returns the available variable type dropdown entries.
   *
   * @returns {Array<{ value: VariableType, label: string }>}
   */
  #getVariableTypeOptions() {
    return VARIABLE_TYPE_DEFINITIONS.map((entry) => ({ ...entry }));
  }

  /**
   * Determines whether the shared type dropdown is open for the supplied context.
   *
   * @param {TypeDropdownContext} context Target dropdown context.
   * @returns {boolean}
   */
  #isTypeDropdownOpen(context) {
    const state = this.typeDropdown;
    if (!state.context) {
      return false;
    }
    if (state.context.kind !== context.kind) {
      return false;
    }
    if (context.kind === "variable") {
      return (
        state.context.kind === "variable" &&
        state.context.variableId === context.variableId
      );
    }
    if (context.kind === "local_variable") {
      return (
        state.context.kind === "local_variable" &&
        state.context.nodeId === context.nodeId
      );
    }
    return (
      state.context.kind === "custom_event_parameter" &&
      state.context.nodeId === context.nodeId &&
      state.context.parameterId === context.parameterId
    );
  }

  /**
   * Locates a workspace variable by name using case-insensitive matching.
   *
   * @param {string} name Candidate variable name.
   * @returns {WorkspaceVariable | null}
   */
  #findVariableByName(name) {
    const normalized = this.#normalizeVariableName(name);
    if (!normalized) {
      return null;
    }

    for (const variableId of this.variableOrder) {
      const variable = this.variables.get(variableId);
      if (!variable) {
        continue;
      }
      if (this.#normalizeVariableName(variable.name) === normalized) {
        return variable;
      }
    }

    return null;
  }

  /**
   * Determines whether the supplied node references the provided workspace variable.
   *
   * @param {BlueprintNode} node Node to inspect.
   * @param {string} variableId Variable identifier.
   * @param {string} normalizedName Normalized variable name used for fallback matching.
   * @returns {boolean}
   */
  #nodeReferencesVariable(node, variableId, normalizedName) {
    if (node.type !== "set_var" && node.type !== "get_var") {
      return false;
    }

    const nodeVariableId =
      typeof node.properties.variableId === "string"
        ? node.properties.variableId
        : "";
    if (nodeVariableId && nodeVariableId === variableId) {
      return true;
    }

    if (!normalizedName) {
      return false;
    }

    const nodeName =
      typeof node.properties.name === "string" ? node.properties.name : "";
    if (!nodeName) {
      return false;
    }

    return this.#normalizeVariableName(nodeName) === normalizedName;
  }

  /**
   * Derives binding metadata for a variable node, including display name and type.
   *
   * @param {BlueprintNode} node Variable node reference.
   * @returns {{ displayName: string, type: VariableType, variableId: string | null }}
   */
  #resolveVariableBinding(node) {
    const rawName =
      typeof node.properties.name === "string"
        ? node.properties.name.trim()
        : "";
    const storedVariableId =
      typeof node.properties.variableId === "string" &&
      node.properties.variableId
        ? node.properties.variableId
        : "";

    let variable = storedVariableId
      ? this.variables.get(storedVariableId) ?? null
      : null;
    if (!variable && rawName) {
      variable = this.#findVariableByName(rawName);
    }

    const displayName = variable?.name?.trim() || rawName || "Variable";
    const type = variable?.type ?? "any";
    const resolvedVariableId = variable?.id ?? (storedVariableId || null);

    return { displayName, type, variableId: resolvedVariableId };
  }

  /**
   * Updates a variable node's DOM representation to match the active binding.
   *
   * @param {string} nodeId Node identifier to refresh.
   * @returns {boolean} Whether any connection kinds were mutated.
   */
  #refreshVariableNode(nodeId) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || (node.type !== "set_var" && node.type !== "get_var")) {
      return false;
    }

    const article = this.nodeElements.get(nodeId);
    if (!article) {
      return false;
    }

    const binding = this.#resolveVariableBinding(node);
    this.#applyVariableNodeTitle(article, node, binding);
    return this.#applyVariableNodePins(node, binding.type);
  }

  /**
   * Updates a local variable node's DOM representation to match its properties.
   *
   * @param {string} nodeId Node identifier to refresh.
   * @returns {boolean} Whether any connection kinds were mutated.
   */
  #refreshLocalVariableNode(nodeId) {
    const node = this.graph.nodes.get(nodeId);
    if (
      !node ||
      (node.type !== "set_local_var" && node.type !== "get_local_var")
    ) {
      return false;
    }

    const article = this.nodeElements.get(nodeId);
    if (!article) {
      return false;
    }

    const rawName =
      typeof node.properties.name === "string"
        ? node.properties.name.trim()
        : "";
    const displayName = rawName || "localVar";
    const normalizedType = this.#normalizeVariableType(
      node.properties.variableType
    );
    const type = normalizedType === "any" ? "number" : normalizedType;

    this.#applyVariableNodeTitle(article, node, { displayName, type });
    return this.#applyVariableNodePins(node, type);
  }

  /**
   * Applies variable-specific title styling to the supplied node header.
   *
   * @param {HTMLElement} article Node root element.
   * @param {BlueprintNode} node Node instance.
   * @param {{ displayName: string, type: VariableType }} binding Binding metadata.
   */
  #applyVariableNodeTitle(article, node, binding) {
    const header = article.querySelector(".node-header");
    const title = article.querySelector(".node-title");
    if (!(header instanceof HTMLElement) || !(title instanceof HTMLElement)) {
      return;
    }

    const isSetter =
      node.type === "set_var" || node.type === "set_local_var";
    const role = isSetter ? "set" : "get";
    const isLocal =
      node.type === "set_local_var" || node.type === "get_local_var";
    article.classList.add("blueprint-node--variable");
    article.dataset.variableType = binding.type;
    article.dataset.variableRole = role;
    article.dataset.variableScope = isLocal ? "local" : "global";

    header.classList.add("node-header--variable");
    header.setAttribute("data-variable-role", role);
    header.setAttribute("data-variable-type", binding.type);
    header.setAttribute("data-variable-scope", isLocal ? "local" : "global");
    const prefixBase = role === "set" ? "Set" : "Get";
    const prefix = isLocal ? `${prefixBase} Local` : prefixBase;
    const titleText = `${prefix} ${binding.displayName}`;
    header.title = titleText;

    title.classList.add("node-title--variable");
    title.textContent = "";

    const label = document.createElement("span");
    label.className = "node-title-label";
    label.textContent = titleText;
    title.appendChild(label);

    node.title = titleText;
  }

  /**
   * Synchronizes a variable node's data pin kinds with the supplied type.
   *
   * @param {BlueprintNode} node Node instance.
   * @param {VariableType} type Target variable type.
   * @returns {boolean} Whether any connection kinds were mutated.
   */
  #applyVariableNodePins(node, type) {
    const targetKind = type ?? "any";

    /** @type {Array<{ pinId: string, direction: 'input'|'output', kind: VariableType }>} */
    const changedPins = [];

    const updatePin = (pin, direction) => {
      if (!pin) {
        return;
      }

      if (pin.kind !== targetKind) {
        pin.kind = targetKind;
        changedPins.push({ pinId: pin.id, direction, kind: targetKind });
      }

      const element = this.#getPinElement(node.id, pin.id, direction);
      if (element) {
        element.dataset.type = targetKind;
      }
    };

    if (node.type === "set_var" || node.type === "set_local_var") {
      const valuePin = node.inputs.find((pin) => pin.id === "value");
      updatePin(valuePin, "input");
    } else if (node.type === "get_var" || node.type === "get_local_var") {
      const valuePin = node.outputs.find((pin) => pin.id === "value");
      updatePin(valuePin, "output");
    }

    if (!changedPins.length) {
      return false;
    }

    const connections = this.graph.getConnections();
    let connectionsMutated = false;
    const toRemove = new Set();

    changedPins.forEach((update) => {
      connections.forEach((connection) => {
        const isSource =
          connection.from.nodeId === node.id &&
          connection.from.pinId === update.pinId;
        const isTarget =
          connection.to.nodeId === node.id &&
          connection.to.pinId === update.pinId;
        if (!isSource && !isTarget) {
          return;
        }

        const otherNodeId = isSource
          ? connection.to.nodeId
          : connection.from.nodeId;
        const otherPinId = isSource
          ? connection.to.pinId
          : connection.from.pinId;
        const otherNode = this.graph.nodes.get(otherNodeId);
        const otherPin = otherNode?.getPin(otherPinId);
        if (!otherNode || !otherPin) {
          return;
        }

        const outputKind = isSource ? update.kind : otherPin.kind;
        const inputKind = isSource ? otherPin.kind : update.kind;
        if (!this.#arePinKindsCompatible(outputKind, inputKind)) {
          toRemove.add(connection.id);
          return;
        }

        if (connection.kind !== update.kind) {
          connection.kind = update.kind;
          connectionsMutated = true;
        }
      });
    });

    if (toRemove.size) {
      toRemove.forEach((connectionId) =>
        this.graph.removeConnection(connectionId)
      );
      connectionsMutated = true;
    }

    return connectionsMutated;
  }

  /**
   * Synchronizes sequence node outputs with configured branches.
   *
   * @param {string} nodeId Target node identifier.
   * @returns {boolean} Whether any connections were mutated.
   */
  #refreshSequenceNode(nodeId) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "sequence") {
      return false;
    }

    const { branches } = this.#ensureSequenceBranches(node);
    const result = this.#applySequenceOutputs(node, branches);
    if (this.nodeRenderer) {
      this.nodeRenderer.rebuildNodePins(node, { inputs: false, outputs: true });
      this.nodeRenderer.updatePinConnectionsForNode(node.id);
    }
    if (this.navigationManager) {
      this.navigationManager.updateZoomDisplay();
    } else {
      this.scheduleConnectionRefresh();
    }
    return result.connectionsMutated;
  }

  /**
   * Ensures sequence branch metadata is present and unique.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Sequence node reference.
   * @returns {{ branches: Array<{ id: string }>, mutated: boolean }}
   */
  #ensureSequenceBranches(node) {
    if (!Array.isArray(node.properties.branches)) {
      node.properties.branches = [];
    }

    if (!Number.isFinite(node.properties.branchCounter)) {
      node.properties.branchCounter = 0;
    }

    const existing = Array.isArray(node.properties.branches)
      ? /** @type {Array<{ id?: string }>} */ (node.properties.branches)
      : [];
    const sanitized = [];
    const usedIds = new Set();
    let mutated = !Array.isArray(node.properties.branches);

    existing.forEach((entry) => {
      let id = typeof entry?.id === "string" ? entry.id.trim() : "";
      if (!id || usedIds.has(id)) {
        id = this.#allocateSequenceBranchId(node);
        mutated = true;
      }
      usedIds.add(id);
      sanitized.push({ id });
    });

    if (!sanitized.length) {
      node.outputs
        .filter((pin) => pin.direction === "output")
        .forEach((pin) => {
          const pinId = typeof pin.id === "string" ? pin.id : "";
          if (!pinId || usedIds.has(pinId)) {
            const generated = this.#allocateSequenceBranchId(node);
            sanitized.push({ id: generated });
            usedIds.add(generated);
            mutated = true;
          } else {
            sanitized.push({ id: pinId });
            usedIds.add(pinId);
          }
        });

      if (!sanitized.length) {
        const count = Math.max(DEFAULT_SEQUENCE_BRANCHES, 1);
        for (let index = 0; index < count; index += 1) {
          const generated = this.#allocateSequenceBranchId(node);
          sanitized.push({ id: generated });
          usedIds.add(generated);
        }
        mutated = true;
      }
    }

    let maxCounter = Number.isFinite(node.properties.branchCounter)
      ? Number(node.properties.branchCounter)
      : 0;
    sanitized.forEach((entry) => {
      const match = /_(\d+)$/.exec(entry.id);
      if (match) {
        const numeric = Number.parseInt(match[1], 10);
        if (Number.isFinite(numeric)) {
          maxCounter = Math.max(maxCounter, numeric);
        }
      }
    });
    node.properties.branchCounter = maxCounter;

    node.properties.branches = sanitized.map((entry) => ({ id: entry.id }));
    return {
      branches: node.properties.branches.map((entry) => ({ id: entry.id })),
      mutated,
    };
  }

  /**
   * Allocates a unique branch identifier for a sequence node.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Sequence node reference.
   * @returns {string}
   */
  #allocateSequenceBranchId(node) {
    if (!Number.isFinite(node.properties.branchCounter)) {
      node.properties.branchCounter = 0;
    }
    node.properties.branchCounter += 1;
    return `branch_${String(node.properties.branchCounter).padStart(2, "0")}`;
  }

  /**
   * Derives a human-friendly label for a sequence branch index.
   *
   * @param {number} index Branch index starting at zero.
   * @returns {string}
   */
  #formatSequenceBranchLabel(index) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let value = Math.max(0, Math.floor(index));
    let label = "";
    do {
      label = alphabet[value % 26] + label;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return label;
  }

  /**
   * Applies sequence branch descriptors to the node outputs.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Sequence node reference.
   * @param {Array<{ id: string }>} branches Normalized branch descriptors.
   * @returns {{ pinsChanged: boolean, connectionsMutated: boolean }}
   */
  #applySequenceOutputs(node, branches) {
    const existing = new Map(node.outputs.map((pin) => [pin.id, pin]));
    let pinsChanged = false;
    let connectionsMutated = false;
    const desired = [];

    branches.forEach((branch, index) => {
      const pinId = branch.id;
      const label = this.#formatSequenceBranchLabel(index);
      let descriptor = existing.get(pinId);
      if (!descriptor) {
        descriptor = {
          id: pinId,
          name: label,
          direction: "output",
          kind: "exec",
        };
        pinsChanged = true;
      } else {
        if (descriptor.name !== label) {
          descriptor.name = label;
          pinsChanged = true;
        }
        if (descriptor.direction !== "output") {
          descriptor.direction = "output";
          pinsChanged = true;
        }
        if (descriptor.kind !== "exec") {
          descriptor.kind = "exec";
          pinsChanged = true;
        }
      }
      desired.push(descriptor);
    });

    node.outputs.forEach((pin) => {
      const keep = branches.some((branch) => branch.id === pin.id);
      if (!keep) {
        this.graph.removeConnectionsForPin({
          nodeId: node.id,
          pinId: pin.id,
        });
        connectionsMutated = true;
      }
    });

    if (pinsChanged || node.outputs.length !== desired.length) {
      node.outputs = desired;
    }

    return { pinsChanged, connectionsMutated };
  }

  /** Adds an execution branch to a sequence node. */
  #addSequenceBranch(nodeId) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "sequence") {
      return;
    }
    const { branches } = this.#ensureSequenceBranches(node);
    const nextBranches = branches.map((entry) => ({ id: entry.id }));
    const branchId = this.#allocateSequenceBranchId(node);
    nextBranches.push({ id: branchId });
    this.graph.setNodeProperty(nodeId, "branches", nextBranches);
  }

  /** Removes an execution branch from a sequence node when possible. */
  #removeSequenceBranch(nodeId, branchId) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "sequence") {
      return;
    }
    const { branches } = this.#ensureSequenceBranches(node);
    if (branches.length <= 1) {
      return;
    }
    const nextBranches = branches
      .filter((entry) => entry.id !== branchId)
      .map((entry) => ({ id: entry.id }));
    if (nextBranches.length === branches.length) {
      return;
    }
    this.graph.setNodeProperty(nodeId, "branches", nextBranches);
  }

  /**
   * Enumerates custom event nodes within the active graph.
   *
   * @returns {Array<import('../core/BlueprintNode.js').BlueprintNode>}
   */
  #getCustomEventNodes() {
    return [...this.graph.nodes.values()].filter(
      (node) => node.type === "custom_event"
    );
  }

  /**
   * Generates a unique custom event name based on the provided base string.
   *
   * @param {string} baseName Desired base name.
   * @param {string} [excludeNodeId] Optional node identifier to exclude from duplicate checks.
   * @returns {string}
   */
  #generateUniqueCustomEventName(baseName, excludeNodeId) {
    const trimmedBase = baseName.trim();
    const base = trimmedBase || "CustomEvent";
    const normalizedBase = base.toLowerCase();
    const existing = new Set();

    this.graph.nodes.forEach((candidate) => {
      if (candidate.type !== "custom_event") {
        return;
      }
      if (excludeNodeId && candidate.id === excludeNodeId) {
        return;
      }
      const rawName =
        typeof candidate.properties.name === "string"
          ? candidate.properties.name.trim()
          : "";
      if (rawName) {
        existing.add(rawName.toLowerCase());
      }
    });

    if (!existing.has(normalizedBase)) {
      return base;
    }

    let suffix = 1;
    while (existing.has(`${base}${suffix}`.toLowerCase())) {
      suffix += 1;
    }
    return `${base}${suffix}`;
  }

  /**
   * Derives the user-facing label for a custom event node.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Custom event node reference.
   * @returns {string}
   */
  #resolveCustomEventLabel(node) {
    const raw =
      typeof node.properties.name === "string"
        ? node.properties.name.trim()
        : "";
    return raw || "CustomEvent";
  }

  /**
   * Produces a stable output pin identifier for the supplied parameter.
   *
   * @param {string} parameterId Custom event parameter identifier.
   * @returns {string}
   */
  #customEventOutputPinId(parameterId) {
    return `param_${parameterId}`;
  }

  /**
   * Produces a stable input pin identifier for call nodes invoking the supplied parameter.
   *
   * @param {string} parameterId Custom event parameter identifier.
   * @returns {string}
   */
  #callCustomEventInputPinId(parameterId) {
    return `arg_${parameterId}`;
  }

  /**
   * Allocates a unique custom event parameter identifier for the provided node.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Target custom event node.
   * @returns {string}
   */
  #allocateCustomEventParameterId(node) {
    let counter = Number.isFinite(node.properties.parameterCounter)
      ? Number(node.properties.parameterCounter)
      : 0;
    counter += 1;
    node.properties.parameterCounter = counter;
    return `param_${String(counter).padStart(2, "0")}`;
  }

  /**
   * Ensures the custom event parameter collection is valid and normalized.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Target custom event node.
   * @returns {{ parameters: Array<CustomEventParameter>, mutated: boolean }}
   */
  #sanitizeCustomEventParameters(node) {
    const existing = Array.isArray(node.properties.parameters)
      ? /** @type {Array<CustomEventParameter>} */ (node.properties.parameters)
      : [];
    const normalizeOptional = (value) => {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        if (trimmed === "true") {
          return true;
        }
        if (!trimmed || trimmed === "false") {
          return false;
        }
      }
      return Boolean(value);
    };

    const sanitized = [];
    const usedIds = new Set();
    const usedNames = new Set();
    let mutated = !Array.isArray(node.properties.parameters);

    let maxCounter = Number.isFinite(node.properties.parameterCounter)
      ? Number(node.properties.parameterCounter)
      : 0;

    existing.forEach((entry, index) => {
      const rawName = typeof entry?.name === "string" ? entry.name.trim() : "";
      const baseName = rawName || `Param${index + 1}`;
      if (!rawName) {
        mutated = true;
      }

      let candidateName = baseName;
      let suffix = 2;
      while (usedNames.has(candidateName.toLowerCase())) {
        candidateName = `${baseName}${suffix}`;
        suffix += 1;
        mutated = true;
      }
      usedNames.add(candidateName.toLowerCase());

      const rawType = typeof entry?.type === "string" ? entry.type : "";
      const type = this.#normalizeVariableType(rawType);
      if (type !== rawType) {
        mutated = true;
      }

  const optional = normalizeOptional(entry?.optional);

      let identifier = typeof entry?.id === "string" ? entry.id.trim() : "";
      if (!identifier || usedIds.has(identifier)) {
        identifier = this.#allocateCustomEventParameterId(node);
        mutated = true;
      }
      usedIds.add(identifier);

      const numericMatch = /_(\d+)$/.exec(identifier);
      if (numericMatch) {
        const numeric = Number.parseInt(numericMatch[1], 10);
        if (Number.isFinite(numeric)) {
          maxCounter = Math.max(maxCounter, numeric);
        }
      }

  sanitized.push({ id: identifier, name: candidateName, type, optional });
    });

    if (sanitized.length !== existing.length) {
      mutated = true;
    } else if (!mutated) {
      for (let index = 0; index < sanitized.length; index += 1) {
        const current = existing[index];
        const next = sanitized[index];
        if (
          !current ||
          current.id !== next.id ||
          current.name !== next.name ||
          current.type !== next.type ||
          normalizeOptional(current?.optional) !== next.optional
        ) {
          mutated = true;
          break;
        }
      }
    }

    if (mutated) {
      node.properties.parameters = sanitized.map((parameter) => ({
        ...parameter,
      }));
    }

    if (
      !Number.isFinite(node.properties.parameterCounter) ||
      node.properties.parameterCounter < maxCounter
    ) {
      node.properties.parameterCounter = maxCounter;
      mutated = true;
    }

    const stored = /** @type {Array<CustomEventParameter>} */ (
      Array.isArray(node.properties.parameters)
        ? node.properties.parameters
        : []
    );

    return {
      parameters: stored.map((parameter) => ({ ...parameter })),
      mutated,
    };
  }

  /**
   * Aligns the node output pins with the supplied custom event parameters.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Custom event node reference.
   * @param {Array<CustomEventParameter>} parameters Normalized parameter list.
   * @returns {{ pinsChanged: boolean, connectionsMutated: boolean }}
   */
  #applyCustomEventNodePins(node, parameters) {
    const existingOutputs = new Map(node.outputs.map((pin) => [pin.id, pin]));

    let pinsChanged = false;
    let connectionsMutated = false;

    const desiredIds = new Set(["exec_out"]);
    const desiredOutputs = [];

    const execPin = existingOutputs.get("exec_out") ?? {
      id: "exec_out",
      name: "Exec",
      direction: "output",
      kind: "exec",
    };
    execPin.name = "Exec";
    execPin.direction = "output";
    execPin.kind = "exec";
    desiredOutputs.push(execPin);

    parameters.forEach((parameter) => {
      const pinId = this.#customEventOutputPinId(parameter.id);
      desiredIds.add(pinId);
      let descriptor = existingOutputs.get(pinId);
      if (!descriptor) {
        descriptor = {
          id: pinId,
          name: parameter.name,
          direction: "output",
          kind: parameter.type,
        };
        pinsChanged = true;
      } else {
        if (descriptor.name !== parameter.name) {
          descriptor.name = parameter.name;
          pinsChanged = true;
        }
        if (descriptor.kind !== parameter.type) {
          descriptor.kind = parameter.type;
          pinsChanged = true;
        }
        descriptor.direction = "output";
      }
      desiredOutputs.push(descriptor);
    });

    node.outputs
      .filter((pin) => !desiredIds.has(pin.id))
      .forEach((pin) => {
        this.graph.removeConnectionsForPin({ nodeId: node.id, pinId: pin.id });
        connectionsMutated = true;
        pinsChanged = true;
      });

    if (pinsChanged || node.outputs.length !== desiredOutputs.length) {
      node.outputs = desiredOutputs;
    }

    parameters.forEach((parameter) => {
      const pinId = this.#customEventOutputPinId(parameter.id);
      if (this.#ensureConnectionsReflectPinKinds(node.id, pinId)) {
        connectionsMutated = true;
      }
    });

    return { pinsChanged, connectionsMutated };
  }

  /**
   * Aligns a call node's input pins with its target custom event parameters.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Call custom event node.
   * @param {Array<CustomEventParameter>} parameters Target parameter list.
   * @returns {{ pinsChanged: boolean, connectionsMutated: boolean }}
   */
  #applyCallCustomEventNodePins(node, parameters) {
    const existingInputs = new Map(node.inputs.map((pin) => [pin.id, pin]));

    let pinsChanged = false;
    let connectionsMutated = false;

    const desiredIds = new Set(["exec_in"]);
    const desiredInputs = [];

    const execPin = existingInputs.get("exec_in") ?? {
      id: "exec_in",
      name: "Exec",
      direction: "input",
      kind: "exec",
    };
    execPin.name = "Exec";
    execPin.direction = "input";
    execPin.kind = "exec";
    desiredInputs.push(execPin);

    parameters.forEach((parameter) => {
      const pinId = this.#callCustomEventInputPinId(parameter.id);
      desiredIds.add(pinId);
      let descriptor = existingInputs.get(pinId);
      if (!descriptor) {
        descriptor = {
          id: pinId,
          name: parameter.name,
          direction: "input",
          kind: parameter.type,
        };
        pinsChanged = true;
      } else {
        if (descriptor.name !== parameter.name) {
          descriptor.name = parameter.name;
          pinsChanged = true;
        }
        if (descriptor.kind !== parameter.type) {
          descriptor.kind = parameter.type;
          pinsChanged = true;
        }
        descriptor.direction = "input";
      }
      desiredInputs.push(descriptor);
    });

    node.inputs
      .filter((pin) => !desiredIds.has(pin.id))
      .forEach((pin) => {
        this.graph.removeConnectionsForPin({ nodeId: node.id, pinId: pin.id });
        connectionsMutated = true;
        pinsChanged = true;
      });

    if (pinsChanged || node.inputs.length !== desiredInputs.length) {
      node.inputs = desiredInputs;
    }

    parameters.forEach((parameter) => {
      const pinId = this.#callCustomEventInputPinId(parameter.id);
      if (this.#ensureConnectionsReflectPinKinds(node.id, pinId)) {
        connectionsMutated = true;
      }
    });

    return { pinsChanged, connectionsMutated };
  }

  /**
   * Guarantees connection compatibility after a pin kind update.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier to reconcile.
   * @returns {boolean} Whether any connections were mutated.
   */
  #ensureConnectionsReflectPinKinds(nodeId, pinId) {
    const node = this.graph.nodes.get(nodeId);
    const pin = node?.getPin(pinId);
    if (!node || !pin) {
      return false;
    }

    const connections = this.graph.getConnectionsForNode(nodeId, pinId);
    let mutated = false;
    connections.forEach((connection) => {
      const fromNode = this.graph.nodes.get(connection.from.nodeId);
      const toNode = this.graph.nodes.get(connection.to.nodeId);
      const fromPin = fromNode?.getPin(connection.from.pinId);
      const toPin = toNode?.getPin(connection.to.pinId);
      if (!fromNode || !toNode || !fromPin || !toPin) {
        this.graph.removeConnection(connection.id);
        mutated = true;
        return;
      }
      if (!this.#arePinKindsCompatible(fromPin.kind, toPin.kind)) {
        this.graph.removeConnection(connection.id);
        mutated = true;
        return;
      }
      const expectedKind = toPin.kind === "any" ? fromPin.kind : toPin.kind;
      if (connection.kind !== expectedKind) {
        connection.kind = expectedKind;
        mutated = true;
      }
    });
    return mutated;
  }

  /**
   * Ensures the call node arguments map contains entries for each parameter.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Call node reference.
   * @param {Array<CustomEventParameter>} parameters Parameter metadata.
   */
  #syncCallCustomEventArguments(node, parameters) {
    const current = node.properties.arguments;
    const record =
      current && typeof current === "object" && !Array.isArray(current)
        ? /** @type {Record<string, unknown>} */ (current)
        : {};

    const validIds = new Set(parameters.map((parameter) => parameter.id));

    Object.keys(record).forEach((key) => {
      if (!validIds.has(key)) {
        delete record[key];
      }
    });

    parameters.forEach((parameter) => {
      if (!(parameter.id in record)) {
        record[parameter.id] = null;
      }
    });

    node.properties.arguments = record;
  }

  /**
   * Appends a new parameter to the provided custom event node.
   *
   * @param {string} nodeId Target custom event node identifier.
   * @param {{ name?: string, type?: VariableType }} [options] Optional overrides.
   * @returns {CustomEventParameter | null}
   */
  #addCustomEventParameter(nodeId, options = {}) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "custom_event") {
      return null;
    }

    const { parameters } = this.#sanitizeCustomEventParameters(node);
    const identifier = this.#allocateCustomEventParameterId(node);
    const baseName =
      typeof options.name === "string" ? options.name.trim() : "";
    const parameter = {
      id: identifier,
      name: baseName || `Param${parameters.length + 1}`,
      type: this.#normalizeVariableType(options.type ?? "any"),
      optional: Boolean(options.optional),
    };

    const nextParameters = parameters.concat(parameter);
    this.graph.setNodeProperty(nodeId, "parameters", nextParameters);
    return parameter;
  }

  /**
   * Removes a parameter from a custom event node if present.
   *
   * @param {string} nodeId Target custom event node identifier.
   * @param {string} parameterId Parameter identifier to remove.
   * @returns {boolean} Whether a parameter was removed.
   */
  #removeCustomEventParameter(nodeId, parameterId) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "custom_event") {
      return false;
    }
    const { parameters } = this.#sanitizeCustomEventParameters(node);
    const nextParameters = parameters.filter(
      (parameter) => parameter.id !== parameterId
    );
    if (nextParameters.length === parameters.length) {
      return false;
    }
    this.graph.setNodeProperty(nodeId, "parameters", nextParameters);
    return true;
  }

  /**
   * Updates the display name for a custom event parameter.
   *
   * @param {string} nodeId Target custom event node identifier.
   * @param {string} parameterId Parameter identifier to rename.
   * @param {string} name Desired display name.
   */
  #renameCustomEventParameter(nodeId, parameterId, name) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "custom_event") {
      return;
    }
    const trimmed = typeof name === "string" ? name.trim() : "";
    const { parameters } = this.#sanitizeCustomEventParameters(node);
    const nextParameters = parameters.map((parameter) =>
      parameter.id === parameterId
        ? { ...parameter, name: trimmed || parameter.name }
        : parameter
    );
    this.graph.setNodeProperty(nodeId, "parameters", nextParameters);
  }

  /**
   * Adjusts the type for a custom event parameter.
   *
   * @param {string} nodeId Target custom event node identifier.
   * @param {string} parameterId Parameter identifier to modify.
   * @param {VariableType} nextType Desired parameter type.
   */
  #setCustomEventParameterType(nodeId, parameterId, nextType) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "custom_event") {
      return;
    }
  const resolvedType = this.#normalizeVariableType(nextType);
    const { parameters } = this.#sanitizeCustomEventParameters(node);
    const nextParameters = parameters.map((parameter) =>
      parameter.id === parameterId
        ? { ...parameter, type: resolvedType }
        : parameter
    );
    this.graph.setNodeProperty(nodeId, "parameters", nextParameters);
  }

  /**
   * Toggles whether a custom event parameter is optional.
   *
   * @param {string} nodeId Target custom event node identifier.
   * @param {string} parameterId Parameter identifier to update.
   * @param {boolean} isOptional Desired optional state.
   */
  #setCustomEventParameterOptional(nodeId, parameterId, isOptional) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "custom_event") {
      return;
    }
    const flag = Boolean(isOptional);
    const { parameters } = this.#sanitizeCustomEventParameters(node);
    const nextParameters = parameters.map((parameter) =>
      parameter.id === parameterId
        ? { ...parameter, optional: flag }
        : parameter
    );
    this.graph.setNodeProperty(nodeId, "parameters", nextParameters);
  }

  /**
   * Guarantees the custom event structure matches its parameter list without touching call nodes.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Custom event node reference.
   * @returns {{ parameters: Array<CustomEventParameter>, connectionsMutated: boolean }}
   */
  #ensureCustomEventStructure(node) {
    const { parameters } = this.#sanitizeCustomEventParameters(node);
    const pinResult = this.#applyCustomEventNodePins(node, parameters);
    if (pinResult.pinsChanged) {
  this.nodeRenderer.rebuildNodePins(node, { inputs: false, outputs: true });
    }
    return {
      parameters,
      connectionsMutated: pinResult.connectionsMutated,
    };
  }

  /**
   * Refreshes the DOM representation of a custom event node and synchronizes call references.
   *
   * @param {string} nodeId Target node identifier.
   * @returns {boolean} Whether any connections were mutated.
   */
  #refreshCustomEventNode(nodeId) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "custom_event") {
      return false;
    }

    const { parameters, connectionsMutated: eventConnectionsMutated } =
      this.#ensureCustomEventStructure(node);

    const label = this.#resolveCustomEventLabel(node);
    const titleText = `Custom Event: ${label}`;
    node.title = titleText;

    const article = this.nodeElements.get(nodeId);
    if (article) {
      article.classList.add("blueprint-node--custom-event");
      article.dataset.customEventName = label;
      article.dataset.customEventParamCount = String(parameters.length);
      const titleElement = article.querySelector(".node-title");
      if (titleElement instanceof HTMLElement) {
        titleElement.textContent = titleText;
      }
    }

    const callConnectionsMutated = this.#syncCallNodesForEvent(
      nodeId,
      parameters
    );
    return eventConnectionsMutated || callConnectionsMutated;
  }

  /**
   * Synchronizes all call nodes targeting the specified custom event.
   *
   * @param {string} eventNodeId Custom event identifier.
   * @param {Array<CustomEventParameter>} parameters Normalized parameter definitions.
   * @returns {boolean} Whether any connections were mutated.
   */
  #syncCallNodesForEvent(eventNodeId, parameters) {
    const eventNode = this.graph.nodes.get(eventNodeId);
    let connectionsMutated = false;
    this.graph.nodes.forEach((candidate) => {
      if (candidate.type !== "call_custom_event") {
        return;
      }
      const targetId =
        typeof candidate.properties.eventId === "string"
          ? candidate.properties.eventId
          : "";
      if (targetId !== eventNodeId) {
        return;
      }
      const mutated = this.#refreshCustomEventCallNode(candidate.id, {
        eventNode:
          eventNode && eventNode.type === "custom_event" ? eventNode : null,
        parameters,
      });
      connectionsMutated = mutated || connectionsMutated;
    });
    return connectionsMutated;
  }

  /**
   * Refreshes the display metadata and pins for a call custom event node.
   *
   * @param {string} nodeId Target node identifier.
   * @param {{ eventNode?: import('../core/BlueprintNode.js').BlueprintNode | null, parameters?: Array<CustomEventParameter> }} [options]
   * @returns {boolean} Whether any connections were mutated.
   */
  #refreshCustomEventCallNode(nodeId, options = {}) {
    const node = this.graph.nodes.get(nodeId);
    if (!node || node.type !== "call_custom_event") {
      return false;
    }

    const eventId =
      typeof node.properties.eventId === "string"
        ? node.properties.eventId
        : "";
    let eventNode = options.eventNode ?? null;
    if (!eventNode && eventId) {
      const fetched = this.graph.nodes.get(eventId);
      if (fetched && fetched.type === "custom_event") {
        eventNode = fetched;
      }
    }

    let parameters = Array.isArray(options.parameters)
      ? options.parameters.map((parameter) => ({ ...parameter }))
      : [];
    if (eventNode && eventNode.type === "custom_event" && !options.parameters) {
      const structure = this.#ensureCustomEventStructure(eventNode);
      parameters = structure.parameters.map((parameter) => ({ ...parameter }));
    }

    const pinResult = this.#applyCallCustomEventNodePins(node, parameters);
    if (pinResult.pinsChanged) {
  this.nodeRenderer.rebuildNodePins(node, { inputs: true, outputs: false });
    }
    this.#syncCallCustomEventArguments(node, parameters);

    let label = "";
    if (eventNode && eventNode.type === "custom_event") {
      label = this.#resolveCustomEventLabel(eventNode);
    }

    const titleText = label ? `Call ${label}` : "Call Custom Event";
    node.title = titleText;

    const article = this.nodeElements.get(nodeId);
    if (article) {
      article.classList.add("blueprint-node--custom-event-call");
      if (label && eventId) {
        article.dataset.targetEventId = eventId;
        article.dataset.targetEventName = label;
        article.dataset.targetEventParamCount = String(parameters.length);
      } else {
        delete article.dataset.targetEventId;
        delete article.dataset.targetEventName;
        delete article.dataset.targetEventParamCount;
      }
      const titleElement = article.querySelector(".node-title");
      if (titleElement instanceof HTMLElement) {
        titleElement.textContent = titleText;
      }
    }

    return pinResult.connectionsMutated;
  }

  /**
   * Re-renders the inspector panel when the supplied node is the active selection.
   *
   * @param {string} nodeId Node identifier to check.
   */
  #refreshInspectorIfActive(nodeId, propertyKey) {
    if (
      this.selectedNodeIds.size === 1 &&
      this.selectedNodeId === nodeId &&
      this.inspectorView === "default"
    ) {
      if (propertyKey) {
        this.pendingInspectorFocus = { nodeId, property: propertyKey };
      }
      this.#renderInspector(nodeId);
    }
  }

  /**
   * Updates every call node referencing the specified custom event.
   *
   * @param {string} eventNodeId Custom event node identifier.
   */
  #refreshCallNodesForEvent(eventNodeId) {
    const eventNode = this.graph.nodes.get(eventNodeId);
    const structure =
      eventNode && eventNode.type === "custom_event"
        ? this.#ensureCustomEventStructure(eventNode)
        : { parameters: [], connectionsMutated: false };
    this.#syncCallNodesForEvent(eventNodeId, structure.parameters);
  }

  /**
   * Clears references to a custom event that has been removed from the graph.
   *
   * @param {string} eventNodeId Identifier for the removed event node.
   */
  #handleCustomEventRemoval(eventNodeId) {
    this.graph.nodes.forEach((node) => {
      if (node.type !== "call_custom_event") {
        return;
      }
      const targetId =
        typeof node.properties.eventId === "string"
          ? node.properties.eventId
          : "";
      if (targetId !== eventNodeId) {
        return;
      }
      this.graph.setNodeProperty(node.id, "eventId", "");
    });
  }

  /**
   * Renders the event list summarizing entry nodes.
   */
  #renderEventList() {
    renderEventList({
      element: this.eventListElement,
      registry: this.registry,
      graph: this.graph,
      focusNode: (nodeId) => {
        this.navigationManager.focusNode(nodeId);
      },
      renderEmpty: (message) => {
        if (this.eventListElement) {
          this.#renderOverviewEmpty(this.eventListElement, message);
        }
      },
      isEventNode: (node, entryTypes) => this.#isEventNode(node, entryTypes),
    });
  }

  /**
   * Renders the variable list summarizing set/get nodes.
   */
  #renderVariableList() {
    renderVariableList({
      element: this.variableListElement,
      variableOrder: this.variableOrder,
      variables: this.variables,
      graph: this.graph,
      cancelVariableRename: () => this.#cancelVariableRename(),
      closeVariableTypeDropdown: () => this.#closeTypeDropdown(),
      renderEmpty: (message) => {
        if (this.variableListElement) {
          this.#renderOverviewEmpty(this.variableListElement, message);
        }
      },
      normalizeVariableName: (name) => this.#normalizeVariableName(name),
      formatVariableType: (type) => this.#formatVariableType(type),
      selectVariable: (variableId) => this.#selectVariable(variableId),
      handleVariableDragStart: (event, variableId) =>
        this.dropManager.handleVariableDragStart(event, variableId),
      handleVariableDragEnd: () => this.dropManager.handleVariableDragEnd(),
      reorderVariable: (variableId, targetIndex) =>
        this.#reorderVariable(variableId, targetIndex),
      openVariableTypeDropdown: (variableId, button, anchor) =>
        this.#openVariableTypeDropdown(variableId, button, anchor),
      deleteVariable: (variableId) => this.#deleteVariable(variableId),
      startVariableRename: (variableId, label) =>
        this.#startVariableRename(variableId, label),
      highlightVariableSelection: () => this.#highlightVariableSelection(),
      isVariableDropdownOpen: (variableId) =>
        this.#isTypeDropdownOpen({ kind: "variable", variableId }),
    });
  }

  /**
   * Appends an empty-state message to the provided overview list.
   *
   * @param {HTMLUListElement} list Target list element.
   * @param {string} message Empty-state message.
   */
  #renderOverviewEmpty(list, message) {
    const item = document.createElement("li");
    const placeholder = document.createElement("p");
    placeholder.className = "overview-empty";
    placeholder.textContent = message;
    item.appendChild(placeholder);
    list.appendChild(item);
  }

  /**
   * Determines whether a node qualifies as an event for the overview list.
   *
   * @param {BlueprintNode} node Node to inspect.
   * @param {Set<string>} entryTypes Node types designated as entry points.
   * @returns {boolean}
   */
  #isEventNode(node, entryTypes) {
    const definition = this.registry.get(node.type);
    if (!definition) {
      return false;
    }

    if (entryTypes.has(node.type) && node.type !== "call_custom_event") {
      return true;
    }

    if (node.type === "custom_event") {
      return true;
    }

    return false;
  }

  /**
   * Prepares drag metadata for variable overview interactions.
   *
   * @param {DragEvent} event Drag event payload.
   * @param {string} variableId Variable identifier being dragged.
   */
  /**
   * Handles pointer interactions with rendered connection paths, enabling quick removal.
   *
   * @param {PointerEvent} event Pointer interaction payload.
   */
  #handleConnectionPointerDown(event) {
    if (!(event.target instanceof SVGPathElement)) {
      return;
    }

    if (event.button !== 0 || !event.altKey) {
      return;
    }

    const path = /** @type {SVGPathElement} */ (event.target);
    const connectionId = path.dataset.connectionId;
    if (!connectionId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.graph.removeConnection(connectionId);
  }

  /**
   * Creates a node instance from a registry definition or shortcut entry.
   *
   * @param {PaletteNodeDefinition} definition Definition describing the node to spawn.
   * @param {{ position?: { x: number, y: number } }} [options] Spawn options.
   * @returns {import('../core/BlueprintNode.js').BlueprintNode | null}
   */
  createNodeFromDefinition(definition, options = {}) {
    if (!definition) {
      return null;
    }

    const shortcut = definition.shortcut;
    if (shortcut?.type === "variable") {
      const targetId = shortcut.action === "set" ? "set_var" : "get_var";
      const node = this.addNode(targetId, options.position);
      if (!node) {
        return null;
      }

      const variable = this.variables.get(shortcut.variableId);
      const rawName = variable?.name ?? "";
      const label = rawName.trim() || variable?.id || shortcut.variableId;
      this.graph.setNodeProperty(node.id, "variableId", shortcut.variableId);
      this.graph.setNodeProperty(node.id, "name", label);
      this.#refreshVariableNode(node.id);
      return node;
    }

    let node = null;
    if (shortcut?.type === "custom_event_call") {
      node = this.addNode("call_custom_event", options.position);
      if (!node) {
        return null;
      }
      this.graph.setNodeProperty(node.id, "eventId", shortcut.eventNodeId);
    } else {
      node = this.addNode(definition.id, options.position);
      if (!node) {
        return null;
      }
    }

    if (node.type === "custom_event") {
      const currentName =
        typeof node.properties.name === "string" ? node.properties.name : "";
      const uniqueName = this.#generateUniqueCustomEventName(
        currentName || "CustomEvent",
        node.id
      );
      if (uniqueName !== currentName) {
        this.graph.setNodeProperty(node.id, "name", uniqueName);
      } else {
        this.#refreshCustomEventNode(node.id);
      }
      this.pendingInspectorFocus = { nodeId: node.id, property: "name" };
    } else if (node.type === "call_custom_event") {
      if (!shortcut || shortcut.type !== "custom_event_call") {
        this.pendingInspectorFocus = { nodeId: node.id, property: "eventId" };
      }
      this.#refreshCustomEventCallNode(node.id);
    }

    return node;
  }

  /**
   * Spawns a node at the requested context menu position.
   *
   * @param {PaletteNodeDefinition} definition Node definition to instantiate.
   * @param {{ x: number, y: number }} spawnPosition Workspace-relative spawn coordinates.
   * @returns {import('../core/BlueprintNode.js').BlueprintNode | null}
   */
  spawnNodeFromContextMenu(definition, spawnPosition) {
    const clamped = {
      x: Math.max(0, spawnPosition.x),
      y: Math.max(0, spawnPosition.y),
    };
    const worldSpawn = this.navigationManager.screenPointToWorld(clamped);
    const spawn = WorkspaceGeometry.snapPositionToGrid(this, worldSpawn);
    const pendingConnectionSnapshot = this.pendingConnectionSpawn
      ? {
          startRef: {
            nodeId: this.pendingConnectionSpawn.startRef.nodeId,
            pinId: this.pendingConnectionSpawn.startRef.pinId,
          },
          direction: this.pendingConnectionSpawn.direction,
          kind: this.pendingConnectionSpawn.kind,
        }
      : null;
    this.pendingConnectionSpawn = null;
    const node = this.createNodeFromDefinition(definition, { position: spawn });
    if (
      node &&
      this.pendingVariableSpawn &&
      (definition.id === "set_var" || definition.id === "get_var")
    ) {
      const variable = this.variables.get(this.pendingVariableSpawn.variableId);
      if (variable) {
        const nodeName = variable.name || variable.id;
        this.graph.setNodeProperty(node.id, "name", nodeName);
        this.graph.setNodeProperty(node.id, "variableId", variable.id);
      }
      this.pendingVariableSpawn = null;
    }
    if (node && pendingConnectionSnapshot) {
      this.#connectSpawnedNodeToPending(node, pendingConnectionSnapshot);
    }
    return node;
  }

  /**
   * Computes a spawn position based on the workspace size and spawn index.
   *
   * @param {string} definitionId Node definition identifier.
   * @param {number} index Spawn index.
   * @returns {{x:number,y:number}}
   */
  #computeSpawnPosition(definitionId, index) {
    const bounds = this.workspaceElement.getBoundingClientRect();
    const zoom = this.zoomLevel || 1;
    const width = bounds.width / zoom;
    const height = bounds.height / zoom;
    const offset = (index % 5) * 30;
    const baseX = width * 0.3;
    const baseY = height * 0.3;
    const jitterX = (index * 37) % 120;
    const jitterY = (index * 53) % 120;
    const categoryOffset =
      this.registry.get(definitionId)?.category.length ?? 0;
    return WorkspaceGeometry.snapPositionToGrid(this, {
      x: Math.max(40, baseX + offset + jitterX + categoryOffset),
      y: Math.max(40, baseY + offset + jitterY),
    });
  }

  /**
   * Initiates a node drag operation.
   *
   * @param {PointerEvent} event Pointer event.
   * @param {string} nodeId Dragged node identifier.
   */
  #startDraggingNode(event, nodeId) {
    if (!this.dragManager) {
      return;
    }
    this.dragManager.startNodeDrag(event, nodeId);
  }

  /**
   * Attempts to connect the selected node to the nearest compatible pin.
   *
   * @returns {boolean}
   */
  #tryAutoConnectSelectedNode() {
    if (this.selectedNodeIds.size !== 1 || !this.selectedNodeId) {
      return false;
    }

    const node = this.graph.nodes.get(this.selectedNodeId);
    if (!node) {
      return false;
    }

    let connected = false;

    const pins = [
      ...node.outputs.filter((pin) =>
        this.#isAutoConnectStartPinAvailable(node.id, pin)
      ),
      ...node.inputs.filter((pin) =>
        this.#isAutoConnectStartPinAvailable(node.id, pin)
      ),
    ];

    for (const pin of pins) {
      const candidates = this.#findAutoConnectTargets(node, pin);
      for (const candidate of candidates) {
        if (candidate.pruneExistingConnections) {
          this.graph.removeConnectionsForPin({
            nodeId: candidate.nodeId,
            pinId: candidate.pinId,
          });
        }
        const success =
          pin.direction === "output"
            ? this.graph.connect(
                { nodeId: node.id, pinId: pin.id },
                { nodeId: candidate.nodeId, pinId: candidate.pinId }
              )
            : this.graph.connect(
                { nodeId: candidate.nodeId, pinId: candidate.pinId },
                { nodeId: node.id, pinId: pin.id }
              );
        if (success) {
          connected = true;
          break;
        }
      }
    }

    return connected;
  }

  /**
   * Evaluates if a pin is eligible to initiate an auto-connect attempt.
   *
   * @param {string} nodeId Node identifier for the pin owner.
   * @param {import('../core/BlueprintNode.js').PinDescriptor} pin Pin descriptor to inspect.
   * @returns {boolean}
   */
  #isAutoConnectStartPinAvailable(nodeId, pin) {
    const connections = this.graph.getConnectionsForNode(nodeId, pin.id);
    return connections.length === 0;
  }

  /**
   * Gathers compatible target pins ordered by proximity to the starting pin.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} startNode Node containing the starting pin.
   * @param {import('../core/BlueprintNode.js').PinDescriptor} startPin Starting pin descriptor.
   * @returns {Array<{ nodeId: string, pinId: string, distance: number }>}
   */
  #findAutoConnectTargets(startNode, startPin) {
    const startCenter = this.#getPinHandleCenter(
      startNode.id,
      startPin.id,
      startPin.direction
    );
    if (!startCenter) {
      return [];
    }

    const expectedDirection =
      startPin.direction === "output" ? "input" : "output";
    /** @type {Array<{ nodeId: string, distance: number, pins: Array<{ pinId: string, pruneExistingConnections: boolean }> }> } */
    const nodes = [];

    this.graph.nodes.forEach((candidateNode) => {
      if (candidateNode.id === startNode.id) {
        return;
      }

      const pins =
        expectedDirection === "input"
          ? candidateNode.inputs
          : candidateNode.outputs;
      /** @type {Array<{ pinId: string, pruneExistingConnections: boolean }>} */
      const compatiblePins = [];
      let nodeDistance = Infinity;

      pins.forEach((candidatePin) => {
        if (
          !this.#canPinsConnect(
            startNode,
            startPin,
            startPin.direction,
            candidateNode,
            candidatePin
          )
        ) {
          return;
        }

        const candidateConnections = this.graph.getConnectionsForNode(
          candidateNode.id,
          candidatePin.id
        );

        let pruneExistingConnections = false;

        if (startPin.direction === "output") {
          if (candidateConnections.length > 0) {
            if (candidatePin.kind === "exec") {
              pruneExistingConnections = true;
            } else {
              return;
            }
          }
        } else if (
          candidatePin.kind !== "exec" &&
          candidateConnections.length > 0
        ) {
          return;
        }

        const candidateCenter = this.#getPinHandleCenter(
          candidateNode.id,
          candidatePin.id,
          candidatePin.direction
        );
        if (!candidateCenter) {
          return;
        }

        const distance = Math.hypot(
          candidateCenter.x - startCenter.x,
          candidateCenter.y - startCenter.y
        );
        if (distance > AUTO_CONNECT_DISTANCE) {
          return;
        }

        if (distance < nodeDistance) {
          nodeDistance = distance;
        }

        compatiblePins.push({
          pinId: candidatePin.id,
          pruneExistingConnections,
        });
      });

      if (compatiblePins.length) {
        nodes.push({
          nodeId: candidateNode.id,
          distance: nodeDistance,
          pins: compatiblePins,
        });
      }
    });
      /** @type {Array<{ nodeId: string, pinId: string, distance: number, pruneExistingConnections: boolean }> } */
    nodes.sort((a, b) => a.distance - b.distance);

    /** @type {Array<{ nodeId: string, pinId: string, distance: number }> } */
    const ordered = [];
    nodes.forEach((entry) => {
      entry.pins.forEach((pin) => {
        ordered.push({
            pruneExistingConnections: pin.pruneExistingConnections,
          nodeId: entry.nodeId,
          pinId: pin.pinId,
          distance: entry.distance,
        });
      });
    });

    return ordered;
  }

  /**
   * Begins a connection gesture from the provided pin.
   *
   * @param {PointerEvent} event Pointer event reference.
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @param {'input'|'output'} direction Pin direction.
   */
  #beginConnection(event, nodeId, pinId, direction) {
    const node = this.graph.nodes.get(nodeId);
    if (!node) {
      return;
    }

    const pin = node.getPin(pinId);
    if (!pin) {
      return;
    }

    event.stopPropagation();
    this.pendingConnectionSpawn = null;
    const path = this.#createConnectionPath(pin.kind);
    this.pendingConnection = {
      direction,
      source: direction === "output" ? { nodeId, pinId } : undefined,
      target: direction === "input" ? { nodeId, pinId } : undefined,
      path,
    };

    this.#highlightPinsForPending(nodeId, pinId, direction);

    const handlePointerMove = (moveEvent) => {
      this.#updatePendingConnectionPath(
        moveEvent.clientX,
        moveEvent.clientY,
        nodeId,
        pinId,
        direction
      );
    };

    const handlePointerUp = (upEvent) => {
      if (upEvent.pointerId !== event.pointerId) {
        return;
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const openedMenu = this.#tryOpenPendingConnectionMenu(upEvent);
      if (!openedMenu) {
        this.#cancelPendingConnection();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  /**
   * Updates the temporary connection path during a drag gesture.
   *
   * @param {number} clientX Pointer X coordinate.
   * @param {number} clientY Pointer Y coordinate.
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @param {'input'|'output'} direction Pin direction.
   */
  #updatePendingConnectionPath(clientX, clientY, nodeId, pinId, direction) {
    if (!this.pendingConnection) {
      return;
    }

    const startHandle = this.#getPinHandle(nodeId, pinId, direction);
    if (!startHandle) {
      return;
    }

    const workspaceRect = this.workspaceElement.getBoundingClientRect();
    const startRect = startHandle.getBoundingClientRect();
    const zoom = this.zoomLevel || 1;
    const anchor = {
      x:
        (startRect.left - workspaceRect.left + startRect.width / 2) /
        zoom,
      y:
        (startRect.top - workspaceRect.top + startRect.height / 2) /
        zoom,
    };
    const pointer = {
      x: (clientX - workspaceRect.left) / zoom,
      y: (clientY - workspaceRect.top) / zoom,
    };

    const start = direction === "output" ? anchor : pointer;
    const end = direction === "output" ? pointer : anchor;

    const controlOffset = Math.max(60 / zoom, Math.abs(end.x - start.x) * 0.5);
    const d = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${
      start.y
    } ${end.x - controlOffset} ${end.y} ${end.x} ${end.y}`;
    this.pendingConnection.path.dataset.active = "true";
    this.pendingConnection.path.setAttribute("d", d);
  }

  /**
   * Finalizes a pending connection if the gesture ends on a compatible pin.
   *
   * @param {string} nodeId Node identifier for the target pin.
   * @param {string} pinId Pin identifier for the target pin.
   * @param {'input'|'output'} direction Pin direction.
   */
  #finalizeConnection(nodeId, pinId, direction) {
    if (!this.pendingConnection) {
      return;
    }

    const { source, target } = this.pendingConnection;
    if (direction === "input" && source) {
      this.graph.connect(source, { nodeId, pinId });
    } else if (direction === "output" && target) {
      this.graph.connect({ nodeId, pinId }, target);
    }

    this.#cancelPendingConnection();
  }

  /**
   * Cancels the current pending connection gesture.
   */
  #cancelPendingConnection() {
    if (this.pendingConnection) {
      this.pendingConnection.path.remove();
      this.pendingConnection = null;
    }
    this.#clearPinHighlights();
  }

  /**
   * Opens the context menu using compatible node definitions when a connection drag ends without a target.
   *
   * @param {PointerEvent} upEvent Pointer event containing the release coordinates.
   * @returns {boolean} Whether a menu was shown.
   */
  #tryOpenPendingConnectionMenu(upEvent) {
    if (!this.pendingConnection) {
      return false;
    }

    const startRef =
      this.pendingConnection.source ?? this.pendingConnection.target;
    if (!startRef) {
      return false;
    }

    const startNode = this.graph.nodes.get(startRef.nodeId);
    if (!startNode) {
      return false;
    }

    const startPin = startNode.getPin(startRef.pinId);
    if (!startPin) {
      return false;
    }

    const compatibleDefinitions = this.#getCompatibleDefinitionsForPending(
      startPin,
      this.pendingConnection.direction
    );
    if (!compatibleDefinitions.length) {
      return false;
    }

    this.pendingConnectionSpawn = {
      startRef: { nodeId: startRef.nodeId, pinId: startRef.pinId },
      direction: this.pendingConnection.direction,
      kind: startPin.kind,
    };

    const kindLabel = typeof startPin.kind === "string" ? startPin.kind : "";
    const friendlyKind = kindLabel
      ? kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1)
      : "";
    const placeholder = friendlyKind
      ? `Compatible ${friendlyKind} nodes`
      : "Search nodes";

    this.#cancelPendingConnection();
    this.contextMenuManager.show(upEvent.clientX, upEvent.clientY, {
      definitions: compatibleDefinitions,
      query: kindLabel,
      mode: "connection",
      placeholder,
    });

    return true;
  }

  /**
   * Identifies node definitions that can connect to the active pending connection.
   *
   * @param {import('../core/BlueprintNode.js').PinDescriptor} startPin Starting pin descriptor.
   * @param {'input'|'output'} startDirection Starting pin direction.
   * @returns {Array<NodeDefinition>}
   */
  #getCompatibleDefinitionsForPending(startPin, startDirection) {
    const expectedDirection = startDirection === "output" ? "input" : "output";
    return this.registry.list().filter((definition) => {
      const pins =
        expectedDirection === "input" ? definition.inputs : definition.outputs;
      return pins.some((candidatePin) => {
        if (startDirection === "output") {
          return this.#arePinKindsCompatible(startPin.kind, candidatePin.kind);
        }
        return this.#arePinKindsCompatible(candidatePin.kind, startPin.kind);
      });
    });
  }

  /**
  * Connects a newly spawned node to the pin that initiated the spawn request.
  *
  * @param {BlueprintNode} node Newly created node.
  * @param {{ startRef: { nodeId: string, pinId: string }, direction: 'input'|'output', kind: string }} spawnInfo Connection spawn metadata.
  */
  #connectSpawnedNodeToPending(node, spawnInfo) {
    if (!spawnInfo) {
      return;
    }

    const { startRef, direction } = spawnInfo;
    const startNode = this.graph.nodes.get(startRef.nodeId);
    if (!startNode) {
      return;
    }

    const startPin = startNode.getPin(startRef.pinId);
    if (!startPin) {
      return;
    }

    const candidatePins = direction === "output" ? node.inputs : node.outputs;
    const compatiblePin = candidatePins.find((pin) => {
      if (direction === "output") {
        return this.#arePinKindsCompatible(startPin.kind, pin.kind);
      }
      return this.#arePinKindsCompatible(pin.kind, startPin.kind);
    });

    if (!compatiblePin) {
      return;
    }

    if (direction === "output") {
      this.graph.connect(
        { nodeId: startRef.nodeId, pinId: startRef.pinId },
        { nodeId: node.id, pinId: compatiblePin.id }
      );
    } else {
      this.graph.connect(
        { nodeId: node.id, pinId: compatiblePin.id },
        { nodeId: startRef.nodeId, pinId: startRef.pinId }
      );
    }
  }

  /**
   * Creates a connection path element styled for the given kind.
   *
   * @param {string} kind Pin kind.
   * @returns {SVGPathElement}
   */
  #createConnectionPath(kind) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("connection-path");
    path.dataset.type = kind;
    this.connectionLayer.appendChild(path);
    return path;
  }

  /**
   * Requests a connection re-render on the next animation frame.
   */
  scheduleConnectionRefresh() {
    this.#scheduleConnectionRefresh();
  }

  /**
   * Cancels any pending connection refresh.
   */
  cancelConnectionRefresh() {
    this.#cancelConnectionRefresh();
  }

  /**
   * Forces a connection refresh immediately.
   */
  flushConnectionRefresh() {
    this.#flushConnectionRefresh();
  }

  /**
   * Requests a connection re-render on the next animation frame.
   */
  #scheduleConnectionRefresh() {
    if (this.connectionRefreshFrame !== null) {
      return;
    }

    this.connectionRefreshFrame = window.requestAnimationFrame(() => {
      this.connectionRefreshFrame = null;
      this.#renderConnections();
    });
  }

  /**
   * Cancels a pending connection refresh request.
   */
  #cancelConnectionRefresh() {
    if (this.connectionRefreshFrame !== null) {
      window.cancelAnimationFrame(this.connectionRefreshFrame);
      this.connectionRefreshFrame = null;
    }
  }

  /**
   * Executes any pending connection refresh immediately.
   */
  #flushConnectionRefresh() {
    if (this.connectionRefreshFrame !== null) {
      window.cancelAnimationFrame(this.connectionRefreshFrame);
      this.connectionRefreshFrame = null;
    }
    this.#renderConnections();
  }

  /**
   * Re-renders all connection paths to match their origin nodes.
   */
  #renderConnections() {
    const zoom = this.zoomLevel || 1;
    const workspaceRect = this.workspaceElement.getBoundingClientRect();
    if (this.connectionLayer instanceof SVGElement) {
      const targetWidth = Math.max(1, workspaceRect.width / zoom);
      const targetHeight = Math.max(1, workspaceRect.height / zoom);
      this.connectionLayer.style.width = `${targetWidth}px`;
      this.connectionLayer.style.height = `${targetHeight}px`;
      if (this.connectionLayer.hasAttribute("viewBox")) {
        this.connectionLayer.removeAttribute("viewBox");
      }
      if (this.connectionLayer.hasAttribute("preserveAspectRatio")) {
        this.connectionLayer.removeAttribute("preserveAspectRatio");
      }
    }
    const activeIds = new Set();
    this.graph.getConnections().forEach((connection) => {
      activeIds.add(connection.id);
      let path = this.connectionElements.get(connection.id);
      if (!path) {
        path = this.#createConnectionPath(connection.kind);
        this.connectionElements.set(connection.id, path);
      }

      path.dataset.type = connection.kind;
      path.dataset.connectionId = connection.id;
      const geometry = this.#computeConnectionGeometry(
        connection.from,
        connection.to
      );
      if (!geometry) {
        return;
      }

      const { start, end } = geometry;
      const controlOffset = Math.max(60 / zoom, Math.abs(end.x - start.x) * 0.5);
      const d = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${
        start.y
      } ${end.x - controlOffset} ${end.y} ${end.x} ${end.y}`;
      path.dataset.active = "false";
      path.setAttribute("d", d);
    });

    this.connectionElements.forEach((path, id) => {
      if (!activeIds.has(id)) {
        path.remove();
        this.connectionElements.delete(id);
      }
    });
  }

  /**
   * Computes the screen-space geometry for a connection between two pins.
   *
   * @param {{nodeId:string,pinId:string}} from Origin pin reference.
   * @param {{nodeId:string,pinId:string}} to Target pin reference.
   * @returns {{start:{x:number,y:number},end:{x:number,y:number}} | undefined}
   */
  #computeConnectionGeometry(from, to) {
    const startHandle = this.#getPinHandle(from.nodeId, from.pinId, "output");
    const endHandle = this.#getPinHandle(to.nodeId, to.pinId, "input");
    if (!startHandle || !endHandle) {
      return undefined;
    }

    const workspaceRect = this.workspaceElement.getBoundingClientRect();
    const zoom = this.zoomLevel || 1;
    const startRect = startHandle.getBoundingClientRect();
    const endRect = endHandle.getBoundingClientRect();
    return {
      start: {
        x:
          (startRect.left - workspaceRect.left + startRect.width / 2) /
          zoom,
        y:
          (startRect.top - workspaceRect.top + startRect.height / 2) /
          zoom,
      },
      end: {
        x:
          (endRect.left - workspaceRect.left + endRect.width / 2) / zoom,
        y:
          (endRect.top - workspaceRect.top + endRect.height / 2) / zoom,
      },
    };
  }

  /**
   * Resolves a pin handle element given node and pin identifiers.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @param {'input'|'output'} direction Pin direction.
   * @returns {HTMLElement | null}
   */
  #getPinHandle(nodeId, pinId, direction) {
    const element = this.nodeElements.get(nodeId);
    if (!element) {
      return null;
    }

    return element.querySelector(
      `.pin[data-pin-id="${pinId}"][data-direction="${direction}"] .pin-handle`
    );
  }

  /**
   * Resolves the workspace-relative center point for a pin handle.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @param {'input'|'output'} direction Pin direction.
   * @returns {{x:number,y:number} | null}
   */
  #getPinHandleCenter(nodeId, pinId, direction) {
    const handle = this.#getPinHandle(nodeId, pinId, direction);
    if (!handle) {
      return null;
    }

    const rect = handle.getBoundingClientRect();
    const workspaceRect = this.workspaceElement.getBoundingClientRect();
    const zoom = this.zoomLevel || 1;

    return {
      x:
        (rect.left - workspaceRect.left + rect.width / 2) /
        zoom,
      y:
        (rect.top - workspaceRect.top + rect.height / 2) /
        zoom,
    };
  }

  /**
   * Retrieves the pin container element for a given node and pin.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @param {'input'|'output'} direction Pin direction.
   * @returns {HTMLElement | null}
   */
  #getPinElement(nodeId, pinId, direction) {
    const element = this.nodeElements.get(nodeId);
    if (!element) {
      return null;
    }

    return element.querySelector(
      `.pin[data-pin-id="${pinId}"][data-direction="${direction}"]`
    );
  }

  /**
   * Highlights valid drop targets for the active pending connection.
   *
   * @param {string} nodeId Starting node identifier.
   * @param {string} pinId Starting pin identifier.
   * @param {'input'|'output'} direction Pin direction used to initiate the drag.
   */
  #highlightPinsForPending(nodeId, pinId, direction) {
    this.#clearPinHighlights();

    const startNode = this.graph.nodes.get(nodeId);
    if (!startNode) {
      return;
    }

    const startPin = startNode.getPin(pinId);
    if (!startPin) {
      return;
    }

    const startElement = this.#getPinElement(nodeId, pinId, direction);
    if (startElement) {
      startElement.classList.add("is-drag-source");
      this.highlightedPins.add(startElement);
    }

    const expectedDirection = direction === "output" ? "input" : "output";
    this.graph.nodes.forEach((candidateNode) => {
      if (candidateNode.id === nodeId) {
        return;
      }

      const pins =
        expectedDirection === "input"
          ? candidateNode.inputs
          : candidateNode.outputs;
      pins.forEach((candidatePin) => {
        if (
          this.#canPinsConnect(
            startNode,
            startPin,
            direction,
            candidateNode,
            candidatePin
          )
        ) {
          const element = this.#getPinElement(
            candidateNode.id,
            candidatePin.id,
            candidatePin.direction
          );
          if (element) {
            element.classList.add("is-drop-target");
            this.highlightedPins.add(element);
          }
        }
      });
    });
  }

  /**
   * Determines whether a pin should display hover styling as a drop target.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @param {'input'|'output'} direction Pin direction.
   * @returns {boolean}
   */
  #shouldHighlightHover(nodeId, pinId, direction) {
    return this.#isPinCompatibleWithPending(nodeId, pinId, direction);
  }

  /**
   * Checks if a pin is compatible with the current pending connection.
   *
   * @param {string} nodeId Candidate node identifier.
   * @param {string} pinId Candidate pin identifier.
   * @param {'input'|'output'} direction Candidate pin direction.
   * @returns {boolean}
   */
  #isPinCompatibleWithPending(nodeId, pinId, direction) {
    if (!this.pendingConnection) {
      return false;
    }

    const startRef =
      this.pendingConnection.source ?? this.pendingConnection.target;
    if (!startRef) {
      return false;
    }

    if (startRef.nodeId === nodeId && startRef.pinId === pinId) {
      return false;
    }

    const startNode = this.graph.nodes.get(startRef.nodeId);
    const candidateNode = this.graph.nodes.get(nodeId);
    if (!startNode || !candidateNode) {
      return false;
    }

    const startPin = startNode.getPin(startRef.pinId);
    const candidatePin = candidateNode.getPin(pinId);
    if (!startPin || !candidatePin) {
      return false;
    }

    return this.#canPinsConnect(
      startNode,
      startPin,
      this.pendingConnection.direction,
      candidateNode,
      candidatePin
    );
  }

  /**
   * Removes highlight classes from every tracked pin element.
   */
  #clearPinHighlights() {
    this.highlightedPins.forEach((element) => {
      element.classList.remove(
        "is-drag-source",
        "is-drop-target",
        "is-drop-hover"
      );
    });
    this.highlightedPins.clear();
  }

  /**
   * Determines if two pins can connect based on direction and kind.
   *
   * @param {BlueprintNode} startNode Starting node.
   * @param {import('../core/BlueprintNode.js').PinDescriptor} startPin Starting pin descriptor.
   * @param {'input'|'output'} startDirection Direction of the starting pin.
   * @param {BlueprintNode} candidateNode Candidate node.
   * @param {import('../core/BlueprintNode.js').PinDescriptor} candidatePin Candidate pin descriptor.
   * @returns {boolean}
   */
  #canPinsConnect(
    startNode,
    startPin,
    startDirection,
    candidateNode,
    candidatePin
  ) {
    if (startNode.id === candidateNode.id) {
      return false;
    }

    const expectedDirection = startDirection === "output" ? "input" : "output";
    if (candidatePin.direction !== expectedDirection) {
      return false;
    }

    let outputKind;
    let inputKind;
    if (startDirection === "output") {
      outputKind = startPin.kind;
      inputKind = candidatePin.kind;
    } else {
      outputKind = candidatePin.kind;
      inputKind = startPin.kind;
    }

    return this.#arePinKindsCompatible(outputKind, inputKind);
  }

  /**
   * Determines if the output and input kinds are compatible under blueprint rules.
   *
   * @param {string} outputKind Output pin kind.
   * @param {string} inputKind Input pin kind.
   * @returns {boolean}
   */
  #arePinKindsCompatible(outputKind, inputKind) {
    if (inputKind === "any" || outputKind === "any") {
      return true;
    }
    return outputKind === inputKind;
  }

  /**
   * Renders inspector controls for the selected node.
   *
   * @param {string} nodeId Node identifier.
   */
  #renderInspector(nodeId) {
    const node = this.graph.nodes.get(nodeId);
    if (!node) {
      this.inspectorContent.innerHTML = "";
      return;
    }

    const definition = this.registry.get(node.type);
    if (!definition) {
      return;
    }

    this.inspectorContent.innerHTML = "";

    if (node.type === "custom_event") {
      this.#renderCustomEventInspector(node);
      return;
    }

    if (node.type === "sequence") {
      this.#renderSequenceInspector(node);
      return;
    }

    if (node.type === "call_custom_event") {
      this.#renderCallCustomEventInspector(node);
      return;
    }

    if (!definition.properties.length) {
      const empty = document.createElement("p");
      empty.textContent = "No editable properties.";
      empty.className = "inspector-empty";
      this.inspectorContent.appendChild(empty);
      return;
    }

    definition.properties.forEach((schema) => {
      const field = document.createElement("div");
      field.className = "inspector-field";
      const label = document.createElement("label");
      label.textContent = schema.label;
      label.setAttribute("for", `${nodeId}_${schema.key}`);
      field.appendChild(label);

      let control;
      switch (schema.type) {
        case "string":
          control = document.createElement("input");
          control.type = "text";
          control.value = String(
            node.properties[schema.key] ?? schema.defaultValue ?? ""
          );
          if (schema.placeholder) {
            control.placeholder = schema.placeholder;
          }
          break;
        case "number":
          control = document.createElement("input");
          control.type = "number";
          control.value = String(
            node.properties[schema.key] ?? schema.defaultValue ?? 0
          );
          break;
        case "boolean":
          control = document.createElement("input");
          control.type = "checkbox";
          control.checked = Boolean(node.properties[schema.key]);
          break;
        case "enum":
          control = document.createElement("select");
          (schema.options ?? []).forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.label;
            control.appendChild(opt);
          });
          control.value = String(
            node.properties[schema.key] ?? schema.defaultValue ?? ""
          );
          break;
        case "multiline":
          control = document.createElement("textarea");
          control.rows = 3;
          control.value = String(
            node.properties[schema.key] ?? schema.defaultValue ?? ""
          );
          break;
        default:
          control = document.createElement("input");
          control.type = "text";
          control.value = String(node.properties[schema.key] ?? "");
          break;
      }

      control.id = `${nodeId}_${schema.key}`;
      field.appendChild(control);
      this.inspectorContent.appendChild(field);

      control.addEventListener("change", () => {
        let value = control.value;
        if (schema.type === "number") {
          value = Number(control.value);
        } else if (schema.type === "boolean") {
          value = control.checked;
        }
        this.graph.setNodeProperty(nodeId, schema.key, value);
        definition.onPropertiesChanged?.(node.properties);
        if (schema.type === "enum") {
          window.requestAnimationFrame(() => {
            if (document.activeElement === control && typeof control.blur === "function") {
              control.blur();
            }
            this.#focusWorkspaceSurface({ force: true });
          });
        }
      });

      if (schema.type === "enum") {
        control.addEventListener("blur", () => {
          this.#focusWorkspaceSurface();
        });
      }

      const shouldFocus =
        this.pendingInspectorFocus &&
        this.pendingInspectorFocus.nodeId === nodeId &&
        this.pendingInspectorFocus.property === schema.key;
      if (shouldFocus && typeof control.focus === "function") {
        requestAnimationFrame(() => {
          control.focus();
          if ("select" in control && typeof control.select === "function") {
            control.select();
          }
        });
        this.pendingInspectorFocus = null;
      }
    });
  }

  /**
   * Renders inspector controls for sequence nodes.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Sequence node reference.
   */
  #renderSequenceInspector(node) {
    this.inspectorContent.innerHTML = "";

    const { branches } = this.#ensureSequenceBranches(node);

    const header = document.createElement("div");
    header.className = "sequence-branch-header";

    const title = document.createElement("div");
    title.className = "inspector-section-title";
    title.textContent = "Execution Outputs";
    header.appendChild(title);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "sequence-branch-add";
    addButton.textContent = "Add Output";
    addButton.addEventListener("click", () => {
      this.#addSequenceBranch(node.id);
    });
    header.appendChild(addButton);

    this.inspectorContent.appendChild(header);

    const list = document.createElement("div");
    list.className = "sequence-branch-list";

    if (!branches.length) {
      const empty = document.createElement("p");
      empty.className = "inspector-empty";
      empty.textContent = "No outputs configured.";
      list.appendChild(empty);
    } else {
      branches.forEach((branch, index) => {
        const row = document.createElement("div");
        row.className = "sequence-branch-row";
        row.dataset.branchId = branch.id;

        const label = document.createElement("span");
        label.className = "sequence-branch-label";
        label.textContent = this.#formatSequenceBranchLabel(index);
        row.appendChild(label);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className =
          "overview-item-action overview-item-action--remove sequence-branch-remove";
        removeButton.title = `Delete output ${label.textContent}`;
        removeButton.setAttribute(
          "aria-label",
          `Delete output ${label.textContent}`
        );
        removeButton.disabled = branches.length <= 1;
        removeButton.addEventListener("click", () => {
          this.#removeSequenceBranch(node.id, branch.id);
        });
        removeButton.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
        });
        row.appendChild(removeButton);

        list.appendChild(row);
      });
    }

    this.inspectorContent.appendChild(list);
  }

  /**
   * Renders inspector controls for a custom event node.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Node instance to inspect.
   */
  #renderCustomEventInspector(node) {
    this.inspectorContent.innerHTML = "";

    const pendingFocus =
      this.pendingInspectorFocus &&
      this.pendingInspectorFocus.nodeId === node.id
        ? this.pendingInspectorFocus.property
        : null;

    const nameField = document.createElement("div");
    nameField.className = "inspector-field";

    const nameLabel = document.createElement("label");
    nameLabel.setAttribute("for", `${node.id}_eventName`);
    nameLabel.textContent = "Event Name";
    nameField.appendChild(nameLabel);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = `${node.id}_eventName`;
    nameInput.placeholder = "Enter event name";
    nameInput.value =
      typeof node.properties.name === "string" ? node.properties.name : "";
    nameInput.addEventListener("change", () => {
      this.graph.setNodeProperty(node.id, "name", nameInput.value);
    });
    nameField.appendChild(nameInput);

    this.inspectorContent.appendChild(nameField);

    if (pendingFocus === "name" && typeof nameInput.focus === "function") {
      requestAnimationFrame(() => {
        nameInput.focus();
        if (typeof nameInput.select === "function") {
          nameInput.select();
        }
      });
      this.pendingInspectorFocus = null;
    }

    const header = document.createElement("div");
    header.className = "custom-event-parameter-header";

    const title = document.createElement("div");
    title.className = "inspector-section-title";
    title.textContent = "Parameters";
    header.appendChild(title);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "custom-event-parameter-add";
    addButton.textContent = "Add Parameter";
    addButton.addEventListener("click", () => {
      const created = this.#addCustomEventParameter(node.id);
      if (created) {
        this.pendingInspectorFocus = {
          nodeId: node.id,
          property: `parameter:${created.id}`,
        };
      }
    });
    header.appendChild(addButton);

    this.inspectorContent.appendChild(header);

    const list = document.createElement("div");
    list.className = "custom-event-parameter-list";

    const { parameters } = this.#sanitizeCustomEventParameters(node);

    if (!parameters.length) {
      const empty = document.createElement("p");
      empty.className = "inspector-empty";
      empty.textContent = "No parameters defined.";
      list.appendChild(empty);
    }

    parameters.forEach((parameter) => {
      const row = document.createElement("div");
      row.className = "custom-event-parameter-row";
      row.dataset.parameterId = parameter.id;
      row.dataset.parameterType = parameter.type;

      const typeButton = document.createElement("button");
      typeButton.type = "button";
      typeButton.className =
        "variable-type-button custom-event-parameter-type-button";
      typeButton.dataset.variableType = parameter.type;
      typeButton.setAttribute("aria-haspopup", "menu");
      typeButton.setAttribute("aria-expanded", "false");
      row.appendChild(typeButton);

      const nameInputElement = document.createElement("input");
      nameInputElement.type = "text";
      nameInputElement.value = parameter.name;
      nameInputElement.placeholder = "Parameter name";
      row.appendChild(nameInputElement);

      const refreshTypeLabel = (rawType) => {
        const normalized = this.#normalizeVariableType(rawType);
        const display = this.#formatVariableType(normalized);
        const referenceName = nameInputElement.value.trim() || parameter.id;
        row.dataset.parameterType = normalized;
        typeButton.dataset.variableType = normalized;
        typeButton.title = `Type: ${display}`;
        typeButton.setAttribute(
          "aria-label",
          `Change type for ${referenceName} (currently ${display})`
        );
      };

      refreshTypeLabel(parameter.type);

      const dropdownContext = {
        kind: "custom_event_parameter",
        nodeId: node.id,
        parameterId: parameter.id,
      };

      const openDropdown = () => {
        this.#openCustomEventParameterTypeDropdown(
          node.id,
          parameter.id,
          typeButton,
          row,
          (nextType) => {
            refreshTypeLabel(nextType);
          }
        );
      };

      typeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = this.#isTypeDropdownOpen(dropdownContext);
        if (isOpen) {
          this.#closeTypeDropdown();
        } else {
          openDropdown();
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
          openDropdown();
        } else if (event.key === "Escape") {
          event.preventDefault();
          this.#closeTypeDropdown();
        }
      });

      const optionalLabel = document.createElement("label");
      optionalLabel.className = "custom-event-parameter-optional";
      optionalLabel.title = "Optional";
      optionalLabel.setAttribute(
        "aria-label",
        `Toggle optional state for ${parameter.name || parameter.id}`
      );

      const optionalCheckbox = document.createElement("input");
      optionalCheckbox.type = "checkbox";
      optionalCheckbox.checked = Boolean(parameter.optional);
      optionalCheckbox.setAttribute(
        "aria-label",
        `Optional parameter ${parameter.name || parameter.id}`
      );
      optionalCheckbox.title = "Optional";
      optionalCheckbox.addEventListener("change", () => {
        this.#setCustomEventParameterOptional(
          node.id,
          parameter.id,
          optionalCheckbox.checked
        );
      });
      optionalLabel.appendChild(optionalCheckbox);
      row.appendChild(optionalLabel);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className =
        "overview-item-action overview-item-action--remove custom-event-parameter-action custom-event-parameter-action--remove";
      removeButton.setAttribute(
        "aria-label",
        `Delete parameter ${parameter.name || parameter.id}`
      );
      removeButton.title = `Delete ${parameter.name || parameter.id}`;
      removeButton.addEventListener("click", () => {
        this.#closeTypeDropdown();
        this.#removeCustomEventParameter(node.id, parameter.id);
      });
      removeButton.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      row.appendChild(removeButton);

      nameInputElement.addEventListener("change", () => {
        this.#renameCustomEventParameter(
          node.id,
          parameter.id,
          nameInputElement.value
        );
        refreshTypeLabel(row.dataset.parameterType ?? parameter.type);
        const trimmed = nameInputElement.value.trim();
        const labelText = trimmed || parameter.id;
        removeButton.setAttribute(
          "aria-label",
          `Delete parameter ${labelText}`
        );
        removeButton.title = `Delete ${labelText}`;
        optionalLabel.setAttribute(
          "aria-label",
          `Toggle optional state for ${labelText}`
        );
        optionalCheckbox.setAttribute(
          "aria-label",
          `Optional parameter ${labelText}`
        );
      });

      if (
        pendingFocus === `parameter:${parameter.id}` &&
        typeof nameInputElement.focus === "function"
      ) {
        requestAnimationFrame(() => {
          nameInputElement.focus();
          if (typeof nameInputElement.select === "function") {
            nameInputElement.select();
          }
        });
        this.pendingInspectorFocus = null;
      }

      list.appendChild(row);
    });

    this.inspectorContent.appendChild(list);
  }

  /**
   * Renders inspector controls for a call custom event node.
   *
   * @param {import('../core/BlueprintNode.js').BlueprintNode} node Node instance to inspect.
   */
  #renderCallCustomEventInspector(node) {
    const field = document.createElement("div");
    field.className = "inspector-field";
    const controlId = `${node.id}_eventId`;

    const label = document.createElement("label");
    label.setAttribute("for", controlId);
    label.textContent = "Target Event";
    field.appendChild(label);

    const select = document.createElement("select");
    select.id = controlId;

    const events = this.#getCustomEventNodes()
      .map((eventNode) => ({
        id: eventNode.id,
        label: this.#resolveCustomEventLabel(eventNode),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = events.length
      ? "Select event"
      : "No custom events available";
    select.appendChild(placeholder);

    events.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.label;
      select.appendChild(option);
    });

    const storedEventId =
      typeof node.properties.eventId === "string"
        ? node.properties.eventId
        : "";
    if (storedEventId && events.some((entry) => entry.id === storedEventId)) {
      select.value = storedEventId;
    } else {
      select.value = "";
    }

    select.disabled = events.length === 0;
    select.addEventListener("change", () => {
      const next = select.value;
      const current =
        typeof node.properties.eventId === "string"
          ? node.properties.eventId
          : "";
      if (next === current) {
        return;
      }
      this.graph.setNodeProperty(node.id, "eventId", next);
    });

    field.appendChild(select);
    this.inspectorContent.appendChild(field);

    if (!events.length) {
      const helper = document.createElement("p");
      helper.className = "inspector-empty";
      helper.textContent = "Add a Custom Event node to call it here.";
      this.inspectorContent.appendChild(helper);
    }

    const shouldFocus =
      this.pendingInspectorFocus &&
      this.pendingInspectorFocus.nodeId === node.id &&
      this.pendingInspectorFocus.property === "eventId";
    if (shouldFocus) {
      requestAnimationFrame(() => {
        select.focus();
      });
      this.pendingInspectorFocus = null;
    }
  }

  /**
   * Regenerates and caches the Lua output for the current graph state.
   *
   * @returns {string}
   */
  #refreshLuaOutput() {
    try {
      this.luaOutput = this.generator.generate(this.graph, {
        variables: this.#getGeneratorVariableMetadata(),
      });
    } catch (error) {
      console.error("Failed to generate Lua", error);
      this.luaOutput = "-- generation error";
    }
    return this.luaOutput;
  }

  /**
   * Creates a serializable snapshot of the current workspace.
   *
   * @returns {SerializedWorkspace}
   */
  serializeWorkspace() {
    return this.persistenceManager.serializeWorkspace();
  }

  /**
   * Applies a persisted workspace payload to the live workspace.
   *
   * @param {SerializedWorkspace} payload Persisted workspace data.
   */
  applySerializedWorkspace(payload) {
    this.isRestoring = true;
    try {
      this.persistenceManager.cancelScheduledPersist();

      this.contextMenuManager.hide();
  this.#closeTypeDropdown();
      this.dragManager.removePaletteGhost();
      this.dragManager.removeNodeGhost();

      this.nodeElements.forEach((element) => element.remove());
      this.connectionElements.forEach((path) => path.remove());
      this.nodeElements.clear();
      this.connectionElements.clear();
      this.inlineEditorManager.clear();
      this.nodeDragRotation.clear();
      this.dragManager.stopNodeRotationDecay();
  this.marqueeManager?.clear();
      this.#cancelConnectionRefresh();
      this.isDraggingNodes = false;
      this.highlightedPins.clear();

      this.pendingConnection = null;
      this.pendingConnectionSpawn = null;
      this.pendingVariableSpawn = null;
      this.selectedNodeIds.clear();
      this.selectedNodeId = undefined;
      this.selectedVariableId = null;
      this.activeVariableRename = null;

      this.variables.clear();
      this.variableOrder = [];
      this.variableCounter = 0;

      const variablesPayload =
        payload && typeof payload.variables === "object"
          ? payload.variables
          : null;
      if (variablesPayload && Array.isArray(variablesPayload.entries)) {
        variablesPayload.entries.forEach((entry) => {
          if (!entry || typeof entry !== "object") {
            return;
          }
          const id = typeof entry.id === "string" ? entry.id : "";
          if (!id) {
            return;
          }
          const name =
            typeof entry.name === "string" && entry.name.trim()
              ? entry.name
              : id;
          const type =
            entry.type === "number" ||
            entry.type === "string" ||
            entry.type === "boolean" ||
            entry.type === "any" ||
            entry.type === "table"
              ? entry.type
              : "any";
          const defaultValue = this.#normalizeVariableDefault(
            type,
            entry.defaultValue
          );
          this.variables.set(id, { id, name, type, defaultValue });
          this.variableOrder.push(id);
        });
        const storedCounter =
          typeof variablesPayload.counter === "number" &&
          Number.isFinite(variablesPayload.counter)
            ? variablesPayload.counter
            : this.variableOrder.length;
        this.variableCounter = Math.max(
          storedCounter,
          this.variableOrder.length
        );
      }

      const graphPayload =
        payload && typeof payload.graph === "object"
          ? payload.graph
          : { nodes: [], connections: [] };
      this.graph = NodeGraph.fromJSON(graphPayload);
      this.#bindGraphEvents();

      this.spawnIndex =
        typeof payload?.spawnIndex === "number" &&
        Number.isFinite(payload.spawnIndex)
          ? payload.spawnIndex
          : this.graph.nodes.size;

      this.#rebuildNodeCounters();

      this.graph.nodes.forEach((node) => {
        this.nodeRenderer.renderNode(node);
        if (node.type === "sequence") {
          this.#refreshSequenceNode(node.id);
        } else if (node.type === "custom_event") {
          this.#refreshCustomEventNode(node.id);
        } else if (node.type === "call_custom_event") {
          this.#refreshCustomEventCallNode(node.id);
        }
      });
      this.#renderConnections();

      const settings =
        payload && typeof payload.projectSettings === "object"
          ? payload.projectSettings
          : null;
      if (settings) {
        this.projectSettings = {
          use60Fps: Boolean(settings.use60Fps),
        };
      }
      if (typeof this.generator.setProjectSettings === "function") {
        this.generator.setProjectSettings({ ...this.projectSettings });
      }

      const uiSettings =
        payload && typeof payload.ui === "object" ? payload.ui : null;
      const paletteVisible =
        typeof uiSettings?.paletteVisible === "boolean"
          ? uiSettings.paletteVisible
          : true;
      this.isPaletteVisible = paletteVisible;
      this.#applyPaletteVisibility(this.isPaletteVisible);

  this.navigationManager.setBackgroundOffset({ x: 0, y: 0 });
      this.#updateProjectSettingsToggle();
      this.#renderOverview();
      this.#setInspectorView("default");
      this.#applySelectionState();
  this.nodeRenderer.refreshAllPinConnections();
      this.#refreshLuaOutput();
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Restores camera/view-related state from a history snapshot.
   *
   * @param {{ backgroundOffset: { x: number, y: number }, zoom: number }} view Snapshot view payload.
   */
  applyHistoryView(view) {
    if (!view) {
      return;
    }

    const normalizedZoom = Number.isFinite(view.zoom) ? view.zoom : this.zoomLevel;
    const normalizedOffset = {
      x: Number.isFinite(view.backgroundOffset?.x)
        ? view.backgroundOffset.x
        : this.workspaceBackgroundOffset?.x ?? 0,
      y: Number.isFinite(view.backgroundOffset?.y)
        ? view.backgroundOffset.y
        : this.workspaceBackgroundOffset?.y ?? 0,
    };

    if (this.navigationManager) {
      this.navigationManager.setZoomLevel(normalizedZoom, { silent: false });
      this.navigationManager.setBackgroundOffset(normalizedOffset);
      this.navigationManager.updateZoomDisplay();
    } else {
      this.zoomLevel = normalizedZoom;
      this.workspaceBackgroundOffset = normalizedOffset;
    }
  }

  /**
   * Restores selection state from a history snapshot.
   *
   * @param {{ nodes: Array<string>, primary: string | null, variable: string | null }} selection Snapshot selection payload.
   */
  applyHistorySelection(selection) {
    if (!selection) {
      return;
    }

    const nodes = Array.isArray(selection.nodes) ? selection.nodes : [];
    const primary = typeof selection.primary === "string" ? selection.primary : undefined;
    const variable = typeof selection.variable === "string" ? selection.variable : null;

    if (variable) {
      const exists = this.variables.has(variable);
      this.selectedVariableId = exists ? variable : null;
    } else {
      this.selectedVariableId = null;
    }

    this.setSelectionState(nodes, primary);
  }

  /**
   * Rebuilds node identifier counters from the current graph state.
   */
  #rebuildNodeCounters() {
    const counters = new Map();
    this.graph.nodes.forEach((node) => {
      const match = /_(\d+)$/.exec(node.id);
      const numeric = match ? Number.parseInt(match[1], 10) : 0;
      const current = counters.get(node.type) ?? 0;
      counters.set(node.type, Math.max(current, numeric));
    });
    this.graph.nodeCounters = counters;
  }
}
