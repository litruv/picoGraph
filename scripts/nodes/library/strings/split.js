import { createNodeModule } from "../../nodeTypes.js";

/**
 * Splits strings into tables using split.
 */
export const stringSplitNode = createNodeModule(
  {
    id: "string_split",
    title: "Split String",
    category: "Strings",
    description: "Split a string into tokens using SPLIT().",
    searchTags: ["split", "string", "table", "parse"],
    inputs: [
      { id: "string", name: "String", direction: "input", kind: "string" },
      {
        id: "separator",
        name: "Separator",
        direction: "input",
        kind: "any",
        description: "Optional separator (string or number)",
      },
      {
        id: "convert",
        name: "Convert Numbers",
        direction: "input",
        kind: "boolean",
        description: "Override numeric conversion (defaults true)",
      },
    ],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "table" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const OMIT = "__pg_omit__";
      const str = resolveValueInput("string", "\"\"");
      const sep = resolveValueInput("separator", OMIT);
      const convert = resolveValueInput("convert", OMIT);

      if (sep === OMIT && convert === OMIT) {
        return `split(${str})`;
      }

      if (convert === OMIT) {
        return `split(${str}, ${sep === OMIT ? "nil" : sep})`;
      }

      const sepArg = sep === OMIT ? "nil" : sep;
      return `split(${str}, ${sepArg}, ${convert})`;
    },
  }
);
