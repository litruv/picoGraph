import { createNodeModule } from "../../nodeTypes.js";

/**
 * Draws a rectangular region of the sprite sheet with scaling support.
 */
export const ssprNode = createNodeModule(
  {
    id: "graphics_sspr",
    title: "Draw Scaled Sprite",
    category: "Graphics",
    description: "Stretch or flip a sprite sheet region to the screen.",
    searchTags: ["sspr", "sprite", "scale", "blit"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "sx",
        name: "SX",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "sy",
        name: "SY",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "sw",
        name: "SW",
        direction: "input",
        kind: "number",
        defaultValue: 8,
      },
      {
        id: "sh",
        name: "SH",
        direction: "input",
        kind: "number",
        defaultValue: 8,
      },
      {
        id: "dx",
        name: "DX",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "dy",
        name: "DY",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      { id: "dw", name: "DW", direction: "input", kind: "number" },
      { id: "dh", name: "DH", direction: "input", kind: "number" },
      { id: "flip_x", name: "Flip X", direction: "input", kind: "boolean" },
      { id: "flip_y", name: "Flip Y", direction: "input", kind: "boolean" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const sx = resolveValueInput("sx", "0");
      const sy = resolveValueInput("sy", "0");
      const sw = resolveValueInput("sw", "8");
      const sh = resolveValueInput("sh", "8");
      const dx = resolveValueInput("dx", "0");
      const dy = resolveValueInput("dy", "0");
      const dw = resolveValueInput("dw", OMIT);
      const dh = resolveValueInput("dh", OMIT);
      const flipX = resolveValueInput("flip_x", OMIT);
      const flipY = resolveValueInput("flip_y", OMIT);

      const args = [sx, sy, sw, sh, dx, dy];
      const includeDestSize =
        dw !== OMIT || dh !== OMIT || flipX !== OMIT || flipY !== OMIT;

      if (includeDestSize) {
        args.push(dw === OMIT ? sw : dw, dh === OMIT ? sh : dh);
      }

      if (flipX !== OMIT || flipY !== OMIT) {
        args.push(
          flipX === OMIT ? "false" : flipX,
          flipY === OMIT ? "false" : flipY
        );
      }

      const line = `${indent(indentLevel)}sspr(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
