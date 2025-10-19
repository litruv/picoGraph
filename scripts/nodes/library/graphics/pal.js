import { createNodeModule } from "../../nodeTypes.js";

/**
 * Remaps palette colors.
 */
export const palNode = createNodeModule(
  {
    id: "graphics_pal",
    title: "Remap Palette Color",
    category: "Graphics",
    description: "Swap one palette color for another or reset the palette.",
    searchTags: ["pal", "palette", "color", "remap"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "c0", name: "Color 0", direction: "input", kind: "number" },
      {
        id: "c1",
        name: "Color 1",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      { id: "p", name: "Palette", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const c0 = resolveValueInput("c0", OMIT);
      const c1 = resolveValueInput("c1", "0");
      const p = resolveValueInput("p", OMIT);

      let call = "pal()";
      if (c0 !== OMIT) {
        const args = [c0, c1];
        if (p !== OMIT) {
          args.push(p);
        }
        call = `pal(${args.join(", ")})`;
      }

      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
