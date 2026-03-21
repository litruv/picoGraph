/**
 * @typedef {import('./TypeRegistry.js').TypeDescriptor} TypeDescriptor
 */

/** @type {TypeDescriptor} */
export const AnyType = {
  id: "any",
  label: "Any",
  color: "#ff7f11",
  isVariable: true,
  isLocalVariable: false,
  defaultValue: null,
};
