import { createNodeModule } from "../../nodeTypes.js";

/**
 * Lists cartridges within the provided directory relative to the virtual drive.
 */
export const lsNode = createNodeModule(
  {
    id: "system_ls",
    title: "List Directory",
    category: "System",
    description:
      "List .p8 and .p8.png files in a directory relative to the current path.",
    searchTags: ["ls", "list", "files", "system"],
    inputs: [
      {
        id: "directory",
        name: "Directory",
        direction: "input",
        kind: "string",
      },
    ],
    outputs: [
      { id: "entries", name: "Entries", direction: "output", kind: "table" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const directory = resolveValueInput("directory", "nil");
      return directory === "nil" ? "ls()" : `ls(${directory})`;
    },
  }
);
