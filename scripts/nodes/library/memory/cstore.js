import { createNodeModule } from "../../nodeTypes.js";

/**
 * Copies data from base RAM to cartridge ROM using cstore.
 */
export const memoryCstoreNode = createNodeModule(
  {
    id: "memory_cstore",
    title: "Store To Cart",
    category: "Memory",
    description:
      "Copy base RAM into cart ROM, optionally targeting another cartridge.",
    searchTags: ["cstore", "memory", "cart", "save"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "dest",
        name: "Dest",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "source",
        name: "Source",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "length",
        name: "Length",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "filename",
        name: "Filename",
        direction: "input",
        kind: "string",
        description: "Optional cartridge filename",
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
      const dest = resolveValueInput("dest", "0");
      const source = resolveValueInput("source", "0");
      const length = resolveValueInput("length", "0");
      const filename = resolveValueInput("filename", OMIT);

      const args = [dest, source, length];
      if (filename !== OMIT) {
        args.push(filename);
      }

      const line = `${indent(indentLevel)}cstore(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
