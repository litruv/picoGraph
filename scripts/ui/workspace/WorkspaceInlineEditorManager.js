import { createColorSwatchPicker } from '../ColorSwatchPicker.js';
import { getTypeColor } from '../../types/TypeRegistry.js';

/** @typedef {import('../../core/BlueprintNode.js').BlueprintNode} BlueprintNode */
/** @typedef {import('../../core/BlueprintNode.js').PinDescriptor} PinDescriptor */
/** @typedef {import('../../core/NodeGraph.js').NodeGraph} NodeGraph */
/** @typedef {import('../../nodes/NodeRegistry.js').NodeRegistry} NodeRegistry */
/** @typedef {import('../BlueprintWorkspace.js').VariableType} VariableType */

/**
 * Manages inline literal and pin editors for workspace nodes.
 */
export class WorkspaceInlineEditorManager {
  /**
   * @param {{
   *   getGraph: () => NodeGraph,
   *   registry: NodeRegistry,
   *   formatVariableType?: (type: VariableType) => string,
   *   openLocalVariableTypeDropdown?: (
   *     nodeId: string,
   *     trigger: HTMLButtonElement,
   *     anchor: HTMLElement,
   *     currentType: VariableType,
   *     onSelect: (type: VariableType) => void
   *   ) => void,
   *   closeTypeDropdown?: () => void,
   *   isTypeDropdownOpen?: (context: { kind: 'local_variable', nodeId: string }) => boolean,
   * }} options Inline editor dependencies.
   */
  constructor(options) {
    this.#getGraph = options.getGraph;
    this.registry = options.registry;
    this.#formatVariableType =
      typeof options.formatVariableType === "function"
        ? (type) => options.formatVariableType(type)
        : (type) => {
            const value = typeof type === "string" ? type : "";
            if (!value.length) {
              return "";
            }
            return value.charAt(0).toUpperCase() + value.slice(1);
          };
    this.#openLocalTypeDropdown =
      typeof options.openLocalVariableTypeDropdown === "function"
        ? options.openLocalVariableTypeDropdown
        : null;
    this.#closeTypeDropdown =
      typeof options.closeTypeDropdown === "function"
        ? options.closeTypeDropdown
        : () => {};
    this.#isTypeDropdownOpen =
      typeof options.isTypeDropdownOpen === "function"
        ? options.isTypeDropdownOpen
        : () => false;
    /**
     * @type {Map<string, {
     *   literal?: { setValue: (value: unknown) => void },
     *   pinEditors: Map<string, { setValue: (value: unknown) => void, setConnected: (connected: boolean) => void }>
     * }>}
     */
    this.inlineEditors = new Map();
  }

  /**
   * Creates inline literal editor controls for supported nodes.
   *
   * @param {BlueprintNode} node Target node instance.
   * @param {HTMLElement} article Node root article element.
   * @param {HTMLElement} inputContainer Container holding input pins.
   * @returns {{ setValue: (value: unknown) => void } | null}
   */
  setupLiteralEditor(node, article, inputContainer) {
    if (node.type === "set_local_var" || node.type === "get_local_var") {
      return this.#setupLocalVariableEditor(node, article, inputContainer);
    }

    const supported = new Set([
      "number_literal",
      "string_literal",
      "boolean_literal",
      "color_literal",
    ]);
    if (!supported.has(node.type)) {
      return null;
    }

    const existing = article.querySelector(".node-body");
    const body = existing ?? document.createElement("div");
    body.className = "node-body";
    if (!existing) {
      article.insertBefore(body, inputContainer);
    }
    body.innerHTML = "";

    const editor = document.createElement("div");
    editor.className = "literal-inline-editor";
    body.appendChild(editor);

    const controlId = `${node.id}_inline_value`;
    const label = document.createElement("label");
    label.className = "literal-inline-label";
    label.setAttribute("for", controlId);
    label.textContent = "Value";
    editor.appendChild(label);

    const graph = this.#getGraph();

    if (node.type === "color_literal") {
      const picker = createColorSwatchPicker({
        id: controlId,
        value: node.properties.value ?? 7,
        onChange: (index) => {
          graph.setNodeProperty(node.id, "value", index);
        },
      });
      editor.appendChild(picker.element);

      const setValue = (rawValue) => {
        const n = Number(rawValue);
        picker.setValue(Number.isFinite(n) ? n : 7);
      };

      const entry = this.#ensureEntry(node.id);
      entry.literal = { setValue };
      return entry.literal;
    }

    let control;
    const commitNumber = () => {
      const numeric = Number(control.value);
      const value = Number.isFinite(numeric) ? numeric : 0;
      graph.setNodeProperty(node.id, "value", value);
    };

    switch (node.type) {
      case "number_literal": {
        control = document.createElement("input");
        control.type = "number";
        control.step = "any";
        control.className = "literal-inline-input";
        control.addEventListener("change", commitNumber);
        control.addEventListener("blur", commitNumber);
        break;
      }
      case "string_literal": {
        control = document.createElement("input");
        control.type = "text";
        control.className = "literal-inline-input";
        control.spellcheck = false;
        control.addEventListener("input", () => {
          graph.setNodeProperty(node.id, "value", control.value);
        });
        break;
      }
      case "boolean_literal": {
        control = document.createElement("input");
        control.type = "checkbox";
        control.className = "literal-inline-checkbox";
        control.addEventListener("change", () => {
          graph.setNodeProperty(node.id, "value", control.checked);
        });
        break;
      }
      default:
        return null;
    }

    control.id = controlId;
    editor.appendChild(control);

    const setValue = (rawValue) => {
      switch (node.type) {
        case "number_literal": {
          const numeric = Number(rawValue);
          control.value = Number.isFinite(numeric) ? String(numeric) : "0";
          break;
        }
        case "string_literal": {
          control.value = rawValue == null ? "" : String(rawValue);
          break;
        }
        case "boolean_literal": {
          control.checked = this.#isTruthy(rawValue);
          break;
        }
        default:
          break;
      }
    };

    setValue(node.properties.value);

    const entry = this.#ensureEntry(node.id);
    entry.literal = { setValue };
    return entry.literal;
  }

  #setupLocalVariableEditor(node, article, inputContainer) {
    const typeOptions = [
      { value: "number", label: "Number" },
      { value: "string", label: "String" },
      { value: "boolean", label: "Boolean" },
      { value: "table", label: "Table" },
      { value: "color", label: "Color" },
    ];

    const ensureBody = () => {
      const existing = article.querySelector(".node-body");
      if (existing) {
        existing.innerHTML = "";
        return existing;
      }
      const body = document.createElement("div");
      body.className = "node-body";
      article.insertBefore(body, inputContainer);
      return body;
    };

    const body = ensureBody();
    const editor = document.createElement("div");
    editor.className = "local-variable-editor";
    body.appendChild(editor);

    const headerRow = document.createElement("div");
    headerRow.className = "local-variable-row local-variable-row--header";
    editor.appendChild(headerRow);

    const typeAnchor = document.createElement("div");
    typeAnchor.className = "local-variable-type";
    headerRow.appendChild(typeAnchor);

    const typeButton = document.createElement("button");
    typeButton.type = "button";
    typeButton.className = "variable-type-button local-variable-type-button";
    typeButton.setAttribute("aria-haspopup", "menu");
    typeButton.setAttribute("aria-expanded", "false");
    typeAnchor.appendChild(typeButton);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "local-variable-name-input";
    nameInput.placeholder = "localVar";
    nameInput.setAttribute("spellcheck", "false");
    nameInput.setAttribute("aria-label", "Local variable name");
    headerRow.appendChild(nameInput);

    const valueContainer = document.createElement("div");
    valueContainer.className = "local-variable-inline-value";
    const valueField = document.createElement("div");
    valueField.className = "local-variable-inline-value-field";
    valueContainer.appendChild(valueField);

    const attachValueContainer = () => {
      if (node.type !== "set_local_var") {
        if (valueContainer.isConnected) {
          valueContainer.remove();
        }
        return;
      }
      const valuePin = article.querySelector(
        ".node-inputs .pin[data-pin-id='value']"
      );
      if (!valuePin) {
        return;
      }

      const parent = valuePin.parentElement;
      if (!parent) {
        return;
      }

      if (valueContainer.parentElement !== parent) {
        valuePin.insertAdjacentElement("afterend", valueContainer);
        return;
      }

      if (valuePin.nextElementSibling !== valueContainer) {
        valuePin.insertAdjacentElement("afterend", valueContainer);
      }
    };

    const graph = this.#getGraph();

    const normalizeType = (value) => {
      const candidate = typeof value === "string" ? value : "number";
      return typeOptions.some((option) => option.value === candidate)
        ? candidate
        : "number";
    };

    const formatType = (type) => {
      return this.#formatVariableType(normalizeType(type));
    };

    const resolveValuePropertyKey = (type) => {
      switch (type) {
        case "string":
          return "valueString";
        case "boolean":
          return "valueBoolean";
        case "table":
          return "valueTable";
        case "color":
          return "valueColor";
        case "number":
        default:
          return "valueNumber";
      }
    };

    const resolveValueControlKind = (type) => {
      switch (type) {
        case "boolean":
          return "boolean";
        case "string":
          return "string";
        case "table":
          return "table";
        case "color":
          return "color";
        default:
          return "number";
      }
    };

    const defaultValueForType = (type) => {
      switch (type) {
        case "string":
          return "";
        case "boolean":
          return false;
        case "table":
          return "{}";
        case "color":
          return 7;
        case "number":
        default:
          return 0;
      }
    };

    let activeType = normalizeType(node.properties.variableType);

    const updateTypeButton = (type) => {
      const normalized = normalizeType(type);
      activeType = normalized;
      typeButton.dataset.variableType = normalized;
      typeButton.style.setProperty("--overview-variable-color", getTypeColor(normalized));
      const label = formatType(normalized);
      typeButton.title = `Type: ${label}`;
      typeButton.setAttribute(
        "aria-label",
        `Change local variable type (currently ${label})`
      );
    };

    const renderValueControl = (currentNode, type) => {
      if (currentNode.type !== "set_local_var") {
        if (valueContainer.isConnected) {
          valueContainer.remove();
        }
        valueField.innerHTML = "";
        return;
      }
      const key = resolveValuePropertyKey(type);
      const current = currentNode.properties?.[key];
      const ensureValueControl = () => {
        const desiredKind = resolveValueControlKind(type);
        const existing = valueField.firstElementChild;
        if (
          existing instanceof HTMLElement &&
          existing.dataset.localValueKind === desiredKind
        ) {
          return /** @type {HTMLElement} */ (existing);
        }

        valueField.innerHTML = "";
        let control;
        if (desiredKind === "boolean") {
          const select = document.createElement("select");
          select.className = "local-variable-boolean";
          select.setAttribute("aria-label", "Local variable value");
          const trueOption = document.createElement("option");
          trueOption.value = "true";
          trueOption.textContent = "True";
          const falseOption = document.createElement("option");
          falseOption.value = "false";
          falseOption.textContent = "False";
          select.appendChild(trueOption);
          select.appendChild(falseOption);
          select.addEventListener("change", () => {
            const next = select.value === "true";
            graph.setNodeProperty(currentNode.id, key, next);
          });
          control = select;
        } else if (desiredKind === "string") {
          const input = document.createElement("input");
          input.type = "text";
          input.className = "local-variable-text";
          input.setAttribute("aria-label", "Local variable value");
          input.addEventListener("input", () => {
            graph.setNodeProperty(currentNode.id, key, input.value);
          });
          control = input;
        } else if (desiredKind === "table") {
          const textarea = document.createElement("textarea");
          textarea.className = "local-variable-textarea";
          textarea.rows = 2;
          textarea.setAttribute("aria-label", "Local variable value");
          textarea.addEventListener("input", () => {
            graph.setNodeProperty(currentNode.id, key, textarea.value);
          });
          control = textarea;
        } else if (desiredKind === "color") {
          const rawColor = currentNode.properties?.[key];
          const n = Number(rawColor);
          const initialIndex = Number.isFinite(n) ? Math.max(0, Math.min(15, Math.round(n))) : 7;
          const picker = createColorSwatchPicker({
            value: initialIndex,
            onChange: (index) => {
              graph.setNodeProperty(currentNode.id, key, index);
            },
          });
          picker.element.dataset.localValueKind = "color";
          /** @type {any} */ (picker.element)._setColorValue = picker.setValue;
          valueField.appendChild(picker.element);
          return picker.element;
        } else {
          const numberInput = document.createElement("input");
          numberInput.type = "number";
          numberInput.step = "any";
          numberInput.className = "local-variable-number";
          numberInput.setAttribute("aria-label", "Local variable value");
          const commit = () => {
            const value = Number(numberInput.value);
            const next = Number.isFinite(value) ? value : 0;
            numberInput.value = String(next);
            graph.setNodeProperty(currentNode.id, key, next);
          };
          numberInput.addEventListener("change", commit);
          numberInput.addEventListener("blur", commit);
          control = numberInput;
        }

        control.dataset.localValueKind = desiredKind;
        valueField.appendChild(control);
        return control;
      };

      const control = ensureValueControl();

      if (control instanceof HTMLSelectElement) {
        const nextValue = current ? "true" : "false";
        if (control.value !== nextValue) {
          control.value = nextValue;
        }
      } else if (/** @type {any} */ (control)._setColorValue) {
        const n = Number(current);
        const index = Number.isFinite(n) ? Math.max(0, Math.min(15, Math.round(n))) : 7;
        /** @type {any} */ (control)._setColorValue(index);
      } else if (control instanceof HTMLTextAreaElement) {
        const nextValue = typeof current === "string" ? current : "{}";
        if (control.value !== nextValue) {
          control.value = nextValue;
        }
      } else if (control instanceof HTMLInputElement) {
        if (control.type === "text") {
          const nextValue = typeof current === "string" ? current : "";
          if (control.value !== nextValue) {
            control.value = nextValue;
          }
        } else {
          const numeric = Number(current);
          const nextValue = Number.isFinite(numeric) ? String(numeric) : "0";
          if (control.value !== nextValue) {
            control.value = nextValue;
          }
        }
      }

      attachValueContainer();
    };

    const applyTypeChange = (rawType) => {
      const nextType = normalizeType(rawType);
      const key = resolveValuePropertyKey(nextType);
      const currentNode = graph.nodes.get(node.id) ?? node;
      const existing = currentNode.properties?.[key];
      const fallback = existing ?? defaultValueForType(nextType);
      updateTypeButton(nextType);
      graph.setNodeProperty(currentNode.id, "variableType", nextType);
      graph.setNodeProperty(currentNode.id, key, fallback);
      const refreshed = graph.nodes.get(node.id) ?? currentNode;
      renderValueControl(refreshed, nextType);
    };

    const entry = this.#ensureEntry(node.id);

    const setState = (currentNode) => {
      const currentType = normalizeType(currentNode.properties.variableType);
      updateTypeButton(currentType);
      const currentName =
        typeof currentNode.properties.name === "string"
          ? currentNode.properties.name
          : "localVar";
      if (nameInput.value !== currentName) {
        nameInput.value = currentName;
      }
      renderValueControl(currentNode, currentType);
    };

    const openDropdown = () => {
      if (!this.#openLocalTypeDropdown) {
        return;
      }
      this.#openLocalTypeDropdown(
        node.id,
        typeButton,
        typeAnchor,
        activeType,
        (selectedType) => {
          applyTypeChange(selectedType);
        }
      );
    };

    typeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.#openLocalTypeDropdown) {
        return;
      }
      const context = { kind: "local_variable", nodeId: node.id };
      const isOpen = this.#isTypeDropdownOpen(context);
      if (isOpen) {
        this.#closeTypeDropdown();
        return;
      }
      openDropdown();
    });

    typeButton.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    typeButton.addEventListener("keydown", (event) => {
      const isToggle =
        event.key === "Enter" || event.key === " " || event.key === "Spacebar";
      if (isToggle || event.key === "ArrowDown") {
        event.preventDefault();
        openDropdown();
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.#closeTypeDropdown();
      }
    });

    nameInput.addEventListener("blur", () => {
      graph.setNodeProperty(node.id, "name", nameInput.value);
    });

    nameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        graph.setNodeProperty(node.id, "name", nameInput.value);
        nameInput.blur();
      }
    });

    entry.literal = { setState };
    setState(node);
    return entry.literal;
  }

  /**
   * Creates inline pin editors when supported.
   *
   * @param {BlueprintNode} node Current node instance.
   * @param {PinDescriptor} pin Pin descriptor.
   * @param {HTMLElement} container Pin container element.
   */
  setupPinEditor(node, pin, container) {
    if (pin.direction !== "input") {
      return;
    }

    const isIfCondition = node.type === "if" && pin.id === "condition";
    const isColorPin = pin.kind === "color";
    const pinOptions =
      Array.isArray(pin.options) && pin.options.length > 0 ? pin.options : null;
    if (!isIfCondition && !pinOptions && !isColorPin) {
      container.classList.remove("has-inline-dropdown");
      return;
    }

    const entry = this.#ensureEntry(node.id);
    const propertyKey = this.#pinPropertyKey(pin.id);
    const graph = this.#getGraph();

    if (!(propertyKey in node.properties)) {
      if (pinOptions) {
        const defaultStr =
          pin.defaultValue != null
            ? String(pin.defaultValue)
            : String(pinOptions[0]?.value ?? "");
        node.properties[propertyKey] = defaultStr;
        if (!(pin.id in node.properties)) {
          node.properties[pin.id] = defaultStr;
        }
      } else {
        node.properties[propertyKey] = this.#defaultValueForPin(pin);
      }
    }

    container.querySelectorAll(".pin-inline-control").forEach((element) => {
      element.remove();
    });

    let wrapper;
    if (pinOptions) {
      wrapper = document.createElement("div");
      wrapper.className = "pin-inline-control pin-inline-dropdown";
      container.appendChild(wrapper);
    } else {
      wrapper = document.createElement("span");
      wrapper.className = "pin-inline-control";
      container.classList.remove("has-inline-dropdown");
      const label = container.querySelector(".pin-label");
      if (label) {
        container.insertBefore(wrapper, label);
      } else {
        container.appendChild(wrapper);
      }
    }

    if (isIfCondition && pin.kind === "boolean") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "pin-inline-checkbox";
      wrapper.appendChild(checkbox);

      const setValue = (value) => {
        checkbox.checked = this.#isTruthy(value);
      };

      const setConnected = (connected) => {
        wrapper.classList.toggle("is-hidden", connected);
      };

      checkbox.addEventListener("change", () => {
        graph.setNodeProperty(node.id, propertyKey, checkbox.checked);
      });

      entry.pinEditors.set(pin.id, { setValue, setConnected });
      setValue(node.properties[propertyKey]);
      setConnected(this.#hasConnection(node.id, pin.id));
      return;
    }

    if (pinOptions) {
      const optionValues = pinOptions.map((o) => String(o.value));

      const select = document.createElement("select");
      select.className = "pin-inline-select";
      select.setAttribute("aria-label", pin.name || pin.id);

      pinOptions.forEach((option) => {
        const element = document.createElement("option");
        element.value = String(option.value);
        element.textContent = option.label ?? String(option.value);
        select.appendChild(element);
      });

      const normalizeValue = (value) => {
        const candidate = value == null ? "" : String(value);
        return optionValues.includes(candidate)
          ? candidate
          : (optionValues[0] ?? "");
      };

      const setValue = (value) => {
        select.value = normalizeValue(value);
      };

      const setConnected = (connected) => {
        wrapper.classList.toggle("is-hidden", connected);
        container.classList.toggle("has-inline-dropdown", !connected);
      };

      select.addEventListener("change", () => {
        const nextValue = select.value;
        graph.setNodeProperty(node.id, propertyKey, nextValue);
        graph.setNodeProperty(node.id, pin.id, nextValue);
      });

      wrapper.appendChild(select);

      entry.pinEditors.set(pin.id, { setValue, setConnected });
      setValue(node.properties[propertyKey]);
      setConnected(this.#hasConnection(node.id, pin.id));
      return;
    }

    if (isColorPin) {
      const rawDefault = node.properties[propertyKey];
      const n = Number(rawDefault);
      const initialIndex = Number.isFinite(n)
        ? Math.max(0, Math.min(15, Math.round(n)))
        : 7;

      const picker = createColorSwatchPicker({
        value: initialIndex,
        onChange: (index) => {
          graph.setNodeProperty(node.id, propertyKey, index);
        },
      });
      wrapper.appendChild(picker.element);

      const setValue = (value) => {
        const num = Number(value);
        picker.setValue(Number.isFinite(num) ? num : 7);
      };

      const setConnected = (connected) => {
        wrapper.classList.toggle("is-hidden", connected);
      };

      entry.pinEditors.set(pin.id, { setValue, setConnected });
      setValue(node.properties[propertyKey]);
      setConnected(this.#hasConnection(node.id, pin.id));
    }
  }

  /**
   * Removes inline editors for pins no longer present on a node.
   *
   * @param {BlueprintNode} node Target node reference.
   */
  prunePinEditors(node) {
    const entry = this.inlineEditors.get(node.id);
    if (!entry?.pinEditors) {
      return;
    }
    const activePins = new Set(node.inputs.map((pin) => pin.id));
    [...entry.pinEditors.keys()].forEach((pinId) => {
      if (!activePins.has(pinId)) {
        entry.pinEditors.delete(pinId);
      }
    });
  }

  /**
   * Synchronizes inline editor controls with the graph state for the supplied node.
   *
   * @param {string} nodeId Node identifier.
   */
  syncNode(nodeId) {
    const entry = this.inlineEditors.get(nodeId);
    if (!entry) {
      return;
    }

    const graph = this.#getGraph();
    const node = graph.nodes.get(nodeId);
    if (!node) {
      return;
    }

    if (entry.literal) {
      if (typeof entry.literal.setState === "function") {
        entry.literal.setState(node);
      } else if (typeof entry.literal.setValue === "function") {
        entry.literal.setValue(node.properties.value);
      }
    }

    entry.pinEditors.forEach((pinEditor, pinId) => {
      const pin = node.getPin(pinId);
      const propertyKey = this.#pinPropertyKey(pinId);
      let value;

      if (Array.isArray(pin?.options) && pin.options.length > 0) {
        const canonical = node.properties[pinId];
        if (canonical != null) {
          const strValue = String(canonical);
          if (node.properties[propertyKey] !== strValue) {
            node.properties[propertyKey] = strValue;
          }
        }
      }

      if (propertyKey in node.properties) {
        value = node.properties[propertyKey];
      } else if (pin) {
        value = this.#defaultValueForPin(pin);
      } else {
        value = null;
      }

      pinEditor.setValue(value);
      pinEditor.setConnected(this.#hasConnection(nodeId, pinId));
    });
  }

  /** Synchronizes inline editors for every tracked node. */
  syncAll() {
    this.inlineEditors.forEach((_, nodeId) => this.syncNode(nodeId));
  }

  /**
   * Removes inline editor tracking for a node.
   *
   * @param {string} nodeId Node identifier.
   */
  removeNode(nodeId) {
    this.inlineEditors.delete(nodeId);
  }

  /** Clears all inline editor state. */
  clear() {
    this.inlineEditors.clear();
  }

  /**
   * Ensures inline editor entry exists for a node.
   *
   * @param {string} nodeId Node identifier.
   * @returns {{ literal?: { setValue: (value: unknown) => void }, pinEditors: Map<string, { setValue: (value: unknown) => void, setConnected: (connected: boolean) => void }> }}
   */
  #ensureEntry(nodeId) {
    let entry = this.inlineEditors.get(nodeId);
    if (!entry) {
      entry = { pinEditors: new Map() };
      this.inlineEditors.set(nodeId, entry);
    } else if (!entry.pinEditors) {
      entry.pinEditors = new Map();
    }
    return entry;
  }

  /**
   * Generates the property key used for storing inline pin overrides.
   *
   * @param {string} pinId Pin identifier.
   * @returns {string}
   */
  #pinPropertyKey(pinId) {
    return `pin:${pinId}`;
  }

  /**
   * Determines whether a pin has any connections.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @returns {boolean}
   */
  #hasConnection(nodeId, pinId) {
    const graph = this.#getGraph();
    return graph.getConnectionsForNode(nodeId, pinId).some((connection) => {
      const isTarget =
        connection.to.nodeId === nodeId && connection.to.pinId === pinId;
      const isSource =
        connection.from.nodeId === nodeId && connection.from.pinId === pinId;
      return isTarget || isSource;
    });
  }

  /**
   * Provides a reasonable default value for the supplied pin.
   *
   * @param {PinDescriptor} pin Pin descriptor.
   * @returns {unknown}
   */
  #defaultValueForPin(pin) {
    if (!pin) {
      return null;
    }
    if (pin.defaultValue !== undefined) {
      return pin.defaultValue;
    }
    switch (pin.kind) {
      case "boolean":
        return false;
      case "number":
        return 0;
      case "string":
        return "";
      case "color":
        return 7;
      default:
        return null;
    }
  }

  /**
   * Normalizes truthy values for inline boolean controls.
   *
   * @param {unknown} value Candidate value.
   * @returns {boolean}
   */
  #isTruthy(value) {
    if (typeof value === "string") {
      return value.toLowerCase() !== "false";
    }
    return Boolean(value);
  }

  /** @type {() => NodeGraph} */
  #getGraph;

  /** @type {(type: VariableType) => string} */
  #formatVariableType;

  /** @type {(nodeId: string, trigger: HTMLButtonElement, anchor: HTMLElement, currentType: VariableType, onSelect: (type: VariableType) => void) => void} */
  #openLocalTypeDropdown;

  /** @type {() => void} */
  #closeTypeDropdown;

  /** @type {(context: { kind: 'local_variable', nodeId: string }) => boolean} */
  #isTypeDropdownOpen;

}
