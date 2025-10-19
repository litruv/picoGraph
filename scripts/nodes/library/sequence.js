import { createNodeModule } from "../nodeTypes.js";

/**
 * Executes multiple branches in sequence.
 */
export const sequenceNode = createNodeModule(
  {
    id: "sequence",
    title: "Sequence",
    category: "Logic",
    description: "Execute connected branches sequentially.",
    searchTags: ["sequence", "flow", "order", "multi"],
    inputs: [{ id: "exec_in", name: "Exec", direction: "input", kind: "exec" }],
    outputs: [
      { id: "a", name: "A", direction: "output", kind: "exec" },
      { id: "b", name: "B", direction: "output", kind: "exec" },
      { id: "c", name: "C", direction: "output", kind: "exec" },
    ],
    properties: [],
    initializeProperties: (properties) => {
      if (!Array.isArray(properties.branches)) {
        properties.branches = [
          { id: "a" },
          { id: "b" },
          { id: "c" },
        ];
      } else {
        properties.branches = properties.branches
          .map((entry) =>
            entry && typeof entry.id === "string"
              ? { id: entry.id.trim() || "" }
              : null
          )
          .filter((entry) => entry && entry.id);
        if (!properties.branches.length) {
          properties.branches = [
            { id: "a" },
            { id: "b" },
            { id: "c" },
          ];
        }
      }

      if (!Number.isFinite(properties.branchCounter)) {
        properties.branchCounter = properties.branches.length;
      }
    },
  },
  {
    emitExec: ({
      node,
      indent,
      indentLevel,
      findExecTargets,
      emitExecChain,
      path,
    }) => {
      const lines = [];
      node.outputs.forEach((pin) => {
        const label = (pin.name ?? pin.id).toLowerCase();
        lines.push(`${indent(indentLevel)}-- sequence ${label}`);
        const targets = findExecTargets(pin.id);
        if (!targets.length) {
          return;
        }
        targets.forEach((target) => {
          const branchPath = new Set(path);
          lines.push(...emitExecChain(target.nodeId, indentLevel, branchPath));
        });
      });
      return lines;
    },
  }
);
