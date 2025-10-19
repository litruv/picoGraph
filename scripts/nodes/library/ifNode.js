import { createNodeModule } from "../nodeTypes.js";

/**
 * Branches execution based on a boolean condition.
 */
export const ifNode = createNodeModule(
  {
    id: "if",
    title: "If",
    category: "Logic",
    description: "Branch execution based on a boolean condition.",
    searchTags: ["if", "condition", "branch", "logic"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "condition",
        name: "Condition",
        direction: "input",
        kind: "boolean",
      },
    ],
    outputs: [
      { id: "then", name: "Then", direction: "output", kind: "exec" },
      { id: "else", name: "Else", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({
      indent,
      indentLevel,
      resolveValueInput,
      emitBranch,
      findExecTargets,
      path,
    }) => {
      const condition = resolveValueInput("condition", "false");
      const lines = [`${indent(indentLevel)}if ${condition} then`];

      const thenLines = emitBranch("then", {
        indentLevel: indentLevel + 1,
        path: new Set(path),
      });
      if (!thenLines.length) {
        lines.push(`${indent(indentLevel + 1)}-- then branch`);
      } else {
        lines.push(...thenLines);
      }

      if (findExecTargets("else").length) {
        lines.push(`${indent(indentLevel)}else`);
        const elseLines = emitBranch("else", {
          indentLevel: indentLevel + 1,
          path: new Set(path),
        });
        if (!elseLines.length) {
          lines.push(`${indent(indentLevel + 1)}-- else branch`);
        } else {
          lines.push(...elseLines);
        }
      }

      lines.push(`${indent(indentLevel)}end`);
      return lines;
    },
  }
);
