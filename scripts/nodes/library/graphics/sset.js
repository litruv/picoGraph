import { createNodeModule } from "../../nodeTypes.js";

/**
 * Writes a pixel to the sprite sheet.
 */
export const ssetNode = createNodeModule(
  {
    id: "graphics_sset",
    title: "Set Sprite Pixel",
    category: "Graphics",
    description: "Assign a color to the sprite sheet at the given coordinate.",
    searchTags: ["sset", "sprite", "sheet", "write"],
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
        id: "color",
        name: "Color",
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
      const x = resolveValueInput("x", "0");
      const y = resolveValueInput("y", "0");
      const color = resolveValueInput("color", "0");
      const line = `${indent(indentLevel)}sset(${x}, ${y}, ${color})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
