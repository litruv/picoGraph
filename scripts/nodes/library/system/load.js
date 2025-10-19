import { createNodeModule } from "../../nodeTypes.js";

/**
 * Loads another cartridge and optionally supplies breadcrumb and parameter metadata.
 */
export const loadNode = createNodeModule(
  {
    id: "system_load",
    title: "Load Cartridge",
    category: "System",
    description:
      "Load a local or BBS cartridge, optionally providing breadcrumb and parameter string.",
    searchTags: ["load", "cartridge", "system", "cart"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "filename",
        name: "Filename",
        direction: "input",
        kind: "string",
        defaultValue: "cart.p8",
      },
      {
        id: "breadcrumb",
        name: "Breadcrumb",
        direction: "input",
        kind: "string",
      },
      { id: "param", name: "Param String", direction: "input", kind: "string" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const filename = resolveValueInput("filename", '""');
      const breadcrumb = resolveValueInput("breadcrumb", OMIT);
      const param = resolveValueInput("param", OMIT);

      const args = [filename];
      if (breadcrumb !== OMIT || param !== OMIT) {
        const breadcrumbArg = breadcrumb === OMIT ? "nil" : breadcrumb;
        args.push(breadcrumbArg);
        if (param !== OMIT) {
          args.push(param);
        }
      }

      const lines = [`${indent(indentLevel)}load(${args.join(", ")})`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
