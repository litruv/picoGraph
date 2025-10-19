import { DEFAULT_GRID_SIZE } from "../BlueprintWorkspaceConstants.js";

/**
 * Provides workspace geometry helpers for coordinate conversion and transforms.
 */
export class WorkspaceGeometry {
  /**
   * Resolves the active grid size from workspace styles.
   *
   * @param {import('../BlueprintWorkspace.js').BlueprintWorkspace} workspace Workspace instance.
   * @returns {number}
   */
  static resolveGridSize(workspace) {
    const { workspaceElement } = workspace;
    if (!workspaceElement || !workspaceElement.isConnected) {
      return DEFAULT_GRID_SIZE;
    }

    const computed = window.getComputedStyle(workspaceElement);
    const raw = computed.getPropertyValue("--grid-size");
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return DEFAULT_GRID_SIZE;
  }

  /**
   * Converts viewport coordinates into workspace-relative coordinates.
   *
   * @param {import('../BlueprintWorkspace.js').BlueprintWorkspace} workspace Workspace instance.
   * @param {{ clientX: number, clientY: number }} event Pointer-like event payload.
   * @returns {{ x: number, y: number }}
   */
  static eventToWorkspacePoint(workspace, event) {
    const rect = workspace.workspaceElement.getBoundingClientRect();
    const rawX = event?.clientX ?? 0;
    const rawY = event?.clientY ?? 0;
    const x = rawX - rect.left;
    const y = rawY - rect.top;
    const zoom = workspace.zoomLevel || 1;
    return {
      x: Math.max(0, Math.min(rect.width, x)) / zoom,
      y: Math.max(0, Math.min(rect.height, y)) / zoom,
    };
  }

  /**
   * Snaps a workspace position to the configured grid size.
   *
   * @param {import('../BlueprintWorkspace.js').BlueprintWorkspace} workspace Workspace instance.
   * @param {{ x: number, y: number }} position Raw workspace position.
   * @returns {{ x: number, y: number }}
   */
  static snapPositionToGrid(workspace, position) {
    const size = workspace.gridSize || DEFAULT_GRID_SIZE;
    const offsetX = workspace.workspaceBackgroundOffset?.x ?? 0;
    const offsetY = workspace.workspaceBackgroundOffset?.y ?? 0;
    const snap = (value, offset) => {
      const local = value - offset;
      const snapped = Math.round(local / size) * size;
      return snapped + offset;
    };
    return { x: snap(position.x, offsetX), y: snap(position.y, offsetY) };
  }

  /**
   * Converts a position vector into a CSS transform.
   *
   * @param {{x:number,y:number}} position Position vector.
   * @param {number} rotation Rotation in degrees around the Z axis.
   * @returns {string}
   */
  static positionToTransform(position, rotation = 0) {
    const transforms = [`translate3d(${position.x}px, ${position.y}px, 0)`];
    const rotationZ = Number.isFinite(rotation) ? rotation : 0;
    if (rotationZ) {
      const tilt = Math.max(-10, Math.min(10, rotationZ * 0.8));
      transforms.push(`rotate3d(0, 1, 0, ${tilt}deg)`);
      transforms.push(`rotate(${rotationZ}deg)`);
    }

    return transforms.join(" ");
  }
}
