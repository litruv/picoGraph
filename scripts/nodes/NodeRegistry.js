import { BlueprintNode } from "../core/BlueprintNode.js";
import { nodeModules } from "./library/index.js";

/** @typedef {import('./nodeTypes.js').NodeDefinition} NodeDefinition */
/** @typedef {import('./nodeTypes.js').NodeBehavior} NodeBehavior */
/** @typedef {import('./nodeTypes.js').NodeModule} NodeModule */
/** @typedef {{ value: string, weight: number }} SearchField */

/**
 * Central registry providing node definitions, behavior hooks, and factory helpers.
 */
export class NodeRegistry {
  constructor() {
    /** @type {Map<string, NodeDefinition>} */
    this.definitions = new Map();
    /** @type {Map<string, NodeBehavior>} */
    this.behaviors = new Map();
    /** @type {Set<string>} */
    this.entryNodeTypes = new Set();
    /** @type {Map<string, '_init'|'_update'|'_draw'|'_update60'>} */
    this.entryPointEvents = new Map();

    nodeModules.forEach((module) => this.registerModule(module));
  }

  /**
   * Normalizes search inputs for case-insensitive comparisons.
   *
   * @param {string} query Raw query string.
   * @returns {string}
   */
  #normalizeQuery(query) {
    return (query ?? "").trim().toLowerCase();
  }

  /**
   * Determines whether a node definition matches the provided query.
   *
   * @param {NodeDefinition} definition Definition to inspect.
   * @param {string} query Search query.
   * @returns {boolean}
   */
  matchesDefinition(definition, query) {
    const normalized = this.#normalizeQuery(query);
    if (!normalized) {
      return true;
    }

    const score = this.#scoreDefinition(definition, normalized);
    return Number.isFinite(score);
  }

  /**
   * Enumerates every registered definition.
   *
   * @returns {Array<NodeDefinition>}
   */
  list() {
    return [...this.definitions.values()];
  }

  /**
   * Retrieves a single node definition.
   *
   * @param {string} id Definition identifier.
   * @returns {NodeDefinition | undefined}
   */
  get(id) {
    return this.definitions.get(id);
  }

  /**
   * Performs a fuzzy search across node metadata and returns results sorted by distance.
   *
   * @param {string} query Search input.
   * @returns {Array<NodeDefinition>}
   */
  search(query) {
    const normalized = this.#normalizeQuery(query);
    if (!normalized) {
      return this.list().sort((a, b) => a.title.localeCompare(b.title));
    }

    /** @type {Array<{ definition: NodeDefinition, score: number }>} */
    const ranked = [];
    this.definitions.forEach((definition) => {
      const score = this.#scoreDefinition(definition, normalized);
      if (Number.isFinite(score)) {
        ranked.push({ definition, score });
      }
    });

    ranked.sort((a, b) => {
      if (a.score === b.score) {
        return a.definition.title.localeCompare(b.definition.title);
      }
      return a.score - b.score;
    });

    return ranked.map((entry) => entry.definition);
  }

  /**
   * Aggregates searchable fields for a node definition and assigns weighting.
   *
   * @param {NodeDefinition} definition Definition to inspect.
   * @returns {Array<SearchField>} Normalized field collection with weights.
   */
  #collectSearchFields(definition) {
    const fields = /** @type {Array<SearchField>} */ ([
      { value: definition.title, weight: 0.8 },
      { value: definition.category, weight: 1 },
    ]);

    if (definition.description) {
      fields.push({ value: definition.description, weight: 1 });
    }

    if (Array.isArray(definition.searchTags)) {
      definition.searchTags.forEach((tag) => {
        fields.push({ value: tag, weight: 1 });
      });
    }

    return fields
      .filter((field) => typeof field.value === "string" && field.value.trim().length)
      .map((field) => ({
        value: field.value.toLowerCase(),
        weight: field.weight,
      }));
  }

  /**
  * Computes a fuzzy score representing how closely a definition matches a query.
   *
   * @param {NodeDefinition} definition Target definition.
   * @param {string} normalizedQuery Lowercase trimmed query string.
  * @returns {number} Matching score where lower values are closer; Infinity means no match.
   */
  #scoreDefinition(definition, normalizedQuery) {
    const fields = this.#collectSearchFields(definition);
    if (!fields.length) {
      return Number.POSITIVE_INFINITY;
    }

    let best = Number.POSITIVE_INFINITY;
    for (const field of fields) {
      const score = this.#computeFuzzyScore(normalizedQuery, field.value);
      if (!Number.isFinite(score)) {
        continue;
      }

      const weighted = score * field.weight;
      if (weighted < best) {
        best = weighted;
      }
      if (best === 0) {
        break;
      }
    }
    return best;
  }

  /**
   * Produces a fuzzy matching distance between the query and a candidate string.
   *
   * @param {string} query Normalized query string.
   * @param {string} candidate Normalized candidate string.
   * @returns {number} Distance score; Infinity indicates the query is not a subsequence of the candidate.
   */
  #computeFuzzyScore(query, candidate) {
    if (!candidate) {
      return Number.POSITIVE_INFINITY;
    }

    const qLength = query.length;
    const cLength = candidate.length;
    if (!qLength) {
      return 0;
    }

    let qIndex = 0;
    let score = 0;
    let lastMatch = -1;

    for (let cIndex = 0; cIndex < cLength; cIndex += 1) {
      if (candidate[cIndex] !== query[qIndex]) {
        continue;
      }

      if (lastMatch === -1) {
        score += cIndex;
      } else {
        score += cIndex - lastMatch - 1;
      }

      lastMatch = cIndex;
      qIndex += 1;

      if (qIndex === qLength) {
        break;
      }
    }

    if (qIndex !== qLength) {
      return Number.POSITIVE_INFINITY;
    }

    score += cLength - lastMatch - 1;
    return score;
  }

  /**
   * Instantiates a blueprint node from a definition.
   *
   * @param {string} definitionId Definition identifier.
   * @param {{id: string, position: {x:number,y:number}}} options Initialization options.
   * @returns {BlueprintNode}
   */
  createNode(definitionId, options) {
    const definition = this.get(definitionId);
    if (!definition) {
      throw new Error(`Unknown node definition: ${definitionId}`);
    }

    const properties = {};
    definition.properties.forEach((schema) => {
      const value = schema.defaultValue ?? null;
      properties[schema.key] = value;
    });

    definition.initializeProperties?.(properties);

    return new BlueprintNode({
      id: options.id,
      type: definition.id,
      title: definition.title,
      position: { ...options.position },
      inputs: definition.inputs.map((pin) => ({
        ...pin,
      })),
      outputs: definition.outputs.map((pin) => ({
        ...pin,
      })),
      properties,
    });
  }

  /**
   * Registers a node module exposing editor metadata and Lua behavior.
   *
   * @param {NodeModule} module Node module to register.
   */
  registerModule(module) {
    const { definition, behavior } = module;
    this.definitions.set(definition.id, definition);

    if (behavior) {
      this.behaviors.set(definition.id, behavior);
      if (behavior.isEntryPoint) {
        this.entryNodeTypes.add(definition.id);
        if (behavior.eventName) {
          this.entryPointEvents.set(definition.id, behavior.eventName);
        }
      }
    }
  }

  /**
   * Retrieves behavior metadata for a node type.
   *
   * @param {string} id Node identifier.
   * @returns {NodeBehavior | undefined}
   */
  getBehavior(id) {
    return this.behaviors.get(id);
  }

  /**
   * Enumerates node types flagged as entry points.
   *
   * @returns {Array<string>}
   */
  getEntryNodeTypes() {
    return [...this.entryNodeTypes];
  }

  /**
   * Exposes lifecycle event bindings for entry nodes.
   *
   * @returns {Map<string, '_init'|'_update'|'_draw'|'_update60'>}
   */
  getEntryPointEvents() {
    return new Map(this.entryPointEvents);
  }
}
