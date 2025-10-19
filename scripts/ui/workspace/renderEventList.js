/**
 * Renders the event summary list.
 *
 * @param {object} options Rendering options.
 * @param {HTMLUListElement | null} options.element Target list element.
 * @param {import('../../nodes/NodeRegistry.js').NodeRegistry} options.registry Node registry instance.
 * @param {import('../../core/NodeGraph.js').NodeGraph} options.graph Active node graph.
 * @param {(nodeId: string) => void} options.focusNode Callback to focus a node.
 * @param {(message: string) => void} options.renderEmpty Callback to render empty state.
 * @param {(node: import('../../core/BlueprintNode.js').BlueprintNode, entryTypes: Set<string>) => boolean} options.isEventNode Predicate to determine if node represents an event.
 */
export function renderEventList({
  element,
  registry,
  graph,
  focusNode,
  renderEmpty,
  isEventNode,
}) {
  if (!element) {
    return;
  }

  element.innerHTML = "";

  const entryTypes = new Set(registry.getEntryNodeTypes());
  const events = [...graph.nodes.values()].filter((node) =>
    isEventNode(node, entryTypes)
  );
  const builtInEvents = [];
  const customEvents = [];

  events.forEach((node) => {
    if (node.type === "custom_event") {
      customEvents.push(node);
    } else {
      builtInEvents.push(node);
    }
  });

  if (!builtInEvents.length && !customEvents.length) {
    renderEmpty("No events yet");
    return;
  }

  const appendHeading = (title) => {
    const headingItem = document.createElement("li");
    headingItem.className = "overview-subheading";
    headingItem.textContent = title;
    element.appendChild(headingItem);
  };

  const appendEventItem = (node, displayName) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "overview-item";
    button.dataset.nodeId = node.id;
    button.addEventListener("click", () => {
      focusNode(node.id);
    });

    const label = document.createElement("span");
    label.className = "overview-item-label";
    label.textContent = displayName;
    button.appendChild(label);

    const meta = document.createElement("span");
    meta.className = "overview-item-meta";
    meta.textContent = node.id;
    button.appendChild(meta);

    item.appendChild(button);
    element.appendChild(item);
  };

  if (builtInEvents.length) {
    appendHeading("Events");
    builtInEvents
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach((node) => appendEventItem(node, node.title));
  }

  if (customEvents.length) {
    appendHeading("Custom Events");
    customEvents
      .slice()
      .sort((a, b) => {
        const nameA =
          (typeof a.properties.name === "string"
            ? a.properties.name.trim()
            : "") || "CustomEvent";
        const nameB =
          (typeof b.properties.name === "string"
            ? b.properties.name.trim()
            : "") || "CustomEvent";
        return nameA.localeCompare(nameB);
      })
      .forEach((node) => {
        const displayName =
          (typeof node.properties.name === "string"
            ? node.properties.name.trim()
            : "") || "CustomEvent";
        appendEventItem(node, displayName);
      });
  }
}
