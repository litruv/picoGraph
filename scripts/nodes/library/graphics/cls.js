import { createNodeModule } from "../../nodeTypes.js";

/**
 * Clears the screen and resets clipping.
 */
export const clsNode = createNodeModule(
  {
    id: "graphics_cls",
    title: "Clear Screen",
    category: "Graphics",
    description: "Clear the display, optionally filling with a specific color.",
    searchTags: ["cls", "clear", "screen", "background"],
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
      const call = color === OMIT ? "cls()" : `cls(${color})`;
      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
