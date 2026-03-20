import { createNodeModule } from "../../nodeTypes.js";

/**
 * Converts a numeric value to a color value.
 */
export const numberToColorNode = createNodeModule(
  {
    id: "convert_number_to_color",
    title: "Number to Color",
    category: "Converters",
    description: "Convert a numeric value to a color value.",
    searchTags: ["number", "color", "convert", "cast"],
    inputs: [
      { id: "number", name: "Number", direction: "input", kind: "number" }
    ],
    outputs: [
      { id: "color", name: "Color", direction: "output", kind: "color" }
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      return resolveValueInput("number", "0");
    },
  }
);
