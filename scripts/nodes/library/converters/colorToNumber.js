import { createNodeModule } from "../../nodeTypes.js";

/**
 * Converts a color value to a numeric value.
 */
export const colorToNumberNode = createNodeModule(
  {
    id: "convert_color_to_number",
    title: "Color to Number",
    category: "Converters",
    description: "Convert a color value to a numeric value.",
    searchTags: ["color", "number", "convert", "cast"],
    inputs: [
      { id: "color", name: "Color", direction: "input", kind: "color" }
    ],
    outputs: [
      { id: "number", name: "Number", direction: "output", kind: "number" }
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      return resolveValueInput("color", "0");
    },
  }
);
