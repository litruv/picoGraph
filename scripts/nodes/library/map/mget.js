import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads a map tile value using PICO-8's mget helper.
 */
export const mapMgetNode = createNodeModule(
  {
    id: "map_mget",
    title: "Get Map Tile",
    category: "Map",
    description: "Fetch the numeric map value at a tile coordinate.",
    searchTags: ["mget", "map", "tile", "read"],
    inputs: [
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
    ],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const x = resolveValueInput("x", "0");
      const y = resolveValueInput("y", "0");
      return `mget(${x}, ${y})`;
    },
  }
);
