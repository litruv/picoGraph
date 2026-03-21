/**
 * @typedef {import('./TypeRegistry.js').TypeDescriptor} TypeDescriptor
 */

/** @type {TypeDescriptor} */
export const StringType = {
  id: "string",
  label: "String",
  color: "#ff66ff",
  isVariable: true,
  isLocalVariable: true,
  defaultValue: "",
  variablePropertyKey: "valueString",
};
