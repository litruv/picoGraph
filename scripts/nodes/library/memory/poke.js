import { createNodeModule } from "../../nodeTypes.js";

/**
 * Writes one or more bytes to base RAM using poke.
 */
export const memoryPokeNode = createNodeModule(
  {
    id: "memory_poke",
    title: "Poke Memory",
    category: "Memory",
    description: "Write sequential bytes to base RAM.",
    searchTags: ["poke", "memory", "write"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "address",
        name: "Address",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "value",
        name: "Value",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [
      {
        key: "extraValues",
        label: "Additional Values",
        type: "string",
        placeholder: "e.g. 0x10, 0x11",
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
      const address = resolveValueInput("address", "0");
      const value = resolveValueInput("value", "0");
      const args = [address, value];

      const extras = String(node.properties.extraValues ?? "").trim();
      if (extras.length) {
        extras
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
          .forEach((entry) => args.push(entry));
      }

      const line = `${indent(indentLevel)}poke(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
