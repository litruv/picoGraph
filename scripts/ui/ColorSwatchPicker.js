/**
 * Ordered PICO-8 palette hex strings, indices 0–15.
 *
 * @type {ReadonlyArray<string>}
 */
const PICO8_COLORS = Object.freeze([
  '#000002', '#1D2B53', '#7E2553', '#008751',
  '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
  '#FF004D', '#FFA300', '#FFEC27', '#00E436',
  '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
]);

/**
 * @typedef {{ element: HTMLElement, setValue: (index: number) => void }} ColorSwatchPickerInstance
 */

/**
 * Builds an inline PICO-8 color swatch picker control.
 *
 * Renders a colored trigger button that opens a 4×4 grid of all 16 PICO-8
 * palette swatches. Clicking a swatch fires `onChange` with the selected
 * palette index (0–15) and closes the dropdown.
 *
 * @param {{
 *   id?: string,
 *   value: number,
 *   onChange: (index: number) => void,
 * }} options Picker configuration.
 * @returns {ColorSwatchPickerInstance}
 */
export function createColorSwatchPicker({ id, value, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'color-swatch-picker';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'color-swatch-trigger';
  if (id) {
    trigger.id = id;
  }
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  wrapper.appendChild(trigger);

  const dropdown = document.createElement('div');
  dropdown.className = 'color-swatch-dropdown';
  dropdown.setAttribute('role', 'menu');
  // Appended to body on open so it escapes overflow:hidden on node cards.

  /** @type {Array<HTMLButtonElement>} */
  const swatchButtons = [];

  /** @type {((event: MouseEvent) => void) | null} */
  let outsideClickHandler = null;

  /** @type {(() => void) | null} */
  let scrollAbortHandler = null;

  const repositionDropdown = () => {
    const rect = trigger.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
  };

  const closeDropdown = () => {
    if (dropdown.isConnected) {
      dropdown.remove();
    }
    trigger.setAttribute('aria-expanded', 'false');
    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler, true);
      outsideClickHandler = null;
    }
    if (scrollAbortHandler) {
      document.removeEventListener('scroll', scrollAbortHandler, true);
      scrollAbortHandler = null;
    }
  };

  const openDropdown = () => {
    repositionDropdown();
    document.body.appendChild(dropdown);
    trigger.setAttribute('aria-expanded', 'true');
    outsideClickHandler = (event) => {
      if (
        !(event.target instanceof Node) ||
        (!wrapper.contains(event.target) && !dropdown.contains(event.target))
      ) {
        closeDropdown();
      }
    };
    scrollAbortHandler = () => closeDropdown();
    document.addEventListener('click', outsideClickHandler, true);
    document.addEventListener('scroll', scrollAbortHandler, true);
  };

  let currentIndex = clampColorIndex(value);

  /**
   * Updates the trigger button to reflect the supplied palette index.
   *
   * @param {number} index Palette index (0–15).
   */
  const updateTrigger = (index) => {
    const hex = PICO8_COLORS[index] ?? '#000000';
    trigger.style.backgroundColor = hex;
    trigger.title = `Color ${index}`;
    trigger.setAttribute('aria-label', `Color ${index}`);
  };

  PICO8_COLORS.forEach((hex, index) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch-option';
    swatch.style.backgroundColor = hex;
    swatch.dataset.colorIndex = String(index);
    swatch.title = String(index);
    swatch.setAttribute('role', 'menuitemradio');
    swatch.setAttribute('aria-label', `Color ${index}`);
    swatch.setAttribute('aria-checked', 'false');

    swatch.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });
    swatch.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const selected = index;
      closeDropdown();
      if (selected !== currentIndex) {
        currentIndex = selected;
        updateTrigger(selected);
        swatchButtons.forEach((btn, i) => {
          btn.setAttribute('aria-checked', i === selected ? 'true' : 'false');
        });
        onChange(selected);
      }
    });

    dropdown.appendChild(swatch);
    swatchButtons.push(swatch);
  });

  trigger.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    if (dropdown.isConnected) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  /**
   * Updates the picker display without firing `onChange`.
   *
   * @param {number} newIndex Palette index (0–15).
   */
  const setValue = (newIndex) => {
    currentIndex = clampColorIndex(newIndex);
    updateTrigger(currentIndex);
    swatchButtons.forEach((btn, i) => {
      btn.setAttribute('aria-checked', i === currentIndex ? 'true' : 'false');
    });
  };

  setValue(currentIndex);

  return { element: wrapper, setValue };
}

/**
 * Clamps an arbitrary value to a valid PICO-8 palette index (0–15).
 *
 * @param {unknown} value Raw index candidate.
 * @returns {number}
 */
function clampColorIndex(value) {
  const n = typeof value === 'number' ? value : Number(value);
  const safe = Number.isFinite(n) ? Math.round(n) : 0;
  return Math.max(0, Math.min(15, safe));
}
