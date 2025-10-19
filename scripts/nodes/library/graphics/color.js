import { createNodeModule } from "../../nodeTypes.js";

/**
 * Updates the current draw color.
 */
export const colorNode = createNodeModule(
  {
    id: "graphics_color",
    title: "Set Active Color",
    category: "Graphics",
    description: "Set the active draw color used by subsequent graphics calls.",
    searchTags: ["color", "color", "ink", "draw"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "color", name: "Color", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const color = resolveValueInput("color", OMIT);
      const call = color === OMIT ? "color()" : `color(${color})`;
      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
