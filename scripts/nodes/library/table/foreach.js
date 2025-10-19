import { createNodeModule } from "../../nodeTypes.js";

/**
 * Iterates over a table with a callback using PICO-8's foreach helper and exposes loop variables.
 */
export const tableForeachNode = createNodeModule(
  {
    id: "table_foreach",
    title: "Foreach Table",
    category: "Tables",
    description:
      "Execute a callback for each value produced by foreach().",
  searchTags: ["foreach", "table", "iterate", "loop", "index", "counter"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "table", name: "Table", direction: "input", kind: "table" },
    ],
    outputs: [
      { id: "loop", name: "Loop", direction: "output", kind: "exec" },
      { id: "item", name: "Item", direction: "output", kind: "any" },
      { id: "index", name: "Index", direction: "output", kind: "number" },
      {
        id: "completed",
        name: "Completed",
        direction: "output",
        kind: "exec",
      },
    ],
    properties: [
      {
        key: "itemName",
        label: "Item Variable",
        type: "string",
        defaultValue: "item",
      },
      {
        key: "indexName",
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
      const tableValue = resolveValueInput("table", "{}");
      let itemName = sanitizeIdentifier(String(node.properties.itemName ?? "item"));
      if (!itemName) {
        itemName = "item";
      }
      let indexName = sanitizeIdentifier(String(node.properties.indexName ?? "i"));
      if (!indexName) {
        indexName = "i";
      }
      let counterName = sanitizeIdentifier(`__pg_${node.id}_index`);
      if (!counterName) {
        counterName = "__pg_index";
      }
      if (counterName === indexName) {
        counterName = `${counterName}_counter`;
      }
      const lines = [
        `${indent(indentLevel)}local ${counterName} = 0`,
        `${indent(indentLevel)}foreach(${tableValue}, function(${itemName})`,
        `${indent(indentLevel + 1)}${counterName} += 1`,
        `${indent(indentLevel + 1)}local ${indexName} = ${counterName}`,
      ];

      const branchLines = emitBranch("loop", {
        indentLevel: indentLevel + 1,
        path: new Set(path),
      });
      if (!branchLines.length) {
        lines.push(`${indent(indentLevel + 1)}-- foreach body`);
      } else {
        lines.push(...branchLines);
      }

      lines.push(`${indent(indentLevel)}end)`);
      lines.push(
        ...emitBranch("completed", {
          indentLevel,
          path,
        })
      );

      return lines;
    },
    evaluateValue: ({ node, pinId, sanitizeIdentifier }) => {
      switch (pinId) {
        case "item": {
          const name = sanitizeIdentifier(
            String(node.properties.itemName ?? "item")
          );
          return name || "item";
        }
        case "index": {
          const name = sanitizeIdentifier(
            String(node.properties.indexName ?? "i")
          );
          return name || "i";
        }
        default:
          return "nil";
      }
    },
  }
);
