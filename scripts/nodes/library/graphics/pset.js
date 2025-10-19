import { createNodeModule } from "../../nodeTypes.js";

/**
 * Draws a single pixel using the current or specified color.
 */
export const psetNode = createNodeModule(
  {
    id: "graphics_pset",
    title: "Set Pixel Color",
    category: "Graphics",
    description: "Set a pixel on screen to a color index.",
    searchTags: ["pset", "pixel", "draw", "plot"],
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
      const x = resolveValueInput("x", "0");
      const y = resolveValueInput("y", "0");
      const color = resolveValueInput("color", OMIT);
      const args = [x, y];
      if (color !== OMIT) {
        args.push(color);
      }
      const line = `${indent(indentLevel)}pset(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
