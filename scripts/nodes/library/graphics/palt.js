import { createNodeModule } from "../../nodeTypes.js";

/**
 * Adjusts sprite transparency settings.
 */
export const paltNode = createNodeModule(
  {
    id: "graphics_palt",
    title: "Set Sprite Transparency",
    category: "Graphics",
    description: "Set or reset sprite transparency flags.",
    searchTags: ["palt", "transparency", "palette", "sprite"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "color", name: "Color", direction: "input", kind: "number" },
      {
        id: "transparent",
        name: "Transparent",
        direction: "input",
        kind: "boolean",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const color = resolveValueInput("color", OMIT);
      const transparent = resolveValueInput("transparent", OMIT);

      let call = "palt()";
      if (color !== OMIT) {
        if (transparent === OMIT) {
          call = `palt(${color})`;
        } else {
          call = `palt(${color}, ${transparent})`;
        }
      }
      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
