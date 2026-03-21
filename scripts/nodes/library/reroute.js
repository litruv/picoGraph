import { createNodeModule } from "../nodeTypes.js";

/**
 * A transparent pass-through node for redirecting data wires.
 * Emits no code on its own — the value resolves directly through the input.
 */
export const rerouteNode = createNodeModule(
  {
    id: "reroute",
    title: "Reroute",
    category: "Utility",
    description: "Redirects a data wire without affecting the value.",
    searchTags: ["reroute", "redirect", "wire", "relay", "pass", "through"],
    inputs: [
      { id: "value", name: "", direction: "input", kind: "any" },
    ],
    outputs: [
      { id: "value", name: "", direction: "output", kind: "any" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      return resolveValueInput("value", "nil");
    },
  }
);

/**
 * A transparent pass-through node for redirecting exec wires.
 * Emits no code on its own — execution continues directly to the next node.
 */
export const rerouteExecNode = createNodeModule(
  {
    id: "reroute_exec",
    title: "Reroute",
    category: "Utility",
    description: "Redirects an exec wire without generating any code.",
    searchTags: ["reroute", "redirect", "exec", "wire", "relay", "pass", "through"],
    inputs: [
      { id: "exec_in", name: "", direction: "input", kind: "exec" },
    ],
    outputs: [
      { id: "exec_out", name: "", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ emitNextExec }) => {
      return emitNextExec("exec_out");
    },
  }
);
