import { createNodeModule } from "../../nodeTypes.js";

/**
 * Configures the active fill pattern.
 */
export const fillpNode = createNodeModule(
  {
    id: "graphics_fillp",
    title: "Set Fill Pattern",
    category: "Graphics",
    description: "Set the 4x4 fill pattern bitfield used by many draw calls.",
    searchTags: ["fillp", "pattern", "fill", "hatch"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "pattern", name: "Pattern", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const pattern = resolveValueInput("pattern", "__pg_omit__");
      const call = pattern === "__pg_omit__" ? "fillp()" : `fillp(${pattern})`;
      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
