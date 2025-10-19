import { createNodeModule } from "../../nodeTypes.js";

/**
 * Applies host configuration flags via devkit_config().
 */
export const devkitConfigNode = createNodeModule(
  {
    id: "devkit_config",
    title: "Devkit Config",
    category: "Devkit",
    description: "Send a configuration string to devkit_config().",
    searchTags: ["devkit", "config", "host"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "config",
        name: "Config",
        direction: "input",
        kind: "string",
        defaultValue: "",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const config = resolveValueInput("config", '""');
      const line = `${indent(indentLevel)}devkit_config(${config})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
