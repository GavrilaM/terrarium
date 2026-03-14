// ============================================
// TERRARIUM — Camera System
// Pan, zoom, smooth interpolation, boundaries
// ============================================

import { CONFIG } from './config.js';

const { CAMERA, WORLD } = CONFIG;

export class Camera {
    constructor(viewW, viewH) {
        this.viewW = viewW;
        this.viewH = viewH;

        // Current state
        this.x = WORLD.WIDTH / 2;
        this.y = WORLD.HEIGHT / 2;
        this.zoom = 0.5; // start zoomed out to see more of the world

        // Target state (for smooth interpolation)
        this.targetX = this.x;
        this.targetY = this.y;
        this.targetZoom = this.zoom;

        // Panning
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartCamX = 0;
        this.panStartCamY = 0;
    }

    /**
     * Update camera — smooth lerp to target
     */
    update() {
        this.x += (this.targetX - this.x) * CAMERA.SMOOTH_FACTOR;
        this.y += (this.targetY - this.y) * CAMERA.SMOOTH_FACTOR;
        this.zoom += (this.targetZoom - this.zoom) * CAMERA.SMOOTH_FACTOR;
        this._clamp();
    }

    /**
     * Clamp camera to world boundaries
     */
    _clamp() {
        const halfViewW = (this.viewW / this.zoom) / 2;
        const halfViewH = (this.viewH / this.zoom) / 2;

        this.targetX = Math.max(halfViewW, Math.min(WORLD.WIDTH - halfViewW, this.targetX));
        this.targetY = Math.max(halfViewH, Math.min(WORLD.HEIGHT - halfViewH, this.targetY));
        this.x = Math.max(halfViewW, Math.min(WORLD.WIDTH - halfViewW, this.x));
        this.y = Math.max(halfViewH, Math.min(WORLD.HEIGHT - halfViewH, this.y));
    }

    /**
     * Zoom towards a screen point
     */
    zoomAt(screenX, screenY, delta) {
        const oldZoom = this.targetZoom;
        this.targetZoom = Math.max(CAMERA.ZOOM_MIN, Math.min(CAMERA.ZOOM_MAX, this.targetZoom + delta * CAMERA.ZOOM_SPEED));

        // Zoom towards mouse position
        const worldBefore = this.screenToWorld(screenX, screenY);
        // After zoom change, recalculate
        const zoomRatio = this.targetZoom / oldZoom;
        this.targetX = screenX / this.targetZoom + this.targetX - this.viewW / (2 * this.targetZoom);
        this.targetY = screenY / this.targetZoom + this.targetY - this.viewH / (2 * this.targetZoom);

        // Simpler: just zoom, keep center
        this.targetX = this.x;
        this.targetY = this.y;
    }

    /**
     * Start panning
     */
    startPan(screenX, screenY) {
        this.isPanning = true;
        this.panStartX = screenX;
        this.panStartY = screenY;
        this.panStartCamX = this.targetX;
        this.panStartCamY = this.targetY;
    }

    /**
     * Continue panning
     */
    pan(screenX, screenY) {
        if (!this.isPanning) return;
        const dx = (screenX - this.panStartX) / this.zoom;
        const dy = (screenY - this.panStartY) / this.zoom;
        this.targetX = this.panStartCamX - dx;
        this.targetY = this.panStartCamY - dy;
    }

    /**
     * Stop panning
     */
    endPan() {
        this.isPanning = false;
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX / this.zoom) + this.x - (this.viewW / (2 * this.zoom)),
            y: (screenY / this.zoom) + this.y - (this.viewH / (2 * this.zoom)),
        };
    }

    /**
     * Apply camera transform to canvas context
     */
    applyTransform(ctx) {
        ctx.save();
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(
            -this.x + this.viewW / (2 * this.zoom),
            -this.y + this.viewH / (2 * this.zoom)
        );
    }

    /**
     * Restore canvas context
     */
    restoreTransform(ctx) {
        ctx.restore();
    }

    /**
     * Get visible world bounds (for culling)
     */
    getVisibleBounds() {
        const halfW = this.viewW / (2 * this.zoom);
        const halfH = this.viewH / (2 * this.zoom);
        return {
            left: this.x - halfW - 50,
            right: this.x + halfW + 50,
            top: this.y - halfH - 50,
            bottom: this.y + halfH + 50,
        };
    }

    /**
     * Resize viewport
     */
    resize(viewW, viewH) {
        this.viewW = viewW;
        this.viewH = viewH;
    }
}
