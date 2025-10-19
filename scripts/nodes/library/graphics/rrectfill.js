import { createNodeModule } from "../../nodeTypes.js";

/**
 * Draws a filled rounded rectangle.
 */
export const rrectfillNode = createNodeModule(
  {
    id: "graphics_rrectfill",
    title: "Draw Filled Rounded Rectangle",
    category: "Graphics",
    description: "Render a filled rounded rectangle with the supplied radius.",
    searchTags: ["rounded", "rectangle", "filled", "shape"],
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
        id: "w",
        name: "Width",
        direction: "input",
        kind: "number",
        defaultValue: 8,
      },
      {
        id: "h",
        name: "Height",
        direction: "input",
        kind: "number",
        defaultValue: 8,
      },
      {
        id: "r",
        name: "Radius",
        direction: "input",
        kind: "number",
        defaultValue: 2,
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
      const w = resolveValueInput("w", "8");
      const h = resolveValueInput("h", "8");
      const r = resolveValueInput("r", "2");
      const color = resolveValueInput("color", "__pg_omit__");
      const args = [x, y, w, h, r];
      if (color !== "__pg_omit__") {
        args.push(color);
      }
      const line = `${indent(indentLevel)}rrectfill(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
