/**
 * @typedef {import('./TypeRegistry.js').TypeDescriptor} TypeDescriptor
 */

/** @type {TypeDescriptor} */
export const ColorType = {
  id: "color",
  label: "Color",
  color: "#5b8ef5",
  isVariable: true,
  isLocalVariable: true,
  defaultValue: 7,
  variablePropertyKey: "valueColor",
  compatibleWith: [
    { type: "number", convert: (v) => Number(v) },
    { type: "boolean", convert: (v) => v !== 0 }
  ],
};
