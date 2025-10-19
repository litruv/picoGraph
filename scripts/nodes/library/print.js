import { createNodeModule } from "../nodeTypes.js";

/**
 * Emits a PICO-8 print call.
 */
export const printNode = createNodeModule(
  {
    id: "print",
    title: "Print",
    category: "PICO-8",
    description: "Render text on screen using the PICO-8 print command.",
    searchTags: ["print", "text", "output", "debug"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "msg",
        name: "Text",
        direction: "input",
        kind: "string",
        defaultValue: "hello",
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
      {
        id: "color",
        name: "Color",
        direction: "input",
        kind: "number",
        defaultValue: 7,
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const text = resolveValueInput("msg", '""');
      const x = resolveValueInput("x", "0");
      const y = resolveValueInput("y", "0");
      const color = resolveValueInput("color", "7");
      const line = `${indent(indentLevel)}print(${text}, ${x}, ${y}, ${color})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
