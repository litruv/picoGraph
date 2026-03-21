import { LuaLiteralNumber } from "./LuaLiteralNumber.js";
import { LuaLiteralBoolean } from "./LuaLiteralBoolean.js";
import { LuaLiteralString } from "./LuaLiteralString.js";
import { LuaLiteralTable } from "./LuaLiteralTable.js";
import { LuaLiteralColor } from "./LuaLiteralColor.js";

/**
 * @typedef {Object} LuaLiteralHandler
 * @property {(value: unknown) => string} format Formats a raw value into a Lua literal string.
 * @property {() => string} defaultLiteral Returns the default Lua literal string for this type.
 * @property {boolean} [spawnableByDefault] Whether this type creates a spawnable literal node in the graph.
 * @property {import('../../nodes/nodeTypes.js').NodeModule | null} [nodeModule] Node module definition, or null if no literal node exists.
 */

/** @type {Map<string, LuaLiteralHandler>} */
const HANDLERS = new Map([
  ["number", LuaLiteralNumber],
  ["boolean", LuaLiteralBoolean],
  ["string", LuaLiteralString],
  ["table", LuaLiteralTable],
  ["color", LuaLiteralColor],
]);

/**
 * Formats a raw value into a Lua literal string for the given pin kind.
 *
 * @param {string} kind Pin kind.
 * @param {unknown} value Raw value.
 * @returns {string}
 */
export function formatLiteral(kind, value) {
  const handler = HANDLERS.get(kind);
  return handler ? handler.format(value) : LuaLiteralString.format(value);
}

/**
 * Returns the default Lua literal string for the given pin kind.
 *
 * @param {string} kind Pin kind.
 * @returns {string}
 */
export function defaultLiteralForKind(kind) {
  const handler = HANDLERS.get(kind);
  return handler ? handler.defaultLiteral() : "nil";
}

/**
 * Returns all node modules defined by literal handlers that have a nodeModule.
 *
 * @returns {Array<import('../../nodes/nodeTypes.js').NodeModule>}
 */
export function getLiteralNodeModules() {
  return [...HANDLERS.values()]
    .map((handler) => handler.nodeModule)
    .filter(Boolean);
}
