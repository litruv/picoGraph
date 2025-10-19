import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads a pixel from the sprite sheet.
 */
export const sgetNode = createNodeModule(
  {
    id: "graphics_sget",
    title: "Get Sprite Pixel",
    category: "Graphics",
    description:
      "Retrieve the color index from the sprite sheet at the given coordinate.",
    searchTags: ["sget", "sprite", "sheet", "read"],
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
      return `sget(${x}, ${y})`;
    },
  }
);
