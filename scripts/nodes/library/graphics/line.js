import { createNodeModule } from "../../nodeTypes.js";

/**
 * Draws a line segment.
 */
export const lineNode = createNodeModule(
  {
    id: "graphics_line",
    title: "Draw Line",
    category: "Graphics",
    description:
      "Draw a line between two points or update the current pen position.",
    searchTags: ["line", "draw", "segment", "stroke"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "x0",
        name: "X0",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "y0",
        name: "Y0",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      { id: "x1", name: "X1", direction: "input", kind: "number" },
      { id: "y1", name: "Y1", direction: "input", kind: "number" },
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
      const x0 = resolveValueInput("x0", "0");
      const y0 = resolveValueInput("y0", "0");
      const x1 = resolveValueInput("x1", OMIT);
      const y1 = resolveValueInput("y1", OMIT);
      const color = resolveValueInput("color", OMIT);

      const args = [x0, y0];
      if (x1 !== OMIT && y1 !== OMIT) {
        args.push(x1, y1);
        if (color !== OMIT) {
          args.push(color);
        }
      }

      const line = `${indent(indentLevel)}line(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
