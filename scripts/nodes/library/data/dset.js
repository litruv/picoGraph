import { createNodeModule } from "../../nodeTypes.js";

/**
 * Writes a persistent value using dset.
 */
export const dsetNode = createNodeModule(
  {
    id: "data_dset",
    title: "Data Set",
    category: "Data",
    description: "Store a persistent number using DSET().",
    searchTags: ["dset", "save", "data", "persistent"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "index",
        name: "Index",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "value",
        name: "Value",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const index = resolveValueInput("index", "0");
      const value = resolveValueInput("value", "0");
      const line = `${indent(indentLevel)}dset(${index}, ${value})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
