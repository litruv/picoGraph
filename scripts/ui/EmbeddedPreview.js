/**
 * Manages embedded Pico-8 cart preview within the application.
 */
export class EmbeddedPreview {
  /**
   * @param {object} options Configuration options
   * @param {() => string} options.getLuaCode Function to get generated Lua code
   */
  constructor(options) {
    this.getLuaCode = options.getLuaCode;
    this.modal = null;
    this.canvas = null;
    this.isOpen = false;
    this.isRunning = false;
  }

  /**
   * Creates the preview modal if it doesn't exist
   */
  #ensureModal() {
    if (this.modal) {
      return;
    }

    // Create modal structure
    this.modal = document.createElement('div');
    this.modal.className = 'preview-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'previewModalTitle');
    this.modal.hidden = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'preview-modal__backdrop';
    backdrop.addEventListener('click', () => this.close());

    const panel = document.createElement('div');
    panel.className = 'preview-modal__panel';

    const header = document.createElement('div');
    header.className = 'preview-modal__header';

    // Header controls (left side)
    const headerControls = document.createElement('div');
    headerControls.className = 'preview-header-controls';

    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.className = 'preview-header-btn';
    refreshButton.setAttribute('aria-label', 'Reload cart');
    refreshButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>';
    refreshButton.addEventListener('click', () => this.#runCart());

    const stopButton = document.createElement('button');
    stopButton.type = 'button';
    stopButton.className = 'preview-header-btn preview-header-btn--stop';
    stopButton.setAttribute('aria-label', 'Stop cart');
    stopButton.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';
    stopButton.addEventListener('click', () => this.#stopCart());

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'preview-header-btn preview-header-btn--save';
    saveButton.setAttribute('aria-label', 'Save .p8');
    saveButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    saveButton.addEventListener('click', () => this.#downloadCart());

    headerControls.appendChild(refreshButton);
    headerControls.appendChild(stopButton);
    headerControls.appendChild(saveButton);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'preview-modal__close';
    closeButton.setAttribute('aria-label', 'Close preview');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => this.close());

    header.appendChild(headerControls);
    header.appendChild(closeButton);

    const content = document.createElement('div');
    content.className = 'preview-modal__content';

    // Create iframe for PICO-8 player
    this.iframe = document.createElement('iframe');
    this.iframe.className = 'preview-iframe';
    this.iframe.allow = 'gamepad';
    this.iframe.style.display = 'none';
    
    // Create the canvas for rendering placeholder
    this.canvas = document.createElement('canvas');
    this.canvas.width = 128;
    this.canvas.height = 128;
    this.canvas.className = 'preview-canvas';

    content.appendChild(this.iframe);
    content.appendChild(this.canvas);
    
    // Refocus iframe when clicking in the modal to ensure input keeps working
    panel.addEventListener('click', (e) => {
      if (this.iframe.style.display !== 'none') {
        setTimeout(() => {
          this.iframe.focus();
          if (this.iframe.contentWindow) {
            this.iframe.contentWindow.focus();
          }
        }, 0);
      }
    });
    
    panel.appendChild(header);
    panel.appendChild(content);

    this.modal.appendChild(backdrop);
    this.modal.appendChild(panel);
    document.body.appendChild(this.modal);
  }

  /**
   * Runs the cart in the embedded preview
   */
  async #runCart() {
    try {
      const luaCode = this.getLuaCode();
      
      if (!luaCode || !luaCode.trim()) {
        return;
      }

      this.isRunning = true;
      
      // Generate cart content
      const cartContent = this.#generateCartContent(luaCode);
      
      // Load cart in iframe using PICO-8 web player
      await this.#loadCartInPlayer(cartContent);
    } catch (error) {
      console.error('Error running cart:', error);
    }
  }

  /**
   * Loads a cart into the PICO-8 web player
   * 
   * @param {string} cartData The .p8 cart file content as a string
   */
  async #loadCartInPlayer(cartData) {
    try {
      const electronAPI = window.electronAPI;
      if (!electronAPI?.writePlayerHtml) {
        throw new Error('Player IPC not available');
      }

      const cartB64 = btoa(unescape(encodeURIComponent(cartData)));

      // HTML references pico8_edu.js by relative path — both files live in public/.
      const playerHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; overflow: hidden; }
    #canvas { image-rendering: pixelated; image-rendering: crisp-edges; width: 512px !important; height: 512px !important; border: 8px solid #000; }
  </style>
</head>
<body>
  <canvas id="canvas" width="128" height="128"></canvas>
  <script>
    var pico8_state = [];
    var pico8_buttons = [0,0,0,0,0,0,0,0];
    var codo_command = 0;
    var _cartname = ['untitled.p8'];
    var codo_key_buffer = [];
    var p8_keyboard_state = 0;
    var pico8_mouse = [];
    var pico8_gamepads = { count: 0 };
    var pico8_gpio = new Array(128).fill(0);
    var p8_dropped_cart = null;
    var p8_dropped_cart_name = '';

    var CART_B64 = '${cartB64}';

    // Silence all XHR — PICO-8 makes BBS metadata calls that crash from file:// origin.
    (function() {
      function MockXHR() {
        this.onload = null; this.onerror = null; this.onreadystatechange = null;
        this.readyState = 0; this.status = 0; this.statusText = '';
        this.response = null; this.responseText = ''; this.responseType = '';
      }
      MockXHR.UNSENT=0; MockXHR.OPENED=1; MockXHR.HEADERS_RECEIVED=2; MockXHR.LOADING=3; MockXHR.DONE=4;
      MockXHR.prototype.open = function() { this.readyState = 1; };
      MockXHR.prototype.send = function() {
        var self = this;
        setTimeout(function() {
          self.readyState = 4; self.status = 200; self.statusText = 'OK';
          self.response = self.responseType === 'arraybuffer' ? new ArrayBuffer(0) : '';
          self.responseText = '';
          if (typeof self.onload === 'function') self.onload({ target: self });
          if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
        }, 0);
      };
      MockXHR.prototype.setRequestHeader = function() {};
      MockXHR.prototype.getResponseHeader = function() { return null; };
      MockXHR.prototype.getAllResponseHeaders = function() { return ''; };
      MockXHR.prototype.abort = function() {};
      MockXHR.prototype.addEventListener = function(e, fn) {
        if (e==='load') this.onload=fn;
        if (e==='error') this.onerror=fn;
        if (e==='readystatechange') this.onreadystatechange=fn;
      };
      MockXHR.prototype.removeEventListener = function() {};
      window.XMLHttpRequest = MockXHR;
    })();

    var Module = {
      arguments: [],
      canvas: document.getElementById('canvas'),
      preRun: [function() {
        if (typeof IDBFS !== 'undefined' && typeof MEMFS !== 'undefined') {
          var orig = FS.mount.bind(FS);
          FS.mount = function(type, opts, mp) { return orig(type===IDBFS?MEMFS:type, opts, mp); };
        }
        FS.syncfs = function(populate, callback) {
          var cb = typeof callback==='function' ? callback : typeof populate==='function' ? populate : null;
          if (cb) setTimeout(function(){ cb(null); }, 0);
        };
      }],
      postRun: [function() {
        setTimeout(function() {
          p8_dropped_cart = 'data:application/octet-stream;base64,' + CART_B64;
          p8_dropped_cart_name = 'picograph.p8';
          codo_command = 9;
          
          // After cart loads, inject "run" + Enter to execute it
          setTimeout(function() {
            // Push keystrokes: r u n Enter (lowercase ASCII)
            codo_key_buffer.push(114, 117, 110, 13);
          }, 300);
        }, 200);
      }],
      print: function(t) { console.log('P8:', t); },
      printErr: function(t) { console.error('P8:', t); },
      setStatus: function() {}
    };

    function pico8_audio_context_suspended() { return false; }
  </script>
  <script src="./pico8_edu.js"></script>
</body>
</html>`;

      const { filePath } = await electronAPI.writePlayerHtml(playerHtml);
      const fileUrl = 'file:///' + filePath.replace(/\\/g, '/') + '?t=' + Date.now();

      this.iframe.src = 'about:blank';
      this.iframe.src = fileUrl;
      this.iframe.style.display = 'block';
      this.canvas.style.display = 'none';

      // Focus iframe once loaded so it captures keyboard/gamepad input
      this.iframe.onload = () => {
        setTimeout(() => {
          this.iframe.focus();
          if (this.iframe.contentWindow) {
            this.iframe.contentWindow.focus();
          }
        }, 500);
      };

    } catch (error) {
      console.error('Failed to load player:', error);
    }
  }

  /**
   * Stops the running cart
   */
  #stopCart() {
    this.isRunning = false;
    
    // Hide iframe and show canvas
    if (this.iframe) {
      this.iframe.src = 'about:blank';
      this.iframe.style.display = 'none';
    }
    
    if (this.canvas) {
      this.canvas.style.display = 'block';
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 128, 128);
      }
    }
  }

  /**
   * Downloads the current cart as a .p8 file
   */
  #downloadCart() {
    try {
      const luaCode = this.getLuaCode();
      const cartContent = this.#generateCartContent(luaCode);
      
      const blob = new Blob([cartContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `picograph_${Date.now()}.p8`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading cart:', error);
    }
  }

  /**
   * Generates the .p8 cart file content
   * 
   * @param {string} luaCode Generated Lua code
   * @returns {string}
   */
  #generateCartContent(luaCode) {
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
   * Opens the preview modal
   */
  open() {
    this.#ensureModal();
    this.modal.hidden = false;
    this.isOpen = true;
    
    // Auto-run the cart
    this.#runCart();
  }

  /**
   * Closes the preview modal
   */
  close() {
    this.#stopCart();
    if (this.modal) {
      this.modal.hidden = true;
      this.isOpen = false;
    }
  }

  /**
   * Toggles the preview modal
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
