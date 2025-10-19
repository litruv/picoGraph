import { createNodeModule } from "../../nodeTypes.js";

/**
 * Adjusts the active clipping rectangle for subsequent draw calls.
 */
export const clipNode = createNodeModule(
  {
    id: "graphics_clip",
    title: "Set Clipping Rectangle",
    category: "Graphics",
    description:
      "Set or reset the clipping rectangle that constrains all draw operations.",
    searchTags: ["clip", "clipping", "graphics", "viewport"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "x", name: "X", direction: "input", kind: "number" },
      { id: "y", name: "Y", direction: "input", kind: "number" },
      { id: "w", name: "Width", direction: "input", kind: "number" },
      { id: "h", name: "Height", direction: "input", kind: "number" },
      {
        id: "clip_previous",
        name: "Clip Previous",
        direction: "input",
        kind: "boolean",
        defaultValue: false,
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
      const x = resolveValueInput("x", OMIT);
      const y = resolveValueInput("y", OMIT);
      const w = resolveValueInput("w", OMIT);
      const h = resolveValueInput("h", OMIT);
      const clipPrevious = resolveValueInput("clip_previous", OMIT);

      let call;
      if (x === OMIT && y === OMIT && w === OMIT && h === OMIT) {
        call = "clip()";
      } else {
        const args = [
          x === OMIT ? "0" : x,
          y === OMIT ? "0" : y,
          w === OMIT ? "128" : w,
          h === OMIT ? "128" : h,
        ];
        if (clipPrevious !== OMIT) {
          args.push(clipPrevious);
        }
        call = `clip(${args.join(", ")})`;
      }

      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
