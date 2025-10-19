import { createNodeModule } from "../../nodeTypes.js";

/**
 * Extracts substrings using sub.
 */
export const stringSubNode = createNodeModule(
  {
    id: "string_sub",
    title: "Substring",
    category: "Strings",
    description: "Extract a substring using SUB().",
    searchTags: ["sub", "substring", "string"],
    inputs: [
      { id: "string", name: "String", direction: "input", kind: "string" },
      {
        id: "start",
        name: "Start",
        direction: "input",
        kind: "number",
      },
      {
        id: "stop",
        name: "Stop",
        direction: "input",
        kind: "any",
        description: "Optional end position or truthy for single character",
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
      const str = resolveValueInput("string", "\"\"");
      const start = resolveValueInput("start", "1");
      const stop = resolveValueInput("stop", OMIT);

      if (stop === OMIT) {
        return `sub(${str}, ${start})`;
      }

      return `sub(${str}, ${start}, ${stop})`;
    },
  }
);
