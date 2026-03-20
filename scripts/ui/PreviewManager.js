import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Manages cart preview functionality
 */
export class PreviewManager {
  /**
   * @param {object} options Configuration options
   * @param {() => string} options.getLuaCode Function to get generated Lua code
   * @param {string} options.fake08Path Path to fake-08 executable
   */
  constructor(options) {
    this.getLuaCode = options.getLuaCode;
    this.fake08Path = options.fake08Path || null;
    this.currentProcess = null;
  }

  /**
   * Exports the current graph as a .p8 file
   * 
   * @param {string} outputPath Path to save the .p8 file
   * @returns {Promise<void>}
   */
  async exportCart(outputPath) {
    const luaCode = this.getLuaCode();
    
    // Create basic .p8 cart format
    const cartContent = `pico-8 cartridge // http://www.pico-8.com
version 41
__lua__
${luaCode}
__gfx__
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
`;

    await writeFile(outputPath, cartContent, 'utf8');
  }

  /**
   * Launches the preview with fake-08
   * 
   * @param {string} cartPath Path to the .p8 file
   * @returns {Promise<void>}
   */
  async launchPreview(cartPath) {
    if (!this.fake08Path) {
      throw new Error('fake-08 path not configured');
    }

    // Kill existing preview if running
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }

    return new Promise((resolve, reject) => {
      this.currentProcess = spawn(this.fake08Path, [cartPath]);

      this.currentProcess.on('error', (err) => {
        console.error('Failed to launch preview:', err);
        reject(err);
      });

      this.currentProcess.on('exit', (code) => {
        console.log(`Preview exited with code ${code}`);
        this.currentProcess = null;
        resolve();
      });
    });
  }

  /**
   * Exports and previews the current cart
   * 
   * @param {string} [tempPath] Optional path for temporary cart file
   * @returns {Promise<void>}
   */
  async exportAndPreview(tempPath = null) {
    const outputPath = tempPath || join(process.cwd(), 'temp_preview.p8');
    
    await this.exportCart(outputPath);
    
    if (this.fake08Path) {
      await this.launchPreview(outputPath);
    } else {
      console.log(`Cart exported to: ${outputPath}`);
      console.log('fake-08 not configured - cannot launch preview');
    }
  }

  /**
   * Stops any running preview
   */
  stopPreview() {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
  }
}
