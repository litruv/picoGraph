import { BlueprintWorkspace } from "./ui/BlueprintWorkspace.js";
import { NodeRegistry } from "./nodes/NodeRegistry.js";
import { LuaGenerator } from "./core/LuaGenerator.js";
import { EmbeddedPreview } from "./ui/EmbeddedPreview.js";
import { TileManager } from "./ui/TileManager.js";

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

/**
 * @typedef {{
 *   compileLua(source: string): Promise<{ filePath: string }>;
 *   previewCart?(cartContent: string): Promise<{ filePath: string }>;
 *   writePlayerHtml?(htmlContent: string): Promise<{ filePath: string }>;
 *   writePlayerCart?(cartContent: string): Promise<{ filePath: string }>;
 *   getCartStats?(cartContent: string): Promise<{ tokens: number, lines: number, chars: number, rawOutput: string }>;
 *   minimizeWindow?(): Promise<void>;
 *   toggleMaximizeWindow?(): Promise<boolean>;
 *   closeWindow?(): Promise<void>;
 *   getWindowMaximized?(): Promise<boolean>;
 *   onWindowMaximizedChanged?(callback: (isMaximized: boolean) => void): () => void;
 * }} ElectronAPI
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
const saveButton = /** @type {HTMLButtonElement} */ (
  requireElement(document.getElementById("saveButton"), "saveButton")
);
const previewButton = /** @type {HTMLButtonElement} */ (
  requireElement(document.getElementById("previewButton"), "previewButton")
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
const windowControls = /** @type {HTMLElement} */ (
  requireElement(document.getElementById("windowControls"), "windowControls")
);
const minimizeWindowButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("minimizeWindowButton"),
    "minimizeWindowButton"
  )
);
const maximizeWindowButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("maximizeWindowButton"),
    "maximizeWindowButton"
  )
);
const closeWindowButton = /** @type {HTMLButtonElement} */ (
  requireElement(document.getElementById("closeWindowButton"), "closeWindowButton")
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
const tileManagerButton = /** @type {HTMLButtonElement} */ (
  requireElement(
    document.getElementById("tileManagerButton"),
    "tileManagerButton"
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
  saveButton,
  projectSettingsButton,
  paletteToggleButton,
  appBodyElement,
  frameSelectionButton,
});

workspace.initialize();

// Initialize preview system
const embeddedPreview = new EmbeddedPreview({
  getLuaCode: () => {
    return workspace.exportLua();
  },
});

// Initialize tile manager
const tileManager = new TileManager();
tileManager.initialize();

/** @type {ElectronAPI | undefined} */
const electronAPI =
  typeof window !== "undefined" && "electronAPI" in window
    ? /** @type {ElectronAPI} */ (window.electronAPI)
    : undefined;

// Get titlebar element
const titleBarElement = document.querySelector('.header-title');

/**
 * Updates the window titlebar with token count information.
 *
 * @param {number} tokenCount Number of tokens in the cart
 */
function updateTitleBarWithTokens(tokenCount) {
  if (titleBarElement) {
    const maxTokens = 8192;
    const percentage = ((tokenCount / maxTokens) * 100).toFixed(1);
    titleBarElement.textContent = `picoGraph - ${tokenCount} / ${maxTokens} tokens (${percentage}%)`;
  }
}

/**
 * Generates cart content from Lua code.
 *
 * @param {string} luaCode Generated Lua code
 * @returns {string}
 */
function generateCartContent(luaCode) {
  const hasUpdateCallback = /function\s+_update(?:60)?\b|_update(?:60)?\s*=/.test(luaCode);
  const hasDrawCallback = /function\s+_draw\b|_draw\s*=/.test(luaCode);
  const fallback = (hasUpdateCallback && hasDrawCallback) ? '' :
    (!hasUpdateCallback ? '\nfunction _update()\nend\n' : '') +
    (!hasDrawCallback ? '\nfunction _draw()\n cls()\n print("picograph ok",2,60,7)\nend\n' : '');
  return `pico-8 cartridge // http://www.pico-8.com
version 41
__lua__
${luaCode}${fallback}
__gfx__
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
`;
}

/**
 * Updates token count display after workspace changes.
 */
async function updateTokenCount() {
  if (!electronAPI?.getCartStats) {
    return;
  }

  try {
    const luaCode = workspace.exportLua();
    let cartContent = generateCartContent(luaCode);
    // Ensure Unix line endings (p8tool requires \n, not \r\n)
    cartContent = cartContent.replace(/\r\n/g, '\n');
    const stats = await electronAPI.getCartStats(cartContent);
    updateTitleBarWithTokens(stats.tokens);
  } catch (error) {
    console.error("Failed to update token count:", error);
    if (titleBarElement) {
      titleBarElement.textContent = "picoGraph";
    }
  }
}

// Override handlePersistenceStateChange to also update token count
const originalHandlePersistenceStateChange = workspace.handlePersistenceStateChange.bind(workspace);
workspace.handlePersistenceStateChange = function(state) {
  originalHandlePersistenceStateChange(state);
  
  // Update token count when save completes (both auto and manual)
  if (state?.status === "saved") {
    updateTokenCount();
  }
};

// Initial token count update after workspace loads
if (electronAPI?.getCartStats) {
  updateTokenCount();
}

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

previewButton.addEventListener("click", () => {
  embeddedPreview.open();
});

const setMaximizeButtonState = (isMaximized) => {
  maximizeWindowButton.classList.toggle("is-active", Boolean(isMaximized));
  maximizeWindowButton.setAttribute(
    "title",
    isMaximized ? "Restore" : "Maximize"
  );
  maximizeWindowButton.setAttribute(
    "aria-label",
    isMaximized ? "Restore window" : "Maximize window"
  );
};

if (
  electronAPI &&
  typeof electronAPI.minimizeWindow === "function" &&
  typeof electronAPI.toggleMaximizeWindow === "function" &&
  typeof electronAPI.closeWindow === "function"
) {
  minimizeWindowButton.addEventListener("click", () => {
    electronAPI.minimizeWindow().catch((error) => {
      console.error("Failed to minimize window", error);
    });
  });

  maximizeWindowButton.addEventListener("click", () => {
    electronAPI.toggleMaximizeWindow()
      .then((isMaximized) => {
        setMaximizeButtonState(isMaximized);
      })
      .catch((error) => {
        console.error("Failed to toggle maximize state", error);
      });
  });

  closeWindowButton.addEventListener("click", () => {
    electronAPI.closeWindow().catch((error) => {
      console.error("Failed to close window", error);
    });
  });

  if (typeof electronAPI.getWindowMaximized === "function") {
    electronAPI.getWindowMaximized()
      .then((isMaximized) => {
        setMaximizeButtonState(isMaximized);
      })
      .catch((error) => {
        console.error("Failed to query maximize state", error);
      });
  }

  if (typeof electronAPI.onWindowMaximizedChanged === "function") {
    electronAPI.onWindowMaximizedChanged((isMaximized) => {
      setMaximizeButtonState(isMaximized);
    });
  }
} else {
  windowControls.hidden = true;
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
