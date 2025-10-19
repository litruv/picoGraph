import { createNodeModule } from "../nodeTypes.js";

/**
 * Iterates from start to end inclusive using PICO-8 for semantics.
 */
export const forLoopNode = createNodeModule(
  {
    id: "for_loop",
    title: "For Loop",
    category: "Logic",
    description:
      "Iterate from start to end inclusive using PICO-8 for semantics.",
    searchTags: ["loop", "for", "iterate", "counter"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "start",
        name: "Start",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "end",
        name: "End",
        direction: "input",
        kind: "number",
        defaultValue: 10,
      },
      {
        id: "step",
        name: "Step",
        direction: "input",
        kind: "number",
        defaultValue: 1,
      },
    ],
    outputs: [
      { id: "loop", name: "Loop", direction: "output", kind: "exec" },
      { id: "completed", name: "Completed", direction: "output", kind: "exec" },
    ],
    properties: [
      {
        key: "index",
        label: "Index Variable",
        type: "string",
        defaultValue: "i",
      },
    ],
  },
  {
    emitExec: ({
      node,
      indent,
      indentLevel,
      resolveValueInput,
      sanitizeIdentifier,
      emitBranch,
      path,
    }) => {
      const index = sanitizeIdentifier(String(node.properties.index ?? "i"));
      const startValue = resolveValueInput("start", "0");
      const endValue = resolveValueInput("end", "0");
      const stepValue = resolveValueInput("step", "1");

      const lines = [
        `${indent(
          indentLevel
        )}for ${index} = ${startValue}, ${endValue}, ${stepValue} do`,
      ];

      const loopLines = emitBranch("loop", {
        indentLevel: indentLevel + 1,
        path: new Set(path),
      });
      if (!loopLines.length) {
        lines.push(`${indent(indentLevel + 1)}-- loop body`);
      } else {
        lines.push(...loopLines);
      }

      lines.push(`${indent(indentLevel)}end`);
      lines.push(
        ...emitBranch("completed", {
          indentLevel,
          path,
        })
      );
      return lines;
    },
  }
);
