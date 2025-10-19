/**
 * @typedef {Object} PropertySchema
 * @property {string} key Property identifier.
 * @property {string} label Human-friendly label.
 * @property {('string'|'number'|'boolean'|'enum'|'multiline')} type Control type used in the inspector.
 * @property {unknown} [defaultValue] Default property value.
 * @property {Array<{label:string,value:string}>} [options] Option collection for enum values.
 * @property {string} [placeholder] Optional placeholder text.
 */

/**
 * @typedef {Object} PinConfig
 * @property {string} id Stable identifier unique within the node definition.
 * @property {string} name Display name.
 * @property {('input'|'output')} direction Pin direction relative to the node.
 * @property {('exec'|'number'|'boolean'|'string'|'table'|'any')} kind Blueprint connection kind.
 * @property {string} [description] Optional tooltip text.
 * @property {unknown} [defaultValue] Default literal for data pins.
 */

/**
 * @typedef {Object} NodeDefinition
 * @property {string} id Node identifier used for instantiation.
 * @property {string} title Display title.
 * @property {string} category Group name for palette organization.
 * @property {string} [description] Optional description used in the palette.
 * @property {Array<PinConfig>} inputs Input pins.
 * @property {Array<PinConfig>} outputs Output pins.
 * @property {Array<PropertySchema>} properties Property schema displayed in inspector.
 * @property {Array<string>} [searchTags] Optional keywords aiding palette searches.
 * @property {(properties: Record<string, unknown>) => void} [onPropertiesChanged] Lifecycle hook invoked after inspector edits.
 * @property {(properties: Record<string, unknown>) => void} [initializeProperties] Optional initializer for property defaults.
 * @property {boolean} [unique=false] Whether the node is limited to a single instance within the workspace.
 */

/**
 * @typedef {import('../core/BlueprintNode.js').BlueprintNode} BlueprintNode
 */

/**
 * @typedef {Object} ExecContext
 * @property {BlueprintNode} node Active node instance.
 * @property {number} indentLevel Current indentation level.
 * @property {Set<string>} path Cycle detection guard set.
 * @property {(pinId: string) => Array<string>} emitNextExec Emits the next exec branch for the supplied output pin.
 * @property {(pinId: string, overrides?: { indentLevel?: number, path?: Set<string> }) => Array<string>} emitBranch Emits all branches reachable from the supplied exec output pin.
 * @property {(nodeId: string, indentLevel: number, path: Set<string>) => Array<string>} emitExecChain Walks the exec chain starting from the provided node identifier.
 * @property {(pinId: string, fallback: string) => string} resolveValueInput Resolves a value input for the active node.
 * @property {(pinId: string) => Array<{nodeId: string, pinId: string}>} findExecTargets Finds exec targets for the supplied pin.
 * @property {(level?: number) => string} indent Produces indentation whitespace for the supplied level (defaults to the current level).
 * @property {(name: string) => string} sanitizeIdentifier Normalizes identifiers for Lua emission.
 * @property {(operator: string) => string} sanitizeOperator Normalizes comparison operators for Lua.
 * @property {(kind: string, value: unknown) => string} formatLiteral Formats a literal value for Lua output.
 */

/**
 * @typedef {Object} ValueContext
 * @property {BlueprintNode} node Active node instance.
 * @property {(pinId: string, fallback: string) => string} resolveValueInput Resolves a value input for the active node.
 * @property {(name: string) => string} sanitizeIdentifier Normalizes identifiers for Lua emission.
 * @property {(operator: string) => string} sanitizeOperator Normalizes comparison operators for Lua.
 * @property {(kind: string, value: unknown) => string} formatLiteral Formats a literal value for Lua output.
 */

/**
 * @typedef {Object} NodeBehavior
 * @property {boolean} [isEntryPoint] Indicates whether the node should be treated as the primary entry point.
 * @property {('_init'|'_update'|'_draw'|'_update60')} [eventName] Optional PICO-8 lifecycle callback to generate.
 * @property {(context: ExecContext) => Array<string>} [emitExec] Generates Lua statements for exec-oriented nodes.
 * @property {(context: ValueContext) => string} [evaluateValue] Generates a Lua expression for value-oriented nodes.
 */

/**
 * @typedef {Object} NodeModule
 * @property {NodeDefinition} definition Node metadata exposed to the editor.
 * @property {NodeBehavior} [behavior] Optional Lua emission hooks for the node.
 */

/**
 * Creates a node module ensuring a behavior object is always present.
 *
 * @param {NodeDefinition} definition Node metadata.
 * @param {NodeBehavior} [behavior] Optional behavior hooks.
 * @returns {NodeModule}
 */
export const createNodeModule = (definition, behavior = {}) => ({
  definition,
  behavior,
});

export {};
