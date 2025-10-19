import { createNodeModule } from "../../nodeTypes.js";

/**
 * Converts ordinal values to characters using chr.
 */
export const stringChrNode = createNodeModule(
  {
    id: "string_chr",
    title: "Character From Ordinals",
    category: "Strings",
    description: "Build a string from ordinal values using CHR().",
    searchTags: ["chr", "string", "character"],
    inputs: [
      { id: "value", name: "Value", direction: "input", kind: "any" },
    ],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "string" },
    ],
    properties: [
      {
        key: "extraValues",
        label: "Additional Values",
        type: "string",
        placeholder: "e.g. 65, 66, 67",
      },
    ],
  },
  {
    evaluateValue: ({ node, resolveValueInput }) => {
      const value = resolveValueInput("value", "0");
      const args = [value];
      const extras = String(node.properties.extraValues ?? "").trim();
      if (extras.length) {
        extras
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
          .forEach((entry) => args.push(entry));
      }
      return `chr(${args.join(", ")})`;
    },
  }
);
