import { BlueprintNode } from "./BlueprintNode.js";
import { Connection } from "./Connection.js";

/** @typedef {import('./BlueprintNode.js').BlueprintNodeInit} BlueprintNodeInit */
/** @typedef {import('./BlueprintNode.js').PinDescriptor} PinDescriptor */
/** @typedef {import('./Connection.js').PinReference} PinReference */

/**
 * Maintains the canonical blueprint data model: nodes, pins, and their connections.
 */
export class NodeGraph extends EventTarget {
  constructor() {
    super();
    /** @type {Map<string, BlueprintNode>} */
    this.nodes = new Map();
    /** @type {Map<string, Connection>} */
    this.connections = new Map();
    this.nodeCounters = new Map();
  }

  /**
   * Emits a custom event notifying listeners about a change.
   *
   * @param {string} type Event name.
   * @param {unknown} detail Event payload.
   */
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Generates a unique node identifier scoped by node type.
   *
   * @param {string} type Node definition identifier.
   * @returns {string}
   */
  createNodeId(type) {
    const current = this.nodeCounters.get(type) ?? 0;
    const next = current + 1;
    this.nodeCounters.set(type, next);
    return `${type}_${String(next).padStart(2, "0")}`;
  }

  /**
   * Registers a node instance within the graph.
   *
   * @param {BlueprintNode} node Node to add.
   */
  addNode(node) {
    this.nodes.set(node.id, node);
    this.emit("nodeschanged", { type: "add", node });
  }

  /**
   * Removes a node and any associated connections.
   *
   * @param {string} nodeId Target node identifier.
   */
  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return;
    }

    [...this.connections.values()].forEach((connection) => {
      if (
        connection.from.nodeId === nodeId ||
        connection.to.nodeId === nodeId
      ) {
        this.connections.delete(connection.id);
      }
    });

    this.nodes.delete(nodeId);
    this.emit("nodeschanged", { type: "remove", nodeId });
    this.emit("connectionschanged", { type: "prune", nodeId });
  }

  /**
   * Updates the node position within the graph.
   *
   * @param {string} nodeId Node identifier.
   * @param {{x:number,y:number}} position New coordinates to store.
   */
  setNodePosition(nodeId, position) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return;
    }

    node.setPosition(position);
    this.emit("nodepositionchanged", { nodeId, position: { ...position } });
  }

  /**
   * Updates a node property bag value.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} key Property key.
   * @param {unknown} value Property value.
   */
  setNodeProperty(nodeId, key, value) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return;
    }

    node.properties[key] = value;
    this.emit("nodepropertychanged", { nodeId, key, value });
  }

  /**
   * Removes an existing connection.
   *
   * @param {string} connectionId Identifier for the connection.
   */
  removeConnection(connectionId) {
    if (!this.connections.has(connectionId)) {
      return;
    }

    this.connections.delete(connectionId);
    this.emit("connectionschanged", { type: "remove", connectionId });
  }

  /**
   * Removes connections linked to a specific pin.
   *
   * @param {PinReference} ref Pin reference to clear.
   */
  removeConnectionsForPin(ref) {
    let mutated = false;
    const affectedNodes = new Set();
    [...this.connections.values()].forEach((connection) => {
      if (
        (connection.from.nodeId === ref.nodeId &&
          connection.from.pinId === ref.pinId) ||
        (connection.to.nodeId === ref.nodeId &&
          connection.to.pinId === ref.pinId)
      ) {
        this.connections.delete(connection.id);
        mutated = true;
        affectedNodes.add(connection.from.nodeId);
        affectedNodes.add(connection.to.nodeId);
      }
    });

    if (mutated) {
      this.emit("connectionschanged", {
        type: "prune",
        ref,
        nodes: [...affectedNodes],
      });
    }
  }

  /**
   * Attempts to connect two pins if the contract is valid.
   *
   * @param {PinReference} from Output pin reference.
   * @param {PinReference} to Input pin reference.
   * @returns {boolean} Whether the connection was created.
   */
  connect(from, to) {
    const fromNode = this.nodes.get(from.nodeId);
    const toNode = this.nodes.get(to.nodeId);
    if (!fromNode || !toNode) {
      return false;
    }

    const fromPin = fromNode.getPin(from.pinId);
    const toPin = toNode.getPin(to.pinId);
    if (!fromPin || !toPin) {
      return false;
    }

    if (!this.#isConnectionValid(fromNode, fromPin, toNode, toPin)) {
      return false;
    }

    if (fromPin.kind === "exec") {
      this.removeConnectionsForPin(from);
    }

    // Deduplicate single-input connections except for exec inputs which may stack.
    if (toPin.kind !== "exec") {
      this.removeConnectionsForPin(to);
    }

    const connection = new Connection(
      from,
      to,
      toPin.kind === "any" ? fromPin.kind : toPin.kind
    );
    this.connections.set(connection.id, connection);
    this.emit("connectionschanged", { type: "add", connection });
    return true;
  }

  /**
   * Retrieves an immutable list of nodes.
   *
   * @returns {Array<BlueprintNode>}
   */
  getNodes() {
    return [...this.nodes.values()].map((node) => node);
  }

  /**
   * Retrieves all active connections.
   *
   * @returns {Array<Connection>}
   */
  getConnections() {
    return [...this.connections.values()].map((connection) => connection);
  }

  /**
   * Returns connections targeting a particular node and optional pin.
   *
   * @param {string} nodeId Node identifier.
   * @param {string} [pinId] Optional pin identifier.
   * @returns {Array<Connection>}
   */
  getConnectionsForNode(nodeId, pinId) {
    return this.getConnections().filter((connection) => {
      const matchesNode =
        connection.from.nodeId === nodeId || connection.to.nodeId === nodeId;
      const matchesPin = !pinId
        ? true
        : connection.from.pinId === pinId || connection.to.pinId === pinId;
      return matchesNode && matchesPin;
    });
  }

  /**
   * Produces a serializable payload for the graph.
   *
   * @returns {{nodes: Array<ReturnType<BlueprintNode['toJSON']>>, connections: Array<ReturnType<Connection['toJSON']>>}}
   */
  toJSON() {
    return {
      nodes: this.getNodes().map((node) => node.toJSON()),
      connections: this.getConnections().map((connection) =>
        connection.toJSON()
      ),
    };
  }

  /**
   * Restores a graph from serialized payload.
   *
   * @param {{nodes:Array<BlueprintNodeInit>, connections:Array<ReturnType<Connection['toJSON']>>}} payload Serialized graph data.
   * @returns {NodeGraph}
   */
  static fromJSON(payload) {
    const graph = new NodeGraph();
    payload.nodes.forEach((nodeData) => {
      const node = new BlueprintNode(nodeData);
      graph.nodes.set(node.id, node);
    });
    payload.connections.forEach((connectionData) => {
      const connection = new Connection(
        connectionData.from,
        connectionData.to,
        connectionData.kind,
        connectionData.id
      );
      graph.connections.set(connection.id, connection);
    });
    return graph;
  }

  /**
   * Replaces the current graph contents using the provided serialized payload.
   *
   * @param {{nodes:Array<BlueprintNodeInit>, connections:Array<ReturnType<Connection['toJSON']>>}} payload Serialized graph data.
   */
  replaceState(payload) {
    this.nodes.clear();
    this.connections.clear();
    this.nodeCounters.clear();

    payload.nodes.forEach((nodeData) => {
      const node = new BlueprintNode(nodeData);
      this.nodes.set(node.id, node);
      this.#trackNodeCounter(node);
    });

    payload.connections.forEach((connectionData) => {
      const connection = new Connection(
        connectionData.from,
        connectionData.to,
        connectionData.kind,
        connectionData.id
      );
      this.connections.set(connection.id, connection);
    });

    this.emit("graphrestored", {
      nodes: this.getNodes(),
      connections: this.getConnections(),
    });
  }

  /**
   * Determines whether a connection between the provided pins is permitted.
   *
   * @param {BlueprintNode} fromNode Source node.
   * @param {PinDescriptor} fromPin Source pin descriptor.
   * @param {BlueprintNode} toNode Target node.
   * @param {PinDescriptor} toPin Target pin descriptor.
   * @returns {boolean}
   */
  #isConnectionValid(fromNode, fromPin, toNode, toPin) {
    if (fromNode.id === toNode.id) {
      return false;
    }

    if (fromPin.direction !== "output" || toPin.direction !== "input") {
      return false;
    }

    if (
      toPin.kind !== "any" &&
      fromPin.kind !== "any" &&
      fromPin.kind !== toPin.kind
    ) {
      return false;
    }

    // Avoid duplicate identical connections.
    const duplicated = [...this.connections.values()].some(
      (existing) =>
        existing.from.nodeId === fromNode.id &&
        existing.from.pinId === fromPin.id &&
        existing.to.nodeId === toNode.id &&
        existing.to.pinId === toPin.id
    );

    return !duplicated;
  }

  /**
   * Updates the node counter registry for the supplied node instance.
   *
   * @param {BlueprintNode} node Node reference used to update counters.
   */
  #trackNodeCounter(node) {
    const match = /_(\d+)$/.exec(node.id);
    const numeric = match ? Number.parseInt(match[1], 10) : 0;
    const current = this.nodeCounters.get(node.type) ?? 0;
    this.nodeCounters.set(node.type, Math.max(current, numeric));
  }
}
