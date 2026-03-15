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
        // Clamp zoom first
        this.targetZoom = Math.max(CAMERA.ZOOM_MIN, Math.min(CAMERA.ZOOM_MAX, this.targetZoom));

        const halfViewW = (this.viewW / this.zoom) / 2;
        const halfViewH = (this.viewH / this.zoom) / 2;

        // If world fits inside view, center it
        if (halfViewW * 2 >= WORLD.WIDTH) {
            this.targetX = WORLD.WIDTH / 2;
            this.x = WORLD.WIDTH / 2;
        } else {
            this.targetX = Math.max(halfViewW, Math.min(WORLD.WIDTH - halfViewW, this.targetX));
            this.x = Math.max(halfViewW, Math.min(WORLD.WIDTH - halfViewW, this.x));
        }
        if (halfViewH * 2 >= WORLD.HEIGHT) {
            this.targetY = WORLD.HEIGHT / 2;
            this.y = WORLD.HEIGHT / 2;
        } else {
            this.targetY = Math.max(halfViewH, Math.min(WORLD.HEIGHT - halfViewH, this.targetY));
            this.y = Math.max(halfViewH, Math.min(WORLD.HEIGHT - halfViewH, this.y));
        }
    }

    /**
     * Zoom towards a screen point (mouse position)
     */
    zoomAt(screenX, screenY, delta) {
        const oldZoom = this.targetZoom;
        const newZoom = Math.max(CAMERA.ZOOM_MIN, Math.min(CAMERA.ZOOM_MAX, this.targetZoom + delta * CAMERA.ZOOM_SPEED));

        if (newZoom === oldZoom) return;

        // Get world point under mouse BEFORE zoom
        const worldBeforeX = (screenX / oldZoom) + this.targetX - (this.viewW / (2 * oldZoom));
        const worldBeforeY = (screenY / oldZoom) + this.targetY - (this.viewH / (2 * oldZoom));

        this.targetZoom = newZoom;

        // After zoom, adjust camera so the same world point stays under mouse
        this.targetX = worldBeforeX - (screenX / newZoom) + (this.viewW / (2 * newZoom));
        this.targetY = worldBeforeY - (screenY / newZoom) + (this.viewH / (2 * newZoom));
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
     * Get visible world bounds (for culling + minimap)
     */
    getVisibleBounds() {
        const halfW = this.viewW / (2 * this.zoom);
        const halfH = this.viewH / (2 * this.zoom);
        return {
            left: this.x - halfW,
            right: this.x + halfW,
            top: this.y - halfH,
            bottom: this.y + halfH,
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
