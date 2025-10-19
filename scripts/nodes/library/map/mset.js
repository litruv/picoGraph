import { createNodeModule } from "../../nodeTypes.js";

/**
 * Writes a map tile value using PICO-8's mset helper.
 */
export const mapMsetNode = createNodeModule(
  {
    id: "map_mset",
    title: "Set Map Tile",
    category: "Map",
    description: "Store a numeric value at a tile coordinate.",
    searchTags: ["mset", "map", "tile", "write"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "x",
        name: "Tile X",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "y",
        name: "Tile Y",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "value",
        name: "Value",
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
      const value = resolveValueInput("value", "0");
      const line = `${indent(indentLevel)}mset(${x}, ${y}, ${value})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
