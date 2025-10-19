import { createNodeModule } from "../../nodeTypes.js";

/**
 * Converts characters to ordinal values using ord.
 */
export const stringOrdNode = createNodeModule(
  {
    id: "string_ord",
    title: "Ordinals From String",
    category: "Strings",
    description:
      "Return ordinal codes for characters in a string using ORD().",
    searchTags: ["ord", "string", "character"],
    inputs: [
      { id: "string", name: "String", direction: "input", kind: "string" },
      {
        id: "index",
        name: "Index",
        direction: "input",
        kind: "number",
        description: "Optional starting index",
      },
      {
        id: "count",
        name: "Count",
        direction: "input",
        kind: "number",
        description: "Optional result count",
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
      const str = resolveValueInput("string", "\"\"");
      const index = resolveValueInput("index", OMIT);
      const count = resolveValueInput("count", OMIT);

      if (index === OMIT && count === OMIT) {
        return `ord(${str})`;
      }

      if (count === OMIT) {
        return `ord(${str}, ${index === OMIT ? "nil" : index})`;
      }

      const indexArg = index === OMIT ? "nil" : index;
      return `ord(${str}, ${indexArg}, ${count})`;
    },
  }
);
