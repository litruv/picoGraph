/**
 * @typedef {Object} PinDescriptor
 * @property {string} id Unique pin identifier scoped to the node.
 * @property {string} name Public display name.
 * @property {('input'|'output')} direction Pin direction relative to the node.
 * @property {('exec'|'number'|'boolean'|'string'|'table'|'any')} kind Pin kind describing blueprint behavior.
 * @property {string} [description] Optional tooltip/description.
 * @property {unknown} [defaultValue] Default value for data pins.
 */

/**
 * @typedef {Object} BlueprintNodeInit
 * @property {string} id Node identifier.
 * @property {string} type Node definition identifier.
 * @property {string} title Display title for the node.
 * @property {{x:number,y:number}} position Node position within the workspace.
 * @property {Array<PinDescriptor>} inputs Input pin descriptors.
 * @property {Array<PinDescriptor>} outputs Output pin descriptors.
 * @property {Record<string, unknown>} properties Arbitrary node properties.
 */

/**
 * Represents a blueprint node instance within the graph.
 */
export class BlueprintNode {
  /**
   * @param {BlueprintNodeInit} init Initialization payload.
   */
  constructor(init) {
    this.id = init.id;
    this.type = init.type;
    this.title = init.title;
    this.position = { ...init.position };
    this.inputs = init.inputs.map((pin) => ({ ...pin }));
    this.outputs = init.outputs.map((pin) => ({ ...pin }));
    this.properties = { ...init.properties };
  }

  /**
   * Updates the node position immutably.
   *
   * @param {{x:number,y:number}} position New position coordinates.
   */
  setPosition(position) {
    this.position = { x: position.x, y: position.y };
  }

  /**
   * Provides a shallow clone suitable for serialization.
   *
   * @returns {BlueprintNodeInit}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      position: { ...this.position },
      inputs: this.inputs.map((pin) => ({ ...pin })),
      outputs: this.outputs.map((pin) => ({ ...pin })),
      properties: { ...this.properties },
    };
  }

  /**
   * Retrieves a pin descriptor matching the supplied identifier.
   *
   * @param {string} pinId Pin identifier.
   * @returns {PinDescriptor | undefined}
   */
  getPin(pinId) {
    return [...this.inputs, ...this.outputs].find((pin) => pin.id === pinId);
  }
}
