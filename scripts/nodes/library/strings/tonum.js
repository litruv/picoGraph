import { createNodeModule } from "../../nodeTypes.js";

/**
 * Converts values to numbers using tonum.
 */
export const stringTonumNode = createNodeModule(
  {
    id: "string_tonum",
    title: "To Number",
    category: "Strings",
    description: "Convert a value to a number with optional format flags.",
    searchTags: ["tonum", "string", "number", "convert"],
    inputs: [
      { id: "value", name: "Value", direction: "input", kind: "any" },
      {
        id: "flags",
        name: "Flags",
        direction: "input",
        kind: "number",
        description: "Optional format flags bitfield",
      },
    ],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const OMIT = "__pg_omit__";
      const value = resolveValueInput("value", "nil");
      const flags = resolveValueInput("flags", OMIT);
      if (flags === OMIT) {
        return `tonum(${value})`;
      }
      return `tonum(${value}, ${flags})`;
    },
  }
);
