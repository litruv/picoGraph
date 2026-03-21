/**
 * @typedef {import('./TypeRegistry.js').TypeDescriptor} TypeDescriptor
 */

/** @type {TypeDescriptor} */
export const NumberType = {
  id: "number",
  label: "Number",
  color: "#3ee581",
  isVariable: true,
  isLocalVariable: true,
  defaultValue: 0,
  variablePropertyKey: "valueNumber",
  compatibleWith: [
    { type: "color", convert: (v) => Math.floor(Number(v)) % 16 },
  ],
};
