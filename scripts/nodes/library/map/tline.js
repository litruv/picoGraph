import { createNodeModule } from "../../nodeTypes.js";

/**
 * Draws textured lines or configures precision using PICO-8's tline helper.
 */
export const mapTlineNode = createNodeModule(
  {
    id: "map_tline",
    title: "Draw Textured Line",
    category: "Map",
    description:
      "Render a textured line from map data or adjust tline precision.",
    searchTags: ["tline", "map", "texture", "line"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "x0",
        name: "X0",
        direction: "input",
        kind: "number",
        description: "Line start X",
      },
      {
        id: "y0",
        name: "Y0",
        direction: "input",
        kind: "number",
        description: "Line start Y",
      },
      {
        id: "x1",
        name: "X1",
        direction: "input",
        kind: "number",
        description: "Line end X",
      },
      {
        id: "y1",
        name: "Y1",
        direction: "input",
        kind: "number",
        description: "Line end Y",
      },
      {
        id: "mx",
        name: "Map X",
        direction: "input",
        kind: "number",
        description: "Map sample X (tiles)",
      },
      {
        id: "my",
        name: "Map Y",
        direction: "input",
        kind: "number",
        description: "Map sample Y (tiles)",
      },
      {
        id: "mdx",
        name: "MDX",
        direction: "input",
        kind: "number",
        description: "Map X delta",
      },
      {
        id: "mdy",
        name: "MDY",
        direction: "input",
        kind: "number",
        description: "Map Y delta",
      },
      {
        id: "layers",
        name: "Layers",
        direction: "input",
        kind: "number",
        description: "Sprite flag bitmask",
      },
      {
        id: "precision",
        name: "Precision",
        direction: "input",
        kind: "number",
        description: "Precision override when setting mode",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [
      {
        key: "mode",
        label: "Mode",
        type: "enum",
        defaultValue: "draw",
        options: [
          { label: "Draw Line", value: "draw" },
          { label: "Set Precision", value: "precision" },
        ],
      },
    ],
  },
  {
    emitExec: ({
      node,
      indent,
      indentLevel,
      resolveValueInput,
      emitNextExec,
    }) => {
      const mode = String(node.properties.mode ?? "draw");
      if (mode === "precision") {
        const precision = resolveValueInput("precision", "16");
        const line = `${indent(indentLevel)}tline(${precision})`;
        return [line, ...emitNextExec("exec_out")];
      }

      const OMIT = "__pg_omit__";
      const x0 = resolveValueInput("x0", OMIT);
      const y0 = resolveValueInput("y0", OMIT);
      const x1 = resolveValueInput("x1", OMIT);
      const y1 = resolveValueInput("y1", OMIT);
      const mx = resolveValueInput("mx", OMIT);
      const my = resolveValueInput("my", OMIT);
      const mdx = resolveValueInput("mdx", OMIT);
      const mdy = resolveValueInput("mdy", OMIT);
      const layers = resolveValueInput("layers", OMIT);

      const values = [
        { value: x0, placeholder: "0" },
        { value: y0, placeholder: "0" },
        { value: x1, placeholder: "0" },
        { value: y1, placeholder: "0" },
        { value: mx, placeholder: "0" },
        { value: my, placeholder: "0" },
        { value: mdx, placeholder: "0.125" },
        { value: mdy, placeholder: "0" },
        { value: layers, placeholder: "nil" },
      ];

      let lastIndex = values.length - 1;
      while (lastIndex >= 0 && values[lastIndex].value === OMIT) {
        lastIndex -= 1;
      }

      const args = [];
      for (let index = 0; index <= lastIndex; index += 1) {
        const entry = values[index];
        args.push(entry.value === OMIT ? entry.placeholder : entry.value);
      }

      const call = args.length ? `tline(${args.join(", ")})` : "tline()";
      const line = `${indent(indentLevel)}${call}`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
