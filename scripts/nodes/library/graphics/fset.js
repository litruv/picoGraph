import { createNodeModule } from "../../nodeTypes.js";

/**
 * Updates sprite flag values.
 */
export const fsetNode = createNodeModule(
  {
    id: "graphics_fset",
    title: "Set Sprite Flag",
    category: "Graphics",
    description: "Set a sprite's flag bitfield or a specific flag value.",
    searchTags: ["fset", "flag", "sprite", "meta"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "sprite",
        name: "Sprite",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      { id: "flag", name: "Flag", direction: "input", kind: "number" },
      {
        id: "value",
        name: "Value",
        direction: "input",
        kind: "any",
        defaultValue: true,
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
      const sprite = resolveValueInput("sprite", "0");
      const flag = resolveValueInput("flag", OMIT);
      const value = resolveValueInput("value", "false");
      const args = [sprite];
      if (flag === OMIT) {
        args.push(value);
      } else {
        args.push(flag, value);
      }
      const line = `${indent(indentLevel)}fset(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
