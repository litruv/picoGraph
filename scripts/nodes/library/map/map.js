import { createNodeModule } from "../../nodeTypes.js";

/**
 * Draws map tiles using PICO-8's map helper.
 */
export const mapDrawNode = createNodeModule(
  {
    id: "map_map",
    title: "Draw Map",
    category: "Map",
    description:
      "Render a section of the map to the screen with optional layers.",
    searchTags: ["map", "draw", "tiles", "layer"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "tile_x",
        name: "Tile X",
        direction: "input",
        kind: "number",
        description: "Starting tile X coordinate",
      },
      {
        id: "tile_y",
        name: "Tile Y",
        direction: "input",
        kind: "number",
        description: "Starting tile Y coordinate",
      },
      {
        id: "screen_x",
        name: "Screen X",
        direction: "input",
        kind: "number",
        description: "Screen X position in pixels",
      },
      {
        id: "screen_y",
        name: "Screen Y",
        direction: "input",
        kind: "number",
        description: "Screen Y position in pixels",
      },
      {
        id: "tile_w",
        name: "Tile Width",
        direction: "input",
        kind: "number",
        description: "Number of tiles across",
      },
      {
        id: "tile_h",
        name: "Tile Height",
        direction: "input",
        kind: "number",
        description: "Number of tiles down",
      },
      {
        id: "layers",
        name: "Layers",
        direction: "input",
        kind: "number",
        description: "Sprite flag bitmask",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const tileX = resolveValueInput("tile_x", OMIT);
      const tileY = resolveValueInput("tile_y", OMIT);
      const screenX = resolveValueInput("screen_x", OMIT);
      const screenY = resolveValueInput("screen_y", OMIT);
      const tileW = resolveValueInput("tile_w", OMIT);
      const tileH = resolveValueInput("tile_h", OMIT);
      const layers = resolveValueInput("layers", OMIT);

      const values = [
        { value: tileX, placeholder: "0" },
        { value: tileY, placeholder: "0" },
        { value: screenX, placeholder: "0" },
        { value: screenY, placeholder: "0" },
        { value: tileW, placeholder: "nil" },
        { value: tileH, placeholder: "nil" },
        { value: layers, placeholder: "nil" },
      ];

      let lastIndex = values.length - 1;
      while (lastIndex >= 0 && values[lastIndex].value === OMIT) {
        lastIndex -= 1;
      }

      const args = [];
      for (let index = 0; index <= lastIndex; index += 1) {
        const entry = values[index];
        args.push(entry.value === OMIT ? entry.placeholder : entry.value);
      }

      const call = args.length ? `map(${args.join(", ")})` : "map()";
      const line = `${indent(indentLevel)}${call}`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
