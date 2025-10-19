import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads the color of a screen pixel.
 */
export const pgetNode = createNodeModule(
  {
    id: "graphics_pget",
    title: "Get Pixel Color",
    category: "Graphics",
    description: "Fetch the color index at the given screen coordinate.",
    searchTags: ["pget", "pixel", "read", "sample"],
    inputs: [
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
    ],
    outputs: [
      { id: "value", name: "Color", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const x = resolveValueInput("x", "0");
      const y = resolveValueInput("y", "0");
      return `pget(${x}, ${y})`;
    },
  }
);
