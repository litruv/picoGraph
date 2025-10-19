import { createNodeModule } from "../../nodeTypes.js";

/**
 * Opens persistent cartridge storage using cartdata.
 */
export const cartdataNode = createNodeModule(
  {
    id: "data_cartdata",
    title: "Cart Data Init",
    category: "Data",
    description: "Setup persistent storage for the cartridge using CARTDATA().",
    searchTags: ["cartdata", "save", "persistent", "data"],
    inputs: [
      {
        id: "id",
        name: "Identifier",
        direction: "input",
        kind: "string",
        defaultValue: "\"my_cart\"",
      },
    ],
    outputs: [
      { id: "loaded", name: "Loaded", direction: "output", kind: "boolean" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const id = resolveValueInput("id", '"pico_cart"');
      return `cartdata(${id})`;
    },
  }
);
