import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads sprite flag data.
 */
export const fgetNode = createNodeModule(
  {
    id: "graphics_fget",
    title: "Get Sprite Flag",
    category: "Graphics",
    description: "Retrieve the bitfield or specific flag value for a sprite.",
    searchTags: ["fget", "flag", "sprite", "meta"],
    inputs: [
      {
        id: "sprite",
        name: "Sprite",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      { id: "flag", name: "Flag", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const OMIT = "__pg_omit__";
      const sprite = resolveValueInput("sprite", "0");
      const flag = resolveValueInput("flag", OMIT);
      if (flag === OMIT) {
        return `fget(${sprite})`;
      }
      return `fget(${sprite}, ${flag})`;
    },
  }
);
