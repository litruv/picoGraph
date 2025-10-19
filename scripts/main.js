import { BlueprintWorkspace } from "./ui/BlueprintWorkspace.js";
import { NodeRegistry } from "./nodes/NodeRegistry.js";
import { LuaGenerator } from "./core/LuaGenerator.js";

/**
 * @typedef {{ compileLua(source: string): Promise<{ filePath: string }> }} ElectronAPI
 */

/**
 * @template T
 * @param {T | null} element DOM element reference.
 * @param {string} id Identifier used for error reporting.
 * @returns {T}
 */
const requireElement = (element, id) => {
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element;
};

const appBodyElement = /** @type {HTMLElement} */ (
  requireElement(document.getElementById("appBody"), "appBody")
);
const workspaceElement = /** @type {HTMLElement} */ (
  requireElement(document.getElementById("workspaceCanvas"), "workspaceCanvas")
);
const nodeLayer = /** @type {HTMLElement} */ (
  requireElement(document.getElementById("nodeLayer"), "nodeLayer")
);
const connectionLayer = /** @type {SVGElement} */ (
  requireElement(document.getElementById("connectionLayer"), "connectionLayer")
);
const eventList = /** @type {HTMLUListElement} */ (
  requireElement(document.getElementById("eventList"), "eventList")
);
const variableList = /** @type {HTMLUListElement} */ (
  requireElement(document.getElementById("variableList"), "variableList")
);
const addVariableButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("addVariableButton"),
    "addVariableButton"
  )
);
const paletteList = /** @type {HTMLElement} */ (
  requireElement(document.getElementById("paletteList"), "paletteList")
);
const paletteSearch = /** @type {HTMLInputElement} */ (
  requireElement(document.getElementById("paletteSearch"), "paletteSearch")
);
const paletteElement = /** @type {HTMLElement} */ (
  requireElement(document.getElementById("palettePanel"), "palettePanel")
);
const inspectorContent = /** @type {HTMLElement} */ (
  requireElement(
    document.getElementById("inspectorContent"),
    "inspectorContent"
  )
);
const duplicateNodeButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("duplicateNodeButton"),
    "duplicateNodeButton"
  )
);
const deleteNodeButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("deleteNodeButton"),
    "deleteNodeButton"
  )
);
const compileButton = /** @type {HTMLButtonElement} */ (
  requireElement(document.getElementById("compileButton"), "compileButton")
);
const exportLuaButton = /** @type {HTMLButtonElement} */ (
  requireElement(document.getElementById("exportLuaButton"), "exportLuaButton")
);
const projectSettingsButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("projectSettingsButton"),
    "projectSettingsButton"
  )
);
const paletteToggleButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("paletteToggleButton"),
    "paletteToggleButton"
  )
);
const frameSelectionButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("frameSelectionButton"),
    "frameSelectionButton"
  )
);
const luaModal = /** @type {HTMLElement} */ (
  requireElement(document.getElementById("luaModal"), "luaModal")
);
const luaModalCode = /** @type {HTMLElement} */ (
  requireElement(document.getElementById("luaModalCode"), "luaModalCode")
);
const luaModalCodeContainer = /** @type {HTMLElement} */ (
  requireElement(
    luaModal.querySelector(".lua-modal__code"),
    "luaModalCodeContainer"
  )
);
const copyLuaButton = /** @type {HTMLButtonElement} */ (
  requireElement(document.getElementById("copyLuaButton"), "copyLuaButton")
);
const closeLuaModalButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("closeLuaModalButton"),
    "closeLuaModalButton"
  )
);

const registry = new NodeRegistry();
const generator = new LuaGenerator(registry);
const workspace = new BlueprintWorkspace({
  workspaceElement,
  nodeLayer,
  connectionLayer,
  paletteList,
  paletteSearch,
  paletteElement,
  inspectorContent,
  duplicateNodeButton,
  deleteNodeButton,
  generator,
  registry,
  eventList,
  variableList,
  addVariableButton,
  projectSettingsButton,
  paletteToggleButton,
  appBodyElement,
  frameSelectionButton,
});

workspace.initialize();

/** @type {ElectronAPI | undefined} */
const electronAPI =
  typeof window !== "undefined" && "electronAPI" in window
    ? /** @type {ElectronAPI} */ (window.electronAPI)
    : undefined;

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const luaTokenPattern =
  /(--.*$)|("(?:\\.|[^"\\])*")|('(?!\[)(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|\b(and|break|do|else|elseif|end|false|for|function|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/gm;

const highlightLua = (source) => {
  if (!source) {
    return "";
  }

  let result = "";
  let lastIndex = 0;

  source.replace(
    luaTokenPattern,
    (
      match,
      comment,
      doubleQuoted,
      singleQuoted,
      numberLiteral,
      keyword,
      offset
    ) => {
      result += escapeHtml(source.slice(lastIndex, offset));

      let tokenType = "";
      if (comment) {
        tokenType = "comment";
      } else if (doubleQuoted || singleQuoted) {
        tokenType = "string";
      } else if (numberLiteral) {
        tokenType = "number";
      } else {
        tokenType = "keyword";
      }

      result += `<span class="lua-token lua-token--${tokenType}">${escapeHtml(
        match
      )}</span>`;
      lastIndex = offset + match.length;
      return match;
    }
  );

  result += escapeHtml(source.slice(lastIndex));
  return result;
};

const focusableSelector =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
let isLuaModalOpen = false;
let lastFocusedElement = /** @type {HTMLElement | null} */ (null);
let copyFeedbackTimeout = /** @type {number | null} */ (null);
let currentLuaSource = "";
let compileFeedbackTimeout = /** @type {number | null} */ (null);

const scheduleMicrotask = (callback) => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  Promise.resolve().then(callback);
};

const getModalFocusableElements = () => {
  return /** @type {Array<HTMLElement>} */ (
    Array.from(luaModal.querySelectorAll(focusableSelector)).filter(
      (element) =>
        element instanceof HTMLElement && !element.hasAttribute("disabled")
    )
  );
};

const handleModalKeydown = (event) => {
  if (!isLuaModalOpen) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeLuaModal();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const focusable = getModalFocusableElements();
  if (!focusable.length) {
    event.preventDefault();
    return;
  }

  const currentIndex = focusable.indexOf(document.activeElement);
  let nextIndex = currentIndex;

  if (event.shiftKey) {
    nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
  } else {
    nextIndex =
      currentIndex === -1 || currentIndex === focusable.length - 1
        ? 0
        : currentIndex + 1;
  }

  event.preventDefault();
  focusable[nextIndex].focus();
};

const writeClipboard = async (text) => {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const selection = document.getSelection();
  const previousRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const fallback = document.createElement("textarea");
  fallback.value = text;
  fallback.setAttribute("readonly", "true");
  fallback.style.position = "fixed";
  fallback.style.opacity = "0";
  document.body.appendChild(fallback);
  fallback.select();
  document.execCommand("copy");
  document.body.removeChild(fallback);

  if (previousRange && selection) {
    selection.removeAllRanges();
    selection.addRange(previousRange);
  }
};

const resetCopyFeedback = () => {
  copyLuaButton.classList.remove("is-success");
  copyLuaButton.setAttribute("aria-label", "Copy to clipboard");
  copyLuaButton.setAttribute("title", "Copy to clipboard");
};

const openLuaModal = () => {
  currentLuaSource = workspace.exportLua();
  luaModalCode.innerHTML = highlightLua(currentLuaSource);
  luaModalCodeContainer.scrollTop = 0;
  if (copyFeedbackTimeout !== null) {
    window.clearTimeout(copyFeedbackTimeout);
    copyFeedbackTimeout = null;
  }
  resetCopyFeedback();

  if (isLuaModalOpen) {
    return;
  }

  lastFocusedElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  luaModal.removeAttribute("hidden");
  luaModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  isLuaModalOpen = true;
  document.addEventListener("keydown", handleModalKeydown);

  scheduleMicrotask(() => {
    const focusTarget = luaModalCodeContainer;
    focusTarget.focus();
  });
};

const closeLuaModal = () => {
  if (!isLuaModalOpen) {
    return;
  }

  isLuaModalOpen = false;
  luaModal.setAttribute("aria-hidden", "true");
  luaModal.setAttribute("hidden", "");
  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", handleModalKeydown);

  if (copyFeedbackTimeout !== null) {
    window.clearTimeout(copyFeedbackTimeout);
    copyFeedbackTimeout = null;
  }
  resetCopyFeedback();

  if (lastFocusedElement && document.contains(lastFocusedElement)) {
    lastFocusedElement.focus();
  }
};

/**
 * Restores the compile button to its idle appearance.
 *
 * @returns {void}
 */
const resetCompileButton = () => {
  if (compileFeedbackTimeout !== null) {
    window.clearTimeout(compileFeedbackTimeout);
    compileFeedbackTimeout = null;
  }

  compileButton.classList.remove("is-success", "is-error", "is-busy");
  compileButton.disabled = false;
  compileButton.textContent = "Compile";
};

/**
 * Handles compile button clicks by requesting a Lua export from Electron.
 *
 * @returns {Promise<void>}
 */
const handleCompileClick = async () => {
  if (!electronAPI) {
    return;
  }

  if (compileFeedbackTimeout !== null) {
    window.clearTimeout(compileFeedbackTimeout);
    compileFeedbackTimeout = null;
  }

  compileButton.classList.remove("is-success", "is-error");
  compileButton.classList.add("is-busy");
  compileButton.disabled = true;
  compileButton.textContent = "Compiling...";

  const source = workspace.exportLua();

  try {
    const result = await electronAPI.compileLua(source);
    console.info("Lua compiled to", result.filePath);
    compileButton.classList.remove("is-busy");
    compileButton.classList.add("is-success");
    compileButton.disabled = false;
    compileButton.textContent = "Compiled!";
    compileFeedbackTimeout = window.setTimeout(() => {
      resetCompileButton();
    }, 1800);
  } catch (error) {
    console.error("Failed to compile Lua", error);
    compileButton.classList.remove("is-busy");
    compileButton.classList.add("is-error");
    compileButton.disabled = false;
    compileButton.textContent = "Failed";
    compileFeedbackTimeout = window.setTimeout(() => {
      resetCompileButton();
    }, 2200);
  }
};

if (electronAPI && typeof electronAPI.compileLua === "function") {
  compileButton.disabled = false;
  compileButton.addEventListener("click", () => {
    handleCompileClick().catch((error) => {
      console.error("Unhandled compile error", error);
      resetCompileButton();
    });
  });
} else {
  compileButton.disabled = true;
  compileButton.title = "Compile is available in the desktop app";
}

exportLuaButton.addEventListener("click", () => {
  openLuaModal();
});

luaModal.addEventListener("click", (event) => {
  const target =
    event.target instanceof HTMLElement
      ? event.target.closest("[data-modal-close]")
      : null;
  if (target) {
    event.preventDefault();
    closeLuaModal();
  }
});

copyLuaButton.addEventListener("click", async () => {
  if (!currentLuaSource) {
    return;
  }

  try {
    await writeClipboard(currentLuaSource);
    copyLuaButton.classList.add("is-success");
    copyLuaButton.setAttribute("aria-label", "Copied!");
    copyLuaButton.setAttribute("title", "Copied!");
    if (copyFeedbackTimeout !== null) {
      window.clearTimeout(copyFeedbackTimeout);
    }
    copyFeedbackTimeout = window.setTimeout(() => {
      resetCopyFeedback();
      copyFeedbackTimeout = null;
    }, 1500);
  } catch (error) {
    console.error("Copy failed", error);
  }
});

closeLuaModalButton.addEventListener("click", () => {
  closeLuaModal();
});
