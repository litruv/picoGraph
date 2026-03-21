import { AnyType } from "./AnyType.js";
import { NumberType } from "./NumberType.js";
import { StringType } from "./StringType.js";
import { BooleanType } from "./BooleanType.js";
import { TableType } from "./TableType.js";
import { ColorType } from "./ColorType.js";
import { ExecType } from "./ExecType.js";

/**
 * @typedef {'any'|'number'|'string'|'boolean'|'table'|'color'} VariableType
 */

/**
 * @typedef {Object} TypeCompatibility
 * @property {string} type Target type ID this type can connect to.
 * @property {(value: unknown) => unknown} [convert] Optional conversion function.
 */

/**
 * @typedef {Object} TypeDescriptor
 * @property {string} id Type identifier.
 * @property {string} label Display label.
 * @property {string} color Accent color used for pins, wires, and variable labels (hex or CSS variable).
 * @property {string} [icon] Optional icon character or symbol shown in type labels.
 * @property {boolean} isVariable Whether usable as a workspace variable type.
 * @property {boolean} isLocalVariable Whether usable as a local variable node type.
 * @property {unknown} defaultValue Default value for workspace variables.
 * @property {unknown} [localDefaultValue] Default for local variable nodes when different from defaultValue.
 * @property {string} [variablePropertyKey] Property key used in local variable nodes.
 * @property {ReadonlyArray<TypeCompatibility>} [compatibleWith] Types this type can implicitly convert to.
 */

/** @type {ReadonlyArray<TypeDescriptor>} */
export const ALL_TYPES = [
  ExecType,
  AnyType,
  NumberType,
  StringType,
  BooleanType,
  TableType,
  ColorType,
];

/** @type {Map<string, TypeDescriptor>} */
const TYPE_MAP = new Map(ALL_TYPES.map((t) => [t.id, t]));

/** @type {ReadonlySet<string>} */
export const LOCAL_VARIABLE_TYPE_IDS = new Set(
  ALL_TYPES.filter((t) => t.isLocalVariable).map((t) => t.id)
);

/**
 * Returns type options available for workspace variable type dropdowns.
 *
 * @returns {Array<{ value: string, label: string }>}
 */
export function getVariableTypeOptions() {
  return ALL_TYPES.filter((t) => t.isVariable).map((t) => ({ value: t.id, label: t.label }));
}

/**
 * Returns type options available for local variable node type dropdowns.
 *
 * @returns {Array<{ value: string, label: string }>}
 */
export function getLocalVariableTypeOptions() {
  return ALL_TYPES.filter((t) => t.isLocalVariable).map((t) => ({ value: t.id, label: t.label }));
}

/**
 * Normalizes an arbitrary value to a valid registered type id, falling back to "any".
 *
 * @param {unknown} value Candidate type value.
 * @returns {string}
 */
export function normalizeVariableType(value) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (TYPE_MAP.has(normalized)) return normalized;
  }
  return "any";
}

/**
 * Returns the default value for a workspace variable of the given type.
 *
 * @param {string} type Type identifier.
 * @returns {unknown}
 */
export function defaultVariableValue(type) {
  return TYPE_MAP.get(type)?.defaultValue ?? null;
}

/**
 * Returns the default value for a local variable node property of the given type.
 *
 * @param {string} type Type identifier.
 * @returns {unknown}
 */
export function localVariableDefault(type) {
  const desc = TYPE_MAP.get(type);
  if (!desc) return 0;
  return desc.localDefaultValue !== undefined ? desc.localDefaultValue : desc.defaultValue;
}

/**
 * Returns the property key used to store the typed value in a local variable node.
 *
 * @param {string} type Type identifier.
 * @returns {string}
 */
export function variablePropertyKey(type) {
  return TYPE_MAP.get(type)?.variablePropertyKey ?? "valueNumber";
}

/**
 * Returns the accent color for the given type (used for pins, wires, and variable labels).
 *
 * @param {string} type Type identifier.
 * @returns {string}
 */
export function getTypeColor(type) {
  return TYPE_MAP.get(type)?.color ?? "#ffffff";
}

/**
 * Determines if two types are compatible for pin connections.
 *
 * @param {string} outputType The output pin type.
 * @param {string} inputType The input pin type.
 * @returns {boolean}
 */
export function areTypesCompatible(outputType, inputType) {
  if (inputType === "any" || outputType === "any") {
    return true;
  }
  if (outputType === inputType) {
    return true;
  }
  const outputDesc = TYPE_MAP.get(outputType);
  if (outputDesc?.compatibleWith?.some((c) => c.type === inputType)) {
    return true;
  }
  const inputDesc = TYPE_MAP.get(inputType);
  if (inputDesc?.compatibleWith?.some((c) => c.type === outputType)) {
    return true;
  }
  return false;
}

/**
 * Gets the conversion function for converting from one type to another.
 *
 * @param {string} fromType Source type ID.
 * @param {string} toType Target type ID.
 * @returns {((value: unknown) => unknown) | undefined}
 */
export function getTypeConverter(fromType, toType) {
  if (fromType === toType) {
    return (v) => v;
  }
  const fromDesc = TYPE_MAP.get(fromType);
  const compat = fromDesc?.compatibleWith?.find((c) => c.type === toType);
  return compat?.convert;
}
