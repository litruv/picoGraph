import { createNodeModule } from "../nodeTypes.js";

const LOCAL_TYPES = [
  { value: "number", label: "Number" },
  { value: "string", label: "String" },
  { value: "boolean", label: "Boolean" },
  { value: "table", label: "Table" },
];

const DEFAULT_LOCAL_TYPE = LOCAL_TYPES[0]?.value ?? "number";

const sanitizeType = (raw) => {
  const candidate = typeof raw === "string" ? raw.toLowerCase() : DEFAULT_LOCAL_TYPE;
  return LOCAL_TYPES.some((entry) => entry.value === candidate)
    ? candidate
    : DEFAULT_LOCAL_TYPE;
};

const ensureName = (raw, fallback = "localVar") => {
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.length ? value : fallback;
};

const resolveValuePropertyKey = (type) => {
  switch (type) {
    case "string":
      return "valueString";
    case "boolean":
      return "valueBoolean";
    case "table":
      return "valueTable";
    case "number":
    default:
      return "valueNumber";
  }
};

const defaultValueForType = (type) => {
  switch (type) {
    case "string":
      return "";
    case "boolean":
      return false;
    case "table":
      return "{}";
    case "number":
    default:
      return 0;
  }
};

const initializeLocalProperties = (properties, { includeValue }) => {
  const type = sanitizeType(properties.variableType);
  properties.variableType = type;
  properties.name = ensureName(properties.name);

  if (typeof properties.valueNumber !== "number") {
    properties.valueNumber = Number.isFinite(Number(properties.valueNumber))
      ? Number(properties.valueNumber)
      : 0;
  }
  if (typeof properties.valueString !== "string") {
    properties.valueString = String(properties.valueString ?? "");
  }
  if (typeof properties.valueBoolean !== "boolean") {
    properties.valueBoolean = Boolean(properties.valueBoolean);
  }
  if (typeof properties.valueTable !== "string") {
    properties.valueTable = String(properties.valueTable ?? "{}");
  }

  if (includeValue) {
    const key = resolveValuePropertyKey(type);
    const value = properties[key] ?? defaultValueForType(type);
    properties[key] = value;
  }
};

const normalizeLocalProperties = (properties, { includeValue }) => {
  const type = sanitizeType(properties.variableType);
  properties.variableType = type;
  properties.name = ensureName(properties.name);
  if (includeValue) {
    const key = resolveValuePropertyKey(type);
    const value = properties[key] ?? defaultValueForType(type);
    properties[key] = value;
  }
};

export const setLocalVariableNode = createNodeModule(
  {
    id: "set_local_var",
    title: "Set Local",
    category: "Logic",
    description: "Declare or assign a local variable with an inline literal.",
    searchTags: ["local", "set", "assign", "variable"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "value",
        name: "Value",
        direction: "input",
        kind: "any",
        description: "Optional override for the inline literal",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
    initializeProperties: (properties) => {
      initializeLocalProperties(properties, { includeValue: true });
    },
    onPropertiesChanged: (properties) => {
      normalizeLocalProperties(properties, { includeValue: true });
    },
  },
  {
    emitExec: ({
      node,
      indent,
      indentLevel,
      resolveValueInput,
      sanitizeIdentifier,
      emitNextExec,
      formatLiteral,
    }) => {
      const type = sanitizeType(node.properties.variableType);
      const name = sanitizeIdentifier(ensureName(node.properties.name));
      const valueKey = resolveValuePropertyKey(type);
      const inlineValue = node.properties[valueKey] ?? defaultValueForType(type);
      const fallbackLiteral =
        type === "table"
          ? String(inlineValue ?? "{}") || "{}"
          : formatLiteral(type, inlineValue);
      const valueExpression = resolveValueInput("value", fallbackLiteral);
      const statement = `${indent(indentLevel)}local ${name} = ${valueExpression}`;
      return [statement, ...emitNextExec("exec_out")];
    },
  }
);

export const getLocalVariableNode = createNodeModule(
  {
    id: "get_local_var",
    title: "Get Local",
    category: "Logic",
    description: "Access a local variable declared earlier in the flow.",
    searchTags: ["local", "get", "variable", "read"],
    inputs: [],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "any" },
    ],
    properties: [],
    initializeProperties: (properties) => {
      initializeLocalProperties(properties, { includeValue: false });
    },
    onPropertiesChanged: (properties) => {
      normalizeLocalProperties(properties, { includeValue: false });
    },
  },
  {
    evaluateValue: ({ node, sanitizeIdentifier }) => {
      return sanitizeIdentifier(ensureName(node.properties.name));
    },
  }
);

export const localVariableNodes = [setLocalVariableNode, getLocalVariableNode];
