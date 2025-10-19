import { createNodeModule } from "../../nodeTypes.js";

/**
 * Draws a filled circle.
 */
export const circfillNode = createNodeModule(
  {
    id: "graphics_circfill",
    title: "Draw Filled Circle",
    category: "Graphics",
    description: "Render a filled circle at the specified position.",
    searchTags: ["circle", "filled", "shape", "draw"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "x",
        name: "X",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "y",
        name: "Y",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "radius",
        name: "Radius",
        direction: "input",
        kind: "number",
        defaultValue: 4,
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
      const x = resolveValueInput("x", "0");
      const y = resolveValueInput("y", "0");
      const radius = resolveValueInput("radius", "4");
      const color = resolveValueInput("color", "__pg_omit__");
      const args = [x, y, radius];
      if (color !== "__pg_omit__") {
        args.push(color);
      }
      const line = `${indent(indentLevel)}circfill(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
