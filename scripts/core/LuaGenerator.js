/**
 * @typedef {import('./NodeGraph.js').NodeGraph} NodeGraph
 */

/**
 * @typedef {import('./BlueprintNode.js').BlueprintNode} BlueprintNode
 */

/**
 * @typedef {import('../nodes/NodeRegistry.js').NodeRegistry} NodeRegistry
 */

/**
 * @typedef {Object} ProjectSettings
 * @property {boolean} use60Fps Enables the 60fps update loop via _UPDATE60.
 */

/**
 * Converts a node graph into executable PICO-8 Lua code.
 */
export class LuaGenerator {
  /**
   * @param {NodeRegistry} registry Node registry for metadata lookups.
   */
  constructor(registry) {
    this.registry = registry;
    this.indentUnit = "  ";
    this.valueCache = new Map();
    this.valueStack = new Set();
    /** @type {Map<string, string>} */
    this.customEventFunctionNames = new Map();
    /**
     * @type {Map<string, Array<{ id: string, name: string, luaName: string, outputPinId: string, inputPinId: string, kind: string }>>}
     */
    this.customEventParameters = new Map();
    /** @type {Map<string, string>} */
    this.customEventParameterLookup = new Map();
    /** @type {Array<{ id: string, name: string, type: string, defaultValue: unknown }>} */
    this.variables = [];
    /** @type {Map<string, string>} */
    this.globalVariableNames = new Map();
    /** @type {ProjectSettings} */
    this.projectSettings = {
      use60Fps: false,
    };
  }

  /**
   * Applies project-level configuration.
   *
   * @param {ProjectSettings} settings Project configuration flags.
   */
  setProjectSettings(settings) {
    this.projectSettings = {
      use60Fps: Boolean(settings.use60Fps),
    };
  }

  /**
   * Updates the workspace variable metadata used for Lua generation.
   *
   * @param {Array<{ id: string, name: string, type: string, defaultValue: unknown }>} variables Variable definitions.
   */
  setVariables(variables) {
    if (!Array.isArray(variables)) {
      this.variables = [];
      return;
    }

    this.variables = variables.map((entry, index) => ({
      id: typeof entry?.id === "string" ? entry.id : `variable_${index}`,
      name: typeof entry?.name === "string" ? entry.name : "",
      type: this.#normalizeVariableType(entry?.type),
      defaultValue: Object.prototype.hasOwnProperty.call(entry ?? {}, "defaultValue")
        ? entry?.defaultValue
        : null,
    }));
  }

  /**
   * Generates Lua code for the provided graph instance.
   *
   * @param {NodeGraph} graph Blueprint graph to compile.
   * @returns {string}
   */
  generate(graph, options = {}) {
    this.graph = graph;
    this.connections = graph.getConnections();
    this.nodes = new Map(graph.getNodes().map((node) => [node.id, node]));
    this.valueCache.clear();
    this.valueStack.clear();
    this.globalVariableNames.clear();

    const variableEntries = Array.isArray(options)
      ? options
      : Array.isArray(options?.variables)
      ? options.variables
      : this.variables;

    this.setVariables(variableEntries);
    const globalDeclarations = this.#prepareGlobalVariableDeclarations(
      this.variables
    );

    const use60Fps = Boolean(this.projectSettings.use60Fps);
    const entryTypes = new Set(this.registry.getEntryNodeTypes());
    const entryEventMap = this.registry.getEntryPointEvents();
    const entryCandidates = [...this.nodes.values()].filter((node) =>
      entryTypes.has(node.type)
    );

    /** @type {Array<BlueprintNode>} */
    const customEvents = [];
    /** @type {Array<BlueprintNode>} */
    const entryNodes = [];

    entryCandidates.forEach((node) => {
      if (node.type === "custom_event") {
        customEvents.push(node);
      } else {
        entryNodes.push(node);
      }
    });

    if (!entryNodes.length && !customEvents.length) {
      return ["-- Generated with picoGraph", "-- No entry node present."].join(
        "\n"
      );
    }

    this.customEventFunctionNames =
      this.#buildCustomEventFunctionMap(customEvents);
    const { parameterMap, lookupMap } =
      this.#buildCustomEventParameterMap(customEvents);
    this.customEventParameters = parameterMap;
    this.customEventParameterLookup = lookupMap;

    /** @type {Map<string, Array<BlueprintNode>>} */
    const grouped = new Map();
    entryNodes.forEach((node) => {
      let eventName = entryEventMap.get(node.type) ?? "_init";
      if (eventName === "_update" && use60Fps) {
        eventName = "_update60";
      }
      const collection = grouped.get(eventName) ?? [];
      collection.push(node);
      grouped.set(eventName, collection);
    });

    const output = ["-- Generated with picoGraph"];
    if (globalDeclarations.length) {
      output.push("");
      output.push(...globalDeclarations);
    }
    const appendEvent = (eventName, node) => {
      const lines = this.#emitExecChain(node.id, 1, new Set());
      output.push("");
      output.push(`function ${eventName}()`);
      if (lines.length) {
        output.push(...lines);
      }
      output.push("end");
    };

    const preferredOrder = ["_init", "_update", "_update60", "_draw"];
    preferredOrder.forEach((eventName) => {
      const nodes = grouped.get(eventName);
      if (!nodes || !nodes.length) {
        return;
      }

      appendEvent(eventName, nodes[0]);
      grouped.delete(eventName);
    });

    const remainingEvents = [...grouped.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    remainingEvents.forEach(([eventName, nodes]) => {
      if (!nodes.length) {
        return;
      }
      appendEvent(eventName, nodes[0]);
    });

    if (customEvents.length) {
      const orderedCustomEvents = customEvents
        .slice()
        .sort((a, b) =>
          this.#getCustomEventDisplayName(a).localeCompare(
            this.#getCustomEventDisplayName(b)
          )
        );

      orderedCustomEvents.forEach((node) => {
        const functionName = this.customEventFunctionNames.get(node.id);
        if (!functionName) {
          return;
        }
        const signature = this.customEventParameters.get(node.id) ?? [];
        const parameterList = signature
          .map((entry) => entry.luaName)
          .join(", ");
        const lines = this.#emitExecChain(node.id, 1, new Set());
        output.push("");
        if (parameterList.length) {
          output.push(`function ${functionName}(${parameterList})`);
        } else {
          output.push(`function ${functionName}()`);
        }
        if (lines.length) {
          output.push(...lines);
        }
        output.push("end");
      });
    }

    return output.join("\n");
  }

  /**
   * Recursively walks the exec chain starting at a node.
   *
   * @param {string} nodeId Starting node identifier.
   * @param {number} indentLevel Indentation level.
   * @param {Set<string>} path Guard set preventing infinite recursion.
   * @returns {Array<string>}
   */
  #emitExecChain(nodeId, indentLevel, path) {
    if (path.has(nodeId)) {
      return [
        `${this.#indent(
          indentLevel
        )}-- cyclic exec connection involving ${nodeId}`,
      ];
    }
    path.add(nodeId);

    const node = this.nodes.get(nodeId);
    if (!node) {
      return [`${this.#indent(indentLevel)}-- missing node ${nodeId}`];
    }

    const lines = this.#emitFlowNode(node, indentLevel, path);
    path.delete(nodeId);
    return lines;
  }

  /**
   * Builds the execution context shared with node behaviors.
   *
   * @param {BlueprintNode} node Active node reference.
   * @param {number} indentLevel Current indentation level.
   * @param {Set<string>} path Cycle detection guard.
   * @returns {import('../nodes/nodeTypes.js').ExecContext}
   */
  #createExecContext(node, indentLevel, path) {
    return {
      node,
      indentLevel,
      path,
      indent: (level = indentLevel) => this.#indent(level),
      resolveValueInput: (pinId, fallback) =>
        this.#resolveValueInput(node, pinId, fallback),
      emitNextExec: (pinId, overrides = {}) => {
        const nextIndentLevel = overrides.indentLevel ?? indentLevel;
        const nextPath = overrides.path ?? path;
        return this.#emitNextExec(node.id, pinId, nextIndentLevel, nextPath);
      },
      emitBranch: (pinId, overrides = {}) => {
        const branchIndent = overrides.indentLevel ?? indentLevel;
        const branchPath = overrides.path ?? path;
        return this.#emitBranch(node.id, pinId, branchIndent, branchPath);
      },
      emitExecChain: (targetNodeId, targetIndentLevel, targetPath) =>
        this.#emitExecChain(targetNodeId, targetIndentLevel, targetPath),
      findExecTargets: (pinId) => this.#findExecTargets(node.id, pinId),
      sanitizeIdentifier: (value) => this.#sanitizeIdentifier(String(value)),
      sanitizeOperator: (value) => this.#sanitizeOperator(String(value)),
      formatLiteral: (kind, value) => this.#formatLiteral(kind, value),
    };
  }

  /**
   * Dispatches code generation for a specific flow node.
   *
   * @param {BlueprintNode} node Target node.
   * @param {number} indentLevel Indentation level.
   * @param {Set<string>} path Cycle guard collection.
   * @returns {Array<string>}
   */
  #emitFlowNode(node, indentLevel, path) {
    const behavior = this.registry.getBehavior(node.type);
    if (behavior?.emitExec) {
      return behavior.emitExec(
        this.#createExecContext(node, indentLevel, path)
      );
    }

    switch (node.type) {
      case "event_start":
      case "event_init":
      case "event_update":
      case "event_draw":
        return this.#emitNextExec(node.id, "exec_out", indentLevel, path);
      case "print":
        return this.#emitPrint(node, indentLevel, path);
      case "set_var":
        return this.#emitSetVariable(node, indentLevel, path);
      case "if":
        return this.#emitIf(node, indentLevel, path);
      case "for_loop":
        return this.#emitForLoop(node, indentLevel, path);
      case "sequence":
        return this.#emitSequence(node, indentLevel, path);
      case "call_custom_event":
        return this.#emitCallCustomEvent(node, indentLevel, path);
      default:
        return [
          `${this.#indent(indentLevel)}-- unsupported flow node: ${node.title}`,
        ];
    }
  }

  /**
   * Builds the value context shared with node behaviors.
   *
   * @param {BlueprintNode} node Active node reference.
   * @param {string} pinId Value output pin.
   * @returns {import('../nodes/nodeTypes.js').ValueContext & { pinId: string }}
   */
  #createValueContext(node, pinId) {
    return {
      node,
      pinId,
      resolveValueInput: (inputPinId, fallback) =>
        this.#resolveValueInput(node, inputPinId, fallback),
      sanitizeIdentifier: (value) => this.#sanitizeIdentifier(String(value)),
      sanitizeOperator: (value) => this.#sanitizeOperator(String(value)),
      formatLiteral: (kind, value) => this.#formatLiteral(kind, value),
    };
  }

  /**
   * Emits Lua for a print node.
   *
   * @param {BlueprintNode} node Print node.
   * @param {number} indentLevel Indent level.
   * @param {Set<string>} path Cycle guard.
   * @returns {Array<string>}
   */
  #emitPrint(node, indentLevel, path) {
    const text = this.#resolveValueInput(node, "msg", '""');
    const x = this.#resolveValueInput(node, "x", "0");
    const y = this.#resolveValueInput(node, "y", "0");
    const color = this.#resolveValueInput(node, "color", "7");
    const line = `${this.#indent(
      indentLevel
    )}print(${text}, ${x}, ${y}, ${color})`;
    return [
      line,
      ...this.#emitNextExec(node.id, "exec_out", indentLevel, path),
    ];
  }

  /**
   * Emits Lua for a variable assignment node.
   *
   * @param {BlueprintNode} node Set variable node.
   * @param {number} indentLevel Indent level.
   * @param {Set<string>} path Cycle guard.
   * @returns {Array<string>}
   */
  #emitSetVariable(node, indentLevel, path) {
    const name = this.#resolveWorkspaceVariableName(node);
    const value = this.#resolveValueInput(node, "value", "nil");
    const line = `${this.#indent(indentLevel)}${name} = ${value}`;
    return [
      line,
      ...this.#emitNextExec(node.id, "exec_out", indentLevel, path),
    ];
  }

  /**
   * Emits Lua for a branch node.
   *
   * @param {BlueprintNode} node Branch node.
   * @param {number} indentLevel Indent level.
   * @param {Set<string>} path Cycle guard.
   * @returns {Array<string>}
   */
  #emitIf(node, indentLevel, path) {
    const condition = this.#resolveValueInput(node, "condition", "false");
    const lines = [`${this.#indent(indentLevel)}if ${condition} then`];

    const thenLines = this.#emitBranch(
      node.id,
      "then",
      indentLevel + 1,
      new Set(path)
    );
    if (!thenLines.length) {
      lines.push(`${this.#indent(indentLevel + 1)}-- then branch`);
    } else {
      lines.push(...thenLines);
    }

    const elseTargets = this.#findExecTargets(node.id, "else");
    if (elseTargets.length) {
      lines.push(`${this.#indent(indentLevel)}else`);
      const elseLines = this.#emitBranch(
        node.id,
        "else",
        indentLevel + 1,
        new Set(path)
      );
      if (!elseLines.length) {
        lines.push(`${this.#indent(indentLevel + 1)}-- else branch`);
      } else {
        lines.push(...elseLines);
      }
    }

    lines.push(`${this.#indent(indentLevel)}end`);
    return lines;
  }

  /**
   * Emits Lua for a for-loop node.
   *
   * @param {BlueprintNode} node Loop node.
   * @param {number} indentLevel Indent level.
   * @param {Set<string>} path Cycle guard.
   * @returns {Array<string>}
   */
  #emitForLoop(node, indentLevel, path) {
    const indexName = this.#sanitizeIdentifier(
      String(node.properties.index ?? "i")
    );
    const startValue = this.#resolveValueInput(node, "start", "0");
    const endValue = this.#resolveValueInput(node, "end", "0");
    const stepValue = this.#resolveValueInput(node, "step", "1");

    const lines = [
      `${this.#indent(
        indentLevel
      )}for ${indexName} = ${startValue}, ${endValue}, ${stepValue} do`,
    ];

    const loopLines = this.#emitBranch(
      node.id,
      "loop",
      indentLevel + 1,
      new Set(path)
    );
    if (!loopLines.length) {
      lines.push(`${this.#indent(indentLevel + 1)}-- loop body`);
    } else {
      lines.push(...loopLines);
    }

    lines.push(`${this.#indent(indentLevel)}end`);
    lines.push(...this.#emitBranch(node.id, "completed", indentLevel, path));
    return lines;
  }

  /**
   * Emits Lua for a sequence node, executing each branch in order.
   *
   * @param {BlueprintNode} node Sequence node.
   * @param {number} indentLevel Indentation level.
   * @param {Set<string>} path Cycle guard collection.
   * @returns {Array<string>}
   */
  #emitSequence(node, indentLevel, path) {
    const lines = [];
    node.outputs.forEach((pin) => {
      const label = (pin.name ?? pin.id).toLowerCase();
      lines.push(`${this.#indent(indentLevel)}-- sequence ${label}`);

      const targets = this.#findExecTargets(node.id, pin.id);
      if (!targets.length) {
        return;
      }

      targets.forEach((target) => {
        const branchPath = new Set(path);
        lines.push(
          ...this.#emitExecChain(target.nodeId, indentLevel, branchPath)
        );
      });
    });
    return lines;
  }

  /**
   * Emits Lua for a call custom event node.
   *
   * @param {BlueprintNode} node Call node reference.
   * @param {number} indentLevel Indentation level.
   * @param {Set<string>} path Cycle detection guard.
   * @returns {Array<string>}
   */
  #emitCallCustomEvent(node, indentLevel, path) {
    const eventId =
      typeof node.properties.eventId === "string"
        ? node.properties.eventId
        : "";
    const functionName = eventId
      ? this.customEventFunctionNames.get(eventId)
      : null;
    const lines = [];
    if (functionName) {
      const signature = this.customEventParameters.get(eventId) ?? [];
      const argEntries = signature.map((entry) => {
        const fallback = entry.optional
          ? "nil"
          : this.#defaultLiteralForKind(entry.kind);
        const value = this.#resolveValueInput(
          node,
          entry.inputPinId,
          fallback
        );
        return { value, optional: Boolean(entry.optional) };
      });
      while (
        argEntries.length &&
        argEntries[argEntries.length - 1].optional &&
        argEntries[argEntries.length - 1].value === "nil"
      ) {
        argEntries.pop();
      }
      const call = argEntries.length
        ? `${functionName}(${argEntries
            .map((entry) => entry.value)
            .join(", ")})`
        : `${functionName}()`;
      lines.push(`${this.#indent(indentLevel)}${call}`);
    } else {
      lines.push(`${this.#indent(indentLevel)}-- missing custom event target`);
    }
    lines.push(...this.#emitNextExec(node.id, "exec_out", indentLevel, path));
    return lines;
  }

  /**
   * Emits a branch for a given exec output pin.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Output pin identifier.
   * @param {number} indentLevel Indent level.
   * @param {Set<string>} path Cycle guard.
   * @returns {Array<string>}
   */
  #emitBranch(nodeId, pinId, indentLevel, path) {
    const targets = this.#findExecTargets(nodeId, pinId);
    if (!targets.length) {
      return [];
    }

    const lines = [];
    targets.forEach((target) => {
      lines.push(...this.#emitExecChain(target.nodeId, indentLevel, path));
    });
    return lines;
  }

  /**
   * Advances to the next node for sequential exec outputs.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Exec output pin identifier.
   * @param {number} indentLevel Indent level.
   * @param {Set<string>} path Cycle guard.
   * @returns {Array<string>}
   */
  #emitNextExec(nodeId, pinId, indentLevel, path) {
    const targets = this.#findExecTargets(nodeId, pinId);
    if (!targets.length) {
      return [];
    }

    return this.#emitExecChain(targets[0].nodeId, indentLevel, path);
  }

  /**
   * Retrieves execution targets for a given output pin.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Output pin identifier.
   * @returns {Array<{nodeId:string,pinId:string}>}
   */
  #findExecTargets(nodeId, pinId) {
    return this.connections
      .filter(
        (connection) =>
          connection.kind === "exec" &&
          connection.from.nodeId === nodeId &&
          connection.from.pinId === pinId
      )
      .map((connection) => connection.to);
  }

  /**
   * Resolves the expression bound to an input pin.
   *
   * @param {BlueprintNode} node Parent node.
   * @param {string} pinId Input pin identifier.
   * @param {string} fallback Fallback literal when unconnected.
   * @returns {string}
   */
  #resolveValueInput(node, pinId, fallback) {
    const connection = this.#getConnectionTo(node.id, pinId);
    if (connection) {
      return this.#evaluateValue(connection.from.nodeId, connection.from.pinId);
    }

    const pin = this.#findPin(node, pinId);
    const inlineKey = this.#inlinePropertyKey(pinId);
    if (Object.prototype.hasOwnProperty.call(node.properties, inlineKey)) {
      const inlineValue = node.properties[inlineKey];
      if (inlineValue !== undefined && inlineValue !== null) {
        return this.#formatLiteral(pin?.kind ?? "any", inlineValue);
      }
    }

    if (pin && pin.defaultValue !== undefined && pin.defaultValue !== null) {
      return this.#formatLiteral(pin.kind, pin.defaultValue);
    }

    return fallback;
  }

  /**
   * Retrieves the pin descriptor for a node.
   *
   * @param {BlueprintNode} node Parent node.
   * @param {string} pinId Pin identifier.
   * @returns {import('../core/BlueprintNode.js').PinDescriptor | undefined}
   */
  #findPin(node, pinId) {
    return [...node.inputs, ...node.outputs].find((pin) => pin.id === pinId);
  }

  /**
   * Locates the incoming connection for a specific pin.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Pin identifier.
   * @returns {import('./Connection.js').Connection | undefined}
   */
  #getConnectionTo(nodeId, pinId) {
    return this.connections.find(
      (connection) =>
        connection.to.nodeId === nodeId && connection.to.pinId === pinId
    );
  }

  /**
   * Evaluates an expression produced by a value pin.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} pinId Output pin identifier.
   * @returns {string}
   */
  #evaluateValue(nodeId, pinId) {
    const cacheKey = `${nodeId}:${pinId}`;
    if (this.valueCache.has(cacheKey)) {
      return this.valueCache.get(cacheKey);
    }

    if (this.valueStack.has(cacheKey)) {
      return "nil";
    }

    this.valueStack.add(cacheKey);
    const node = this.nodes.get(nodeId);
    if (!node) {
      this.valueStack.delete(cacheKey);
      return "nil";
    }

    let expression;
    const behavior = this.registry.getBehavior(node.type);
    if (behavior?.evaluateValue) {
      expression = behavior.evaluateValue(
        this.#createValueContext(node, pinId)
      );
    }

    if (expression === undefined) {
      switch (node.type) {
        case "number_literal":
          expression = this.#formatLiteral(
            "number",
            node.properties.value ?? 0
          );
          break;
        case "string_literal":
          expression = this.#formatLiteral(
            "string",
            node.properties.value ?? ""
          );
          break;
        case "boolean_literal":
          expression = this.#formatLiteral(
            "boolean",
            node.properties.value ?? "true"
          );
          break;
        case "get_var": {
          const name = this.#resolveWorkspaceVariableName(node);
          expression = name;
          break;
        }
        case "custom_event": {
          const parameterName = this.customEventParameterLookup.get(
            `${node.id}:${pinId}`
          );
          expression = parameterName ?? "nil";
          break;
        }
        case "add_number": {
          const a = this.#resolveValueInput(node, "a", "0");
          const b = this.#resolveValueInput(node, "b", "0");
          expression = `(${a}) + (${b})`;
          break;
        }
        case "multiply_number": {
          const a = this.#resolveValueInput(node, "a", "1");
          const b = this.#resolveValueInput(node, "b", "1");
          expression = `(${a}) * (${b})`;
          break;
        }
        case "compare": {
          const a = this.#resolveValueInput(node, "a", "0");
          const b = this.#resolveValueInput(node, "b", "0");
          const operator = this.#sanitizeOperator(
            String(node.properties.operator ?? "==")
          );
          expression = `(${a}) ${operator} (${b})`;
          break;
        }
        default: {
          expression = "nil";
          break;
        }
      }
    }

    this.valueStack.delete(cacheKey);
    this.valueCache.set(cacheKey, expression);
    return expression;
  }

  /**
   * Sanitizes an identifier for Lua output.
   *
   * @param {string} name Input name.
   * @returns {string}
   */
  #sanitizeIdentifier(name) {
    const trimmed = name.trim();
    let sanitized = trimmed.replace(/[^a-zA-Z0-9_]/g, "_");
    if (!sanitized.length) {
      sanitized = "var";
    }

    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = `v_${sanitized}`;
    }

    return sanitized.toLowerCase();
  }

  /**
   * Ensures comparison operators are valid for Lua.
   *
   * @param {string} operator Operator candidate.
   * @returns {string}
   */
  #sanitizeOperator(operator) {
    const allowed = ["==", "!=", ">", "<", ">=", "<="];
    if (allowed.includes(operator)) {
      return operator === "!=" ? "~=" : operator;
    }
    return "==";
  }

  /**
   * Formats a literal based on pin kind.
   *
   * @param {string} kind Pin kind.
   * @param {unknown} value Raw value.
   * @returns {string}
   */
  #formatLiteral(kind, value) {
    switch (kind) {
      case "number": {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? String(numeric) : "0";
      }
      case "boolean": {
        if (typeof value === "string") {
          return value === "false" ? "false" : "true";
        }
        return value ? "true" : "false";
      }
      case "table": {
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed.length ? trimmed : "{}";
        }
        return "{}";
      }
      case "string":
        return JSON.stringify(String(value ?? ""));
      default:
        return JSON.stringify(String(value ?? ""));
    }
  }

  /**
   * Provides a default literal for the supplied pin kind.
   *
   * @param {string} kind Pin kind reference.
   * @returns {string}
   */
  #defaultLiteralForKind(kind) {
    switch (kind) {
      case "number":
        return "0";
      case "boolean":
        return "false";
      case "string":
        return '""';
      case "table":
        return "{}";
      default:
        return "nil";
    }
  }

  /**
   * Determines the display name for a custom event node.
   *
   * @param {BlueprintNode} node Custom event node reference.
   * @returns {string}
   */
  #getCustomEventDisplayName(node) {
    const raw =
      typeof node.properties.name === "string"
        ? node.properties.name.trim()
        : "";
    return raw || "CustomEvent";
  }

  /**
   * Builds a map of custom event node identifiers to Lua function names.
   *
   * @param {Array<BlueprintNode>} customEvents Custom event nodes to process.
   * @returns {Map<string, string>}
   */
  #buildCustomEventFunctionMap(customEvents) {
    const map = new Map();
    const usedNames = new Set();

    customEvents.forEach((node) => {
      const displayName = this.#getCustomEventDisplayName(node);
      let baseIdentifier = this.#sanitizeIdentifier(displayName);
      if (!baseIdentifier.startsWith("custom_")) {
        baseIdentifier = `custom_${baseIdentifier}`;
      }

      let candidate = baseIdentifier;
      let suffix = 1;
      while (usedNames.has(candidate)) {
        candidate = `${baseIdentifier}_${suffix}`;
        suffix += 1;
      }

      usedNames.add(candidate);
      map.set(node.id, candidate);
    });

    return map;
  }

  /**
   * Builds metadata describing custom event parameter layouts.
   *
   * @param {Array<BlueprintNode>} customEvents Custom event nodes to process.
   * @returns {{ parameterMap: Map<string, Array<{ id: string, name: string, luaName: string, outputPinId: string, inputPinId: string, kind: string, optional: boolean }>>, lookupMap: Map<string, string> }}
   */
  #buildCustomEventParameterMap(customEvents) {
    /** @type {Map<string, Array<{ id: string, name: string, luaName: string, outputPinId: string, inputPinId: string, kind: string, optional: boolean }>>} */
    const parameterMap = new Map();
    /** @type {Map<string, string>} */
    const lookupMap = new Map();

    customEvents.forEach((node) => {
      const rawParameters = Array.isArray(node.properties.parameters)
        ? node.properties.parameters
        : [];
      const allowedKinds = new Set(["any", "number", "string", "boolean"]);
      const usedNames = new Set();
      /** @type {Array<{ id: string, name: string, luaName: string, outputPinId: string, inputPinId: string, kind: string }>} */
      const entries = [];

      rawParameters.forEach((parameter, index) => {
        const rawName =
          typeof parameter?.name === "string" ? parameter.name.trim() : "";
        const displayName = rawName || `param${index + 1}`;
        let luaName = this.#sanitizeIdentifier(displayName);
        if (!luaName.length) {
          luaName = `param${index + 1}`;
        }
        let candidate = luaName;
        let suffix = 2;
        while (usedNames.has(candidate)) {
          candidate = `${luaName}_${suffix}`;
          suffix += 1;
        }
        usedNames.add(candidate);

        const rawId =
          typeof parameter?.id === "string" ? parameter.id.trim() : "";
        const parameterId =
          rawId || `param_${String(index + 1).padStart(2, "0")}`;
        const outputPinId = `param_${parameterId}`;
        const inputPinId = `arg_${parameterId}`;
        const rawKind =
          typeof parameter?.type === "string" ? parameter.type : "any";
        const kind = allowedKinds.has(rawKind) ? rawKind : "any";
        const optional = Boolean(parameter?.optional);

        entries.push({
          id: parameterId,
          name: displayName,
          luaName: candidate,
          outputPinId,
          inputPinId,
          kind,
          optional,
        });
        lookupMap.set(`${node.id}:${outputPinId}`, candidate);
      });

      parameterMap.set(node.id, entries);
    });

    return { parameterMap, lookupMap };
  }

  /**
   * Prepares global variable declarations for Lua output.
   *
   * @param {Array<{ id: string, name: string, type: string, defaultValue: unknown }>} variables Workspace variables.
   * @returns {Array<string>}
   */
  #prepareGlobalVariableDeclarations(variables) {
    const declarations = [];
    if (!Array.isArray(variables) || !variables.length) {
      return declarations;
    }

    const usedNames = new Set();
    variables.forEach((entry, index) => {
      if (!entry) {
        return;
      }

      const rawName =
        typeof entry.name === "string" && entry.name.trim().length
          ? entry.name.trim()
          : typeof entry.id === "string" && entry.id
          ? entry.id
          : `var${index + 1}`;
      let baseName = this.#sanitizeIdentifier(rawName);
      if (!baseName.length) {
        baseName = `var${index + 1}`;
      }

      let candidate = baseName;
      let suffix = 2;
      while (usedNames.has(candidate)) {
        candidate = `${baseName}_${suffix}`;
        suffix += 1;
      }
      usedNames.add(candidate);

      if (typeof entry.id === "string" && entry.id.length) {
        this.globalVariableNames.set(entry.id, candidate);
      }

      const literal = this.#formatVariableDefaultLiteral(entry);
      declarations.push(`${candidate} = ${literal}`);
    });

    return declarations;
  }

  /**
   * Formats a workspace variable default for Lua initialization.
   *
   * @param {{ type: string, defaultValue: unknown }} variable Variable descriptor.
   * @returns {string}
   */
  #formatVariableDefaultLiteral(variable) {
    const type = this.#normalizeVariableType(variable?.type);
    const value = variable?.defaultValue;

    switch (type) {
      case "number": {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? String(numeric) : "0";
      }
      case "boolean":
        return value ? "true" : "false";
      case "string":
        return JSON.stringify(String(value ?? ""));
      case "table": {
        if (Array.isArray(value)) {
          const fragments = value
            .map((entry) => this.#formatTableDefaultEntry(entry))
            .filter((fragment) => fragment.length);

          if (!fragments.length) {
            return "{}";
          }

          const rawCandidate =
            value.length === 1 && typeof value[0]?.value === "string"
              ? value[0].value.trim()
              : "";
          if (
            value.length === 1 &&
            !value[0]?.key &&
            rawCandidate.startsWith("{") &&
            rawCandidate.endsWith("}")
          ) {
            return rawCandidate;
          }

          const singleLine = fragments.join(", ");
          if (singleLine.length <= 60 && !singleLine.includes("\n")) {
            return `{ ${singleLine} }`;
          }
          return `{\n  ${fragments.join(",\n  ")}\n}`;
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed.length ? trimmed : "{}";
        }
        return "{}";
      }
      default: {
        if (value === null || value === undefined) {
          return "nil";
        }
        if (typeof value === "number") {
          return Number.isFinite(value) ? String(value) : "nil";
        }
        if (typeof value === "boolean") {
          return value ? "true" : "false";
        }
        return JSON.stringify(String(value));
      }
    }
  }

  /**
   * Formats a table default entry into a Lua fragment.
   *
   * @param {{ key?: string, value?: string }} entry Table entry descriptor.
   * @returns {string}
   */
  #formatTableDefaultEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return "";
    }

    const key =
      typeof entry.key === "string" ? entry.key.trim() : "";
    const value =
      typeof entry.value === "string" ? entry.value.trim() : "";

    if (!key.length) {
      return value;
    }

    const formattedKey = this.#formatTableEntryKey(key);
    const targetValue = value.length ? value : "nil";
    return `${formattedKey} = ${targetValue}`;
  }

  /**
   * Normalizes a table entry key for Lua output.
   *
   * @param {string} key Raw key value.
   * @returns {string}
   */
  #formatTableEntryKey(key) {
    const trimmed = key.trim();
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return trimmed;
    }
    return `[${trimmed}]`;
  }

  /**
   * Resolves the Lua identifier for a workspace variable node, honoring generator mappings.
   *
   * @param {BlueprintNode} node Blueprint node referencing a variable.
   * @returns {string}
   */
  #resolveWorkspaceVariableName(node) {
    const rawId =
      typeof node?.properties?.variableId === "string"
        ? node.properties.variableId
        : "";
    if (rawId) {
      const mapped = this.globalVariableNames.get(rawId);
      if (mapped) {
        return mapped;
      }
    }

    const fallback =
      typeof node?.properties?.name === "string"
        ? node.properties.name
        : "var";
    return this.#sanitizeIdentifier(fallback);
  }

  /**
   * Normalizes a variable type descriptor.
   *
   * @param {unknown} value Candidate type.
   * @returns {string}
   */
  #normalizeVariableType(value) {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      switch (normalized) {
        case "number":
        case "string":
        case "boolean":
        case "table":
          return normalized;
        default:
          return "any";
      }
    }
    return "any";
  }

  /**
   * Returns indentation whitespace for the given level.
   *
   * @param {number} level Indent level.
   * @returns {string}
   */
  #indent(level) {
    return this.indentUnit.repeat(level);
  }

  /**
   * Generates the property key used for inline pin overrides.
   *
   * @param {string} pinId Pin identifier.
   * @returns {string}
   */
  #inlinePropertyKey(pinId) {
    return `pin:${pinId}`;
  }
}
