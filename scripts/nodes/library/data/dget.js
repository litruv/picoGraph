import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads a persistent value using dget.
 */
export const dgetNode = createNodeModule(
  {
    id: "data_dget",
    title: "Data Get",
    category: "Data",
    description: "Retrieve a persistent number using DGET().",
    searchTags: ["dget", "load", "data", "persistent"],
    inputs: [
      {
        id: "index",
        name: "Index",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const index = resolveValueInput("index", "0");
      return `dget(${index})`;
    },
  }
);
