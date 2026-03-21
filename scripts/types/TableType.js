/**
 * @typedef {import('./TypeRegistry.js').TypeDescriptor} TypeDescriptor
 */

/** @type {TypeDescriptor} */
export const TableType = {
  id: "table",
  label: "Table",
  color: "#5ec4ff",
  isVariable: true,
  isLocalVariable: true,
  defaultValue: [],
  localDefaultValue: "{}",
  variablePropertyKey: "valueTable",
};
