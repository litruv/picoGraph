import { createNodeModule } from "../../nodeTypes.js";

/**
 * Converts values to strings using tostr.
 */
export const stringTostrNode = createNodeModule(
  {
    id: "string_tostr",
    title: "To String",
    category: "Strings",
    description: "Convert a value to a string with optional format flags.",
    searchTags: ["tostr", "string", "convert"],
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
      { id: "result", name: "Result", direction: "output", kind: "string" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const OMIT = "__pg_omit__";
      const value = resolveValueInput("value", "nil");
      const flags = resolveValueInput("flags", OMIT);
      if (flags === OMIT) {
        return `tostr(${value})`;
      }
      return `tostr(${value}, ${flags})`;
    },
  }
);
