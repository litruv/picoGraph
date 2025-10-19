import { createNodeModule } from "../../nodeTypes.js";

/**
 * Applies a camera offset to subsequent draw calls.
 */
export const cameraNode = createNodeModule(
  {
    id: "graphics_camera",
    title: "Add Camera Offset",
    category: "Graphics",
    description: "Shift the draw origin by the specified camera offset.",
    searchTags: ["camera", "offset", "scroll", "view"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "x", name: "X", direction: "input", kind: "number" },
      { id: "y", name: "Y", direction: "input", kind: "number" },
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
      let call = "camera()";
      if (x !== OMIT) {
        call = `camera(${x}, ${y === OMIT ? "0" : y})`;
      }
      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
