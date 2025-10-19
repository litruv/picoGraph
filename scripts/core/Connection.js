/**
 * Generates a lightweight unique identifier.
 *
 * @returns {string}
 */
const createConnectionId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `conn_${Math.random().toString(36).slice(2, 10)}`;

/**
 * @typedef {Object} PinReference
 * @property {string} nodeId Linked node identifier.
 * @property {string} pinId Pin identifier within the node.
 */

/**
 * Represents a directional connection between two node pins.
 */
export class Connection {
  /**
   * @param {PinReference} from Origin pin (must be output).
   * @param {PinReference} to Target pin (must be input).
   * @param {('exec'|'number'|'boolean'|'string'|'table'|'any')} kind Pin kind carried by the connection.
   * @param {string} [id] Optional connection identifier.
   */
  constructor(from, to, kind, id) {
    this.id = id ?? createConnectionId();
    this.from = { ...from };
    this.to = { ...to };
    this.kind = kind;
  }

  /**
   * Serializes the connection for persistence.
   *
   * @returns {{from: PinReference, to: PinReference, kind: Connection['kind']}}
   */
  toJSON() {
    return {
      id: this.id,
      from: { ...this.from },
      to: { ...this.to },
      kind: this.kind,
    };
  }
}
