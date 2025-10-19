import { createNodeModule } from "../../nodeTypes.js";

/**
 * Draws sprites from the sprite sheet.
 */
export const sprNode = createNodeModule(
  {
    id: "graphics_spr",
    title: "Draw Sprite",
    category: "Graphics",
    description: "Blit one or more sprites at the given screen position.",
    searchTags: ["spr", "sprite", "draw", "blit"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "sprite",
        name: "Sprite",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "x",
        name: "X",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "y",
        name: "Y",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      { id: "w", name: "Width", direction: "input", kind: "number" },
      { id: "h", name: "Height", direction: "input", kind: "number" },
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
      const sprite = resolveValueInput("sprite", "0");
      const x = resolveValueInput("x", "0");
      const y = resolveValueInput("y", "0");
      const w = resolveValueInput("w", OMIT);
      const h = resolveValueInput("h", OMIT);
      const flipX = resolveValueInput("flip_x", OMIT);
      const flipY = resolveValueInput("flip_y", OMIT);

      const args = [sprite, x, y];
      const includeSize =
        w !== OMIT || h !== OMIT || flipX !== OMIT || flipY !== OMIT;

      if (includeSize) {
        args.push(w === OMIT ? "1" : w, h === OMIT ? "1" : h);
      }

      if (flipX !== OMIT || flipY !== OMIT) {
        args.push(
          flipX === OMIT ? "false" : flipX,
          flipY === OMIT ? "false" : flipY
        );
      }

      const line = `${indent(indentLevel)}spr(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
