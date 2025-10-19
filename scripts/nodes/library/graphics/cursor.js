import { createNodeModule } from "../../nodeTypes.js";

/**
 * Positions the print cursor and optionally sets the draw color.
 */
export const cursorNode = createNodeModule(
  {
    id: "graphics_cursor",
    title: "Set Cursor",
    category: "Graphics",
    description:
      "Move the print cursor and optionally change the active color.",
    searchTags: ["cursor", "print", "text", "position"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "x", name: "X", direction: "input", kind: "number" },
      { id: "y", name: "Y", direction: "input", kind: "number" },
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
      const x = resolveValueInput("x", OMIT);
      const y = resolveValueInput("y", OMIT);
      const color = resolveValueInput("color", OMIT);

      let call = "cursor()";
      if (x !== OMIT) {
        const args = [x, y === OMIT ? "0" : y];
        if (color !== OMIT) {
          args.push(color);
        }
        call = `cursor(${args.join(", ")})`;
      }

      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
