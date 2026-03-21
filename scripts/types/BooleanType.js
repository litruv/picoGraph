/**
 * @typedef {import('./TypeRegistry.js').TypeDescriptor} TypeDescriptor
 */

/** @type {TypeDescriptor} */
export const BooleanType = {
  id: "boolean",
  label: "Boolean",
  color: "#ff4f4f",
  isVariable: true,
  isLocalVariable: true,
  defaultValue: false,
  variablePropertyKey: "valueBoolean",
  compatibleWith: [
    { type: "string", convert: (v) => v ? "true" : "false" },
    { type: "number", convert: (v) => v ? 1 : 0 },
    { type: "color", convert: (v) => v ? 7 : 0 }
  ],
};
