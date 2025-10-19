import { createNodeModule } from "../../nodeTypes.js";

/**
 * Draws a filled rectangle.
 */
export const rectfillNode = createNodeModule(
  {
    id: "graphics_rectfill",
    title: "Draw Filled Rectangle",
    category: "Graphics",
    description: "Render a filled rectangle defined by two corners.",
    searchTags: ["rect", "rectangle", "filled", "shape"],
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
      {
        id: "x1",
        name: "X1",
        direction: "input",
        kind: "number",
        defaultValue: 8,
      },
      {
        id: "y1",
        name: "Y1",
        direction: "input",
        kind: "number",
        defaultValue: 8,
      },
      { id: "color", name: "Color", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const x0 = resolveValueInput("x0", "0");
      const y0 = resolveValueInput("y0", "0");
      const x1 = resolveValueInput("x1", "8");
      const y1 = resolveValueInput("y1", "8");
      const color = resolveValueInput("color", "__pg_omit__");
      const args = [x0, y0, x1, y1];
      if (color !== "__pg_omit__") {
        args.push(color);
      }
      const line = `${indent(indentLevel)}rectfill(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
